/**
 * Check if a user is a tenant manager (publisher with a tenant, or admin).
 * Used to gate access to the team compliance dashboard.
 */
export function isTenantManager(user: any): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.role !== 'publisher') return false
  return Array.isArray(user.tenants) && user.tenants.length > 0
}

/**
 * Get the first tenant ID for a user.
 * Returns null if user has no tenant.
 */
export function getUserTenantId(user: any): string | null {
  if (!user?.tenants?.length) return null
  const first = user.tenants[0]
  if (typeof first === 'object' && first.tenant) {
    return typeof first.tenant === 'object' ? first.tenant.id : first.tenant
  }
  return null
}
