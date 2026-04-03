# PATHS Payload CMS — Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Payload CMS project, configure core infrastructure (PostgreSQL, R2, Redis), define foundation collections (Users, MembershipTiers, Media, ContentPillars), set up auth with cookie-domain SSO, configure the Lexical editor with custom blocks, and deploy the split architecture (Vercel frontend + Render backend).

**Architecture:** Payload 3.x installed into a Next.js 15 App Router project. Backend runs as a standalone Node.js app on Render (persistent process for AI streaming and webhooks). Frontend is a separate Next.js app on Vercel that calls the Payload REST API. PostgreSQL on Render, file storage on Cloudflare R2, Redis on Render for caching.

**Tech Stack:** Payload CMS 3.x, Next.js 15, TypeScript, PostgreSQL 16, Cloudflare R2 (via `@payloadcms/storage-r2`), Redis, Vitest, Docker Compose

**Spec:** `docs/superpowers/specs/2026-03-23-paths-payload-migration-design.md`

**Working directory:** The Payload project will be developed in a fresh clone of `github.com/LIMITLESS-LONGEVITY/limitless-paths`. Local path: `C:/Projects/LIMITLESS/limitless-paths/`

---

## File Structure

After this phase, the project will have:

```
limitless-paths/
├── .env                           # Local dev secrets (gitignored)
├── .env.example                   # Template for env vars
├── .gitignore
├── docker-compose.yml             # PostgreSQL + Redis for local dev
├── Dockerfile                     # Render deployment
├── next.config.ts                 # Next.js config with Payload
├── package.json
├── tsconfig.json
├── tailwind.config.mjs
├── postcss.config.js
├── vitest.config.mts
├── vitest.setup.ts
├── tests/
│   ├── helpers/
│   │   └── seed.ts                # Test user/data seeding
│   └── int/
│       ├── users.int.spec.ts      # Users collection tests
│       ├── tiers.int.spec.ts      # MembershipTiers tests
│       ├── pillars.int.spec.ts    # ContentPillars tests
│       └── media.int.spec.ts      # Media collection tests
└── src/
    ├── payload.config.ts          # Main Payload config
    ├── payload-types.ts           # Auto-generated types
    ├── access/
    │   ├── anyone.ts              # Public read access
    │   ├── authenticated.ts       # Logged-in users only
    │   └── isAdmin.ts             # Admin role check
    ├── blocks/
    │   ├── VideoEmbed/
    │   │   └── config.ts          # YouTube/Vimeo embed block
    │   ├── Callout/
    │   │   └── config.ts          # Info/warning/tip callout block
    │   └── CodeBlock/
    │       └── config.ts          # Syntax-highlighted code block
    ├── collections/
    │   ├── Users/
    │   │   └── index.ts           # Users collection (auth-enabled)
    │   ├── MembershipTiers/
    │   │   └── index.ts           # Tier definitions
    │   ├── ContentPillars/
    │   │   └── index.ts           # Content taxonomy
    │   └── Media/
    │       └── index.ts           # Uploads → R2
    ├── fields/
    │   └── lexicalEditor.ts       # Shared Lexical config with custom blocks
    ├── globals/
    │   └── SiteSettings/
    │       └── config.ts          # Global site configuration
    └── utilities/
        └── accessLevels.ts        # Access level hierarchy + "highest wins" logic
```

---

## Task 1: Scaffold Payload Project

**Files:**
- Create: `C:/Projects/LIMITLESS/limitless-paths/` (entire project)
- Create: `.env`
- Modify: `package.json` (add dependencies)

- [ ] **Step 1: Clone and reset the GitHub repo**

```bash
cd C:/Projects/LIMITLESS
git clone https://github.com/LIMITLESS-LONGEVITY/limitless-paths.git
cd limitless-paths
git checkout main
# Remove all LearnHouse files
git rm -rf . 2>/dev/null || true
git clean -fd
```

- [ ] **Step 2: Scaffold Payload from website template**

```bash
cd C:/Projects/LIMITLESS
npx create-payload-app@latest limitless-paths-scaffold -t website --db postgres
```

When prompted, select PostgreSQL. Then move the generated files into our repo:

