import type { Endpoint } from 'payload'

/**
 * Internal tier-sync endpoint — called by HUB when membership changes.
 * Updates user's membership tier in PATHS to match their HUB subscription.
 *
 * Auth: API key in X-Service-Key header (not user JWT).
 *
 * Body: { userId: string, tier: 'free' | 'regular' | 'premium' | 'enterprise' }
 */

const TIER_MAP: Record<string, string> = {
  free: 'free',
  regular: 'regular',
  premium: 'premium',
  enterprise: 'enterprise',
}

export const tierSyncEndpoint: Endpoint = {
  path: '/internal/tier-sync',
  method: 'post',
  handler: async (req) => {
    // Verify service key
    const serviceKey = req.headers.get('x-service-key')
    if (!serviceKey || serviceKey !== process.env.HUB_SERVICE_KEY) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse body
    let body: { userId: string; tier: string }
    try {
      body = await req.json!()
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { userId, tier } = body
    if (!userId || !tier) {
      return Response.json({ error: 'Missing userId or tier' }, { status: 400 })
    }

    if (!TIER_MAP[tier]) {
      return Response.json({ error: `Invalid tier: ${tier}` }, { status: 400 })
    }

    // Find user by ID
    const users = await req.payload.find({
      collection: 'users',
      where: { id: { equals: userId } },
      limit: 1,
      overrideAccess: true,
    })

    if (users.docs.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Find user's membership tier and update
    const tiers = await req.payload.find({
      collection: 'membership-tiers',
      where: { slug: { equals: TIER_MAP[tier] } },
      limit: 1,
      overrideAccess: true,
    })

    if (tiers.docs.length === 0) {
      return Response.json({ error: `Tier not found: ${tier}` }, { status: 404 })
    }

    await req.payload.update({
      collection: 'users',
      id: users.docs[0].id,
      data: { tier: tiers.docs[0].id },
      overrideAccess: true,
    })

    return Response.json({ success: true, userId, tier: TIER_MAP[tier] })
  },
}
