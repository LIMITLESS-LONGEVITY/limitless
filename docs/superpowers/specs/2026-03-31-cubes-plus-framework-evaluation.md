# Cubes+ Framework Evaluation: Build vs. Rebuild on Open-Source

**Author:** System Architect  
**Date:** 2026-03-31  
**Status:** Draft — Pending Review

---

## 1. Cubes+ Product Requirements Summary

### What Cubes+ Is

Cubes+ is a **training routine builder and sharing platform** for longevity coaches. It is not a generic fitness tracker, not an LMS, and not a CMS. It is a **specialized collaborative authoring tool** where coaches compose training sessions from modular building blocks.

### The Core Innovation: The "Cubes System"

The defining feature is a **visual drag-and-drop composition system** with a three-tier hierarchy:

```
Cubes (atomic building blocks)
  └─► Routines (training sessions = ordered stack of cubes)
       └─► Super-Routines (programs = ordered stack of routines)
```

**How it works:**

1. **Cubes** are the smallest unit. A cube represents a training activity segment (e.g., "Dynamic Warm-Up," "Core Circuit," "Cooldown Stretch"). Each cube has a name, domain(s), category/phase, duration, exercise list, instructions, difficulty level, media attachments (images, videos, YouTube links), and creator notes. Cubes can nest other cubes (e.g., a warm-up cube containing two group-game cubes).

2. **Routines** are built by dragging cubes from a repository panel onto a builder canvas, stacking them vertically. The routine's total duration auto-calculates from its component cubes. Routines have their own metadata (name, domains, difficulty level from a predefined scale, instructions, notes).

3. **Super-Routines** are built by dragging routines onto the same canvas. When you stack two or more routines together, the system automatically treats it as a super-routine. Super-routines cannot themselves be stacked further.

The builder screen is divided into panels:
- **Left:** Super-Routines Repository
- **Center-left:** Builder Canvas (the drag-and-drop composition area)
- **Center-right:** Routines Repository
- **Right:** Cubes Repository

All panels support search, sort, and domain filtering.

### Key Features Beyond the Builder

| Feature | Description |
|---------|-------------|
| **4-tier role system** | Admin, Head Coach, Senior Coach, Junior Coach — granular permissions on CRUD for each entity type |
| **Active/Inactive status workflow** | All entities (domains, cubes, routines, super-routines) start as "inactive" drafts. Only active items can be used in composition. |
| **Cube creation permissions** | Junior coaches cannot create cubes by default — admins must explicitly grant this. |
| **Deletion guards** | Cubes used in routines cannot be deleted. Routines used in super-routines cannot be deleted. |
| **Change notifications** | When a cube that is used in routines gets modified, all users of those routines are notified. |
| **Soft delete + 7-day backup** | All entities have soft delete with 7-day retention. |
| **Duplication** | Any entity can be duplicated by another user (with mandatory title change). |
| **Domains** | Top-level taxonomy (Movement, Dance, Cardio, Strength, Mental Wellness, etc.). User-created. Multi-domain assignment. "All domains" flag. |
| **Categories/Phases** | Cube classification (Warm-up, Main Part, Cool-down, etc.). User-created. |
| **Difficulty Levels** | Predefined alphanumeric scale managed by Head Coaches/Admins. |
| **Ranking (Likes)** | Facebook-style like system on cubes, routines, and super-routines. |
| **Assignments** | Head coaches assign routines to coaches with accept/decline/complete workflow. |
| **Direct Messages** | In-platform 1:1 messaging between coaches with HTTP polling. |
| **Insights Dashboard** | Activity stats, trends (cubes/routines added over time), top creators. |
| **Media Attachments** | Cloudinary-hosted images and videos on cubes. YouTube link embedding. |
| **Google OAuth** | Social login with automatic account linking. |
| **Onboarding** | Structured profile collection (name, expertise domains, photo/avatar, contact info). |

### Future Scope (v2+)
- Client-facing routine delivery (coaches assign routines to end-clients)
- External (non-LIMITLESS) coach access
- PWA / offline mode
- Email notifications
- Native mobile apps

---

## 2. Core Domain Model

### Entity Relationship Summary

