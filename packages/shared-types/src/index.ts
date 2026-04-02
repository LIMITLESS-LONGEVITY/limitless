/**
 * @limitless/shared-types
 *
 * Canonical type definitions shared across all LIMITLESS apps.
 * These are the source of truth — app-local type definitions should
 * be migrated to use these once Render reconfig is stable.
 */

/** Authenticated user returned by PATHS /api/users/me */
export interface AuthUser {
  id: number
  email: string
  role: 'admin' | 'user' | 'editor'
  collection: string
}

/** JWT payload structure from Payload CMS tokens */
export interface JWTPayload {
  id: number
  email: string
  collection: string
  iat: number
  exp: number
}

/** Service identity for service-to-service auth (Digital Twin) */
export interface ServiceIdentity {
  service: string
  scopes: string[]
}

/** Standard API error response */
export interface ApiError {
  error: string
  message?: string
  statusCode: number
}

/** Health check response */
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down'
  service: string
  timestamp: string
  version?: string
}
