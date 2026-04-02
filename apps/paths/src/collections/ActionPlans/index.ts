import type { CollectionConfig } from 'payload'
import { canAccessOwnOrStaff } from '../../access/canAccessOwnOrStaff'
import { isAdmin } from '../../access/isAdmin'
import { authenticated } from '../../access/authenticated'

export const ActionPlans: CollectionConfig = {
  slug: 'action-plans',
  admin: {
    useAsTitle: 'course',
    defaultColumns: ['user', 'course', 'status', 'generatedAt'],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'enrollment', type: 'relationship', relationTo: 'enrollments', required: true },
    { name: 'course', type: 'relationship', relationTo: 'courses', required: true },
    { name: 'pillar', type: 'relationship', relationTo: 'content-pillars' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'generating',
      options: [
        { label: 'Generating', value: 'generating' },
        { label: 'Ready', value: 'ready' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    {
      name: 'plan',
      type: 'json',
      required: true,
      admin: { description: 'Structured 30-day action plan JSON' },
    },
    {
      name: 'healthProfileSnapshot',
      type: 'json',
      admin: { description: 'Frozen copy of health profile at generation time' },
    },
    { name: 'generatedAt', type: 'date', required: true },
  ],
  access: {
    create: authenticated,
    read: canAccessOwnOrStaff,
    update: canAccessOwnOrStaff,
    delete: isAdmin,
  },
}
