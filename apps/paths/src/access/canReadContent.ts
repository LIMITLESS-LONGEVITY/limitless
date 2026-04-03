import type { Access } from 'payload'
import { getEffectiveAccessLevels } from '../utilities/accessLevels'
import { getUserAccessLevel, getUserTenantAccessLevel } from '../utilities/types'

/**
 * Read access for content collections (Articles, Courses).
 * - Admins/editors/publishers: read everything
 * - Contributors: read published content at their tier + their own content (any status)
 * - Regular users: read published content at their access level
 * - Anonymous: read published free content only
 */
export const canReadContent: Access = ({ req: { user } }) => {
  // Admin bypass: editorial roles see everything
  if (user?.role && ['admin', 'publisher', 'editor'].includes(user.role as string)) {
    return true
  }

  // Determine effective access levels
  const levels = getEffectiveAccessLevels(getUserAccessLevel(user), getUserTenantAccessLevel(user))

  // Contributors can also see their own content (any status)
  if (user?.role === 'contributor') {
    return {
      or: [
        { author: { equals: user.id } },
        {
          and: [
            { editorialStatus: { equals: 'published' } },
            { accessLevel: { in: levels } },
          ],
        },
      ],
    }
  }

  // Published content at user's access level
  return {
    and: [
      { editorialStatus: { equals: 'published' } },
      { accessLevel: { in: levels } },
    ],
  }
}
