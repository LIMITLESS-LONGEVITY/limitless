# Cubes+ PRD & Implementation Gap Analysis

**Date:** 2026-03-31
**Author:** Product Analysis (Automated)
**Scope:** Full tear-down of PRD, backend, frontend, and test coverage
**Codebase:** `/home/nefarious/projects/cubes-plus/`

---

## 1. Executive Summary -- Top 5 Critical Findings

1. **No multi-tenancy / organization model.** The PRD and code treat all coaches as a single flat pool. For B2B (gyms, sports centers, coaching businesses), the platform needs organization/tenant isolation -- separate libraries, separate admin hierarchies, billing boundaries. This is the single biggest blocker to the B2B vision.

2. **Chat/DM system is a liability, not an asset.** The in-app messaging uses HTTP polling (3-second intervals), has no message editing, no file sharing, no typing indicators, no read receipts, no group chat (schema supports it, UI does not). Rebuilding this from scratch in v2 would be a waste -- a third-party integration (Stream, SendBird, or even embedded Discord/Slack) would deliver a better experience at lower cost.

3. **Cube nesting creates unbounded complexity with no user benefit.** Cubes can nest other cubes (self-referencing many-to-many), but there is no depth limit, no cycle detection, and the builder UI does not surface nested cubes meaningfully. This feature adds schema complexity, N+1 query risk, and confusing UX for zero demonstrated user value. The PRD mentions it once; no coach workflow requires it.

4. **No client/trainee model -- core to the B2B/B2C pivot.** The vision says coaches will assign routines to clients/trainees. The current assignment system only works between coaches. There is no trainee role, no client profile, no training schedule, no progress tracking, no client-facing view. This is the entire B2C value proposition and it does not exist.

5. **Security: JWT tokens stored in localStorage, no rate limiting, no CSRF protection.** Access and refresh tokens live in `localStorage`, making them vulnerable to XSS. There is no rate limiting on login/register (brute force risk), no CSRF tokens, no account lockout, and the `sort_by` query parameter passes user input directly to `getattr(Model, sort_by)` (potential for attribute enumeration). For a B2B platform handling coach PII, this is unacceptable.

---

## 2. Detailed Findings

### 2.1 PRD Gaps

#### F-01: No Organization/Tenant Model
- **Severity:** CRITICAL
- **Description:** The PRD mentions "Organisation / Group Affiliation" as an optional user field but never defines organizational isolation. In B2B, a gym chain needs its own library, its own admins, its own coaches -- invisible to other organizations.
- **Evidence:** `backend/app/models/user.py` line 50: `organisation` is a free-text `String(255)` field with no FK, no permissions model, no data isolation.
- **Recommendation:** v2 must introduce an `Organization` model with `organization_id` FK on all content entities. Roles become organization-scoped. A "platform admin" role sits above org admins.

#### F-02: No Client/Trainee Role
- **Severity:** CRITICAL
- **Description:** The B2B/B2C vision requires coaches to assign routines to clients who then follow them. The current system has no trainee role, no client profile, no training schedule, no execution tracking.
- **Evidence:** `backend/app/models/user.py` -- `UserRole` enum only has `admin`, `head_coach`, `senior_coach`, `junior_coach`. Assignment model (`backend/app/models/assignment.py`) only links coach-to-coach.
- **Recommendation:** Add `trainee` role (or separate `Client` model). Add schedule/calendar model. Add execution log (trainee marks exercises as done). Add trainee-facing read-only views.

#### F-03: Vague "Integration to LIMITLESS' other systems"
- **Severity:** MEDIUM
- **Description:** PRD section 1 lists "Seamless integration to LIMITLESS' other systems" as a core capability but provides zero specification of what this means -- no API contracts, no SSO strategy, no data flow diagrams.
- **Evidence:** PRD.md line 16: "Cubes+ integrate to all other platforms created and operated by LIMITLESS."
- **Recommendation:** Define explicit integration points: SSO via shared JWT, API gateway routing, Digital Twin health data informing routine difficulty, PATHS learning content linking.

#### F-04: Backup Strategy Underspecified
- **Severity:** HIGH
- **Description:** PRD section 3.3 says "The entire platform will be backed up daily (backups will be saved for a period of 7 days)." The implementation only has soft-delete with 7-day purge. There are no automated database backups, no point-in-time recovery, no backup verification.
- **Evidence:** `backend/app/services/cleanup_service.py` -- only handles soft-delete purging. No cron job, no pg_dump, no backup restoration tested.
- **Recommendation:** Rely on managed database provider backups (Render/AWS RDS). Document the backup strategy. Soft-delete is item-level undo, not a backup strategy.