```
users ──┬── creates ──► domains (many)
        ├── creates ──► cubes (many)
        ├── creates ──► routines (many)
        ├── creates ──► super_routines (many)
        ├── likes ────► cubes | routines | super_routines (polymorphic)
        ├── assigns ──► assignments (to other users)
        └── messages ─► conversations ◄── messages

domains ◄──── cube_domains ────► cubes
domains ◄──── routine_domains ──► routines
domains ◄──── sr_domains ───────► super_routines

categories ◄── cubes (FK)

cubes ◄──── cube_nesting ──► cubes (self-referencing: parent/child with position)
cubes ◄──── routine_cubes ──► routines (with position)
routines ◄── sr_routines ──► super_routines (with position)

difficulty_levels ◄── routines (FK)
difficulty_levels ◄── super_routines (FK)

cubes ──► cube_media (1:many, images/videos)
cubes ──► cube_youtube_links (1:many)

notifications ──► users (FK)
```

### Key Data Characteristics

- **UUIDs everywhere** (not auto-increment integers)
- **Soft delete** on all core entities (`deleted_at` timestamp)
- **Position-ordered composition** — cubes within routines, routines within super-routines, nested cubes within parent cubes all have explicit `position` integer for ordering
- **Polymorphic likes and notifications** — `entity_type` + `entity_id` pattern
- **Calculated durations** — routine duration = sum of cube durations; super-routine duration = sum of routine durations

### User Workflows

1. **Admin sets up platform:** Creates domains, defines difficulty levels, manages user roles
2. **Senior Coach creates cubes:** Opens cube creation form, fills fields, attaches media, saves as inactive, reviews, activates
3. **Any coach builds routine:** Opens builder, drags cubes from repository to canvas, reorders via drag-and-drop, saves with metadata, activates
4. **Any coach builds super-routine:** Drags routines to canvas (or stacks a routine onto an existing routine in the canvas), saves
5. **Head Coach assigns routine:** Selects a routine, assigns to a junior/senior coach with due date and notes
6. **Coach receives assignment:** Sees notification, accepts or declines, completes with notes
7. **Coaches discover content:** Browse repositories, search, sort, filter by domain, view details, like, duplicate for modification

---

## 3. Framework Evaluation

### What the Framework Must Provide (or Support)

To be a viable foundation for Cubes+, a framework must cover:

| Requirement | Weight | Notes |
|-------------|--------|-------|
| **Custom drag-and-drop builder UI** | CRITICAL | The visual composition system is the product. No framework will provide this out of the box. This WILL be custom React code regardless. |
| **Relational data model with complex relationships** | HIGH | Many-to-many with position ordering, self-referencing nesting, polymorphic associations |
| **Role-based access control (4 tiers + per-field permissions)** | HIGH | Not just "admin/user" but granular per-entity-type CRUD |
| **REST or GraphQL API** | HIGH | Frontend needs a clean API |
| **Admin panel** | MEDIUM | For user management, domain/category/difficulty-level management |
| **Auth (JWT + OAuth)** | MEDIUM | Needs cookie-based SSO with LIMITLESS ecosystem |
| **File upload handling** | MEDIUM | Cloudinary integration |
| **Real-time or polling-based messaging** | LOW | DMs are a secondary feature, could be deferred |
| **TypeScript/Node.js ecosystem** | HIGH | Team expertise, ecosystem alignment |
| **Self-hostable on Render/Vercel** | HIGH | Must deploy where the rest of the stack lives |

### The Critical Insight

**The drag-and-drop visual builder is 60-70% of the product's complexity and value.** No backend framework, CMS, or low-code tool provides this. It will be custom React + dnd-kit code regardless of what backend is chosen. The framework evaluation is therefore about the **remaining 30-40%**: data modeling, API generation, auth, admin UI, and CRUD operations.

---

### 3.1 Headless CMS / Content Platforms

#### Strapi (Node.js Headless CMS)

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Cubes builder support | 1 | No visual builder. Would need 100% custom frontend. |
| Data model fit | 3 | Content types work for cubes/routines/domains. Many-to-many with ordering is awkward — Strapi's relations don't have position fields natively. Polymorphic likes require workaround. |
| Auth/RBAC | 3 | Has roles & permissions plugin, but the 4-tier coach hierarchy with per-field rules (can_create_cubes) would need heavy customization. Cookie-based SSO would need custom middleware. |
| Admin UI | 4 | Strong admin panel for content management. Coaches could use it for cube creation (with customization). |
| API generation | 5 | Auto-generates REST + GraphQL APIs from content types. |
| Ecosystem fit | 4 | Node.js, TypeScript support, npm packages. |
| Maturity/stability | 4 | Large community, well-funded, production-proven. v5 released. |
| Deployment | 4 | Self-hostable on Render easily. |
| Learning curve | 3 | Strapi-specific patterns differ from raw Express/Fastify. Plugin system has a learning curve. |
| **Overall** | **3.4** | |

