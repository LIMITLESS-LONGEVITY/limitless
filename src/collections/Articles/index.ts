import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'
import { canReadContent } from '../../access/canReadContent'
import { canEditContent } from '../../access/canEditContent'
import { canCreateContent } from '../../access/canCreateContent'
import { isAdmin } from '../../access/isAdmin'
import { validateEditorialTransition } from '../../hooks/editorialWorkflow'
import { inheritPillarAccessLevel } from './hooks/inheritPillarAccessLevel'
import { computeLockedStatus } from '../../hooks/computeLockedStatus'
import { indexContentChunks } from '../../hooks/indexContentChunks'
import { richTextEditor } from '../../fields/lexicalEditor'

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'editorialStatus', 'accessLevel', 'pillar', 'author', 'updatedAt'],
    // RelatedContentPanel temporarily removed — admin component registration needs investigation
    // See: src/components/RelatedContentPanel/index.tsx (component exists, registration format TBD)
  },
  versions: {
    drafts: true,
    maxPerDoc: 25,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField(),
    { name: 'excerpt', type: 'textarea' },
    {
      name: 'content',
      type: 'richText',
      editor: richTextEditor,
    },
    { name: 'featuredImage', type: 'upload', relationTo: 'media' },
    {
      name: 'pillar',
      type: 'relationship',
      relationTo: 'content-pillars',
      required: true,
    },
    {
      name: 'accessLevel',
      type: 'select',
      required: true,
      defaultValue: 'free',
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
        description: 'Transitions are role-enforced: Contributors → In Review, Editors → Approved, Publishers → Published.',
        components: {
          Field: '/components/admin/EditorialStatusField#EditorialStatusField',
        },
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'reviewer',
      type: 'relationship',
      relationTo: 'users',
    },
    { name: 'reviewerNotes', type: 'textarea' },
    { name: 'publishedAt', type: 'date' },
    {
      name: 'relatedCourses',
      type: 'relationship',
      relationTo: 'courses',
      hasMany: true,
    },
  ],
  hooks: {
    beforeChange: [validateEditorialTransition, inheritPillarAccessLevel],
    afterRead: [computeLockedStatus],
    afterChange: [indexContentChunks],
  },
  access: {
    create: canCreateContent,
    read: canReadContent,
    update: canEditContent,
    delete: isAdmin,
  },
}
