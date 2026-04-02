import type { CollectionConfig } from 'payload'
import { canCreateContent } from '../../access/canCreateContent'
import { canEditStructural } from '../../access/canEditStructural'
import { authenticated } from '../../access/authenticated'
import { isAdmin } from '../../access/isAdmin'
import { richTextEditor } from '../../fields/lexicalEditor'

export const Lessons: CollectionConfig = {
  slug: 'lessons',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'module', 'lessonType', 'order', 'updatedAt'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    {
      name: 'content',
      type: 'richText',
      editor: richTextEditor,
    },
    {
      name: 'module',
      type: 'relationship',
      relationTo: 'modules',
      required: true,
    },
    { name: 'order', type: 'number', required: true },
    {
      name: 'lessonType',
      type: 'select',
      defaultValue: 'text',
      options: [
        { label: 'Text', value: 'text' },
        { label: 'Video', value: 'video' },
        { label: 'Audio', value: 'audio' },
        { label: 'Mixed', value: 'mixed' },
      ],
    },
    {
      name: 'videoEmbed',
      type: 'group',
      admin: {
        condition: (data) => data?.lessonType === 'video' || data?.lessonType === 'mixed',
      },
      fields: [
        {
          name: 'platform',
          type: 'select',
          options: [
            { label: 'YouTube', value: 'youtube' },
            { label: 'Vimeo', value: 'vimeo' },
          ],
        },
        { name: 'url', type: 'text', label: 'Video URL' },
        { name: 'videoId', type: 'text', label: 'Video ID' },
      ],
    },
    {
      name: 'estimatedDuration',
      type: 'number',
      admin: { description: 'Duration in minutes' },
    },
    {
      name: 'resources',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'file', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
  access: {
    create: canCreateContent,
    read: authenticated,
    update: canEditStructural,
    delete: isAdmin,
  },
}