```bash
# Copy scaffold contents into our repo (excluding .git)
cp -r limitless-paths-scaffold/* limitless-paths/
cp limitless-paths-scaffold/.* limitless-paths/ 2>/dev/null || true
rm -rf limitless-paths-scaffold
```

- [ ] **Step 3: Create `.env` from template**

Create `C:/Projects/LIMITLESS/limitless-paths/.env`:

```env
# Database (local Docker)
DATABASE_URL=postgresql://limitless:limitless_dev@localhost:5433/limitless_paths

# Payload
PAYLOAD_SECRET=limitless-dev-secret-change-in-production-minimum-32-chars
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# R2 Storage (copy values from .env.development in parent project)
R2_BUCKET=limitless-paths-content-dev
R2_ACCESS_KEY_ID=<from .env.development R2_API_TOKEN_ACCESS_KEY_ID>
R2_SECRET_ACCESS_KEY=<from .env.development R2_API_TOKEN_SECRET_ACCESS_KEY>
R2_ENDPOINT=https://<cloudflare-account-id>.r2.cloudflarestorage.com

# Redis
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 4: Create `docker-compose.yml` for local dev**

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: limitless
      POSTGRES_PASSWORD: limitless_dev
      POSTGRES_DB: limitless_paths
      POSTGRES_HOST_AUTH_METHOD: trust
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

- [ ] **Step 5: Install additional dependencies**

```bash
cd C:/Projects/LIMITLESS/limitless-paths
pnpm add @payloadcms/storage-r2 @payloadcms/plugin-multi-tenant @payloadcms/plugin-search @payloadcms/plugin-seo
```

- [ ] **Step 6: Start Docker and verify the scaffold runs**

```bash
docker compose up -d
pnpm dev
```

Visit `http://localhost:3000/admin` — should see the Payload admin setup screen. Create the first admin user.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Scaffold Payload CMS project from website template with PostgreSQL"
```

---

## Task 2: Define Access Control Functions

**Files:**
- Create: `src/access/anyone.ts`
- Create: `src/access/authenticated.ts`
- Create: `src/access/isAdmin.ts`
- Create: `src/utilities/accessLevels.ts`

- [ ] **Step 1: Write access control functions**

`src/access/anyone.ts`:
```ts
import type { Access } from 'payload'

export const anyone: Access = () => true
```

`src/access/authenticated.ts`:
```ts
import type { Access } from 'payload'

export const authenticated: Access = ({ req: { user } }) => {
  return Boolean(user)
}
```

`src/access/isAdmin.ts`:
```ts
import type { Access } from 'payload'

export const isAdmin: Access = ({ req: { user } }) => {
  return user?.role === 'admin'
}

export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { id: { equals: user.id } }
}
```

`src/utilities/accessLevels.ts`:
```ts
export const ACCESS_LEVEL_HIERARCHY = ['free', 'regular', 'premium', 'enterprise'] as const
export type AccessLevel = (typeof ACCESS_LEVEL_HIERARCHY)[number]

/**
 * "Highest wins" — returns the higher of two access levels.
 */
export function higherOf(a?: string | null, b?: string | null): AccessLevel {
  const indexA = ACCESS_LEVEL_HIERARCHY.indexOf((a as AccessLevel) ?? 'free')
  const indexB = ACCESS_LEVEL_HIERARCHY.indexOf((b as AccessLevel) ?? 'free')
  return ACCESS_LEVEL_HIERARCHY[Math.max(indexA, indexB)] ?? 'free'
}

/**
 * Returns all access levels up to and including the effective level.
 * Used in Payload Where queries: { accessLevel: { in: getEffectiveAccessLevels(user) } }
 */
