import { createClient, type RedisClientType } from 'redis'

export const STAFF_ROLES = ['admin', 'publisher', 'editor', 'contributor'] as const

export function isStaffRole(role: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role)
}

export function getRateLimitKey(userId: string, feature: string): string {
  const date = new Date().toISOString().split('T')[0]
  return `ai:ratelimit:${userId}:${feature}:${date}`
}

export const DEFAULT_RATE_LIMITS: Record<string, Record<string, number>> = {
  'tutor-chat': { free: 0, regular: 10, premium: 50, enterprise: -1 },
  'quiz-generate': { free: 0, regular: 5, premium: 20, enterprise: -1 },
  'quiz-save': { free: 0, regular: 0, premium: 0, enterprise: 0 },
  'semantic-search': { free: 10, regular: 50, premium: 200, enterprise: -1 },
  'content-discover': { free: 5, regular: 20, premium: 100, enterprise: -1 },
  'action-plan': { free: 0, regular: 2, premium: 10, enterprise: -1 },
  'daily-protocol': { free: 0, regular: 1, premium: 3, enterprise: -1 },
}

export function getDefaultLimit(feature: string, tier: string): number {
  return DEFAULT_RATE_LIMITS[feature]?.[tier] ?? 0
}

let redisClient: RedisClientType | null = null

async function getRedis(): Promise<RedisClientType | null> {
  if (redisClient?.isOpen) return redisClient
  const url = process.env.REDIS_URL
  if (!url) return null
  try {
    redisClient = createClient({ url }) as RedisClientType
    redisClient.on('error', (err) => {
      console.error('[Rate Limiter] Redis error:', err.message)
    })
    await redisClient.connect()
    return redisClient
  } catch (err) {
    console.error(
      '[Rate Limiter] Redis connection failed, rate limiting disabled:',
      (err as Error).message,
    )
    return null
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  isStaff: boolean
}

export async function checkRateLimit(
  userId: string,
  feature: string,
  role: string,
  tier: string,
  configLimits?: Array<{ feature: string; tier: string; dailyLimit: number }>,
): Promise<RateLimitResult> {
  const staff = isStaffRole(role)

  if (staff) {
    const redis = await getRedis()
    if (redis) {
      const key = getRateLimitKey(userId, feature)
      const count = await redis.incr(key)
      if (count === 1) await redis.expire(key, 86400)
    }
    return { allowed: true, remaining: -1, limit: -1, isStaff: true }
  }

  const configEntry = configLimits?.find(
    (l) => l.feature === feature && l.tier === tier,
  )
  const limit = configEntry?.dailyLimit ?? getDefaultLimit(feature, tier)

  if (limit === 0) {
    return { allowed: false, remaining: 0, limit: 0, isStaff: false }
  }

  if (limit === -1) {
    return { allowed: true, remaining: -1, limit: -1, isStaff: false }
  }

  const redis = await getRedis()
  if (!redis) {
    return { allowed: true, remaining: limit, limit, isStaff: false }
  }

  const key = getRateLimitKey(userId, feature)
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 86400)

  const remaining = Math.max(0, limit - count)
  return { allowed: count <= limit, remaining, limit, isStaff: false }
}
