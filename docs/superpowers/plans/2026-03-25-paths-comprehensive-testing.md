# PATHS Comprehensive Testing Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flush out integration bugs by building a comprehensive E2E + integration test suite that simulates real users (admin, contributor, regular user) performing real actions (login, create content, publish, enroll, search) through an actual browser.

**Problem being solved:** Unit tests pass (91 tests) but the integrated system has bugs: multi-tenant access control blocks contributor content visibility, admin panel blank screens from missing static assets, contributor role denied admin access, password reset fails for non-existent email addresses. These bugs only surface when a real user interacts with the full stack through a browser.

**Architecture:** Playwright for browser-based E2E tests. Payload Local API for integration test fixtures (seed users, content, tenants). Tests run against a local dev server with a fresh database per test suite. CI integration via GitHub Actions.

**Tech Stack:** Playwright, Vitest (existing unit tests), Payload Local API, Docker (PostgreSQL + Redis)

**Working directory:** `C:/Projects/LIMITLESS/limitless-paths/`

---

## What We're Testing

### Critical User Flows (E2E — Browser)

| Flow | Actors | What's Tested |
|------|--------|---------------|
| 1. Admin login + dashboard | Admin | Admin panel loads, collections visible, can navigate |
| 2. Admin creates article | Admin | Full article creation with tenant, pillar, content, save |
| 3. Editorial workflow | Contributor → Editor → Publisher | Draft → In Review → Approved → Published lifecycle |
| 4. Contributor experience | Contributor | Login, create draft, see own content, cannot publish |
| 5. Content visibility | Regular user | Published articles visible, drafts hidden, locked content shows banner |
| 6. Course enrollment flow | Regular user | Browse courses, enroll, view lessons, mark complete |
| 7. Account pages | Regular user | Profile, billing, my courses pages load and function |
| 8. Semantic search | Regular user | Search query returns relevant results |
| 9. Frontend pages | Anonymous | Articles listing, course catalog, article reader load |
| 10. Mobile sidebar | Any | Sidebar collapses, mobile drawer works |

### Integration Tests (API — No Browser)

| Test | What's Tested |
|------|---------------|
| Multi-tenant scoping | Content filtered by tenant, users see only their tenant's data |
| Access control matrix | Each role × each operation × each collection |
| Editorial transitions | All valid/invalid state transitions with role enforcement |
| RAG indexing | Article publish triggers chunking + embedding |
| Enrollment + progress | Enroll, mark lessons complete, auto-completion at 100% |
| Stripe webhook | Simulated webhook events update subscriptions + tiers |

---

## File Structure

```
tests/
├── e2e/
│   ├── admin.e2e.spec.ts              # REWRITE: admin login + dashboard + article creation
│   ├── editorial-workflow.e2e.spec.ts  # NEW: full draft → publish lifecycle
│   ├── contributor.e2e.spec.ts         # NEW: contributor experience
│   ├── frontend.e2e.spec.ts            # REWRITE: article listing, reader, courses, search
│   ├── enrollment.e2e.spec.ts          # NEW: course enrollment + progress
│   ├── account.e2e.spec.ts             # NEW: profile, billing, my courses
│   └── mobile.e2e.spec.ts             # NEW: mobile responsive + sidebar drawer
├── int/
│   ├── multi-tenant.int.spec.ts        # NEW: tenant scoping for all content collections
│   ├── access-matrix.int.spec.ts       # NEW: role × operation × collection matrix
│   ├── rag-indexing.int.spec.ts        # NEW: publish triggers chunk + embed
│   ├── enrollment-flow.int.spec.ts     # NEW: full enrollment → progress → completion
│   └── webhook-processing.int.spec.ts  # NEW: Stripe webhook event handling
├── helpers/
│   ├── login.ts                        # EXISTS: Playwright login helper
│   ├── seedUser.ts                     # REWRITE: seed users with roles, tiers, tenants
│   └── seedContent.ts                  # NEW: seed articles, courses, modules, lessons
└── fixtures/
    └── test-data.ts                    # NEW: shared test data (users, content, tiers)
playwright.config.ts                    # EXISTS: update baseURL, add test scripts
package.json                            # MODIFY: add Playwright + test:e2e script
```

