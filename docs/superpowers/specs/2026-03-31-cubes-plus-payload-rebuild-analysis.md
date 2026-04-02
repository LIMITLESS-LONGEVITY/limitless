# Cubes+ Rebuild Analysis: Payload CMS 3.x Fit Assessment

**Author:** Architecture Review  
**Date:** 2026-03-31  
**Status:** Draft -- Pending Owner Review

---

## 1. Cubes+ Product Requirements Summary

Cubes+ is a **training routine builder and knowledge-sharing platform** for longevity coaches. It is NOT a content management system or learning platform -- it is a **visual composition tool** where coaches assemble training sessions from modular building blocks.

### Core Value Proposition
Three capabilities that no single competitor offers together:
1. **The "Cubes" visual UX system** -- drag-and-drop composition of training routines from atomic building blocks
2. **Online availability** -- accessible to LIMITLESS coaches worldwide
3. **Seamless LIMITLESS ecosystem integration** -- shared auth, navigation, and data with PATHS, HUB, and Digital Twin

### Target Users
- **Phase 1:** LIMITLESS internal coaches (4 role tiers)
- **Phase 2:** External coaches worldwide (SaaS model)

### Feature Inventory (Built in Phase 1 + 2)

| Feature | Status |
|---------|--------|
| 4 user roles with granular permissions | Complete |
| Core CRUD: Domains, Cubes, Routines, Super-Routines | Complete |
| Drag-and-drop visual builder | Complete |
| Cube nesting (cubes within cubes) | Complete |
| Search, filter, sort across all repositories | Complete |
| User onboarding and profiles | Complete |
| Cloudinary media attachments (image, video, YouTube) | Complete |
| Insights dashboard | Complete |
| Soft-delete with 7-day retention | Complete |
| Like/ranking system | Complete |
| Routine assignment workflow (assign/accept/decline/complete) | Complete |
| In-platform chat and direct messages | Complete |
| Google OAuth sign-in | Complete |
| Expandable routines in builder with nested editing | Complete |

### Future Scope (Not Yet Built)
- LIMITLESS platform integration (auth bridge, shared nav)
- External coach access (multi-tenancy for non-LIMITLESS coaches)
- Native mobile apps
- Email notifications
- PWA/offline mode

---

## 2. Core Domain Model

### Entities and Relationships

```
Domain (taxonomy)
  |
  |-- many-to-many ---> Cube (atomic building block)
  |                        |-- self-referencing nesting (cube_nesting)
  |                        |-- has media (images, video, YouTube)
  |                        |-- belongs to Category (warm-up, main part, cool-down...)
  |                        |-- has numeric difficulty_level
  |
  |-- many-to-many ---> Routine (composed of Cubes)
  |                        |-- ordered Cubes via position column
  |                        |-- has alphanumeric DifficultyLevel (lookup table)
  |
  |-- many-to-many ---> Super-Routine (composed of Routines)
                           |-- ordered Routines via position column
                           |-- has alphanumeric DifficultyLevel (lookup table)

User (4 roles: admin, head_coach, senior_coach, junior_coach)
  |-- creates Cubes, Routines, Super-Routines, Domains
  |-- can_create_cubes flag (for junior_coach override)
  |-- assigns Routines/Super-Routines to other coaches
  |-- sends/receives direct messages
  |-- likes entities

Supporting:
  - Category: warm-up, main part, cool-down (auto-created on type)
  - DifficultyLevel: alphanumeric labels managed by Head Coach/Admin
  - Notification: entity-change notifications
  - Assignment: routine/super-routine assignment with workflow
  - Conversation/Message: direct messaging between coaches
  - Like: polymorphic likes on cubes/routines/super-routines
```