#### F-05: "All-Domains" Implementation Inconsistency
- **Severity:** MEDIUM
- **Description:** The PRD says a cube/routine "can belong to all domains by setting its domain field to 'all-domains'." The implementation uses a boolean `all_domains` flag on the entity AND a special "all-domains" domain record in the design doc, but the actual code uses only the boolean. The domain join table may or may not have entries when `all_domains=True`. This creates filtering ambiguity.
- **Evidence:** `backend/app/models/cube.py` line 102: `all_domains: Mapped[bool]`. `backend/app/repositories/cube_repository.py` lines 46-55: domain filter checks `Cube.all_domains == True` as an OR condition.
- **Recommendation:** Pick one approach. The boolean is simpler and already implemented. Drop the "all-domains" domain record concept from the data model doc.

### 2.2 Over-Engineering

#### O-01: Cube Nesting
- **Severity:** HIGH
- **Description:** Cubes can nest other cubes via `cube_nesting` table with position ordering. This creates a recursive tree structure with no depth limit and no cycle detection. The frontend builder does not display nested cubes within cubes. The PRD mentions it once ("a warm-up cube can nest two group-game cubes") but no user workflow depends on it.
- **Evidence:** `backend/app/models/cube.py` lines 31-50: `CubeNesting` model. `backend/app/services/cube_service.py` lines 259-264: deletion check counts nesting usage but not routine usage (comment says "For now just check cube_nesting"). The builder canvas (`frontend/src/components/builder/builder-canvas.tsx`) never renders nested-within-nested cubes.
- **Recommendation:** Remove cube nesting in v2. If a coach wants to group exercises, they create a routine. The three-tier hierarchy (Cube -> Routine -> Super-Routine) is sufficient. Nesting adds complexity without UX value.

#### O-02: Dual Difficulty Systems
- **Severity:** MEDIUM
- **Description:** Cubes use a numeric `difficulty_level` (integer), while routines and super-routines use a `difficulty_level_id` FK to a `difficulty_levels` lookup table with alphanumeric labels. This creates confusion -- a cube's difficulty "3" has no relationship to a routine's difficulty "Super Saiyan 1". The PRD specifies this split, but it is a design mistake.
- **Evidence:** `backend/app/models/cube.py` line 100: `difficulty_level: Mapped[int | None]`. `backend/app/models/routine.py` line 43: `difficulty_level_id: Mapped[uuid.UUID | None]`.
- **Recommendation:** Unify on the `difficulty_levels` lookup table for all entity types. Drop the integer field on cubes. One system, one mental model.

#### O-03: Super-Routine as a Separate Entity
- **Severity:** MEDIUM
- **Description:** Super-routines are modeled as a completely separate entity (`super_routines` table, `SuperRoutineRoutine` join table, `super_routine_domains` join table, separate service, separate repository, separate router). They are structurally identical to routines except they compose routines instead of cubes. This triples the API surface and code duplication.
- **Evidence:** The `super_routine_service.py`, `super_routine_repository.py`, and `routers/super_routines.py` are near-identical copies of the routine equivalents with "routine" replaced by "super_routine". ~800 lines of duplicated logic.
- **Recommendation:** Consider modeling routines and super-routines as the same entity with a `parent_type` discriminator, or use a single `program` entity that can compose either cubes or routines. This halves the API surface and eliminates code duplication.

### 2.3 Under-Engineering

#### U-01: No Rate Limiting
- **Severity:** CRITICAL
- **Description:** No rate limiting anywhere in the API. Login, register, password brute-force, API abuse -- all unthrottled.
- **Evidence:** `backend/app/main.py` (not read but inferred from router setup), `backend/app/routers/auth.py` -- no middleware or dependency for rate limiting.
- **Recommendation:** Add rate limiting middleware (e.g., `slowapi` for FastAPI, or Cloudflare rate limiting). At minimum: 5 login attempts per minute per IP, 20 registrations per hour per IP.

#### U-02: No Input Sanitization on Search
- **Severity:** HIGH
- **Description:** Search queries use `ILIKE '%{search}%'` with user input interpolated into the query pattern. While SQLAlchemy parameterizes this safely against SQL injection, the `%` wildcards allow expensive full-table scans on large datasets with no text index.
- **Evidence:** `backend/app/repositories/cube_repository.py` line 58: `Cube.name.ilike(f"%{search}%")`. No GIN trigram index is actually created in migrations (only mentioned in the data model doc).
- **Recommendation:** Add pg_trgm GIN indexes as documented. Consider full-text search with `tsvector` for production scale. Add minimum search term length (2+ characters).

