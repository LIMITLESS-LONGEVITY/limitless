import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../access/isAdmin'
import { canAccessOwnOrStaff } from '../../access/canAccessOwnOrStaff'
import { authenticated } from '../../access/authenticated'
import { preventDuplicateEnrollment } from './hooks/preventDuplicateEnrollment'
import { restrictUserUpdates } from './hooks/restrictUserUpdates'
import { generateCertificate } from '../../hooks/generateCertificate'

export const Enrollments: CollectionConfig = {
  slug: 'enrollments',
  admin: {
    useAsTitle: 'course',
    defaultColumns: ['user', 'course', 'status', 'completionPercentage', 'enrolledAt'],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'course', type: 'relationship', relationTo: 'courses', required: true },
    { name: 'enrolledAt', type: 'date', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    { name: 'completedAt', type: 'date' },
    {
      name: 'completionPercentage',
      type: 'number',
      defaultValue: 0,
      required: true,
      admin: { description: '0-100, auto-calculated from lesson progress' },
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'free',
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Paid', value: 'paid' },
        { label: 'Pending', value: 'pending' },
        { label: 'Refunded', value: 'refunded' },
      ],
      admin: { description: 'Placeholder for Phase 5 billing integration' },
    },
    {
      name: 'feedbackPrompted',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Whether the user has been shown the post-course satisfaction prompt' },
    },
  ],
  hooks: {
    beforeChange: [preventDuplicateEnrollment, restrictUserUpdates],
    afterChange: [generateCertificate],
  },
  access: {
    create: authenticated,
    read: canAccessOwnOrStaff,
    update: canAccessOwnOrStaff,
    delete: isAdmin,
  },
}
