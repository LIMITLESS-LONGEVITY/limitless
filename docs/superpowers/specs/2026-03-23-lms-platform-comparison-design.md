# LMS Platform Comparison Report: Replacing LearnHouse

**Date:** 2026-03-23
**Status:** Research Report
**Context:** After extensive production testing, LearnHouse has been deemed insufficient for PATHS. This report evaluates alternatives.

---

## Why We're Leaving LearnHouse

Three critical issues drove this decision, in priority order:

### 1. Content Editor Quality (Deal-Breaker)
The content creation experience — the single most important UX in an LMS — was poor. The LearnHouse editor (TipTap-based) was limiting and malfunctioning. Creating courses and articles was friction-heavy. For a platform targeting C-suite executives and UHNW individuals, the authoring tool must produce premium content effortlessly. LearnHouse's editor could not deliver this.

### 2. Licensing Restrictions
LearnHouse's free tier imposes hard limits: **3 courses, 30 members, watermark on content**. Exceeding any of these requires a paid plan. Additionally, the license requires all modifications to be made public, which prevents LIMITLESS from maintaining proprietary customizations as IP. Given the 6 sub-projects of custom code already written (auth, CMS, access control, billing, org admin, content UI), this is untenable.

### 3. Bus Factor of 1
LearnHouse is maintained by a single developer. The platform is not production-mature — we hit numerous undocumented behaviors during deployment (health endpoint auth dependency, middleware cookie requirements, runtime-config.js fallbacks, admin role vs superadmin distinction). A single maintainer cannot sustain the pace of fixes, features, and security patches a production SaaS depends on.

---

## What PATHS Requires

Based on what was built on LearnHouse (6 complete sub-projects, 491 tests, production deployment), these are the non-negotiable requirements:

| Requirement | Detail |
|------------|--------|
| **Premium content editor** | Block-based, extensible, supports images/video/audio/PDF, produces structured JSON, excellent authoring UX |
| **Articles + Courses** | Independent content types with different access models (articles for B2C, courses for premium/B2B) |
| **Editorial workflow** | Draft → Review → Published (at minimum), with role-based permissions |
| **Content taxonomy** | Configurable content pillars (Nutrition, Movement, Sleep, etc.) |
| **Content versioning** | Full snapshots with restore capability |
| **Tiered access control** | Free / Regular / Premium / Enterprise tiers gating content |
| **B2B multi-tenancy** | Organizations with org-specific content + platform-wide content |
| **Stripe billing** | B2C subscriptions (monthly/yearly), B2B manual tier assignment |
| **JWT auth + cross-app SSO** | Shared auth across PATHS, CUBES+, HUBS via cookie domain scoping |
| **API-first / headless** | Custom frontend possible, comprehensive REST or GraphQL API |
| **Modern tech stack** | TypeScript or Python, deployable on Vercel + Render |
| **Permissive license** | MIT, Apache 2.0, or similar — no copyleft, no usage caps |
| **Healthy community** | Multiple maintainers, active development, low bus-factor risk |

---

## Platforms Evaluated

Three platforms were researched in depth. Two additional (Canvas LMS, Open edX) were evaluated and eliminated early due to AGPL licensing and over-engineering for academic use cases.

| Platform | Type | Stack | License |
|----------|------|-------|---------|
| **Moodle** | Traditional LMS | PHP / MySQL / Apache | GPL v3 (open core: Workplace is paid) |
| **Payload CMS** | Headless CMS / App Framework | TypeScript / Next.js / PostgreSQL | MIT |
| **Directus** | Headless Data Platform | TypeScript / Node.js / PostgreSQL | BSL 1.1 → GPLv3 (after 3 years) |

---

## Platform 1: Moodle

### Overview
The world's most widely deployed open-source LMS. 20+ years old, battle-tested in academic institutions worldwide. PHP monolith with server-rendered pages, 58 plugin types, and a massive community.

### Strengths
- **Mature LMS features:** Course management, quizzes, grading, SCORM, competencies, certificates — decades of educational tooling
- **Massive community:** Thousands of plugins, extensive documentation, large contributor base
- **AI subsystem (4.5+):** Pluggable AI with provider abstraction (OpenAI, Azure, Ollama) — well-architected
- **GPL v3 for SaaS:** No distribution obligation when running as a hosted service
- **S3-compatible storage:** Via `tool_objectfs` plugin (Cloudflare R2 would work)