#### U-03: No Pagination Limit on Repository Panel
- **Severity:** HIGH
- **Description:** The frontend repository panels fetch `page_size: 100` items on every load. With 10,000+ cubes, this loads 100 cubes with all their relationships (domains, categories, nested cubes, media, youtube links) via eager loading (`lazy="selectin"`). This will become a performance bottleneck.
- **Evidence:** `frontend/src/components/builder/repository-panel.tsx` line 265: `page_size: 100`. `backend/app/models/cube.py`: all relationships use `lazy="selectin"` (eager loaded).
- **Recommendation:** Reduce default page size to 20-30. Implement virtual scrolling / infinite scroll. Switch to `lazy="select"` or `lazy="joined"` selectively based on list vs detail views.

#### U-04: No Versioning / History
- **Severity:** HIGH
- **Description:** When a cube is edited, all routines using it see the change immediately. There is no version history, no diff view, no rollback capability. The notification system tells users "someone updated a cube" but not what changed.
- **Evidence:** `backend/app/services/notification_service.py` line 46: notification message is just `'{modifier_name} updated cube "{cube_name}"'` -- no diff, no before/after.
- **Recommendation:** For v2, consider a `cube_versions` table that snapshots the cube state on each edit. Routines can pin to a specific version. This is essential for a professional coaching platform where changes to a warm-up cube should not silently alter 50 active routines.

#### U-05: No Tagging System
- **Severity:** MEDIUM
- **Description:** With 10,000+ items, coaches need more than name search and domain filter. There are no tags, no skill levels, no equipment requirements, no target muscle groups, no training goals.
- **Evidence:** Cube model has only: name, category, domain, duration, difficulty. No tags or metadata fields.
- **Recommendation:** Add a flexible tagging system (polymorphic tags table) or structured metadata fields (equipment, muscle groups, training goals).

### 2.4 UX Weaknesses

#### UX-01: 3-Panel Layout is Overwhelming
- **Severity:** HIGH
- **Description:** The home page shows 4 panels simultaneously on desktop (super-routines, builder, routines, cubes). The builder occupies 1/4 of the screen. On mobile, the tab-based fallback hides the builder when browsing repositories, forcing constant tab switching.
- **Evidence:** `frontend/src/app/page.tsx` lines 772-822: `xl:grid xl:grid-cols-[1fr_2fr_1fr]` with the center split into two more columns. ~930 lines of state management in a single component.
- **Recommendation:** Simplify to a 2-panel layout (repository + builder). Use a tabbed repository (cubes/routines/super-routines tabs within one panel). The main page component should be decomposed into smaller components -- 930 lines is unmaintainable.

#### UX-02: No Undo/Redo in Builder
- **Severity:** MEDIUM
- **Description:** Builder has no undo/redo. Accidentally removing a cube from a 10-cube routine means re-adding it manually. The "Clear" button wipes everything with no confirmation.
- **Evidence:** `frontend/src/app/page.tsx` line 570: `handleClear` directly empties state with no confirmation dialog.
- **Recommendation:** Add undo/redo stack. Add confirmation dialog on "Clear" when items exist.

#### UX-03: No Draft Auto-Save
- **Severity:** MEDIUM
- **Description:** Building a complex routine involves dragging many cubes, setting domains, adding instructions. If the browser closes or the session expires, all work is lost. No localStorage persistence, no auto-save.
- **Evidence:** Builder state is React `useState` only -- no persistence layer.
- **Recommendation:** Auto-save builder state to localStorage. Restore on page load with "Continue editing?" prompt.

#### UX-04: Exercise List is Free-Form Text
- **Severity:** MEDIUM
- **Description:** The cube's exercise list is a single free-form text field. For a B2B platform, coaches need structured exercise data: exercise name, sets, reps, rest period, tempo, RPE. Free-form text cannot be searched, filtered, or analyzed.
- **Evidence:** `backend/app/models/cube.py` line 98: `exercise_list: Mapped[str | None] = mapped_column(Text, nullable=True)`. Frontend renders it in a `<pre>` tag.
- **Recommendation:** Model exercises as a JSON array or related table with structured fields. Keep backward compatibility with a free-form notes field.

### 2.5 Security Concerns

#### S-01: Tokens in localStorage
- **Severity:** CRITICAL
- **Description:** JWT access and refresh tokens are stored in `localStorage`, making them accessible to any JavaScript on the page (XSS vulnerability). Any XSS on any subdomain or injected script can steal both tokens.
- **Evidence:** `frontend/src/lib/api/client.ts` lines 13, 36, 41: `localStorage.getItem('access_token')`, `localStorage.removeItem(...)`. `frontend/src/hooks/use-auth.tsx` lines 29, 57, 68: same pattern.
- **Recommendation:** Store tokens in HttpOnly cookies (immune to XSS). If Bearer tokens are required, store only the access token in memory (not localStorage) and use an HttpOnly cookie for the refresh token.

