import type { CollectionBeforeChangeHook } from 'payload'

export type EditorialStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'archived'
export type EditorialRole = 'user' | 'contributor' | 'editor' | 'publisher' | 'admin'

/**
 * Role hierarchy — higher index = more permissions.
 * A role at index N includes all roles at index < N.
 */
export const ROLE_HIERARCHY: EditorialRole[] = [
  'user',
  'contributor',
  'editor',
  'publisher',
  'admin',
]

/**
 * State machine: valid transitions and their required minimum role.
 */
export const EDITORIAL_TRANSITIONS: Record<
  string,
  { target: string; requiredRole: EditorialRole }[]
> = {
  draft: [{ target: 'in_review', requiredRole: 'contributor' }],
  in_review: [
    { target: 'approved', requiredRole: 'editor' },
    { target: 'draft', requiredRole: 'editor' },
  ],
  approved: [{ target: 'published', requiredRole: 'publisher' }],
  published: [
    { target: 'archived', requiredRole: 'publisher' },
    { target: 'draft', requiredRole: 'publisher' },
  ],
  archived: [{ target: 'draft', requiredRole: 'admin' }],
}

/**
 * Check if a status transition is valid.
 * Same status → always valid (no actual transition).
 */
export function isValidTransition(from: string, to: string): boolean {
  if (from === to) return true
  const transitions = EDITORIAL_TRANSITIONS[from]
  if (!transitions) return false
  return transitions.some((t) => t.target === to)
}

/**
 * Get the minimum role required for a transition.
 * Returns undefined if the transition is invalid.
 */
export function getRequiredRole(from: string, to: string): EditorialRole | undefined {
  if (from === to) return 'user' // No transition, any role
  const transitions = EDITORIAL_TRANSITIONS[from]
  if (!transitions) return undefined
  const transition = transitions.find((t) => t.target === to)
  return transition?.requiredRole
}

/**
 * Check if a user's role meets or exceeds the required role.
 * Uses the role hierarchy: admin > publisher > editor > contributor > user.
 */
export function hasRole(userRole: string, requiredRole: string): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole as EditorialRole)
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole as EditorialRole)
  if (userIndex === -1 || requiredIndex === -1) return false
  return userIndex >= requiredIndex
}

/**
 * beforeChange hook that validates editorial status transitions.
 * Attach to any collection with an `editorialStatus` field.
 */
export const validateEditorialTransition: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  // Only validate on update (not create — new docs are always 'draft')
  if (operation !== 'update') return data

  const oldStatus = originalDoc?.editorialStatus as string | undefined
  const newStatus = data?.editorialStatus as string | undefined

  // If status hasn't changed, nothing to validate
  if (!oldStatus || !newStatus || oldStatus === newStatus) return data

  // Check if the transition is valid
  if (!isValidTransition(oldStatus, newStatus)) {
    throw new Error(`Invalid editorial transition: ${oldStatus} → ${newStatus}`)
  }

  // Check if the user has the required role
  const requiredRole = getRequiredRole(oldStatus, newStatus)
  const userRole = req.user?.role as string | undefined

  if (!requiredRole || !userRole || !hasRole(userRole, requiredRole)) {
    throw new Error(
      `Insufficient permissions: ${oldStatus} → ${newStatus} requires ${requiredRole} role, user has ${userRole || 'none'}`,
    )
  }

  // If transitioning to 'published', set publishedAt and sync Payload's _status
  if (newStatus === 'published') {
    if (!data.publishedAt) {
      data.publishedAt = new Date().toISOString()
    }
    // Sync with Payload's versioning system — ensures the document is visible
    // on the frontend. Without this, "Save Draft" in the admin panel keeps
    // _status=draft even when editorialStatus=published.
    data._status = 'published'
  }

  // If transitioning away from 'published', revert _status to draft
  if (oldStatus === 'published' && newStatus !== 'published') {
    data._status = 'draft'
  }

  return data
}
