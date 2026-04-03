# PATHS Platform — Sub-project 1: Auth & User Management

**Date:** 2026-03-20
**Status:** Draft
**Platform:** LearnHouse (FastAPI + Next.js)
**Domain:** paths.limitless-longevity.health

## Context

LIMITLESS is building an educational SaaS platform called PATHS on top of LearnHouse. The platform serves two models:
- **B2B:** Organizations (hospitals, hotels, wellness centers) get access for staff training and ongoing operations. LIMITLESS manages all org users directly.
- **B2C:** Individual users with a free tier (public) and configurable premium tiers (paid packages).

This is the first of 6 sub-projects. Everything else depends on it.

**Sub-project order:**
1. **Auth & User Management** (this spec)
2. Content Management System
3. Content Organization + Access Control
4. Content Consumption UI (PATHS)
5. Organization Admin
6. Billing

**Core development tenets:** Stability, scalability, durability — over speed to market.

## Scope

### In scope
- LearnHouse deployed and running at `paths.limitless-longevity.health`
- User registration and login (email + Google OAuth)
- Shared JWT tokens scoped to `*.limitless-longevity.health` for cross-subdomain SSO
- Token validation endpoint for future services (Hub, etc.)
- User model extended with configurable membership tiers (B2C)
- Organization membership model (B2B) — LIMITLESS-managed
- Admin UI for managing users, tiers, and org assignments
- Superadmin role for LIMITLESS team

### Out of scope
- Content management or creation (Sub-project 2)
- Content gating logic (Sub-project 3)
- Public-facing PATHS UI (Sub-project 4)
- Org admin dashboards (Sub-project 5)
- Payment/billing integration (Sub-project 6)

## Infrastructure

### Deployment stack
- LearnHouse deployed via Docker (single container: Nginx + FastAPI + Next.js + Collab server)
- PostgreSQL 16 with pgvector extension (for future AI/RAG features)
- Redis 7.2 for caching and sessions
- S3-compatible storage for media (can start with local filesystem, migrate later)
- Custom domain: `paths.limitless-longevity.health` configured via LearnHouse CLI + Nginx

### Initial configuration
- Single LIMITLESS organization created as the root org
- Superadmin account for LIMITLESS team
- AI features disabled initially (enabled in Sub-project 2)
- Communities, podcasts, boards, playgrounds disabled initially
- Signup mode: open (for B2C free tier)

### Environments
- **Development:** local Docker setup
- **Staging:** mirrors production for testing
- **Production:** cloud VPS (provider TBD — any Docker-capable host)

## Auth System — Shared Token Layer

### Approach
Keep LearnHouse as the auth provider. Add a shared token layer so future services (Hub, etc.) can validate tokens without duplicating auth logic.

### How login works
1. User visits `paths.limitless-longevity.health` and signs up or logs in
2. LearnHouse handles it: email+password (Argon2 hashed) or Google OAuth
3. JWT access token (8hr) + refresh token (30 days) issued as httpOnly cookies
4. Cookie domain set to `.limitless-longevity.health` (leading dot) — available to all subdomains

### Token validation endpoint (new)
- `GET /api/v1/auth/validate`
- Accepts JWT from cookie, verifies signature
- Returns user profile: id, email, name, roles, current tier, org memberships
- Returns 401 if token expired/invalid
- Any future service calls this endpoint to verify who the user is

### What stays as-is from LearnHouse
- Password reset flow
- Email verification
- Rate limiting on login attempts
- Account lockout after failed attempts
- Google OAuth integration
- Session management (access + refresh token rotation)

### Token revocation & tier-change propagation
- **Tier/role changes:** Take effect on next token refresh (max 8 hours). This is acceptable for B2C tier changes.
- **User deactivation:** For immediate revocation (e.g., removing a B2B org user), maintain a Redis-backed token blacklist keyed by user UUID with an 8-hour TTL (matching access token lifetime — entries auto-expire when the token they block would have expired anyway). The `/auth/validate` endpoint checks this blacklist before returning a valid response.
- **Refresh token rotation:** Verify that LearnHouse invalidates old refresh tokens when issuing new ones. If not, implement rotation as part of this sub-project.

### What we add
- Cookie domain scoping (`.limitless-longevity.health`)
- The `/api/v1/auth/validate` endpoint
- CORS configuration: dynamically match and reflect origins matching `*.limitless-longevity.health` (cannot use wildcard `*` with `credentials: include`)
- Redis-backed token blacklist for immediate user revocation

