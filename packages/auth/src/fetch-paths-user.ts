import type { AuthUser } from '@limitless/shared-types'
import { DEFAULT_PATHS_API_URL } from './constants'

/**
 * Validate a JWT token by delegating to PATHS /api/users/me.
 *
 * This is the canonical auth validation pattern. All apps MUST use this
 * instead of local jwt.verify() — Payload CMS tokens cannot be reliably
 * verified locally (see feedback_payload_jwt_verification.md).
 *
 * @param token - The JWT token from the payload-token cookie
 * @param pathsApiUrl - Override for PATHS API URL (defaults to Render direct)
 * @returns AuthUser if valid, null if invalid/expired
 */
export async function fetchPathsUser(
  token: string,
  pathsApiUrl?: string,
): Promise<AuthUser | null> {
  const baseUrl = pathsApiUrl || process.env.PATHS_API_URL || DEFAULT_PATHS_API_URL

  try {
    const res = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Authorization: `JWT ${token}` },
      cache: 'no-store',
    })

    if (!res.ok) return null

    const data = await res.json()
    if (!data?.user?.id) return null

    return {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role || 'user',
      collection: data.user.collection || 'users',
    }
  } catch {
    return null
  }
}
