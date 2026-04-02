# PATHS Auth & User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy LearnHouse with shared cross-subdomain auth, configurable membership tiers, and org management extensions for the LIMITLESS PATHS educational platform.

**Architecture:** LearnHouse (FastAPI + Next.js) deployed via Docker at paths.limitless-longevity.health. Auth extended with cross-subdomain JWT cookies, a token validation endpoint for future services, and new MembershipTier/UserMembership models. Admin UI extended within LearnHouse's existing Next.js admin panel.

**Tech Stack:** Python 3.14 / FastAPI / SQLModel / Alembic / PostgreSQL 16 / Redis 7.2 / Next.js / React 19 / TypeScript / Docker

**Spec:** `docs/superpowers/specs/2026-03-20-paths-auth-user-management-design.md`

---

## File Structure

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `apps/api/src/db/membership_tiers.py` | MembershipTier SQLModel (table + CRUD schemas) |
| `apps/api/src/db/user_memberships.py` | UserMembership SQLModel (table + CRUD schemas) |
| `apps/api/src/routers/membership_tiers.py` | Tier CRUD endpoints (superadmin only) |
| `apps/api/src/routers/user_memberships.py` | User membership endpoints (assign, change, list) |
| `apps/api/src/routers/auth_validate.py` | `/api/v1/auth/validate` endpoint |
| `apps/api/src/services/membership_tiers/tiers.py` | Tier business logic |
| `apps/api/src/services/membership_tiers/user_memberships.py` | User membership business logic |
| `apps/api/src/services/auth/validate.py` | Token validation + caching logic |
| `apps/api/src/tests/test_membership_tiers.py` | Tier model + endpoint tests |
| `apps/api/src/tests/test_user_memberships.py` | User membership tests |
| `apps/api/src/tests/test_auth_validate.py` | Token validation endpoint tests |
| `apps/api/migrations/versions/<auto>_add_membership_tiers.py` | Alembic migration for new tables |
| `apps/api/migrations/versions/<auto>_extend_organizations.py` | Alembic migration for org_type + managed_by |

### Backend — Modified Files
| File | Change |
|------|--------|
| `apps/api/src/router.py` | Register new routers |
| `apps/api/src/security/auth.py` | Cookie domain scoping |
| `apps/api/src/db/organizations.py` | Add `org_type` and `managed_by` fields |
| `apps/api/src/routers/auth.py` | Update cookie settings on login/refresh |
| `apps/api/src/services/users/users.py` | Auto-assign free tier on registration |
| `apps/api/app.py` | Update CORS config for cross-subdomain |
| `apps/api/cli.py` | Seed default `free` tier on install |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `apps/web/app/admin/tiers/page.tsx` | Tier management page (superadmin) |
| `apps/web/components/Admin/Tiers/TierList.tsx` | Tier list component |
| `apps/web/components/Admin/Tiers/TierForm.tsx` | Create/edit tier form |
| `apps/web/components/Admin/Users/UserMembership.tsx` | Tier assignment on user detail |
| `apps/web/services/membership_tiers/tiers.ts` | Frontend API service for tiers |
| `apps/web/services/membership_tiers/user_memberships.ts` | Frontend API service for user memberships |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `apps/web/app/admin/` layout/nav | Add "Tiers" link to admin sidebar |
| `apps/web/app/admin/users/` | Add tier column + filter to user list |
| `apps/web/services/config/config.ts` | Ensure API URL supports cross-subdomain |

### Infrastructure
| File | Change |
|------|--------|
| `docker-compose.yml` (local dev) | LearnHouse + PostgreSQL + Redis |
| `.env` (local dev) | Config values for domain, DB, Redis |

---

## Tasks

### Task 1: LearnHouse Local Deployment

**Files:**
- Create: `docker-compose.dev.yml`
- Create: `.env.development`
- Modify: `.gitignore` (add LearnHouse-specific exclusions)

- [ ] **Step 1: Clone LearnHouse into the project**

```bash
git clone https://github.com/learnhouse/learnhouse.git learnhouse
```

This creates a `learnhouse/` directory containing the full LearnHouse codebase. All subsequent backend/frontend file paths are relative to this directory.

- [ ] **Step 2: Create development docker-compose**

Create `docker-compose.dev.yml` at project root:

```yaml
version: '3.8'
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: limitless
      POSTGRES_PASSWORD: limitless_dev
      POSTGRES_DB: limitless_paths
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

- [ ] **Step 3: Create `.env.development`**

```env
# Database
DATABASE_URL=postgresql://limitless:limitless_dev@localhost:5432/limitless_paths

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=limitless-dev-secret-change-in-production
COOKIE_DOMAIN=localhost

# LearnHouse
LEARNHOUSE_DOMAIN=localhost:3000
```

- [ ] **Step 4: Start database and Redis**

Run: `docker compose -f docker-compose.dev.yml up -d`
Expected: Both containers running, ports 5432 and 6379 accessible

- [ ] **Step 5: Install LearnHouse backend dependencies**

```bash
cd learnhouse/apps/api
pip install -r requirements.txt
```

- [ ] **Step 6: Run Alembic migrations**

```bash
cd learnhouse/apps/api
alembic upgrade head
```
Expected: All existing migrations apply successfully

- [ ] **Step 7: Run LearnHouse install CLI**

```bash
cd learnhouse/apps/api
python cli.py install
```
Expected: Creates default organization, admin user, default roles

- [ ] **Step 8: Start backend and verify**

```bash
cd learnhouse/apps/api
python -m uvicorn app:app --reload --port 9000
```
Expected: FastAPI server starts, `http://localhost:9000/api/v1/health` returns OK

- [ ] **Step 9: Install and start frontend**

```bash
cd learnhouse/apps/web
npm install
npm run dev
```
Expected: Next.js dev server at `http://localhost:3000`, login page renders

- [ ] **Step 10: Verify end-to-end login**

Log in with admin credentials created in Step 7. Verify dashboard loads. Check browser cookies — JWT tokens should be set.

- [ ] **Step 11: Update .gitignore and commit**

Add to `.gitignore`:
```
# LearnHouse
learnhouse/
docker-compose.dev.yml
.env.development
```

```bash
git add .gitignore docker-compose.dev.yml
git commit -m "Add LearnHouse dev environment with Docker Compose"
```

---

