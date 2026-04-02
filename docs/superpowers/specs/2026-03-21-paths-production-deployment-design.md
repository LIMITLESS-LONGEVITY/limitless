# PATHS Platform — Production Deployment Design

**Date:** 2026-03-21
**Status:** Approved
**Stack:** Next.js 16 (App Router, SSR) + FastAPI + PostgreSQL 16 (pgvector) + Redis 7.2
**Architecture:** Vercel (frontend) + Render (backend, DB, Redis) — Frankfurt (EU)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Repository & Branching Strategy](#2-repository--branching-strategy)
3. [CI/CD Pipeline](#3-cicd-pipeline)
4. [Configuration & Secrets](#4-configuration--secrets)
5. [DNS, SSL & Domain Routing](#5-dns-ssl--domain-routing)
6. [Database & Storage](#6-database--storage)
7. [Sentry Integration & Error Tracking](#7-sentry-integration--error-tracking)
8. [Production Checklist & Launch Sequence](#8-production-checklist--launch-sequence)

---

## 1. Architecture Overview

```
                        ┌──────────────────────────────┐
                        │     Cloudflare (DNS + CDN)     │
                        │  *.limitless-longevity.health  │
                        └──────────┬───────────────────┘
                                   │
                  ┌────────────────┼─────────────────┐
                  ▼                                  ▼
       ┌───────────────────┐              ┌────────────────────┐
       │   Vercel Pro       │              │   Render (Frankfurt)│
       │   Frankfurt (fra1) │              │                    │
       │                    │   REST API   │   FastAPI Backend   │
       │   Next.js 16 SSR   │─────────────▶│   Starter ($7/mo)   │
       │   App Router       │              │   Always-on         │
       │                    │              └─────────┬──────────┘
       │   Subdomains:      │                        │
       │   paths.*          │             ┌──────────┼──────────┐
       │   paths-admin.*    │             ▼          ▼          ▼
       └───────────────────┘       ┌──────────┐ ┌────────┐ ┌────────┐
                                   │ Render   │ │ Render │ │ CF R2  │
                                   │ Postgres │ │ Redis  │ │ EU     │
                                   │ pgvector │ │ Free   │ │ Bucket │
                                   │ $7/mo    │ │ 25 MB  │ │ ~$0-2  │
                                   └──────────┘ └────────┘ └────────┘

       ┌───────────────────┐
       │   Sentry (EU DC)   │  ← Error tracking (frontend + backend)
       └───────────────────┘

       ┌───────────────────┐
       │   GitHub Actions    │  ← Tests on PR, blocks merge
       └───────────────────┘
```

### Subdomains (flat pattern)

| Subdomain | Points to | Purpose |
|-----------|-----------|---------|
| `limitless-longevity.health` | GitHub Pages | Corporate site (unchanged) |
| `paths.limitless-longevity.health` | Vercel | PATHS public frontend |
| `paths-admin.limitless-longevity.health` | Vercel | PATHS admin panel |
| `paths-api.limitless-longevity.health` | Render | PATHS API backend |

Flat subdomain pattern chosen over nested (`api.paths.*`) because:
- Simpler DNS management — all records at the same level
- No wildcard SSL complications — each platform provisions individual certs per subdomain
- Consistent with future apps: `cubes.`, `cubes-api.`, `hubs.`, `hubs-api.`, etc.

### Multi-app context

LIMITLESS is a multi-app platform. Other apps (CUBES+, HUBS) will follow the same subdomain pattern. All apps will converge on shared JWT auth (PATHS auth as the shared layer), with cookies scoped to `.limitless-longevity.health` enabling cross-app SSO.

### Region

Frankfurt (EU) for all services. Vercel's edge network serves static assets globally. EU region chosen for GDPR compliance — primary audience is EU-based C-suite/UHNW clients.

### Estimated monthly cost

| Component | Tier | Monthly |
|-----------|------|---------|
| Vercel Pro | 1 seat (covers all projects) | $20 |
| Render Web Service | Starter (Frankfurt) | $7 |
| Render PostgreSQL | Starter (Frankfurt, pgvector) | $7 |
| Render Redis | Free (25 MB) | $0 |
| Cloudflare R2 | EU bucket, ~10 GB | ~$0-2 |
| Sentry | Free tier (5K errors/mo) | $0 |
| **Total** | | **~$34-36/mo** |

### Scaling path

```
Phase 1 (Now → 10K DAU):     Current setup                    ~$34-36/mo
Phase 2 (10K → 50K DAU):     Upgrade Render tiers             ~$100-215/mo
Phase 3 (50K+ DAU):          Evaluate serverless migration     TBD
```

---

## 2. Repository & Branching Strategy

### Dedicated repo: `limitless-paths`

The LearnHouse soft fork gets its own GitHub repository, separate from the corporate site.

```
limitless-paths/
  ├── apps/
  │   ├── api/              ← Render root directory
  │   └── web/              ← Vercel root directory
  ├── packages/             ← Shared packages
  ├── .github/
  │   └── workflows/
  │       └── test.yml      ← GitHub Actions test pipeline
  ├── vercel.json           ← Vercel config (region, rewrites)
  └── render.yaml           ← Render Blueprint (IaC, optional)
```

### Branching model: trunk-based with short-lived feature branches

```
main (production) ◄──── always deployable, auto-deploys to Vercel + Render
  │
  ├── feature/billing-fix     ← short-lived, PR into main
  ├── feature/new-pillar-ui   ← short-lived, PR into main
  └── ...
```

**Rules:**
- `main` is production — every merge auto-deploys
- Feature branches are short-lived (hours to days, not weeks)
- All PRs require passing tests (GitHub Actions) before merge
- No direct pushes to `main` — everything goes through PRs
- Vercel creates a preview deployment for every PR automatically

No `develop` branch. For a small team, Vercel preview deployments serve the staging role. Revisit if team grows beyond 3-4 developers.

---

## 3. CI/CD Pipeline

Hybrid approach: platform-native auto-deploy + GitHub Actions for testing.

### Stage 1: PR opened/updated — Test & Preview

```
Developer pushes to feature branch
         │
         ├──→ GitHub Actions: test.yml
         │    ├── Spin up PostgreSQL (pgvector) + Redis services
         │    ├── Run: uv run pytest src/tests/ -v (491 tests)
         │    ├── Run: cd apps/web && npm run build (catch build errors)
         │    └── Report: ✅ or ❌ on the PR (blocks merge if failing)
         │
         └──→ Vercel: auto-creates preview deployment
              └── Unique URL per PR for frontend review
```

GitHub Actions runs tests and reports pass/fail. Vercel creates a preview URL. Neither deploys to production.

### Stage 2: PR merged to `main` — Auto-Deploy

```
PR merged to main
         │
         ├──→ Render detects push to main
         │    ├── Pre-Deploy Command: cd apps/api && alembic upgrade head
         │    │   └── If migration fails → deploy aborted, old version stays live
         │    └── Build & deploy → paths-api.limitless-longevity.health
         │
         └──→ Vercel detects push to main
              └── Build & deploy → paths.limitless-longevity.health
                                 → paths-admin.limitless-longevity.health
```

Vercel and Render deploy independently and concurrently. Both complete within 1-3 minutes. The brief out-of-sync window is negligible at low traffic. If a change requires strict ordering, split into two PRs: backend first, then frontend.

Render's Pre-Deploy Command runs `alembic upgrade head` before swapping to new code. If the migration fails, the deploy is rolled back automatically. When there are no pending migrations (most deploys), it completes in ~1-2 seconds.

### Stage 3: Post-Deploy — Monitoring

```
Deploy completes
         │
         ├──→ Sentry: catches runtime errors in new code
         ├──→ Vercel Analytics: frontend performance metrics
         └──→ Render Dashboard: backend CPU, memory, response times
```

### Rollback procedure

- **Vercel:** Dashboard → Deployments → "Promote to Production" on previous deployment. Instant, ~5 seconds.
- **Render:** Dashboard → Events → "Rollback" on previous deploy. ~30 seconds to restart.
- **Database:** Write a reverse migration (`alembic downgrade -1`) and deploy. Manual and deliberate — no automated database rollbacks.

### Intentionally excluded

| Concern | Rationale |
|---------|-----------|
| Automated smoke tests post-deploy | Sentry catches errors. Add when traffic justifies it. |
| Slack/Discord notifications | Add trivially later. Not a deployment concern. |
| Canary/blue-green deploys | Render Starter doesn't support it. Upgrade when needed. |
| Backend preview environments | Extra cost. Frontend previews cover most review needs. |

---

## 4. Configuration & Secrets

Secrets managed via platform environment variables (Render dashboard + Vercel dashboard). No centralized secrets manager at this stage — revisit when consolidating CUBES+ and HUBS under shared auth.

### Local Development (unchanged)

| Config | Source |
|--------|--------|
| Backend | `apps/api/config/config.yaml` (development_mode: true, localhost URLs) |
| Frontend | `apps/web/.env.local` (NEXT_PUBLIC_LEARNHOUSE_BACKEND_URL=http://localhost:9000) |
| Database | Docker via `docker-compose.dev.yml` (port 5433) |
| Redis | Docker (port 6379) |
| Stripe | Test keys in config.yaml |

### Production — Render (Backend)

Environment variables set in Render dashboard. The codebase (`config.py`) already reads env vars with `os.environ.get()` and falls back to `config.yaml`. All env vars use the `LEARNHOUSE_` prefix.

**Note:** Render auto-provides `DATABASE_URL` and `REDIS_URL`, but the application reads `LEARNHOUSE_SQL_CONNECTION_STRING` and `LEARNHOUSE_REDIS_CONNECTION_STRING`. Set these manually using the Render-provided internal connection strings.

| Env Var | Value / Source |
|---------|---------------|
| **Core** | |
| `LEARNHOUSE_ENV` | `prod` |
| `LEARNHOUSE_DEVELOPMENT_MODE` | `false` |
| `LEARNHOUSE_SAAS` | `true` (enables plan-based gating for billing/tier features) |
| `LEARNHOUSE_DOMAIN` | `paths.limitless-longevity.health` |
| `LEARNHOUSE_FRONTEND_DOMAIN` | `paths.limitless-longevity.health` |
| `LEARNHOUSE_SSL` | `true` |
| `LEARNHOUSE_ALLOWED_ORIGINS` | `https://paths.limitless-longevity.health,https://paths-admin.limitless-longevity.health` |
| **Auth** | |
| `LEARNHOUSE_AUTH_JWT_SECRET_KEY` | Generate new (min 32 chars, `secrets.token_urlsafe(32)`) |
| `LEARNHOUSE_COOKIE_DOMAIN` | `.limitless-longevity.health` |
| **Database & Redis** | |
| `LEARNHOUSE_SQL_CONNECTION_STRING` | Copy from Render's internal PostgreSQL connection string |
| `LEARNHOUSE_REDIS_CONNECTION_STRING` | Copy from Render's internal Redis connection string |
| **Stripe** (empty until payment go-live) | |
| `LEARNHOUSE_STRIPE_SECRET_KEY` | Live key when ready |
| `LEARNHOUSE_STRIPE_PUBLISHABLE_KEY` | Live key when ready |
| `LEARNHOUSE_STRIPE_WEBHOOK_STANDARD_SECRET` | Webhook signing secret when ready |
| **Sentry** | |
| `LEARNHOUSE_SENTRY_DSN` | From Sentry project (paths-api) |
| **Content Storage (Cloudflare R2)** | |
| `LEARNHOUSE_CONTENT_DELIVERY_TYPE` | `s3api` |
| `LEARNHOUSE_S3_API_BUCKET_NAME` | R2 bucket name |
| `LEARNHOUSE_S3_API_ENDPOINT_URL` | `https://<account-id>.r2.cloudflarestorage.com` |
| `AWS_ACCESS_KEY_ID` | R2 API token (boto3 standard env var) |
| `AWS_SECRET_ACCESS_KEY` | R2 API token (boto3 standard env var) |
| **Email** | |
| `LEARNHOUSE_EMAIL_PROVIDER` | `resend` (or `smtp`) |
| `LEARNHOUSE_SYSTEM_EMAIL_ADDRESS` | e.g., `noreply@limitless-longevity.health` |
| `LEARNHOUSE_RESEND_API_KEY` | From Resend dashboard (required for password reset, email verification) |

### Production — Vercel (Frontend)

| Env Var | Value |
|---------|-------|
| `NEXT_PUBLIC_LEARNHOUSE_BACKEND_URL` | `https://paths-api.limitless-longevity.health` |
| `NEXT_PUBLIC_LEARNHOUSE_DOMAIN` | `paths.limitless-longevity.health` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Empty until payment go-live |
| `NEXT_PUBLIC_SENTRY_DSN` | From Sentry project (paths-web) |

### Config adaptation

The codebase's `config.py` already reads environment variables with `os.environ.get()` fallback to YAML — no code changes needed for env var support. The only adaptation required is ensuring the correct `LEARNHOUSE_*` env var names are set on Render (see table above), since Render's auto-provided names (`DATABASE_URL`, `REDIS_URL`) do not match what the application reads.

### Secrets to generate fresh for production

| Secret | Method |
|--------|--------|
| JWT secret key | `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| PostgreSQL credentials | Render auto-generates |
| Redis credentials | Render auto-generates |

---

## 5. DNS, SSL & Domain Routing

### DNS Records

All records managed at Cloudflare (DNS provider). Corporate site on GitHub Pages remains unchanged.

| Record | Type | Name | Value | Proxy |
|--------|------|------|-------|-------|
| PATHS frontend | CNAME | `paths` | `cname.vercel-dns.com` | DNS only |
| PATHS admin | CNAME | `paths-admin` | `cname.vercel-dns.com` | DNS only |
| PATHS API | CNAME | `paths-api` | Render service hostname | DNS only |

DNS-only mode (no Cloudflare proxy) because both Vercel and Render manage their own SSL certificates. Cloudflare's proxy would cause certificate conflicts and double-TLS overhead.

### SSL/TLS

| Service | Certificate | Provisioning | Renewal |
|---------|-------------|-------------|---------|
| Vercel | Let's Encrypt | Automatic on custom domain add | Automatic |
| Render | Let's Encrypt | Automatic on custom domain add | Automatic |

HTTPS enforced by default on both platforms. No manual certificate management.

### Subdomain Routing in Next.js

Vercel serves both `paths.*` and `paths-admin.*` from the same Next.js app. Differentiation via middleware:

```
Request → Host: paths.limitless-longevity.health
       → Next.js middleware → /(public)/ route group
       → /articles, /courses, /account/billing, etc.

Request → Host: paths-admin.limitless-longevity.health
       → Next.js middleware → /(admin)/ route group
       → /organizations, /users, /tiers, /pillars, etc.
```

Same pattern as local development (`admin.localhost:3000`). Production change required: the current `proxy.ts` middleware detects admin via `hostbare?.startsWith('admin.')`. Since the production admin subdomain is `paths-admin.*` (not `admin.*`), the middleware must be updated to also match hosts starting with `paths-admin.`. This is a targeted change in `proxy.ts`.

### Cookie Configuration

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `Domain` | `.limitless-longevity.health` | Cookie sent to all subdomains (SSO-ready) |
| `Secure` | `true` | HTTPS only |
| `HttpOnly` | `true` | Not accessible via JavaScript |
| `SameSite` | `Lax` | Same-site navigations only |
| `Path` | `/` | All paths |

The cookie domain (`.limitless-longevity.health`) enables cross-app SSO. When CUBES+ and HUBS migrate to this domain, the JWT cookie will be sent automatically — no auth changes needed.

---

## 6. Database & Storage

### PostgreSQL (Render, Frankfurt)

| Setting | Value |
|---------|-------|
| Plan | Starter ($7/mo) |
| Region | Frankfurt (EU) |
| Version | PostgreSQL 16 |
| Extensions | pgvector (`CREATE EXTENSION vector;`) |
| Storage | 1 GB (Starter) |
| Max connections | 20 (Starter) — sufficient for single backend instance |
| Backups | Daily automatic snapshots, 7-day retention |

**Initial setup:**
1. Create Render PostgreSQL instance (Frankfurt)
2. Enable pgvector: `CREATE EXTENSION vector;`
3. Bootstrap schema: `SQLModel.metadata.create_all()` via LearnHouse CLI
4. Seed defaults: membership tiers, content pillars, admin user
5. All subsequent changes via Alembic

**Connection:** Internal URL (private network, no public exposure). External connection string available for one-off admin tasks only.

**Scaling:** Starter → Standard ($20/mo, 40 connections, 10 GB) → Pro ($55/mo, 80 connections, 50 GB). Upgrade via dashboard with minimal downtime.

### Redis (Render Free, Frankfurt)

| Setting | Value |
|---------|-------|
| Plan | Free (25 MB) |
| Region | Frankfurt |
| Engine | Valkey (Redis-compatible) |
| Eviction policy | `allkeys-lru` |

25 MB capacity analysis:
- JWT blacklist entries (~100 bytes each): ~250K entries
- Session cache (~500 bytes each): ~50K sessions
- Rate limiting counters (~50 bytes each): ~500K counters

Sufficient for low-to-moderate traffic. Monitor utilization — upgrade to Starter ($10/mo, 256 MB) if consistently above 80%.

### Cloudflare R2 (EU Jurisdiction)

| Setting | Value |
|---------|-------|
| Jurisdiction | EU |
| Bucket name | `limitless-paths-content` |
| Access | S3-compatible API (backend only) |
| Public access | Via signed URLs or R2 custom domain |

**Stores:** Course content files, article images/media, user uploads.
**Does not store:** Article text (PostgreSQL), static frontend assets (Vercel CDN).

**Free tier:** 10 GB storage, 10M reads/mo, 1M writes/mo. Likely free for months.

### Backup Strategy

| Data | Method | Frequency | Retention |
|------|--------|-----------|-----------|
| PostgreSQL | Render automatic snapshots | Daily | 7 days |
| Redis | None (ephemeral cache, rebuilds on loss) | — | — |
| R2 | Cloudflare auto-replication across EU DCs | Continuous | Durable (11 nines) |

PostgreSQL is the only critical backup. Upgrade to Standard ($20/mo) for 14-day retention and PITR when platform has paying customers.

---

## 7. Sentry Integration & Error Tracking

### Setup

| Component | SDK | Config |
|-----------|-----|--------|
| Backend | `sentry-sdk[fastapi]` | Initialize in `app.py`, DSN from env var |
| Frontend | `@sentry/nextjs` | `sentry.client.config.ts` + `sentry.server.config.ts` |

**Sentry organization:**
- Free tier: 5K errors/mo, 10K performance transactions/mo
- EU data region (`de.sentry.io`) — selected at org creation for GDPR
- Two projects: `paths-api` (Python), `paths-web` (Next.js)
- Each project gets its own DSN

### What gets tracked

| Signal | Backend | Frontend |
|--------|---------|----------|
| Unhandled exceptions | Auto-captured | Auto-captured |
| HTTP 5xx responses | Auto (FastAPI integration) | — |
| Client-side JS errors | — | Auto-captured |
| Failed Stripe webhook processing | Manual (`sentry_sdk.capture_exception()`) | — |
| Slow database queries | Optional (SQLAlchemy integration) | — |

### Alerting

- Email alerts on first occurrence of new errors (Sentry default)
- Spike protection enabled (pauses ingestion if error rate explodes)
- Slack/Teams: add later when team channel exists

### Deferred

| Concern | When to add |
|---------|-------------|
| Performance monitoring (tracing) | When debugging latency issues |
| Session replay | When conversion optimization matters ($26/mo) |
| Uptime monitoring | Anytime — UptimeRobot free tier, 5-minute setup |
| Log aggregation | When Render's built-in logs are insufficient |

---

## 8. Production Checklist & Launch Sequence

### Phase 1: Infrastructure Setup (~1-2 hours)

1. Create `limitless-paths` GitHub repo, push LearnHouse fork
2. Create Render services in Frankfurt: Web Service, PostgreSQL, Redis
3. Connect Render to GitHub repo (root directory: `apps/api/`)
4. Create Cloudflare R2 bucket (`limitless-paths-content`, EU jurisdiction)
5. Create Sentry organization (EU region), two projects (`paths-api`, `paths-web`)

### Phase 2: Configuration (~1-2 hours)

6. Generate production JWT secret: `python -c "import secrets; print(secrets.token_urlsafe(32))"` — save securely, use in step 7
7. Set all environment variables on Render (see Section 4 table — use correct `LEARNHOUSE_*` prefixed names, copy Render-provided DB/Redis internal URLs into `LEARNHOUSE_SQL_CONNECTION_STRING` and `LEARNHOUSE_REDIS_CONNECTION_STRING`)
8. Connect Vercel to GitHub repo (root directory: `apps/web/`)
9. Set Vercel environment variables (see Section 4 Vercel table)
10. Set Vercel serverless function region to `fra1` in `vercel.json`

### Phase 3: Database & Initial Deploy (~1 hour)

11. Bootstrap PostgreSQL: enable pgvector (`CREATE EXTENSION vector;`), run `cli.py install --short` via Render shell to create tables and seed defaults (admin user, tiers, pillars)
12. Update `proxy.ts` middleware admin hostname check: current code checks `hostbare?.startsWith('admin.')` — extend to also match `paths-admin.` prefix for production subdomain
13. Update CORS allowed origins via `LEARNHOUSE_ALLOWED_ORIGINS` env var
14. Push to `main` — first production deploy triggers on both platforms
15. Verify both services are running — hit `/api/docs` (FastAPI) and the frontend homepage. Configure Render health check path (e.g., `/api/v1/health` or `/api/docs`)

### Phase 4: DNS & Domains (~30 min + propagation)

16. Add custom domains in Vercel: `paths.limitless-longevity.health`, `paths-admin.limitless-longevity.health`
17. Add custom domain in Render: `paths-api.limitless-longevity.health`
18. Add DNS CNAME records in Cloudflare (DNS-only mode, no proxy)
19. Wait for SSL certificate provisioning (usually < 10 minutes)
20. Verify all three subdomains resolve and serve HTTPS

### Phase 5: CI & Verification (~1 hour)

21. Add GitHub Actions test workflow (`.github/workflows/test.yml`)
22. Configure branch protection on `main`: require passing tests, require PR review
23. Set Render Pre-Deploy Command: `cd apps/api && alembic upgrade head`
24. Add Sentry SDK to both backend and frontend
25. End-to-end smoke test: registration → login → browse articles → access admin panel

### Phase 6: Post-Launch Hardening (~30 min)

26. Verify JWT secret is the production key generated in step 6 (not the dev key from `config.yaml`)
27. Verify cookie domain is `.limitless-longevity.health` with `Secure; HttpOnly; SameSite=Lax` (inspect via browser DevTools on login)
28. Verify CORS only allows the two production frontend origins (test cross-origin request from browser)
29. Verify `LEARNHOUSE_DEVELOPMENT_MODE=false` and `LEARNHOUSE_ENV=prod` are set
30. Confirm Sentry receives a test error from both frontend and backend
31. Set up UptimeRobot free ping on all three subdomains (optional)

### Estimated total time: ~4-6 hours

### Deferred items

| Item | When |
|------|------|
| Stripe live keys + webhook endpoint | When ready to accept payments |
| Alembic baseline migration | Before first schema change post-launch |
| Uptime monitoring (UptimeRobot) | Anytime — 5 minute setup |
| Performance monitoring (Sentry) | When debugging latency |
| Render tier upgrades | When monitoring shows resource pressure |

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Deployment platform | Vercel + Render | Prior experience (GetShreddedApp), zero cold starts, best Next.js DX, low ops burden |
| Region | Frankfurt (EU) | GDPR compliance, EU-based primary audience, no extra cost |
| Subdomain pattern | Flat (`paths-api.*`) | Wildcard SSL compat, DNS simplicity, consistent with multi-app future |
| Repository | Dedicated `limitless-paths` | Clean separation from corporate site, own CI pipeline |
| Branching | Trunk-based (main only) | Small team, Vercel previews serve as staging |
| CI/CD | Hybrid (GH Actions tests + platform auto-deploy) | Simplicity of auto-deploy with quality gate of CI |
| Database migrations | `create_all()` bootstrap, Alembic going forward | Fastest to production, ~1-2 hour Alembic setup when needed |
| Content storage | Cloudflare R2 (EU) | Zero egress fees, S3-compatible (config already supports it), GDPR |
| Secrets management | Platform env vars (Render + Vercel dashboards) | Simple, sufficient for single app. Centralize when multi-app consolidation happens |
| Email provider | Resend (configure for production) | Already in config.yaml, needed for password reset and email verification |
| Error tracking | Sentry (EU data center) | Free tier, FastAPI + Next.js SDKs, GDPR-compliant |
| Monitoring | Platform-native + Sentry | Sufficient at launch. Add uptime/logs/tracing when needed |
| Staging environment | None (Vercel previews + Render preview envs on demand) | Cheaper, sufficient for small team |
| Stripe | Deferred (test mode only) | Not ready for live payments yet |

---

## GDPR Notes

- All production data processing happens in EU: Vercel (fra1), Render (Frankfurt), R2 (EU jurisdiction), Sentry (de.sentry.io)
- GitHub Actions CI runs on GitHub-hosted runners (US-based), but CI only executes tests with synthetic data — no production user data is processed in CI
- Cloudflare R2 EU jurisdiction hint is respected at bucket level — verify during setup that the bucket shows EU location
- Stripe is GDPR-compliant globally and offers EU entity processing
- If CI ever needs to run against a staging database with real user data, this would require a GDPR reassessment
