# PATHS Organization Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the admin panel so LIMITLESS superadmins can manage B2B client organizations — settings, stats, and member management.

**Architecture:** Enhance existing admin org detail page with org_type/content_access_level form controls, org stats widget, and member list with add/remove. Add 2 lightweight backend endpoints (org stats + user search). Add superadmin bypass to existing org user management endpoints.

**Tech Stack:** FastAPI / SQLModel / Next.js / React / TypeScript / Tailwind

**Spec:** `docs/superpowers/specs/2026-03-21-paths-org-admin-design.md`

---

## Tasks

### Task 1: Backend — Org Stats Endpoint + User Search + Superadmin Bypass

**Files:**
- Create: `learnhouse/apps/api/src/routers/org_admin.py` — new router for org admin endpoints
- Create: `learnhouse/apps/api/src/services/org_admin/org_admin.py` — org admin service
- Modify: `learnhouse/apps/api/src/router.py` — register new router
- Modify: Existing org user endpoints — add superadmin bypass if needed

- [ ] **Step 1: Create org admin service**

`src/services/org_admin/org_admin.py`:

```python
from sqlmodel import Session, select, func
from src.db.organizations import Organization
from src.db.user_organizations import UserOrganization
from src.db.articles import Article
from src.db.courses.courses import Course


def get_org_stats(org_id: int, db_session: Session) -> dict:
    member_count = db_session.exec(
        select(func.count(UserOrganization.id))
        .where(UserOrganization.org_id == org_id)
    ).one()

    article_count = db_session.exec(
        select(func.count(Article.id))
        .where(Article.org_id == org_id)
    ).one()

    course_count = db_session.exec(
        select(func.count(Course.id))
        .where(Course.org_id == org_id)
    ).one()

    org = db_session.get(Organization, org_id)

    return {
        "member_count": member_count,
        "article_count": article_count,
        "course_count": course_count,
        "created": org.creation_date if org else None,
    }


def search_users_by_email(query: str, db_session: Session, limit: int = 10) -> list:
    from src.db.users import User
    users = db_session.exec(
        select(User)
        .where(User.email.ilike(f"%{query}%"))
        .limit(limit)
    ).all()
    return [{"id": u.id, "email": u.email, "first_name": u.first_name, "last_name": u.last_name} for u in users]
```

- [ ] **Step 2: Create org admin router**

`src/routers/org_admin.py`:

```python
from fastapi import APIRouter, Depends, Query
from src.core.events.database import get_db_session
from src.security.auth import get_authenticated_user
from src.security.superadmin import require_superadmin
from src.services.org_admin.org_admin import get_org_stats, search_users_by_email

router = APIRouter(dependencies=[Depends(get_authenticated_user), Depends(require_superadmin)])

@router.get("/orgs/{org_id}/stats")
async def api_get_org_stats(org_id: int, db_session=Depends(get_db_session)):
    return get_org_stats(org_id, db_session)

@router.get("/users/search")
async def api_search_users(email: str = Query(...), db_session=Depends(get_db_session)):
    return search_users_by_email(email, db_session)
```

Register in `src/router.py`:
```python
from src.routers.org_admin import router as org_admin_router
v1_router.include_router(org_admin_router, prefix="/admin", tags=["Org Admin"])
```

- [ ] **Step 3: Add superadmin bypass to org user endpoints**

Check existing org user management endpoints in `src/routers/orgs/orgs.py`. If they require org membership to manage users, add a superadmin check that bypasses org-level auth. Read the existing code to understand the pattern, then add:

```python
# In the auth/permission check:
if user.is_superadmin:
    pass  # Superadmin bypasses org membership requirement
```

- [ ] **Step 4: Test endpoints**

```bash
curl -s http://127.0.0.1:9000/api/v1/admin/orgs/1/stats  # with superadmin cookie
curl -s "http://127.0.0.1:9000/api/v1/admin/users/search?email=admin"  # with superadmin cookie
```

- [ ] **Step 5: Commit**

```bash
cd learnhouse && git commit -m "feat: add org stats endpoint, user search, and superadmin bypass for org user management"
```