### Task 2: MembershipTier Model & Migration

**Files:**
- Create: `learnhouse/apps/api/src/db/membership_tiers.py`
- Create: `learnhouse/apps/api/migrations/versions/<auto>_add_membership_tiers.py`
- Test: `learnhouse/apps/api/src/tests/test_membership_tiers.py`

- [ ] **Step 1: Write the MembershipTier model test**

Create `learnhouse/apps/api/src/tests/test_membership_tiers.py`:

```python
import pytest
from sqlmodel import Session, select
from src.db.membership_tiers import MembershipTier, MembershipTierCreate


def test_create_membership_tier(db_session: Session):
    tier = MembershipTier(
        name="Free",
        slug="free",
        description="Basic free access",
        is_active=True,
        priority=0,
        permissions={"content_access": ["free"], "features": [], "max_courses": None},
    )
    db_session.add(tier)
    db_session.commit()
    db_session.refresh(tier)

    assert tier.id is not None
    assert tier.slug == "free"
    assert tier.permissions["content_access"] == ["free"]


def test_tier_slug_unique(db_session: Session):
    tier1 = MembershipTier(name="Free", slug="free", is_active=True, priority=0, permissions={})
    db_session.add(tier1)
    db_session.commit()

    tier2 = MembershipTier(name="Free 2", slug="free", is_active=True, priority=0, permissions={})
    db_session.add(tier2)
    with pytest.raises(Exception):  # IntegrityError
        db_session.commit()


def test_tier_create_schema():
    create = MembershipTierCreate(
        name="Premium",
        slug="premium",
        description="Full access",
        priority=10,
        permissions={"content_access": ["free", "premium"], "features": ["ai_tutor"], "max_courses": None},
    )
    assert create.slug == "premium"
    assert create.priority == 10
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd learnhouse/apps/api && python -m pytest src/tests/test_membership_tiers.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.db.membership_tiers'`

- [ ] **Step 3: Write the MembershipTier model**

Create `learnhouse/apps/api/src/db/membership_tiers.py`:

```python
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON


class MembershipTierBase(SQLModel):
    name: str
    slug: str = Field(unique=True, index=True)
    description: Optional[str] = None
    is_active: bool = Field(default=True)
    priority: int = Field(default=0)
    permissions: dict = Field(default={}, sa_column=Column(JSON))


class MembershipTier(MembershipTierBase, table=True):
    __tablename__ = "membership_tiers"
    id: Optional[int] = Field(default=None, primary_key=True)
    creation_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))
    update_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))


class MembershipTierCreate(MembershipTierBase):
    pass


class MembershipTierRead(MembershipTierBase):
    id: int
    creation_date: Optional[str] = None
    update_date: Optional[str] = None


class MembershipTierUpdate(SQLModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    permissions: Optional[dict] = None
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd learnhouse/apps/api && python -m pytest src/tests/test_membership_tiers.py -v`
Expected: All 3 tests PASS

- [ ] **Step 5: Generate Alembic migration**

```bash
cd learnhouse/apps/api
alembic revision --autogenerate -m "add_membership_tiers"
```
Expected: New migration file created in `migrations/versions/`

- [ ] **Step 6: Apply migration**

```bash
cd learnhouse/apps/api
alembic upgrade head
```
Expected: `membership_tiers` table created in PostgreSQL

- [ ] **Step 7: Commit**

```bash
git add learnhouse/apps/api/src/db/membership_tiers.py learnhouse/apps/api/src/tests/test_membership_tiers.py learnhouse/apps/api/migrations/versions/*add_membership_tiers*
git commit -m "feat: add MembershipTier model with slug uniqueness and permissions JSON"
```

---

### Task 3: UserMembership Model & Migration

**Files:**
- Create: `learnhouse/apps/api/src/db/user_memberships.py`
- Create: `learnhouse/apps/api/migrations/versions/<auto>_add_user_memberships.py`
- Test: `learnhouse/apps/api/src/tests/test_user_memberships.py`

- [ ] **Step 1: Write the UserMembership model test**

Create `learnhouse/apps/api/src/tests/test_user_memberships.py`:

```python
import pytest
from sqlmodel import Session, select
from src.db.user_memberships import UserMembership
from src.db.membership_tiers import MembershipTier
from src.db.users import User


def test_create_user_membership(db_session: Session, test_user: User, free_tier: MembershipTier):
    membership = UserMembership(
        user_id=test_user.id,
        tier_id=free_tier.id,
        status="active",
        source="manual",
    )
    db_session.add(membership)
    db_session.commit()
    db_session.refresh(membership)

    assert membership.id is not None
    assert membership.status == "active"
    assert membership.source == "manual"


def test_only_one_active_membership_per_user(
    db_session: Session, test_user: User, free_tier: MembershipTier
):
    m1 = UserMembership(user_id=test_user.id, tier_id=free_tier.id, status="active", source="manual")
    db_session.add(m1)
    db_session.commit()

    m2 = UserMembership(user_id=test_user.id, tier_id=free_tier.id, status="active", source="manual")
    db_session.add(m2)
    with pytest.raises(Exception):  # IntegrityError from partial unique index
        db_session.commit()


def test_expired_memberships_allowed(
    db_session: Session, test_user: User, free_tier: MembershipTier
):
    m1 = UserMembership(user_id=test_user.id, tier_id=free_tier.id, status="expired", source="manual")
    m2 = UserMembership(user_id=test_user.id, tier_id=free_tier.id, status="active", source="manual")
    db_session.add_all([m1, m2])
    db_session.commit()

    results = db_session.exec(
        select(UserMembership).where(UserMembership.user_id == test_user.id)
    ).all()
    assert len(results) == 2
    active = [m for m in results if m.status == "active"]
    assert len(active) == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd learnhouse/apps/api && python -m pytest src/tests/test_user_memberships.py -v`
Expected: FAIL — import error

- [ ] **Step 3: Write the UserMembership model**

Create `learnhouse/apps/api/src/db/user_memberships.py`:

