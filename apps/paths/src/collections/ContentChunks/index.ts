import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../access/isAdmin'

export const ContentChunks: CollectionConfig = {
  slug: 'content-chunks',
  admin: {
    useAsTitle: 'sourceTitle',
    defaultColumns: ['sourceTitle', 'sourceCollection', 'accessLevel', 'chunkIndex', 'tokenCount'],
  },
  fields: [
    { name: 'text', type: 'textarea', required: true },
    { name: 'sourceCollection', type: 'text', required: true },
    { name: 'sourceId', type: 'text', required: true },
    { name: 'sourceTitle', type: 'text', required: true },
    {
      name: 'accessLevel',
      type: 'select',
      required: true,
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Regular', value: 'regular' },
        { label: 'Premium', value: 'premium' },
        { label: 'Enterprise', value: 'enterprise' },
      ],
    },
    { name: 'pillar', type: 'relationship', relationTo: 'content-pillars' },
    { name: 'chunkIndex', type: 'number', required: true },
    { name: 'tokenCount', type: 'number', required: true },
  ],
  access: {
    create: () => false,
    read: isAdmin,
    update: () => false,
    delete: isAdmin,
  },
}
