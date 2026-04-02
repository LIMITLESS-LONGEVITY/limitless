import type { Endpoint } from 'payload'

/**
 * GET /api/me/protocol
 * Returns today's daily protocol for the authenticated user.
 * Used by the OS Dashboard daily protocol widget.
 */
export const myProtocolEndpoint: Endpoint = {
  path: '/me/protocol',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]

    const protocols = await req.payload.find({
      collection: 'daily-protocols',
      where: {
        and: [
          { user: { equals: req.user.id } },
          { date: { equals: today } },
          { status: { equals: 'ready' } },
        ],
      },
      limit: 1,
      sort: '-date',
      overrideAccess: false,
      user: req.user,
      req,
    })

    if (protocols.docs.length === 0) {
      return Response.json({ date: today, protocol: null })
    }

    const doc = protocols.docs[0] as any
    const totalCount = doc.totalCount || 0
    const completedCount = doc.completedCount || 0

    return Response.json({
      date: today,
      protocol: {
        id: doc.id,
        items: doc.protocol || [],
        completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
        completedCount,
        totalCount,
      },
    })
  },
}
