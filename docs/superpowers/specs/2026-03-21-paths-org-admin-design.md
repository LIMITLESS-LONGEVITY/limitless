# PATHS Platform — Sub-project 5: Organization Admin

**Date:** 2026-03-21
**Status:** Draft
**Platform:** LearnHouse (FastAPI + Next.js)

## Context

Sub-projects 1-4 are complete. The platform has auth with tiers, articles with editorial workflow, access control, and a public content browse/reader UI. Organizations exist with `org_type`, `content_access_level`, and `managed_by` fields (from SP1 and SP3). This sub-project enhances the admin panel to let LIMITLESS superadmins manage B2B client organizations effectively.

## Scope

### In scope
- Enhanced admin org detail page with org_type, content_access_level, managed_by fields
- Org overview stats (member count, article count, course count)
- Org member management: view members, add existing users, remove members
- Superadmin-only access

### Out of scope
- Curated content collections per org (future)
- Content restrictions per org (future)
- Bulk user import/CSV (future)
- Delegated org admin (LIMITLESS manages everything)
- Creating new user accounts from admin (users must register first)

## Admin Org Detail Page Enhancement

### Org Settings Panel

Enhance the existing org detail page at `admin.localhost:3000/organizations/{orgId}` with editable fields:

- **org_type** — dropdown selector: medical, non_medical, hospitality, wellness (from existing Organization model field)
- **content_access_level** — dropdown selector: free, regular, premium, enterprise (from SP3 AccessLevel enum)
- **managed_by** — read-only display, shows "limitless"
- Existing LearnHouse org fields remain unchanged (name, slug, description, logo, branding)

All fields already exist on the Organization model. This is purely a UI task — adding form controls that call the existing `PUT /orgs/{uuid}` endpoint with the new fields.

### Org Overview Stats

Display at the top of the org detail page:

- **Member count** — count of UserOrganization records for this org
- **Article count** — count of Article records where org_id matches
- **Course count** — count of Course records where org_id matches
- **Created** — org creation date

Stats can be fetched via a new lightweight endpoint or computed client-side from existing data.

### Backend for Stats

New endpoint:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/orgs/{org_id}/stats` | Superadmin | Returns `{member_count, article_count, course_count, created}` |

This is a simple SQL COUNT query endpoint. Superadmin-only.

## Org Member Management

Add a "Members" section to the admin org detail page.

### Member List

- Table columns: user name, email, role name, joined date
- Search/filter by name or email (client-side)
- "Remove" button per member → confirmation dialog → deletes UserOrganization record

### Add Member

- "Add Member" button opens a modal
- Search input: search existing platform users by email (calls existing user search endpoint)
- Role selector: dropdown of roles available in this org
- Submit: creates UserOrganization record linking the user to the org with the selected role

**Important:** This assigns existing platform users to the org. It does NOT create new user accounts. Users must register on the platform first.

### Backend

Check if existing LearnHouse org user management endpoints support superadmin access:

- `GET /orgs/{org_id}/users` — list org members (may need superadmin bypass if currently requires org-level auth)
- `POST /orgs/{org_id}/users` — add user to org
- `DELETE /orgs/{org_id}/users/{user_id}` — remove user from org
- `GET /users/search?email=...` — search users by email (may need a new endpoint if not available)

If existing endpoints require org-level auth, add superadmin bypass (check `is_superadmin` on the user).

Additional endpoints needed:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/ee/superadmin/users/search?email=...` | Superadmin | Search platform users by email for the add-member modal |

**Role selection:** When adding a member, the role dropdown shows roles defined for that specific org (from the Role table where org_id matches). Superadmin sees all org roles.

**Edge cases:**
- Adding a user already in the org → return 409 (already a member)
- Removing the last member → allowed (org can be empty, LIMITLESS manages externally)
- Changing org_type/content_access_level mid-lifecycle → allowed, takes effect immediately for all org members

## Frontend Components

### New/Modified Files

| File | Responsibility |
|------|---------------|
| `apps/web/app/admin/(dashboard)/organizations/[orgId]/page.tsx` | Enhanced org detail page (may already exist — enhance it) |
| `apps/web/components/Admin/Organizations/OrgSettings.tsx` | org_type + content_access_level form |
| `apps/web/components/Admin/Organizations/OrgStats.tsx` | Member/article/course count cards |
| `apps/web/components/Admin/Organizations/OrgMembers.tsx` | Member list + add/remove |
| `apps/web/components/Admin/Organizations/AddMemberModal.tsx` | Search user + select role modal |
| `apps/web/services/organizations/org-admin.ts` | API service for stats, member ops |

## Testing & Verification Criteria

1. **Org detail page** — clicking an org in admin panel shows enhanced detail with org_type, content_access_level fields
2. **Org settings editable** — changing org_type and content_access_level saves correctly via existing PUT endpoint
3. **Org stats visible** — member count, article count, course count displayed on org detail
4. **Member list** — org detail shows list of org members with name, email, role, joined date
5. **Add member** — can search for existing user by email and add to org with a role
6. **Remove member** — can remove a user from org (with confirmation)
7. **Superadmin only** — all org admin features require superadmin access

## Success Criteria

1. All 7 verification criteria pass
2. No modifications to existing org model (fields already exist)
3. Admin panel org detail page is a single cohesive view (settings + stats + members)
4. Existing LearnHouse org functionality is not broken
5. Superadmin authentication enforced on all new endpoints/pages
