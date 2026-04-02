# PATHS Platform Migration: LearnHouse → Payload CMS

**Date:** 2026-03-23
**Status:** Design Spec (pending approval)
**Predecessor:** `2026-03-23-lms-platform-comparison-design.md` (Payload selected as replacement)

---

## 1. Executive Summary

Migrate the PATHS educational platform from LearnHouse (FastAPI + Next.js soft fork) to Payload CMS 3.x (TypeScript + Next.js, code-first). This rebuilds the same 6 sub-projects on a superior foundation while applying lessons learned from the LearnHouse implementation.

**Why Payload:** Lexical block editor (solves editor quality issue), MIT license (no usage caps or copyleft), healthy community (41k+ stars, Figma-backed), TypeScript end-to-end, auto-generated APIs, built-in versioning/auth/access control.

**What changes:** Backend moves from Python/FastAPI to TypeScript/Payload. Frontend stays Next.js but rebuilt with Payload's App Router integration. AI integration is a day-1 feature. No video hosting — YouTube/Vimeo embeds only. Infrastructure largely reusable (Vercel + Render + R2 + Cloudflare).

**What doesn't change:** Content strategy, access control model, editorial workflow design, Stripe billing approach, multi-tenancy model, subdomain architecture, cookie-domain SSO pattern.

**Key architectural decisions:**
- **Vercel (frontend) + Render (backend)** split architecture — AI streaming and Stripe webhooks require a persistent server process
- **Together AI** as initial LLM provider ($60-150/mo) — OpenAI-compatible API, EU datacenter, migration path to self-hosted
- **No video uploads** — YouTube/Vimeo embeds only, minimizing hosted content and storage costs
- **Custom editorial workflow** — built as hooks, not enterprise tier

---

## 2. Lessons Carried Forward from LearnHouse

### Patterns to Reuse (proven in production)
| Pattern | LearnHouse Implementation | Payload Adaptation |
|---------|--------------------------|-------------------|
| Editorial workflow as state machine | Python dict of valid transitions | TypeScript `Record<Status, Status[]>` + `beforeChange` hook |
| Service-layer access control | `can_user_access_article()` function | Payload `access` functions on collections |
| "Highest wins" tier model | Union of user tier + org access level | Same logic in Payload access control functions |
| Locked content teaser | First ~200 words + fade + upgrade CTA | Same pattern, rendered from Lexical JSON |
| Cookie-domain SSO | JWT scoped to `.limitless-longevity.health` | Payload JWT with same cookie domain config |
| Stripe webhook handler | Verify signature → deduplicate → update state | `@payloadcms/plugin-stripe` webhook handlers |
| Content pillars as configurable taxonomy | DB model with display_order, is_active | Payload collection with admin UI |
| `include_locked` list parameter | SQL filter + `locked: bool` on response | Payload `afterRead` hook adds `locked` field |
| Flat subdomain pattern | `paths.*`, `paths-admin.*`, `paths-api.*` | Same (Payload serves both API and frontend) |
| Admin guides as definition of done | Markdown docs shipped with each sub-project | Same discipline |

### Improvements Over LearnHouse
| Issue | LearnHouse Problem | Payload Solution |
|-------|-------------------|-----------------|
| Datetime fields | ISO strings (`creation_date: str`) | Proper `date` fields with Payload's built-in timestamps |
| Cross-references | JSON UUID arrays (no referential integrity) | Payload `relationship` fields with proper FK |
| RBAC extension | Fragile UUID prefix convention, silent 409s | Payload's native collection-level access control |
| Migration noise | Alembic autogenerate picks up LearnHouse EE tables | Payload handles schema migrations automatically |
| Editor quality | TipTap with limited extensions, buggy authoring UX | Lexical with BlocksFeature, custom blocks, proven editor |
| Config system | runtime-config.js fallback chain, env var mismatches | Payload config is code-first, single source of truth |
| Bus factor | Single LearnHouse maintainer | 41k stars, Figma-backed, MIT (forkable) |

### Design Decisions Validated (Keep As-Is)
1. **Articles and courses are independent models** linked via relationship fields (not a shared base class)
2. **No REJECTED editorial status** — rejection returns to DRAFT with notes
3. **B2B billing is manual** — superadmin assigns tiers, no self-service
4. **No delegated org admin** — LIMITLESS manages all orgs
5. **Preview/teaser as first-class feature** from day one (not afterthought)
6. **Content versioning on explicit save + status transitions** (not auto-save)

---