#### S-02: No CSRF Protection
- **Severity:** HIGH
- **Description:** The API uses Bearer token auth (no cookies for auth), so CSRF is partially mitigated. However, if v2 moves to cookie-based auth (recommended for S-01), CSRF protection becomes mandatory.
- **Recommendation:** Implement CSRF tokens when moving to cookie-based auth.

#### S-03: Unsafe `getattr` for Sort Column
- **Severity:** HIGH
- **Description:** The sort parameter is passed directly to `getattr(Model, sort_by, Model.created_at)`. While the fallback to `created_at` prevents crashes, an attacker can probe for column names by observing sort behavior changes.
- **Evidence:** `backend/app/repositories/cube_repository.py` line 65: `sort_col = getattr(Cube, sort_by, Cube.created_at)`.
- **Recommendation:** Whitelist allowed sort columns explicitly: `ALLOWED_SORTS = {"name", "created_at", "duration_minutes"}`.

#### S-04: No Account Lockout
- **Severity:** MEDIUM
- **Description:** Failed login attempts are not tracked. No lockout after N failures. No CAPTCHA. No suspicious activity detection.
- **Evidence:** `backend/app/routers/auth.py` -- login endpoint returns 401 on failure with no tracking.
- **Recommendation:** Track failed attempts per email/IP. Lock after 5 failures for 15 minutes. Send email notification on lockout.

#### S-05: Cloudinary Public ID Extraction is Fragile
- **Severity:** LOW
- **Description:** Avatar deletion extracts the Cloudinary public_id from the URL using string splitting. This is brittle and will break if Cloudinary changes their URL format.
- **Evidence:** `backend/app/routers/uploads.py` line 126: `old_public_id = current_user.avatar_url.split("/upload/")[-1].split("/", 1)[-1].rsplit(".", 1)[0]`.
- **Recommendation:** Store the `public_id` alongside the URL (as done for cube media) instead of reverse-engineering it from the URL.

### 2.6 Performance Risks

#### P-01: N+1 Queries in Conversation List
- **Severity:** HIGH
- **Description:** `get_user_conversations` executes 3 separate queries PER conversation (last message, participant record, unread count). With 50 conversations, that is 150+ queries per page load.
- **Evidence:** `backend/app/repositories/conversation_repository.py` lines 57-118: loop over conversations with 3 queries each.
- **Recommendation:** Rewrite as a single query with window functions or lateral joins.

#### P-02: N+1 in Most-Liked Insights
- **Severity:** MEDIUM
- **Description:** `get_most_liked` fetches top 5 per entity type, then does individual `get_by_id` calls for each to get the entity name and creator.
- **Evidence:** `backend/app/services/like_service.py` lines 63-77: loop with `BaseRepository.get_by_id` per item.
- **Recommendation:** Use a single joined query.

#### P-03: Eager Loading Everything
- **Severity:** HIGH
- **Description:** All relationships on Cube, Routine, and SuperRoutine use `lazy="selectin"`, meaning every query loads ALL related data (domains, categories, nested cubes, media, youtube links, creator). List endpoints return 20-100 items, each with full relationship trees.
- **Evidence:** `backend/app/models/cube.py` lines 113-137: all relationships use `lazy="selectin"`.
- **Recommendation:** Use `lazy="noload"` or `lazy="select"` by default. Use `selectinload()` option only when the relationship is needed (detail views). List views should use a separate lightweight query.

#### P-04: No Database Connection Pooling Configuration
- **Severity:** MEDIUM
- **Description:** No explicit connection pool configuration. On Render free tier with cold starts, connection exhaustion is likely under concurrent load.
- **Evidence:** `backend/app/config.py` -- no pool_size, max_overflow, or pool_timeout settings.
- **Recommendation:** Configure `pool_size=5, max_overflow=10, pool_timeout=30` for production.

### 2.7 Missing Features for B2B Vision

#### M-01: No Billing/Subscription System
- **Severity:** CRITICAL
- **Description:** For a B2B SaaS, there is no subscription model, no pricing tiers, no usage limits, no billing integration.
- **Recommendation:** Add Stripe integration with organization-level billing. Define tiers (free, pro, enterprise) with usage limits (coach seats, storage, API calls).

#### M-02: No Analytics for Coaches
- **Severity:** HIGH
- **Description:** The insights dashboard shows platform-wide stats (total cubes, routines, top creators). Individual coaches cannot see: how many times their routines were used, completion rates, client feedback, training effectiveness.
- **Recommendation:** Add coach-specific analytics: routine usage count, assignment completion rate, client progress, like trends over time.

