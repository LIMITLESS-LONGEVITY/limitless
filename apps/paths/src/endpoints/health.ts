import type { Endpoint } from 'payload'

export const healthEndpoint: Endpoint = {
  path: '/health',
  method: 'get',
  handler: async (req) => {
    const checks: Record<string, 'ok' | 'error'> = {}

    // Database connectivity
    try {
      await req.payload.find({ collection: 'users', limit: 0, overrideAccess: true })
      checks.database = 'ok'
    } catch {
      checks.database = 'error'
    }

    const healthy = Object.values(checks).every((v) => v === 'ok')

    return Response.json(
      { status: healthy ? 'healthy' : 'degraded', checks },
      { status: healthy ? 200 : 503 },
    )
  },
}
