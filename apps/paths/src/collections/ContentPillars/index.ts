import type { CollectionConfig } from 'payload'
import { anyone } from '../../access/anyone'
import { isAdmin } from '../../access/isAdmin'

export const ContentPillars: CollectionConfig = {
  slug: 'content-pillars',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'defaultAccessLevel', 'displayOrder', 'isActive'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea' },
    { name: 'icon', type: 'text' },
    {
      name: 'defaultAccessLevel',
      type: 'select',
      defaultValue: 'free',
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Regular', value: 'regular' },
        { label: 'Premium', value: 'premium' },
        { label: 'Enterprise', value: 'enterprise' },
      ],
    },
    { name: 'displayOrder', type: 'number', defaultValue: 0 },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
  access: {
    create: isAdmin,
    read: anyone,
    update: isAdmin,
    delete: isAdmin,
  },
}
