import type { User, MembershipTier, Tenant } from '../payload-types'

/**
 * User with populated relations (tier, tenants) as seen in request context
 * when Payload resolves relations at depth > 0.
 *
 * Use this instead of `(req.user as any)?.tier?.accessLevel`.
 */
export type UserWithRelations = Omit<User, 'tier' | 'tenants'> & {
  tier?: MembershipTier | null
  tenants?: Array<{ tenant: Tenant; id?: string | null }> | null
}

/**
 * Unwrap a Payload relation field that may be a populated object or a raw ID.
 * Returns the object if populated, or null if it's just an ID or missing.
 *
 * @example
 * const course = unwrapRelation(enrollment.course) // Course | null
 */
export function unwrapRelation<T extends { id: unknown }>(
  field: T | number | string | null | undefined,
): T | null {
  if (field != null && typeof field === 'object') return field
  return null
}

/**
 * Get the access level string from a user with potentially populated tier.
 * Falls back to 'free' if tier is not populated or missing.
 */
export function getUserAccessLevel(user: User | UserWithRelations | null | undefined): string {
  if (!user) return 'free'
  const tier = user.tier
  if (tier != null && typeof tier === 'object') return tier.accessLevel
  return 'free'
}

/**
 * Get the tenant's content access level from a user with populated tenants.
 * Returns the first tenant's contentAccessLevel, or null if not available.
 *
 * Checks both the flat `tenant` property (added by multi-tenant plugin at runtime)
 * and the `tenants[0].tenant` array form (from the User schema).
 */
export function getUserTenantAccessLevel(
  user: User | UserWithRelations | null | undefined,
): string | null {
  if (!user) return null

  // Multi-tenant plugin adds a flat `tenant` property to req.user at runtime
  const flatTenant = (user as Record<string, unknown>).tenant
  if (flatTenant != null && typeof flatTenant === 'object') {
    const level = (flatTenant as Record<string, unknown>).contentAccessLevel
    if (typeof level === 'string') return level
  }

  // Fall back to tenants array form
  if (!user.tenants?.[0]) return null
  const tenant = user.tenants[0].tenant
  if (tenant != null && typeof tenant === 'object') return tenant.contentAccessLevel ?? null
  return null
}
