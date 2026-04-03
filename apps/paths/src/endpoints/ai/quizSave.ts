import type { Endpoint } from 'payload'
import { isStaffRole } from '../../ai/rateLimiter'
import { logUsage } from '../../ai/usageLogger'

interface QuizQuestionData {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export const quizSaveEndpoint: Endpoint = {
  path: '/ai/quiz/save',
  method: 'post',
  handler: async (req) => {
    const startTime = Date.now()

    // 1. Authenticate
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Authorize — staff only
    const role = (req.user.role as string) ?? 'user'
    if (!isStaffRole(role)) {
      return Response.json({ error: 'Staff access required' }, { status: 403 })
    }

    // 3. Parse and validate request body
    const body = (await req.json?.()) as
      | { contextType?: string; contextId?: string; questions?: QuizQuestionData[] }
      | undefined

    if (!body?.contextType || !body?.contextId || !body?.questions?.length) {
      return Response.json(
        { error: 'Missing required fields: contextType, contextId, questions' },
        { status: 400 },
      )
    }

    if (body.contextType !== 'articles' && body.contextType !== 'lessons') {
      return Response.json(
        { error: 'Invalid contextType. Must be "articles" or "lessons".' },
        { status: 400 },
      )
    }

    for (const q of body.questions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length < 2) {
        return Response.json({ error: 'Invalid question format' }, { status: 400 })
      }
      if (
        typeof q.correctAnswer !== 'number' ||
        q.correctAnswer < 0 ||
        q.correctAnswer >= q.options.length
      ) {
        return Response.json({ error: 'Invalid correctAnswer index' }, { status: 400 })
      }
    }

    // 4. Fetch document (overrideAccess: false to enforce user's access level)
    let doc: any
    try {
      doc = await req.payload.findByID({
        collection: body.contextType,
        id: body.contextId,
        req,
        overrideAccess: false,
      })
    } catch {
      return Response.json({ error: 'Content not found' }, { status: 404 })
    }

    // 5. Build quiz blocks and append to content
    const quizBlocks = body.questions.map((q) => ({
      type: 'block',
      fields: {
        blockType: 'quizQuestion',
        question: q.question,
        options: q.options.map((text) => ({ text })),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation ?? '',
      },
    }))

    const existingContent = doc.content ?? {
      root: {
        children: [],
        type: 'root',
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    }

    const updatedContent = {
      ...existingContent,
      root: {
        ...existingContent.root,
        children: [...(existingContent.root?.children ?? []), ...quizBlocks],
      },
    }

    try {
      await req.payload.update({
        collection: body.contextType,
        id: body.contextId,
        data: { content: updatedContent },
        req,
      })
    } catch (_err) {
      return Response.json({ error: 'Failed to save quiz questions' }, { status: 500 })
    }

    // 6. Log usage
    logUsage(req, {
      feature: 'quiz-save',
      provider: 'none',
      model: 'none',
      inputTokens: 0,
      outputTokens: 0,
      contextCollection: body.contextType,
      contextId: body.contextId,
      durationMs: Date.now() - startTime,
    })

    return Response.json({ success: true, questionsAdded: body.questions.length })
  },
}
