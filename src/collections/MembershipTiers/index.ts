import type { CollectionConfig } from 'payload'
import { anyone } from '../../access/anyone'
import { isAdmin } from '../../access/isAdmin'

export const MembershipTiers: CollectionConfig = {
  slug: 'membership-tiers',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'accessLevel', 'monthlyPrice', 'displayOrder', 'isActive'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
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
    { name: 'monthlyPrice', type: 'number' },
    { name: 'yearlyPrice', type: 'number' },
    { name: 'stripeMonthlyPriceId', type: 'text', admin: { position: 'sidebar' } },
    { name: 'stripeYearlyPriceId', type: 'text', admin: { position: 'sidebar' } },
    { name: 'stripeProductId', type: 'text', admin: { position: 'sidebar' } },
    {
      name: 'features',
      type: 'array',
      fields: [{ name: 'feature', type: 'text', required: true }],
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
