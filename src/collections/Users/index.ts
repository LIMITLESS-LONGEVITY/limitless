import type { CollectionConfig } from 'payload'
import { authenticated } from '../../access/authenticated'
import { isAdmin, isAdminOrSelf } from '../../access/isAdmin'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', 'role'],
  },
  auth: {
    tokenExpiration: 28800, // 8 hours
    cookies: {
      domain: process.env.COOKIE_DOMAIN || undefined,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    },
    verify: process.env.CI === 'true' ? false : {
      generateEmailSubject: () => 'Verify your PATHS account',
      generateEmailHTML: ({ token }: { token: string }) => {
        const url = `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/verify-email?token=${token}`
        return `
          <div style="background-color: #0A0E1A; padding: 40px 20px; font-family: 'Inter', Arial, sans-serif;">
            <div style="max-width: 480px; margin: 0 auto; background-color: rgba(15,20,36,0.95); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px;">
              <h1 style="color: #FAFAFA; font-family: 'Georgia', serif; font-size: 24px; font-weight: 600; text-align: center; margin: 0 0 8px;">PATHS by LIMITLESS</h1>
              <p style="color: #B0B8C1; font-size: 14px; text-align: center; margin: 0 0 32px;">Verify your email address</p>
              <p style="color: #B0B8C1; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">Click the button below to verify your email address and activate your account.</p>
              <div style="text-align: center; margin: 0 0 24px;">
                <a href="${url}" style="display: inline-block; padding: 12px 32px; border: 1px solid #C9A84C; color: #C9A84C; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; border-radius: 9999px;">Verify Email</a>
              </div>
              <p style="color: #B0B8C1; font-size: 12px; line-height: 1.6; margin: 0 0 8px;">Or copy this link into your browser:</p>
              <p style="color: #C9A84C; font-size: 12px; word-break: break-all; margin: 0 0 32px;">${url}</p>
              <p style="color: rgba(176,184,193,0.5); font-size: 11px; text-align: center; margin: 0;">If you didn't create an account, you can ignore this email.</p>
            </div>
          </div>
        `
      },
    },
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Contributor', value: 'contributor' },
        { label: 'Editor', value: 'editor' },
        { label: 'Publisher', value: 'publisher' },
        { label: 'Admin', value: 'admin' },
      ],
    },
    {
      name: 'tier',
      type: 'relationship',
      relationTo: 'membership-tiers',
    },
    // Note: 'tenant' field is auto-injected by @payloadcms/plugin-multi-tenant
    // and serves as the organization relationship for access control.
    {
      name: 'stripeCustomerId',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
    // --- Professional Profile ---
    {
      name: 'bio',
      type: 'textarea',
      maxLength: 500,
      admin: {
        description: 'A short professional bio (max 500 characters)',
        condition: (data) =>
          ['contributor', 'editor', 'publisher', 'admin'].includes(data?.role),
      },
    },
    {
      name: 'expertise',
      type: 'array',
      admin: {
        description: 'Areas of specialization (e.g. "Metabolic Medicine", "Sleep Science")',
        condition: (data) =>
          ['contributor', 'editor', 'publisher', 'admin'].includes(data?.role),
      },
      fields: [
        {
          name: 'area',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'credentials',
      type: 'array',
      admin: {
        description: 'Professional credentials and qualifications',
        condition: (data) =>
          ['contributor', 'editor', 'publisher', 'admin'].includes(data?.role),
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          admin: { description: 'e.g. "PhD Longevity Science", "Board Certified Nutritionist"' },
        },
        {
          name: 'institution',
          type: 'text',
          admin: { description: 'e.g. "Weizmann Institute", "Harvard Medical School"' },
        },
        {
          name: 'year',
          type: 'number',
          admin: { description: 'Year awarded' },
        },
      ],
    },
    {
      name: 'linkedIn',
      type: 'text',
      admin: {
        description: 'LinkedIn profile URL',
        condition: (data) =>
          ['contributor', 'editor', 'publisher', 'admin'].includes(data?.role),
      },
    },
    {
      name: 'publicProfile',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Make your expert profile visible to all users',
        condition: (data) =>
          ['contributor', 'editor', 'publisher', 'admin'].includes(data?.role),
      },
    },
    // --- Onboarding ---
    {
      name: 'hasCompletedOnboarding',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    // --- Streaks ---
    {
      name: 'currentStreak',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true, position: 'sidebar', description: 'Consecutive days of lesson completions' },
    },
    {
      name: 'longestStreak',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true, position: 'sidebar', description: 'Longest streak achieved' },
    },
    {
      name: 'lastActivityDate',
      type: 'date',
      admin: { readOnly: true, position: 'sidebar', description: 'Last day a lesson was completed' },
    },
  ],
  access: {
    create: isAdmin,
    read: authenticated,
    update: isAdminOrSelf,
    delete: isAdmin,
    admin: ({ req: { user } }) =>
      Boolean(user?.role && ['admin', 'editor', 'publisher', 'contributor'].includes(user.role)),
  },
}
