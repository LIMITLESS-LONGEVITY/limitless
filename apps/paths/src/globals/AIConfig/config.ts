import type { GlobalConfig } from 'payload'
import { isAdmin } from '../../access/isAdmin'

export const AIConfig: GlobalConfig = {
  slug: 'ai-config',
  admin: {
    description: 'AI feature configuration — rate limits, model overrides, and feature toggles.',
  },
  access: {
    read: isAdmin,
    update: isAdmin,
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      label: 'AI Features Enabled',
      admin: { description: 'Global kill switch for all AI features' },
    },
    {
      name: 'rateLimits',
      type: 'array',
      label: 'User Rate Limits (per tier, per feature)',
      admin: { description: 'Daily quotas for subscriber tiers. Staff are soft-limited separately.' },
      fields: [
        {
          name: 'feature',
          type: 'text',
          required: true,
          admin: { description: 'Feature identifier (e.g., tutor-chat, quiz-generate)' },
        },
        {
          name: 'tier',
          type: 'select',
          required: true,
          options: [
            { label: 'Free', value: 'free' },
            { label: 'Regular', value: 'regular' },
            { label: 'Premium', value: 'premium' },
            { label: 'Enterprise', value: 'enterprise' },
          ],
        },
        {
          name: 'dailyLimit',
          type: 'number',
          required: true,
          admin: { description: '0 = no access, -1 = unlimited' },
        },
      ],
    },
    {
      name: 'staffSoftLimits',
      type: 'array',
      label: 'Staff Soft Limits',
      admin: { description: 'Warning thresholds for staff. Logged but not enforced.' },
      fields: [
        { name: 'feature', type: 'text', required: true },
        {
          name: 'dailyWarning',
          type: 'number',
          required: true,
          admin: { description: 'Daily usage count that triggers a warning log' },
        },
      ],
    },
    {
      name: 'tokenBudgets',
      type: 'group',
      label: 'Token Budgets',
      fields: [
        {
          name: 'tutorMaxTokens',
          type: 'number',
          defaultValue: 1024,
          admin: { description: 'Max output tokens per tutor response' },
        },
        {
          name: 'quizMaxTokens',
          type: 'number',
          defaultValue: 2048,
          admin: { description: 'Max output tokens per quiz generation' },
        },
        {
          name: 'actionPlanMaxTokens',
          type: 'number',
          defaultValue: 2048,
          admin: { description: 'Max output tokens per action plan generation' },
        },
        {
          name: 'dailyProtocolMaxTokens',
          type: 'number',
          defaultValue: 1024,
          admin: { description: 'Max output tokens per daily protocol generation' },
        },
        {
          name: 'discoverMaxTokens',
          type: 'number',
          defaultValue: 1024,
          admin: { description: 'Max output tokens per content discovery' },
        },
      ],
    },
    {
      name: 'defaultProvider',
      type: 'text',
      defaultValue: 'default',
      admin: { description: 'Default provider name (matches AI_PROVIDER_{NAME}_* env vars). Change to switch providers without a deploy.' },
    },
    {
      name: 'modelOverrides',
      type: 'array',
      label: 'Model Overrides',
      admin: { description: 'Override the default model for a feature. Leave empty to use defaults from code.' },
      fields: [
        { name: 'feature', type: 'text', required: true },
        { name: 'provider', type: 'text', required: true },
        { name: 'model', type: 'text', required: true },
      ],
    },
  ],
}