### `/api/v1/auth/validate` endpoint details
- **Access:** Publicly accessible (browser cookies). Rate-limited at 60 requests/minute per IP (consistent with other auth endpoints).
- **Caching:** Response cached in Redis for 60 seconds keyed by `validate:{user_id}:{jwt_signature}`. Cache invalidated on tier/org changes by deleting all keys matching `validate:{user_id}:*` (covers multiple devices/tokens).
- **Response:** Returns `{ user_id, email, name, tier: { slug, priority, permissions }, orgs: [{ slug, org_type, role }] }`

## User Model Extensions

### LearnHouse existing user model (unchanged)
- id, uuid, email, password, first_name, last_name, avatar
- `superadmin` boolean flag
- `UserOrganization` many-to-many (user can belong to multiple orgs with different roles)
- `Role` per org with granular `Rights` JSON

### MembershipTier model (new)
```
MembershipTier
├── id (PK)
├── name (string)
├── slug (string, unique)
├── description (text)
├── is_active (boolean)
├── priority (integer — higher = more access)
└── permissions (JSON — flexible, not hardcoded)
```

**Permissions JSON initial structure** (subject to revision in Sub-project 3):
```json
{
  "content_access": ["free"],
  "features": [],
  "max_courses": null
}
```
Example premium tier:
```json
{
  "content_access": ["free", "premium"],
  "features": ["download_resources", "ai_tutor", "certificates"],
  "max_courses": null
}
```
The `content_access` array maps to content tags defined in Sub-project 3. The `features` array gates platform capabilities. `max_courses` limits concurrent enrollments (null = unlimited).

- Created and managed by LIMITLESS superadmins via admin UI
- System supports arbitrary tier creation — no hardcoded tier names
- Default seed: one `free` tier auto-assigned on signup
- Premium tiers created by LIMITLESS when ready

### UserMembership model (new)
```
UserMembership
├── id (PK)
├── user_id (FK → User)
├── tier_id (FK → MembershipTier)
├── status (active | expired | cancelled)
├── started_at (datetime)
├── expires_at (datetime, nullable)
├── source (string — manual, future: payment)
├── updated_at (datetime, auto-set on change)
└── updated_by (FK → User, nullable — who made the change)
```

