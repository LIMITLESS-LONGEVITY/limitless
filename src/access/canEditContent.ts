import type { Access } from 'payload'

/**
 * Update access for content collections.
 * - Admins: edit anything
 * - Publishers: edit anything
 * - Editors: edit anything (needed for review workflow)
 * - Contributors: edit only their own draft content
 */
export const canEditContent: Access = ({ req: { user } }) => {
  if (!user) return false

  const role = user.role as string

  // Admin, publisher, editor can edit anything
  if (['admin', 'publisher', 'editor'].includes(role)) return true

  // Contributors can only edit their own drafts
  if (role === 'contributor') {
    return {
      and: [
        { author: { equals: user.id } },
        { editorialStatus: { equals: 'draft' } },
      ],
    }
  }

  return false
}
