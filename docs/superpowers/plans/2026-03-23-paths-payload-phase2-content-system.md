# PATHS Payload CMS — Phase 2: Content System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete content system: Articles, Courses, Modules, and Lessons collections with editorial workflow, tier-based access control, locked content teasers, versioning, search, SEO, and multi-tenant scoping.

**Architecture:** Four new collections with shared editorial workflow (state machine in `beforeChange` hooks), tier-based access control (Payload `access` functions using "highest wins" logic from `src/utilities/accessLevels.ts`), and locked content teasers (computed in `afterRead` hooks). Articles and Courses are independent models linked via relationship fields.

**Tech Stack:** Payload CMS 3.x, TypeScript, PostgreSQL, Lexical editor with BlocksFeature, Vitest

**Spec:** `docs/superpowers/specs/2026-03-23-paths-payload-migration-design.md` (Sections 4-7)

**Depends on:** Phase 1 Foundation (Tasks 1-10 complete, Tasks 11-13 pending but not blocking)

**Working directory:** `C:/Projects/LIMITLESS/limitless-paths/`

---

## File Structure

New and modified files for this phase:

```
src/
├── access/
│   ├── canReadContent.ts          # Tier-based read access for articles/courses
│   ├── canEditContent.ts          # Role + editorial status check
│   └── canCreateContent.ts        # Contributor+ role check
├── blocks/
│   ├── AudioEmbed/
│   │   └── config.ts             # YouTube/SoundCloud/Spotify audio embed
│   ├── PDFViewer/
│   │   └── config.ts             # Inline PDF viewer
│   └── ImageGallery/
│       └── config.ts             # Multi-image grid/carousel
├── collections/
│   ├── Articles/
│   │   ├── index.ts               # Articles collection config
│   │   └── hooks/
│   │       └── inheritPillarAccessLevel.ts
│   ├── Courses/
│   │   ├── index.ts               # Courses collection config
│   │   └── hooks/
│   │       └── calculateDuration.ts
│   ├── Modules/
│   │   └── index.ts               # Modules collection config
│   └── Lessons/
│       └── index.ts               # Lessons collection config
├── hooks/
│   ├── editorialWorkflow.ts       # Shared state machine (used by Articles + Courses)
│   └── computeLockedStatus.ts     # Shared locked content + teaser (used by Articles + Courses)
├── fields/
│   └── lexicalEditor.ts           # Updated: add AudioEmbed, PDFViewer, ImageGallery blocks
└── plugins/
    └── index.ts                   # Updated: add search + SEO + tenant scoping
tests/
└── int/
    ├── editorial-workflow.int.spec.ts  # State machine transitions
    ├── access-control.int.spec.ts      # Tier-based gating + locked content
    ├── articles.int.spec.ts            # Articles CRUD + workflow integration
    ├── courses.int.spec.ts             # Courses CRUD
    └── modules-lessons.int.spec.ts     # Modules + Lessons CRUD
```

> **Deferred to later phases:**
> - **QuizQuestion** and **AIExplanation** Lexical blocks → Phase 3 (AI Integration)
> - **Course Reference Bypass** (articles linked from courses skip tier check for enrolled users) → Phase 4 (requires Enrollments collection)

---

## Task 1: Build the Editorial Workflow State Machine

This is shared logic used by both Articles and Courses. Build and test it before the collections.

**Files:**
- Create: `src/hooks/editorialWorkflow.ts`
- Create: `tests/int/editorial-workflow.int.spec.ts`

- [ ] **Step 1: Write the editorial workflow test**

