import type { Access } from 'payload'

/**
 * Access pattern for user-owned records (Enrollments, LessonProgress).
 * - Staff (admin/publisher/editor/contributor): read/update all records
 * - Regular users: only their own records (filtered by `user` relationship field)
 * - Anonymous: no access
 */
export const canAccessOwnOrStaff: Access = ({ req: { user } }) => {
  if (!user) return false
  const role = user.role as string
  if (['admin', 'publisher', 'editor', 'contributor'].includes(role)) return true
  return { user: { equals: user.id } }
}
