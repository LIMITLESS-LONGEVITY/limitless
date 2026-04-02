# Multi-Environment Strategy Analysis for LIMITLESS Longevity OS

## Context

LIMITLESS is scaling from 1 live repo (PATHS) to 5+ (PATHS, HUB, Digital Twin, CUBES+, OS Dashboard). The question: should we adopt the standard Dev/QA/Staging/Prod environment pipeline?

This is a **decision report**, not an implementation plan. The deliverable is a spec at `docs/superpowers/specs/2026-03-27-environment-strategy-design.md` with a clear recommendation.

---

## Current State: Production-Only

```
Local dev → GitHub Actions (CI) → Auto-deploy to Render (production)
```

- **1 Render web service** (paths-api, Starter $7/mo)
- **1 PostgreSQL** (basic_256mb, $6/mo)
- **1 Redis** (free)
- **No staging environment**, no preview environments
- CI runs lint + tests + build on PRs, but migrations only tested against production DB at deploy time
- Vercel previews were tried and removed (Payload needs direct DB access)

### Incidents Caused by This Gap

**2026-03-26 AI Tutor Failure:** 8 phases merged to main in 4 hours. Migrations were correct but query building failed. All AI features broken in production. No staging DB to catch this.

**2026-03-27 Issue #23:** `ai_config` token_budgets migration not applied. Every AI endpoint returns 500. The migration ran on deploy but silently failed — no staging environment caught it before users were affected.

Both incidents share the same root cause: **production is the first place migrations are tested against a real database.**

---

## Analysis: Three Options

### Option A: Full Enterprise Pipeline (Dev → QA → Staging → Prod)

**What it looks like:**
- 4 environments, each with its own Render service + PostgreSQL + Redis
- Dedicated QA team tests in QA environment
- Staging mirrors production exactly

**Cost:** ~$52/month minimum (4× the current $13/mo)
**Verdict:** **Overkill.** We're a single developer with AI agents. No QA team. No separate dev team. The coordination overhead of 4 environments exceeds the value. This is designed for 10+ person teams with dedicated QA.

### Option B: Lightweight Staging (Production + Staging DB)

**What it looks like:**
- Production stays as-is on Render
- Add a **staging database only** (no staging web service)
- CI runs migrations against staging DB before deploying to production
- If migration fails on staging DB → deployment blocked
- Local dev remains unchanged

**How it works:**
1. Developer pushes to `main`
2. GitHub Actions runs tests (existing)
3. **NEW:** CI runs `npx payload migrate` against staging DB
4. If staging migration succeeds → Render auto-deploys to production
5. If staging migration fails → deployment blocked, developer notified

**Cost:** Render PostgreSQL basic_256mb: $6/mo → **Total: $19/mo** (vs current $13/mo)

**What it catches:** Both the 2026-03-26 and #23 incidents. Migration failures surface in CI, not in production.

**What it doesn't catch:** Runtime behavior differences (since there's no staging web service). But our AI endpoint failures were all migration/schema issues, not runtime bugs.

### Option C: Preview Environments (Per-PR)

**What it looks like:**
- Render creates a temporary full-stack environment for each PR
- Reviewer can test the complete app (frontend + API + DB) before merge
- Environment auto-destroyed when PR is closed

**Cost:** Render Professional plan ($19/user/mo) + per-PR resource costs
**Verdict:** **Too expensive for solo developer.** The $19/mo base cost plus resource costs per active PR adds up. Better suited for teams of 3+ where multiple people review PRs. Also, Render preview environments require `render.yaml` blueprints — a significant migration from our current Terraform setup.

---

## Recommendation: Option B — Staging Database Only

This is the minimum viable change that prevents the class of incidents we've been hitting.

### Why Not a Full Staging Service?

A staging web service ($7/mo) provides marginal benefit for our use case:
- Our runtime bugs are rare — the AI tutor failure and #23 were both **migration failures**, not code bugs
- Frontend behavior is testable locally (`pnpm dev`)
- API behavior is tested by CI integration tests (107 passing)
- The missing piece is specifically **migration testing against a real PostgreSQL with production-like schema**

### Why Render PostgreSQL (Same Provider as Production)

