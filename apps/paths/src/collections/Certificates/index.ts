import type { CollectionConfig } from 'payload'
import { canAccessOwnOrStaff } from '../../access/canAccessOwnOrStaff'
import { isAdmin } from '../../access/isAdmin'

export const Certificates: CollectionConfig = {
  slug: 'certificates',
  admin: {
    useAsTitle: 'courseTitle',
    defaultColumns: ['user', 'courseTitle', 'type', 'certificateNumber', 'issuedAt'],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'enrollment', type: 'relationship', relationTo: 'enrollments', required: true },
    { name: 'course', type: 'relationship', relationTo: 'courses', required: true },
    // Denormalized fields for display without depth queries
    { name: 'courseTitle', type: 'text', required: true },
    { name: 'coursePillar', type: 'text' },
    { name: 'instructorName', type: 'text' },
    { name: 'estimatedDuration', type: 'number' },
    {
      name: 'certificateNumber',
      type: 'text',
      required: true,
      unique: true,
      admin: { readOnly: true },
    },
    { name: 'issuedAt', type: 'date', required: true },
    {
      name: 'expiresAt',
      type: 'date',
      admin: { description: 'Optional. For B2B recertification tracking.' },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'completion',
      options: [
        { label: 'Course Completion', value: 'completion' },
        { label: 'Staff Certification', value: 'certification' },
      ],
    },
  ],
  access: {
    create: isAdmin,
    read: canAccessOwnOrStaff,
    update: isAdmin,
    delete: isAdmin,
  },
}