---

### Task 2: Frontend — Enhanced Org Detail Page

**Files:**
- Create or modify: `learnhouse/apps/web/app/admin/(dashboard)/organizations/[orgId]/page.tsx`
- Create: `learnhouse/apps/web/components/Admin/Organizations/OrgSettings.tsx`
- Create: `learnhouse/apps/web/components/Admin/Organizations/OrgStats.tsx`
- Create: `learnhouse/apps/web/components/Admin/Organizations/OrgMembers.tsx`
- Create: `learnhouse/apps/web/components/Admin/Organizations/AddMemberModal.tsx`
- Create: `learnhouse/apps/web/services/organizations/org-admin.ts`

- [ ] **Step 1: Create org admin API service**

`services/organizations/org-admin.ts`:
- `getOrgStats(orgId)` — GET /admin/orgs/{id}/stats
- `searchUsers(email)` — GET /admin/users/search?email=...
- `getOrgMembers(orgId)` — GET /orgs/{id}/users (existing endpoint)
- `addMemberToOrg(orgId, userId, roleId)` — POST /orgs/{id}/users (existing)
- `removeMemberFromOrg(orgId, userId)` — DELETE /orgs/{id}/users/{userId} (existing)
- `getOrgRoles(orgId)` — GET /roles/?org_id={id} (existing)

- [ ] **Step 2: Create OrgStats component**

4 stat cards: Members, Articles, Courses, Created date. Fetch from getOrgStats(). Simple grid layout.

- [ ] **Step 3: Create OrgSettings component**

Form with:
- org_type dropdown (medical, non_medical, hospitality, wellness)
- content_access_level dropdown (free, regular, premium, enterprise — from AccessLevel enum)
- managed_by (read-only text)
- Save button → calls PUT /orgs/{uuid} with updated fields

Read existing org detail page to understand how org data is loaded and how updates are saved. Follow the same pattern.

- [ ] **Step 4: Create OrgMembers component**

Table with: user name, email, role, joined date, remove button.
Search input (client-side filter by name/email).
"Add Member" button.

Fetch members from getOrgMembers(). Remove calls removeMemberFromOrg() with confirmation dialog.

- [ ] **Step 5: Create AddMemberModal component**

Modal with:
- Email search input → calls searchUsers() as user types (debounced)
- Results list showing matching users (name, email)
- Click user → select them
- Role dropdown → fetches roles from getOrgRoles()
- "Add" button → calls addMemberToOrg()
- Handle 409 (already a member) with toast message

- [ ] **Step 6: Assemble org detail page**

The org detail page shows: OrgStats at top, then tabs or sections for OrgSettings and OrgMembers. Read the existing org detail page structure and integrate the new components.

- [ ] **Step 7: Test at admin.localhost:3000**

1. Navigate to admin.localhost:3000/organizations
2. Click the default org
3. Verify stats, settings form, and member list render
4. Change org_type → save → verify persists
5. Add a member → verify they appear in list
6. Remove a member → verify they disappear

- [ ] **Step 8: Commit**

```bash
cd learnhouse && git commit -m "feat: enhanced org detail page with settings, stats, and member management"
```

---

### Task 3: End-to-End Verification

- [ ] **Step 1:** Org detail page shows org_type and content_access_level fields
- [ ] **Step 2:** Changing org_type and content_access_level saves correctly
- [ ] **Step 3:** Org stats (member count, article count, course count) display
- [ ] **Step 4:** Member list shows org members with name, email, role, date
- [ ] **Step 5:** Add member: search by email, select role, add successfully
- [ ] **Step 6:** Remove member: confirmation dialog, removes successfully
- [ ] **Step 7:** All features require superadmin (test with non-superadmin if possible)

---

## Verification Checklist

- [ ] Org detail page shows org_type + content_access_level
- [ ] Settings save correctly
- [ ] Stats display (member/article/course count)
- [ ] Member list renders
- [ ] Add member works
- [ ] Remove member works
- [ ] Superadmin only