### Key Domain Rules
1. Cubes must belong to at least one Domain (or "all-domains")
2. Only active cubes can be added to routines; only active routines to super-routines
3. Super-routines cannot be stacked (no meta-super-routines)
4. Deleting a cube used in a routine is blocked; deleting a routine used in a super-routine is blocked
5. Duration is calculated: routine duration = sum of cube durations; super-routine duration = sum of routine durations
6. Cube creation restricted by role: admin/head_coach/senior_coach by default, junior_coach only with explicit permission
7. Editing a used cube/routine triggers notifications to all downstream users
8. Two difficulty systems: numeric for cubes, alphanumeric lookup for routines/super-routines

---

## 3. The "Cubes" Visual System

### Conceptual Design
The main screen is divided into **four panels** (left to right):
1. **Super-Routine Repository** -- browse/search/filter existing super-routines
2. **Builder Canvas** (left half of center) -- the Tetris-like composition area where cubes and routines are stacked vertically via drag-and-drop
3. **Routine Repository** (right half of center) -- browse/search/filter existing routines
4. **Cube Repository** -- browse/search/filter existing cubes

### How It Works
1. Coach browses the **Cube Repository** panel on the right, searching/filtering by domain, category, difficulty, status
2. Coach **drags** a cube card from the repository onto the **Builder Canvas**
3. Cubes stack vertically in the canvas -- the order matters (it represents the training session flow: warm-up at top, cool-down at bottom)
4. Cubes can be **reordered** within the canvas via drag-and-drop (dnd-kit sortable)
5. When the coach has assembled the cubes, they click **Save** -- the system prompts for routine metadata (name, domain, difficulty level, instructions) and creates a Routine
6. To build a **Super-Routine**, the coach drags existing **Routines** from the Routine Repository onto the canvas. When 2+ routines are stacked, the builder automatically switches to "Super-Routine" mode
7. In Super-Routine mode, each routine on the canvas is **expandable** -- the coach can see and edit (add/remove/reorder) the individual cubes within each routine directly in the builder

### What Makes It Unique
- **Three-tier composition hierarchy:** Cube -> Routine -> Super-Routine (not just a flat exercise list)
- **Shared library:** Every coach contributes to a communal cube/routine repository; knowledge compounds over time
- **Cube nesting:** Cubes can contain other cubes (e.g., a "warm-up" cube nests a "group game" cube), enabling composable building blocks
- **Modal free-flow:** The same canvas handles both routine and super-routine creation with automatic mode detection
- **Non-destructive references:** Modifying a cube propagates awareness (notifications) to all routines using it, but does not break existing compositions

### Technical Implementation (Current)
- **dnd-kit** library (@dnd-kit/core, @dnd-kit/sortable) for drag-and-drop
- **Vertical list sorting strategy** for stack ordering
- Each builder item carries `uniqueKey`, `id`, `name`, `duration_minutes`, `type` (cube|routine)
- Routine containers in super-routine mode support nested SortableContext for cube reordering within routines
- Inline cube picker popover for adding cubes to routines without leaving the builder
- Duration counter auto-calculates from component cubes

---

## 4. Payload CMS 3.x Fit Analysis

### What Payload Handles Well (Direct Mapping)

| Cubes+ Need | Payload Feature | Fit Quality |
|-------------|-----------------|-------------|
| **User management** (4 roles, profiles, onboarding) | Auth collection + role field + access control | Excellent -- Payload's auth is already proven in PATHS |
| **Domain CRUD** | Simple collection with name, status, creator | Excellent -- trivial Payload collection |
| **Category CRUD** | Simple collection with auto-create | Excellent -- trivial Payload collection |
| **DifficultyLevel CRUD** | Simple collection with label + sort_order | Excellent -- trivial Payload collection |
| **Cube CRUD** (form-based creation/editing) | Collection with text, number, select, relationship, upload fields | Excellent -- this is what Payload is built for |
| **Routine CRUD** (metadata) | Collection with relationships to cubes (ordered) | Good -- Payload relationships work, ordering needs array field |
| **Super-Routine CRUD** (metadata) | Collection with relationships to routines (ordered) | Good -- same as routines |
| **Media uploads** | Payload Upload collection (already have Media in PATHS) | Excellent -- built-in, proven |
| **Search and filtering** | Payload REST API query operators + full-text search | Good -- may need custom indexes for performance |
| **Access control** (role-based, creator-scoped) | Payload access functions (already patterned in PATHS) | Excellent -- team has deep expertise here |
| **Soft deletes** | Not built-in, but achievable via hooks + hidden field | Moderate -- needs custom implementation |
| **Notifications** | Collection + hooks (afterChange triggers) | Good -- straightforward with Payload hooks |
| **Likes** | Polymorphic collection + custom endpoint | Moderate -- Payload doesn't have native polymorphic relations |
| **REST + GraphQL API** | Auto-generated from collections | Excellent -- free |
| **Localization** | Built-in, already configured for PATHS | Excellent -- if needed for Phase 2 external coaches |
| **Versioning/drafts** | Built-in | Excellent -- useful for cube/routine drafting workflow |
| **Auth integration** | Cookie-domain scoping already solved in PATHS | Excellent -- zero additional work |

