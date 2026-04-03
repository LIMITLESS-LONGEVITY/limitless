# PATHS Platform — Project Status & Architecture

## Overview

PATHS is an educational SaaS platform for LIMITLESS Longevity Consultancy, built on LearnHouse (FastAPI + Next.js). It serves both B2B (hospital/hotel staff training) and B2C (individual wellness education) markets.

- **Corporate site:** `limitless-longevity.health` (static HTML, GitHub Pages)
- **PATHS platform:** `paths.limitless-longevity.health` (LearnHouse, separate app)
- **Admin panel:** `admin.limitless-longevity.health` (LearnHouse admin, subdomain routing)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js 16)               │
│  Port 3000 | Turbopack | App Router                   │
│                                                       │
│  Public pages:        Dashboard (org admin):           │
│  /articles            /dash/articles                   │
│  /article/{uuid}      /dash/articles/{uuid}/edit       │
│  /courses             /dash/courses                    │
│                                                       │
│  Admin panel (admin.* subdomain):                      │
│  /organizations  /users  /tiers  /pillars  /analytics  │
└──────────────────────┬────────────────────────────────┘
                       │ API calls
┌──────────────────────▼────────────────────────────────┐
│                   Backend (FastAPI)                     │
│  Port 9000 | uvicorn --reload                          │
│                                                       │
│  /api/v1/auth/*       Authentication + JWT cookies     │
│  /api/v1/articles/*   Article CRUD + workflow          │
│  /api/v1/pillars/*    Content pillar taxonomy          │
│  /api/v1/tiers/*      Membership tier management       │
│  /api/v1/memberships/* User tier assignment            │
│  /api/v1/courses/*    LearnHouse courses (extended)     │
│  /api/v1/orgs/*       Organization management          │
└──────────────────────┬────────────────────────────────┘
                       │
┌──────────────────────▼────────────────────────────────┐
│  PostgreSQL 16 (pgvector) | Port 5433                  │
│  Redis 7.2               | Port 6379                   │
│  (Docker via docker-compose.dev.yml)                   │
└───────────────────────────────────────────────────────┘
```

## Sub-project Status — ALL COMPLETE

### SP1: Auth & User Management — COMPLETE

**What it delivers:**
- User registration (email + Google OAuth)
- JWT cookies scoped to `.limitless-longevity.health` for cross-subdomain SSO
- `/auth/validate` endpoint with Redis caching, rate limiting, blacklist
- Configurable membership tiers (MembershipTier model, admin UI at admin.*/tiers)
- User membership assignment with auto-free-tier on registration
- Organization model extended with org_type and managed_by
- Session revocation endpoint for B2B user deactivation

**Key models:** MembershipTier, UserMembership, Organization (extended)
**Key endpoints:** /auth/validate, /tiers/, /memberships/

### SP2: Content Management System — COMPLETE

**What it delivers:**
- Standalone Article model (independent from courses, same TipTap editor)
- Content Pillar taxonomy (configurable via admin, 6 defaults: Nutrition, Movement, Sleep, Mental Health, Medicine, Health Tech)
- Editorial workflow: Draft → In Review → Approved → Published → Archived (7 transitions)
- Permission-based editorial roles via RBAC (articles.create, .read, .update, .delete, .submit_review, .review, .publish)
- Article versioning (full content snapshots, restore capability)
- Cross-references between articles and courses
- Article dashboard in org UI (/dash/articles)
- Article editor with TipTap, auto-save, version history
- Pillar management in admin panel (admin.*/pillars)
- 3 admin guides: editorial workflow, role setup, pillar management

**Key models:** Article, ArticleVersion, ContentPillar, ArticlePermissions (RBAC)
**Key endpoints:** /articles/ (CRUD + 7 workflow transitions + versions), /pillars/

### SP3: Content Organization + Access Control — COMPLETE

**What it delivers:**
- AccessLevel enum (free, regular, premium, enterprise)
- Tier-based content gating: articles have access_level, users have effective access from tier + org
- "Highest wins" logic: individual tier ∪ org content_access_level
- Org-specific content visible only to org members
- Course reference bypass (articles linked from courses skip tier check)
- Article list filtering (SQL-level + include_locked param)
- Locked articles: metadata visible, content hidden
- /access endpoint for frontend lock/upgrade UI
- Admin bypass for editors/publishers

**Key models:** AccessLevel enum, access_level on Article, default_access_level on ContentPillar, content_access_level on Organization
**Key service:** `src/services/access_control/access_control.py` — can_user_access_article(), get_effective_access(), filter_accessible_articles()

### SP4: Content Consumption UI — COMPLETE