**Verdict:** Strapi provides excellent API generation and an admin UI, but the data model constraints (no native ordered many-to-many, no self-referencing nesting) and the RBAC limitations mean significant customization. The admin panel would replace the need for a separate admin interface, but coaches would still use the custom builder UI for routine composition. **Moderate fit, moderate effort.**

#### Directus (Data Platform)

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Cubes builder support | 1 | No visual builder component. |
| Data model fit | 4 | Database-first approach. Wraps any Postgres schema with auto-generated APIs. Would work with the existing data model almost as-is. Position-ordered junction tables are natively supported. |
| Auth/RBAC | 4 | Granular role-based permissions per collection and per field. Could model the 4-tier system. Cookie-based auth via custom extensions. |
| Admin UI | 4 | Excellent data studio for managing content. Customizable layouts. |
| API generation | 5 | Auto-generates REST + GraphQL from schema. Real-time via WebSocket. |
| Ecosystem fit | 3 | Node.js/TypeScript, but uses its own extension system. Frontend is Vue-based (admin only — irrelevant since the coach UI is custom React). |
| Maturity/stability | 4 | Long history (started as PHP app, rewritten in Node.js). Active, well-funded. |
| Deployment | 4 | Docker-based. Self-hostable. |
| Learning curve | 3 | Extension system and Flow system have their own learning curve. |
| **Overall** | **3.6** | |

**Verdict:** Directus's database-first philosophy is appealing — it could wrap the existing Postgres schema and immediately provide APIs. The RBAC system is genuinely granular. However, custom business logic (deletion guards, change notifications, duration auto-calculation) would need to be implemented as Directus extensions or hooks. **Good fit for data layer, but custom logic still required.**

#### Keystone.js (Node.js CMS Framework)

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Cubes builder support | 1 | No visual builder. |
| Data model fit | 3 | Schema-driven with relationships, but ordered many-to-many and self-referencing nesting require custom fields. |
| Auth/RBAC | 3 | Built-in session auth. Access control functions per list and per field — flexible but verbose. |
| Admin UI | 3 | Auto-generated admin UI. Less polished than Strapi/Directus. |
| API generation | 4 | Auto-generated GraphQL API (no REST). |
| Ecosystem fit | 4 | Pure TypeScript/Node.js. Prisma-based DB layer. |
| Maturity/stability | 3 | Smaller community than Strapi. Development pace has slowed. Thinkmill stewardship. |
| Deployment | 4 | Standard Node.js deployment. |
| Learning curve | 3 | Schema-as-code is intuitive for developers. |
| **Overall** | **3.1** | |

**Verdict:** Keystone is a developer-friendly CMS framework, but its smaller community and GraphQL-only API are limitations. The team would be betting on a less popular project. **Acceptable but not compelling.**

---

### 3.2 Low-Code / App Builders

#### Refine (React Meta-Framework for CRUD Apps)

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Cubes builder support | 2 | Refine is about data-bound CRUD UIs. The visual builder would still be 100% custom, but Refine's component architecture could coexist with it. |
| Data model fit | 4 | Backend-agnostic — connects to any API (REST, GraphQL, Supabase, etc.). Doesn't constrain data model. |
| Auth/RBAC | 4 | Built-in auth provider abstraction. Access control at route and component level. |
| Admin UI | 5 | This is Refine's sweet spot — generates admin panels with tables, forms, filters, sorting. Uses Ant Design or Material UI. |
| API generation | 2 | Refine is frontend-only. You still need a backend API. |
| Ecosystem fit | 5 | React, TypeScript, hooks-based. Perfect alignment. |
| Maturity/stability | 4 | Growing rapidly, well-documented, active community, open-source with commercial backing. |
| Deployment | 5 | Standard React app. Deploy anywhere. |
| Learning curve | 4 | If you know React, Refine is easy to learn. |
| **Overall** | **3.9** | |