export function getEffectiveAccessLevels(tierLevel?: string | null, orgLevel?: string | null): AccessLevel[] {
  const effective = higherOf(tierLevel, orgLevel)
  const index = ACCESS_LEVEL_HIERARCHY.indexOf(effective)
  return [...ACCESS_LEVEL_HIERARCHY.slice(0, index + 1)]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/access/ src/utilities/accessLevels.ts
git commit -m "Add access control functions and access level hierarchy utility"
```

---

## Task 3: Define Users Collection

**Files:**
- Create: `src/collections/Users/index.ts`
- Create: `tests/int/users.int.spec.ts`

- [ ] **Step 0: Ensure vitest config and setup exist**

The website template includes `vitest.config.mts` and `vitest.setup.ts`. Verify these files exist and that `@/` path alias resolves correctly. If not, create them:

```ts
// vitest.config.mts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['tests/int/**/*.int.spec.ts'],
    testTimeout: 30000,
  },
})
```

> **Test isolation note:** Integration tests share a database. Each test should use unique identifiers (e.g., unique emails/slugs) to avoid conflicts. For heavyweight cleanup, use `payload.delete()` in `afterAll` or test-specific prefixes.

- [ ] **Step 1: Write the Users collection test**

`tests/int/users.int.spec.ts`:
```ts
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

