import type { CollectionConfig } from 'payload'
import { canAccessOwnOrStaff } from '../../access/canAccessOwnOrStaff'
import { isAdmin } from '../../access/isAdmin'
import { authenticated } from '../../access/authenticated'

export const DailyProtocols: CollectionConfig = {
  slug: 'daily-protocols',
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['user', 'date', 'status', 'completedCount', 'totalCount'],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'date', type: 'date', required: true },
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
      name: 'protocol',
      type: 'json',
      required: true,
      admin: { description: 'Structured daily protocol with morning/afternoon/evening blocks' },
    },
    { name: 'completedCount', type: 'number', defaultValue: 0 },
    { name: 'totalCount', type: 'number', defaultValue: 0 },
    { name: 'generatedAt', type: 'date', required: true },
  ],
  access: {
    create: authenticated,
    read: canAccessOwnOrStaff,
    update: canAccessOwnOrStaff,
    delete: isAdmin,
  },
}
