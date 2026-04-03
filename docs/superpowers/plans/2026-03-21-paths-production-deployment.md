# PATHS Production Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the PATHS platform to production on Vercel (frontend) + Render (backend/DB/Redis) in Frankfurt (EU).

**Architecture:** Next.js 16 on Vercel Pro (fra1), FastAPI on Render Starter (Frankfurt), PostgreSQL + Redis on Render, Cloudflare R2 for content storage, Sentry for error tracking. Flat subdomain pattern: `paths.*`, `paths-admin.*`, `paths-api.*` under `limitless-longevity.health`.

**Tech Stack:** Next.js 16, FastAPI, PostgreSQL 16 (pgvector), Redis/Valkey, Cloudflare R2, Sentry, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-03-21-paths-production-deployment-design.md`

---

## Important Notes

**This plan mixes code tasks and platform configuration tasks.** Code tasks can be executed by an agent. Platform tasks (marked with `[MANUAL]`) require the user to perform actions in web dashboards (Render, Vercel, Cloudflare, Sentry, GitHub).

**Pre-existing integrations discovered during planning:**
- Sentry backend: already initialized in `apps/api/app.py:71-80` — just needs `LEARNHOUSE_SENTRY_DSN` env var
- Sentry frontend: already configured (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) — just needs `NEXT_PUBLIC_SENTRY_DSN` env var
- CI workflows: already exist (`.github/workflows/api-tests.yaml`, `api-lint.yaml`, `web-lint.yaml`) — need branch updates from `dev` to `main`
- Health endpoint: already exists at `/health` (routers/health.py)
- Cookie/CORS: already dynamic via env vars — no code changes needed

---

### Task 1: Create GitHub Repository

**[MANUAL] — User performs in GitHub**

- [ ] **Step 1: Create the `limitless-paths` repo on GitHub**

Create a new private repository named `limitless-paths` under your GitHub account/organization. Do not initialize with README or .gitignore.

- [ ] **Step 2: Push the LearnHouse fork to the new repo**

```bash
cd C:/Projects/LIMITLESS/learnhouse
git remote add production https://github.com/<your-org>/limitless-paths.git
git push production dev:main
```

This pushes your `dev` branch as `main` in the new repo. From now on, `main` is the production branch.

- [ ] **Step 3: Verify the push**

```bash
git log production/main --oneline -5
```

Expected: your latest commits visible on `main`.

---

### Task 2: Update CI Workflows for Production Branch

**Files:**
- Modify: `.github/workflows/api-tests.yaml`
- Modify: `.github/workflows/api-lint.yaml`
- Modify: `.github/workflows/web-lint.yaml`

The existing CI workflows trigger on `dev` branch. Update them to trigger on `main` (the production branch in the new repo). **Important:** Only change `dev` → `main` in the `push.branches` key. Preserve the existing `paths:` filters and `pull_request:` triggers exactly as they are.

- [ ] **Step 1: Update `api-tests.yaml` branch target**

In `.github/workflows/api-tests.yaml`, change only the branch name — keep `paths:` and `pull_request:` blocks unchanged:
```yaml
# Change this line only:
    branches:
      - dev
# To:
    branches:
      - main
```

The full `on:` block should look like this after the change:
```yaml
on:
  push:
    branches:
      - main
    paths:
      - "apps/api/**"
  pull_request:
    paths:
      - "apps/api/**"
```

Also update the Python version to match production (3.12 instead of 3.14):
```yaml
      - name: Set up Python
        uses: actions/setup-python@v6
        with:
          python-version: "3.12"
```

- [ ] **Step 2: Update `api-lint.yaml` branch target**

In `.github/workflows/api-lint.yaml`, change only the branch name:
```yaml
# Change this line only:
    branches:
      - dev
# To:
    branches:
      - main
```

The full `on:` block should look like this after the change:
```yaml
on:
  push:
    branches:
      - main
    paths:
      - "apps/api/**"
  pull_request:
    paths:
      - "apps/api/**"
```

- [ ] **Step 3: Update `web-lint.yaml` branch target**

In `.github/workflows/web-lint.yaml`, change only the branch name:
```yaml
# Change this line only:
    branches:
      - dev
