import type { CollectionBeforeChangeHook } from 'payload'

export const ALLOWED_USER_STATUS_TRANSITIONS = ['cancelled'] as const

const STAFF_ROLES = ['admin', 'publisher', 'editor', 'contributor']

export const restrictUserUpdates: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  if (operation !== 'update') return data

  const userRole = req.user?.role as string | undefined
  if (!userRole) return data

  if (STAFF_ROLES.includes(userRole)) return data

  const newStatus = data.status as string | undefined
  const oldStatus = originalDoc?.status as string | undefined

  if (newStatus && newStatus !== oldStatus) {
    if (!(ALLOWED_USER_STATUS_TRANSITIONS as readonly string[]).includes(newStatus)) {
      throw new Error(`You can only cancel your enrollment. Status "${newStatus}" is not allowed.`)
    }
  }

  delete data.completionPercentage
  delete data.completedAt
  delete data.paymentStatus

  return data
}
