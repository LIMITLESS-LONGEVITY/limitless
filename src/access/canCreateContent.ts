import type { Access } from 'payload'

/**
 * Create access for content collections.
 * Contributor+ roles can create content.
 */
export const canCreateContent: Access = ({ req: { user } }) => {
  if (!user) return false
  const role = user.role as string
  return ['contributor', 'editor', 'publisher', 'admin'].includes(role)
}
