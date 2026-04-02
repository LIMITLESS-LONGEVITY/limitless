# PATHS Platform — Sub-project 2: Content Management System

**Date:** 2026-03-20
**Status:** Draft
**Platform:** LearnHouse (FastAPI + Next.js)
**Approach:** Article as Lightweight Model + Shared Components (Approach C)

## Context

Sub-project 1 (Auth & User Management) is complete. The platform has user accounts, configurable membership tiers, org management, and shared cross-subdomain auth.

This sub-project adds the content creation layer: standalone articles, content pillar taxonomy, and an editorial workflow for quality-controlled publishing.

**Content strategy:** Articles serve free/regular tiers as the primary content engine. Courses serve premium/enterprise tiers. Articles can be cross-referenced from courses as supplementary content.

**Core principle:** Flexible features (configurable pillars, permission-based roles) must ship with admin-facing documentation. Flexibility without docs = confusion.

## Scope

### In scope
- Standalone Article model with TipTap editor (same editor as course activities)
- Content Pillar taxonomy (configurable via admin, stored in DB)
- Editorial workflow (Draft → In Review → Approved → Published → Archived)
- Permission-based editorial roles (via existing RBAC, not hardcoded)
- Article versioning (full content snapshots, restore capability)
- Cross-references between articles and courses
- Pillar classification on both articles and courses (each belongs to one primary pillar)
- Article dashboard in org UI (list, create, edit, review)
- Pillar management in admin panel
- Admin-facing documentation (editorial workflow guide, role setup guide, pillar management guide)

### Out of scope
- Content access control/gating by tier (Sub-project 3)
- Resource/download library (future)
- Content scheduling/embargo dates (future — "Approved" state enables this later)
- Org-type templates (future)
- Bulk content operations (future)
- Public-facing content browse UI (Sub-project 4)

## Data Models

### ContentPillar (new)

```
ContentPillar
├── id (PK)
├── name (string) — e.g., "Nutrition"
├── slug (string, unique)
├── description (text, optional)
├── icon (string, optional) — icon identifier for UI
├── display_order (int) — controls sort order
├── is_active (bool, default true)
├── org_id (FK → Organization, nullable) — null = platform-wide, set = org-specific
├── creation_date (string, default_factory)
├── update_date (string, default_factory)
```

Note: `creation_date` and `update_date` are stored as ISO strings, matching LearnHouse's existing convention across all models (Organization, Course, Activity, etc.).

Platform-wide pillars (org_id = null) are visible to all orgs. Org-specific pillars are visible only within that org.

Default pillars seeded on install:
1. Nutrition (display_order=1)
2. Movement (display_order=2)
3. Sleep (display_order=3)
4. Mental Health (display_order=4)
5. Medicine (display_order=5)
6. Health Tech (display_order=6)

### Article (new)

```
Article
├── id (PK)
├── article_uuid (string, unique)
├── title (string)
├── slug (string, UNIQUE(slug, org_id) composite index)
├── summary (text) — short description for listings/cards
├── content (JSON) — TipTap editor JSON, same format as Activity content
├── featured_image (string, optional) — URL
├── status (enum: DRAFT, IN_REVIEW, APPROVED, PUBLISHED, ARCHIVED)
├── pillar_id (FK → ContentPillar, nullable)
├── org_id (FK → Organization)
├── author_id (FK → User) — primary author
├── reviewer_id (FK → User, nullable) — who reviewed
├── review_date (datetime, nullable)
├── review_notes (text, nullable) — reviewer feedback
├── published_at (datetime, nullable) — when it went live
├── related_courses (JSON, optional) — list of course UUIDs
├── creation_date (string, default_factory)
├── update_date (string, default_factory)
```

### ArticleVersion (new)

```
ArticleVersion
├── id (PK)
├── article_id (FK → Article)
├── version_number (int)
├── content (JSON) — full TipTap content snapshot
├── created_by_id (FK → User)
├── created_at (datetime)
├── notes (string, optional) — version annotation
```

Same pattern as LearnHouse's `ActivityVersion`. Full content snapshot per version, supports restore.

**Version creation triggers:**
- A new version is created on each **status transition** (submit, approve, reject, publish, archive, reopen, revise)
- A new version is created when the user **explicitly saves** (save button or keyboard shortcut)
- **Auto-save updates the current draft content without creating a new version** — this prevents version spam from frequent auto-saves
- Restoring a previous version creates a new version (not a revert)

**Article deletion:** Deleting an article cascade-deletes its ArticleVersion records. This is a hard delete — no soft-delete mechanism. Consider archiving instead of deleting for content preservation.

### Course extensions (modify existing)

