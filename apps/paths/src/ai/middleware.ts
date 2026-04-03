import type { PayloadRequest } from 'payload'
import type { AiConfig } from '../payload-types'
import { checkRateLimit, type RateLimitResult } from './rateLimiter'
import { getUserAccessLevel } from '../utilities/types'

export interface AIRequestContext {
  aiConfig: AiConfig
  tier: string
  role: string
  rateLimitResult: RateLimitResult
  startTime: number
}

interface ValidateOptions {
  /** Allow unauthenticated requests (e.g. semantic search). Default: false */
  allowUnauthenticated?: boolean
  /** Custom 429 message. Default: "Daily limit reached. Upgrade your plan for more access." */
  rateLimitMessage?: string
}

/**
 * Shared pre-flight for AI endpoints:
 * 1. Auth check  2. Fetch ai-config global  3. Enabled check  4. Extract tier/role  5. Rate limit
 *
 * Returns the context object on success, or a Response on failure.
 */
export async function validateAIRequest(
  req: PayloadRequest,
  feature: string,
  options?: ValidateOptions,
): Promise<AIRequestContext | Response> {
  const startTime = Date.now()

  // 1. Auth
  if (!req.user && !options?.allowUnauthenticated) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }

  // 2. AI config + enabled check
  const aiConfig = await req.payload.findGlobal({ slug: 'ai-config', req, overrideAccess: true })
  if (!aiConfig.enabled) {
    return Response.json({ error: 'AI features are currently disabled' }, { status: 503 })
  }

  // 3. Extract tier/role
  const role = (req.user?.role as string) ?? 'user'
  const tier = getUserAccessLevel(req.user)

  // 4. Rate limit (authenticated users only)
  let rateLimitResult: RateLimitResult = {
    allowed: true,
    remaining: -1,
    limit: -1,
    isStaff: false,
  }

  if (req.user) {
    rateLimitResult = await checkRateLimit(
      req.user.id as string,
      feature,
      role,
      tier,
      aiConfig.rateLimits ?? [],
    )

    if (!rateLimitResult.allowed) {
      const message =
        options?.rateLimitMessage ?? 'Daily limit reached. Upgrade your plan for more access.'
      return Response.json(
        { error: message, limit: rateLimitResult.limit, remaining: 0 },
        { status: 429 },
      )
    }
  }

  return { aiConfig, tier, role, rateLimitResult, startTime }
}

/** Type guard — returns true when validateAIRequest returned an error Response */
export function isErrorResponse(result: AIRequestContext | Response): result is Response {
  return result instanceof Response
}
