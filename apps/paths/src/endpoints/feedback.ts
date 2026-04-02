import type { Endpoint } from 'payload'

export const feedbackEndpoint: Endpoint = {
  path: '/feedback',
  method: 'post',
  handler: async (req) => {
    // 1. Authenticate
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Parse request body
    const body = (await req.json?.()) as
      | {
          category?: string
          satisfaction?: string
          message?: string
          pageUrl?: string
          anonymous?: boolean
        }
      | undefined

    if (!body?.category || !body?.satisfaction) {
      return Response.json(
        { error: 'Missing required fields: category, satisfaction' },
        { status: 400 },
      )
    }

    const validCategories = ['experience', 'content', 'feature_request', 'bug_report']
    const validSatisfaction = ['exceptional', 'good', 'could_improve']

    if (!validCategories.includes(body.category)) {
      return Response.json({ error: 'Invalid category' }, { status: 400 })
    }

    if (!validSatisfaction.includes(body.satisfaction)) {
      return Response.json({ error: 'Invalid satisfaction value' }, { status: 400 })
    }

    // 3. Create feedback
    try {
      const feedback = await req.payload.create({
        collection: 'feedback',
        data: {
          user: req.user.id,
          category: body.category,
          satisfaction: body.satisfaction,
          message: body.message || undefined,
          pageUrl: body.pageUrl || undefined,
          anonymous: body.anonymous ?? false,
        },
        req,
        overrideAccess: true,
      })

      return Response.json({ id: feedback.id }, { status: 201 })
    } catch (_err) {
      return Response.json({ error: 'Failed to submit feedback' }, { status: 500 })
    }
  },
}