`tests/int/editorial-workflow.int.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  EDITORIAL_TRANSITIONS,
  isValidTransition,
  getRequiredRole,
  ROLE_HIERARCHY,
  hasRole,
} from '@/hooks/editorialWorkflow'

describe('Editorial workflow state machine', () => {
  describe('valid transitions', () => {
    it('draft → in_review requires contributor', () => {
      expect(isValidTransition('draft', 'in_review')).toBe(true)
      expect(getRequiredRole('draft', 'in_review')).toBe('contributor')
    })

    it('in_review → approved requires editor', () => {
      expect(isValidTransition('in_review', 'approved')).toBe(true)
      expect(getRequiredRole('in_review', 'approved')).toBe('editor')
    })

    it('in_review → draft (rejection) requires editor', () => {
      expect(isValidTransition('in_review', 'draft')).toBe(true)
      expect(getRequiredRole('in_review', 'draft')).toBe('editor')
    })

    it('approved → published requires publisher', () => {
      expect(isValidTransition('approved', 'published')).toBe(true)
      expect(getRequiredRole('approved', 'published')).toBe('publisher')
    })

    it('published → archived requires publisher', () => {
      expect(isValidTransition('published', 'archived')).toBe(true)
      expect(getRequiredRole('published', 'archived')).toBe('publisher')
    })

    it('published → draft (unpublish) requires publisher', () => {
      expect(isValidTransition('published', 'draft')).toBe(true)
      expect(getRequiredRole('published', 'draft')).toBe('publisher')
    })

    it('archived → draft requires admin', () => {
      expect(isValidTransition('archived', 'draft')).toBe(true)
      expect(getRequiredRole('archived', 'draft')).toBe('admin')
    })
  })

  describe('invalid transitions', () => {
    it('draft → published is not allowed', () => {
      expect(isValidTransition('draft', 'published')).toBe(false)
    })

    it('draft → approved is not allowed', () => {
      expect(isValidTransition('draft', 'approved')).toBe(false)
    })

    it('in_review → published is not allowed', () => {
      expect(isValidTransition('in_review', 'published')).toBe(false)
    })

    it('archived → published is not allowed', () => {
      expect(isValidTransition('archived', 'published')).toBe(false)
    })
  })

  describe('role hierarchy', () => {
    it('admin has all roles', () => {
      expect(hasRole('admin', 'contributor')).toBe(true)
      expect(hasRole('admin', 'editor')).toBe(true)
      expect(hasRole('admin', 'publisher')).toBe(true)
      expect(hasRole('admin', 'admin')).toBe(true)
    })

    it('publisher has contributor and editor', () => {
      expect(hasRole('publisher', 'contributor')).toBe(true)
      expect(hasRole('publisher', 'editor')).toBe(true)
      expect(hasRole('publisher', 'publisher')).toBe(true)
      expect(hasRole('publisher', 'admin')).toBe(false)
    })

    it('editor has contributor', () => {
      expect(hasRole('editor', 'contributor')).toBe(true)
      expect(hasRole('editor', 'editor')).toBe(true)
      expect(hasRole('editor', 'publisher')).toBe(false)
    })

    it('contributor is lowest editorial role', () => {
      expect(hasRole('contributor', 'contributor')).toBe(true)
      expect(hasRole('contributor', 'editor')).toBe(false)
    })

    it('user has no editorial roles', () => {
      expect(hasRole('user', 'contributor')).toBe(false)
    })
  })

  describe('same-status transitions', () => {
    it('same status is always valid (no transition)', () => {
      expect(isValidTransition('draft', 'draft')).toBe(true)
      expect(isValidTransition('published', 'published')).toBe(true)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/int/editorial-workflow.int.spec.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement the editorial workflow module**

`src/hooks/editorialWorkflow.ts`:
```ts
import type { CollectionBeforeChangeHook } from 'payload'

export type EditorialStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'archived'
export type EditorialRole = 'user' | 'contributor' | 'editor' | 'publisher' | 'admin'

/**
 * Role hierarchy — higher index = more permissions.
 * A role at index N includes all roles at index < N.
 */
export const ROLE_HIERARCHY: EditorialRole[] = ['user', 'contributor', 'editor', 'publisher', 'admin']

/**
 * State machine: valid transitions and their required minimum role.
 */
export const EDITORIAL_TRANSITIONS: Record<string, { target: string; requiredRole: EditorialRole }[]> = {
  draft: [
    { target: 'in_review', requiredRole: 'contributor' },
  ],
  in_review: [
    { target: 'approved', requiredRole: 'editor' },
    { target: 'draft', requiredRole: 'editor' },
  ],
  approved: [
    { target: 'published', requiredRole: 'publisher' },
  ],
  published: [
    { target: 'archived', requiredRole: 'publisher' },
    { target: 'draft', requiredRole: 'publisher' },
  ],
  archived: [
    { target: 'draft', requiredRole: 'admin' },
  ],
}

/**
 * Check if a status transition is valid.
 * Same status → always valid (no actual transition).
 */
export function isValidTransition(from: string, to: string): boolean {
  if (from === to) return true
  const transitions = EDITORIAL_TRANSITIONS[from]
  if (!transitions) return false
  return transitions.some((t) => t.target === to)
}

/**
 * Get the minimum role required for a transition.
 * Returns undefined if the transition is invalid.
 */
export function getRequiredRole(from: string, to: string): EditorialRole | undefined {
  if (from === to) return 'user' // No transition, any role
  const transitions = EDITORIAL_TRANSITIONS[from]
  if (!transitions) return undefined
  const transition = transitions.find((t) => t.target === to)
  return transition?.requiredRole
}

/**
 * Check if a user's role meets or exceeds the required role.
 * Uses the role hierarchy: admin > publisher > editor > contributor > user.
 */
export function hasRole(userRole: string, requiredRole: string): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole as EditorialRole)
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole as EditorialRole)
  if (userIndex === -1 || requiredIndex === -1) return false
  return userIndex >= requiredIndex
}

/**
 * beforeChange hook that validates editorial status transitions.
 * Attach to any collection with an `editorialStatus` field.
 */