```python
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, UniqueConstraint


ALLOWED_SOURCES = ["manual", "payment", "promotion", "system"]
ALLOWED_STATUSES = ["active", "expired", "cancelled"]


class UserMembershipBase(SQLModel):
    user_id: int = Field(foreign_key="user.id", index=True)
    tier_id: int = Field(foreign_key="membership_tiers.id")
    status: str = Field(default="active")  # active | expired | cancelled
    source: str = Field(default="manual")  # manual | payment | promotion
    started_at: Optional[str] = Field(default_factory=lambda: str(datetime.now()))
    expires_at: Optional[str] = None
    updated_by: Optional[int] = Field(default=None, foreign_key="user.id")


class UserMembership(UserMembershipBase, table=True):
    __tablename__ = "user_memberships"
    # NOTE: Partial unique index (one active per user) is defined in Alembic migration only.
    # SQLModel/SQLAlchemy UniqueConstraint does not support PostgreSQL WHERE clauses.
    id: Optional[int] = Field(default=None, primary_key=True)
    creation_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))
    update_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))


class UserMembershipCreate(SQLModel):
    user_id: int
    tier_id: int
    source: str = "manual"
    expires_at: Optional[str] = None


class UserMembershipRead(UserMembershipBase):
    id: int
    creation_date: Optional[str] = None
    update_date: Optional[str] = None


class UserMembershipUpdate(SQLModel):
    status: Optional[str] = None
    tier_id: Optional[int] = None
    expires_at: Optional[str] = None
    updated_by: Optional[int] = None
```

