import type { CollectionConfig } from 'payload'
import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'mimeType', 'updatedAt'],
  },
  upload: {
    // No video/audio uploads — YouTube/Vimeo embeds only (spec decision)
    mimeTypes: ['image/*', 'application/pdf'],
    imageSizes: [
      { name: 'thumbnail', width: 300, height: 200, position: 'centre' },
      { name: 'card', width: 600, height: 400, position: 'centre' },
      { name: 'hero', width: 1200, height: 600, position: 'centre' },
    ],
  },
  fields: [
    { name: 'alt', type: 'text', required: true }, // Required for accessibility
    { name: 'caption', type: 'text' },
  ],
  access: {
    create: authenticated,
    read: anyone,
    update: authenticated,
    delete: authenticated,
  },
}