describe('Users collection', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('creates a user with required fields', async () => {
    const user = await payload.create({
      collection: 'users',
      data: {
        email: 'test@limitless-longevity.health',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      },
    })
    expect(user.email).toBe('test@limitless-longevity.health')
    expect(user.firstName).toBe('Test')
    expect(user.lastName).toBe('User')
    expect(user.role).toBe('user')
  })

  it('defaults role to user', async () => {
    const user = await payload.create({
      collection: 'users',
      data: {
        email: 'default-role@test.com',
        password: 'TestPassword123!',
        firstName: 'Default',
        lastName: 'Role',
      },
    })
    expect(user.role).toBe('user')
  })

  it('supports all role options', async () => {
    const roles = ['user', 'contributor', 'editor', 'publisher', 'admin']
    for (const role of roles) {
      const user = await payload.create({
        collection: 'users',
        data: {
          email: `${role}@test.com`,
          password: 'TestPassword123!',
          firstName: role,
          lastName: 'Test',
          role,
        },
      })
      expect(user.role).toBe(role)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/int/users.int.spec.ts
```

Expected: FAIL (collection fields don't match yet)

- [ ] **Step 3: Write the Users collection**

`src/collections/Users/index.ts`:
```ts
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
      sameSite: 'lax',
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
    // The "highest wins" logic uses user.tenant.contentAccessLevel.
    {
      name: 'emailVerified',
      type: 'checkbox',
      defaultValue: false,
    },
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
  ],
  access: {
    create: isAdmin,
    read: authenticated,
    update: isAdminOrSelf,
    delete: isAdmin,
    admin: ({ req: { user } }) =>
      Boolean(user?.role && ['admin', 'editor', 'publisher'].includes(user.role)),
  },
}
```

- [ ] **Step 4: Register Users in payload.config.ts**

Update `src/payload.config.ts` to import and register the Users collection (replacing the template's default Users). Also ensure the PostgreSQL adapter and other config is correct.

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm vitest run tests/int/users.int.spec.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/collections/Users/ tests/int/users.int.spec.ts src/payload.config.ts
git commit -m "Add Users collection with roles, tier relationship, and JWT cookie auth"
```

---

## Task 4: Define MembershipTiers Collection

**Files:**
- Create: `src/collections/MembershipTiers/index.ts`
- Create: `tests/int/tiers.int.spec.ts`

- [ ] **Step 1: Write the MembershipTiers test**

`tests/int/tiers.int.spec.ts`:
```ts
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

describe('MembershipTiers collection', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('creates a tier with all fields', async () => {
    const tier = await payload.create({
      collection: 'membership-tiers',
      data: {
        name: 'Premium',
        slug: 'premium',
        accessLevel: 'premium',
        monthlyPrice: 29.99,
        yearlyPrice: 299.99,
        displayOrder: 2,
        isActive: true,
        features: [
          { feature: 'All articles' },
          { feature: 'All courses' },
          { feature: 'AI tutor' },
        ],
      },
    })
    expect(tier.name).toBe('Premium')
    expect(tier.accessLevel).toBe('premium')
    expect(tier.features).toHaveLength(3)
  })

  it('enforces unique slug', async () => {
    await payload.create({
      collection: 'membership-tiers',
      data: { name: 'Free', slug: 'free-unique', accessLevel: 'free' },
    })
    await expect(
      payload.create({
        collection: 'membership-tiers',
        data: { name: 'Free Duplicate', slug: 'free-unique', accessLevel: 'free' },
      }),
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/int/tiers.int.spec.ts
```

Expected: FAIL

- [ ] **Step 3: Write the MembershipTiers collection**

`src/collections/MembershipTiers/index.ts`:
```ts
import type { CollectionConfig } from 'payload'
import { authenticated } from '../../access/authenticated'
import { isAdmin } from '../../access/isAdmin'
import { anyone } from '../../access/anyone'

export const MembershipTiers: CollectionConfig = {
  slug: 'membership-tiers',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'accessLevel', 'monthlyPrice', 'displayOrder', 'isActive'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    {
      name: 'accessLevel',
      type: 'select',
      required: true,
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Regular', value: 'regular' },
        { label: 'Premium', value: 'premium' },
        { label: 'Enterprise', value: 'enterprise' },
      ],
    },
    { name: 'monthlyPrice', type: 'number' },
    { name: 'yearlyPrice', type: 'number' },
    { name: 'stripeMonthlyPriceId', type: 'text', admin: { position: 'sidebar' } },
    { name: 'stripeYearlyPriceId', type: 'text', admin: { position: 'sidebar' } },
    { name: 'stripeProductId', type: 'text', admin: { position: 'sidebar' } },
    {
      name: 'features',
      type: 'array',
      fields: [{ name: 'feature', type: 'text', required: true }],
    },
    { name: 'displayOrder', type: 'number', defaultValue: 0 },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
  access: {
    create: isAdmin,
    read: anyone,
    update: isAdmin,
    delete: isAdmin,
  },
}
```

- [ ] **Step 4: Register in payload.config.ts and run tests**

```bash
pnpm vitest run tests/int/tiers.int.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/collections/MembershipTiers/ tests/int/tiers.int.spec.ts src/payload.config.ts
git commit -m "Add MembershipTiers collection with Stripe fields and access levels"
```

---

## Task 5: Define Media Collection with R2 Storage

**Files:**
- Create: `src/collections/Media/index.ts`
- Modify: `src/payload.config.ts` (add S3 storage plugin)

- [ ] **Step 1: Write the Media collection**

`src/collections/Media/index.ts`:
```ts
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
    { name: 'alt', type: 'text', required: true }, // Required for accessibility (stricter than spec)
    { name: 'caption', type: 'text' },
  ],
  access: {
    create: authenticated,
    read: anyone,
    update: authenticated,
    delete: authenticated,
  },
}
```

- [ ] **Step 2: Configure R2 storage plugin in payload.config.ts**

Add to `src/payload.config.ts` plugins array:

```ts
import { r2Storage } from '@payloadcms/storage-r2'

// In the plugins array:
r2Storage({
  collections: {
    media: true,
  },
  bucket: process.env.R2_BUCKET || '',
  config: {
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || '',
  },
}),
```

- [ ] **Step 3: Verify admin panel shows Media collection with upload**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/admin/collections/media` — should show upload interface.

- [ ] **Step 4: Commit**

```bash
git add src/collections/Media/ src/payload.config.ts
git commit -m "Add Media collection with R2 storage via S3 adapter"
```

---

## Task 6: Define ContentPillars Collection

> **Spec deviation note:** ContentPillars is listed in Phase 2 of the spec, but pulled forward here because it's a simple collection with no dependencies, and it's needed to seed default data (Task 13). This avoids a blocky Phase 2.

**Files:**
- Create: `src/collections/ContentPillars/index.ts`
- Create: `tests/int/pillars.int.spec.ts`

- [ ] **Step 1: Write the ContentPillars test**

`tests/int/pillars.int.spec.ts`:
```ts
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

describe('ContentPillars collection', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('creates a pillar with all fields', async () => {
    const pillar = await payload.create({
      collection: 'content-pillars',
      data: {
        name: 'Nutrition',
        slug: 'nutrition',
        description: 'Nutrition and dietary science',
        icon: 'nutrition',
        defaultAccessLevel: 'free',
        displayOrder: 1,
        isActive: true,
      },
    })
    expect(pillar.name).toBe('Nutrition')
    expect(pillar.defaultAccessLevel).toBe('free')
  })

  it('creates all 6 default pillars', async () => {
    const pillars = ['Movement', 'Sleep', 'Mental Health', 'Medicine', 'Health Tech']
    for (const [i, name] of pillars.entries()) {
      const slug = name.toLowerCase().replace(/\s+/g, '-')
      const pillar = await payload.create({
        collection: 'content-pillars',
        data: { name, slug, displayOrder: i + 2, isActive: true },
      })
      expect(pillar.name).toBe(name)
    }
    const all = await payload.find({ collection: 'content-pillars', limit: 100 })
    expect(all.totalDocs).toBeGreaterThanOrEqual(6)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/int/pillars.int.spec.ts
```

- [ ] **Step 3: Write the ContentPillars collection**

`src/collections/ContentPillars/index.ts`:
```ts
import type { CollectionConfig } from 'payload'
import { anyone } from '../../access/anyone'
import { isAdmin } from '../../access/isAdmin'

export const ContentPillars: CollectionConfig = {
  slug: 'content-pillars',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'defaultAccessLevel', 'displayOrder', 'isActive'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea' },
    { name: 'icon', type: 'text' },
    {
      name: 'defaultAccessLevel',
      type: 'select',
      defaultValue: 'free',
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Regular', value: 'regular' },
        { label: 'Premium', value: 'premium' },
        { label: 'Enterprise', value: 'enterprise' },
      ],
    },
    { name: 'displayOrder', type: 'number', defaultValue: 0 },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
  access: {
    create: isAdmin,
    read: anyone,
    update: isAdmin,
    delete: isAdmin,
  },
}
```

- [ ] **Step 4: Register in payload.config.ts and run tests**

```bash
pnpm vitest run tests/int/pillars.int.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/collections/ContentPillars/ tests/int/pillars.int.spec.ts src/payload.config.ts
git commit -m "Add ContentPillars collection with 6-pillar taxonomy and access level defaults"
```

---

## Task 7: Configure Lexical Editor with Custom Blocks

**Files:**
- Create: `src/blocks/VideoEmbed/config.ts`
- Create: `src/blocks/Callout/config.ts`
- Create: `src/blocks/CodeBlock/config.ts`
- Create: `src/fields/lexicalEditor.ts`

- [ ] **Step 1: Define the VideoEmbed block**

`src/blocks/VideoEmbed/config.ts`:
```ts
import type { Block } from 'payload'

export const VideoEmbed: Block = {
  slug: 'videoEmbed',
  interfaceName: 'VideoEmbedBlock',
  labels: { singular: 'Video Embed', plural: 'Video Embeds' },
  fields: [
    {
      name: 'platform',
      type: 'select',
      required: true,
      options: [
        { label: 'YouTube', value: 'youtube' },
        { label: 'Vimeo', value: 'vimeo' },
      ],
    },
    { name: 'url', type: 'text', required: true, label: 'Video URL' },
    { name: 'videoId', type: 'text', label: 'Video ID (auto-extracted)' },
    { name: 'caption', type: 'text' },
  ],
}
```

- [ ] **Step 2: Define the Callout block**

`src/blocks/Callout/config.ts`:
```ts
import type { Block } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

export const Callout: Block = {
  slug: 'callout',
  interfaceName: 'CalloutBlock',
  labels: { singular: 'Callout', plural: 'Callouts' },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'info',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Warning', value: 'warning' },
        { label: 'Tip', value: 'tip' },
        { label: 'Quote', value: 'quote' },
      ],
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: ({ rootFeatures }) => rootFeatures,
      }),
    },
  ],
}
```

- [ ] **Step 3: Define the CodeBlock**

`src/blocks/CodeBlock/config.ts`:
```ts
import type { Block } from 'payload'