### What Payload Cannot Handle (Custom Build Required)

| Cubes+ Need | Why Payload Falls Short | Custom Effort |
|-------------|------------------------|---------------|
| **Drag-and-drop builder canvas** | This is a bespoke interactive UI, not a form. Payload's admin is form-oriented. | HIGH -- must be a fully custom React component |
| **Multi-panel repository browsing** | The 4-panel layout (super-routines / builder / routines / cubes) is not a standard admin view | HIGH -- custom admin view or standalone page |
| **Real-time canvas composition** | Dragging items between panels, live duration calculation, mode auto-detection | HIGH -- dnd-kit integration in custom component |
| **Cube nesting** (self-referencing) | Payload relationships don't natively support ordered self-referencing many-to-many with position | MODERATE -- custom field or array-of-blocks pattern |
| **Ordered composition** (cubes in routines) | Payload's relationship field doesn't preserve order with duplicates. Need `{cube_id, position}` tuples | MODERATE -- use Payload array field with relationship sub-fields |
| **Assignment workflow** | Accept/decline/complete state machine with due dates | MODERATE -- collection + custom endpoints + hooks |
| **Chat/DM system** | HTTP polling, conversation threads, unread tracking | HIGH -- not a CMS concern at all |
| **Insights dashboard** | Aggregation queries (counts, trends, top creators) | MODERATE -- custom endpoints with raw SQL or Drizzle queries |
| **Like counts with polymorphic references** | Cross-entity like tracking with counts | MODERATE -- custom collection + computed fields |

### What Requires Architectural Decision

| Question | Analysis |
|----------|----------|
| **Same Payload instance as PATHS or separate?** | **Separate.** PATHS has 22 collections serving a fundamentally different domain (educational content). Mixing coach-training-builder collections with LMS collections creates a muddled admin experience and couples deployment lifecycles. Separate instance, same auth via shared cookie domain. |
| **Payload admin UI as the coach-facing UI?** | **No.** The Payload admin panel is a CRUD form interface. The core Cubes+ experience is a multi-panel drag-and-drop builder -- this cannot be adequately represented as Payload admin forms. The admin panel would serve as a **back-office** for admins to manage domains, categories, difficulty levels, and user permissions. Coaches should use a **custom Next.js frontend**. |
| **Could the builder be a custom Payload admin view?** | **Technically possible but inadvisable.** Payload allows custom admin views (React components rendered at custom routes within the admin panel). However: (a) the builder needs dnd-kit and heavy client-side state that doesn't benefit from Payload's form infrastructure, (b) it would be locked into the admin panel's layout/navigation, (c) it complicates the admin experience for actual admin tasks. Better to keep it as a standalone Next.js page. |
| **Payload as backend-only with custom frontend?** | **Best approach.** Use Payload for data modeling, API generation, auth, access control, hooks, and admin back-office. Build the coach-facing builder UI as standard Next.js pages that consume Payload's REST/GraphQL APIs. This is exactly how PATHS works (Payload generates the API, custom Next.js pages render the frontend). |

---

## 5. Proposed Architecture