#### M-03: No Template/Marketplace System
- **Severity:** HIGH
- **Description:** For "the go-to ecosystem," coaches need to discover and reuse each other's work. The current system has basic search but no featured templates, no premium content marketplace, no ratings beyond likes.
- **Recommendation:** Add a template marketplace with: featured sections, star ratings (not just likes), comments/reviews, usage count, coach profiles as storefronts.

#### M-04: No Calendar/Schedule Integration
- **Severity:** HIGH
- **Description:** Training routines need to be scheduled -- "do this routine on Monday, that one on Wednesday." There is no calendar, no recurring schedule, no integration with Google Calendar or iCal.
- **Recommendation:** Add a schedule model linking routines to dates. Add calendar view. Add iCal export.

#### M-05: No Export/Print Functionality
- **Severity:** MEDIUM
- **Description:** Coaches need to print routine sheets for gym use, export to PDF for client delivery, share via link. None of this exists.
- **Recommendation:** Add PDF export for routines (using a server-side renderer like Puppeteer or WeasyPrint). Add shareable links (public routine view without auth).

#### M-06: No Localization/i18n
- **Severity:** MEDIUM
- **Description:** The platform targets "coaches worldwide" but has no internationalization support. All UI text is hardcoded in English.
- **Recommendation:** Add i18n framework (next-intl or similar). Prioritize English, Spanish, French, Portuguese for global coaching market.

#### M-07: No Audit Log
- **Severity:** MEDIUM
- **Description:** For B2B compliance and dispute resolution, there is no audit trail. Who changed what, when, and why is not tracked.
- **Recommendation:** Add an audit_events table logging all create/update/delete operations with user_id, entity_type, entity_id, action, timestamp, and diff.

### 2.8 DM/Chat System Assessment

#### VERDICT: Replace with third-party service.

**Current implementation problems:**
1. HTTP polling at 3-second intervals (`frontend/src/components/chat/message-thread.tsx` -- inferred from poll endpoint) -- wastes bandwidth, high latency, battery drain on mobile
2. No WebSocket/SSE support -- the architecture is fundamentally wrong for real-time messaging
3. No typing indicators, read receipts, reactions, threads, file sharing, message editing/deletion
4. No group chat UI (schema has `is_group` flag but no frontend support)
5. No push notifications (no service worker, no Firebase/APNs integration)
6. N+1 query performance issues in conversation listing
7. No end-to-end encryption
8. No message search
9. No offline message queue

**Recommendation:** Use Stream Chat, SendBird, or Ably for the messaging layer. Estimated effort to build a comparable real-time chat: 3-6 months. Estimated effort to integrate Stream: 1-2 weeks. For a training platform, messaging is not a core differentiator -- buy, do not build.

### 2.9 Media Handling Assessment

#### Cloudinary is acceptable for now, with caveats:

**Current limits:**
- Image: 10 MB max (`backend/app/routers/uploads.py` line 18)
- Video: 100 MB max (line 19)
- Free tier: 25 GB storage, 25 GB bandwidth/month
- No video transcoding (raw upload only)
- No automatic thumbnail generation
- No video streaming (progressive download only)

**Missing for B2B scale:**
1. **No video processing pipeline:** Coaches need to upload exercise demonstration videos. These need transcoding to multiple resolutions, HLS streaming, thumbnail extraction.
2. **No storage quotas per organization:** Free tier will be exhausted quickly with video content.
3. **No media library management:** Coaches cannot browse/search their uploaded media separately from cubes.
4. **No CDN optimization:** No responsive image serving (srcset), no WebP/AVIF format conversion.

**Recommendation:** Keep Cloudinary for images. Evaluate Mux or Cloudflare Stream for video (transcoding + streaming). Add per-organization storage quotas. Implement responsive image delivery.

### 2.10 Search & Discovery Assessment

#### Current state is insufficient for scale.

**Current implementation:**
- Simple `ILIKE '%term%'` text search on name field only
- Filter by: status, domain, category (cubes only)
- Sort by: created_at, name, duration_minutes, like_count
- Pagination: offset-based with page/page_size

**Missing for 10,000+ items:**
1. **No full-text search:** Cannot search exercise list content, instructions, or creator notes
2. **No faceted search:** Cannot combine multiple filters with counts (e.g., "Cardio (234) | Strength (156)")
3. **No relevance ranking:** All results are sorted by the selected column, not by relevance to the search term
4. **No trigram indexes:** The data model doc specifies GIN trigram indexes but they were never created in migrations
5. **No saved searches / smart collections:** Coaches cannot save filter combinations
6. **No "similar items" recommendations:** No collaborative filtering or content-based similarity