export const CodeBlock: Block = {
  slug: 'codeBlock',
  interfaceName: 'CodeBlockBlock',
  labels: { singular: 'Code Block', plural: 'Code Blocks' },
  fields: [
    {
      name: 'language',
      type: 'select',
      defaultValue: 'javascript',
      options: [
        { label: 'JavaScript', value: 'javascript' },
        { label: 'TypeScript', value: 'typescript' },
        { label: 'Python', value: 'python' },
        { label: 'HTML', value: 'html' },
        { label: 'CSS', value: 'css' },
        { label: 'Bash', value: 'bash' },
        { label: 'JSON', value: 'json' },
        { label: 'Plain Text', value: 'plaintext' },
      ],
    },
    { name: 'code', type: 'code', required: true },
  ],
}
```

- [ ] **Step 4: Create shared Lexical editor config**

`src/fields/lexicalEditor.ts`:
```ts
import { lexicalEditor, BlocksFeature } from '@payloadcms/richtext-lexical'
import { VideoEmbed } from '../blocks/VideoEmbed/config'
import { Callout } from '../blocks/Callout/config'
import { CodeBlock } from '../blocks/CodeBlock/config'

export const richTextEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures,
    BlocksFeature({
      blocks: [VideoEmbed, Callout, CodeBlock],
    }),
  ],
})
```

- [ ] **Step 5: Verify blocks appear in admin panel**

Start dev server, create a test page/post, open the rich text editor. Type `/` to invoke the slash menu — should see VideoEmbed, Callout, and CodeBlock options.

- [ ] **Step 6: Commit**

```bash
git add src/blocks/ src/fields/lexicalEditor.ts
git commit -m "Add custom Lexical blocks: VideoEmbed, Callout, CodeBlock with shared editor config"
```

---

## Task 8: Configure Multi-Tenant Plugin

**Files:**
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Add tenants collection and configure plugin**

The multi-tenant plugin needs a `tenants` collection. Add to `src/payload.config.ts`:

```ts
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'