### Deployment Topology

```
cubes.limitless-longevity.health
         |
         v
    [Next.js 15 App]
    ├── /            -> Coach-facing builder UI (custom React + dnd-kit)
    ├── /insights    -> Analytics dashboard
    ├── /messages    -> Chat/DMs
    ├── /assignments -> Assignment management
    ├── /profile     -> Coach profile
    ├── /admin       -> Payload admin panel (admin/head_coach only)
    ├── /api         -> Payload-generated REST API
    └── /api/graphql -> Payload-generated GraphQL API

    [PostgreSQL] -- Payload manages schema via Drizzle migrations
    [Cloudinary] -- Media uploads (Payload Upload collection)
```

### Payload Collections

```
Core Domain:
  - users          (extends Payload auth, adds role/expertise/avatar)
  - domains        (name, status, creator_notes, created_by)
  - categories     (name -- auto-created)
  - difficulty-levels (label, sort_order, created_by)
  - cubes          (name, category, duration, exercise_list, instructions,
                    difficulty_level, creator_notes, status, created_by,
                    all_domains flag, nested_cubes via array field)
  - routines       (name, duration_minutes, instructions, difficulty_level,
                    creator_notes, status, created_by, all_domains,
                    cubes via ordered array field [{cube: relationship, position}])
  - super-routines (name, duration_minutes, instructions, difficulty_level,
                    creator_notes, status, created_by, all_domains,
                    routines via ordered array field [{routine: relationship, position}])

Relationships:
  - cube-domains        (handled by Payload relationship field, hasMany)
  - routine-domains     (same)
  - super-routine-domains (same)

Media:
  - media               (Payload Upload collection -- images/video)
  - cube-youtube-links  (collection or array sub-field on cubes)

Social:
  - likes               (user_id, entity_type, entity_id)
  - notifications       (user_id, message, entity_type, entity_id, is_read)

Workflow:
  - assignments         (entity_type, entity_id, assigned_by, assigned_to,
                         status, due_date, notes, completion_notes)

Messaging:
  - conversations       (is_group, title)
  - messages            (conversation, sender, content)
```

### Ordered Composition: The Key Modeling Challenge

The trickiest part of the Payload mapping is **ordered composition with duplicate support**. In the current system:
- A routine contains cubes at specific positions: `{routine_id, cube_id, position}`
- The same cube can appear at multiple positions (e.g., the same warm-up cube at position 1 and position 5)

**Payload solution: Array fields with relationship sub-fields.**

```typescript
// In the Routines collection:
{
  name: 'cubes',
  type: 'array',
  fields: [
    {
      name: 'cube',
      type: 'relationship',
      relationTo: 'cubes',
      required: true,
    },
    // position is implicit (array index = position)
  ],
}
```

This naturally preserves order (array index = position) and allows duplicates (the same cube ID can appear multiple times in the array). Payload stores array fields as JSONB or as a sub-table -- either way, the ordered-with-duplicates requirement is satisfied.

**Cube nesting** works the same way -- an array field on the Cubes collection where each entry is a relationship to another cube.

### Coach-Facing Builder (Custom Next.js Pages)

The builder UI would be **entirely custom React code** that lives in the Next.js app alongside Payload. It would:

1. Fetch data from Payload's REST API (`/api/cubes?where[status][equals]=active&sort=name`)
2. Use dnd-kit for drag-and-drop (same library currently used)
3. Use React Query for server state management (same as current)
4. POST/PATCH to Payload API to save routines/super-routines
5. Use Payload's auth context for the current user (role checks, permissions)

The existing builder components (`builder-canvas.tsx`, `repository-panel.tsx`, `detail-drawer.tsx`, `save-dialog.tsx`, `mode-transition-dialog.tsx`) would be **migrated as-is** with minimal changes:
- Replace `cubesApi.list(...)` calls with Payload REST API calls
- Replace localStorage JWT auth with Payload cookie auth (already working via cookie domain)
- Replace shadcn/ui components (already in use -- these carry over directly)