export const validateEditorialTransition: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  // Only validate on update (not create — new docs are always 'draft')
  if (operation !== 'update') return data

  const oldStatus = originalDoc?.editorialStatus as string | undefined
  const newStatus = data?.editorialStatus as string | undefined

  // If status hasn't changed, nothing to validate
  if (!oldStatus || !newStatus || oldStatus === newStatus) return data

  // Check if the transition is valid
  if (!isValidTransition(oldStatus, newStatus)) {
    throw new Error(`Invalid editorial transition: ${oldStatus} → ${newStatus}`)
  }

  // Check if the user has the required role
  const requiredRole = getRequiredRole(oldStatus, newStatus)
  const userRole = (req.user as any)?.role as string | undefined

  if (!requiredRole || !userRole || !hasRole(userRole, requiredRole)) {
    throw new Error(
      `Insufficient permissions: ${oldStatus} → ${newStatus} requires ${requiredRole} role, user has ${userRole || 'none'}`,
    )
  }

  // If transitioning to 'published', set publishedAt
  if (newStatus === 'published' && !data.publishedAt) {
    data.publishedAt = new Date().toISOString()
  }

  return data
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run tests/int/editorial-workflow.int.spec.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/editorialWorkflow.ts tests/int/editorial-workflow.int.spec.ts
git commit -m "Add editorial workflow state machine with 7 transitions and role hierarchy"
```

---

## Task 2: Build Content Access Control Functions

**Files:**
- Create: `src/access/canReadContent.ts`
- Create: `src/access/canEditContent.ts`
- Create: `src/access/canCreateContent.ts`
- Create: `tests/int/access-control.int.spec.ts`

- [ ] **Step 1: Write the access control test**

`tests/int/access-control.int.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getEffectiveAccessLevels, higherOf } from '@/utilities/accessLevels'