// Add tenants collection
const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: { useAsTitle: 'name' },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    {
      name: 'contentAccessLevel',
      type: 'select',
      defaultValue: 'free',
      options: ['free', 'regular', 'premium', 'enterprise'],
    },
  ],
  access: {
    create: isAdmin,
    read: authenticated,
    update: isAdmin,
    delete: isAdmin,
  },
}

// In plugins array:
multiTenantPlugin({
  collections: {
    // Collections that will be scoped by tenant (added in Phase 2)
  },
  tenantsSlug: 'tenants',
  cleanupAfterTenantDelete: true,
  enabled: true,
  userHasAccessToAllTenants: ({ req: { user } }) => {
    return user?.role === 'admin'
  },
}),
```

- [ ] **Step 2: Verify tenants collection exists in admin**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/admin/collections/tenants` — should see empty list. Create a test tenant "LIMITLESS Default".

- [ ] **Step 3: Commit**

```bash
git add src/payload.config.ts
git commit -m "Configure multi-tenant plugin with tenants collection for B2B org isolation"
```

---

## Task 9: Configure SiteSettings Global

**Files:**
- Create: `src/globals/SiteSettings/config.ts`
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Define SiteSettings global**

`src/globals/SiteSettings/config.ts`:
```ts
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
    {
      name: 'defaultPillars',
      type: 'group',
      fields: [
        { name: 'autoCreate', type: 'checkbox', defaultValue: true, label: 'Auto-create default pillars on first run' },
      ],
    },
  ],
}
```

- [ ] **Step 2: Register in payload.config.ts**

Add to the `globals` array in the Payload config.

- [ ] **Step 3: Commit**

```bash
git add src/globals/ src/payload.config.ts
git commit -m "Add SiteSettings global with default tier and pillar configuration"
```

---

## Task 10: Assemble Final payload.config.ts

**Files:**
- Modify: `src/payload.config.ts` (final assembly)

- [ ] **Step 1: Clean up and finalize payload.config.ts**

Ensure `src/payload.config.ts` imports and registers all collections, globals, and plugins created in Tasks 1-9. Remove template defaults that were replaced (template's Posts, Pages, Categories, etc. — keep only what's needed).

The final config should have:
- **Collections:** Users, MembershipTiers, ContentPillars, Media, Tenants
- **Globals:** SiteSettings (+ Header/Footer from template if keeping them)
- **Plugins:** s3Storage (R2), multiTenantPlugin, searchPlugin (empty for now), seoPlugin
- **Editor:** Lexical with BlocksFeature
- **DB:** PostgreSQL adapter

