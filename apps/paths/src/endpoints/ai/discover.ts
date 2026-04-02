import type { Endpoint } from 'payload'
import { chat, type ChatMessage } from '../../ai/chat'
import { logUsage } from '../../ai/usageLogger'
import { retrieveRelevantChunks } from '../../ai/retrieval'
import { getModelConfig } from '../../ai/models'
import { buildDiscoverPrompt, parseDiscoverResponse } from '../../ai/prompts/discover'
import { validateAIRequest, isErrorResponse } from '../../ai/middleware'

export const discoverEndpoint: Endpoint = {
  path: '/ai/discover',
  method: 'post',
  handler: async (req) => {
    const ctx = await validateAIRequest(req, 'content-discover', {
      rateLimitMessage: 'Daily discovery limit reached. Upgrade your plan for more access.',
    })
    if (isErrorResponse(ctx)) return ctx

    // Parse input
    const body = (await req.json?.()) as { query?: string; limit?: number } | undefined
    if (!body?.query || body.query.trim().length < 3) {
      return Response.json({ error: 'Please describe your goal (min 3 characters)' }, { status: 400 })
    }

    const limit = Math.min(body.limit ?? 5, 10)

    try {
      // Semantic search for candidates (wider net)
      const chunks = await retrieveRelevantChunks(body.query, req.payload, req, { limit: 20 })

      // Deduplicate by source document
      const seen = new Set<string>()
      const candidates = chunks
        .filter((c) => {
          const key = `${c.sourceCollection}:${c.sourceId}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .map((c) => ({
          sourceId: c.sourceId,
          sourceCollection: c.sourceCollection,
          sourceTitle: c.sourceTitle,
          snippet: c.text.slice(0, 200),
          accessLevel: c.accessLevel,
        }))

      if (candidates.length === 0) {
        return Response.json({ path: [], message: 'No relevant content found for your goal.' })
      }

      // AI ranks and structures into learning path
      const prompt = buildDiscoverPrompt(body.query, candidates)
      const messages: ChatMessage[] = [
        { role: 'system', content: prompt },
        { role: 'user', content: body.query },
      ]

      const modelConfig = getModelConfig('discover')
      const maxTokens = ctx.aiConfig.tokenBudgets?.discoverMaxTokens ?? modelConfig.maxOutputTokens
      const result = await chat(messages, 'discover', { maxTokens, temperature: 0.3 })

      const path = parseDiscoverResponse(result.content, candidates).slice(0, limit)

      // Log usage
      logUsage(req, {
        feature: 'content-discover',
        provider: modelConfig.provider,
        model: modelConfig.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: Date.now() - ctx.startTime,
      })

      // Resolve slugs for each path item
      const enrichedPath = await Promise.all(
        path.map(async (item) => {
          try {
            const doc = await req.payload.findByID({
              collection: item.collection as 'articles' | 'courses',
              id: item.sourceId,
              depth: 0,
              select: { slug: true },
            })
            return { ...item, slug: (doc as any)?.slug || item.sourceId }
          } catch {
            return { ...item, slug: item.sourceId }
          }
        })
      )
      return Response.json({ path: enrichedPath })
    } catch (err: any) {
      req.payload.logger.error({ err, message: 'Content discovery failed' })
      return Response.json({ error: 'Failed to generate learning path. Please try again.' }, { status: 500 })
    }
  },
}