describe('Access level logic', () => {
  describe('higherOf', () => {
    it('returns higher of two levels', () => {
      expect(higherOf('free', 'premium')).toBe('premium')
      expect(higherOf('enterprise', 'regular')).toBe('enterprise')
    })

    it('defaults to free for null/undefined', () => {
      expect(higherOf(null, null)).toBe('free')
      expect(higherOf(undefined, undefined)).toBe('free')
      expect(higherOf('premium', null)).toBe('premium')
    })
  })

  describe('getEffectiveAccessLevels', () => {
    it('free user gets only free', () => {
      expect(getEffectiveAccessLevels('free', null)).toEqual(['free'])
    })

    it('regular user gets free + regular', () => {
      expect(getEffectiveAccessLevels('regular', null)).toEqual(['free', 'regular'])
    })

    it('premium user gets free + regular + premium', () => {
      expect(getEffectiveAccessLevels('premium', null)).toEqual(['free', 'regular', 'premium'])
    })

    it('enterprise user gets all levels', () => {
      expect(getEffectiveAccessLevels('enterprise', null)).toEqual([
        'free', 'regular', 'premium', 'enterprise',
      ])
    })

    it('highest wins: user tier free + org enterprise = enterprise', () => {
      expect(getEffectiveAccessLevels('free', 'enterprise')).toEqual([
        'free', 'regular', 'premium', 'enterprise',
      ])
    })

    it('highest wins: user tier premium + org regular = premium', () => {
      expect(getEffectiveAccessLevels('premium', 'regular')).toEqual([
        'free', 'regular', 'premium',
      ])
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they pass** (accessLevels.ts was built in Phase 1)

```bash
pnpm vitest run tests/int/access-control.int.spec.ts
```

Expected: PASS

- [ ] **Step 3: Create the content access control functions**

`src/access/canReadContent.ts`:
```ts
import type { Access } from 'payload'
import { getEffectiveAccessLevels } from '../utilities/accessLevels'

/**
 * Read access for content collections (Articles, Courses).
 * - Admins/editors/publishers: read everything
 * - Authenticated users: read published content at their access level
 * - Anonymous: read published free content only
 */
export const canReadContent: Access = ({ req: { user } }) => {
  // Admin bypass: editorial roles see everything
  if (user?.role && ['admin', 'publisher', 'editor'].includes(user.role as string)) {
    return true
  }

  // Determine effective access levels
  const tierLevel = (user as any)?.tier?.accessLevel as string | undefined
  const orgLevel = (user as any)?.tenant?.contentAccessLevel as string | undefined
  const levels = getEffectiveAccessLevels(tierLevel ?? null, orgLevel ?? null)

  // Published content at user's access level
  return {
    and: [
      { editorialStatus: { equals: 'published' } },
      { accessLevel: { in: levels } },
    ],
  }
}
```

`src/access/canEditContent.ts`:
```ts
import type { Access } from 'payload'

/**
 * Update access for content collections.
 * - Admins: edit anything
 * - Publishers: edit anything
 * - Editors: edit anything (needed for review workflow)
 * - Contributors: edit only their own draft content
 */
export const canEditContent: Access = ({ req: { user } }) => {
  if (!user) return false

  const role = user.role as string

  // Admin, publisher, editor can edit anything
  if (['admin', 'publisher', 'editor'].includes(role)) return true

  // Contributors can only edit their own drafts
  if (role === 'contributor') {
    return {
      and: [
        { author: { equals: user.id } },
        { editorialStatus: { equals: 'draft' } },
      ],
    }
  }

  return false
}
```

`src/access/canCreateContent.ts`:
```ts
import type { Access } from 'payload'

/**
 * Create access for content collections.
 * Contributor+ roles can create content.
 */
export const canCreateContent: Access = ({ req: { user } }) => {
  if (!user) return false
  const role = user.role as string
  return ['contributor', 'editor', 'publisher', 'admin'].includes(role)
}
```

- [ ] **Step 4: Commit**

```bash
git add src/access/canReadContent.ts src/access/canEditContent.ts src/access/canCreateContent.ts tests/int/access-control.int.spec.ts
git commit -m "Add content access control: tier-based read, role-based edit/create"
```

---

## Task 3: Build Shared Hooks (Locked Content + Pillar Inheritance)

**Files:**
- Create: `src/hooks/computeLockedStatus.ts` (shared — used by Articles AND Courses)
- Create: `src/collections/Articles/hooks/inheritPillarAccessLevel.ts`

- [ ] **Step 1: Create computeLockedStatus as a SHARED hook**

> **Note:** This is shared logic used by both Articles and Courses. It lives in `src/hooks/` (not under any specific collection). It adds a virtual `locked` field to API responses — not persisted in the database, computed at read time.

`src/hooks/computeLockedStatus.ts`:
```ts
import type { CollectionAfterReadHook } from 'payload'
import { getEffectiveAccessLevels } from '../utilities/accessLevels'

/**
 * Shared afterRead hook for content collections (Articles, Courses).
 * Computes whether the content is locked for the requesting user.
 *
 * Adds virtual fields to API response:
 * - `locked: boolean` — whether the user lacks access
 * - For locked content: `content` is replaced with a teaser (excerpt only)
 *
 * This is a virtual field pattern — `locked` is not a database column.
 */
export const computeLockedStatus: CollectionAfterReadHook = async ({ doc, req }) => {
  const user = req.user

  // Admin bypass — never locked
  if (user?.role && ['admin', 'publisher', 'editor'].includes(user.role as string)) {
    return { ...doc, locked: false }
  }

  const tierLevel = (user as any)?.tier?.accessLevel as string | undefined
  const orgLevel = (user as any)?.tenant?.contentAccessLevel as string | undefined
  const effectiveLevels = getEffectiveAccessLevels(tierLevel ?? null, orgLevel ?? null)

  const contentLevel = doc.accessLevel as string
  const locked = !effectiveLevels.includes(contentLevel as any)

  if (locked) {
    // Return teaser: keep metadata + excerpt, remove full content
    // The frontend renders the excerpt as the teaser with a fade overlay + upgrade CTA
    // The `excerpt` field serves as the ~200 word teaser (authors write it explicitly)
    return {
      ...doc,
      locked: true,
      content: null,  // Full Lexical content hidden
      // Preserved: title, slug, excerpt, featuredImage, pillar, accessLevel, author, publishedAt
    }
  }

  return { ...doc, locked: false }
}
```

> **Teaser strategy:** The spec calls for "first ~200 words + fade + upgrade CTA." Rather than truncating Lexical JSON (complex and fragile), we null out `content` and rely on the `excerpt` field as the teaser text. Authors write the excerpt explicitly (textarea field on Articles). The frontend renders excerpt + fade + CTA for locked content. This is simpler and gives authors control over what teaser text is shown.

- [ ] **Step 2: Create inheritPillarAccessLevel hook**

`src/collections/Articles/hooks/inheritPillarAccessLevel.ts`:
```ts
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * On article creation, inherit the access level from the content pillar's
 * defaultAccessLevel if the article's accessLevel is not explicitly set.
 */
export const inheritPillarAccessLevel: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data
  if (data.accessLevel && data.accessLevel !== 'free') return data // Already set explicitly
  if (!data.pillar) return data

  try {
    const pillar = await req.payload.findByID({
      collection: 'content-pillars',
      id: data.pillar as string,
    })
    if (pillar?.defaultAccessLevel) {
      data.accessLevel = pillar.defaultAccessLevel
    }
  } catch {
    // If pillar not found, keep default
  }

  return data
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/computeLockedStatus.ts src/collections/Articles/hooks/
git commit -m "Add shared locked content hook and pillar access inheritance"
```

---

## Task 4: Define Articles Collection

**Files:**
- Create: `src/collections/Articles/index.ts`
- Create: `tests/int/articles.int.spec.ts`
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Write the Articles integration test**

`tests/int/articles.int.spec.ts`:
```ts
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload
let adminUser: any
let pillarId: string

describe('Articles collection', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Create admin user for tests
    try {
      adminUser = await payload.create({
        collection: 'users',
        data: {
          email: 'articles-test-admin@test.com',
          password: 'TestPassword123!',
          firstName: 'Admin',
          lastName: 'Test',
          role: 'admin',
        },
      })
    } catch {
      const found = await payload.find({
        collection: 'users',
        where: { email: { equals: 'articles-test-admin@test.com' } },
      })
      adminUser = found.docs[0]
    }

    // Create a pillar for tests
    try {
      const pillar = await payload.create({
        collection: 'content-pillars',
        data: { name: 'Test Pillar', slug: 'test-pillar-articles', isActive: true },
      })
      pillarId = pillar.id as string
    } catch {
      const found = await payload.find({
        collection: 'content-pillars',
        where: { slug: { equals: 'test-pillar-articles' } },
      })
      pillarId = found.docs[0]?.id as string
    }
  })

  it('creates an article with required fields', async () => {
    const article = await payload.create({
      collection: 'articles',
      data: {
        title: 'Test Article',
        slug: 'test-article-crud',
        pillar: pillarId,
        author: adminUser.id,
        editorialStatus: 'draft',
        accessLevel: 'free',
      },
    })
    expect(article.title).toBe('Test Article')
    expect(article.editorialStatus).toBe('draft')
    expect(article.accessLevel).toBe('free')
  })

  it('defaults editorialStatus to draft', async () => {
    const article = await payload.create({
      collection: 'articles',
      data: {
        title: 'Default Status',
        slug: 'test-article-default-status',
        pillar: pillarId,
        author: adminUser.id,
      },
    })
    expect(article.editorialStatus).toBe('draft')
  })

  it('supports versioning', async () => {
    const article = await payload.create({
      collection: 'articles',
      data: {
        title: 'Versioned Article',
        slug: 'test-article-versioned',
        pillar: pillarId,
        author: adminUser.id,
      },
    })

    // Update should create a version
    await payload.update({
      collection: 'articles',
      id: article.id,
      data: { title: 'Versioned Article v2' },
    })

    const versions = await payload.findVersions({
      collection: 'articles',
      where: { parent: { equals: article.id } },
    })
    expect(versions.totalDocs).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/int/articles.int.spec.ts
```

Expected: FAIL (collection doesn't exist)

- [ ] **Step 3: Create the Articles collection**

`src/collections/Articles/index.ts`:
```ts
import type { CollectionConfig } from 'payload'
import { canReadContent } from '../../access/canReadContent'
import { canEditContent } from '../../access/canEditContent'
import { canCreateContent } from '../../access/canCreateContent'
import { isAdmin } from '../../access/isAdmin'
import { validateEditorialTransition } from '../../hooks/editorialWorkflow'
import { inheritPillarAccessLevel } from './hooks/inheritPillarAccessLevel'
import { computeLockedStatus } from '../../hooks/computeLockedStatus'
import { richTextEditor } from '../../fields/lexicalEditor'

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'editorialStatus', 'accessLevel', 'pillar', 'author', 'updatedAt'],
  },
  versions: {
    drafts: true,
    maxPerDoc: 25,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
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
  },
  access: {
    create: canCreateContent,
    read: canReadContent,
    update: canEditContent,
    delete: isAdmin,
  },
}
```

- [ ] **Step 4: Register Articles in payload.config.ts**

Add import and include in the `collections` array. Note: the `relatedCourses` field references `courses` which doesn't exist yet. Payload may warn but shouldn't crash if the relationship target is registered later. If it does crash, temporarily comment out the `relatedCourses` field and add it back in Task 5.

- [ ] **Step 5: Regenerate types and run tests**

```bash
pnpm generate:types
pnpm vitest run tests/int/articles.int.spec.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/collections/Articles/ tests/int/articles.int.spec.ts src/payload.config.ts src/payload-types.ts
git commit -m "Add Articles collection with editorial workflow, versioning, and access control"
```

---

## Task 5: Define Courses Collection

**Files:**
- Create: `src/collections/Courses/index.ts`
- Create: `src/collections/Courses/hooks/calculateDuration.ts`
- Create: `tests/int/courses.int.spec.ts`

- [ ] **Step 1: Create the calculateDuration hook**

`src/collections/Courses/hooks/calculateDuration.ts`:
```ts
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Auto-calculate estimatedDuration from modules' lessons.
 * Only runs if estimatedDuration is not explicitly set.
 */
export const calculateDuration: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
}) => {
  // Skip if duration is explicitly set or no modules
  if (data.estimatedDuration || !data.modules?.length) return data

  try {
    let totalDuration = 0
    const moduleIds = Array.isArray(data.modules) ? data.modules : [data.modules]

    for (const moduleId of moduleIds) {
      const mod = await req.payload.findByID({
        collection: 'modules',
        id: typeof moduleId === 'string' ? moduleId : moduleId.id,
        depth: 1,
      })
      if (mod?.lessons) {
        const lessonIds = Array.isArray(mod.lessons) ? mod.lessons : []
        for (const lessonId of lessonIds) {
          const lesson = typeof lessonId === 'object' ? lessonId :
            await req.payload.findByID({ collection: 'lessons', id: lessonId as string })
          totalDuration += (lesson as any)?.estimatedDuration ?? 0
        }
      }
    }

    if (totalDuration > 0) {
      data.estimatedDuration = totalDuration
    }
  } catch {
    // If calculation fails, skip — don't block save
  }

  return data
}
```

- [ ] **Step 2: Create the Courses collection**

`src/collections/Courses/index.ts`:
```ts
import type { CollectionConfig } from 'payload'
import { canReadContent } from '../../access/canReadContent'
import { canEditContent } from '../../access/canEditContent'
import { canCreateContent } from '../../access/canCreateContent'
import { isAdmin } from '../../access/isAdmin'
import { validateEditorialTransition } from '../../hooks/editorialWorkflow'
import { calculateDuration } from './hooks/calculateDuration'
import { computeLockedStatus } from '../../hooks/computeLockedStatus'
import { richTextEditor } from '../../fields/lexicalEditor'

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
    },
    { name: 'instructor', type: 'relationship', relationTo: 'users' },
    { name: 'modules', type: 'relationship', relationTo: 'modules', hasMany: true },
    { name: 'relatedArticles', type: 'relationship', relationTo: 'articles', hasMany: true },
    { name: 'estimatedDuration', type: 'number', admin: { description: 'Total duration in minutes (auto-calculated from lessons)' } },
    { name: 'publishedAt', type: 'date' },
  ],
  hooks: {
    beforeChange: [validateEditorialTransition, calculateDuration],
    afterRead: [computeLockedStatus],
  },
  access: {
    create: canCreateContent,
    read: canReadContent,
    update: canEditContent,
    delete: isAdmin,
  },
}
```

- [ ] **Step 3: Write Courses integration test**

`tests/int/courses.int.spec.ts`:
```ts
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload
let adminUser: any

describe('Courses collection', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    try {
      adminUser = await payload.create({
        collection: 'users',
        data: {
          email: 'courses-test-admin@test.com',
          password: 'TestPassword123!',
          firstName: 'Admin',
          lastName: 'CourseTest',
          role: 'admin',
        },
      })
    } catch {
      const found = await payload.find({
        collection: 'users',
        where: { email: { equals: 'courses-test-admin@test.com' } },
      })
      adminUser = found.docs[0]
    }
  })

  it('creates a course with defaults', async () => {
    const course = await payload.create({
      collection: 'courses',
      data: {
        title: 'Test Course',
        slug: 'test-course-crud',
        instructor: adminUser.id,
      },
    })
    expect(course.title).toBe('Test Course')
    expect(course.editorialStatus).toBe('draft')
    expect(course.accessLevel).toBe('premium') // Courses default to premium
  })

  it('supports versioning', async () => {
    const course = await payload.create({
      collection: 'courses',
      data: {
        title: 'Versioned Course',
        slug: 'test-course-versioned',
      },
    })

    await payload.update({
      collection: 'courses',
      id: course.id,
      data: { title: 'Versioned Course v2' },
    })

    const versions = await payload.findVersions({
      collection: 'courses',
      where: { parent: { equals: course.id } },
    })
    expect(versions.totalDocs).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 4: Register Courses in payload.config.ts, regenerate types, run tests**

```bash
pnpm generate:types
pnpm vitest run tests/int/courses.int.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/collections/Courses/ tests/int/courses.int.spec.ts src/payload.config.ts src/payload-types.ts
git commit -m "Add Courses collection with editorial workflow, versioning, and auto-duration calculation"
```

---

## Task 6: Define Modules and Lessons Collections

**Files:**
- Create: `src/collections/Modules/index.ts`
- Create: `src/collections/Lessons/index.ts`
- Create: `tests/int/modules-lessons.int.spec.ts`

- [ ] **Step 1: Create the Modules collection**

`src/collections/Modules/index.ts`:
```ts
import type { CollectionConfig } from 'payload'
import { canCreateContent } from '../../access/canCreateContent'
import { canEditContent } from '../../access/canEditContent'
import { authenticated } from '../../access/authenticated'
import { isAdmin } from '../../access/isAdmin'

export const Modules: CollectionConfig = {
  slug: 'modules',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'course', 'order', 'updatedAt'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
    },
    {
      name: 'lessons',
      type: 'relationship',
      relationTo: 'lessons',
      hasMany: true,
    },
    { name: 'order', type: 'number', required: true },
    {
      name: 'estimatedDuration',
      type: 'number',
      admin: { description: 'Duration in minutes (auto-calculated from lessons)' },
    },
  ],
  access: {
    create: canCreateContent,
    read: authenticated,
    update: canEditContent,
    delete: isAdmin,
  },
}
```

- [ ] **Step 2: Create the Lessons collection**

`src/collections/Lessons/index.ts`:
```ts
import type { CollectionConfig } from 'payload'
import { canCreateContent } from '../../access/canCreateContent'
import { canEditContent } from '../../access/canEditContent'
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
    { name: 'slug', type: 'text', required: true },
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
    update: canEditContent,
    delete: isAdmin,
  },
}
```

- [ ] **Step 3: Write integration test**

`tests/int/modules-lessons.int.spec.ts`:
```ts
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload
let adminUser: any
let courseId: string

describe('Modules and Lessons', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    try {
      adminUser = await payload.create({
        collection: 'users',
        data: {
          email: 'modules-test-admin@test.com',
          password: 'TestPassword123!',
          firstName: 'Admin',
          lastName: 'ModTest',
          role: 'admin',
        },
      })
    } catch {
      const found = await payload.find({
        collection: 'users',
        where: { email: { equals: 'modules-test-admin@test.com' } },
      })
      adminUser = found.docs[0]
    }

    try {
      const course = await payload.create({
        collection: 'courses',
        data: { title: 'Module Test Course', slug: 'module-test-course' },
      })
      courseId = course.id as string
    } catch {
      const found = await payload.find({
        collection: 'courses',
        where: { slug: { equals: 'module-test-course' } },
      })
      courseId = found.docs[0]?.id as string
    }
  })

  it('creates a module linked to a course', async () => {
    const mod = await payload.create({
      collection: 'modules',
      data: {
        title: 'Module 1: Introduction',
        course: courseId,
        order: 1,
      },
    })
    expect(mod.title).toBe('Module 1: Introduction')
    expect(mod.order).toBe(1)
  })

  it('creates a text lesson linked to a module', async () => {
    const mod = await payload.create({
      collection: 'modules',
      data: { title: 'Lesson Test Module', course: courseId, order: 2 },
    })

    const lesson = await payload.create({
      collection: 'lessons',
      data: {
        title: 'Lesson 1: Getting Started',
        slug: 'lesson-1-getting-started',
        module: mod.id,
        order: 1,
        lessonType: 'text',
        estimatedDuration: 15,
      },
    })
    expect(lesson.title).toBe('Lesson 1: Getting Started')
    expect(lesson.lessonType).toBe('text')
    expect(lesson.estimatedDuration).toBe(15)
  })

  it('creates a video lesson with YouTube embed', async () => {
    const mod = await payload.create({
      collection: 'modules',
      data: { title: 'Video Lesson Module', course: courseId, order: 3 },
    })

    const lesson = await payload.create({
      collection: 'lessons',
      data: {
        title: 'Video Lesson',
        slug: 'video-lesson-test',
        module: mod.id,
        order: 1,
        lessonType: 'video',
        videoEmbed: {
          platform: 'youtube',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          videoId: 'dQw4w9WgXcQ',
        },
        estimatedDuration: 10,
      },
    })
    expect(lesson.lessonType).toBe('video')
    expect(lesson.videoEmbed?.platform).toBe('youtube')
    expect(lesson.videoEmbed?.videoId).toBe('dQw4w9WgXcQ')
  })
})
```

- [ ] **Step 4: Register both collections in payload.config.ts, regenerate types, run tests**

Add `Modules` and `Lessons` to the collections array. Order matters for relationship resolution — register `Lessons` before `Modules` (since Modules references Lessons), and `Modules` before `Courses` (since Courses references Modules). Actually, Payload handles circular references, so just ensure all are registered.

```bash
pnpm generate:types
pnpm vitest run tests/int/modules-lessons.int.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/collections/Modules/ src/collections/Lessons/ tests/int/modules-lessons.int.spec.ts src/payload.config.ts src/payload-types.ts
git commit -m "Add Modules and Lessons collections with video embed and downloadable resources"
```

---

## Task 7: Add Remaining Lexical Blocks (AudioEmbed, PDFViewer, ImageGallery)

**Files:**
- Create: `src/blocks/AudioEmbed/config.ts`
- Create: `src/blocks/PDFViewer/config.ts`
- Create: `src/blocks/ImageGallery/config.ts`
- Modify: `src/fields/lexicalEditor.ts`

> **Note:** QuizQuestion and AIExplanation blocks are deferred to Phase 3 (AI Integration).

- [ ] **Step 1: Create AudioEmbed block**

`src/blocks/AudioEmbed/config.ts`:
```ts
import type { Block } from 'payload'