- [ ] **Step 2: Run all tests**

```bash
pnpm vitest run
```

Expected: All tests pass

- [ ] **Step 3: Generate types**

```bash
pnpm payload generate:types
```

This creates/updates `src/payload-types.ts` with TypeScript types for all collections.

- [ ] **Step 4: Commit**

```bash
git add src/payload.config.ts src/payload-types.ts
git commit -m "Finalize Payload config: all Phase 1 collections, plugins, and editor"
```

---

## Task 11: Configure Dockerfile and Render Deployment

**Files:**
- Modify: `Dockerfile`
- Modify: `next.config.ts`
- Create: `.env.example`

- [ ] **Step 1: Ensure next.config.ts has standalone output**

`next.config.ts`:
```ts
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // ... other config
}

export default withPayload(nextConfig)
```

- [ ] **Step 2: Verify Dockerfile exists and works**

The website template includes a Dockerfile. Verify it builds:

```bash
docker build -t paths-api .
```

If build succeeds, the image is ready for Render.

- [ ] **Step 3: Create .env.example**

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Payload
PAYLOAD_SECRET=generate-a-long-random-string-minimum-32-chars
NEXT_PUBLIC_SERVER_URL=https://paths-api.limitless-longevity.health

# Auth
COOKIE_DOMAIN=.limitless-longevity.health

# R2 Storage
R2_BUCKET=limitless-paths-content
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com

# Redis
REDIS_URL=redis://host:6379
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile next.config.ts .env.example
git commit -m "Configure standalone build for Render deployment with .env.example"
```

---

## Task 12: Add Terraform Resources for New Infrastructure

**Files:**
- Modify: `C:/Projects/LIMITLESS/limitless-infra/paths.tf`
- Modify: `C:/Projects/LIMITLESS/limitless-infra/outputs.tf`
- Modify: `C:/Projects/LIMITLESS/limitless-infra/variables.tf`

- [ ] **Step 1: Add Payload-era resources to paths.tf**

Define new resources in `limitless-infra/paths.tf`:
- Render PostgreSQL (new database)
- Render Redis (free tier)
- Render web service (Payload backend, Docker)
- Cloudflare R2 bucket (new)
- Cloudflare DNS records (paths, paths-api)
- Sentry team + projects (paths-api, paths-web)

Follow the same patterns from the previous Terraform implementation (env_vars map, runtime_source block, etc.). Reference the gotchas documented in `feedback_terraform_gotchas.md` and `feedback_deployment_gotchas.md`.

- [ ] **Step 2: Run terraform plan**

```bash
cd C:/Projects/LIMITLESS/limitless-infra
terraform plan
```

Review the plan — should show new resources to create, no resources to destroy.

- [ ] **Step 3: Apply terraform**

```bash
terraform apply
```

- [ ] **Step 4: Push Payload code to limitless-paths repo**

```bash
cd C:/Projects/LIMITLESS/limitless-paths
git push origin main
```

Render should auto-deploy from the push.

- [ ] **Step 5: Verify deployment**

- Visit `https://paths-api.limitless-longevity.health/admin` — should show Payload admin login
- Create admin user via the setup screen
- Visit `https://paths-api.limitless-longevity.health/api/users` — should return JSON

- [ ] **Step 6: Commit Terraform changes**

```bash
cd C:/Projects/LIMITLESS/limitless-infra
git add paths.tf outputs.tf variables.tf
git commit -m "Add Payload CMS infrastructure: Render backend, PostgreSQL, Redis, R2, DNS, Sentry"
git push origin master  # Note: limitless-infra uses 'master' branch
```

---

## Task 13: Seed Default Data

**Files:**
- Create: `src/endpoints/seed/index.ts`

- [ ] **Step 1: Create seed endpoint**