- **Identical provider:** Same PostgreSQL build, connection handling, extension versions, infrastructure. If a migration passes on staging, it WILL pass on production. Zero provider-gap risk.
- **Same networking:** Internal Render-to-Render connections behave identically
- **No new vendor:** One less account, dashboard, and variable to manage
- **$6/mo for certainty:** The whole point of staging is eliminating variables between test and production

Neon was considered (free tier, branching) but rejected: introducing a different provider adds exactly the kind of variable staging is meant to eliminate. For a platform serving C-suite executives, $6/mo certainty beats $0/mo "probably fine."

### Implementation: What Changes

**1. Database setup (one-time, via Terraform)**
- Add Render PostgreSQL `limitless-paths-staging-db` (basic_256mb, Frankfurt) to `limitless-infra/paths.tf`
- Seed with production schema dump (`pg_dump --schema-only` from production → `psql` to staging)
- Store connection string as `STAGING_DATABASE_URL` in GitHub Actions secrets

**2. CI pipeline change (one file)**
Add a step to `.github/workflows/ci.yml` before the existing build step:
```yaml
- name: Test migrations against staging DB
  env:
    DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
    PAYLOAD_SECRET: ci-staging-secret
  run: npx payload migrate
```

**3. Branch strategy (optional enhancement)**
Current: push to `main` → auto-deploy
Enhanced: PR to `main` → CI tests migrations on staging DB → merge → auto-deploy

No change to the actual deploy pipeline. Render still auto-deploys on push to `main`. The only addition is a CI gate that catches migration failures before they reach production.

**4. Terraform (small addition)**
Add the staging PostgreSQL to `limitless-infra/paths.tf` alongside the production database. Same workspace — it's a single resource, not a full environment. Pattern:
```hcl
resource "render_postgres" "paths_staging_db" {
  name          = "limitless-paths-staging-db"
  database_name = "limitless_paths_staging"
  database_user = "limitless_paths_staging_user"
  plan          = "basic_256mb"
  region        = "frankfurt"
  version       = "16"
}
```

### What This Catches (Incident Prevention)

| Incident | Would Staging DB Have Caught It? |
|----------|----------------------------------|
| 2026-03-26 AI tutor failure (query building error) | **Yes** — migration would have run on staging DB first, query would have failed in CI |
| #23 ai_config token_budgets migration | **Yes** — CI would have detected the migration not applying correctly |
| #18 content chunks not indexed | **No** — this is a data issue, not a schema issue |
| Future: wrong column names in manual migrations | **Yes** — staging DB has production schema |

### What This Doesn't Catch

- Runtime behavior differences (no staging web service)
- Environment variable misconfigurations (different env vars per environment)
- Performance issues under load
- Frontend rendering bugs (use local dev + Playwright tests for this)

### Cost Impact

| Current | With Staging DB (Render) |
|---------|------------------------|
| $13/mo | $19/mo (+$6) |

### When to Upgrade to Full Staging

Adopt a full staging environment (web service + DB) when ANY of these become true:
- 3+ developers working on the same repo
- Paying customers depend on uptime SLAs
- Runtime bugs (not just migration bugs) start causing production incidents
- You need to demo features to stakeholders before release

None of these are true today. The staging DB alone covers our actual failure mode.

---

## Multi-Repo Consideration (Longevity OS)

When HUB and Digital Twin go live, each will need the same pattern:
- Production DB on Render
- Staging DB branch on Neon (or separate Render instance)
- CI migration gate before deploy

Each repo gets its own Render staging PostgreSQL ($6/mo each). At full build-out (PATHS + HUB + Digital Twin): $18/mo for staging DBs. Each repo's CI pipeline independently tests its own migrations.

Cross-repo integration testing (HUB calling Digital Twin API) is a future concern best addressed when both services are live. For now, API contract testing (Architect-defined contracts from the agentic dev team plan) prevents integration drift.

---

## Deliverable

Write `docs/superpowers/specs/2026-03-27-environment-strategy-design.md` containing:
1. This analysis (current state, three options, recommendation)
2. Implementation steps for Option B
3. CI workflow changes
4. Cost comparison
5. Upgrade criteria (when to move to full staging)

No code changes — this is a decision document. Implementation happens after approval.
