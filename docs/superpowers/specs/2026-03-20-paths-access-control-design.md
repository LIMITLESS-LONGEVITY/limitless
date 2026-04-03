# PATHS Platform — Sub-project 3: Content Organization + Access Control

**Date:** 2026-03-20
**Status:** Draft
**Platform:** LearnHouse (FastAPI + Next.js)
**Approach:** Service-Layer Access Check (Approach B)

## Context

Sub-projects 1 (Auth) and 2 (CMS) are complete. The platform has membership tiers with `permissions.content_access` arrays, articles with editorial workflow, and content pillars. This sub-project connects them — determining which content each user can see.

**Content strategy recap:** Articles serve free/regular tiers. Courses serve premium/enterprise. Articles can be cross-referenced from courses.

## Scope

### In scope
- `access_level` field on Article (tier-gating tag)
- `default_access_level` field on ContentPillar (inherited by new articles)
- `content_access_level` field on Organization (grants platform-wide access to org members)
- Access control service with `can_user_access_article()` function
- "Highest wins" logic: effective access = union of individual tier + org access level
- Org-specific content visibility (org members only)
- Course cross-reference bypass (articles linked from courses skip tier check)
- Filtering on article list and pillar content endpoints
- Locked article metadata (title/summary visible, content hidden)
- Access info endpoint for frontend lock/upgrade UI

### Out of scope
- Modifying LearnHouse's existing course access control (courses keep their system)
- Public-facing browse UI (Sub-project 4)
- Payment/upgrade flow (Sub-project 6)
- Per-article override of org visibility rules

## Data Model Changes

### Access Level Values (shared enum/constant)

Valid access level values are defined as a Python enum and validated on write:

```python
class AccessLevel(str, Enum):
    FREE = "free"
    REGULAR = "regular"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"
```

All `access_level`, `default_access_level`, and `content_access_level` fields use these values. The `content_access` arrays in MembershipTier permissions must also use these values. Case-sensitive, always lowercase. Invalid values are rejected with 422.

This enum is defined in a shared module (`src/db/access_levels.py`) and imported by Article, ContentPillar, Organization, and the access control service.

### Article extension
- Add `access_level` (string, default "free", validated against AccessLevel enum) — the tier tag that gates this article
- Add to `ArticleCreate`, `ArticleRead`, `ArticleUpdate` schemas

### ContentPillar extension
- Add `default_access_level` (string, default "free", validated against AccessLevel enum) — new articles in this pillar inherit this value
- Add to `ContentPillarCreate`, `ContentPillarRead`, `ContentPillarUpdate` schemas

### Organization extension
- Add `content_access_level` (string, default "free", validated against AccessLevel enum) — platform-wide access level granted to all org members
- Add to `OrganizationUpdate` and `OrganizationRead` schemas
- Administered by superadmins via the existing org settings endpoint

### Unchanged
- MembershipTier — already has `permissions.content_access` array
- UserMembership — already links users to tiers
- Course — keeps existing LearnHouse access control

### How access connects

```
User → UserMembership → MembershipTier.permissions.content_access = ["free", "premium"]
User → UserOrganization → Organization.content_access_level = "premium"
Effective access = union of both → {"free", "premium"}

Article.access_level = "premium"
→ "premium" in effective_access? → Yes → Access granted
```

## Access Control Service

### Core function

`can_user_access_article(user, article, db_session, context=None) → bool`

**Logic (in order):**

1. **Admin bypass:** If user has `articles.update` or `articles.publish` permission → allow. Admins/editors always see everything.

2. **Published check:** If article status is not PUBLISHED → deny (unless user is author, reviewer, or has editorial permissions — already handled by SP2 editorial workflow).

3. **Org-specific content check:** If article belongs to a non-default org, user must be a member of that org (via UserOrganization). If not → deny.

   **"Default org" definition:** The default org is the organization created during LearnHouse install (slug `"default"`, typically id=1). Platform-wide content belongs to this org. Any article with `org_id != default_org_id` is org-specific. The default org ID is resolved by querying `Organization WHERE slug = 'default'` (cached per-request or at startup).