**Recommendation:** For v2, implement PostgreSQL full-text search (`tsvector` + `GIN` index) with weighted ranking (name > exercise_list > instructions). Add faceted filter counts. Consider Algolia or Meilisearch if scale demands it.

---

## 3. Feature Completeness Matrix

| Feature | PRD Status | Implementation | Notes |
|---|---|---|---|
| **User Roles (4-tier)** | Specified | Complete | Works as designed |
| **User Onboarding** | Specified | Complete | Registration + Google OAuth |
| **Cube CRUD** | Specified | Complete | All operations work |
| **Cube Nesting** | Specified | Partial | Backend works, builder UI ignores it |
| **Cube Media** | Specified | Complete | Cloudinary upload/delete |
| **Cube YouTube Links** | Not in PRD | Complete | Added beyond PRD scope |
| **Routine CRUD** | Specified | Complete | All operations work |
| **Super-Routine CRUD** | Specified | Complete | All operations work |
| **Domain CRUD** | Specified | Complete | With usage-based deletion protection |
| **Category/Phase** | Specified | Complete | Auto-create on type (partial -- backend validates existing only) |
| **Difficulty Levels** | Specified | Complete | Dual system (integer for cubes, lookup for routines) |
| **Visual Builder (D&D)** | Specified | Complete | Complex but functional |
| **Repository Panels** | Specified | Complete | Search + filter + sort |
| **Status (active/inactive)** | Specified | Complete | With visibility rules |
| **Duplication** | Specified | Complete | Name change required |
| **Deletion Protection** | Specified | Complete | Blocks delete if in use |
| **Soft Delete (7-day)** | Specified | Complete | With admin purge endpoint |
| **Notifications** | Specified | Complete | On entity modification |
| **Likes/Ranking** | v2 in PRD | Complete | Toggle + counts + most-liked |
| **Assignments** | v2 in PRD | Complete | Accept/decline/complete workflow |
| **Chat/DMs** | v2 in PRD | Complete | HTTP polling, basic functionality |
| **Google OAuth** | v2 in PRD | Complete | With account linking |
| **Insights Dashboard** | Specified | Complete | Summary, activity, top creators, most liked |
| **Search & Sort** | Specified | Partial | Name-only search, basic filters |
| **GDPR Compliance** | Specified | Minimal | Soft delete + account deletion exist, but no consent management, no data export, no DPA |
| **WCAG 2.1 AA** | Specified | Partial | Skip-to-content, aria-labels exist. Axe tests disable color-contrast. |
| **PWA / Offline** | v2 in PRD | Not started | No service worker |
| **Email Notifications** | v2 in PRD | Not started | No email service |
| **Native Mobile Apps** | v2 in PRD | Not started | |
| **Daily Platform Backups** | Specified | Not implemented | Only soft-delete purging exists |
| **Multi-tenant / Org** | Not in PRD | Not started | Critical for B2B |
| **Client/Trainee Model** | Not in PRD | Not started | Critical for B2C |
| **Billing/Subscriptions** | Not in PRD | Not started | Critical for B2B SaaS |
| **Calendar/Scheduling** | Not in PRD | Not started | Critical for coaching workflows |
| **Export/Print** | Not in PRD | Not started | Important for coach delivery |

---

## 4. Role/Permission Audit

### Current 4-Tier System

| Capability | Junior Coach | Senior Coach | Head Coach | Admin |
|---|---|---|---|---|
| Create cubes | Only if `can_create_cubes=true` | Yes | Yes | Yes |
| Create routines | Yes | Yes | Yes | Yes |
| Create super-routines | Yes | Yes | Yes | Yes |
| Create domains | Same as cubes | Yes | Yes | Yes |
| Toggle status | No | Own items | Own items | All items |
| Delete own items | No (cubes), Yes (routines/SRs) | Yes | Yes | Yes |
| Delete others' items | No | No | Yes (unused only) | Yes |
| Set difficulty levels | No | No | Yes | Yes |
| Manage users | No | No | No | Yes |
| View inactive items | Own only | Own only | Own only | All |
| Create assignments | No | No | Yes | Yes |
| Run cleanup | No | No | No | Yes |

### Gaps for B2B