### Admin Panel Usage

The Payload admin panel at `/admin` would serve:
- **Admins:** Full CRUD on all collections, user management, role assignment, `can_create_cubes` toggles
- **Head Coaches:** Domain management, difficulty level management, user oversight
- **Coaches:** NOT typically used -- coaches use the custom builder UI

This is a clean separation: coaches get the optimized builder experience, admins get the Payload admin panel for data management.

---

## 6. Risks and Limitations

### Risk 1: Payload Admin Panel Adds Little Value for Coaches (LOW)
The entire coach experience is the custom builder. The Payload admin panel is useful only for admins managing reference data. This means you are using Payload primarily for its **data layer, API generation, auth, and hooks** -- not for its admin UI. This is valid but means the "admin for free" advantage applies only to the admin/head_coach role.

**Mitigation:** This is actually fine. PATHS uses the same pattern -- the admin panel is for content editors, the frontend is custom Next.js pages.

### Risk 2: Performance of Ordered Array Fields at Scale (LOW-MEDIUM)
Payload stores array fields either as JSONB columns or as sub-tables with Drizzle. For routines with 20-30 cubes, this is trivial. For very large super-routines (10+ routines, each with 20+ cubes), nested fetching could get expensive.

**Mitigation:** Use `depth` parameter on API queries to control nesting. Use Payload's `select` to fetch only needed fields. For the builder canvas, only fetch cube IDs and names (not full cube details).

### Risk 3: Chat/DM System Is Not a CMS Concern (MEDIUM)
The messaging feature (conversations, messages, HTTP polling for near-real-time) is the most "non-CMS" feature in Cubes+. Payload can store messages, but the polling/push notification pattern is custom regardless.

**Mitigation:** Implement as a simple Payload collection with a custom endpoint for polling. If real-time is needed later, extract to a WebSocket service. The chat feature is identical in complexity whether built on Payload or FastAPI -- the database and API layer is the easy part; the real work is the frontend polling/UI.

### Risk 4: Loss of Python Backend Expertise (LOW)
The current Cubes+ backend is FastAPI/Python. Moving to Payload means the backend becomes TypeScript/Node.js. If the team has Python-specific expertise they want to retain, this is a cost.

**Mitigation:** The team's primary expertise is already TypeScript/Next.js/Payload (PATHS is built on it). The Python backend is an outlier in the LIMITLESS stack. Unifying on TypeScript reduces context-switching and makes cross-team maintenance easier.

### Risk 5: Migration of Existing Data (MEDIUM)
The current PostgreSQL database has data (cubes, routines, users, etc.) that would need to be migrated to Payload's schema. UUID primary keys are compatible, but table structures differ.

**Mitigation:** Write a one-time migration script that reads from the old SQLAlchemy schema and writes to Payload's Local API. Since UUIDs are used in both systems, entity IDs can be preserved. Relationships (cube_domains, routine_cubes, etc.) map to Payload's array/relationship fields.

### Risk 6: Payload Cannot Enforce "Cannot Delete If Used" Rules Natively (LOW)
The business rule "a cube used in a routine cannot be deleted" requires checking composition tables before allowing deletion. Payload doesn't have built-in referential integrity rules of this nature.

**Mitigation:** Use Payload's `beforeDelete` hook on the Cubes collection to query the Routines collection for any routine containing that cube. If found, throw an error. This is the same pattern the current FastAPI service layer uses, just expressed as a Payload hook.

### Where Payload Would Genuinely Struggle

There is no scenario where Payload is a fundamentally bad fit for Cubes+. The concerns are all about **what you gain vs. what you already have**:

- The builder UI is custom regardless -- Payload does not make it easier or harder to build
- The data model maps cleanly to Payload collections
- Auth is already solved
- The areas where Payload adds the most value (admin CRUD, API generation, access control) are areas where FastAPI already has working implementations

---

## 7. Effort Estimate

### Option A: Rebuild on Payload CMS 3.x