export const AudioEmbed: Block = {
  slug: 'audioEmbed',
  interfaceName: 'AudioEmbedBlock',
  labels: { singular: 'Audio Embed', plural: 'Audio Embeds' },
  fields: [
    {
      name: 'platform',
      type: 'select',
      required: true,
      options: [
        { label: 'YouTube', value: 'youtube' },
        { label: 'SoundCloud', value: 'soundcloud' },
        { label: 'Spotify', value: 'spotify' },
      ],
    },
    { name: 'url', type: 'text', required: true, label: 'Audio URL' },
    { name: 'caption', type: 'text' },
  ],
}
```

- [ ] **Step 2: Create PDFViewer block**

`src/blocks/PDFViewer/config.ts`:
```ts
import type { Block } from 'payload'

export const PDFViewer: Block = {
  slug: 'pdfViewer',
  interfaceName: 'PDFViewerBlock',
  labels: { singular: 'PDF Viewer', plural: 'PDF Viewers' },
  fields: [
    { name: 'file', type: 'upload', relationTo: 'media', required: true },
    { name: 'title', type: 'text' },
  ],
}
```

- [ ] **Step 3: Create ImageGallery block**

`src/blocks/ImageGallery/config.ts`:
```ts
import type { Block } from 'payload'

export const ImageGallery: Block = {
  slug: 'imageGallery',
  interfaceName: 'ImageGalleryBlock',
  labels: { singular: 'Image Gallery', plural: 'Image Galleries' },
  fields: [
    {
      name: 'images',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text' },
      ],
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Carousel', value: 'carousel' },
      ],
    },
  ],
}
```

- [ ] **Step 4: Update shared Lexical editor config to include new blocks**

Update `src/fields/lexicalEditor.ts`:
```ts
import { lexicalEditor, BlocksFeature } from '@payloadcms/richtext-lexical'
import { VideoEmbed } from '../blocks/VideoEmbed/config'
import { AudioEmbed } from '../blocks/AudioEmbed/config'
import { Callout } from '../blocks/Callout/config'
import { CodeBlock } from '../blocks/CodeBlock/config'
import { PDFViewer } from '../blocks/PDFViewer/config'
import { ImageGallery } from '../blocks/ImageGallery/config'

