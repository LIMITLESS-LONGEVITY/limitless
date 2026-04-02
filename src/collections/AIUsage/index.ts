import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../access/isAdmin'

export const AIUsage: CollectionConfig = {
  slug: 'ai-usage',
  admin: {
    useAsTitle: 'feature',
    defaultColumns: ['user', 'feature', 'model', 'inputTokens', 'outputTokens', 'estimatedCost', 'createdAt'],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'feature',
      type: 'text',
      required: true,
      admin: { description: 'AI feature identifier (e.g., tutor-chat, quiz-generate, quiz-save)' },
    },
    { name: 'provider', type: 'text', required: true },
    { name: 'model', type: 'text', required: true },
    { name: 'inputTokens', type: 'number', required: true },
    { name: 'outputTokens', type: 'number', required: true },
    {
      name: 'estimatedCost',
      type: 'number',
      required: true,
      admin: { description: 'Estimated cost in USD' },
    },
    { name: 'contextCollection', type: 'text' },
    { name: 'contextId', type: 'text' },
    {
      name: 'refused',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Whether guardrails triggered a refusal' },
    },
    { name: 'durationMs', type: 'number' },
  ],
  access: {
    create: () => false,
    read: isAdmin,
    update: () => false,
    delete: isAdmin,
  },
}