## 3. Technical Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| Framework | Payload CMS 3.x on Next.js 15 (App Router) |
| Language | TypeScript (end-to-end) |
| Database | PostgreSQL 16 via `@payloadcms/db-postgres` (Drizzle ORM) |
| Cache | Redis (Render free tier) |
| Storage | Cloudflare R2 via `@payloadcms/storage-r2` |
| Editor | Lexical (`@payloadcms/richtext-lexical`) with custom blocks |
| Auth | Payload built-in JWT + HTTP-only cookies |
| Billing | `@payloadcms/plugin-stripe` + custom webhook handlers |
| Multi-tenancy | `@payloadcms/plugin-multi-tenant` |
| Search | `@payloadcms/plugin-search` |
| SEO | `@payloadcms/plugin-seo` |
| AI / LLM | Together AI (OpenAI-compatible API, EU datacenter) |
| DNS | Cloudflare (existing zone) |
| Monitoring | Sentry EU |
| Frontend hosting | Vercel Pro (Frankfurt fra1) |
| Backend hosting | Render Starter (Frankfurt) |

### Architecture: Vercel Frontend + Render Backend

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Next.js 15, Vercel Pro, Frankfurt)        │
│  paths.limitless-longevity.health                    │
│                                                      │
│  Public pages:        Dashboard (org admin):          │
│  /articles            /dash/articles                  │
│  /article/{slug}      /dash/courses                   │
│  /courses             /account/billing                │
│  /course/{slug}       /admin (Payload admin panel)    │
└──────────────────────┬───────────────────────────────┘
                       │ API calls (REST/GraphQL)
