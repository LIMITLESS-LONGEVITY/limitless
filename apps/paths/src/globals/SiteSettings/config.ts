import type { GlobalConfig } from 'payload'
import { isAdmin } from '../../access/isAdmin'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  admin: {
    group: 'Settings',
  },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    { name: 'siteName', type: 'text', defaultValue: 'PATHS by LIMITLESS' },
    { name: 'siteDescription', type: 'textarea' },
    {
      name: 'defaultTier',
      type: 'relationship',
      relationTo: 'membership-tiers',
      label: 'Default tier for new users',
    },
  ],
}