### Weaknesses

#### Critical Mismatches
- **No article content type:** Moodle is course-centric. There is no native article/blog model, no editorial workflow, no content pillar taxonomy, no content versioning. All would require custom plugin development.
- **Editor: TinyMCE 6/7** — a conventional WYSIWYG, not a modern block editor. No structured JSON output, no custom block types, no extensibility comparable to TipTap/Lexical/ProseMirror. **This does not solve Pain Point #1.**
- **Multi-tenancy requires Moodle Workplace** — a proprietary, paid product available only through certified partners. Pricing is undisclosed. The free Moodle LMS has no multi-tenancy.
- **Not headless:** The API is RPC-style (all POST to a single endpoint), not RESTful. Major functionality gaps — course editing, quiz building, gradebook have no API. Cannot build a custom Next.js frontend without losing most admin/authoring capabilities.
- **Incompatible with current infrastructure:** PHP monolith cannot run on Vercel. Requires traditional LAMP hosting, cron jobs every minute, persistent filesystem. Terraform config would need complete rewrite.

#### Significant Concerns
- **Tech stack mismatch:** PHP vs. your TypeScript/Python expertise. Non-standard PHP conventions (XMLDB, Frankenstyle naming) with no transferability.
- **Developer experience:** 20-year-old codebase with legacy patterns (globals, no DI, no ORM, include-oriented architecture). Weeks-to-months learning curve.
- **Payment model is course-level:** Stripe plugin enables pay-per-course enrollment, not platform-level subscription tiers. Subscription-gated access is custom development.
- **Upgrade fragility:** Major version upgrades frequently break plugins. High maintenance burden for custom code.

### Licensing Assessment
GPL v3 is acceptable for SaaS (no distribution = no copyleft obligation). However, the open-core split is problematic: multi-tenancy, org hierarchies, and advanced automation are locked behind Moodle Workplace (proprietary, undisclosed pricing).

### Community Health
- Contributors: Thousands, but core is gatekept by Moodle HQ
- GitHub stars: ~5,500
- Bus factor: **Low risk** — large organization, 20+ years, institutional backing
- Plugin ecosystem: 2,000+ plugins in directory

### Implementation Complexity for PATHS
**Very High.** Would require:
- Complete infrastructure rebuild (drop Vercel, set up LAMP hosting)
- Custom plugins for: articles, editorial workflow, content pillars, versioning, subscription tiers, multi-tenancy (or pay for Workplace)
- Learn PHP and Moodle's proprietary framework conventions
- Accept TinyMCE as editor (does not solve the core pain point)
- Rebuild all 6 sub-projects as Moodle plugins
- Estimated effort: **6-12 months** for feature parity

### Verdict: NOT RECOMMENDED
Moodle does not solve the #1 pain point (editor quality) and introduces massive architectural regression. It is designed for academic institutions running semester-based courses, not premium consultancy platforms with articles + tiered access + B2B multi-tenancy. The PHP monolith conflicts with your entire stack and deployment architecture.

---

## Platform 2: Payload CMS

### Overview
The leading open-source headless CMS. TypeScript-native, code-first configuration, installs directly into Next.js. Auto-generates REST API, GraphQL API, and admin panel from schema definitions. MIT licensed. Acquired by Figma (June 2025) with commitment to keeping it open source.

### Strengths

