import type { Endpoint } from 'payload'
import { streamChat, type ChatMessage } from '../../ai/chat'
import { validateInput } from '../../ai/guardrails'
import { logUsage } from '../../ai/usageLogger'
import { buildTutorSystemPrompt } from '../../ai/prompts/tutor'
import { extractTextFromLexical } from '../../ai/utils'
import { retrieveRelevantChunks } from '../../ai/retrieval'
import { getModelConfig } from '../../ai/models'
import { getHealthProfile } from '../../utilities/getHealthProfile'
import { validateAIRequest, isErrorResponse } from '../../ai/middleware'

export const tutorEndpoint: Endpoint = {
  path: '/ai/tutor',
  method: 'post',
  handler: async (req) => {
    // 1. Auth + AI config + rate limit
    const ctx = await validateAIRequest(req, 'tutor-chat', {
      rateLimitMessage: 'Daily AI tutor limit reached. Upgrade your plan for more access.',
    })
    if (isErrorResponse(ctx)) return ctx

    // 2. Parse request body
    const body = (await req.json?.()) as
      | {
          message?: string
          conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
          contextType?: string
          contextId?: string
        }
      | undefined

    if (!body?.message || !body?.contextType || !body?.contextId) {
      return Response.json(
        { error: 'Missing required fields: message, contextType, contextId' },
        { status: 400 },
      )
    }

    // 3. Validate input
    try {
      validateInput({
        message: body.message,
        conversationLength: body.conversationHistory?.length ?? 0,
      })
    } catch (err) {
      const modelConfig = getModelConfig('tutor')
      logUsage(req, {
        feature: 'tutor-chat',
        provider: modelConfig.provider,
        model: modelConfig.model,
        inputTokens: 0,
        outputTokens: 0,
        contextCollection: body.contextType,
        contextId: body.contextId,
        refused: true,
        durationMs: Date.now() - ctx.startTime,
      })
      return Response.json({ error: (err as Error).message }, { status: 400 })
    }

    // 4. Retrieve relevant chunks via RAG (graceful degradation)
    let chunks: any[] = []
    try {
      chunks = await retrieveRelevantChunks(body.message, req.payload, req, {
        limit: 5,
      })
    } catch (ragErr) {
      req.payload.logger.warn('RAG retrieval failed, continuing without context:', ragErr)
    }

    // 5. Ensure current document is represented
    const currentDocInResults = chunks.some(
      (c) => c.sourceId === body.contextId && c.sourceCollection === body.contextType,
    )
    if (!currentDocInResults) {
      try {
        const contextDoc = await req.payload.findByID({
          collection: body.contextType as 'articles' | 'lessons',
          id: body.contextId,
          req,
          overrideAccess: false,
        })
        if (contextDoc) {
          chunks = [
            {
              id: 'priority',
              text: extractTextFromLexical(contextDoc.content).slice(0, 2000),
              sourceCollection: body.contextType,
              sourceId: body.contextId,
              sourceTitle: contextDoc.title as string,
              accessLevel: (contextDoc as Record<string, unknown>).accessLevel ?? 'free',
              chunkIndex: 0,
              relevanceScore: 1,
            },
            ...chunks.slice(0, 4),
          ]
        }
      } catch {}
    }

    // 6. Fetch health profile for personalization (graceful degradation)
    let healthProfile: any = null
    try {
      healthProfile = await getHealthProfile(req.user!.id as string)
    } catch {
      // Health profile unavailable — continue without personalization
    }

    // 7. Build messages with RAG context + optional health context
    const systemPrompt = buildTutorSystemPrompt(
      chunks.find((c) => c.sourceId === body.contextId)?.sourceTitle ?? 'this content',
      chunks,
      healthProfile,
    )

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(body.conversationHistory ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: body.message },
    ]

    // 8. Stream response
    const modelConfig = getModelConfig('tutor')
    const maxTokens =
      ctx.aiConfig.tokenBudgets?.tutorMaxTokens ?? modelConfig.maxOutputTokens

    const encoder = new TextEncoder()
    const ESCALATION_MARKER = '[SUGGEST_CONSULTATION]'
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamChat(messages, 'tutor', { maxTokens })
          let result = await generator.next()
          let fullContent = ''

          while (!result.done) {
            let text = result.value
            fullContent += text

            // Check if the marker is being streamed — hold back the marker text
            if (fullContent.includes(ESCALATION_MARKER)) {
              text = text.replace(ESCALATION_MARKER, '')
            }

            if (text) {
              const chunk = `data: ${JSON.stringify({ text })}\n\n`
              controller.enqueue(encoder.encode(chunk))
            }
            result = await generator.next()
          }

          // Check if escalation was detected in the full response
          if (fullContent.includes(ESCALATION_MARKER)) {
            const escalationChunk = `data: ${JSON.stringify({
              escalation: true,
              topic: body.message?.slice(0, 200) || 'Health consultation',
            })}\n\n`
            controller.enqueue(encoder.encode(escalationChunk))
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

          // 9. Log usage (fire-and-forget)
          const usage = result.value
          logUsage(req, {
            feature: 'tutor-chat',
            provider: modelConfig.provider,
            model: modelConfig.model,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            contextCollection: body.contextType,
            contextId: body.contextId,
            durationMs: Date.now() - ctx.startTime,
          })
        } catch (_err) {
          const errorChunk = `data: ${JSON.stringify({ error: 'An error occurred while generating the response.' })}\n\n`
          controller.enqueue(encoder.encode(errorChunk))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  },
}