**What it delivers:**
- Articles browse page: feed-first layout with pillar tab filtering (/articles)
- Article reader page: full TipTap read-only rendering (/article/{uuid})
- Locked content teaser: first ~200 words + fade overlay + upgrade CTA
- Preview endpoint: ?preview=true returns truncated content
- "Articles" link in org public navigation
- Responsive (mobile + desktop)
- Anonymous access to free articles

**Key pages:** /articles (browse), /article/{uuid} (reader)
**Key components:** ArticleBrowse, ArticleCard, PillarTabs, ArticleReader, ArticleTeaser

### SP5: Organization Admin — COMPLETE

**What it delivers:**
- Enhanced admin org detail page with org_type and content_access_level dropdowns
- Org overview stats (member count, article count, course count)
- Org member management: view members, add existing users, remove members
- User search endpoint for add-member modal
- Superadmin bypass on org user management endpoints

**Key endpoints:** /admin/orgs/{id}/stats, /admin/users/search
**Key components:** OrgStats, OrgSettings, OrgMembers, AddMemberModal

### SP6: Billing — COMPLETE

**What it delivers:**
- Stripe Checkout integration for B2C subscription upgrades (monthly/yearly)
- Billing data models: StripeCustomer, StripeSubscription, StripePayment
- MembershipTier extended with Stripe Product/Price IDs (admin-configurable)
- Stripe webhook handler (checkout completed, subscription deleted/updated, payment failed)
- Upgrade: immediate (prorated). Cancel: end of billing period.
- Account/billing page: shows tier, upgrade options, cancel button, Stripe Portal link
- Billing success page after Stripe Checkout
- ArticleTeaser "Upgrade" button links to /account/billing
- Generic one-time purchase tracking (StripePayment — infrastructure for future bundles)
- Graceful handling when Stripe not configured (503 with clear message)

**Key endpoints:** /billing/checkout, /billing/status, /billing/cancel, /billing/portal, /billing/webhook
**Key pages:** /account/billing (upgrade/cancel), /billing/success (post-payment)

## Content Strategy

- **Free/regular tiers:** Articles are the primary content engine (high volume, frequently updated)
- **Premium/enterprise tiers:** Structured courses + premium articles
- **B2B orgs:** Custom content (org-specific articles) + platform-wide content (at org's access level)
- Articles and courses are linked but independent (cross-references, not structural dependency)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Platform | LearnHouse (FastAPI + Next.js) | AI-native, Python backend for ML/agent integration, fastest to market |
| Auth strategy | LearnHouse as auth provider + shared token layer | Minimal new code, cross-subdomain SSO via cookie domain |
| Articles vs courses | Independent models, linked via cross-references | Clean separation, different audiences (B2C vs B2B/premium) |
| Content pillars | Configurable via admin (not hardcoded) | Flexibility for evolving taxonomy |
| Editorial workflow | 5-state flow with permission-based roles | Quality control without rigid role hierarchy |
| Access control | Service-layer check (not middleware) | Testable, supports course-reference bypass cleanly |
| Content gating | Teaser + fade wall (first ~200 words) | Proven conversion pattern, showcases content quality |
| Browse layout | Feed-first with pillar tabs | Immediate content discovery, easy to change later |
| Org admin | LIMITLESS manages all orgs (no delegated admin) | Simpler, matches B2B consulting model |
| B2B billing | Manual (superadmin assigns tiers) | B2B deals are custom contracts, not self-service |
| B2C billing | Stripe subscriptions (monthly/yearly) | Standard SaaS pattern, Stripe handles PCI |
| Upgrade model | Immediate upgrade, end-of-period downgrade | Standard pattern (Stripe, Netflix, Spotify) |
| One-time purchases | Infrastructure ready, not tied to content yet | Wait for market signal before designing bundles |

## Development Environment

See `docs/dev-environment.md` for full setup instructions.

**Quick start:**
```bash
# 1. Start Docker (PostgreSQL + Redis)
docker compose -f docker-compose.dev.yml up -d

# 2. Start backend
cd learnhouse/apps/api && PYTHONIOENCODING=utf-8 uv run uvicorn app:app --reload --port 9000

# 3. Start frontend
cd learnhouse/apps/web && node node_modules/next/dist/bin/next dev --turbopack --port 3000
```

**Key gotchas:**
- PostgreSQL on port **5433** (not 5432 — local PG conflict)
- Admin panel via **admin.localhost:3000** (subdomain routing, NOT localhost:3000/admin)
- Frontend uses Bun for package management, but run via Node directly on Windows
- All code changes in `learnhouse/` repo on `dev` branch (soft fork)

## Test Suite

All tests run from `learnhouse/apps/api/`:
```bash
uv run python -m pytest src/tests/ -v
```

Current: **491 tests**, all passing. Covers models, RBAC, access control, editorial workflow, billing, and LearnHouse core.
