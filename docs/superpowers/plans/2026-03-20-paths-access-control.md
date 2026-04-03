# PATHS Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tier-based content gating to articles — determining which users can see which content based on their membership tier and org membership.

**Architecture:** Add `access_level` field to Article (validated against AccessLevel enum), `default_access_level` to ContentPillar, `content_access_level` to Organization. Build an access control service module with a single `can_user_access_article()` function that encodes all gating rules. Modify article API endpoints to filter/gate content. No new UI pages — access control is transparent to the API consumer.

**Tech Stack:** Python 3.13 / FastAPI / SQLModel / Alembic / PostgreSQL 16

**Spec:** `docs/superpowers/specs/2026-03-20-paths-access-control-design.md`

---

## File Structure

### Backend — New Files

| File | Responsibility |
|------|---------------|
| `apps/api/src/db/access_levels.py` | AccessLevel enum (shared constant) |
| `apps/api/src/services/access_control/__init__.py` | Package init |
| `apps/api/src/services/access_control/access_control.py` | Core access logic: can_user_access_article, get_effective_access, filter_accessible_articles |
| `apps/api/src/tests/test_access_control.py` | Access control service tests |
| `apps/api/migrations/versions/<auto>_add_access_level_fields.py` | Migration for all access_level fields |

### Backend — Modified Files

| File | Change |
|------|--------|
| `apps/api/src/db/articles.py` | Add `access_level` field + update schemas |
| `apps/api/src/db/content_pillars.py` | Add `default_access_level` field + update schemas |
| `apps/api/src/db/organizations.py` | Add `content_access_level` field + update schemas |
| `apps/api/src/routers/articles.py` | Add access control checks to GET endpoints, add /access endpoint |
| `apps/api/src/services/articles/articles.py` | Auto-set access_level from pillar on create |

---

## Tasks

### Task 1: AccessLevel Enum + Model Extensions

**Files:**
- Create: `learnhouse/apps/api/src/db/access_levels.py`
- Modify: `learnhouse/apps/api/src/db/articles.py`
- Modify: `learnhouse/apps/api/src/db/content_pillars.py`
- Modify: `learnhouse/apps/api/src/db/organizations.py`
- Create: Alembic migration
- Test: `learnhouse/apps/api/src/tests/test_access_control.py` (model tests)

- [ ] **Step 1: Create AccessLevel enum**

Create `learnhouse/apps/api/src/db/access_levels.py`:

```python
from enum import Enum


class AccessLevel(str, Enum):
    FREE = "free"
    REGULAR = "regular"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"
```

- [ ] **Step 2: Add access_level to Article model**

In `src/db/articles.py`:

Add `access_level` directly to the `Article` table class. Since Article already uses `sa_column` for several fields, follow the same pattern. If `access_level` is simple enough to go on `ArticleBase` (no sa_column needed — it's just a string with a default), that's fine too — read the existing code and match the pattern:

```python
from src.db.access_levels import AccessLevel
# If adding to ArticleBase (simplest — inherits to schemas):
access_level: str = Field(default=AccessLevel.FREE.value)
# Or if table-only with sa_column:
# access_level: str = Field(default=AccessLevel.FREE.value, sa_column=Column(String, default="free"))
```

The key point: `ArticleRead` MUST include `access_level` in its response. If it inherits from Base, this is automatic. If not, add it explicitly.

Add to `ArticleCreate`:
```python
access_level: Optional[str] = None  # Auto-set from pillar if not provided
```

Add to `ArticleRead`:
```python
access_level: str = AccessLevel.FREE.value
```

Add to `ArticleUpdate`:
```python
access_level: Optional[str] = None
```

Create `ArticleListItem` schema (extends ArticleRead with locked field):
```python
class ArticleListItem(ArticleRead):
    locked: bool = False
```

- [ ] **Step 3: Add default_access_level to ContentPillar**

In `src/db/content_pillars.py`, add to `ContentPillarBase`:
```python
default_access_level: str = Field(default=AccessLevel.FREE.value)
```

Add to `ContentPillarUpdate`:
```python
default_access_level: Optional[str] = None
```

- [ ] **Step 4: Add content_access_level to Organization**

In `src/db/organizations.py`, add to the `Organization` table class (sa_column, not Base):
```python
content_access_level: str = Field(default=AccessLevel.FREE.value)
```

Add to `OrganizationUpdate` and `OrganizationRead` as plain Optional fields.

- [ ] **Step 5: Write model tests**

Test: AccessLevel enum values, Article with access_level, ContentPillar with default_access_level, ArticleListItem schema with locked field.

- [ ] **Step 6: Generate and apply Alembic migration**

```bash
cd learnhouse/apps/api
uv run alembic revision --autogenerate -m "add_access_level_fields"
# Clean of EE drops. Should add:
# - articles.access_level (VARCHAR, default 'free')
# - content_pillars.default_access_level (VARCHAR, default 'free')
# - organization.content_access_level (VARCHAR, default 'free')
uv run alembic upgrade head
```

- [ ] **Step 7: Commit**

```bash
cd learnhouse && git commit -m "feat: add AccessLevel enum and access_level fields to Article, ContentPillar, Organization"
```

---

### Task 2: Access Control Service

**Files:**
- Create: `learnhouse/apps/api/src/services/access_control/__init__.py`
- Create: `learnhouse/apps/api/src/services/access_control/access_control.py`
- Test: `learnhouse/apps/api/src/tests/test_access_control.py` (service logic tests)

- [ ] **Step 1: Write access control service**

Create `src/services/access_control/access_control.py`:

```python
from datetime import datetime
from typing import Optional, Set
from sqlmodel import Session, select
from src.db.articles import Article, ArticleRead, ArticleListItem
from src.db.access_levels import AccessLevel
from src.db.user_memberships import UserMembership
from src.db.membership_tiers import MembershipTier
from src.db.user_organizations import UserOrganization
from src.db.organizations import Organization
from src.db.courses.courses import Course


# Default org slug — platform-wide content belongs to this org
DEFAULT_ORG_SLUG = "default"
_default_org_id_cache: Optional[int] = None


def _get_default_org_id(db_session: Session) -> int:
    """Get the default org ID (cached after first call)."""
    global _default_org_id_cache
    if _default_org_id_cache is not None:
        return _default_org_id_cache
    org = db_session.exec(
        select(Organization).where(Organization.slug == DEFAULT_ORG_SLUG)
    ).first()
    if org:
        _default_org_id_cache = org.id
    return _default_org_id_cache or 1


def get_effective_access(user_id: Optional[int], db_session: Session) -> Set[str]:
    """
    Get the merged access level set for a user.
    Combines: individual tier content_access + org content_access_levels.
    Anonymous users (user_id=None) get {"free"}.
    """
    if user_id is None:
        return {AccessLevel.FREE.value}

    access = set()

    # 1. Get tier access from active membership
    now = str(datetime.now())
    membership_result = db_session.exec(
        select(UserMembership, MembershipTier)
        .join(MembershipTier, UserMembership.tier_id == MembershipTier.id)
        .where(UserMembership.user_id == user_id)
        .where(UserMembership.status == "active")
    ).all()

    for membership, tier in membership_result:
        # Check expires_at
        if membership.expires_at and membership.expires_at < now:
            continue
        content_access = tier.permissions.get("content_access", ["free"])
        access.update(content_access)

    # 2. Get org access levels
    org_results = db_session.exec(
        select(UserOrganization, Organization)
        .join(Organization, UserOrganization.org_id == Organization.id)
        .where(UserOrganization.user_id == user_id)
    ).all()

    for user_org, org in org_results:
        org_level = getattr(org, "content_access_level", None)
        if org_level:
            access.add(org_level)

    # Default: at least free
    if not access:
        access.add(AccessLevel.FREE.value)

    return access


def can_user_access_article(
    user_id: Optional[int],
    article: Article,
    db_session: Session,
    user_article_permissions: Optional[dict] = None,
    course_uuid: Optional[str] = None,
) -> bool:
    """
    Core access control function.
    Returns True if the user can access this article.
    """
    # 1. Admin bypass
    if user_article_permissions:
        if user_article_permissions.get("action_update") or user_article_permissions.get("action_publish"):
            return True

    # 2. Published check
    if article.status != "PUBLISHED":
        return False  # Editorial workflow handles non-published access

    # 3. Org-specific content check
    default_org_id = _get_default_org_id(db_session)
    if article.org_id != default_org_id:
        # Org-specific — user must be a member
        if user_id is None:
            return False
        is_member = db_session.exec(
            select(UserOrganization)
            .where(UserOrganization.user_id == user_id)
            .where(UserOrganization.org_id == article.org_id)
        ).first()
        if not is_member:
            return False

    # 4. Course reference bypass
    if course_uuid and user_id:
        course = db_session.exec(
            select(Course).where(Course.course_uuid == course_uuid)
        ).first()
        if course and course.related_articles:
            if article.article_uuid in course.related_articles:
                # Verify user has course access via LearnHouse's existing system
                # Check: course is published+public, OR user is in a UserGroup with access,
                # OR user is a ResourceAuthor on the course
                from src.services.courses.courses import _user_can_view_unpublished_course
                if course.published and course.public:
                    return True  # Public published course — anyone can access
                # For non-public courses, check if user has access
                # (enrolled via UserGroup or is a ResourceAuthor)
                from src.db.usergroups import UserGroupUser
                from src.db.resource_authors import ResourceAuthor
                has_group_access = db_session.exec(
                    select(UserGroupUser)
                    .join(UserGroupResource, UserGroupUser.usergroup_id == UserGroupResource.usergroup_id)
                    .where(UserGroupUser.user_id == user_id)
                    .where(UserGroupResource.resource_uuid == course.course_uuid)
                ).first()
                is_author = db_session.exec(
                    select(ResourceAuthor)
                    .where(ResourceAuthor.user_id == user_id)
                    .where(ResourceAuthor.resource_uuid == course.course_uuid)
                ).first()
                if has_group_access or is_author:
                    return True

    # 5. Effective access check
    effective = get_effective_access(user_id, db_session)

    # 6. Access level check
    return article.access_level in effective


def filter_accessible_articles(
    articles: list,
    user_id: Optional[int],
    db_session: Session,
    user_article_permissions: Optional[dict] = None,
) -> list:
    """Filter a list of articles to only those the user can access."""
    effective = get_effective_access(user_id, db_session)
    default_org_id = _get_default_org_id(db_session)

    # Get user's org memberships for org-specific check
    user_org_ids = set()
    if user_id:
        orgs = db_session.exec(
            select(UserOrganization.org_id)
            .where(UserOrganization.user_id == user_id)
        ).all()
        user_org_ids = {org_id for (org_id,) in orgs}

    result = []
    for article in articles:
        # Admin bypass
        if user_article_permissions and (
            user_article_permissions.get("action_update") or
            user_article_permissions.get("action_publish")
        ):
            result.append(article)
            continue

        # Published only
        if article.status != "PUBLISHED":
            continue

        # Org check
        if article.org_id != default_org_id and article.org_id not in user_org_ids:
            continue

        # Access level check
        if article.access_level in effective:
            result.append(article)

    return result


def get_article_access_info(
    user_id: Optional[int],
    article: Article,
    db_session: Session,
) -> dict:
    """Return access info for frontend lock/upgrade UI."""
    effective = get_effective_access(user_id, db_session)
    accessible = article.access_level in effective
    return {
        "accessible": accessible,
        "required_level": article.access_level,
        "user_levels": sorted(list(effective)),
    }
```

- [ ] **Step 2: Write comprehensive access control tests**

Test all 11 verification criteria:
1. Free article visible to anonymous user (user_id=None)
2. Premium article blocked for free user
3. Premium article visible for premium user
4. Org content hidden from non-members
5. Org member sees org content
6. Highest wins (free tier + premium org = premium access)
7. Course reference bypass
8. List filtering
9. Locked articles with include_locked
10. Access level inheritance from pillar (tested in Task 3)
11. Admin bypass

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add access control service with tier-based content gating"
```

---

### Task 3: API Integration — Article Endpoints

**Files:**
- Modify: `learnhouse/apps/api/src/routers/articles.py`
- Modify: `learnhouse/apps/api/src/services/articles/articles.py`

- [ ] **Step 1: Add access_level auto-set on article creation**

In `src/services/articles/articles.py`, in the `create_article` function:

After creating the article, if `access_level` was not provided in the request data, look up the pillar's `default_access_level` and set it:

```python
if not data.access_level and article.pillar_id:
    pillar = db_session.get(ContentPillar, article.pillar_id)
    if pillar:
        article.access_level = pillar.default_access_level
```

- [ ] **Step 2: Add access control to GET /articles/{uuid}**

In the articles router, modify `api_get_article`:

```python
from src.services.access_control.access_control import can_user_access_article

# After fetching the article:
course_uuid = request.query_params.get("course_uuid")
if not can_user_access_article(
    user_id=current_user.id if hasattr(current_user, 'id') else None,
    article=article,
    db_session=db_session,
    user_article_permissions=user_rights,  # from RBAC
    course_uuid=course_uuid,
):
    raise HTTPException(status_code=403, detail="Access denied — upgrade your membership to view this content")
```

- [ ] **Step 3: Add access control to GET /articles/ list**

Modify `api_list_articles` to:
- Accept `include_locked` query param (default false)
- Apply SQL-level `WHERE access_level IN (...)` filter using user's effective access
- If `include_locked=true`, return all articles with `locked` flag (locked articles have `content=null`)

```python
from src.services.access_control.access_control import get_effective_access

# Get user's effective access
user_id = current_user.id if hasattr(current_user, 'id') else None
effective = get_effective_access(user_id, db_session)

# If include_locked: fetch all, mark locked
# If not include_locked: filter at SQL level
if not include_locked:
    query = query.where(Article.access_level.in_(effective))
```

For include_locked response, use `ArticleListItem` with the `locked` field.

- [ ] **Step 4: Add access control to GET /pillars/{id}/content**

Filter the articles returned by the pillar content endpoint through access control.

- [ ] **Step 5: Add GET /articles/{uuid}/access endpoint**

New endpoint in articles router:

```python
@router.get("/{article_uuid}/access")
async def api_get_article_access(
    article_uuid: str,
    current_user=Depends(get_current_user),
    db_session=Depends(get_db_session),
):
    article = db_session.exec(
        select(Article).where(Article.article_uuid == article_uuid)
    ).first()
    if not article:
        raise HTTPException(status_code=404)

    user_id = current_user.id if hasattr(current_user, 'id') else None
    return get_article_access_info(user_id, article, db_session)
```

- [ ] **Step 6: Validate access_level on write endpoints**

In both `create_article` and `update_article` services, validate that `access_level` is a valid `AccessLevel` enum value:

```python
from src.db.access_levels import AccessLevel

if data.access_level and data.access_level not in [e.value for e in AccessLevel]:
    raise HTTPException(status_code=422, detail=f"Invalid access_level: {data.access_level}")
```

- [ ] **Step 7: Test via curl**

```bash
# Create a premium article
curl -X POST "http://127.0.0.1:9000/api/v1/articles/?org_id=1" \
  -H "Content-Type: application/json" \
  -b "access_token=..." \
  -d '{"title": "Premium Content", "access_level": "premium"}'

# Try accessing without premium tier (should 403)
# Try accessing with premium tier (should 200)
# Try with include_locked=true (should show as locked)
```

- [ ] **Step 8: Commit**

```bash
git commit -m "feat: integrate access control into article API endpoints"
```

---

### Task 4: End-to-End Verification

**Files:** None — verification task.

- [ ] **Step 0: Verify migration applied**
Check that the 3 new columns exist:
```bash
# Via psql or curl to verify:
# articles.access_level (default 'free')
# content_pillars.default_access_level (default 'free')
# organization.content_access_level (default 'free')
```

- [ ] **Step 1: Free article visible to anonymous**
Create a free article. Fetch without auth cookies → 200.

- [ ] **Step 2: Premium article blocked for free user**
Create a premium article. Fetch as user with free tier → 403.

- [ ] **Step 3: Premium article visible to premium user**
Assign premium tier to user. Fetch premium article → 200.

- [ ] **Step 4: Org content hidden from non-members**
Create article in a non-default org. Fetch as user not in that org → 403.

- [ ] **Step 5: Org member sees org content**
Add user to the org. Fetch again → 200.

- [ ] **Step 6: Highest wins**
User with free tier, but org with content_access_level="premium". Fetch premium platform article → 200.

- [ ] **Step 7: Course reference bypass**
Create premium article, link it from a course's related_articles. Fetch with `?course_uuid=...` as free user → 200. Without course_uuid → 403.

- [ ] **Step 8: Article list filtering**
Create mix of free and premium articles. List as free user → only free articles. List with include_locked=true → all articles, premium ones have locked=true and content=null.

- [ ] **Step 9: Access level inheritance**
Set a pillar's default_access_level to "premium". Create article in that pillar without specifying access_level. Verify article.access_level is "premium".

- [ ] **Step 10: Admin bypass**
User with action_update permission fetches premium article → 200 (bypasses tier check).

- [ ] **Step 11: Invalid access_level rejected**
Try creating article with access_level="invalid" → 422.

- [ ] **Step 12: Commit any remaining fixes**

```bash
git commit -m "chore: complete access control E2E verification"
```

---

## Verification Checklist (all must pass)

- [ ] Free article visible to anonymous user
- [ ] Premium article blocked for free user (403)
- [ ] Premium article visible for premium user
- [ ] Org content hidden from non-members (403)
- [ ] Org member sees org content
- [ ] Highest wins (free tier + premium org = premium access)
- [ ] Course reference bypass works with valid course_uuid
- [ ] Article list filters by access level
- [ ] Locked articles: include_locked=true returns metadata only
- [ ] Access level inheritance from pillar
- [ ] Admin bypass works
- [ ] Invalid access_level rejected with 422