| Work Item | Effort | Notes |
|-----------|--------|-------|
| Payload project setup + config | 1-2 days | Copy patterns from PATHS |
| Collection definitions (12 collections) | 3-4 days | Straightforward mapping from existing models |
| Access control functions | 2-3 days | 4 roles, creator-scoping, can_create_cubes flag |
| Hooks (delete guards, notifications, duration calc) | 2-3 days | beforeDelete, afterChange hooks |
| Custom endpoints (insights, assignments, likes) | 3-4 days | Beyond standard CRUD |
| Migrate builder UI components | 3-5 days | Port dnd-kit builder from current frontend, replace API calls |
| Migrate remaining frontend pages | 3-5 days | Cubes list/detail/edit, routines, super-routines, profile, login |
| Migrate chat/DM system | 2-3 days | Collection + polling endpoint + frontend components |
| Auth integration (shared cookie domain) | 1 day | Already solved in PATHS |
| Data migration script | 2-3 days | SQLAlchemy -> Payload Local API |
| Testing and QA | 3-5 days | Cypress tests need updating for new API patterns |
| DNS/infrastructure (Render deploy, CNAME) | 1-2 days | Terraform + Render config |
| **Total** | **25-40 days** | ~5-8 weeks for one developer |

### Option B: Integrate Existing Cubes+ As-Is (6-Phase Plan Already Documented)

| Phase | Effort | Notes |
|-------|--------|-------|
| Phase 1: DNS + Domain Migration | 1-2 days | Terraform CNAMEs |
| Phase 2: Auth Integration | 1-2 weeks | FastAPI middleware for Payload cookie |
| Phase 3: User Model Mapping | 1-2 weeks | Alembic migration, sync jobs |
| Phase 4: Frontend Auth Migration | 1-2 weeks | Remove localStorage, add cookie auth |
| Phase 5: Cross-App Navigation | 3-5 days | Header links, shared branding |
| Phase 6: Existing User Migration | 2-3 days | User matching script |
| **Total** | **5-8 weeks** | Per existing integration plan |

### Comparison

| Factor | Rebuild (Payload) | Integrate (As-Is) |
|--------|-------------------|-------------------|
| **Timeline** | 5-8 weeks | 5-8 weeks |
| **Resulting tech stack** | Unified (TypeScript/Payload across all apps) | Split (Python backend + TypeScript frontend, different from all other apps) |
| **Ongoing maintenance** | One language, one ORM, one auth system | Two languages, two ORMs, two auth approaches (bridged) |
| **Future feature development** | Benefits from Payload ecosystem (versioning, i18n, plugins) | Each feature built from scratch in FastAPI |
| **Auth story** | Native -- same Payload cookie as PATHS | Bridged -- middleware validates foreign JWT |
| **Admin tools** | Payload admin panel for free | FastAPI admin must be built or maintained separately |
| **Risk: data migration** | One-time migration script needed | No data migration |
| **Risk: builder regression** | Builder components must be ported (moderate risk) | Builder stays untouched (zero risk) |
| **Risk: Python maintenance** | Eliminated | Ongoing -- team must maintain Python/FastAPI expertise |
| **Ecosystem coherence** | Full -- all LIMITLESS apps on same stack | Cubes+ remains the outlier |

---

## 8. Recommendation

**Rebuild on Payload CMS 3.x.** The reasoning:

1. **Timeline parity:** Both options take 5-8 weeks. The rebuild is not significantly more expensive than the integration.

2. **Compounding returns:** Every future feature benefits from Payload infrastructure (versioning, i18n when external coaches join, plugins, auto-generated APIs). With FastAPI, every feature is hand-built.

3. **Stack unification:** LIMITLESS currently maintains Python (Cubes+), TypeScript/Payload (PATHS), TypeScript/Prisma (HUB), and TypeScript/Fastify (Digital Twin). Eliminating Python removes an entire language/ecosystem from the maintenance burden. All knowledge compounds in one stack.

4. **The builder is the same work either way:** The drag-and-drop builder -- the core innovation -- is a custom React component regardless of backend. Moving to Payload does not make it harder. The builder components port directly with API call changes.

