import type { CollectionConfig } from 'payload'
import { canReadContent } from '../../access/canReadContent'
import type { Access } from 'payload'
import { canCreateContent } from '../../access/canCreateContent'
import { isAdmin } from '../../access/isAdmin'
import { validateEditorialTransition } from '../../hooks/editorialWorkflow'
import { calculateDuration } from './hooks/calculateDuration'
import { computeLockedStatus } from '../../hooks/computeLockedStatus'
import { richTextEditor } from '../../fields/lexicalEditor'

/**
 * Update access for Courses. Same as canEditContent but uses
 * `instructor` field instead of `author` for contributor scope.
 */
const canEditCourse: Access = ({ req: { user } }) => {
  if (!user) return false
  const role = user.role as string
  if (['admin', 'publisher', 'editor'].includes(role)) return true
  if (role === 'contributor') {
    return {
      and: [
        { instructor: { equals: user.id } },
        { editorialStatus: { equals: 'draft' } },
      ],
    }
  }
  return false
}

export const Courses: CollectionConfig = {
  slug: 'courses',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'editorialStatus', 'accessLevel', 'pillar', 'instructor', 'updatedAt'],
  },
  versions: {
    drafts: true,
    maxPerDoc: 10,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    {
      name: 'description',
      type: 'richText',
      editor: richTextEditor,
    },
    { name: 'featuredImage', type: 'upload', relationTo: 'media' },
    { name: 'pillar', type: 'relationship', relationTo: 'content-pillars' },
    {
      name: 'accessLevel',
      type: 'select',
      required: true,
      defaultValue: 'premium',
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Regular', value: 'regular' },
        { label: 'Premium', value: 'premium' },
        { label: 'Enterprise', value: 'enterprise' },
      ],
    },
    {
      name: 'editorialStatus',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'In Review', value: 'in_review' },
        { label: 'Approved', value: 'approved' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: {
        components: {
          Field: '/components/admin/EditorialStatusField#EditorialStatusField',
        },
      },
    },
    { name: 'instructor', type: 'relationship', relationTo: 'users' },
    { name: 'modules', type: 'relationship', relationTo: 'modules', hasMany: true },
    { name: 'relatedArticles', type: 'relationship', relationTo: 'articles', hasMany: true },
    {
      name: 'estimatedDuration',
      type: 'number',
      admin: { description: 'Total duration in minutes (auto-calculated from lessons)' },
    },
    { name: 'publishedAt', type: 'date' },
  ],
  hooks: {
    beforeChange: [validateEditorialTransition, calculateDuration],
    afterRead: [computeLockedStatus],
  },
  access: {
    create: canCreateContent,
    read: canReadContent,
    update: canEditCourse,
    delete: isAdmin,
  },
}