---

## Task 1: Install Playwright and Update Test Infrastructure

**Files:**
- Modify: `package.json`
- Modify: `playwright.config.ts`
- Rewrite: `tests/helpers/seedUser.ts`
- Create: `tests/fixtures/test-data.ts`
- Create: `tests/helpers/seedContent.ts`

- [ ] **Step 1: Install Playwright**

```bash
pnpm add -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Add test scripts to package.json**

Add to `scripts`:
```json
"test:e2e": "playwright test",
"test:e2e:headed": "playwright test --headed",
"test:all": "pnpm test:int && pnpm test:e2e"
```

- [ ] **Step 3: Update playwright.config.ts**

```ts
import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 10000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Sequential — tests share database state
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
      testMatch: '**/mobile.e2e.spec.ts',
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60000,
  },
})
```

- [ ] **Step 4: Create shared test data fixtures**

`tests/fixtures/test-data.ts`:
```ts
export const TEST_ADMIN = {
  email: 'test-admin@limitless.test',
  password: 'TestAdmin2026!',
  firstName: 'Test',
  lastName: 'Admin',
  role: 'admin' as const,
}

export const TEST_CONTRIBUTOR = {
  email: 'test-contributor@limitless.test',
  password: 'TestContrib2026!',
  firstName: 'Sarah',
  lastName: 'Contributor',
  role: 'contributor' as const,
}

export const TEST_EDITOR = {
  email: 'test-editor@limitless.test',
  password: 'TestEditor2026!',
  firstName: 'Mike',
  lastName: 'Editor',
  role: 'editor' as const,
}

export const TEST_PUBLISHER = {
  email: 'test-publisher@limitless.test',
  password: 'TestPublisher2026!',
  firstName: 'Jane',
  lastName: 'Publisher',
  role: 'publisher' as const,
}

export const TEST_USER = {
  email: 'test-user@limitless.test',
  password: 'TestUser2026!',
  firstName: 'John',
  lastName: 'User',
  role: 'user' as const,
}

export const TEST_ARTICLE = {
  title: 'E2E Test: Vitamin D Optimization',
  slug: 'e2e-test-vitamin-d',
  excerpt: 'Test article for E2E testing.',
  accessLevel: 'free' as const,
  content: {
    root: {
      type: 'root',
      children: [
        { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Section One' }] },
        { type: 'paragraph', children: [{ type: 'text', text: 'This is the first section content for testing.' }] },
        { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Section Two' }] },
        { type: 'paragraph', children: [{ type: 'text', text: 'This is the second section with more detailed content.' }] },
      ],
      direction: null, format: '', indent: 0, version: 1,
    },
  },
}

export const TEST_PREMIUM_ARTICLE = {
  title: 'E2E Test: Advanced Sleep Protocols',
  slug: 'e2e-test-sleep-protocols',
  excerpt: 'Premium content for testing locked access.',
  accessLevel: 'premium' as const,
  content: {
    root: {
      type: 'root',
      children: [
        { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Premium Content' }] },
        { type: 'paragraph', children: [{ type: 'text', text: 'This premium content should be locked for free users.' }] },
      ],
      direction: null, format: '', indent: 0, version: 1,
    },
  },
}

export const TEST_COURSE = {
  title: 'E2E Test: Longevity Fundamentals',
  slug: 'e2e-test-longevity-fundamentals',
  accessLevel: 'free' as const,
}
```

- [ ] **Step 5: Rewrite seed helpers**

`tests/helpers/seedUser.ts`:
```ts
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export interface TestUserData {
  email: string
  password: string
  firstName: string
  lastName: string
  role: string
}

/**
 * Seeds a test user with proper tenant and tier assignment.
 * Returns the created user with ID.
 */
export async function seedTestUser(userData: TestUserData): Promise<any> {
  const payload = await getPayload({ config })

  // Ensure tenant exists
  let tenant = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: 'test-tenant' } },
    limit: 1,
    overrideAccess: true,
  })

  let tenantId: number
  if (tenant.totalDocs === 0) {
    const created = await payload.create({
      collection: 'tenants',
      data: { name: 'Test Tenant', slug: 'test-tenant' },
      overrideAccess: true,
    })
    tenantId = created.id as number
  } else {
    tenantId = tenant.docs[0].id as number
  }

  // Ensure free tier exists
  let freeTier = await payload.find({
    collection: 'membership-tiers',
    where: { slug: { equals: 'free' } },
    limit: 1,
    overrideAccess: true,
  })

  let tierId: number | undefined
  if (freeTier.totalDocs > 0) {
    tierId = freeTier.docs[0].id as number
  }

  // Delete existing user if any
  await payload.delete({
    collection: 'users',
    where: { email: { equals: userData.email } },
    overrideAccess: true,
  })

  // Create user with tenant and tier
  const user = await payload.create({
    collection: 'users',
    data: {
      ...userData,
      tenants: [{ tenant: tenantId }],
      ...(tierId ? { tier: tierId } : {}),
    } as any,
    overrideAccess: true,
  })

  return user
}