┌──────────────────────▼───────────────────────────────┐
│  Backend (Payload CMS + Next.js, Render Starter)      │
│  paths-api.limitless-longevity.health                 │
│                                                       │
│  /api/*               Auto-generated REST + GraphQL   │
│  /api/stripe/*        Stripe webhooks + proxy         │
│  /api/ai/*            AI orchestration layer          │
│  /admin               Payload admin panel             │
│                                                       │
│  Persistent process: streaming AI, webhooks, cron     │
└──────────┬──────────────┬────────────┬───────────────┘
           │              │            │
    ┌──────▼──────┐ ┌─────▼─────┐ ┌───▼───────────┐
    │ PostgreSQL  │ │   Redis   │ │ Together AI   │
    │ (Render)    │ │ (Render)  │ │ (EU/Sweden)   │
    └─────────────┘ └───────────┘ └───────────────┘
           │
    ┌──────▼──────┐
    │ Cloudflare  │
    │ R2 (WEUR)   │
    └─────────────┘
```

**Why split architecture (not single Vercel):**
1. **AI streaming** — content generation responses can exceed Vercel's 60s serverless timeout. Persistent process has no limit.
2. **AI orchestration** — rate limiting, prompt management, usage tracking, API key security belong in a backend, not exposed to the client.
3. **Provider abstraction** — backend wraps Together AI behind an internal `/api/ai/*` layer. Switching to Modal or self-hosted vLLM later changes one config.
4. **Stripe webhooks** — persistent process handles webhooks instantly (no cold-start risk).
5. **Predictable cost** — Render Starter is $7/mo flat regardless of API volume.

**Why NOT single Vercel (despite Payload 3.x supporting it):**
- Serverless 60s timeout is insufficient for AI content generation streaming
- Connection pooling for write-heavy workloads (progress tracking, AI usage logging) is simpler with persistent process
- Stripe webhook reliability requires instant availability

### Payload Plugins Used
| Plugin | Purpose | Free? |
|--------|---------|-------|
| `@payloadcms/db-postgres` | PostgreSQL adapter | Yes |
| `@payloadcms/richtext-lexical` | Lexical editor | Yes |
| `@payloadcms/storage-r2` | Cloudflare R2 file storage | Yes |
| `@payloadcms/plugin-stripe` | Stripe billing integration | Yes |
| `@payloadcms/plugin-multi-tenant` | B2B org isolation | Yes |
| `@payloadcms/plugin-search` | Cross-collection content search | Yes |
| `@payloadcms/plugin-seo` | SEO metadata for public pages | Yes |
| `@payloadcms/plugin-nested-docs` | Course > Module > Lesson hierarchy | Yes |
| `@payloadcms/plugin-form-builder` | Quizzes/assessments (future) | Yes |
| `payloadcms-lexical-ext` | YouTube/Vimeo embeds, text color | Yes (community) |

### Enterprise Features Decision
| Feature | Decision | Rationale |
|---------|----------|-----------|
| Publishing workflows (multi-step) | **BUILD CUSTOM** | Implement as status field + `beforeChange` hook state machine. Same pattern proven in LearnHouse. |
| SSO (SAML/OAuth) | **DEFER** | Not needed for launch. JWT + email/password sufficient. Evaluate if B2B clients demand it. |
| Visual editor / live preview | **SKIP** | Free draft/preview sufficient for content workflow |
| AI features | **SKIP** | Build custom if needed using Claude/OpenAI APIs directly |
| Real-time collaboration | **SKIP** | Single-author editing sufficient for team size |

---

## 4. Data Model

### Collections Overview

```
┌─────────────────────────────────────────────────────┐
│  AUTH & USERS                                        │
│  ├── Users (auth-enabled)                           │
│  ├── MembershipTiers                                │
│  └── Organizations (via multi-tenant plugin)        │
├─────────────────────────────────────────────────────┤
│  CONTENT                                             │
│  ├── Articles (versioned, editorial workflow)        │
│  ├── ContentPillars (taxonomy)                      │
│  ├── Courses (versioned)                            │
│  ├── Modules (nested under Courses)                 │
│  ├── Lessons (nested under Modules, video support)  │
│  └── Media (uploads → R2)                           │
├─────────────────────────────────────────────────────┤
│  LEARNING                                            │
│  ├── Enrollments                                    │
│  ├── LessonProgress                                 │
│  └── CourseProgress (computed)                      │
├─────────────────────────────────────────────────────┤
│  BILLING                                             │
│  ├── Products (synced with Stripe)                  │
│  ├── Subscriptions                                  │
│  └── Payments                                       │
├─────────────────────────────────────────────────────┤
│  GLOBALS                                             │
│  ├── SiteSettings                                   │
│  └── Navigation                                     │
└─────────────────────────────────────────────────────┘
```

### Collection Definitions

#### Users (auth-enabled)
```typescript
{
  slug: 'users',
  auth: {
    tokenExpiration: 28800, // 8 hours (matching LearnHouse pattern)
    cookies: {
      domain: '.limitless-longevity.health',
      secure: true,
      sameSite: 'lax',
    },
  },
  fields: [
    { name: 'firstName', type: 'text', required: true },
    { name: 'lastName', type: 'text', required: true },
    { name: 'role', type: 'select', options: ['user', 'contributor', 'editor', 'publisher', 'admin'], defaultValue: 'user' },
    { name: 'tier', type: 'relationship', relationTo: 'membership-tiers' },
    { name: 'organization', type: 'relationship', relationTo: 'organizations' },
    { name: 'emailVerified', type: 'checkbox', defaultValue: false },
    { name: 'stripeCustomerId', type: 'text', admin: { readOnly: true } },
    { name: 'avatar', type: 'upload', relationTo: 'media' },
  ],
}
```

#### MembershipTiers
```typescript
{
  slug: 'membership-tiers',
  fields: [
    { name: 'name', type: 'text', required: true },          // "Free", "Regular", "Premium", "Enterprise"
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'accessLevel', type: 'select', required: true,
      options: ['free', 'regular', 'premium', 'enterprise'] },
    { name: 'monthlyPrice', type: 'number' },
    { name: 'yearlyPrice', type: 'number' },
    { name: 'stripeMonthlyPriceId', type: 'text' },
    { name: 'stripeYearlyPriceId', type: 'text' },
    { name: 'stripeProductId', type: 'text' },
    { name: 'features', type: 'array', fields: [
      { name: 'feature', type: 'text' },
    ]},
    { name: 'displayOrder', type: 'number', defaultValue: 0 },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
}
```

#### Articles (versioned, editorial workflow)
```typescript
{
  slug: 'articles',
  versions: { drafts: true, maxPerDoc: 25 },  // Built-in versioning
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'excerpt', type: 'textarea' },
    { name: 'content', type: 'richText' },      // Lexical editor
    { name: 'featuredImage', type: 'upload', relationTo: 'media' },
    { name: 'pillar', type: 'relationship', relationTo: 'content-pillars', required: true },
    { name: 'accessLevel', type: 'select', required: true,
      options: ['free', 'regular', 'premium', 'enterprise'], defaultValue: 'free' },
    { name: 'editorialStatus', type: 'select', required: true,
      options: ['draft', 'in_review', 'approved', 'published', 'archived'],
      defaultValue: 'draft' },
    { name: 'author', type: 'relationship', relationTo: 'users', required: true },
    { name: 'reviewer', type: 'relationship', relationTo: 'users' },
    { name: 'reviewerNotes', type: 'textarea' },
    { name: 'publishedAt', type: 'date' },
    { name: 'relatedCourses', type: 'relationship', relationTo: 'courses', hasMany: true },
    // SEO fields added by @payloadcms/plugin-seo
    // Tenant field added by @payloadcms/plugin-multi-tenant
  ],
  hooks: {
    beforeChange: [validateEditorialTransition, inheritPillarAccessLevel],
    afterRead: [computeLockedStatus, computeTeaserContent],
  },
  access: {
    read: canReadArticle,       // Service-layer access control
    update: canEditArticle,     // Role + editorial status check
    create: canCreateArticle,   // contributor+ role
    delete: canDeleteArticle,   // admin only
  },
}
```

#### ContentPillars
```typescript
{
  slug: 'content-pillars',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea' },
    { name: 'icon', type: 'text' },                // Icon identifier
    { name: 'defaultAccessLevel', type: 'select',
      options: ['free', 'regular', 'premium', 'enterprise'], defaultValue: 'free' },
    { name: 'displayOrder', type: 'number', defaultValue: 0 },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
}
```

#### Courses (versioned)
```typescript
{
  slug: 'courses',
  versions: { drafts: true, maxPerDoc: 10 },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'richText' },
    { name: 'featuredImage', type: 'upload', relationTo: 'media' },
    { name: 'pillar', type: 'relationship', relationTo: 'content-pillars' },
    { name: 'accessLevel', type: 'select', required: true,
      options: ['free', 'regular', 'premium', 'enterprise'], defaultValue: 'premium' },
    { name: 'editorialStatus', type: 'select', required: true,
      options: ['draft', 'in_review', 'approved', 'published', 'archived'],
      defaultValue: 'draft' },
    { name: 'instructor', type: 'relationship', relationTo: 'users' },
    { name: 'modules', type: 'relationship', relationTo: 'modules', hasMany: true },
    { name: 'relatedArticles', type: 'relationship', relationTo: 'articles', hasMany: true },
    { name: 'estimatedDuration', type: 'number' },  // minutes
    { name: 'publishedAt', type: 'date' },
  ],
  hooks: {
    beforeChange: [validateEditorialTransition, calculateDuration],
    afterRead: [computeLockedStatus],
  },
  access: {
    read: canReadCourse,
    update: canEditCourse,
    create: canCreateCourse,
    delete: isAdmin,
  },
}
```

#### Modules
```typescript
{
  slug: 'modules',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'course', type: 'relationship', relationTo: 'courses', required: true },
    { name: 'lessons', type: 'relationship', relationTo: 'lessons', hasMany: true },
    { name: 'order', type: 'number', required: true },
    { name: 'estimatedDuration', type: 'number' },  // auto-calculated from lessons
  ],
}
```

#### Lessons
```typescript
{
  slug: 'lessons',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'content', type: 'richText' },          // Lexical editor with custom blocks
    { name: 'module', type: 'relationship', relationTo: 'modules', required: true },
    { name: 'order', type: 'number', required: true },
    { name: 'lessonType', type: 'select',
      options: ['text', 'video', 'audio', 'mixed'], defaultValue: 'text' },
    { name: 'videoEmbed', type: 'group', fields: [
      { name: 'platform', type: 'select', options: ['youtube', 'vimeo'] },
      { name: 'url', type: 'text' },        // YouTube/Vimeo URL
      { name: 'videoId', type: 'text' },     // Extracted video ID for embed
    ]},
    { name: 'estimatedDuration', type: 'number' },  // minutes
    { name: 'resources', type: 'array', fields: [
      { name: 'title', type: 'text' },
      { name: 'file', type: 'upload', relationTo: 'media' },
    ]},
  ],
}
```

#### Enrollments
```typescript
{
  slug: 'enrollments',
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'course', type: 'relationship', relationTo: 'courses', required: true },
    { name: 'enrolledAt', type: 'date', required: true },
    { name: 'status', type: 'select',
      options: ['active', 'completed', 'cancelled', 'expired'], defaultValue: 'active' },
    { name: 'completedAt', type: 'date' },
    { name: 'completionPercentage', type: 'number', defaultValue: 0 },
    { name: 'paymentStatus', type: 'select',
      options: ['free', 'paid', 'pending', 'refunded'], defaultValue: 'free' },
  ],
  indexes: [
    { fields: { user: 1, course: 1 }, unique: true },  // One enrollment per user per course
  ],
}
```

#### LessonProgress
```typescript
{
  slug: 'lesson-progress',
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'lesson', type: 'relationship', relationTo: 'lessons', required: true },
    { name: 'enrollment', type: 'relationship', relationTo: 'enrollments', required: true },
    { name: 'status', type: 'select',
      options: ['not_started', 'in_progress', 'completed'], defaultValue: 'not_started' },
    { name: 'completedAt', type: 'date' },
    { name: 'videoWatchTime', type: 'number', defaultValue: 0 },      // seconds
    { name: 'videoTotalDuration', type: 'number', defaultValue: 0 },  // seconds
    { name: 'lastAccessedAt', type: 'date' },
  ],
  hooks: {
    afterChange: [updateEnrollmentProgress],  // Recalculate course completion %
  },
}
```

#### Media (uploads → R2)
```typescript
{
  slug: 'media',
  upload: {
    staticDir: 'media',           // Handled by R2 adapter
    mimeTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf'],
    imageSizes: [
      { name: 'thumbnail', width: 300, height: 200, position: 'centre' },
      { name: 'card', width: 600, height: 400, position: 'centre' },
      { name: 'hero', width: 1200, height: 600, position: 'centre' },
    ],
  },
  fields: [
    { name: 'alt', type: 'text' },
    { name: 'caption', type: 'text' },
  ],
}
```

---

## 5. Custom Lexical Editor Blocks

The Lexical editor's `BlocksFeature` allows embedding custom structured content blocks within rich text. These replace LearnHouse's TipTap activity blocks.

### Blocks to Build

| Block | Fields | Purpose |
|-------|--------|---------|
| **VideoEmbed** | platform (youtube/vimeo), url, videoId, caption | Embed YouTube/Vimeo video (no uploads) |
| **AudioEmbed** | platform (youtube/soundcloud/spotify), url, caption | Embed audio from third-party platforms |
| **PDFViewer** | file (upload to R2), title | Inline PDF viewer (small files only) |
| **Callout** | type (info/warning/tip/quote), content (richText) | Highlighted content boxes |
| **CodeBlock** | language, code | Syntax-highlighted code |
| **ImageGallery** | images (array of uploads), layout (grid/carousel) | Multiple image display |
| **QuizQuestion** | question, options (array), correctAnswer, explanation | Inline quiz (AI-generated or manual) |
| **AIExplanation** | topic, level (beginner/intermediate/expert) | AI-generated concept explanation (interactive) |

### Community Extensions to Use
- `payloadcms-lexical-ext` — YouTube/Vimeo embed nodes, text color, highlight (72 stars, MIT)

---

## 6. Access Control Architecture

### Payload Access Control Functions

Payload's access control is collection-level, defined as functions that return `boolean | Where`:

```typescript
// articles access control
const canReadArticle: Access = ({ req }) => {
  const user = req.user;

  // Admin bypass
  if (user?.role && ['admin', 'publisher', 'editor'].includes(user.role)) return true;

  // Published articles: check access level
  return {
    and: [
      { editorialStatus: { equals: 'published' } },
      { accessLevel: { in: getEffectiveAccessLevels(user) } },
    ],
  };
};
```

### "Highest Wins" Logic (preserved from LearnHouse)
```typescript
function getEffectiveAccessLevels(user?: User): string[] {
  const levels = ['free'];  // Everyone gets free

  const tierLevel = user?.tier?.accessLevel;
  const orgLevel = user?.organization?.contentAccessLevel;

  // Union of individual tier + org access level
  const effectiveLevel = higherOf(tierLevel, orgLevel);

  // All levels up to and including effective level
  const hierarchy = ['free', 'regular', 'premium', 'enterprise'];
  const index = hierarchy.indexOf(effectiveLevel || 'free');
  return hierarchy.slice(0, index + 1);
}
```

### Course Reference Bypass (preserved from LearnHouse)
Articles linked from courses via `relatedArticles` relationship skip tier check for enrolled users. Implemented via `afterRead` hook that checks enrollment status.

---

## 7. Editorial Workflow (Custom, Not Enterprise)

### State Machine (same design as LearnHouse, TypeScript)
```typescript
const EDITORIAL_TRANSITIONS: Record<string, { targets: string[]; requiredRole: string }[]> = {
  draft:      [{ targets: ['in_review'], requiredRole: 'contributor' }],
  in_review:  [
    { targets: ['approved'], requiredRole: 'editor' },
    { targets: ['draft'], requiredRole: 'editor' },       // Rejection → back to draft
  ],
  approved:   [{ targets: ['published'], requiredRole: 'publisher' }],
  published:  [
    { targets: ['archived'], requiredRole: 'publisher' },
    { targets: ['draft'], requiredRole: 'publisher' },     // Unpublish for editing
  ],
  archived:   [{ targets: ['draft'], requiredRole: 'admin' }],
};
```

Implemented as a `beforeChange` hook that validates the transition and checks the user's role.

---

## 8. Billing Architecture

### Stripe Integration via Plugin
The `@payloadcms/plugin-stripe` provides:
- Bidirectional sync (Payload ↔ Stripe)
- Webhook endpoint at `/api/stripe/webhooks`
- REST proxy at `/api/stripe/rest`
- `stripeID` field injection on synced collections

### Subscription Flow (adapted from LearnHouse pattern)
1. User selects tier on `/account/billing`
2. Frontend calls custom `/api/checkout` endpoint
3. Backend creates Stripe Checkout Session with tier's price ID
4. User completes payment on Stripe-hosted page
5. Stripe sends `checkout.session.completed` webhook
6. Webhook handler: create/update subscription record, upgrade user tier
7. `customer.subscription.updated` → handle plan changes
8. `customer.subscription.deleted` → downgrade to free tier
9. `invoice.payment_failed` → mark subscription as `past_due`

### Billing Collections
- **Products**: Synced with Stripe Products (subscription tiers)
- **Subscriptions**: Tracks active subscriptions per user
- **Payments**: Audit trail of all payment events

### B2B: Manual tier assignment by admin (same as LearnHouse)

---

## 9. AI Integration (Day-1 Feature)

### Why AI is Non-Negotiable
In 2026, every LMS must include AI for both the learning process and content creation. This is a day-1 feature, not a future enhancement.

### Provider Strategy

**Starting provider: Together AI**
| Attribute | Detail |
|-----------|--------|
| API | OpenAI-compatible (drop-in replacement) |
| EU datacenter | Sweden (GDPR-compliant) |
| Cold starts | None |
| Streaming | Yes (SSE) |
| Time to first token | 100-300ms |
| Models available | 200+ including Qwen 3, DeepSeek V3, Llama 3.3 |
| Compliance | SOC 2 |
| Cost (10K req/day) | $60-150/mo |

**Why not self-host initially:**
Self-hosting (Modal, RunPod, HuggingFace) costs $460-1,800/mo for the same 10K req/day workload. Together AI is 5-10x cheaper at launch scale. The OpenAI-compatible API means migration to self-hosted is a config change, not a code rewrite.

**Migration path:** Together AI → Modal/RunPod (when volume justifies GPU cost) → dedicated GPU (at enterprise scale). Only `base_url` and `api_key` change at each step.

### Recommended Models
| Use Case | Model | Why |
|----------|-------|-----|
| Real-time (chat tutoring, Q&A, translation) | Qwen 3 8B | Fast, cheap, 119 languages, Apache 2.0 |
| Quality-sensitive (content creation, quiz generation, lesson drafting) | Qwen 3 14B | Better output quality, still affordable |
| Frontier needs (complex reasoning, research summaries) | DeepSeek V3.1 | Via Together AI API, do NOT self-host (needs 8x H100) |

### AI Features for PATHS

#### Learning Process (student-facing)
- **AI Tutor Chat** — contextual Q&A about lesson/article content. Uses lesson content as context window.
- **Content Summarization** — generate summaries of articles and lessons at different reading levels.
- **Quiz Generation** — auto-generate practice questions from lesson content.
- **Translation** — on-demand translation of content (Qwen 3's 119-language support).
- **Concept Explanation** — "Explain this like I'm 5" / "Explain at expert level" for complex topics.

#### Content Creation (author-facing)
- **Article Draft Generation** — generate article drafts from outline/topic within a content pillar.
- **Lesson Content Suggestions** — suggest lesson content based on course structure and learning objectives.
- **SEO Optimization** — generate meta descriptions, titles, and keywords.
- **Content Review Assistant** — AI-assisted editorial review (grammar, clarity, accuracy flags).

### AI Orchestration Architecture

```typescript
// Backend: /api/ai/* endpoints
// All AI calls routed through backend for security, rate limiting, and tracking

// Collections for AI
const AIUsage = {
  slug: 'ai-usage',
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users' },
    { name: 'feature', type: 'select', options: ['tutor', 'summarize', 'quiz', 'translate', 'draft', 'review'] },
    { name: 'model', type: 'text' },
    { name: 'inputTokens', type: 'number' },
    { name: 'outputTokens', type: 'number' },
    { name: 'cost', type: 'number' },  // calculated from token counts
    { name: 'contextCollection', type: 'text' },  // 'articles', 'lessons', etc.
    { name: 'contextId', type: 'text' },
  ],
};

// Provider abstraction
interface AIProvider {
  chat(messages: Message[], options: AIOptions): AsyncIterable<string>;
  // Only base_url and api_key differ between providers
}
```

### AI Cost Controls
- **Rate limiting** per user per feature (e.g., 50 tutor messages/day for free tier, unlimited for premium)
- **Usage tracking** via `ai-usage` collection (cost per user, per feature, per day)
- **Tier-gated features** — free tier gets summarization only; premium gets full AI suite
- **Token budgets** — configurable max tokens per request per feature
- **Model routing** — cheaper model (8B) for simple tasks, larger model (14B) for content generation

## 10. Deployment Architecture

### Infrastructure
| Component | Current (LearnHouse) | New (Payload) | Change |
|-----------|---------------------|---------------|--------|
| Frontend | Vercel Pro, Frankfurt | Vercel Pro, Frankfurt | **Same** — Next.js App Router |
| Backend/API | Render Starter (FastAPI) | Render Starter (Payload + Node.js) | **Same provider**, new app |
| Database | Render PostgreSQL 18 | Render PostgreSQL 18 | **Same** (new database, fresh schema) |
| Redis | Render Free (Valkey) | Render Free (Valkey) | **Same** |
| Storage | Cloudflare R2, EU | Cloudflare R2, EU | **Same** |
| AI / LLM | N/A | Together AI (Sweden) | **New** |
| DNS | Cloudflare | Cloudflare | **Same zone, new records** |
| Monitoring | Sentry EU | Sentry EU | **Same org, new projects** |

**Cost estimate:**
| Service | Monthly Cost |
|---------|-------------|
| Vercel Pro | $20 |
| Render Starter (backend) | $7 |
| Render PostgreSQL | $7 |
| Render Redis (free) | $0 |
| Cloudflare R2 (free tier) | $0 |
| Together AI (10K req/day) | $60-150 |
| **Total** | **~$94-177/mo** |

### Subdomain Architecture
| Subdomain | Service | Purpose |
|-----------|---------|---------|
| `paths.limitless-longevity.health` | Vercel | Public frontend (Next.js) |
| `paths-api.limitless-longevity.health` | Render | Payload API + admin panel + AI endpoints |

**Simplification from LearnHouse:** Two subdomains instead of three. Admin panel lives at `paths-api.*/admin` (Payload's built-in admin). No more middleware cookie routing issues — the admin panel is part of the Payload backend, not a subdomain-routed frontend trick.

### Content Hosting Strategy (Minimize Hosted Content)
| Content Type | Hosting | Rationale |
|-------------|---------|-----------|
| Video | YouTube/Vimeo embeds | No video uploads. Zero storage/bandwidth cost. YouTube handles encoding, CDN, adaptive streaming. |
| Images | Cloudflare R2 | Article/course images, thumbnails. R2 free tier (10GB storage, no egress fees). |
| Audio | YouTube/SoundCloud embed OR R2 | Prefer embeds. R2 for small files only. |
| PDFs | Cloudflare R2 | Downloadable resources. Small files only. |
| Text content | PostgreSQL (Lexical JSON) | Stored as structured JSON in the database. |

**Principle:** Offload everything possible to third-party platforms. Only host what must be under our direct control (images for layout, small downloadable resources).

---

## 10. Migration Strategy

### Phase 0: Terraform Teardown — COMPLETE
LearnHouse infrastructure decommissioned 2026-03-23. 24 resources destroyed, 3 retained (Cloudflare zone, GitHub repo, Sentry org). See Section 13.

### Phase 1: Foundation
- Scaffold Payload project from Website template
- Configure PostgreSQL (Render), R2 (Cloudflare), Redis (Render)
- Define Users collection with JWT auth + cookie domain SSO
- Define MembershipTiers collection
- Configure multi-tenant plugin for Organizations
- Set up Lexical editor with custom blocks (VideoEmbed, Callout, CodeBlock)
- Deploy split architecture: Payload backend on Render, Next.js frontend on Vercel
- Set up Terraform resources for new infrastructure
- **Milestone:** Admin can log in, create users, manage tiers and orgs

### Phase 2: Content System
- Define ContentPillars, Articles, Courses, Modules, Lessons collections
- Implement editorial workflow as `beforeChange` hook state machine
- Implement access control functions (tier-based, "highest wins")
- Build custom Lexical blocks (YouTube/Vimeo embed, audio embed, PDF, gallery, callout)
- Configure versioning on Articles and Courses
- Configure search plugin across content collections
- **Milestone:** Full content CRUD with editorial workflow and access control

### Phase 3: AI Integration
- Set up Together AI provider abstraction (`/api/ai/*` endpoints)
- Implement AI Tutor Chat (contextual Q&A against lesson/article content)
- Implement content summarization and concept explanation
- Implement AI-assisted content creation (draft generation, quiz generation)
- Define AIUsage collection for tracking and cost control
- Implement tier-gated AI features and rate limiting
- **Milestone:** AI features functional for both students and content authors

### Phase 4: Learning & Billing
- Define Enrollments, LessonProgress collections
- Build progress tracking hooks (lesson completion → course progress)
- Integrate Stripe plugin + subscription webhook handlers
- Build billing page (tier selection, Stripe Checkout, subscription management)
- Build course enrollment flow
- **Milestone:** Users can enroll in courses, track progress, upgrade tiers

### Phase 5: Frontend & Polish
- Build public pages: article browse, article reader, course catalog, course player, lesson viewer
- Build locked content teaser with upgrade CTA
- Build account/billing page
- Build admin dashboard enhancements (stats, member management)
- SEO plugin configuration
- Responsive design (mobile-first)
- **Milestone:** Production-ready platform

### Phase 6: Launch
- DNS cutover (update Cloudflare records via Terraform)
- Sentry project setup
- Production environment variables
- Smoke testing
- Go live

---

## 12. Superwebpros LMS Plugin Assessment

The `@superwebpros/payload-lms-plugin` (GitHub: `superwebpros/payload-lms-plugin`) provides:
- 6 collections: Courses, Modules, Lessons, CourseEnrollments, LessonProgress, FileDownloads
- Video integration (YouTube, Vimeo, Mux)
- Automatic lesson completion at 90% video watched
- Optional Stripe and Mautic integration

**Assessment:** Early-stage (3 commits, 5 stars, not on public npm). The collection schemas are a useful **reference architecture** but the plugin should NOT be used as a dependency because:
1. Not published to public npm (GitHub Packages only)
2. No frontend components — only backend collections
3. Immature — may not handle edge cases
4. Our access control and editorial workflow needs are more complex than what it provides

**Recommendation:** Study the collection schemas for design inspiration (especially Enrollments and LessonProgress). Build our own collections informed by both this plugin and our LearnHouse experience.

---

## 13. Terraform Teardown — COMPLETE (2026-03-23)

### Scope
All LearnHouse-specific infrastructure decommissioned.

### Resource Classification

**DESTROY (20 resources):**
- Render: `paths_api` (web service), `paths_redis`, `paths_db` (has `prevent_destroy`)
- Vercel: `paths_web` (project), 2 domain bindings, 6 environment variables
- Sentry: 2 projects, 2 keys, 1 team
- Contributor guide: `guide` (Vercel project), guide domain, guide DNS record
- Cloudflare: 3 DNS records (paths, paths-admin, paths-api)
- R2: `paths_content` bucket (backup contents first)

**KEEP (3 resources):**
- `cloudflare_zone.main` — shared DNS zone (has `prevent_destroy`)
- `github_repository.limitless_paths` — archive, don't delete (has `prevent_destroy`)
- `data.sentry_organization.main` — read-only data source

### Recommended Approach
The cleanest Terraform approach: remove resource definitions from `.tf` files, let Terraform plan the destruction.

1. **Pre-destroy safety:**
   - `terraform state pull > terraform-state-backup-2026-03-XX.json`
   - Back up PostgreSQL database via Render dashboard
   - Back up R2 bucket contents via `rclone` or Wrangler CLI

2. **Remove `prevent_destroy`:**
   - Edit `paths.tf`: remove `lifecycle { prevent_destroy = true }` from `render_postgres.paths_db`

3. **Delete resource definitions:**
   - Remove contents of `paths.tf` (all PATHS resources)
   - Remove contents of `guide.tf` (contributor guide resources)
   - Clean PATHS-specific outputs from `outputs.tf`
   - Remove PATHS-specific variables from `variables.tf` (`paths_jwt_secret`, `paths_resend_api_key`)

4. **Plan and apply:**
   ```bash
   terraform plan    # Review: should show ~20 resources to destroy, 3 to keep
   terraform apply   # Execute destruction
   ```

5. **Post-cleanup:**
   - Delete `modules/learnhouse-app/` directory
   - Commit cleaned Terraform code
   - Remaining resources: Cloudflare zone, GitHub repo (archived), Sentry org

### Execution
Teardown executed 2026-03-23. 24 resources destroyed, R2 bucket emptied (5 test objects) then deleted. State backup saved at `limitless-infra/terraform-state-backup-2026-03-23.json`. Commit: `8b646c2` pushed to `limitless-infra` repo.

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Payload 3.x breaking changes in minor releases | Medium | Medium | Pin exact versions, test before upgrading |
| Figma acquisition shifts Payload's direction | Low | High | MIT license allows forking; community is large enough to sustain |
| Lexical editor limitations discovered during build | Low | High | BlocksFeature is highly extensible; community extensions exist |
| Together AI pricing changes or service issues | Low | Medium | OpenAI-compatible API — switch to RunPod/Modal with config change only |
| AI response quality insufficient for education | Low | Medium | Model selection is configurable; upgrade to larger models or switch providers |
| Enterprise features (SSO) needed sooner than expected | Low | Medium | Can implement custom OAuth via NextAuth; enterprise tier is fallback |
| Render Starter insufficient for AI streaming load | Low | Medium | Upgrade to Render Standard ($25/mo) for more RAM/CPU |

---

## 15. Success Criteria

1. Content editor enables premium content creation without friction (the #1 reason for migration)
2. All 6 sub-project capabilities reproduced: auth, CMS, access control, content UI, org admin, billing
3. AI integration functional day-1: tutor chat, content summarization, draft generation, quiz generation
4. No video hosting — all video via YouTube/Vimeo embeds, minimizing storage costs
5. Deployed on Vercel + Render + R2 + Cloudflare + Together AI at ~$94-177/mo
6. MIT-licensed, no usage caps, full IP ownership
7. 100% TypeScript, fully typed, testable
8. Cookie-domain SSO compatible with CUBES+ and HUBS