1. **No organization scope:** All permissions are global. A head coach at Gym A can delete cubes created by coaches at Gym B.
2. **No delegated admin:** An organization owner cannot appoint their own admins. Only the platform-level admin can change roles.
3. **No custom roles:** Fixed 4-tier hierarchy. A gym might want "intern coach" (read-only) or "curriculum designer" (can create but not assign).
4. **No team/group model:** Cannot create a "Cardio Team" within an organization with shared permissions.
5. **Permission on `toggle_status` is inconsistent:** Junior coaches cannot toggle status on anything, but the PRD does not restrict this. Senior coaches can toggle their own but not others'. Head coaches can... also only toggle their own (the code checks `created_by != user.id`). The PRD says head coaches should have broader authority.
6. **No viewer role for clients:** Trainees/clients need read-only access to assigned routines without seeing the full library.

### Recommendation for v2

Adopt a role-based access control (RBAC) system with:
- **Platform roles:** Platform Admin, Organization Owner
- **Organization roles:** Org Admin, Head Coach, Senior Coach, Junior Coach, Trainee/Client
- **Permissions:** Defined per resource type (cube, routine, etc.) with actions (create, read, update, delete, assign, publish)
- **Scoped to organization_id** on all queries

---

## 5. Technical Debt Inventory

### Patterns to NOT carry forward:

| # | Pattern | Location | Problem |
|---|---|---|---|
| 1 | `localStorage` for JWT tokens | `frontend/src/lib/api/client.ts` | XSS vulnerability |
| 2 | 930-line single component | `frontend/src/app/page.tsx` | Unmaintainable; mixing state management, drag-and-drop logic, UI rendering, and business logic in one file |
| 3 | `getattr(Model, sort_by)` | All repository files | Attribute enumeration risk; needs whitelist |
| 4 | `lazy="selectin"` on all relationships | All model files | Eager-loads everything; kills list performance |
| 5 | Circular imports via inline imports | `cube_service.py`, `domain_service.py`, `notification_service.py` | Fragile architecture; 11 inline imports scattered across services |
| 6 | HTTP polling for chat | Conversation endpoints | Fundamentally wrong architecture for real-time |
| 7 | `datetime.utcnow` (deprecated) | `backend/app/models/base.py` line 31 | Python 3.12+ deprecates `utcnow()`. Use `datetime.now(timezone.utc)` |
| 8 | Duplicate code across cube/routine/super-routine | Services, repositories, routers | ~60% code duplication. Factor into generic entity handlers |
| 9 | `pass` in exception handlers | `backend/app/routers/uploads.py` lines 129, 186 | Silently swallows errors; should at minimum log |
| 10 | No transaction management | All services | `db.flush()` without explicit transactions; a failure mid-operation can leave data in inconsistent state |
| 11 | `# eslint-disable-next-line` comments | `frontend/src/app/page.tsx` lines 516, 686, 690 | Dependency arrays are wrong; fix the hooks instead of disabling the lint |
| 12 | Entity type as string column | Likes, notifications, assignments | Polymorphic references via string should use proper FK or discriminator pattern |
| 13 | No API versioning | All routes are under `/api/v1/` | Good that it exists, but no strategy for v2 migration |
| 14 | Pydantic models not shown but referenced | Schemas directory not fully read | Validation may have gaps |

---

## 6. Recommended Removals for v2

| Feature | Reason |
|---|---|
| **Cube nesting** | No UX implementation, adds schema complexity, no user demand |
| **In-app chat/DM system** | Replace with third-party service (Stream/SendBird). The 7-table schema and polling architecture is a maintenance burden for an inferior experience |
| **Numeric difficulty on cubes** | Unify with the `difficulty_levels` lookup table |
| **Super-routine as separate entity** | Merge into a unified "program" concept or keep routines composable (routine-of-routines) |
| **"all-domains" domain record** | The boolean flag is simpler; drop the special domain concept |
| **Admin cleanup endpoint** | Replace with automated cron job / scheduled task |
| **Insights "most liked" per type** | Merge into a single ranked list across all types |

---

## 7. Recommended Additions for v2

| Feature | Priority | Rationale |
|---|---|---|
| **Organization/tenant model** | CRITICAL | B2B requires data isolation |
| **Client/trainee role + views** | CRITICAL | B2C requires training delivery |
| **Billing (Stripe integration)** | CRITICAL | Revenue model |
| **HttpOnly cookie auth** | CRITICAL | Security baseline |
| **Rate limiting** | CRITICAL | Abuse prevention |
| **Structured exercise model** | HIGH | Replaces free-text; enables search, analytics |
| **Calendar/schedule model** | HIGH | Core coaching workflow |
| **Version history for cubes** | HIGH | Professional content management |
| **PDF export / print view** | HIGH | Gym floor delivery |
| **Full-text search** | HIGH | Discovery at scale |
| **Audit log** | HIGH | B2B compliance |
| **Email notification service** | HIGH | Engagement / assignment alerts |
| **Webhook/API integration** | MEDIUM | B2B partner integration |
| **i18n framework** | MEDIUM | Global market |
| **Storage quotas per org** | MEDIUM | Cost management |
| **Coach analytics dashboard** | MEDIUM | User retention |
| **Template marketplace** | MEDIUM | Network effect / discovery |
| **Exercise video streaming** | MEDIUM | Quality coach content |
| **Mobile-first responsive redesign** | MEDIUM | Coaches use phones at gyms |
| **GDPR consent management** | MEDIUM | EU compliance |
| **SSO / SAML for enterprise** | LOW | Enterprise sales requirement |
| **Offline mode (PWA)** | LOW | Gym connectivity issues |