# To:
    branches:
      - main
```

The full `on:` block should look like this after the change:
```yaml
on:
  push:
    branches:
      - main
    paths:
      - "apps/web/**"
  pull_request:
    paths:
      - "apps/web/**"
```

- [ ] **Step 4: Add frontend build check to web-lint workflow**

Append a build step after the lint step in `web-lint.yaml` to catch TypeScript/build errors:
```yaml
      - name: Build
        run: bun run build
        working-directory: ./apps/web
        env:
          NEXT_PUBLIC_LEARNHOUSE_BACKEND_URL: http://localhost:9000
          NEXT_PUBLIC_LEARNHOUSE_DOMAIN: localhost:3000
```

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/api-tests.yaml .github/workflows/api-lint.yaml .github/workflows/web-lint.yaml
git commit -m "ci: update workflow branches from dev to main, add frontend build check"
```

---

### Task 3: Update Admin Subdomain Detection in proxy.ts

**Files:**
- Modify: `apps/web/proxy.ts:136`
- Test: Manual verification (subdomain routing tested in Task 10 smoke test)

The current middleware only checks for `admin.` prefix. Production uses `paths-admin.` subdomain.

- [ ] **Step 1: Update the admin subdomain check**

In `apps/web/proxy.ts`, line 136, change:
```typescript
  const isAdminSubdomain = hostbare?.startsWith('admin.') ||
    (fullhost ? extractSubdomain(fullhost, instanceInfo.frontend_domain) === 'admin' : false)
```
to:
```typescript
  const isAdminSubdomain = hostbare?.startsWith('admin.') ||
    hostbare?.startsWith('paths-admin.') ||
    (fullhost ? extractSubdomain(fullhost, instanceInfo.frontend_domain) === 'admin' : false)
```

This preserves backward compatibility with the local dev `admin.localhost` while adding production `paths-admin.*` support.

- [ ] **Step 2: Commit**

```bash
git add apps/web/proxy.ts
git commit -m "feat: add paths-admin subdomain detection for production routing"
```

---

### Task 4: Create vercel.json for Region Configuration

**Files:**
- Create: `vercel.json` (repo root)

- [ ] **Step 1: Create `vercel.json`**

Create `vercel.json` in the repository root with:
```json
{
  "buildCommand": "cd apps/web && bun install --frozen-lockfile && bun run build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "echo 'skipped'",
  "framework": "nextjs",
  "regions": ["fra1"]
}
```

Notes:
- `regions: ["fra1"]` pins serverless functions to Frankfurt (EU) for GDPR
- `buildCommand` and `outputDirectory` set the monorepo root directory for Vercel
- `installCommand` is skipped because `bun install` is handled in the build command

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add vercel.json with Frankfurt region and monorepo config"
```

---

### Task 5: Create Render Blueprint (Optional IaC)

**Files:**
- Create: `render.yaml` (repo root)

- [ ] **Step 1: Create `render.yaml`**

Create `render.yaml` in the repository root:
```yaml
services:
  - type: web
    name: paths-api
    runtime: python
    region: frankfurt
    plan: starter
    rootDir: apps/api
    buildCommand: pip install uv && uv sync
    startCommand: uv run uvicorn app:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
    preDeployCommand: uv run alembic upgrade head  # runs from rootDir (apps/api)
    envVars:
      - key: PYTHON_VERSION
        value: "3.12"
      - key: LEARNHOUSE_ENV
        value: prod
      - key: LEARNHOUSE_DEVELOPMENT_MODE
        value: "false"
      - key: LEARNHOUSE_SAAS
        value: "true"
      - key: LEARNHOUSE_SSL
        value: "true"
      - key: LEARNHOUSE_DOMAIN
        value: paths.limitless-longevity.health
      - key: LEARNHOUSE_FRONTEND_DOMAIN
        value: paths.limitless-longevity.health
      - key: LEARNHOUSE_COOKIE_DOMAIN
        value: .limitless-longevity.health
      - key: LEARNHOUSE_ALLOWED_ORIGINS
        value: "https://paths.limitless-longevity.health,https://paths-admin.limitless-longevity.health"
      - key: LEARNHOUSE_CONTENT_DELIVERY_TYPE
        value: s3api
      # Secrets — set manually in Render dashboard, not in this file:
      # LEARNHOUSE_AUTH_JWT_SECRET_KEY
      # LEARNHOUSE_SQL_CONNECTION_STRING
      # LEARNHOUSE_REDIS_CONNECTION_STRING
      # LEARNHOUSE_SENTRY_DSN
      # LEARNHOUSE_S3_API_BUCKET_NAME
      # LEARNHOUSE_S3_API_ENDPOINT_URL
      # AWS_ACCESS_KEY_ID
      # AWS_SECRET_ACCESS_KEY
      # LEARNHOUSE_STRIPE_SECRET_KEY
      # LEARNHOUSE_STRIPE_PUBLISHABLE_KEY
      # LEARNHOUSE_STRIPE_WEBHOOK_STANDARD_SECRET
      # LEARNHOUSE_RESEND_API_KEY
      # LEARNHOUSE_SYSTEM_EMAIL_ADDRESS
      # LEARNHOUSE_EMAIL_PROVIDER
