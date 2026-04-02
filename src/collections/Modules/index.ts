import type { CollectionConfig } from 'payload'
import { canCreateContent } from '../../access/canCreateContent'
import { canEditStructural } from '../../access/canEditStructural'
import { authenticated } from '../../access/authenticated'
import { isAdmin } from '../../access/isAdmin'

export const Modules: CollectionConfig = {
  slug: 'modules',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'course', 'order', 'updatedAt'],
  },
  fields: [
    { name: 'title', type: 'text', required: true},
    { name: 'description', type: 'textarea'},
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
    },
    {
      name: 'lessons',
      type: 'relationship',
      relationTo: 'lessons',
      hasMany: true,
    },
    { name: 'order', type: 'number', required: true },
    {
      name: 'estimatedDuration',
      type: 'number',
      admin: { description: 'Duration in minutes (auto-calculated from lessons)' },
    },
  ],
  access: {
    create: canCreateContent,
    read: authenticated,
    update: canEditStructural,
    delete: isAdmin,
  },
}
