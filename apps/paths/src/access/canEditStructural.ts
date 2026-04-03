import type { Access } from 'payload'

/**
 * Update access for structural collections (Modules, Lessons).
 * These don't have editorial workflow or author fields,
 * so contributors cannot edit them — editor+ only.
 */
export const canEditStructural: Access = ({ req: { user } }) => {
  if (!user) return false
  const role = user.role as string
  return ['editor', 'publisher', 'admin'].includes(role)
}
