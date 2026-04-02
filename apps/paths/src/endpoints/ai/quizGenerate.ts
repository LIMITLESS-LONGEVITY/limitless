import type { Endpoint } from 'payload'
import { chat } from '../../ai/chat'
import { logUsage } from '../../ai/usageLogger'
import { buildQuizPrompt, parseQuizResponse } from '../../ai/prompts/quizGenerator'
import { extractTextFromLexical } from '../../ai/utils'
import { getModelConfig } from '../../ai/models'
import { validateAIRequest, isErrorResponse } from '../../ai/middleware'

export const quizGenerateEndpoint: Endpoint = {
  path: '/ai/quiz/generate',
  method: 'post',
  handler: async (req) => {
    const ctx = await validateAIRequest(req, 'quiz-generate', {
      rateLimitMessage: 'Daily quiz generation limit reached. Upgrade your plan for more access.',
    })
    if (isErrorResponse(ctx)) return ctx

    // Parse request body
    const body = (await req.json?.()) as
      | { contextType?: string; contextId?: string; questionCount?: number }
      | undefined

    if (!body?.contextType || !body?.contextId) {
      return Response.json(
        { error: 'Missing required fields: contextType, contextId' },
        { status: 400 },
      )
    }

    const questionCount = Math.min(Math.max(body.questionCount ?? 5, 1), 10)

    // Fetch context document (overrideAccess: false to enforce user's access level)
    let contextDoc: any
    try {
      if (body.contextType === 'articles') {
        contextDoc = await req.payload.findByID({
          collection: 'articles',
          id: body.contextId,
          req,
          overrideAccess: false,
        })
      } else if (body.contextType === 'lessons') {
        contextDoc = await req.payload.findByID({
          collection: 'lessons',
          id: body.contextId,
          req,
          overrideAccess: false,
        })
      } else {
        return Response.json(
          { error: 'Invalid contextType. Must be "articles" or "lessons".' },
          { status: 400 },
        )
      }
    } catch {
      return Response.json({ error: 'Content not found' }, { status: 404 })
    }

    // Build prompt and call AI
    const contentText = extractTextFromLexical(contextDoc.content)
    const prompt = buildQuizPrompt(contextDoc.title, contentText, questionCount)
    const modelConfig = getModelConfig('quizGeneration')
    const maxTokens = ctx.aiConfig.tokenBudgets?.quizMaxTokens ?? modelConfig.maxOutputTokens

    try {
      const result = await chat([{ role: 'user', content: prompt }], 'quizGeneration', {
        maxTokens,
        temperature: 0.7,
      })

      const quiz = parseQuizResponse(result.content)

      // Log usage
      logUsage(req, {
        feature: 'quiz-generate',
        provider: modelConfig.provider,
        model: modelConfig.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        contextCollection: body.contextType,
        contextId: body.contextId,
        durationMs: Date.now() - ctx.startTime,
      })

      return Response.json(quiz)
    } catch (_err) {
      return Response.json(
        { error: 'Failed to generate quiz. Please try again.' },
        { status: 500 },
      )
    }
  },
}
