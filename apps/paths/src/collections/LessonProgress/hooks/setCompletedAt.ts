import type { CollectionBeforeChangeHook } from 'payload'

export const setCompletedAt: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
}) => {
  if (operation === 'create' && data.status === 'completed') {
    data.completedAt = new Date().toISOString()
  }

  if (operation === 'update') {
    const newStatus = data.status as string | undefined
    const oldStatus = originalDoc?.status as string | undefined
    if (newStatus === 'completed' && oldStatus !== 'completed') {
      data.completedAt = new Date().toISOString()
    }
  }

  data.lastAccessedAt = new Date().toISOString()

  return data
}