4. **Course reference bypass:** If the request includes a valid `course_uuid` parameter AND the article's UUID appears in that course's `related_articles` array AND the user has access to the course (via LearnHouse's existing course access control) → allow. This is a server-side validation, not a simple query parameter flag.

5. **Effective access level calculation:**
   - Get user's tier `content_access` array from active UserMembership (where `status = 'active'` AND `expires_at` is NULL or in the future) → MembershipTier.permissions. Default for unauthenticated: `["free"]`.
   - Only one active membership per user is expected (enforced by partial unique index). If multiple exist defensively, union all their `content_access` arrays.
   - Get user's org `content_access_level` for each org they belong to.
   - Merge into a single set: `effective = set(tier_access) | {org_access_levels...}`.

6. **Access check:** `article.access_level in effective_access` → allow or deny.

### Helper functions

- `get_effective_access(user_id, db_session) → set[str]` — returns the merged access level set for a user. Result may be cached per-request (same user, same request = same access). For list endpoints, compute once and reuse.
- `filter_accessible_articles(articles, user_id, db_session) → list[Article]` — filters a list of articles, used by list endpoints. For performance on large lists, the article list endpoint should also apply a SQL-level `WHERE access_level IN (...)` clause using the user's effective access set, so inaccessible articles are never fetched from the DB.
- `get_article_access_info(user_id, article, db_session) → dict` — returns `{accessible, required_level, user_levels}` for frontend UI

### Anonymous/unauthenticated users

Effective access = `{"free"}`. They can see free published platform-wide articles only.

## API Changes

### Modified endpoints

| Endpoint | Change |
|----------|--------|
| `GET /articles/` | Filter results through access control. Add `include_locked` query param (default false). When true, returns all articles with a `locked` boolean flag — locked articles include metadata (title, summary, pillar, access_level) but NOT content. |
| `GET /articles/{uuid}` | Check access via `can_user_access_article()`. Return 403 if denied. Accept `?course_uuid=<uuid>` param — if provided, server validates the article is in the course's `related_articles` and the user has course access, then bypasses tier check. |
| `GET /pillars/{id}/content` | Filter articles through access control. |
| `PUT /articles/{uuid}` | Accept `access_level` field in update payload. |
| `POST /articles/` | Auto-set `access_level` from pillar's `default_access_level` if not explicitly provided. |

### New endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/articles/{uuid}/access` | public | Returns `{accessible: bool, required_level: string, user_levels: string[]}` — frontend uses this to show lock icon or upgrade prompt without exposing content |

### Article response changes

- `ArticleRead` includes `access_level` field
- A new `ArticleListItem` schema extends `ArticleRead` with a `locked: bool` field, used when `include_locked=true`. This keeps the OpenAPI docs clean and provides type safety for the frontend.
- Locked articles: title, summary, pillar, access_level, author, created/updated dates returned. `content` field is `null`.

### Admin/editorial bypass

All article operations by users with `action_update` or `action_publish` on their role's `ArticlePermissions` bypass access control. Access gating only applies to "consumer" read access (users with only `action_read`).

Note: The spec uses shorthand like "articles.update" to mean the `action_update` field on `ArticlePermissions` in the user's role's `Rights` object. The implementation uses the actual field names (`action_update`, `action_publish`, etc.).

## Testing & Verification Criteria

1. **Free article visible to anonymous user** — unauthenticated GET /articles/{uuid} for a free article returns 200
2. **Premium article blocked for free user** — user with free tier gets 403 on premium article
3. **Premium article visible to premium user** — user with premium tier can access premium article
4. **Org content hidden from non-members** — user not in org gets 403 on org-specific article
5. **Org member sees org content** — user in org can access org-specific articles
6. **Highest wins** — user with free tier but org with "premium" content_access_level can see premium platform content
7. **Course reference bypass** — premium article accessible with `?course_uuid=<valid_uuid>` when user has course access and article is in that course's related_articles. Fails without valid course_uuid or if article is not linked.
8. **Article list filtering** — GET /articles/ only returns articles the user can access
9. **Locked articles in dashboard** — GET /articles/?include_locked=true returns all articles with locked flag, locked ones have null content
10. **Access level inheritance** — new article inherits default_access_level from its pillar
11. **Admin bypass** — user with articles.update sees all articles regardless of access level

## Success Criteria

1. All 11 verification criteria pass
2. No modifications to LearnHouse's existing course access control
3. Access control logic is in a single service module (testable in isolation)
4. Alembic migrations for all model extensions
5. Anonymous users can access free published articles
6. Existing editorial workflow (SP2) is not broken by access control additions