/**
 * Seeds all test users for the E2E suite.
 */
export async function seedAllTestUsers(users: TestUserData[]): Promise<Map<string, any>> {
  const created = new Map<string, any>()
  for (const user of users) {
    const result = await seedTestUser(user)
    created.set(user.role, result)
  }
  return created
}

/**
 * Cleans up all test users.
 */
export async function cleanupTestUsers(emails: string[]): Promise<void> {
  const payload = await getPayload({ config })
  for (const email of emails) {
    await payload.delete({
      collection: 'users',
      where: { email: { equals: email } },
      overrideAccess: true,
    }).catch(() => {})
  }
}
```

`tests/helpers/seedContent.ts`:
```ts
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

/**
 * Seeds content pillars if they don't exist.
 */
export async function seedPillars(): Promise<number> {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'content-pillars',
    where: { slug: { equals: 'test-nutrition' } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.totalDocs > 0) return existing.docs[0].id as number

  const pillar = await payload.create({
    collection: 'content-pillars',
    data: {
      name: 'Test Nutrition',
      slug: 'test-nutrition',
      description: 'Test pillar for E2E',
      isActive: true,
      displayOrder: 99,
    },
    overrideAccess: true,
  })

  return pillar.id as number
}

/**
 * Seeds membership tiers if they don't exist.
 */
export async function seedTiers(): Promise<{ freeId: number; premiumId: number }> {
  const payload = await getPayload({ config })

  let freeId: number
  let premiumId: number

  const freeTier = await payload.find({
    collection: 'membership-tiers',
    where: { slug: { equals: 'free' } },
    limit: 1,
    overrideAccess: true,
  })
  if (freeTier.totalDocs > 0) {
    freeId = freeTier.docs[0].id as number
  } else {
    const created = await payload.create({
      collection: 'membership-tiers',
      data: { name: 'Free', slug: 'free', accessLevel: 'free', isActive: true, displayOrder: 0 },
      overrideAccess: true,
    })
    freeId = created.id as number
  }

  const premiumTier = await payload.find({
    collection: 'membership-tiers',
    where: { slug: { equals: 'premium' } },
    limit: 1,
    overrideAccess: true,
  })
  if (premiumTier.totalDocs > 0) {
    premiumId = premiumTier.docs[0].id as number
  } else {
    const created = await payload.create({
      collection: 'membership-tiers',
      data: { name: 'Premium', slug: 'premium', accessLevel: 'premium', isActive: true, displayOrder: 2, monthlyPrice: 29 },
      overrideAccess: true,
    })
    premiumId = created.id as number
  }

  return { freeId, premiumId }
}