`src/endpoints/seed/index.ts`:
```ts
import type { PayloadRequest } from 'payload'

export const seedHandler = async (req: PayloadRequest): Promise<Response> => {
  const { payload, user } = req

  if (!user || (user as any).role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Seed default membership tiers
  const tiers = [
    { name: 'Free', slug: 'free', accessLevel: 'free', displayOrder: 0, isActive: true },
    { name: 'Regular', slug: 'regular', accessLevel: 'regular', monthlyPrice: 9.99, yearlyPrice: 99.99, displayOrder: 1, isActive: true },
    { name: 'Premium', slug: 'premium', accessLevel: 'premium', monthlyPrice: 29.99, yearlyPrice: 299.99, displayOrder: 2, isActive: true },
    { name: 'Enterprise', slug: 'enterprise', accessLevel: 'enterprise', displayOrder: 3, isActive: true },
  ]

  for (const tier of tiers) {
    const existing = await payload.find({
      collection: 'membership-tiers',
      where: { slug: { equals: tier.slug } },
    })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'membership-tiers', data: tier })
    }
  }

  // Seed default content pillars
  const pillars = [
    { name: 'Nutrition', slug: 'nutrition', icon: 'nutrition', displayOrder: 1 },
    { name: 'Movement', slug: 'movement', icon: 'movement', displayOrder: 2 },
    { name: 'Sleep', slug: 'sleep', icon: 'sleep', displayOrder: 3 },
    { name: 'Mental Health', slug: 'mental-health', icon: 'mental-health', displayOrder: 4 },
    { name: 'Medicine', slug: 'medicine', icon: 'medicine', displayOrder: 5 },
    { name: 'Health Tech', slug: 'health-tech', icon: 'health-tech', displayOrder: 6 },
  ]

  for (const pillar of pillars) {
    const existing = await payload.find({
      collection: 'content-pillars',
      where: { slug: { equals: pillar.slug } },
    })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'content-pillars', data: { ...pillar, isActive: true } })
    }
  }

  // Seed default tenant
  const defaultTenant = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: 'limitless' } },
  })
  if (defaultTenant.totalDocs === 0) {
    await payload.create({
      collection: 'tenants',
      data: { name: 'LIMITLESS', slug: 'limitless', contentAccessLevel: 'enterprise' },
    })
  }

  return Response.json({ success: true, message: 'Default data seeded' })
}
```

- [ ] **Step 2: Register the seed endpoint in payload.config.ts**

```ts
import { seedHandler } from './endpoints/seed'

// In buildConfig:
endpoints: [
  {
    path: '/seed',
    method: 'post',
    handler: seedHandler,
  },
],
```

> **Note:** In Payload 3.x, custom endpoints are defined in the `endpoints` array of `buildConfig`. The handler receives a `PayloadRequest` and must return a `Response`.

- [ ] **Step 3: Run seed on production**

```bash
curl -X POST https://paths-api.limitless-longevity.health/api/seed \
  -H "Authorization: Bearer <admin-jwt-token>"
```

- [ ] **Step 4: Verify seeded data in admin panel**

Navigate to admin panel → MembershipTiers (should show 4), ContentPillars (should show 6), Tenants (should show 1).

- [ ] **Step 5: Commit**

```bash
git add src/endpoints/ src/payload.config.ts
git commit -m "Add seed endpoint for default tiers, pillars, and tenant"
git push origin main
```

---

## Phase 1 Milestone Checklist

After completing all 13 tasks, verify:

- [ ] Admin can log in to Payload admin panel at `paths-api.limitless-longevity.health/admin`
- [ ] Users collection with roles (user/contributor/editor/publisher/admin)
- [ ] MembershipTiers with 4 default tiers (Free/Regular/Premium/Enterprise)
- [ ] ContentPillars with 6 default pillars
- [ ] Media uploads working (stored in R2)
- [ ] Lexical editor has VideoEmbed, Callout, CodeBlock blocks
- [ ] Multi-tenant plugin configured with "LIMITLESS" default tenant
- [ ] JWT auth with cookie domain set to `.limitless-longevity.health`
- [ ] All integration tests passing
- [ ] Deployed to Render (backend) with PostgreSQL, Redis, R2
- [ ] Terraform resources created and committed
- [ ] DNS records pointing to Render

**Next:** Phase 2 plan (Content System — Articles, Courses, Modules, Lessons, editorial workflow, access control)