5. **Auth simplification:** Native Payload cookie auth vs. bridged cookie-to-FastAPI-JWT middleware. The bridge works, but it is another moving part that must be maintained and debugged.

6. **Shared infrastructure patterns:** PATHS already has working patterns for access control, hooks, custom endpoints, editorial workflows, media uploads, and i18n. These patterns copy directly to Cubes+.

7. **The PRD's future scope aligns with Payload strengths:** External coach access (multi-tenancy via Payload plugin), localization (built-in), email notifications (Payload email adapter), versioning (built-in for cube/routine draft workflows).

### When NOT to Rebuild

The rebuild is inadvisable if:
- The team needs Cubes+ integrated within 2 weeks (not enough time for rebuild)
- There are critical Python-specific integrations that cannot be ported to Node.js
- The existing Cubes+ has active paying users and zero downtime is required during migration

None of these conditions appear to apply. Cubes+ is in pilot phase, the Python backend is a standard REST API with no exotic integrations, and the timeline allows for a proper rebuild.

### Suggested Approach

1. **Week 1:** Set up Payload project, define all 12 collections, configure access control, deploy skeleton to Render
2. **Week 2:** Implement hooks (delete guards, notifications, duration calc) and custom endpoints (insights, assignments, likes)
3. **Week 3:** Port builder UI components, replacing FastAPI API calls with Payload REST API calls
4. **Week 4:** Port remaining frontend pages (lists, detail views, profiles, onboarding)
5. **Week 5:** Port chat/DM system, data migration script, DNS migration
6. **Week 6:** Testing, QA, polish, Cypress test updates
7. **Buffer week:** Edge cases, performance tuning, user communication about domain change

---

## Appendix A: Collection-by-Collection Mapping

| Current SQLAlchemy Model | Payload Collection | Key Differences |
|-------------------------|-------------------|-----------------|
| `users` | `users` (auth) | Payload handles password hashing, JWT, sessions. Add custom fields for role, expertise, avatar, etc. |
| `domains` | `domains` | Direct mapping. Access control via Payload access functions. |
| `categories` | `categories` | Direct mapping. Auto-create via `beforeValidate` hook or frontend logic. |
| `difficulty_levels` | `difficulty-levels` | Direct mapping. Access restricted to head_coach/admin. |
| `cubes` + `cube_domains` + `cube_nesting` + `cube_media` + `cube_youtube_links` | `cubes` | Domains as `hasMany` relationship. Nesting as array field with relationship sub-fields. Media as Upload relationship. YouTube links as array field. |
| `routines` + `routine_domains` + `routine_cubes` | `routines` | Domains as `hasMany` relationship. Cubes as array field with relationship + implicit position. |
| `super_routines` + `super_routine_domains` + `super_routine_routines` | `super-routines` | Same pattern as routines. |
| `likes` | `likes` | Polymorphic collection. Custom endpoints for toggle + counts. |
| `notifications` | `notifications` | Direct mapping. Triggered by afterChange hooks on cubes/routines. |
| `assignments` | `assignments` | Direct mapping. Custom endpoints for accept/decline/complete workflow. |
| `conversations` + `conversation_participants` + `messages` | `conversations` + `messages` | Participants as array field on conversation. Custom polling endpoint. |

## Appendix B: Access Control Mapping

| Current FastAPI Rule | Payload Access Function |
|---------------------|------------------------|
| Admin: full access | `isAdmin` (already exists in PATHS) |
| Head Coach: full access + delete any | `isHeadCoachOrAbove` |
| Senior Coach: create cubes + edit own | `isCreatorOrAbove('senior_coach')` |
| Junior Coach: create routines, view all, create cubes only if `can_create_cubes` | Custom function checking `user.role` + `user.can_create_cubes` |
| Creator can edit own entities | `{ created_by: { equals: user.id } }` (Payload access query) |
| Inactive entities visible only to creator + admin | Combine status check with creator/admin check |