#### Directly Addresses Pain Points
- **Editor: Lexical (Meta's editor)** — modern, extensible block-based editor storing content as JSON AST. Custom nodes, toolbar buttons, and block types are straightforward to build. This is a generation ahead of both LearnHouse's TipTap implementation and Moodle's TinyMCE. **Directly addresses Pain Point #1.**
- **MIT license** — no usage caps, no watermarks, no seat limits, no copyleft. Modifications are fully private IP. **Directly addresses Pain Point #2.**
- **41,400+ GitHub stars, 3,500+ forks, 561 releases, active Discord** — healthy community with multiple maintainers backed by Figma's resources. **Directly addresses Pain Point #3.**

#### Architecture Fit
- **TypeScript end-to-end** — config, hooks, access control, components. Full type safety. Auto-generated types from schema.
- **PostgreSQL via Drizzle ORM** — matches your current database choice
- **Cloudflare R2 adapter** — official S3-compatible storage adapter, matches your current setup
- **Vercel-native deployment** — first-class support, also works on Render as standard Node.js
- **Code-first collections** — define schema in TypeScript, get database tables + API endpoints + admin UI automatically. No manual migrations.
- **Local API** — in-process calls with no HTTP overhead for server-side operations

#### Built-in Features (Free)
- **Versioning + drafts** — full snapshots with diffs and one-click restore
- **JWT auth** — built-in, configurable, supports HTTP-only cookies
- **API keys** — per-user, non-expiring
- **Multi-tenant plugin** — official, free, row-level isolation via tenant ID
- **Stripe plugin** — bidirectional sync, webhook proxy, access control integration
- **Granular access control** — field-level, collection-level, custom functions receiving full request context
- **Localization** — built-in field-level translation support
- **Upload handling** — with storage adapters for S3/R2/Vercel Blob

### Weaknesses

#### Enterprise Paywall (Significant)
- **Publishing workflows (multi-step approval)** — paid. Free tier only supports draft → published. Your editorial workflow (Draft → In Review → Approved → Published → Archived) would need to be built as custom hook logic OR you pay for enterprise.
- **SSO (SAML/OAuth)** — paid. B2B clients expecting SSO would require enterprise tier or a custom NextAuth workaround.
- **Visual editor / live preview** — paid. Not critical for LMS but nice-to-have.
- **AI features** — paid (auto-embedding, AI writing). Community plugin `ashbuilds/payload-ai` exists as free alternative.
- **Real-time collaboration** — paid. Not critical for your use case.

#### No LMS Out of the Box
Payload is a CMS/app framework, not an LMS. You would build from scratch:

| Feature | Effort | Notes |
|---------|--------|-------|
| Course structure (courses, modules, lessons) | Medium | Collections + relationships + nested blocks |
| Article system | Low | Drafts + versions + Lexical = mostly free |
| Content pillars/taxonomy | Low | Simple collection with relationships |
| Progress tracking | Medium-High | Custom collection + hooks on lesson completion events |
| Quizzes/assessments | High | Custom Lexical block types + evaluation logic |
| Certificates | Medium | Custom PDF generation |
| Subscription-gated access | Medium | Stripe plugin + custom access control hooks |
| Enrollment management | Medium | Custom collection + lifecycle hooks |
| Editorial workflow (5-state) | Medium | Custom status field + hook-based state machine (or pay for enterprise) |
| Streaming (video/audio) | Medium | Storage adapter + custom streaming endpoints |

#### Other Concerns
- **Figma acquisition uncertainty:** MIT license is locked in, but Figma's strategic direction (CMS for Figma Sites) may drift from "general-purpose app framework" over time.
- **Rapid release cadence:** 561 releases means frequent minor breaking changes. Requires active maintenance attention.
- **Documentation lag:** Docs sometimes lag behind rapid releases, especially post-3.0 replatform.
- **2.x → 3.x migration was painful:** Complete replatform from Express to Next.js. This history suggests major version upgrades carry risk.

### Licensing Assessment
**MIT — the gold standard.** No restrictions whatsoever on commercial use, modification, or distribution. No usage caps. No watermarks. Full IP protection. The only constraint is the enterprise features paywall, which is transparent and optional.

### Community Health
- GitHub stars: 41,400+
- Contributors: Active, 15,000+ commits
- Bus factor: **Low risk** — backed by Figma, multiple core maintainers, MIT license means community can fork if needed
- Plugin ecosystem: Growing but no marketplace (manual discovery via npm/GitHub)
- Release cadence: Weekly (v3.80.0 as of 2026-03-20)

### Implementation Complexity for PATHS
**High but well-scoped.** Would require:
- Define collections for: Courses, Lessons, Articles, ContentPillars, Enrollments, Progress, Tiers, Organizations
- Build LMS business logic as hooks (progress tracking, enrollment, quiz grading)
- Implement editorial workflow as custom state machine (or pay for enterprise)
- Integrate Stripe plugin + custom access control
- Set up multi-tenant plugin for B2B orgs
- Configure Lexical editor with custom blocks (media, quiz, code)
- Deploy on Vercel + Render (straightforward, matches current infra)
- Estimated effort: **3-5 months** for feature parity with current PATHS

### Verdict: STRONG CANDIDATE
Payload directly addresses all three pain points (Lexical editor, MIT license, healthy community). The trade-off is clear: you get a superior foundation and developer experience, but must build all LMS-specific logic yourself. The code-first TypeScript approach means this custom code is maintainable, testable, and fully under your control — unlike the LearnHouse soft-fork approach where you fought an upstream codebase.

---

## Platform 3: Directus

### Overview
An open-source data platform that wraps any SQL database with an instant REST + GraphQL API, admin panel, and automation system. "Database-first" approach — you own the schema completely, Directus layers on top. Built with Node.js/TypeScript, Vue.js admin panel (Data Studio).

### Strengths

#### Architecture
- **Database-first:** Wraps your PostgreSQL schema with instant APIs. You own the database directly — no ORM abstraction hiding the schema. Can introspect an existing database.
- **Instant REST + GraphQL:** Auto-generated from database schema with filtering, sorting, pagination, relationships. Real-time via WebSockets.
- **Built-in Flows:** Visual automation engine — handle webhooks, trigger actions, run custom logic. Could handle Stripe webhooks, enrollment logic, notification dispatch without writing backend code.
- **Granular RBAC (free):** Field-level permissions, role-based access, custom permission rules. Unlike Strapi, this is NOT paywalled.
- **Storage adapters:** S3, R2, local, Google Cloud — matches your Cloudflare R2 setup.

#### Developer Experience
- TypeScript extensions
- PostgreSQL (and MySQL, SQLite, MS SQL, Oracle, MariaDB, CockroachDB)
- Docker-friendly, lightweight single-process deployment
- 29,000+ GitHub stars, backed by Directus Inc. ($32M raised)

#### Licensing
**BSL 1.1** (Business Source License) transitioning to GPLv3 after 3 years. The BSL allows free use for everything EXCEPT offering Directus itself as a managed database-as-a-service. Building a SaaS product ON TOP of Directus is explicitly permitted. This is more permissive than AGPL and GPL for your use case.

### Weaknesses

#### Critical Issues
- **No content editor to speak of.** Directus has a basic WYSIWYG field (TinyMCE or a markdown editor). There is no Lexical, no TipTap, no block-based editor. For content-heavy authoring (your #1 pain point), Directus is the weakest of the three. You would need to build or integrate an editor yourself.
- **Not a CMS in the content-creation sense.** Directus is a data platform — excellent at managing structured data, poor at rich content authoring. The admin panel (Data Studio) is optimized for data management, not content creation workflows.
- **No LMS features.** Same gap as Payload — all LMS logic is custom. But without a strong editor foundation, you're starting further behind.

#### Other Concerns
- **BSL license complexity:** While SaaS use is permitted, the BSL is less universally understood than MIT. Legal review may be needed.
- **Vue.js admin panel:** If you want to customize the admin experience, you're writing Vue.js — a third framework alongside your React/Next.js frontend. (Payload's admin is React, which aligns better.)
- **Smaller community than Payload:** 29k stars vs 41k. Fewer resources, tutorials, and community plugins.
- **No official LMS plugins or templates.** Community is focused on data management, not educational use cases.
- **Flows have limitations:** Complex business logic (quiz grading, certificate generation, progress calculations) may outgrow the visual automation system and require custom extensions anyway.

### Licensing Assessment
BSL 1.1 is SaaS-friendly for your use case but adds complexity. The 3-year GPLv3 transition means code from 3 years ago becomes copyleft. The practical impact is minimal for a SaaS product, but it's less clean than MIT.

### Community Health
- GitHub stars: 29,000+
- Contributors: Active, backed by Directus Inc.
- Bus factor: **Low risk** — funded company, multiple maintainers
- Plugin ecosystem: Growing but smaller than Payload's

### Implementation Complexity for PATHS
**High, with an editor gap.** Would require:
- Everything Payload requires (LMS collections, business logic, billing)
- PLUS: build or integrate a block-based content editor (the platform doesn't provide one)
- Learn Vue.js for admin panel customization (or accept the default data-management UI)
- Build editorial workflow from scratch (no draft/publish system built in)
- Estimated effort: **4-7 months** for feature parity, more if editor integration proves complex

### Verdict: VIABLE BUT WEAKER
Directus excels at data management and has excellent built-in RBAC and Flows. However, it does not solve Pain Point #1 (editor quality) — in fact, it's worse than LearnHouse in this regard. For a platform where content creation UX is the top priority, Directus's lack of a serious editor is disqualifying unless you plan to build a completely custom frontend with its own editor (which negates much of Directus's value proposition).

---

## Head-to-Head Comparison

### Scoring Against PATHS Requirements

| Requirement | Moodle | Payload | Directus |
|------------|--------|---------|----------|
| **Premium content editor** | TinyMCE (basic WYSIWYG) | Lexical (modern blocks, JSON AST) | TinyMCE/basic (weakest) |
| **Articles + Courses** | Courses only (no articles) | Both (custom collections) | Both (custom collections) |
| **Editorial workflow** | None built-in | Draft/publish free; multi-step paid | None built-in |
| **Content taxonomy** | Categories only (flat) | Custom (easy) | Custom (easy) |
| **Content versioning** | None | Built-in (free) | None built-in |
| **Tiered access control** | Course-level only | Custom hooks (flexible) | Flows + custom logic |
| **B2B multi-tenancy** | Paid (Workplace only) | Free plugin | Custom (row-level) |
| **Stripe billing** | Basic plugin | Official plugin (free) | Custom + Flows |
| **JWT + cross-app SSO** | Plugins needed + external IdP | Built-in JWT | Custom extension |
| **API-first / headless** | RPC-style, major gaps | REST + GraphQL + Local API | REST + GraphQL + WebSocket |
| **Tech stack fit** | PHP (mismatch) | TypeScript/Next.js (perfect) | TypeScript/Node.js (good) |
| **Vercel + Render deploy** | Incompatible | First-class | Compatible |
| **License** | GPL v3 (copyleft for dist.) | MIT (unrestricted) | BSL 1.1 (SaaS OK) |
| **Community health** | Large but legacy | Strong, growing, Figma-backed | Good, funded |

### Scoring Against Pain Points

| Pain Point | Moodle | Payload | Directus |
|-----------|--------|---------|----------|
| **Editor quality** | Does NOT solve (TinyMCE) | SOLVES (Lexical, extensible blocks) | Does NOT solve (basic WYSIWYG) |
| **Licensing restrictions** | Partial (GPL OK for SaaS, but Workplace is paid for key features) | SOLVES (MIT, no restrictions) | Mostly solves (BSL permits SaaS) |
| **Bus factor / maturity** | SOLVES (20yr, institutional) | SOLVES (41k stars, Figma-backed) | SOLVES (29k stars, funded) |

### Cost Comparison

| Cost Item | Moodle | Payload | Directus |
|-----------|--------|---------|----------|
| Platform license | Free (or Workplace: undisclosed $$) | Free (MIT) | Free (BSL) |
| Enterprise features | Workplace pricing unknown | ~$500-2000/mo estimated (SSO + workflows) | N/A (RBAC free) |
| Hosting (equivalent to current) | $50-100/mo (LAMP + DB + storage) | $35-50/mo (same as current Vercel + Render) | $20-40/mo (Node + DB + storage) |
| Development effort to feature parity | 6-12 months | 3-5 months | 4-7 months |
| Ongoing maintenance | High (PHP, plugin breakage on upgrades) | Medium (TypeScript, frequent releases) | Medium (TypeScript, stable) |

### What You Keep vs. What You Rebuild

| Asset | Moodle | Payload | Directus |
|-------|--------|---------|----------|
| Infrastructure (Terraform, Vercel, Render, R2) | Rebuild from scratch | Keep ~80% | Keep ~70% |
| Content strategy (pillars, tiers, access model) | Redesign for Moodle model | Direct port as collections | Direct port as collections |
| Business logic (editorial workflow, access control) | Rewrite as PHP plugins | Rewrite as TS hooks | Rewrite as Flows + extensions |
| Frontend (Next.js pages, components) | Discard (PHP templates) | Adapt (same framework) | Build new (separate frontend) |
| Auth system (JWT, cross-domain SSO) | Replace with Moodle auth | Adapt (Payload JWT is compatible) | Build new (custom extension) |
| Stripe integration | Rebuild with Moodle payment API | Rebuild with Payload Stripe plugin | Rebuild with Flows + custom |
| Test suite (491 tests) | Discard (wrong language) | Adapt patterns (same concepts, TS) | Adapt patterns (same concepts, TS) |

---

## Recommendation

### Clear Winner: Payload CMS

Payload is the recommended platform for replacing LearnHouse. The rationale:

1. **It solves the #1 pain point.** Lexical is a modern, extensible block editor producing structured JSON — a generational upgrade from LearnHouse's TipTap issues and leagues ahead of Moodle's TinyMCE or Directus's basic WYSIWYG.

2. **MIT license eliminates all licensing concerns.** No usage caps, no watermarks, no copyleft, full IP protection. This is as clean as it gets.

3. **Healthy, funded community.** 41k+ stars, Figma backing, weekly releases, multiple maintainers. The bus factor risk that killed LearnHouse confidence does not exist here.

4. **Architectural alignment.** TypeScript + Next.js + PostgreSQL + Cloudflare R2 matches your existing stack. Your Terraform infrastructure, deployment pipeline, and team skills transfer directly.

5. **Code-first approach aligns with your development principles.** Everything in version control, fully typed, testable. No fighting an upstream soft fork — you own the entire application.

### The Trade-Off You're Making

Payload is a CMS/app framework, not a purpose-built LMS. You are trading:

- **LearnHouse's existing LMS features** (courses, activities, org management) that work but are limited and poorly maintained
- **For Payload's superior foundation** (editor, API, type safety, access control) on which you build LMS features yourself

This is the right trade because:
- The features you'd rebuild (course structure, progress, enrollment) are well-understood and can be modeled as Payload collections with hooks
- The features you couldn't fix in LearnHouse (editor quality, licensing) are solved at the platform level
- Custom code you write in Payload is yours, typed, tested, and maintainable — not a soft fork fighting upstream

### Enterprise Features Decision

Two paid Payload features are relevant:

1. **Publishing workflows:** Your 5-state editorial workflow (Draft → In Review → Approved → Published → Archived) can be implemented as a custom status field with hook-based state machine logic. This is well within your team's capability. **Skip the enterprise tier for this.**

2. **SSO:** Only needed if B2B clients require SAML/OIDC login. For initial launch, JWT + email/password is sufficient (same as current PATHS). If SSO becomes a requirement, evaluate enterprise pricing at that point or implement via NextAuth. **Defer this decision.**

### Migration Strategy (High-Level)

**Phase 1: Foundation (Weeks 1-4)**
- Set up Payload project with PostgreSQL + R2
- Define core collections: Users, Organizations, ContentPillars, Tiers
- Configure multi-tenant plugin
- Set up JWT auth with cookie domain scoping
- Deploy to Vercel + Render (reuse existing Terraform where possible)

**Phase 2: Content System (Weeks 5-8)**
- Build Article collection with versioning, editorial workflow hooks
- Build Course/Lesson/Module collections with structured content
- Configure Lexical editor with custom blocks (media, quiz, code)
- Implement content access control (tier-based gating)

**Phase 3: Business Logic (Weeks 9-12)**
- Integrate Stripe plugin + subscription management
- Build enrollment system with progress tracking
- Build org admin panel
- Implement cross-app SSO groundwork

**Phase 4: Frontend + Polish (Weeks 13-16)**
- Build public-facing pages (article browse, reader, course player)
- Build dashboard (content management, org admin)
- Migrate content from LearnHouse (if any exists)
- Testing, performance optimization, deployment

### What About Directus?

Directus is a strong platform for data-heavy applications, but it does not solve the #1 pain point (content editor quality). If your content creation needs were simpler (e.g., structured forms rather than rich content authoring), Directus would be competitive. For an LMS where the editor IS the product, Payload's Lexical integration is decisive.

### What About Moodle?

Moodle should not be considered further. It is architecturally incompatible (PHP monolith vs. your TypeScript/Next.js stack), does not solve the editor problem, locks B2B features behind a paid product, and would require rebuilding everything from scratch in an unfamiliar language and framework. The only scenario where Moodle makes sense is if you were building a traditional university LMS — which you are not.

---

## Appendix: Eliminated Platforms

| Platform | Reason for Elimination |
|----------|----------------------|
| **Canvas LMS** | AGPL license, Ruby/Rails stack, designed for universities, massive deployment complexity |
| **Open edX** | AGPL license, very high deployment complexity (MySQL + MongoDB + Elasticsearch + RabbitMQ), no article publishing, inconsistent APIs |
| **Strapi** | Enterprise license shift paywalls needed features (RBAC, review workflows). Lexical/editor story weaker than Payload |
| **LearnHouse** | Current platform being replaced (editor quality, licensing, bus factor) |