**Verdict:** Refine is compelling **as a frontend framework** for the admin/CRUD portions of Cubes+, but it is not a backend. You would pair it with a separate API. The visual builder would still be custom dnd-kit code, but the repositories, admin panels, user management, assignment tracking, and insights dashboard could all be built faster with Refine's data-binding patterns. **Strong frontend fit, but needs a backend strategy.**

#### Appsmith / Budibase / Retool

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Overall | 1-2 | These are internal tool builders. The drag-and-drop builder UX for coaches requires a consumer-grade UI, not an internal-tool widget library. The visual quality, animation, and UX polish needed are beyond what these tools produce. **Not suitable.** |

---

### 3.3 LMS / Training Platforms

#### Moodle / Canvas LMS / Open edX

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Overall | 1-2 | These are Learning Management Systems built around courses, quizzes, assignments, and student enrollment. Cubes+ is NOT an LMS — it's a **training plan authoring tool** for coaches, not a course delivery platform for students. The domain mismatch is fundamental. Moodle is PHP. Canvas is Ruby. Open edX is Python/Django. All would require fighting the framework's assumptions about what a "course" is. **Not suitable.** |

---

### 3.4 Workflow / Process Builders

#### n8n / Temporal

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Overall | 1 | These are workflow automation tools (n8n) and workflow orchestration engines (Temporal). They solve a completely different problem — connecting APIs, scheduling jobs, managing long-running processes. They have nothing to offer for a visual training plan builder. **Not suitable.** |

---

### 3.5 Full-Stack Frameworks with Admin

#### RedwoodJS (Full-Stack JS)

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Cubes builder support | 2 | No visual builder, but React-based frontend is dnd-kit compatible. |
| Data model fit | 4 | Prisma ORM. Can model the full schema. Ordered many-to-many via junction tables with position field. |
| Auth/RBAC | 4 | Built-in auth (dbAuth, OAuth providers). Role-based access with `@requireAuth` directives. |
| Admin UI | 2 | Scaffolding generates basic CRUD pages, but no rich admin panel. |
| API generation | 4 | GraphQL API auto-generated from SDL + services. |
| Ecosystem fit | 5 | React, TypeScript, Prisma, Node.js. Perfect stack alignment. |
| Maturity/stability | 3 | Active community but smaller than Next.js ecosystem. Some v8+ growing pains. |
| Deployment | 3 | Historically Netlify/Vercel-focused. Render support exists but less documented. |
| Learning curve | 3 | Redwood conventions (cells, services, SDL) are different from standard Next.js patterns. |
| **Overall** | **3.3** | |

**Verdict:** RedwoodJS offers good stack alignment and built-in auth, but its GraphQL-only API, opinionated structure, and smaller community make it a lateral move rather than an upgrade. The team would be learning Redwood conventions instead of FastAPI conventions — trading one learning curve for another. **Reasonable but not compelling enough to justify the migration.**

#### Blitz.js (Full-Stack JS)

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Overall | 2 | Blitz.js forked from Next.js and adds RPC-style data layer. However, the project has had leadership changes and uncertain governance. Using Blitz means betting on a project with less stability than Next.js itself. Prisma-based, TypeScript, React — stack alignment is good, but the risk is too high. **Too risky.** |

#### Django + Django Admin (Python)

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Data model fit | 5 | Django ORM handles complex relationships beautifully. Ordered M2M via through tables is first-class. |
| Admin UI | 5 | Django Admin is legendary. Custom admin actions, inline editing, filter sidebar — all built-in. |
| Auth/RBAC | 5 | Django auth + groups + permissions is the gold standard. |
| Ecosystem fit | 1 | **Python.** The team's primary expertise is TypeScript/Node.js/React. Maintaining a Python backend alongside three TypeScript services (PATHS, HUB, Digital Twin) is a significant operational burden. |
| **Overall** | **3.0** | |

**Verdict:** Django would be the best backend framework in isolation — its ORM, admin, and auth are unmatched for CRUD-heavy apps. But the **language mismatch is disqualifying** for this team. The existing Cubes+ backend is already in Python/FastAPI, and the integration plan calls for migrating auth to the LIMITLESS cookie-based SSO (which is all TypeScript). Adding Django means maintaining Python expertise indefinitely, diverging further from the rest of the stack. **Not recommended despite technical excellence.**