Note: The partial unique index for PostgreSQL needs to be created in the Alembic migration directly since SQLModel's UniqueConstraint doesn't support WHERE clauses natively for PostgreSQL.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd learnhouse/apps/api && python -m pytest src/tests/test_user_memberships.py -v`
Expected: All 3 tests PASS

- [ ] **Step 5: Generate and customize Alembic migration**

```bash
cd learnhouse/apps/api
alembic revision --autogenerate -m "add_user_memberships"
```

Then edit the generated migration to add the PostgreSQL partial unique index:

```python
# Add at end of upgrade():
op.create_index(
    'ix_one_active_membership_per_user',
    'user_memberships',
    ['user_id'],
    unique=True,
    postgresql_where=sa.text("status = 'active'")
)
```

- [ ] **Step 6: Apply migration**

```bash
alembic upgrade head
```
Expected: `user_memberships` table created with partial unique index

- [ ] **Step 7: Commit**

```bash
git add learnhouse/apps/api/src/db/user_memberships.py learnhouse/apps/api/src/tests/test_user_memberships.py learnhouse/apps/api/migrations/versions/*add_user_memberships*
git commit -m "feat: add UserMembership model with one-active-per-user constraint"
```

---

### Task 4: Extend Organization Model

**Files:**
- Modify: `learnhouse/apps/api/src/db/organizations.py`
- Create: `learnhouse/apps/api/migrations/versions/<auto>_extend_organizations.py`

- [ ] **Step 1: Add org_type and managed_by fields**

In `learnhouse/apps/api/src/db/organizations.py`, add to `OrganizationBase`:

```python
org_type: Optional[str] = Field(default=None)  # medical | non_medical | hospitality | wellness
managed_by: str = Field(default="limitless")
```

Add to `OrganizationUpdate`:
```python
org_type: Optional[str] = None
managed_by: Optional[str] = None
```

Add to `OrganizationRead` (if not inherited from Base):
```python
org_type: Optional[str] = None
managed_by: Optional[str] = None
```

- [ ] **Step 2: Generate and apply migration**

```bash
cd learnhouse/apps/api
alembic revision --autogenerate -m "add_org_type_and_managed_by"
alembic upgrade head
```
Expected: Two new columns added to `organization` table

- [ ] **Step 3: Verify existing org endpoints still work**

Start the backend and test:
- `GET /api/v1/orgs` — should return orgs with new fields (null/default values)
- `PUT /api/v1/orgs/{uuid}` with `{"org_type": "medical"}` — should update

- [ ] **Step 4: Commit**

```bash
git add learnhouse/apps/api/src/db/organizations.py learnhouse/apps/api/migrations/versions/*add_org_type*
git commit -m "feat: extend Organization with org_type and managed_by fields"
```

---

### Task 5: Cookie Domain Scoping & CORS

**Files:**
- Modify: `learnhouse/apps/api/src/security/auth.py`
- Modify: `learnhouse/apps/api/src/routers/auth.py`
- Modify: `learnhouse/apps/api/app.py`
- Test: `learnhouse/apps/api/src/tests/test_auth_validate.py` (cookie domain tests)

- [ ] **Step 1: Write cookie domain test**

Create `learnhouse/apps/api/src/tests/test_cookie_domain.py`:

```python
import os
from unittest.mock import patch


def test_cookie_domain_from_env():
    with patch.dict(os.environ, {"COOKIE_DOMAIN": ".limitless-longevity.health"}):
        from src.security.auth import get_cookie_domain
        assert get_cookie_domain() == ".limitless-longevity.health"


def test_cookie_domain_default_none():
    with patch.dict(os.environ, {}, clear=True):
        from src.security.auth import get_cookie_domain
        result = get_cookie_domain()
        assert result is None  # None = browser default (current domain only)
```

- [ ] **Step 2: Add `get_cookie_domain` to auth module**

In `learnhouse/apps/api/src/security/auth.py`, add:

```python
import os

def get_cookie_domain() -> str | None:
    """Return cookie domain from env. None = current domain only (dev)."""
    return os.environ.get("COOKIE_DOMAIN", None)
```

- [ ] **Step 3: Update cookie settings in auth router**

In `learnhouse/apps/api/src/routers/auth.py`, find where cookies are set on login/refresh responses and add `domain=get_cookie_domain()`:

```python
from src.security.auth import get_cookie_domain

# In login endpoint, where response.set_cookie is called:
response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,
    secure=True,
    samesite="lax",
    domain=get_cookie_domain(),  # ADD THIS
    max_age=...,
)
# Same for refresh_token cookie
```

- [ ] **Step 4: Update CORS in app.py**

In `learnhouse/apps/api/app.py`, replace the existing CORS middleware with a custom one that dynamically reflects origins matching the cookie domain. FastAPI's CORSMiddleware does NOT support wildcard with `credentials: include`.

```python
import os
import re
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """CORS middleware that reflects matching subdomain origins."""

    def __init__(self, app, allowed_domain: str | None = None):
        super().__init__(app)
        self.allowed_domain = allowed_domain
        if allowed_domain:
            escaped = re.escape(allowed_domain.lstrip("."))
            self.pattern = re.compile(rf"^https?://([a-zA-Z0-9-]+\.)*{escaped}$")
        else:
            self.pattern = None

    def _is_allowed(self, origin: str) -> bool:
        if not origin:
            return False
        # Always allow localhost in dev
        if origin.startswith("http://localhost"):
            return True
        if self.pattern and self.pattern.match(origin):
            return True
        return False

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")

        if request.method == "OPTIONS":
            response = Response(status_code=200)
        else:
            response = await call_next(request)

        if self._is_allowed(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"

        return response


# Replace existing CORSMiddleware with:
app.add_middleware(
    DynamicCORSMiddleware,
    allowed_domain=os.environ.get("COOKIE_DOMAIN", None),
)
```

- [ ] **Step 5: Run tests**

Run: `cd learnhouse/apps/api && python -m pytest src/tests/test_cookie_domain.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add learnhouse/apps/api/src/security/auth.py learnhouse/apps/api/src/routers/auth.py learnhouse/apps/api/app.py learnhouse/apps/api/src/tests/test_cookie_domain.py
git commit -m "feat: add cross-subdomain cookie scoping and CORS config"
```

---

### Task 6: Token Validation Endpoint

**Files:**
- Create: `learnhouse/apps/api/src/routers/auth_validate.py`
- Create: `learnhouse/apps/api/src/services/auth/validate.py`
- Modify: `learnhouse/apps/api/src/router.py`
- Test: `learnhouse/apps/api/src/tests/test_auth_validate.py`

- [ ] **Step 1: Write validation endpoint tests**

Create `learnhouse/apps/api/src/tests/test_auth_validate.py`:

```python
import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_validate_returns_user_profile(client: AsyncClient, auth_cookies: dict):
    response = await client.get("/api/v1/auth/validate", cookies=auth_cookies)
    assert response.status_code == 200
    data = response.json()
    assert "user_id" in data
    assert "email" in data
    assert "tier" in data
    assert "orgs" in data


@pytest.mark.anyio
async def test_validate_returns_401_without_cookie(client: AsyncClient):
    response = await client.get("/api/v1/auth/validate")
    assert response.status_code == 401


@pytest.mark.anyio
async def test_validate_returns_tier_info(client: AsyncClient, auth_cookies: dict):
    response = await client.get("/api/v1/auth/validate", cookies=auth_cookies)
    data = response.json()
    tier = data["tier"]
    assert "slug" in tier
    assert "priority" in tier
    assert "permissions" in tier


@pytest.mark.anyio
async def test_validate_returns_org_memberships(client: AsyncClient, auth_cookies_with_org: dict):
    response = await client.get("/api/v1/auth/validate", cookies=auth_cookies_with_org)
    data = response.json()
    assert len(data["orgs"]) > 0
    org = data["orgs"][0]
    assert "slug" in org
    assert "org_type" in org
    assert "role" in org
```

- [ ] **Step 2: Write the validation service**

Create `learnhouse/apps/api/src/services/auth/validate.py`:

```python
import json
from typing import Optional
from sqlmodel import Session, select
from src.db.users import User
from src.db.user_memberships import UserMembership
from src.db.membership_tiers import MembershipTier
from src.db.user_organizations import UserOrganization
from src.db.organizations import Organization
from src.db.roles import Role
from src.core.events.database import get_redis


CACHE_TTL = 60  # seconds
BLACKLIST_PREFIX = "auth:blacklist:"
CACHE_PREFIX = "validate:"


async def is_user_blacklisted(user_id: int) -> bool:
    redis = get_redis()
    if redis:
        return await redis.exists(f"{BLACKLIST_PREFIX}{user_id}")
    return False


async def blacklist_user(user_id: int, ttl: int = 28800):
    """Blacklist a user's tokens. TTL=8hrs (access token lifetime)."""
    redis = get_redis()
    if redis:
        await redis.setex(f"{BLACKLIST_PREFIX}{user_id}", ttl, "1")


async def get_cached_validation(user_id: int, jwt_sig: str) -> Optional[dict]:
    redis = get_redis()
    if redis:
        cached = await redis.get(f"{CACHE_PREFIX}{user_id}:{jwt_sig}")
        if cached:
            return json.loads(cached)
    return None


async def cache_validation(user_id: int, jwt_sig: str, data: dict):
    redis = get_redis()
    if redis:
        await redis.setex(
            f"{CACHE_PREFIX}{user_id}:{jwt_sig}",
            CACHE_TTL,
            json.dumps(data),
        )


async def invalidate_user_cache(user_id: int):
    """Invalidate all cached validations for a user (e.g., after tier change)."""
    redis = get_redis()
    if redis:
        keys = await redis.keys(f"{CACHE_PREFIX}{user_id}:*")
        if keys:
            await redis.delete(*keys)


async def get_user_validation_data(user: User, db_session: Session) -> dict:
    # Get active membership
    membership = db_session.exec(
        select(UserMembership, MembershipTier)
        .join(MembershipTier, UserMembership.tier_id == MembershipTier.id)
        .where(UserMembership.user_id == user.id)
        .where(UserMembership.status == "active")
    ).first()

    tier_data = {"slug": "free", "priority": 0, "permissions": {}}
    if membership:
        _, tier = membership
        tier_data = {
            "slug": tier.slug,
            "priority": tier.priority,
            "permissions": tier.permissions,
        }

    # Get org memberships
    org_results = db_session.exec(
        select(UserOrganization, Organization, Role)
        .join(Organization, UserOrganization.org_id == Organization.id)
        .join(Role, UserOrganization.role_id == Role.id)
        .where(UserOrganization.user_id == user.id)
    ).all()

    orgs = []
    for user_org, org, role in org_results:
        orgs.append({
            "slug": org.slug,
            "org_type": getattr(org, "org_type", None),
            "role": role.name,
        })

    return {
        "user_id": user.id,
        "user_uuid": str(user.user_uuid),
        "email": user.email,
        "name": f"{user.first_name} {user.last_name}".strip(),
        "tier": tier_data,
        "orgs": orgs,
    }
```

- [ ] **Step 3: Write the validation router**

Create `learnhouse/apps/api/src/routers/auth_validate.py`:

```python
from fastapi import APIRouter, Depends, Request, HTTPException
from src.core.events.database import get_db_session
from src.security.auth import get_current_user
from src.services.auth.validate import (
    get_user_validation_data,
    get_cached_validation,
    cache_validation,
    is_user_blacklisted,
)
from src.services.security.rate_limiting import check_rate_limit

router = APIRouter()


@router.get("/validate")
# Rate limited: 60 requests/min per IP (uses LearnHouse's existing rate_limiting service)
async def validate_token(
    request: Request,
    user=Depends(get_current_user),
    db_session=Depends(get_db_session),
):
    # Rate limit: 60 req/min per IP
    client_ip = request.client.host if request.client else "unknown"
    await check_rate_limit(f"validate:{client_ip}", limit=60, window=60)

    # Reject anonymous users
    if not hasattr(user, "id") or user.id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check blacklist
    if await is_user_blacklisted(user.id):
        raise HTTPException(status_code=401, detail="User session revoked")

    # Check cache
    jwt_sig = request.cookies.get("access_token", "")[-16:]  # Last 16 chars as cache key
    cached = await get_cached_validation(user.id, jwt_sig)
    if cached:
        return cached

    # Build fresh validation data
    data = await get_user_validation_data(user, db_session)

    # Cache it
    await cache_validation(user.id, jwt_sig, data)

    return data
```

- [ ] **Step 4: Register router in `src/router.py`**

In `learnhouse/apps/api/src/router.py`, add:

```python
from src.routers.auth_validate import router as auth_validate_router
v1_router.include_router(auth_validate_router, prefix="/auth", tags=["Auth"])
```

- [ ] **Step 5: Run tests**

Run: `cd learnhouse/apps/api && python -m pytest src/tests/test_auth_validate.py -v`
Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add learnhouse/apps/api/src/routers/auth_validate.py learnhouse/apps/api/src/services/auth/validate.py learnhouse/apps/api/src/router.py learnhouse/apps/api/src/tests/test_auth_validate.py
git commit -m "feat: add /auth/validate endpoint with Redis caching and blacklist"
```

---

### Task 7: MembershipTier CRUD Endpoints

**Files:**
- Create: `learnhouse/apps/api/src/routers/membership_tiers.py`
- Create: `learnhouse/apps/api/src/services/membership_tiers/tiers.py`
- Modify: `learnhouse/apps/api/src/router.py`

- [ ] **Step 1: Write the tier service**

Create `learnhouse/apps/api/src/services/membership_tiers/tiers.py`:

```python
from typing import Optional
from sqlmodel import Session, select
from fastapi import HTTPException
from src.db.membership_tiers import (
    MembershipTier,
    MembershipTierCreate,
    MembershipTierUpdate,
    MembershipTierRead,
)


async def create_tier(tier_data: MembershipTierCreate, db_session: Session) -> MembershipTierRead:
    existing = db_session.exec(
        select(MembershipTier).where(MembershipTier.slug == tier_data.slug)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Tier with slug '{tier_data.slug}' already exists")

    tier = MembershipTier(**tier_data.model_dump())
    db_session.add(tier)
    db_session.commit()
    db_session.refresh(tier)
    return MembershipTierRead.model_validate(tier)


async def get_all_tiers(db_session: Session) -> list[MembershipTierRead]:
    tiers = db_session.exec(select(MembershipTier)).all()
    return [MembershipTierRead.model_validate(t) for t in tiers]


async def get_tier_by_id(tier_id: int, db_session: Session) -> MembershipTierRead:
    tier = db_session.get(MembershipTier, tier_id)
    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")
    return MembershipTierRead.model_validate(tier)


async def update_tier(
    tier_id: int, tier_data: MembershipTierUpdate, db_session: Session
) -> MembershipTierRead:
    tier = db_session.get(MembershipTier, tier_id)
    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")

    update_data = tier_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tier, key, value)

    db_session.add(tier)
    db_session.commit()
    db_session.refresh(tier)
    return MembershipTierRead.model_validate(tier)


async def get_tier_user_count(tier_id: int, db_session: Session) -> int:
    from sqlalchemy import func
    from src.db.user_memberships import UserMembership
    result = db_session.exec(
        select(func.count(UserMembership.id))
        .where(UserMembership.tier_id == tier_id)
        .where(UserMembership.status == "active")
    ).one()
    return result
```

- [ ] **Step 2: Write the tier router**

Create `learnhouse/apps/api/src/routers/membership_tiers.py`:

```python
from fastapi import APIRouter, Depends
from src.core.events.database import get_db_session
from src.security.auth import get_authenticated_user
from src.security.superadmin import require_superadmin
from src.db.membership_tiers import MembershipTierCreate, MembershipTierRead, MembershipTierUpdate
from src.services.membership_tiers.tiers import (
    create_tier,
    get_all_tiers,
    get_tier_by_id,
    update_tier,
    get_tier_user_count,
)

router = APIRouter(dependencies=[Depends(get_authenticated_user), Depends(require_superadmin)])


@router.get("/", response_model=list[MembershipTierRead])
async def api_get_all_tiers(db_session=Depends(get_db_session)):
    return await get_all_tiers(db_session)


@router.post("/", response_model=MembershipTierRead, status_code=201)
async def api_create_tier(
    tier_data: MembershipTierCreate,
    db_session=Depends(get_db_session),
):
    return await create_tier(tier_data, db_session)


@router.get("/{tier_id}", response_model=MembershipTierRead)
async def api_get_tier(tier_id: int, db_session=Depends(get_db_session)):
    return await get_tier_by_id(tier_id, db_session)


@router.put("/{tier_id}", response_model=MembershipTierRead)
async def api_update_tier(
    tier_id: int,
    tier_data: MembershipTierUpdate,
    db_session=Depends(get_db_session),
):
    return await update_tier(tier_id, tier_data, db_session)


@router.get("/{tier_id}/count")
async def api_get_tier_user_count(tier_id: int, db_session=Depends(get_db_session)):
    count = await get_tier_user_count(tier_id, db_session)
    return {"tier_id": tier_id, "active_users": count}
```

- [ ] **Step 3: Register router**

In `learnhouse/apps/api/src/router.py`, add:

```python
from src.routers.membership_tiers import router as membership_tiers_router
v1_router.include_router(membership_tiers_router, prefix="/tiers", tags=["Membership Tiers"])
```

- [ ] **Step 4: Test endpoints manually**

```bash
# Create a tier
curl -X POST http://localhost:9000/api/v1/tiers/ \
  -H "Content-Type: application/json" \
  -b "access_token=<your_token>" \
  -d '{"name": "Premium", "slug": "premium", "priority": 10, "permissions": {"content_access": ["free", "premium"], "features": ["ai_tutor"]}}'

# List tiers
curl http://localhost:9000/api/v1/tiers/ -b "access_token=<your_token>"
```
Expected: 201 for create, 200 for list with the tier data

- [ ] **Step 5: Commit**

```bash
git add learnhouse/apps/api/src/routers/membership_tiers.py learnhouse/apps/api/src/services/membership_tiers/tiers.py learnhouse/apps/api/src/router.py
git commit -m "feat: add MembershipTier CRUD endpoints (superadmin only)"
```

---

### Task 8: User Membership Assignment Endpoints

**Files:**
- Create: `learnhouse/apps/api/src/routers/user_memberships.py`
- Create: `learnhouse/apps/api/src/services/membership_tiers/user_memberships.py`
- Modify: `learnhouse/apps/api/src/router.py`
- Modify: `learnhouse/apps/api/src/services/users/users.py`

- [ ] **Step 1: Write the user membership service**

Create `learnhouse/apps/api/src/services/membership_tiers/user_memberships.py`:

```python
from datetime import datetime
from sqlmodel import Session, select
from fastapi import HTTPException
from src.db.user_memberships import UserMembership, UserMembershipCreate, UserMembershipRead
from src.db.membership_tiers import MembershipTier
from src.services.auth.validate import invalidate_user_cache


async def assign_tier_to_user(
    data: UserMembershipCreate,
    assigned_by: int,
    db_session: Session,
) -> UserMembershipRead:
    # Verify tier exists
    tier = db_session.get(MembershipTier, data.tier_id)
    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")

    # Expire current active membership
    current = db_session.exec(
        select(UserMembership)
        .where(UserMembership.user_id == data.user_id)
        .where(UserMembership.status == "active")
    ).first()

    if current:
        current.status = "expired"
        current.update_date = str(datetime.now())
        current.updated_by = assigned_by
        db_session.add(current)

    # Create new active membership
    membership = UserMembership(
        user_id=data.user_id,
        tier_id=data.tier_id,
        status="active",
        source=data.source,
        expires_at=data.expires_at,
        started_at=str(datetime.now()),
        updated_by=assigned_by,
    )
    db_session.add(membership)
    db_session.commit()
    db_session.refresh(membership)

    # Invalidate cached validation data
    await invalidate_user_cache(data.user_id)

    return UserMembershipRead.model_validate(membership)


async def get_user_active_membership(
    user_id: int, db_session: Session
) -> UserMembershipRead | None:
    membership = db_session.exec(
        select(UserMembership)
        .where(UserMembership.user_id == user_id)
        .where(UserMembership.status == "active")
    ).first()
    if membership:
        return UserMembershipRead.model_validate(membership)
    return None


async def get_user_membership_history(
    user_id: int, db_session: Session
) -> list[UserMembershipRead]:
    memberships = db_session.exec(
        select(UserMembership)
        .where(UserMembership.user_id == user_id)
        .order_by(UserMembership.id.desc())
    ).all()
    return [UserMembershipRead.model_validate(m) for m in memberships]


async def auto_assign_free_tier(user_id: int, db_session: Session):
    """Auto-assign free tier on user registration."""
    free_tier = db_session.exec(
        select(MembershipTier).where(MembershipTier.slug == "free")
    ).first()
    if not free_tier:
        return  # No free tier configured yet

    membership = UserMembership(
        user_id=user_id,
        tier_id=free_tier.id,
        status="active",
        source="system",
        started_at=str(datetime.now()),
    )
    db_session.add(membership)
    db_session.commit()
```

- [ ] **Step 2: Write the user membership router**

Create `learnhouse/apps/api/src/routers/user_memberships.py`:

```python
from fastapi import APIRouter, Depends
from src.core.events.database import get_db_session
from src.security.auth import get_authenticated_user
from src.security.superadmin import require_superadmin
from src.db.user_memberships import UserMembershipCreate, UserMembershipRead
from src.services.membership_tiers.user_memberships import (
    assign_tier_to_user,
    get_user_active_membership,
    get_user_membership_history,
)

router = APIRouter(dependencies=[Depends(get_authenticated_user), Depends(require_superadmin)])


@router.post("/assign", response_model=UserMembershipRead, status_code=201)
async def api_assign_tier(
    data: UserMembershipCreate,
    user=Depends(get_authenticated_user),
    db_session=Depends(get_db_session),
):
    return await assign_tier_to_user(data, assigned_by=user.id, db_session=db_session)


@router.get("/user/{user_id}/active", response_model=UserMembershipRead | None)
async def api_get_user_active(user_id: int, db_session=Depends(get_db_session)):
    return await get_user_active_membership(user_id, db_session)


@router.get("/user/{user_id}/history", response_model=list[UserMembershipRead])
async def api_get_user_history(user_id: int, db_session=Depends(get_db_session)):
    return await get_user_membership_history(user_id, db_session)
```

- [ ] **Step 3: Register router**

In `learnhouse/apps/api/src/router.py`:

```python
from src.routers.user_memberships import router as user_memberships_router
v1_router.include_router(user_memberships_router, prefix="/memberships", tags=["User Memberships"])
```

- [ ] **Step 4: Hook auto-assign into user registration**

In `learnhouse/apps/api/src/services/users/users.py`, find the `create_user` function. After the user is committed to the database, add:

```python
from src.services.membership_tiers.user_memberships import auto_assign_free_tier

# After db_session.commit() and db_session.refresh(user):
await auto_assign_free_tier(user.id, db_session)
```

- [ ] **Step 5: Test the full flow**

1. Register a new user → verify they have `free` tier via `/api/v1/memberships/user/{id}/active`
2. Assign `premium` tier → verify old membership is `expired`, new is `active`
3. Call `/api/v1/auth/validate` → verify tier shows correctly

- [ ] **Step 6: Commit**

```bash
git add learnhouse/apps/api/src/routers/user_memberships.py learnhouse/apps/api/src/services/membership_tiers/ learnhouse/apps/api/src/router.py learnhouse/apps/api/src/services/users/users.py
git commit -m "feat: add user membership assignment with auto-free-tier on registration"
```

---

### Task 8b: User Blacklist Trigger & Refresh Token Verification

**Files:**
- Modify: `learnhouse/apps/api/src/routers/user_memberships.py`
- Modify: `learnhouse/apps/api/src/db/user_organizations.py`
- Create: `learnhouse/apps/api/migrations/versions/<auto>_add_audit_fields_to_user_organizations.py`

- [ ] **Step 1: Add user deactivation/blacklist endpoint**

Add to `learnhouse/apps/api/src/routers/user_memberships.py`:

```python
from src.services.auth.validate import blacklist_user

@router.post("/user/{user_id}/revoke")
async def api_revoke_user_sessions(
    user_id: int,
    user=Depends(get_authenticated_user),
    db_session=Depends(get_db_session),
):
    """Immediately revoke all active sessions for a user (e.g., when removing from B2B org)."""
    await blacklist_user(user_id)
    return {"detail": f"All sessions revoked for user {user_id}"}
```

- [ ] **Step 2: Add audit fields to UserOrganization**

In `learnhouse/apps/api/src/db/user_organizations.py`, add to the `UserOrganization` model:

```python
update_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))
updated_by: Optional[int] = Field(default=None, foreign_key="user.id")
```

- [ ] **Step 3: Generate and apply migration**

```bash
cd learnhouse/apps/api
alembic revision --autogenerate -m "add_audit_fields_to_user_organizations"
alembic upgrade head
```

- [ ] **Step 4: Verify refresh token rotation**

Test LearnHouse's refresh behavior:
1. Log in, capture both access and refresh tokens from cookies
2. Wait for access token to expire (or shorten TTL temporarily)
3. Make a request — verify the refresh endpoint issues a new access token
4. Attempt to reuse the OLD refresh token — verify it is rejected (rotation) or still accepted (no rotation)

If old refresh tokens are NOT invalidated: add refresh token rotation by storing a token family ID in Redis and rejecting reused refresh tokens. If they ARE invalidated: document this as verified and move on.

- [ ] **Step 5: Commit**

```bash
git add learnhouse/apps/api/src/routers/user_memberships.py learnhouse/apps/api/src/db/user_organizations.py learnhouse/apps/api/migrations/versions/*audit_fields*
git commit -m "feat: add session revocation endpoint, audit fields on UserOrganization, verify refresh rotation"
```

---

### Task 9: Seed Free Tier on Install

**Files:**
- Modify: `learnhouse/apps/api/cli.py`

- [ ] **Step 1: Add tier seeding to CLI install command**

In `learnhouse/apps/api/cli.py`, find the `install` function. After default roles are created, add:

```python
from src.db.membership_tiers import MembershipTier

# Seed default free tier
existing_free = session.exec(
    select(MembershipTier).where(MembershipTier.slug == "free")
).first()
if not existing_free:
    free_tier = MembershipTier(
        name="Free",
        slug="free",
        description="Basic free access to public content",
        is_active=True,
        priority=0,
        permissions={"content_access": ["free"], "features": [], "max_courses": None},
    )
    session.add(free_tier)
    session.commit()
    print("Default 'free' membership tier created.")
```

- [ ] **Step 2: Test by running install on fresh DB**

```bash
cd learnhouse/apps/api
# Reset DB (drop and recreate), then:
alembic upgrade head
python cli.py install
```
Expected: Free tier created alongside default org and admin user

- [ ] **Step 3: Commit**

```bash
git add learnhouse/apps/api/cli.py
git commit -m "feat: seed default 'free' membership tier on install"
```

---

### Task 10: Admin UI — Tier Management Page

**Files:**
- Create: `learnhouse/apps/web/app/admin/tiers/page.tsx`
- Create: `learnhouse/apps/web/components/Admin/Tiers/TierList.tsx`
- Create: `learnhouse/apps/web/components/Admin/Tiers/TierForm.tsx`
- Create: `learnhouse/apps/web/services/membership_tiers/tiers.ts`
- Modify: Admin sidebar navigation

- [ ] **Step 1: Create frontend API service**

Create `learnhouse/apps/web/services/membership_tiers/tiers.ts`:

```typescript
import { getAPIUrl } from '@services/config/config'
import { RequestBodyWithAuthHeader } from '@services/utils/ts/requests'

const API_URL = getAPIUrl()

export async function getTiers() {
  const res = await fetch(`${API_URL}tiers/`, RequestBodyWithAuthHeader({ method: 'GET' }))
  return res.json()
}

export async function createTier(data: {
  name: string
  slug: string
  description?: string
  priority: number
  permissions: Record<string, any>
}) {
  const res = await fetch(
    `${API_URL}tiers/`,
    RequestBodyWithAuthHeader({ method: 'POST', body: JSON.stringify(data) })
  )
  return res.json()
}

export async function updateTier(
  tierId: number,
  data: Partial<{ name: string; slug: string; description: string; is_active: boolean; priority: number; permissions: Record<string, any> }>
) {
  const res = await fetch(
    `${API_URL}tiers/${tierId}`,
    RequestBodyWithAuthHeader({ method: 'PUT', body: JSON.stringify(data) })
  )
  return res.json()
}

export async function getTierUserCount(tierId: number) {
  const res = await fetch(
    `${API_URL}tiers/${tierId}/count`,
    RequestBodyWithAuthHeader({ method: 'GET' })
  )
  return res.json()
}
```

- [ ] **Step 2: Create TierList component**

Create `learnhouse/apps/web/components/Admin/Tiers/TierList.tsx` — a table showing all tiers with name, slug, priority, active status, user count, and edit button. Follow the pattern used in `components/Admin/` for other list views (e.g., user list, org list).

- [ ] **Step 3: Create TierForm component**

Create `learnhouse/apps/web/components/Admin/Tiers/TierForm.tsx` — a form for creating/editing tiers with fields for name, slug, description, priority, is_active toggle, and a JSON editor for permissions. Use shadcn-style UI components from `components/ui/`.

- [ ] **Step 4: Create the admin page**

Create `learnhouse/apps/web/app/admin/tiers/page.tsx`:

```tsx
'use client'

import TierList from '@components/Admin/Tiers/TierList'

export default function TiersPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Membership Tiers</h1>
      <TierList />
    </div>
  )
}
```

- [ ] **Step 5: Add "Tiers" to admin sidebar navigation**

Find the admin sidebar/layout component (under `apps/web/app/admin/` layout or a shared navigation component) and add a "Tiers" link pointing to `/admin/tiers`.

- [ ] **Step 6: Test in browser**

Navigate to `http://localhost:3000/admin/tiers`. Verify:
- Free tier is displayed
- Can create a new "Premium" tier
- Can edit a tier
- User count displays correctly

- [ ] **Step 7: Commit**

```bash
git add learnhouse/apps/web/app/admin/tiers/ learnhouse/apps/web/components/Admin/Tiers/ learnhouse/apps/web/services/membership_tiers/
git commit -m "feat: add tier management page to admin UI"
```

---

### Task 11: Admin UI — User Tier Assignment

**Files:**
- Create: `learnhouse/apps/web/components/Admin/Users/UserMembership.tsx`
- Create: `learnhouse/apps/web/services/membership_tiers/user_memberships.ts`
- Modify: Admin user detail/list page

- [ ] **Step 1: Create user membership frontend service**

Create `learnhouse/apps/web/services/membership_tiers/user_memberships.ts`:

```typescript
import { getAPIUrl } from '@services/config/config'
import { RequestBodyWithAuthHeader } from '@services/utils/ts/requests'

const API_URL = getAPIUrl()

export async function assignTier(userId: number, tierId: number, source: string = 'manual') {
  const res = await fetch(
    `${API_URL}memberships/assign`,
    RequestBodyWithAuthHeader({
      method: 'POST',
      body: JSON.stringify({ user_id: userId, tier_id: tierId, source }),
    })
  )
  return res.json()
}

export async function getUserActiveMembership(userId: number) {
  const res = await fetch(
    `${API_URL}memberships/user/${userId}/active`,
    RequestBodyWithAuthHeader({ method: 'GET' })
  )
  return res.json()
}

export async function getUserMembershipHistory(userId: number) {
  const res = await fetch(
    `${API_URL}memberships/user/${userId}/history`,
    RequestBodyWithAuthHeader({ method: 'GET' })
  )
  return res.json()
}
```

- [ ] **Step 2: Create UserMembership component**

Create `learnhouse/apps/web/components/Admin/Users/UserMembership.tsx` — displays the user's current tier with a dropdown to change it. Shows membership history below. Follow existing component patterns.

- [ ] **Step 3: Integrate into admin user views**

- Add a "Tier" column to the user list page showing current tier name
- Add the UserMembership component to the user detail view
- Add a tier filter dropdown to the user list page

- [ ] **Step 4: Test in browser**

1. Go to admin user list → verify tier column shows
2. Click a user → verify tier assignment works
3. Change a user's tier → verify old membership shows as "expired" in history

- [ ] **Step 5: Commit**

```bash
git add learnhouse/apps/web/components/Admin/Users/UserMembership.tsx learnhouse/apps/web/services/membership_tiers/user_memberships.ts
git commit -m "feat: add user tier assignment to admin UI"
```

---

### Task 12: End-to-End Verification

**Files:** None — this is a verification task.

- [ ] **Step 1: Verify LearnHouse deploys cleanly**

Start all services. Confirm:
- FastAPI backend healthy at `:9000/api/v1/health`
- Next.js frontend loads at `:3000`
- PostgreSQL and Redis accessible

- [ ] **Step 2: Verify registration + auto-tier**

Register a new user via the UI. Then:
```bash
curl http://localhost:9000/api/v1/memberships/user/{new_user_id}/active -b "access_token=..."
```
Expected: Returns active membership with `free` tier

- [ ] **Step 3: Verify Google OAuth**

(If configured) Test Google OAuth login flow. Verify user gets free tier.

- [ ] **Step 4: Verify cookie domain scoping**

Set `COOKIE_DOMAIN=.localhost` in env. After login, inspect cookies in browser dev tools:
- Cookie should be set on `.localhost` domain (or configured domain)
- Cookie should be `httpOnly`, `secure` (in production), `samesite=lax`

- [ ] **Step 5: Verify token validation endpoint**

```bash
curl http://localhost:9000/api/v1/auth/validate -b "access_token=..."
```
Expected: Returns `{ user_id, email, name, tier: { slug, priority, permissions }, orgs: [...] }`

Without cookie:
```bash
curl http://localhost:9000/api/v1/auth/validate
```
Expected: 401

- [ ] **Step 6: Verify tier management**

In admin UI:
1. Create a "Premium" tier with priority 10
2. Verify it appears in the tier list
3. Edit the tier description
4. Check user count shows 0

- [ ] **Step 7: Verify user tier assignment**

1. Change a user from Free to Premium in admin UI
2. Verify via `/auth/validate` that the tier changed
3. Check membership history shows both records

- [ ] **Step 8: Verify org basics**

Create an org with `org_type: "medical"` via API:
```bash
curl -X POST http://localhost:9000/api/v1/orgs/ \
  -H "Content-Type: application/json" \
  -b "access_token=..." \
  -d '{"name": "Test Hospital", "slug": "test-hospital", "org_type": "medical"}'
```
Assign a user to it. Verify `/auth/validate` includes the org in the response.

- [ ] **Step 9: Verify token refresh**

Wait for access token to expire (or set a short TTL for testing). Verify the refresh token auto-renews without requiring re-login.

- [ ] **Step 10: Document and commit**

If all 9 verification criteria pass, commit any remaining test fixtures or config:

```bash
git add -A
git commit -m "chore: complete end-to-end verification for auth & user management"
```

---

## Verification Checklist (all must pass)

- [ ] LearnHouse deploys cleanly — all services healthy
- [ ] Registration works — email signup + email verification
- [ ] Google OAuth works (if configured)
- [ ] Cookie scoped to `.limitless-longevity.health` domain
- [ ] `/auth/validate` returns user profile with tier and orgs
- [ ] `/auth/validate` returns 401 without cookie
- [ ] Membership tiers — CRUD via admin UI
- [ ] User tier assignment — change tier, history preserved
- [ ] Organization with `org_type` — create and assign users
- [ ] Token refresh works without re-login
- [ ] New users auto-assigned `free` tier
- [ ] Redis caching on `/auth/validate` working (check response time)