export const richTextEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures,
    BlocksFeature({
      blocks: [VideoEmbed, AudioEmbed, Callout, CodeBlock, PDFViewer, ImageGallery],
    }),
  ],
})
```

- [ ] **Step 5: Commit**

```bash
git add src/blocks/AudioEmbed/ src/blocks/PDFViewer/ src/blocks/ImageGallery/ src/fields/lexicalEditor.ts
git commit -m "Add AudioEmbed, PDFViewer, ImageGallery Lexical blocks"
```

---

## Task 8: Configure Search, SEO, and Tenant Scoping Plugins

**Files:**
- Modify: `src/plugins/index.ts`

- [ ] **Step 1: Read current plugins config**

Read `src/plugins/index.ts` to see what's already configured.

- [ ] **Step 2: Add search plugin configuration for Articles and Courses**

In `src/plugins/index.ts`, add or update the search plugin config:

```ts
import { searchPlugin } from '@payloadcms/plugin-search'

searchPlugin({
  collections: ['articles', 'courses'],
  defaultPriorities: {
    articles: 10,
    courses: 20,
  },
}),
```

- [ ] **Step 3: Add SEO plugin configuration for Articles and Courses**

```ts
import { seoPlugin } from '@payloadcms/plugin-seo'

seoPlugin({
  collections: ['articles', 'courses'],
  uploadsCollection: 'media',
  generateTitle: ({ doc }) => `${(doc as any)?.title} — PATHS by LIMITLESS`,
  generateDescription: ({ doc }) => (doc as any)?.excerpt || '',
}),
```

- [ ] **Step 4: Update multi-tenant plugin to scope content collections**

In the `multiTenantPlugin` config, add the content collections to the scoped list:

```ts
multiTenantPlugin({
  collections: {
    articles: {},
    courses: {},
    modules: {},
    lessons: {},
  },
  // ... rest of config unchanged
}),
```

- [ ] **Step 5: Regenerate types and import map**

```bash
pnpm generate:types
pnpm generate:importmap
```

- [ ] **Step 6: Commit**

```bash
git add src/plugins/index.ts src/payload-types.ts src/app/(payload)/admin/importMap.js
git commit -m "Configure search, SEO, and multi-tenant scoping for content collections"
```

---

## Task 9: Run Full Test Suite and Verify

**Files:** No new files — verification only.

- [ ] **Step 1: Run all tests**

```bash
pnpm vitest run
```

Expected: All tests pass (editorial-workflow, access-control, articles, courses, modules-lessons, plus any template tests).

- [ ] **Step 2: Start dev server and verify in admin panel**

```bash
docker compose up -d  # if not already running
pnpm dev
```

Verify in the admin panel:
- Articles collection visible with all fields
- Courses collection visible with all fields
- Modules collection visible
- Lessons collection visible with conditional videoEmbed group
- Create a test article → change editorialStatus through workflow
- Create a test course → add modules → add lessons
- Lexical editor shows VideoEmbed, Callout, CodeBlock blocks

- [ ] **Step 3: Commit any final adjustments**

```bash
git add -A
git commit -m "Phase 2 complete: content system verified — articles, courses, modules, lessons with editorial workflow and access control"
```

---

## Phase 2 Milestone Checklist

After completing all 9 tasks, verify:

- [ ] Articles collection with 5-state editorial workflow (draft → in_review → approved → published → archived)
- [ ] Courses collection with versioning, modules relationship, auto-duration calculation
- [ ] Modules collection linked to courses with ordered lessons
- [ ] Lessons collection with Lexical editor, YouTube/Vimeo embed, downloadable resources
- [ ] Editorial workflow state machine rejects invalid transitions
- [ ] Editorial workflow enforces role requirements (contributor/editor/publisher/admin)
- [ ] Tier-based access control with "highest wins" logic
- [ ] Locked content: unauthorized users get truncated content with `locked: true`
- [ ] Pillar inheritance: new articles inherit access level from their pillar
- [ ] Search plugin indexes Articles and Courses
- [ ] SEO plugin adds meta fields to Articles and Courses
- [ ] Multi-tenant plugin scopes all content collections by tenant
- [ ] All integration tests passing
- [ ] Lexical editor has 6 content blocks: VideoEmbed, AudioEmbed, Callout, CodeBlock, PDFViewer, ImageGallery
- [ ] Admin panel shows all collections with correct fields

**Deferred to later phases:**
- Course Reference Bypass (articles linked from courses skip tier check) → Phase 4 (requires Enrollments)
- QuizQuestion and AIExplanation Lexical blocks → Phase 3 (AI Integration)
- Modules/Lessons access control inheritance from parent course → Phase 4 (with Enrollments)

**Next:** Phase 3 plan (AI Integration — Together AI, tutor chat, content generation, quiz generation)