#### Rails + Active Admin (Ruby) / Laravel + Filament (PHP)

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Overall | 1-2 | Same language mismatch problem as Django, but worse — at least Python/FastAPI is already in use. Ruby and PHP would introduce a third and fourth language to the ecosystem. **Not suitable.** |

---

### 3.6 Specialized Fitness/Training Tools

#### wger (Open-Source Workout Manager)

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Domain fit | 2 | wger manages exercises, workouts, and body measurements. It has an exercise database and workout plan builder. However, it is individual-focused (user tracks their own workouts), not collaborative (coaches building plans for a shared library). No concept of cubes, composition hierarchy, or role-based collaborative authoring. |
| Stack | 1 | Django (Python). See Django concerns above. |
| **Overall** | **1.5** | |

**Verdict:** The closest domain match in open-source, but the collaborative authoring model and three-tier composition hierarchy are entirely absent. You would be gutting the application to rebuild the core concept. **Not suitable.**

#### OpenWorkout, Wrkout, FitTrackee

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Overall | 1 | All are individual workout trackers, not collaborative training plan builders. Wrong domain. Various stacks (Java, Python). **Not suitable.** |

---

## 4. Framework Evaluation Matrix

| Framework | Builder UI | Data Model | Auth/RBAC | Admin UI | API | Stack Fit | Maturity | Deploy | Learn Curve | **Avg** |
|-----------|-----------|------------|-----------|----------|-----|-----------|----------|--------|-------------|---------|
| **Refine** | 2 | 4 | 4 | 5 | 2* | 5 | 4 | 5 | 4 | **3.9** |
| **Directus** | 1 | 4 | 4 | 4 | 5 | 3 | 4 | 4 | 3 | **3.6** |
| **Strapi** | 1 | 3 | 3 | 4 | 5 | 4 | 4 | 4 | 3 | **3.4** |
| **RedwoodJS** | 2 | 4 | 4 | 2 | 4 | 5 | 3 | 3 | 3 | **3.3** |
| **Keystone** | 1 | 3 | 3 | 3 | 4 | 4 | 3 | 4 | 3 | **3.1** |
| **Django** | 1 | 5 | 5 | 5 | 4 | 1 | 5 | 4 | 2 | **3.0** |

*Refine's API score is low because it is frontend-only — it needs a backend.

---

## 5. Top 3 Recommendations

### Recommendation #1: Next.js + Prisma + Refine (Admin) + Custom Builder

**Score: Highest practical value for this team**

This is not a single framework — it is an **architecture pattern** that leverages the team's existing expertise while dramatically reducing boilerplate.

**The approach:**
- **Next.js App Router** as the full-stack framework (already used by PATHS, HUB, and OS Dashboard)
- **Prisma ORM** for the data model (already used by HUB)
- **Next.js API Routes** or a dedicated API layer for the backend
- **Refine** for admin pages, repository browsers, user management, assignment tracking, insights
- **Custom dnd-kit builder** (preserved from current codebase — this code is solid and battle-tested with 101+ E2E tests)
- **Payload CMS shared auth** via cookie-based SSO (already designed in the integration plan)

**What you keep from the current Cubes+:**
- The entire builder canvas (`builder-canvas.tsx`, `repository-panel.tsx`, `detail-drawer.tsx`, `save-dialog.tsx`)
- The data model schema (translated from SQLAlchemy to Prisma)
- The dnd-kit drag-and-drop logic
- The Cypress E2E test suite (adapted for new routes)
- The Cloudinary integration patterns

**What you gain:**
- Elimination of the Python/FastAPI backend entirely — one language (TypeScript) for the whole LIMITLESS platform
- Prisma's type-safe queries replace hand-written SQLAlchemy async sessions
- Refine provides instant admin panel, data tables, forms, filters, and CRUD scaffolding
- Next.js server actions or API routes replace FastAPI routers
- Cookie-based SSO via shared `payload-token` (no more localStorage JWT)
- Shared deployment pipeline and tooling with PATHS and HUB

**What you still build custom:**
- The visual builder (already built — port it)
- Business logic: deletion guards, change notifications, duration auto-calculation
- The messaging system (or replace with a third-party chat widget)

**Effort estimate:** 4-6 weeks for a senior developer.

### Recommendation #2: Directus as Backend + Custom Next.js Frontend

**Score: Best if you want maximum API generation with minimal backend code**