/**
 * Seeds a test article.
 */
export async function seedArticle(data: {
  title: string
  slug: string
  excerpt: string
  accessLevel: string
  editorialStatus?: string
  authorId: number
  tenantId: number
  pillarId: number
  content?: any
}): Promise<any> {
  const payload = await getPayload({ config })

  // Delete existing
  await payload.delete({
    collection: 'articles',
    where: { slug: { equals: data.slug } },
    overrideAccess: true,
  }).catch(() => {})

  return payload.create({
    collection: 'articles',
    data: {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      accessLevel: data.accessLevel,
      editorialStatus: data.editorialStatus ?? 'draft',
      author: data.authorId,
      tenant: data.tenantId,
      pillar: data.pillarId,
      content: data.content,
    } as any,
    overrideAccess: true,
  })
}

/**
 * Seeds a test course with modules and lessons.
 */
export async function seedCourse(data: {
  title: string
  slug: string
  accessLevel: string
  tenantId: number
  pillarId: number
  instructorId: number
}): Promise<{ courseId: number; moduleId: number; lessonIds: number[] }> {
  const payload = await getPayload({ config })

  // Delete existing
  await payload.delete({
    collection: 'courses',
    where: { slug: { equals: data.slug } },
    overrideAccess: true,
  }).catch(() => {})

  const course = await payload.create({
    collection: 'courses',
    data: {
      title: data.title,
      slug: data.slug,
      accessLevel: data.accessLevel,
      editorialStatus: 'published',
      tenant: data.tenantId,
      pillar: data.pillarId,
      instructor: data.instructorId,
    } as any,
    overrideAccess: true,
  })

  const module = await payload.create({
    collection: 'modules',
    data: {
      title: 'Test Module 1',
      course: course.id,
      order: 1,
      tenant: data.tenantId,
    } as any,
    overrideAccess: true,
  })

  const lesson1 = await payload.create({
    collection: 'lessons',
    data: {
      title: 'Lesson 1: Introduction',
      slug: 'test-lesson-1-intro',
      module: module.id,
      order: 1,
      lessonType: 'text',
      estimatedDuration: 10,
      tenant: data.tenantId,
      content: {
        root: {
          type: 'root',
          children: [
            { type: 'paragraph', children: [{ type: 'text', text: 'Lesson 1 content for testing.' }] },
          ],
          direction: null, format: '', indent: 0, version: 1,
        },
      },
    } as any,
    overrideAccess: true,
  })

  const lesson2 = await payload.create({
    collection: 'lessons',
    data: {
      title: 'Lesson 2: Deep Dive',
      slug: 'test-lesson-2-deep-dive',
      module: module.id,
      order: 2,
      lessonType: 'text',
      estimatedDuration: 15,
      tenant: data.tenantId,
    } as any,
    overrideAccess: true,
  })

  // Link lessons to module
  await payload.update({
    collection: 'modules',
    id: module.id,
    data: { lessons: [lesson1.id, lesson2.id] },
    overrideAccess: true,
  })

  // Link module to course
  await payload.update({
    collection: 'courses',
    id: course.id,
    data: { modules: [module.id] },
    overrideAccess: true,
  })

  return {
    courseId: course.id as number,
    moduleId: module.id as number,
    lessonIds: [lesson1.id as number, lesson2.id as number],
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml playwright.config.ts tests/fixtures/ tests/helpers/
git commit -m "Set up Playwright + comprehensive test infrastructure with seed helpers"
```

---

## Task 2: Admin E2E Tests

**Files:**
- Rewrite: `tests/e2e/admin.e2e.spec.ts`

Tests:
1. Admin can login and see dashboard with all collections
2. Admin can create an article (with tenant, pillar, content) and save successfully
3. Admin can edit an existing article
4. Admin can publish an article (change editorial status to published)
5. Admin can see all users in the Users collection
6. Admin can navigate to all collection list views without errors

- [ ] **Step 1: Write admin E2E tests** (full Playwright tests with login, navigation, form filling)
- [ ] **Step 2: Run and verify** `pnpm test:e2e -- tests/e2e/admin.e2e.spec.ts`
- [ ] **Step 3: Fix any bugs found**
- [ ] **Step 4: Commit**

---

## Task 3: Editorial Workflow E2E Tests

**Files:**
- Create: `tests/e2e/editorial-workflow.e2e.spec.ts`

Tests:
1. Contributor creates draft → saves → can see it in their article list
2. Contributor submits for review (draft → in_review) → succeeds
3. Contributor tries to publish directly (draft → published) → blocked
4. Editor logs in → sees in_review articles → approves (in_review → approved)
5. Publisher logs in → sees approved articles → publishes (approved → published)
6. Published article visible on frontend `/articles` page
7. Published article visible at `/articles/[slug]` with full content

- [ ] **Step 1: Write editorial workflow E2E tests**
- [ ] **Step 2: Run and fix bugs**
- [ ] **Step 3: Commit**

---

## Task 4: Contributor Experience E2E Tests

**Files:**
- Create: `tests/e2e/contributor.e2e.spec.ts`

Tests:
1. Contributor can login to admin panel (not blocked)
2. Contributor can see Articles, Courses collections (not Users, system collections)
3. Contributor can create a new article with all required fields
4. Contributor can see their own draft articles in the list
5. Contributor CANNOT see other users' draft articles
6. Contributor CANNOT delete articles
7. Contributor CANNOT access Users collection

- [ ] **Step 1: Write contributor E2E tests**
- [ ] **Step 2: Run and fix bugs**
- [ ] **Step 3: Commit**

---

## Task 5: Frontend Pages E2E Tests

**Files:**
- Rewrite: `tests/e2e/frontend.e2e.spec.ts`

Tests:
1. Homepage loads (no blank screen, no JS errors)
2. `/articles` page loads with list of published articles
3. `/articles/[slug]` loads with article content, sidebar with TOC
4. `/courses` page loads with course listing
5. `/courses/[slug]` loads with module breakdown
6. `/search` page loads, search input works
7. Locked article shows excerpt + upgrade banner (anonymous user)
8. Published premium article shows full content for premium user

- [ ] **Step 1: Write frontend E2E tests**
- [ ] **Step 2: Run and fix bugs**
- [ ] **Step 3: Commit**

---

## Task 6: Enrollment & Account E2E Tests

**Files:**
- Create: `tests/e2e/enrollment.e2e.spec.ts`
- Create: `tests/e2e/account.e2e.spec.ts`

Enrollment tests:
1. User enrolls in a free course → enrollment created
2. User sees enrolled course on `/account/courses`
3. User navigates to lesson viewer → lesson content visible
4. User clicks "Mark Complete & Next" → progress updates
5. User cannot enroll in a course above their tier

Account tests:
1. `/account/profile` loads with user's name and email
2. User can update their name
3. `/account/billing` loads with current tier
4. `/account/courses` shows enrolled courses with progress bars

- [ ] **Step 1: Write enrollment + account E2E tests**
- [ ] **Step 2: Run and fix bugs**
- [ ] **Step 3: Commit**

---

## Task 7: Integration Tests — Multi-Tenant & Access Control

**Files:**
- Create: `tests/int/multi-tenant.int.spec.ts`
- Create: `tests/int/access-matrix.int.spec.ts`

Multi-tenant tests (using Payload Local API, no browser):
1. User in Tenant A cannot see Tenant B's articles
2. Admin with `userHasAccessToAllTenants` can see all tenants' content
3. Creating an article without tenant field fails validation
4. Contributor can only see their own articles + published articles

Access matrix tests:
1. For each role (user, contributor, editor, publisher, admin):
   - Can/cannot create articles
   - Can/cannot read articles (own vs others, draft vs published)
   - Can/cannot update articles (own vs others)
   - Can/cannot delete articles
   - Can/cannot access admin panel
2. For each tier (free, regular, premium, enterprise):
   - Can read content at their level and below
   - Cannot read content above their level (locked: true)

- [ ] **Step 1: Write multi-tenant integration tests**
- [ ] **Step 2: Write access matrix integration tests**
- [ ] **Step 3: Run and fix bugs**
- [ ] **Step 4: Commit**

---

## Task 8: Integration Tests — RAG & Enrollment

**Files:**
- Create: `tests/int/rag-indexing.int.spec.ts`
- Create: `tests/int/enrollment-flow.int.spec.ts`

RAG tests (require Jina API key — skip in CI if not available):
1. Publishing an article creates content chunks
2. Updating published article's content re-indexes chunks
3. Chunks have correct accessLevel and pillar copied from source
4. Non-content changes (title only) do NOT trigger re-indexing

Enrollment tests:
1. User enrolls in course → enrollment created with status=active
2. Duplicate enrollment blocked
3. User marks lesson complete → progress percentage updates
4. All lessons complete → enrollment auto-completes (status=completed)
5. User cannot enroll in course above their tier

- [ ] **Step 1: Write RAG indexing integration tests**
- [ ] **Step 2: Write enrollment flow integration tests**
- [ ] **Step 3: Run and fix bugs**
- [ ] **Step 4: Commit**

---

## Task 9: Mobile Responsive E2E Tests

**Files:**
- Create: `tests/e2e/mobile.e2e.spec.ts`

Tests (run in mobile viewport via Playwright `devices['iPhone 13']`):
1. Article reader: sidebar hidden, mobile menu button visible
2. Tap mobile menu → sidebar drawer opens
3. Tap link in drawer → navigates, drawer closes
4. Course lesson viewer: sidebar hidden, mobile menu button visible
5. Content list: thumbnails hidden on small screens
6. Account page: horizontal tabs visible (not sidebar)

- [ ] **Step 1: Write mobile E2E tests**
- [ ] **Step 2: Run and fix bugs**
- [ ] **Step 3: Commit**

---

## Task 10: CI Integration & Build Verification

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add E2E tests to CI**

Update `.github/workflows/ci.yml` to add a separate E2E job:

```yaml
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7.2-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: pnpm/action-setup@v4
        with: { version: 10, run_install: false }
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install chromium --with-deps
      - run: pnpm test:e2e
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          PAYLOAD_SECRET: ci-test-secret-minimum-32-characters-long
          NEXT_PUBLIC_SERVER_URL: http://localhost:3000
          REDIS_URL: redis://localhost:6379
```

- [ ] **Step 2: Run all tests locally**

```bash
pnpm test:all
```

- [ ] **Step 3: Verify CI passes**
- [ ] **Step 4: Commit**

---

## Milestone Checklist

After completing all 10 tasks:

- [ ] Playwright installed and configured with chromium + mobile projects
- [ ] Test fixtures and seed helpers create users with proper tenant/tier assignment
- [ ] Admin E2E: login, dashboard, article CRUD, all collections navigable
- [ ] Editorial workflow E2E: full draft → publish lifecycle across 3 roles
- [ ] Contributor E2E: proper access (own content visible, can't publish, can't see users)
- [ ] Frontend E2E: all pages load, content visible, locked content shows banner
- [ ] Enrollment E2E: enroll, view lessons, mark complete, progress updates
- [ ] Account E2E: profile/billing/courses pages functional
- [ ] Multi-tenant integration: tenant scoping verified for all content collections
- [ ] Access matrix integration: every role × operation combination verified
- [ ] RAG integration: publish triggers indexing, re-index on content change
- [ ] Enrollment integration: full flow including auto-completion
- [ ] Mobile E2E: sidebar drawer, responsive layout
- [ ] CI: E2E tests run in GitHub Actions with PostgreSQL + Redis services
- [ ] All bugs found during testing are fixed and committed
- [ ] Zero known bugs in critical user flows