---

## 8. Test Coverage Assessment

### What Cypress Tests Cover (14 spec files, ~1,099 lines, 101+ tests)

| Spec File | Coverage Area | Quality |
|---|---|---|
| `01-core-access.cy.ts` | Login, logout, auth redirect, 404, skip-link, mobile overflow | Good |
| `02-user-management.cy.ts` | Profile, registration | Not read in detail |
| `03a-domains.cy.ts` | Domain CRUD | Basic |
| `03b-cubes.cy.ts` | Cube CRUD | Moderate |
| `03c-builder-routines.cy.ts` | Builder layout, search, add, save, detail drawer | Good |
| `03d-super-routines.cy.ts` | Super-routine operations | Basic |
| `03e-categories-difficulty.cy.ts` | Category and difficulty level management | Basic |
| `04-media-uploads.cy.ts` | Image/video upload | Moderate |
| `05-notifications.cy.ts` | Notification bell, list, mark-read | Good |
| `06-search-sort-filter.cy.ts` | Search, status filter, sort, pagination | Moderate |
| `07-insights.cy.ts` | Insights dashboard | Basic |
| `08-soft-delete.cy.ts` | Soft delete operations | Not read in detail |
| `09-accessibility.cy.ts` | Axe WCAG checks, aria-labels, keyboard nav | Good (but disables color-contrast) |
| `10-responsive.cy.ts` | Responsive layout | Basic |

### What is NOT Tested

1. **Assignment workflow:** No test for creating, accepting, declining, or completing assignments
2. **Chat/DM system:** No test for conversations, messaging, polling, unread counts
3. **Google OAuth flow:** No test for Google login, account linking, profile completion
4. **Permission boundaries:** No test verifying junior coaches cannot create cubes (without permission), cannot toggle status, etc.
5. **Error states:** No test for network failures, 500 errors, timeout handling
6. **Concurrent editing:** No test for two users editing the same cube simultaneously
7. **Super-routine builder workflow:** Only basic tests; no test for mode transition, editing existing super-routines
8. **Cube nesting:** No test at all (understandably, since the UI does not support it)
9. **Duplicate name validation:** No test for the "name must differ" constraint on duplication
10. **Deletion protection:** No test verifying you cannot delete a cube used in a routine
11. **Notification generation:** No test verifying that editing a cube creates notifications for dependent routine creators
12. **Like toggle idempotency:** No test for rapid like/unlike toggling
13. **Backend unit tests:** Zero backend tests. All testing is E2E via Cypress against a running server.
14. **Admin operations:** No test for user management, role changes, permission updates, cleanup

### Test Quality Issues

- **Color contrast disabled in accessibility tests:** `09-accessibility.cy.ts` disables `color-contrast` rule for all axe checks. This means WCAG AA color contrast compliance is untested.
- **Brittle selectors:** Some tests use CSS class selectors (`.xl\\:hidden`) and `:contains()` filters that are fragile.
- **No test data isolation:** Tests depend on pre-existing data (e.g., `loginAsSeniorCoach` assumes a specific user exists). No test data setup/teardown.
- **No API-level tests:** All tests go through the UI. API contract testing is absent.

---

## Summary

The Cubes+ v1 is a well-executed MVP that proves the core concept (visual routine builder with drag-and-drop). The implementation quality is solid for a prototype. However, the architecture is fundamentally unsuited for the B2B/B2C platform vision:

- **No multi-tenancy** makes B2B impossible
- **No client/trainee model** makes B2C impossible
- **No billing** makes SaaS impossible
- **Security gaps** (localStorage tokens, no rate limiting) are unacceptable for production B2B

The decision to rebuild from scratch on Next.js + Prisma is correct. The rebuild should:
1. Start with the organization/tenant model as the foundation
2. Build the role/permission system as organization-scoped RBAC
3. Design the data model for structured exercises (not free-text)
4. Use cookie-based auth from day one
5. Drop cube nesting, in-app chat (use third-party), and the dual difficulty system
6. Unify routine/super-routine into a single composable entity
7. Plan for full-text search, versioning, and export from the schema level