- Add `pillar_id` (FK → ContentPillar, nullable) to Course model
- Add `related_articles` (JSON, optional) — list of article UUIDs

**Note on cross-references:** `related_courses` and `related_articles` are stored as JSON arrays of UUIDs for simplicity. This means deleted courses/articles may leave orphan UUIDs. The API should validate UUIDs on write and silently filter invalid UUIDs on read. A proper join table is not warranted at this stage but can be introduced if query performance requires it.

## Editorial Workflow

### Status Flow

```
DRAFT ──→ IN_REVIEW ──→ APPROVED ──→ PUBLISHED ──→ ARCHIVED
  ↑            │              │                         │
  └────────────┘ (reject)     │                         │
  ↑                           │                         │
  └───────────────────────────┘ (revise)                │
  ↑                                                     │
  └─────────────────────────────────────────────────────┘ (reopen)
```

Note: There is no REJECTED status. Rejection returns the article to DRAFT status with reviewer notes attached.

### State Transition Rules

| Transition | Required Permission | Additional Rules |
|-----------|-------------------|-----------------|
| DRAFT → IN_REVIEW | `articles.submit_review` | Author must be current user, or user has `articles.update` |
| IN_REVIEW → APPROVED | `articles.review` | Sets `reviewer_id` and `review_date` |
| IN_REVIEW → DRAFT (reject) | `articles.review` | Must include `review_notes` |
| APPROVED → DRAFT (revise) | `articles.publish` | Sends back for further edits before publishing |
| APPROVED → PUBLISHED | `articles.publish` | Sets `published_at` timestamp |
| PUBLISHED → ARCHIVED | `articles.publish` | |
| ARCHIVED → DRAFT | `articles.publish` | Re-opens for editing |

## RBAC Permissions

### Article Permissions (added to existing Rights model)

| Permission | What it enables |
|-----------|----------------|
| `articles.create` | Create new articles |
| `articles.read` | View articles (all statuses in dashboard, published-only for public) |
| `articles.update` | Edit any article regardless of author |
| `articles.delete` | Delete articles |
| `articles.submit_review` | Move own article from DRAFT → IN_REVIEW |
| `articles.review` | Move IN_REVIEW → APPROVED or back to DRAFT (with notes) |
| `articles.publish` | Move APPROVED → PUBLISHED, or PUBLISHED → ARCHIVED |

### Pillar Permissions

| Permission | What it enables |
|-----------|----------------|
| `pillars.create` | Create new pillars (superadmin typically) |
| `pillars.update` | Edit/reorder/deactivate pillars |
| `pillars.delete` | Delete pillars (only if no content linked) |

### Recommended Role Templates (documented, not hardcoded)

| Role | Permissions |
|------|------------|
| Coach/Author | articles.create, articles.read, articles.submit_review |
| Editor | articles.create, articles.read, articles.update, articles.submit_review, articles.review |
| Publisher | articles.create, articles.read, articles.update, articles.submit_review, articles.review, articles.publish |
| Admin | All article + pillar permissions |

## API Endpoints

### Article Endpoints (`/api/v1/articles/`)

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `POST` | `/` | `articles.create` | Create article (status=DRAFT) |
| `GET` | `/` | `articles.read` | List articles (filter by pillar, status, author) |
| `GET` | `/{article_uuid}` | `articles.read` | Get single article |
| `PUT` | `/{article_uuid}` | `articles.update`, or `articles.create` if author owns the article and it is in DRAFT status | Update content/metadata |
| `DELETE` | `/{article_uuid}` | `articles.delete` | Delete article |
| `POST` | `/{article_uuid}/submit` | `articles.submit_review` | DRAFT → IN_REVIEW |
| `POST` | `/{article_uuid}/approve` | `articles.review` | IN_REVIEW → APPROVED |
| `POST` | `/{article_uuid}/reject` | `articles.review` | IN_REVIEW → DRAFT (requires review_notes) |
| `POST` | `/{article_uuid}/publish` | `articles.publish` | APPROVED → PUBLISHED |
| `POST` | `/{article_uuid}/revise` | `articles.publish` | APPROVED → DRAFT (send back for edits) |
| `POST` | `/{article_uuid}/archive` | `articles.publish` | PUBLISHED → ARCHIVED |
| `POST` | `/{article_uuid}/reopen` | `articles.publish` | ARCHIVED → DRAFT |
| `GET` | `/{article_uuid}/versions` | `articles.read` | List version history |
| `POST` | `/{article_uuid}/versions/{version}/restore` | `articles.update` | Restore to version |

