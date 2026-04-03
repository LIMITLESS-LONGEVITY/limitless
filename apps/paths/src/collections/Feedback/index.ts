import type { CollectionConfig } from 'payload'
import { authenticated } from '../../access/authenticated'
import { isAdmin } from '../../access/isAdmin'

export const Feedback: CollectionConfig = {
  slug: 'feedback',
  admin: {
    useAsTitle: 'category',
    defaultColumns: ['category', 'satisfaction', 'status', 'createdAt'],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        condition: () => true,
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Experience', value: 'experience' },
        { label: 'Content', value: 'content' },
        { label: 'Feature Request', value: 'feature_request' },
        { label: 'Bug Report', value: 'bug_report' },
      ],
    },
    {
      name: 'satisfaction',
      type: 'select',
      required: true,
      options: [
        { label: 'Exceptional', value: 'exceptional' },
        { label: 'Good', value: 'good' },
        { label: 'Could Improve', value: 'could_improve' },
      ],
    },
    {
      name: 'message',
      type: 'textarea',
    },
    {
      name: 'pageUrl',
      type: 'text',
    },
    {
      name: 'anonymous',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Reviewed', value: 'reviewed' },
        { label: 'Actioned', value: 'actioned' },
        { label: 'Closed', value: 'closed' },
      ],
      access: {
        create: () => false,
        update: isAdmin,
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      access: {
        create: () => false,
        read: isAdmin,
        update: isAdmin,
      },
      admin: {
        position: 'sidebar',
      },
    },
  ],
  access: {
    create: authenticated,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
}