```

This file documents the Render configuration as code. Non-secret env vars are defined here; secrets are set manually in the Render dashboard and referenced as comments.

- [ ] **Step 2: Commit**

```bash
git add render.yaml
git commit -m "feat: add render.yaml blueprint for production backend configuration"
```

---

### Task 6: Push Code Changes and First Deploy

- [ ] **Step 1: Push all code changes to the production repo**

```bash
cd C:/Projects/LIMITLESS/learnhouse
git push production main
```

This triggers the first deploy on both Vercel and Render (once connected in Tasks 7 and 8).

---

### Task 7: Set Up Render Services

**[MANUAL] — User performs in Render dashboard (https://dashboard.render.com)**

- [ ] **Step 1: Create PostgreSQL instance**

- Dashboard → New → PostgreSQL
- Name: `limitless-paths-db`
- Region: **Frankfurt (EU Central)**
- Plan: **Starter** ($7/mo)
- PostgreSQL version: 16
- Click Create

Note the **internal connection string** — you'll need it in Step 4.

- [ ] **Step 2: Create Redis (Key-Value) instance**

- Dashboard → New → Key-Value (Redis)
- Name: `limitless-paths-redis`
- Region: **Frankfurt (EU Central)**
- Plan: **Free** (25 MB)
- Click Create

Note the **internal connection string**.

- [ ] **Step 3: Create Web Service**

- Dashboard → New → Web Service
- Connect to the `limitless-paths` GitHub repo
- Name: `paths-api`
- Region: **Frankfurt (EU Central)**
- Branch: `main`
- Root Directory: `apps/api`
- Runtime: Python
- Build Command: `pip install uv && uv sync`
- Start Command: `uv run uvicorn app:app --host 0.0.0.0 --port $PORT`
- Plan: **Starter** ($7/mo)
- Click Create (it will fail the first deploy — that's expected, env vars aren't set yet)

- [ ] **Step 4: Set environment variables on the Web Service**

Go to the `paths-api` service → Environment tab. Add all env vars from the spec's Section 4 table:

**Generate the JWT secret first:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Set each `LEARNHOUSE_*` env var. For `LEARNHOUSE_SQL_CONNECTION_STRING` and `LEARNHOUSE_REDIS_CONNECTION_STRING`, copy the **internal** connection strings from the PostgreSQL and Redis services you just created.

See `docs/superpowers/specs/2026-03-21-paths-production-deployment-design.md`, Section 4 for the complete env var table.

- [ ] **Step 5: Set the health check path**

In the `paths-api` service settings → Health Check Path: `/health`

- [ ] **Step 6: Set the Pre-Deploy Command**

In the `paths-api` service settings → Pre-Deploy Command: `uv run alembic upgrade head` (runs from rootDir `apps/api`, no `cd` needed)

- [ ] **Step 7: Add custom domain**

In the `paths-api` service → Settings → Custom Domains → Add `paths-api.limitless-longevity.health`

Note the Render hostname shown (e.g., `paths-api-xxxx.onrender.com`) — you'll need it for DNS.

---

### Task 8: Set Up Vercel Project

**[MANUAL] — User performs in Vercel dashboard (https://vercel.com/dashboard)**

- [ ] **Step 1: Import the `limitless-paths` repo**

- Dashboard → Add New → Project
- Import the `limitless-paths` GitHub repo
- Framework Preset: Next.js
- Root Directory: `apps/web`
- Build and Output settings should auto-detect from `vercel.json`

- [ ] **Step 2: Set environment variables**

Add in the Vercel project settings → Environment Variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_LEARNHOUSE_BACKEND_URL` | `https://paths-api.limitless-longevity.health` |
| `NEXT_PUBLIC_LEARNHOUSE_DOMAIN` | `paths.limitless-longevity.health` |
| `NEXT_PUBLIC_SENTRY_DSN` | (from Sentry project, Task 9) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | (leave empty for now) |

