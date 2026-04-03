import type { CollectionConfig } from 'payload'
import { authenticated } from '../../access/authenticated'
import { isAdmin } from '../../access/isAdmin'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'contentAccessLevel'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    {
      name: 'contentAccessLevel',
      type: 'select',
      defaultValue: 'free',
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Regular', value: 'regular' },
        { label: 'Premium', value: 'premium' },
        { label: 'Enterprise', value: 'enterprise' },
      ],
    },
    // --- B2B Certification Config ---
    {
      name: 'certificationEnabled',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Enable staff certification tracking for this organization' },
    },
    {
      name: 'certificationExpiry',
      type: 'number',
      admin: {
        description: 'Months until certificates expire (for recertification). Leave empty for no expiry.',
        condition: (data) => data?.certificationEnabled,
      },
    },
    {
      name: 'organizationName',
      type: 'text',
      admin: {
        description: 'Display name on certificates (e.g. "El Fuerte Wellness Institute")',
        condition: (data) => data?.certificationEnabled,
      },
    },
    {
      name: 'organizationLogo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Organization logo for branded certificates',
        condition: (data) => data?.certificationEnabled,
      },
    },
  ],
  access: {
    create: isAdmin,
    read: authenticated,
    update: isAdmin,
    delete: isAdmin,
  },
}
