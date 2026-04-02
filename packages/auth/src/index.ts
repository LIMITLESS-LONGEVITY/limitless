/**
 * @limitless/auth
 *
 * Shared auth utilities for the LIMITLESS platform.
 * All apps delegate JWT validation to PATHS /api/users/me.
 *
 * Usage (Next.js apps):
 *   import { fetchPathsUser, COOKIE_NAME } from '@limitless/auth'
 *   const token = cookieStore.get(COOKIE_NAME)?.value
 *   const user = token ? await fetchPathsUser(token) : null
 *
 * Usage (Fastify apps):
 *   import { fetchPathsUser, COOKIE_NAME } from '@limitless/auth'
 *   const token = request.cookies[COOKIE_NAME]
 *   const user = token ? await fetchPathsUser(token) : null
 */

export { fetchPathsUser } from './fetch-paths-user'
export { COOKIE_NAME, DEFAULT_PATHS_API_URL, COOKIE_DOMAIN } from './constants'
export type { AuthUser, JWTPayload } from '@limitless/shared-types'