- Relationship is 1:N at the table level (one user, many membership records over time). Only one row per user may have `status = active` at any time. Historical records retained for audit.
- Enforced via partial unique index: `UNIQUE (user_id) WHERE status = 'active'`
- Upgrades: set current active record to `expired`, create new record with `status = active`
- New users auto-assigned to `free` tier on registration
- `source` field validated against allowed values: `manual`, `payment`, `promotion` (application-level, not DB enum — new values don't require migration)

### Organization model extensions
- Add `org_type` field: `medical` | `non_medical` | `hospitality` | `wellness`
- Add `managed_by` field: `string, default: 'limitless'`. Future values could include org slugs for delegated admin.
- All existing LearnHouse org fields remain (logo, branding, config, custom domain)

### Model extension strategy
All new fields on existing LearnHouse models (`org_type`, `managed_by` on Organization) are added via Alembic migrations against the existing tables. New models (`MembershipTier`, `UserMembership`) are new tables with foreign keys to existing tables. This creates a soft fork of LearnHouse. Upstream merge conflicts will be resolved manually on a case-by-case basis. All `UserMembership` and `UserOrganization` records include `updated_at` and `updated_by` fields for audit trail.

## Entity Relationships

```
┌─────────────────┐       ┌──────────────────────┐
│      User        │──────▶│   UserMembership      │
│─────────────────│  1:N  │──────────────────────│
│ id, uuid, email  │       │ user_id, tier_id      │
│ first_name       │       │ status                │
│ last_name        │       │ started_at, expires_at│
│ superadmin       │       │ source                │
└────────┬────────┘       └──────────┬───────────┘
         │                            │
         │ M:N                        │ N:1
         ▼                            ▼
┌──────────────────┐       ┌──────────────────┐
│ UserOrganization  │       │  MembershipTier   │
│──────────────────│       │──────────────────│
│ user_id, org_id   │       │ id, name, slug    │
│ role_id           │       │ priority          │
└────────┬─────────┘       │ permissions (JSON) │
         │                  │ is_active          │
         │ N:1              └──────────────────┘
         ▼
┌──────────────────┐       ┌──────────────────┐
│  Organization     │       │      Role         │
│──────────────────│       │──────────────────│
│ id, name, slug    │       │ id, name, org_id  │
│ org_type (new)    │       │ rights (JSON)     │
│ managed_by (new)  │       └──────────────────┘
│ logo, branding    │
│ config (JSON)     │
└──────────────────┘
```

## Admin Interface

### Existing LearnHouse admin (unchanged)
- Dashboard for managing organizations, users, courses
- Role management per organization
- User invitation system (codes + batch email)

### Tier Management page (new, superadmin only)
- List all membership tiers
- Create / edit / deactivate tiers
- Define tier name, description, priority, permissions JSON
- Preview how many users are on each tier

### User Management extensions
- View/search all users across the platform
- See each user's current tier + org memberships
- Manually assign/change a user's tier (dropdown)
- Manually add a user to an organization with a role
- Filter users by: tier, organization, registration date, status

All admin extensions are built as new pages/components within LearnHouse's existing Next.js admin panel — no separate admin app.

## Architecture Overview

```
                 *.limitless-longevity.health
              (shared cookie domain for JWT tokens)

    ┌──────────────────┐  ┌─────────┐  ┌──────────────┐
    │  PATHS Platform   │  │   Hub   │  │ Future Svc   │
    │  (LearnHouse)     │  │ (future)│  │   (future)   │
    │  AUTH PROVIDER     │  │validates│  │  validates   │
    └────────┬─────────┘  └────┬────┘  └──────┬───────┘
             │                  │               │
             │    JWT cookies shared across all subdomains
             │                  │               │
    ┌────────▼──────────────────▼───────────────▼──────┐
    │              LearnHouse Backend (FastAPI)          │
    │                                                    │
    │  Existing:          New:              Extended:     │
    │  - Login/Signup     - /auth/validate  - User+tier  │
    │  - JWT issuance     - Cookie scoping  - Org+type   │
    │  - Password reset   - CORS config     - Admin UI   │
    │  - Google OAuth     - Tier CRUD                    │
    │  - Role mgmt        - Membership CRUD              │
    │  - Org mgmt                                        │
    └──────────────────────┬───────────────────────────┘
                           │
    ┌──────────────────────▼───────────────────────────┐
    │           PostgreSQL 16 + pgvector                 │
    │                                                    │
    │  Existing:              New:           Extended:    │
    │  - user                - membership_  - org +      │
    │  - organization          tier           org_type   │
    │  - user_organization   - user_        - org +      │
    │  - role                  membership     managed_by │
    └──────────────────────────────────────────────────┘
```

## Testing & Verification Criteria

Before this sub-project is considered complete:

1. **LearnHouse deploys cleanly** — Docker containers start, all services healthy, domain resolves
2. **Registration works** — new user signs up with email, receives verification email, can log in
3. **Google OAuth works** — user can sign up/log in via Google
4. **Cookie scoping verified** — JWT cookie set on `.limitless-longevity.health` domain (inspectable in browser dev tools)
5. **Token validation endpoint works** — `GET /api/v1/auth/validate` returns user profile with tier and org data for valid token, 401 for invalid
6. **Membership tiers** — superadmin can create/edit/deactivate tiers via admin UI. New users auto-assigned to `free` tier.
7. **User management** — superadmin can view all users, change a user's tier, add a user to an organization
8. **Organization basics** — superadmin can create an org with `org_type`, assign users to it with roles
9. **Token refresh** — expired access token auto-refreshes via refresh token without re-login

### Not tested in this sub-project
- Content gating by tier (Sub-project 3)
- Payment flow for tier upgrades (Sub-project 6)
- Org-specific content visibility (Sub-project 3)

## Reference Documents (inspiration, not authoritative)

| File | What it contains |
|------|-----------------|
| `LIMITLESS LMS ROADMAP FOR COURSE LAUNCH.md` | 30-day roadmap for AI-integrated course launch — inspirational reference for deployment and AI config patterns |
| `LIMITLESS LMS ATOMIC LEARNING UNIT SCHEMA.md` | ALU schema with AI shadow context, block structure, adaptive pathing — inspirational reference for future content model |

## Success Criteria

1. LearnHouse is deployed and accessible at `paths.limitless-longevity.health` (or dev equivalent)
2. All 9 verification criteria pass
3. No LearnHouse core functionality is broken by the extensions
4. New database models have Alembic migrations
5. Admin UI extensions are integrated into LearnHouse's existing admin panel (not a separate app)
6. Token validation endpoint is documented with request/response examples
7. Cookie domain scoping is verified across at least two subdomains in dev
