import type { Endpoint } from 'payload'

/**
 * Toggle action completion in a daily protocol.
 * PATCH /api/ai/daily-protocol-status
 * No AI call — simple CRUD update of the JSON field.
 */
export const dailyProtocolStatusEndpoint: Endpoint = {
  path: '/ai/daily-protocol-status',
  method: 'patch',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = (await req.json?.()) as
      | { protocolId?: string; actionId?: string; completed?: boolean }
      | undefined

    if (!body?.protocolId || !body?.actionId || body.completed === undefined) {
      return Response.json(
        { error: 'Missing required fields: protocolId, actionId, completed' },
        { status: 400 },
      )
    }

    try {
      const protocol = await req.payload.findByID({
        collection: 'daily-protocols',
        id: body.protocolId,
        req,
        overrideAccess: false,
      })

      if (!protocol) {
        return Response.json({ error: 'Protocol not found' }, { status: 404 })
      }

      // Update the action in the JSON
      const protocolData = protocol.protocol as any
      let found = false
      let completedCount = 0

      for (const block of protocolData.blocks || []) {
        for (const action of block.actions || []) {
          if (action.id === body.actionId) {
            action.completed = body.completed
            found = true
          }
          if (action.completed) completedCount++
        }
      }

      if (!found) {
        return Response.json({ error: 'Action not found in protocol' }, { status: 404 })
      }

      // Update the document
      const updated = await req.payload.update({
        collection: 'daily-protocols',
        id: body.protocolId,
        data: {
          protocol: protocolData,
          completedCount,
        },
        req,
        overrideAccess: false,
      })

      return Response.json({ protocol: updated })
    } catch (err: any) {
      req.payload.logger.error({ err, message: 'Failed to update protocol status' })
      return Response.json({ error: 'Failed to update status' }, { status: 500 })
    }
  },
}