- [ ] **Step 3: Add custom domains**

Settings → Domains → Add:
- `paths.limitless-longevity.health`
- `paths-admin.limitless-longevity.health`

Note the CNAME target shown (likely `cname.vercel-dns.com`).

- [ ] **Step 4: Trigger a redeploy**

After setting env vars: Deployments → redeploy the latest deployment.

---

### Task 9: Set Up Sentry

**[MANUAL] — User performs in Sentry (https://sentry.io)**

- [ ] **Step 1: Create Sentry organization**

- Go to sentry.io → Create Organization
- **Important:** During setup, select **EU (de.sentry.io)** as the data region for GDPR
- Plan: Free (5K errors/mo)

- [ ] **Step 2: Create two projects**

- Project 1: `paths-api` (platform: Python, framework: FastAPI)
- Project 2: `paths-web` (platform: JavaScript, framework: Next.js)

- [ ] **Step 3: Copy DSNs**

Each project has a unique DSN (Settings → Client Keys (DSN)).
- Copy `paths-api` DSN → set as `LEARNHOUSE_SENTRY_DSN` on Render
- Copy `paths-web` DSN → set as `NEXT_PUBLIC_SENTRY_DSN` on Vercel

- [ ] **Step 4: Enable spike protection**

Settings → Spike Protection → Enable. This prevents runaway error floods from exhausting your free quota.

---

### Task 10: Set Up Cloudflare R2 Bucket

**[MANUAL] — User performs in Cloudflare dashboard**

- [ ] **Step 1: Create R2 bucket**

- Cloudflare Dashboard → R2 Object Storage → Create bucket
- Bucket name: `limitless-paths-content`
- Location hint: **EU (Western Europe)**

- [ ] **Step 2: Create R2 API token**

- R2 → Manage R2 API Tokens → Create API Token
- Permissions: Object Read & Write
- Scope: Specific bucket → `limitless-paths-content`
- Copy the **Access Key ID** and **Secret Access Key**

- [ ] **Step 3: Set R2 env vars on Render**

In Render `paths-api` service → Environment:
- `LEARNHOUSE_S3_API_BUCKET_NAME` = `limitless-paths-content`
- `LEARNHOUSE_S3_API_ENDPOINT_URL` = `https://<your-account-id>.r2.cloudflarestorage.com`
- `AWS_ACCESS_KEY_ID` = (from step 2)
- `AWS_SECRET_ACCESS_KEY` = (from step 2)

---

### Task 11: Configure DNS Records

**[MANUAL] — User performs in Cloudflare DNS**

- [ ] **Step 1: Add CNAME records**

In Cloudflare DNS → Add records (all **DNS only**, NOT proxied):

| Type | Name | Target |
|------|------|--------|
| CNAME | `paths` | `cname.vercel-dns.com` |
| CNAME | `paths-admin` | `cname.vercel-dns.com` |
| CNAME | `paths-api` | (Render hostname from Task 7, Step 7) |

**Critical:** Set proxy status to **DNS only** (grey cloud icon, not orange). Vercel and Render manage their own SSL.

- [ ] **Step 2: Verify SSL certificate provisioning**

Wait 5-10 minutes, then verify:
- `https://paths.limitless-longevity.health` → should show Vercel deployment
- `https://paths-admin.limitless-longevity.health` → should show admin panel
- `https://paths-api.limitless-longevity.health/health` → should return health check JSON

---

### Task 12: Bootstrap Production Database

**[MANUAL] — User runs commands via Render shell or local machine**

- [ ] **Step 1: Enable pgvector extension**

Connect to the production database via Render's PSQL shell (Dashboard → Database → PSQL tab) or using the external connection string locally:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

- [ ] **Step 2: Bootstrap schema and seed data**

Via Render shell on the `paths-api` service (Dashboard → Shell tab):

```bash
LEARNHOUSE_INITIAL_ADMIN_EMAIL=info@limitless-longevity.health \
LEARNHOUSE_INITIAL_ADMIN_PASSWORD='<choose-a-strong-password>' \
uv run python cli.py install --short
```

This creates all tables (`SQLModel.metadata.create_all()`) and seeds the admin user with the provided credentials.

- [ ] **Step 3: Verify the database**

Via PSQL shell:
```sql
SELECT count(*) FROM "user";
-- Expected: 1 (the admin user)

SELECT count(*) FROM membershipTier;
-- Expected: at least 1 (free tier)
```

---

### Task 13: Configure GitHub Branch Protection

**[MANUAL] — User performs in GitHub repo settings**

- [ ] **Step 1: Set up branch protection rules**

Go to `limitless-paths` repo → Settings → Branches → Add branch protection rule:

- Branch name pattern: `main`
- Check: **Require a pull request before merging**
- Check: **Require status checks to pass before merging**
  - Add required checks: `test` (from api-tests.yaml), `ruff` (from api-lint.yaml), `next-lint` (from web-lint.yaml)
- Check: **Require branches to be up to date before merging**
- Save

---

### Task 14: End-to-End Smoke Test

**[MANUAL] — User performs in browser**

- [ ] **Step 1: Test public frontend**

Navigate to `https://paths.limitless-longevity.health`
- Page loads without errors
- Articles browse page renders
- Course listing renders

- [ ] **Step 2: Test authentication**

- Click Login → enter admin credentials from Task 12
- Verify JWT cookie is set with:
  - Domain: `.limitless-longevity.health`
  - Secure: true
  - HttpOnly: true
  - SameSite: Lax
- (Check via browser DevTools → Application → Cookies)

- [ ] **Step 3: Test admin panel**

Navigate to `https://paths-admin.limitless-longevity.health`
- Should auto-authenticate (same JWT cookie, cross-subdomain SSO)
- Admin dashboard loads
- Can navigate to Organizations, Users, Tiers, Pillars

- [ ] **Step 4: Test API directly**

```bash
curl -s https://paths-api.limitless-longevity.health/health | python -m json.tool
```

Expected: JSON health check response with status `ok`.

- [ ] **Step 5: Verify Sentry**

Trigger a test error:
- Backend: temporarily add `raise Exception("Sentry test")` to a test endpoint, or check Sentry dashboard for any startup errors already captured
- Frontend: open browser console on the PATHS site and run `throw new Error("Sentry frontend test")`
- Verify both errors appear in the respective Sentry projects

- [ ] **Step 6: Verify CORS**

Test that CORS is properly configured by running from your browser console on `https://paths.limitless-longevity.health`:
```javascript
fetch('https://paths-api.limitless-longevity.health/health', { credentials: 'include' })
  .then(r => console.log('CORS OK:', r.headers.get('access-control-allow-origin')))
  .catch(e => console.error('CORS FAIL:', e))
```
Expected: `CORS OK: https://paths.limitless-longevity.health`

- [ ] **Step 7: Verify JWT secret is production key**

In Render dashboard → `paths-api` service → Environment → find `LEARNHOUSE_AUTH_JWT_SECRET_KEY`. Confirm it is NOT the dev key from `config.yaml` (`uKqZtfd247tFhxpEeshXzCBLMbtvC9qR4_6Vo-MVZPU`). It should be the key you generated in Task 7 Step 4.

- [ ] **Step 8: Verify production configuration**

Confirm these are NOT true in production:
- `https://paths-api.limitless-longevity.health/docs` should return 404 — confirms `development_mode=false`
- `LEARNHOUSE_ENV` is set to `prod` in Render env vars
- `LEARNHOUSE_SAAS` is set to `true` in Render env vars

---

### Task 15: Post-Launch Optional — UptimeRobot Monitoring

**[MANUAL] — User performs at https://uptimerobot.com**

- [ ] **Step 1: Create free account and add monitors**

Add HTTP(S) monitors for:
- `https://paths.limitless-longevity.health` (5-minute interval)
- `https://paths-admin.limitless-longevity.health` (5-minute interval)
- `https://paths-api.limitless-longevity.health/health` (5-minute interval)

Set alert contacts to receive email on downtime.

---

## Summary

| Task | Type | Status | Notes |
|------|------|--------|-------|
| 1. Create GitHub repo | Manual | DONE | `LIMITLESS-LONGEVITY/limitless-paths` |
| 2. Update CI workflows | Code | DONE | |
| 3. Update proxy.ts admin check | Code | DONE | |
| 4. Create vercel.json | Code | DONE | Fixed: installCommand, outputDirectory |
| 5. Create render.yaml | Code | DONE | |
| 6. Push code changes | Code | DONE | |
| 7. Set up Render services | Manual | DONE | PG 18, Redis free, Starter web service |
| 8. Set up Vercel project | Manual | DONE | Pro plan required for private org repos |
| 9. Set up Sentry | Manual | DONE | EU region (de.sentry.io) |
| 10. Set up Cloudflare R2 | Manual | DONE | EU jurisdiction |
| 11. Configure DNS records | Manual | DONE | Via Cloudflare API after NS migration from GoDaddy |
| 12. Bootstrap production DB | Manual | DONE | Admin: info@limitless-longevity.health |
| 13. Configure branch protection | Manual | SKIPPED | Requires GitHub Team plan for private org repos |
| 14. End-to-end smoke test | Manual | DONE | SSO across subdomains verified |
| 15. UptimeRobot (optional) | Manual | TODO | |
| 16. Resend email provider | Manual | DONE | Domain verified, API key set on Render, password reset flow verified |
| 17. Contributor accounts | Manual | DONE | 5 accounts created (3 Coach/Author, 2 Editor/Publisher), onboarding via forgot-password flow |
| 18. Contributor guide | Code+Manual | DONE | MkDocs Material at guide.limitless-longevity.health, 14 Playwright screenshots |

**Completed: 2026-03-22 (deployment 2026-03-21, onboarding 2026-03-22)**

---

## Post-Deployment Fixes Applied

These issues were discovered and fixed during the first deployment:

| Fix | What happened | Resolution |
|-----|--------------|------------|
| `PYTHON_VERSION` | Render requires full semver (`3.12.10` not `3.12`) | Updated env var |
| `requires-python` | Lockfile pinned to 3.14.x, Render runs 3.12 | Broadened to `>=3.12`, regenerated lockfile |
| Pre-deploy command | `cd apps/api && ...` failed because rootDir is already `apps/api` | Changed to `uv run alembic upgrade head` |
| Health check path | Configured as `/health`, actual path is `/api/v1/health` | Updated Render health check path |
| Health endpoint auth | Had `Depends(get_non_api_token_user)`, blocking Render health checks | Removed auth dependency from health router |
| Alembic version table | Missing after `create_all()` bootstrap | Ran `alembic stamp head` on production DB |
| Vercel install command | `echo 'skipped'` prevented Next.js detection | Changed to `bun install --frozen-lockfile` |
| Vercel output directory | `apps/web/.next` doubled the root directory path | Changed to `.next` |
| `runtime-config.js` | Only generated in development, causing client-side to use `localhost` | Removed `NODE_ENV === 'development'` guard |
| `NEXT_PUBLIC_LEARNHOUSE_HTTPS` | Not set, causing `http://` canonical URLs | Added env var on Vercel |
| `NEXT_PUBLIC_LEARNHOUSE_TOP_DOMAIN` | Not set, cookie domain defaulted to `.paths.limitless-longevity.health` | Set to `limitless-longevity.health` |
| Instance cookies domain | Set without domain, not shared across subdomains | Added `.limitless-longevity.health` domain to middleware cookies |
| Admin email verification | `email_verified=false` blocked login | Set to `true` in DB |
| Superadmin flag | Admin role insufficient for superadmin dashboard | Set `is_superadmin=true` in DB |