### Pillar Endpoints (`/api/v1/pillars/`)

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/` | public | List active pillars (filtered by org if applicable) |
| `POST` | `/` | `pillars.create` | Create pillar |
| `PUT` | `/{pillar_id}` | `pillars.update` | Update pillar |
| `DELETE` | `/{pillar_id}` | `pillars.delete` | Delete pillar (only if no content linked) |
| `GET` | `/{pillar_id}/content` | `articles.read` | List articles + courses for a pillar (dashboard use; will be made public in Sub-project 4) |

### Course Endpoint Extensions

- `PUT /api/v1/courses/{uuid}` — accept `pillar_id` and `related_articles`
- `GET /api/v1/courses/{uuid}` — include pillar and related articles in response

## Frontend

### Article Dashboard (org dashboard)

**Article list page** (`/dash/articles/`):
- Table: title, pillar, status (color-coded badge), author, updated date
- Filters: by pillar, by status, by author
- Search by title
- "+ New Article" button
- Status-specific action buttons (Submit, Approve, Reject, Publish) shown based on user's permissions

**Article editor page** (`/dash/articles/[articleuuid]/edit`):
- Reuses the existing TipTap editor component (zero new editor code)
- Sidebar/header: title, slug (auto-from-title), summary, featured image, pillar selector, related courses (multi-select)
- Status bar showing current editorial state + available transitions
- Version history panel (same pattern as activity editor)
- Auto-save to draft

**Review panel** (for editors):
- Visible when article is IN_REVIEW
- Approve / Reject buttons
- Review notes text field (required on reject)
- Shows who submitted and when

### Pillar Management (admin panel at admin.localhost:3000)

**Pillars page** in superadmin nav:
- CRUD table: name, slug, icon, display order, active status, content count
- Drag-to-reorder or manual display_order editing
- Deactivate toggle (hides from public, content preserved)

### Org Dashboard Integration

- Add "Articles" link to org dashboard sidebar
- Org dashboard home shows article counts by status

## Documentation Deliverables

These are part of the definition of "done" — not afterthoughts.

### 1. Editorial Workflow Guide (`docs/guides/editorial-workflow.md`)
- Explains the 5 statuses and what each means
- Flow diagram
- Who can do what (with reference to permissions)
- How to submit, approve, reject, publish
- What happens on rejection (back to draft with notes)

### 2. Role Setup Guide (`docs/guides/role-setup.md`)
- Lists all article and pillar permissions with plain-English descriptions
- 4 recommended role templates (Coach, Editor, Publisher, Admin)
- Step-by-step: create a role, assign permissions, assign to users
- Common scenarios with solutions

### 3. Pillar Management Guide (`docs/guides/pillar-management.md`)
- How to add/edit/reorder/deactivate pillars
- What happens when a pillar is deactivated
- How pillars relate to articles and courses
- Default pillars explanation

## Testing & Verification Criteria

1. **Article CRUD** — create, read, update, delete articles via API and dashboard UI
2. **Editorial flow** — article moves through Draft → In Review → Approved → Published correctly, rejection sends back to Draft with notes
3. **Permissions enforced** — users without required permissions cannot perform restricted transitions
4. **Versioning** — editing creates version history, restoring a version works
5. **Pillar CRUD** — create, edit, reorder, deactivate pillars via admin UI
6. **Pillar classification** — articles and courses can be assigned to a pillar, filtering by pillar returns correct content
7. **Cross-references** — article shows related courses, course shows related articles
8. **Editor works** — TipTap editor loads for articles with all block types, auto-saves
9. **Default pillars seeded** — install seeds 6 initial pillars (Nutrition, Movement, Sleep, Mental Health, Medicine, Health Tech)
10. **Documentation exists** — editorial workflow guide, role setup guide, pillar management guide in `docs/guides/`

## Success Criteria

1. All 10 verification criteria pass
2. No LearnHouse core course/activity models modified (clean separation)
3. Article content uses the same TipTap JSON format as activities (editor reuse)
4. RBAC permissions integrate with LearnHouse's existing Rights model
5. Alembic migrations for all new tables and extensions
6. All new endpoints documented in FastAPI auto-docs (Swagger)
7. Documentation guides are written and accessible

## Reference Documents

| File | Purpose |
|------|---------|
| `docs/superpowers/specs/2026-03-20-paths-auth-user-management-design.md` | Sub-project 1 spec (auth, tiers, orgs) |
| `LIMITLESS LMS ATOMIC LEARNING UNIT SCHEMA.md` | Inspirational reference for content model (not authoritative) |
| `LIMITLESS LMS ROADMAP FOR COURSE LAUNCH.md` | Inspirational reference for AI integration (not authoritative) |