**The approach:**
- **Directus** wraps the PostgreSQL database and auto-generates REST + GraphQL APIs
- **Custom Next.js frontend** for the builder UI
- Directus Flows for business logic (deletion guards, notifications)
- Directus roles & permissions for the 4-tier RBAC

**Advantages:**
- Near-zero backend code for CRUD operations
- Admin panel is production-ready on day one
- Real-time WebSocket support built-in
- Could potentially reuse the existing Postgres database (Directus wraps existing schemas)

**Disadvantages:**
- Directus extensions are written in JavaScript/TypeScript but use Directus-specific APIs
- Custom business logic (deletion guards, calculated durations, change notifications) must be Directus hooks or Flows — a constrained environment
- Cookie-based SSO requires a custom Directus auth extension
- Another service to deploy, monitor, and maintain (Directus itself)
- Vendor lock-in on Directus's abstractions — harder to debug than raw SQL/Prisma

**Effort estimate:** 3-5 weeks, but higher ongoing maintenance complexity.

### Recommendation #3: Strapi as Backend + Custom Next.js Frontend

**Score: Similar to Directus but with stronger Node.js/TypeScript integration**

**The approach:**
- **Strapi v5** manages content types (cubes, routines, super-routines, domains)
- Custom plugins for business logic
- **Custom Next.js frontend** for the builder UI

**Advantages:**
- Largest community among headless CMS options
- Plugin ecosystem for common needs
- REST + GraphQL out of the box
- Good TypeScript support in v5

**Disadvantages:**
- Content type relations don't natively support ordered many-to-many (position field)
- Self-referencing cube nesting is awkward in Strapi's relation model
- The 4-tier RBAC requires heavy customization of the roles plugin
- Strapi's opinionated structure (content types, components, dynamic zones) doesn't map cleanly to the Cubes+ domain

**Effort estimate:** 4-6 weeks, with ongoing friction from Strapi's content-oriented assumptions.

---

