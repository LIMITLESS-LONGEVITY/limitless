import type { Access } from 'payload'

export const isAdmin: Access = ({ req: { user } }) => {
  return user?.role === 'admin'
}

export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { id: { equals: user.id } }
}