## 6. Architecture Sketch: Recommendation #1 (Next.js + Prisma + Refine)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        cubes.limitless-longevity.health              │
│                        Next.js App Router (Vercel)                   │
│                                                                      │
│  ┌───────────────────────┐  ┌──────────────────────────────────┐   │
│  │   Public Pages        │  │   Authenticated App               │   │
│  │                       │  │                                    │   │
│  │  / (Landing)          │  │  /builder (Visual Builder)         │   │
│  │  /login → redirect    │  │    └─ dnd-kit + custom React      │   │
│  │    to PATHS login     │  │    └─ Repository panels            │   │
│  │                       │  │    └─ Canvas + Save dialogs        │   │
│  └───────────────────────┘  │                                    │   │
│                              │  /admin/* (Refine-powered)         │   │
│                              │    └─ User management              │   │
│                              │    └─ Domain/Category/Level CRUD   │   │
│                              │    └─ Assignment management        │   │
│                              │    └─ Platform insights            │   │
│                              │                                    │   │
│                              │  /cubes/[id] (Detail view)         │   │
│                              │  /routines/[id] (Detail view)      │   │
│                              │  /profile (User settings)          │   │
│                              │  /messages (DMs)                   │   │
│                              └──────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │   API Layer (Next.js API Routes or Server Actions)           │   │
│  │                                                              │   │
│  │   /api/cubes/*       → CubeService → Prisma                 │   │
│  │   /api/routines/*    → RoutineService → Prisma               │   │
│  │   /api/super-routines/* → SuperRoutineService → Prisma       │   │
│  │   /api/domains/*     → DomainService → Prisma                │   │
│  │   /api/users/*       → UserService → Prisma                  │   │
│  │   /api/assignments/* → AssignmentService → Prisma            │   │
│  │   /api/messages/*    → MessageService → Prisma               │   │
│  │   /api/insights/*    → InsightsService → Prisma              │   │
│  │   /api/media/*       → Cloudinary SDK                        │   │
│  │                                                              │   │
│  │   Auth Middleware: reads `payload-token` cookie,              │   │
│  │   validates JWT with PAYLOAD_SECRET                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │   Data Layer (Prisma ORM → PostgreSQL)                       │   │
│  │                                                              │   │
│  │   Models: User, Domain, Category, DifficultyLevel,           │   │
│  │           Cube, CubeNesting, CubeMedia, CubeYouTubeLink,    │   │
│  │           Routine, RoutineCube, SuperRoutine,                 │   │
│  │           SuperRoutineRoutine, Like, Notification,            │   │
│  │           Assignment, Conversation, Message                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

External Dependencies:
  ├── PostgreSQL (Render managed) — same as current
  ├── Cloudinary — media CDN (same as current)
  ├── PATHS (Payload CMS) — auth authority (payload-token cookie)
  └── API Gateway (Cloudflare Worker) — routes /cubes → this app
```

### Prisma Schema (Key Excerpts)

```prisma
model Cube {
  id              String       @id @default(uuid())
  name            String       @db.VarChar(255)
  categoryId      String?      @map("category_id")
  durationMinutes Int          @map("duration_minutes")
  exerciseList    String?      @map("exercise_list")
  instructions    String?
  difficultyLevel Int?         @map("difficulty_level")
  creatorNotes    String?      @map("creator_notes")
  allDomains      Boolean      @default(false) @map("all_domains")
  status          ItemStatus   @default(inactive)
  createdBy       String       @map("created_by")
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")
  deletedAt       DateTime?    @map("deleted_at")

  creator         User         @relation(fields: [createdBy], references: [id])
  category        Category?    @relation(fields: [categoryId], references: [id])
  domains         CubeDomain[]
  parentOf        CubeNesting[] @relation("ParentCube")
  childOf         CubeNesting[] @relation("ChildCube")
  media           CubeMedia[]
  youtubeLinks    CubeYouTubeLink[]
  routineCubes    RoutineCube[]

  @@index([status, deletedAt])
  @@index([createdBy])
  @@map("cubes")
}

model CubeNesting {
  parentCubeId String @map("parent_cube_id")
  childCubeId  String @map("child_cube_id")
  position     Int

  parent Cube @relation("ParentCube", fields: [parentCubeId], references: [id])
  child  Cube @relation("ChildCube", fields: [childCubeId], references: [id])

  @@id([parentCubeId, childCubeId])
  @@map("cube_nesting")
}

model RoutineCube {
  routineId String @map("routine_id")
  cubeId    String @map("cube_id")
  position  Int

  routine Routine @relation(fields: [routineId], references: [id])
  cube    Cube    @relation(fields: [cubeId], references: [id])

  @@id([routineId, cubeId, position])
  @@map("routine_cubes")
}
```

### Migration Path

| Phase | Action | Duration |
|-------|--------|----------|
| 1 | Create Next.js project with Prisma schema (translate from SQLAlchemy models) | 2-3 days |
| 2 | Port the builder components (dnd-kit canvas, repository panels, save dialog) from current frontend | 3-5 days |
| 3 | Implement API routes with business logic (deletion guards, notifications, duration calc) | 5-7 days |
| 4 | Build admin pages with Refine (user management, domain/category CRUD, assignments, insights) | 3-5 days |
| 5 | Auth integration (cookie-based SSO with PATHS) | 2-3 days |
| 6 | Data migration script (existing Postgres → new Prisma-managed Postgres) | 1-2 days |
| 7 | Cypress test adaptation and new test coverage | 3-5 days |
| **Total** | | **~4-6 weeks** |

---

## 7. Comparison: Framework vs. From-Scratch

### What Using a Framework Buys You

| Benefit | Details |
|---------|---------|
| **Unified language** | Eliminating Python/FastAPI means the entire LIMITLESS platform is TypeScript. One language for hiring, debugging, code review, shared utilities, and deployment. |
| **Stack alignment** | Next.js + Prisma is the same stack as HUB. Shared patterns, shared knowledge, shared tooling. |
| **Admin UI acceleration** | Refine eliminates weeks of admin panel development. Data tables, forms, filters, pagination — all generated from data providers. |
| **Type safety end-to-end** | Prisma generates TypeScript types from the schema. These flow to API routes, to the frontend, to Refine components. No more Pydantic/TypeScript type duplication. |
| **Auth simplification** | Cookie-based SSO is native to Next.js middleware. No dual-auth (localStorage + cookie) transition needed. |
| **Deployment simplification** | One fewer deployment target (no separate Python backend on Render). Frontend + API in one Vercel deployment. |
| **Future-proofing** | When LIMITLESS eventually extracts a standalone auth service, all apps are already on the same stack and auth pattern. |

### What You Lose

| Cost | Details |
|------|---------|
| **Sunk investment in FastAPI backend** | 12 sprints of Python backend code — services, repositories, migrations, tests. This code is discarded. |
| **Migration effort** | 4-6 weeks of rebuilding is not free. This is time not spent on new features. |
| **Risk of regression** | Even with careful porting, some business logic edge cases may be missed. The 101 Cypress tests mitigate but don't eliminate this risk. |
| **FastAPI's async performance** | FastAPI is genuinely fast for I/O-bound workloads. Next.js API routes are slightly less optimized for pure API serving. For Cubes+ scale (dozens of coaches, not thousands), this is irrelevant. |

### The Decisive Factor

The current Cubes+ has a **split-brain architecture** — TypeScript frontend, Python backend. This creates:
- Two dependency trees to maintain
- Two languages to context-switch between
- Two deployment pipelines
- Incompatible type systems (Pydantic vs. TypeScript interfaces)
- Separate auth systems that must be bridged

Every other LIMITLESS service (PATHS, HUB, Digital Twin, OS Dashboard) is TypeScript/Node.js. Cubes+ is the outlier. Consolidating to TypeScript is not just a technical preference — it is an operational necessity as the platform scales.

---

## 8. Integration with LIMITLESS

### How Cubes+ Fits the Platform

```
                    app.limitless-longevity.health
                    (Cloudflare Worker — API Gateway)
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         /learn          /book          /cubes (NEW)
              │               │               │
         PATHS (Payload)  HUB (Next.js)  Cubes+ (Next.js)
              │               │               │
              └───────── shared cookie ───────┘
                    (.limitless-longevity.health)
                              │
                    payload-token JWT
                    validated by PAYLOAD_SECRET
```

### Auth Flow (Cookie-Based SSO)

1. User visits `app.limitless-longevity.health/cubes`
2. API Gateway proxies to Cubes+ Next.js app
3. Next.js middleware reads `payload-token` cookie
4. If missing: redirect to PATHS login (`/learn/login?redirect=/cubes`)
5. If present: validate JWT with shared `PAYLOAD_SECRET`
6. On first visit: look up user in Cubes+ database by email, create if needed (sync from PATHS profile)
7. Subsequent visits: local user lookup, no PATHS API call needed

### Digital Twin Integration (Future)

When Cubes+ evolves to assign routines to clients (v2 scope), it will read client health context from the Digital Twin API:

```
Cubes+ → GET /api/twin/:clientId/context → Digital Twin
```

This enables coaches to see a client's health profile, biomarkers, and wearable data when designing routines — ensuring training plans are personalized to the client's physiological state.

### OS Dashboard Integration

The OS Dashboard at `app.limitless-longevity.health/` can display Cubes+ widgets:
- "Recent routines" card
- "Assigned to you" notifications
- "Platform activity" feed

These would be fetched from the Cubes+ API via the gateway.

---

## 9. Final Recommendation

**Rebuild Cubes+ as a Next.js + Prisma application with Refine for admin UI, porting the existing dnd-kit builder code from the current frontend.**

Reasons:

1. **Stack unification is the #1 priority.** The Python backend is the root cause of integration friction. Eliminating it aligns Cubes+ with every other LIMITLESS service.

2. **The builder UI is the hard part, and it is already built.** The 16,000+ lines of React/dnd-kit code in the builder components are well-structured and can be ported directly. The "rebuild" is really a backend rewrite + frontend migration, not a ground-up rebuild.

3. **Prisma + Next.js is a proven pattern.** HUB already uses this exact stack. Shared patterns, shared knowledge.

4. **Refine accelerates the admin and CRUD work.** The non-builder screens (admin panel, repository browsers, user management, assignments, insights) are standard CRUD — exactly what Refine is designed for.

5. **No framework perfectly fits the visual builder requirement.** This was the key finding: no CMS, LMS, low-code tool, or full-stack framework provides a drag-and-drop training plan composition system. This will always be custom code. The framework decision is about the remaining 30-40% — and for that, Next.js + Prisma + Refine is the best fit for this team.

6. **Cookie-based SSO becomes trivial.** The entire 6-phase integration plan simplifies to "use the same auth pattern as HUB."

**The alternative — keeping the Python backend — means permanently maintaining a split-brain architecture in a team whose core competency is TypeScript. Every month of delay makes the migration harder as more Python code accumulates.**
