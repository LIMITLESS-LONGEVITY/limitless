# Monorepo Migration Completion & Directory Cleanup Plan

**Date:** 2026-04-03
**Author:** Architect (Main Instance)
**Status:** APPROVED — All 5 decisions finalized by Director (2026-04-03)
**Severity:** CRITICAL — Production deploy pipeline is broken/fragile

---

## Executive Summary

The monorepo migration (April 2) consolidated 6 repos into `~/projects/limitless/`. However, the migration was **structural only** — the apps were imported via `git subtree add`, but **Render still deploys from the old standalone repos, which are now ARCHIVED on GitHub.** Both sides have continued receiving changes independently, creating a two-way divergence that risks production outages.

This plan resolves three intertwined problems in one coordinated operation:

1. **Deploy pipeline is broken** — Render points at archived repos that can't receive new code
2. **Code divergence** — monorepo and old repos each have changes the other doesn't
3. **Directory mess** — two project folders (`LIMITLESS/` and `limitless/`) cause confusion and waste 3.5 GB

**This must be solved atomically.** Doing any piece in isolation (e.g., deleting old clones before fixing deploys) will cause production outages.

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Code Divergence: Complete Inventory](#2-code-divergence-complete-inventory)
3. [Stranded Feature Branches](#3-stranded-feature-branches)
4. [Deployment Topology](#4-deployment-topology)
5. [Execution Plan](#5-execution-plan)
6. [Post-Migration Verification](#6-post-migration-verification)
7. [Directory Cleanup](#7-directory-cleanup)
8. [Risk Assessment](#8-risk-assessment)

---

## 1. Current State Audit

### Two Directories

| Directory | Size | Git Remote | Purpose |
|-----------|------|-----------|---------|
| `~/projects/LIMITLESS/` | 3.5 GB | `limitless-website` (GitHub Pages) | Old umbrella — corporate website + stale app clones + untracked docs |
| `~/projects/limitless/` | 982 MB | `limitless` (monorepo) | Active Turborepo monorepo — all development should happen here |

### What Happened on April 2

1. Apps were imported into monorepo via `git subtree add --squash` from each repo's `main` branch
2. Old repos were **archived** on GitHub (description changed to "ARCHIVED — Migrated to monorepo")
3. GitHub Actions deploy workflows were added to the monorepo
4. **But:** Terraform `repo_url` was never updated — Render still points at the old repos
5. **And:** Work continued in BOTH locations — old repos got PRs merged, monorepo got direct fixes

### GitHub Org Repos

| Repo | Status | Render Deploys From? |
|------|--------|---------------------|
| `LIMITLESS-LONGEVITY/limitless` | **Active** (monorepo) | NO — not wired to Render |
| `LIMITLESS-LONGEVITY/limitless-paths` | ARCHIVED | YES — Terraform points here |
| `LIMITLESS-LONGEVITY/limitless-hub` | ARCHIVED | YES — Terraform points here |
| `LIMITLESS-LONGEVITY/limitless-digital-twin` | ARCHIVED | YES — Terraform points here |
| `LIMITLESS-LONGEVITY/limitless-cubes` | ARCHIVED | Not in Terraform (manual Render) |
| `LIMITLESS-LONGEVITY/limitless-os-dashboard` | ARCHIVED | Cloudflare Pages (auto-deploy) |
| `LIMITLESS-LONGEVITY/limitless-infra` | ARCHIVED | N/A (IaC only) |
| `LIMITLESS-LONGEVITY/limitless-website` | Active | GitHub Pages |

---

## 2. Code Divergence: Complete Inventory

### Direction Key
- **MONO AHEAD** = monorepo has changes the old repo main doesn't
- **OLD AHEAD** = old repo main has changes the monorepo doesn't
- **BOTH** = changes in both directions

### PATHS (`apps/paths/` vs `limitless-paths` main)

**Direction: MONO AHEAD** — monorepo has 3 features not in old repo main

| File | Change in Monorepo | In Old Repo? |
|------|-------------------|-------------|
| `src/app/(frontend)/discover/DiscoverClient.tsx` | Added `slug?: string` to interface; uses `item.slug \|\| item.sourceId` for links | NO — old repo uses sourceId only (404s) |
| `src/components/LessonNav/index.tsx` | Added `basePath` to `window.location.href` navigation | NO — old repo navigates without basePath (404s) |
| `src/endpoints/ai/discover.ts` | Added slug resolution — queries articles/courses by ID to fetch slugs | NO — old repo returns raw numeric IDs |
| `next.config.ts` | `turbopack.root` points to `path.resolve(dirname)` (monorepo-aware) | Different — old repo has no monorepo root |
| `api-contracts.json` | New file (CI contract testing) | NO |

**Old repo main has no unique src/ changes** — all its recent PRs (gpt-4o-mini, catchup migration, schema validation CI) were the same code that was also applied to the monorepo.

### CUBES+ (`apps/cubes/` vs `limitless-cubes` main)

**Direction: MONO AHEAD** — monorepo has exercise edit/media features + ESM migration

| File | Change in Monorepo | In Old Repo? |
|------|-------------------|-------------|
| `src/app/(coach)/library/exercises/[id]/page.tsx` | Added media rendering (YouTube, images), changed edit button route | NO |
| `src/app/(coach)/library/exercises/[id]/edit/page.tsx` | **New file** — exercise edit page | NO |
| `src/app/(coach)/library/exercises/new/page.tsx` | Simplified media handling | Different version |
| `src/app/api/v1/exercises/[id]/media/route.ts` | **New file** — media CRUD endpoint | NO |
| `src/app/api/v1/exercises/[id]/media/[mediaId]/route.ts` | **New file** — individual media endpoint | NO |
| `package.json` | Added `"type": "module"` (ESM) | NO — old repo is CommonJS |
| `next.config.ts` | Removed turbopack.root (ESM migration) | Different — old repo has turbopack.root |

### HUB (`apps/hub/` vs `limitless-hub` main)

**Direction: MONO AHEAD** — monorepo has cookie consent + turbopack config

| File | Change in Monorepo | In Old Repo? |
|------|-------------------|-------------|
| `src/components/CookieConsent.tsx` | **New file** — cookie consent banner with category toggles | NO |
| `src/app/layout.tsx` | Added `<CookieConsent />` import and render | NO |
| `src/app/globals.css` | Added slideUp animation, theme rule, reduced-motion query | NO |
| `src/components/Footer.tsx` | Added ManageCookiesButton, restructured footer links | NO |
| `next.config.ts` | Added turbopack.root for monorepo | NO — old repo has no monorepo root |

### Digital Twin (`apps/digital-twin/` vs `limitless-digital-twin` main)

**Direction: OLD AHEAD** — old repo has correct auth fix, monorepo has WRONG version

| File | Monorepo (WRONG) | Old Repo Main (CORRECT) |
|------|-----------------|----------------------|
| `src/plugins/auth.ts` | Delegates auth to PATHS via `fetch()` — old design | Local JWT verification with `jsonwebtoken` — correct design |
| `src/routes/activity.ts` | `String(request.user.id) !== String(userId)` — unnecessary coercion | `request.user.id !== userId` — direct comparison |
| `src/routes/ai-context.ts` | Same String() coercion | Direct comparison |
| `src/routes/biomarkers.ts` | Same | Direct |
| `src/routes/consents.ts` | Same | Direct |
| `src/routes/diagnostics.ts` | Same (2 locations) | Direct |
| `src/routes/gdpr.ts` | Same | Direct |
| `src/routes/longevity-score.ts` | Same | Direct |
| `src/routes/profile.ts` | Same | Direct |
| `src/routes/stay.ts` | Same | Direct |
| `src/routes/wearable-data.ts` | Same | Direct |

**11 files where monorepo has the WRONG version.** The old repo's `fix/auth-delegate-paths` branch was merged to main but never synced to monorepo.

Additionally: old repo has `drizzle/` migration directory that may be missing from monorepo.

### OS Dashboard (`apps/os-dashboard/` vs `limitless-os-dashboard` main)

**Direction: MONO AHEAD** — monorepo has widget crash fixes

| File | Change in Monorepo | In Old Repo? |
|------|-------------------|-------------|
| `src/components/GreetingBanner.tsx` | Stricter validation: `healthData?.biologicalAge != null`, `scoreData && typeof scoreData.currentScore === 'number'` | NO — old repo uses `if (healthData)` (crashes on unexpected shapes) |
| `src/components/widgets/CubesAppCard.tsx` | `if (d && typeof d.exerciseCount === 'number')` | NO — old repo uses `if (d)` |
| `src/components/widgets/TodaysWorkoutWidget.tsx` | `if (d && d.id && d.name && Array.isArray(d.exercises))` | NO — old repo uses `if (d)` (crashes) |

### Infrastructure (`infra/` vs `limitless-infra` master)

**Direction: OLD AHEAD** — old repo has uncommitted .tf changes not in monorepo

| File | Change in Old Repo | In Monorepo? |
|------|-------------------|-------------|
| `digital-twin.tf` | Added `npx drizzle-kit push --force &&` to start command; added `HUB_SERVICE_KEY`, `PATHS_SERVICE_KEY`, `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET` env vars | NO |
| `hub.tf` | Added `HUB_SERVICE_KEY`, `PATHS_INTERNAL_URL` env vars | NO |
| `paths.tf` | Added `HUB_SERVICE_KEY`, `DT_SERVICE_URL`, `DT_SERVICE_KEY` env vars | NO |
| `variables.tf` | Added `hub_service_key`, `paths_dt_service_key`, `oura_client_id`, `oura_client_secret` variable definitions | NO |
| `CLAUDE.md` | **New file** — infra-specific agent instructions | NO |

### Cubes+ (`apps/cubes/` vs `limitless-cubes` main) — CORRECTED

**Direction: OLD AHEAD** — old repo main has exercise edit/media features the monorepo is missing

| File | Status | Details |
|------|--------|---------|
| `src/app/(coach)/library/exercises/[id]/edit/page.tsx` | **MISSING from monorepo** | 436-line exercise edit form with full media management UI |
| `src/app/api/v1/exercises/[id]/media/route.ts` | **MISSING from monorepo** | POST endpoint — create media (YouTube, image, video) |
| `src/app/api/v1/exercises/[id]/media/[mediaId]/route.ts` | **MISSING from monorepo** | DELETE endpoint — remove individual media |
| `src/app/(coach)/library/exercises/[id]/page.tsx` | **DEGRADED in monorepo** | Monorepo missing 67-line media display section; edit button routes to `/builder?exerciseId=` instead of `/library/exercises/{id}/edit` |
| `src/app/(coach)/library/exercises/new/page.tsx` | **DEGRADED in monorepo** | Monorepo removed 116 lines of media handling (YouTube/image URL inputs, pending media batch creation) |
| `package.json` | Different | Old repo has `"type": "module"` (ESM); monorepo removed it |
| `next.config.ts` | Different | Monorepo has turbopack.root for monorepo context (intentional) |

**Why this was missed initially:** The earlier diff agent saw the edit page and media routes in the monorepo and assumed they were monorepo additions. They were actually partial copies from the old repo's feature branch — but the old repo's `main` has the COMPLETE implementation including the media display and creation UI that the monorepo lacks.

**Cubes+ Render Configuration (NOT in Terraform):**

| Env Var | Purpose | Required? |
|---------|---------|-----------|
| `DATABASE_URL` | PostgreSQL connection | YES — app won't start |
| `PAYLOAD_SECRET` | JWT validation (SSO with PATHS) | YES — auth broken without it |
| `NEXT_PUBLIC_BASE_PATH` | Gateway routing (`/train`) | YES — routing broken |
| `STRIPE_SECRET_KEY` | Payments | Phase 3+ (graceful degradation) |
| `STRIPE_WEBHOOK_SECRET` | Webhook validation | Phase 3+ |
| `CUBES_DT_SERVICE_KEY` | Digital Twin API auth | Phase 2+ |
| `DT_API_URL` | Digital Twin endpoint | Phase 2+ (has default) |
| `CLOUDINARY_*` (3 vars) | Media uploads | Optional (feature disabled without) |
| `PATHS_API_URL` | Auth delegation endpoint | Optional (has default) |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | Optional (has default) |

**Cubes+ NOT in Terraform because:** Timeline collision — Terraform IaC was built March 22-28, Cubes+ v2 rebuild decision was March 31, v2 landed in monorepo April 2. By then infra rollout was done and nobody created a `cubes.tf`. Service `srv-d75rst9r0fns73f9qt70` and DB `dpg-d75rsd63jp1c73dipvl0-a` were manually provisioned on Render.

### Divergence Summary (CORRECTED)

| App | Monorepo Ahead | Old Repo Ahead | Action |
|-----|---------------|---------------|--------|
| PATHS | 3 features (discover slugs, lesson basePath, discover endpoint) | Nothing | Keep monorepo |
| **Cubes+** | turbopack.root config | **Exercise edit page, media API (2 endpoints), media display, media creation UI** | **COPY FROM OLD REPO** |
| HUB | Cookie consent, turbopack | Nothing | Keep monorepo |
| **Digital Twin** | Nothing | **Auth fix (11 files)** | **COPY FROM OLD REPO** |
| OS Dashboard | Widget crash fixes (3 files) | Nothing | Keep monorepo |
| **Infrastructure** | Nothing | **4 .tf files + CLAUDE.md** | **COPY FROM OLD REPO** |

---

## 3. Stranded Feature Branches

All old repos are **archived** — no PRs can be merged. **24 unmerged branches** exist across repos with pushed-but-unmerged work. These represent features that were developed but never reached production.

### By Repo

**limitless-paths (13 unmerged branches):**

| Branch | Commit(s) | Description | Disposition |
|--------|-----------|-------------|------------|
| `ci/generalize-schema-validation` | 1 | Generalize CI schema validation | Already applied to monorepo CI |
| `feature/feedback-collection` | 1 | Feedback collection modal + API | Needs review — may duplicate monorepo work |
| `feature/i18n-foundation` | 1 | Payload localization + next-intl | Future feature — park |
| `feature/remove-health-profiles` | 1 | Move stay context to Digital Twin | Phase 4 migration — park |
| `feature/unified-header` | 1 | Rebrand header, config-driven menu | Needs review — may overlap with monorepo |
| `fix/ai-model-tutor-ux` | 1 | Switch to gpt-4o-mini + loading UX | Already in production (merged to old main) |
| `fix/api-basepath-prefix` | 1 | Login redirect basePath fix | May be in monorepo already |
| `fix/catchup-migration-fk` | 1 | Remove FK to non-existent feedback table | Already in production |
| `fix/discover-slug-links` | 1 | Resolve slugs instead of IDs | Already in monorepo |
| `fix/lesson-completion-redirect` | 1 | Add basePath to nav URLs | Already in monorepo |
| `fix/neuter-v1-migration` | 1 | Neuter broken migration | Already in production |
| `fix/schema-catchup` | 1 | Catch-up migration for ai_config | Already in production |
| `workbench` | 5 | Integration branch: i18n, feedback, header, celebrations, auth fix | **LOCAL ONLY** — review carefully |

**limitless-cubes (2 unmerged):**

| Branch | Description | Disposition |
|--------|-------------|------------|
| `feature/exercise-edit-media` | Exercise edit page + media upload | **Merged to old main but NOT fully in monorepo — sync needed** |
| `fix/builder-library-filter` | Remove published-only filter | SKIP — monorepo already has no filter; branch was an experiment |

**limitless-hub (4 unmerged):**

| Branch | Description | Disposition |
|--------|-------------|------------|
| `feature/clinician-portal` | Phase 5 clinician portal | Future feature — park |
| `feature/cookie-consent` | Cookie consent banner | Already in monorepo |
| `feature/feedback-widget` | Feedback widget + header | Needs review |
| `feature/unified-header` | Auth-aware user menu | Needs review — overlaps with feedback-widget |

**limitless-digital-twin (2 unmerged):**

| Branch | Description | Disposition |
|--------|-------------|------------|
| `feature/os-config-endpoint` | `/api/twin/os/config` endpoint | Future feature — park |
| `fix/auth-delegate-paths` | JWT local verification fix | **CRITICAL — must be merged to monorepo** |

**limitless-os-dashboard (3 unmerged):**

| Branch | Description | Disposition |
|--------|-------------|------------|
| `feature/greeting-banner` | Personalized greeting | Needs review |
| `feature/unified-header` | Unified header with mobile support | Needs review |
| `fix/widget-shape-validation-final` | Widget crash prevention | Already in monorepo |

### Branch Disposition Summary

| Category | Count | Action |
|----------|-------|--------|
| Already in monorepo or production | 12 | No action needed |
| Must merge to monorepo (critical) | 1 | DT auth fix |
| Needs review (may overlap) | 5 | Compare with monorepo, merge if unique |
| Future features (park) | 3 | Document, don't merge yet |
| Local-only integration branch | 1 | Review paths/workbench carefully |
| Needs review (unknown) | 2 | Check cubes builder filter, os-dashboard greeting |

---

## 4. Deployment Topology

### Current State (BROKEN)

```
GitHub Monorepo (limitless)
    │
    ├─ GitHub Actions deploy-*.yml
    │   └─ POST /v1/services/{ID}/deploys  ──►  Render rebuilds from ARCHIVED repos
    │                                              (limitless-paths, limitless-hub, etc.)
    │                                              ⚠️ Can't receive new code!
    │
    └─ apps/paths/, apps/hub/, etc.  ──►  NOT connected to Render
```

### Service Details

| Service | Render ID | Deploys From | Branch | Auto-Deploy | Status |
|---------|-----------|-------------|--------|-------------|--------|
| PATHS | `srv-d70fsaua2pns73b48kf0` | `limitless-paths` (ARCHIVED) | main | true | **BROKEN** |
| HUB | `srv-d73o9j1aae7s73b45gf0` | `limitless-hub` (ARCHIVED) | main | true | **BROKEN** |
| Digital Twin | `srv-d73p42khg0os739msrrg` | `limitless-digital-twin` (ARCHIVED) | main | true | **BROKEN** |
| Cubes+ | `srv-d75rst9r0fns73f9qt70` | Not in Terraform | main | unknown | **FRAGILE** |
| OS Dashboard | Cloudflare Pages | `limitless-os-dashboard` (ARCHIVED) | main | true | **BROKEN** |

### Gateway Routing (Cloudflare Worker)

| Path | Backend |
|------|---------|
| `/train/*` | `https://limitless-cubes.onrender.com` |
| `/book/*` | `https://limitless-hub.onrender.com` |
| `/api/twin/*` | `https://limitless-digital-twin.onrender.com` |
| `/learn/*` | `https://paths-api.limitless-longevity.health` |
| `/` (root) | `https://limitless-os-dashboard.pages.dev` |

### What Needs to Change

Render services must deploy from the **monorepo** with `root_directory` set to each app's subdirectory. This requires:

1. Update Terraform `repo_url` from `limitless-paths` → `limitless` for all services
2. Add `root_directory` parameter (e.g., `apps/paths`)
3. Update build commands if needed (monorepo may need different install steps)
4. Add Cubes+ to Terraform
5. Update Cloudflare Pages source for OS Dashboard
6. Verify all services deploy and pass health checks

---

## 5. Execution Plan

### Phase 0: Sync Code (BEFORE touching deploys)

**Goal:** Make the monorepo the single source of truth for ALL app code.

**Step 0.0: Unarchive old repos for rollback safety (Decision #2)**

```bash
# Unarchive all 6 app repos (keeps them writable as rollback path)
for repo in limitless-paths limitless-cubes limitless-hub limitless-digital-twin limitless-os-dashboard limitless-infra; do
  gh repo unarchive LIMITLESS-LONGEVITY/$repo --yes
done

# Add branch protection to prevent accidental pushes (main/master)
for repo in limitless-paths limitless-cubes limitless-hub limitless-digital-twin limitless-os-dashboard; do
  gh api repos/LIMITLESS-LONGEVITY/$repo/branches/main/protection \
    -X PUT -f "required_pull_request_reviews[dismiss_stale_reviews]=true" \
    -f "enforce_admins=true" 2>/dev/null || echo "$repo: branch protection may need manual setup"
done
```

Re-archive after 1-2 weeks once monorepo deploys are proven stable.

**Step 0.1: Fix Digital Twin auth in monorepo (OLD AHEAD — 11 files)**

Copy the correct auth implementation from old repo main to monorepo:

```bash
# Auth plugin (local JWT verification)
cp ~/projects/LIMITLESS/limitless-digital-twin/src/plugins/auth.ts \
   ~/projects/limitless/apps/digital-twin/src/plugins/auth.ts

# All route files with corrected ID comparison
for f in activity.ts ai-context.ts biomarkers.ts consents.ts diagnostics.ts \
         gdpr.ts longevity-score.ts profile.ts stay.ts wearable-data.ts; do
  cp ~/projects/LIMITLESS/limitless-digital-twin/src/routes/$f \
     ~/projects/limitless/apps/digital-twin/src/routes/$f
done

# Drizzle migrations if missing
cp -rn ~/projects/LIMITLESS/limitless-digital-twin/drizzle/ \
       ~/projects/limitless/apps/digital-twin/drizzle/ 2>/dev/null
```

Verify: `cd apps/digital-twin && pnpm build`

**Step 0.2: Sync Cubes+ media features from old repo**

The old repo's main branch has the complete exercise edit/media feature that's missing from the monorepo.

```bash
cd ~/projects/LIMITLESS/limitless-cubes && git checkout main

# Copy missing files (new files only in old repo)
cp src/app/\(coach\)/library/exercises/\[id\]/edit/page.tsx \
   ~/projects/limitless/apps/cubes/src/app/\(coach\)/library/exercises/\[id\]/edit/page.tsx

mkdir -p ~/projects/limitless/apps/cubes/src/app/api/v1/exercises/\[id\]/media/\[mediaId\]
cp src/app/api/v1/exercises/\[id\]/media/route.ts \
   ~/projects/limitless/apps/cubes/src/app/api/v1/exercises/\[id\]/media/route.ts
cp src/app/api/v1/exercises/\[id\]/media/\[mediaId\]/route.ts \
   ~/projects/limitless/apps/cubes/src/app/api/v1/exercises/\[id\]/media/\[mediaId\]/route.ts

# Copy modified files (old repo has more complete version)
cp src/app/\(coach\)/library/exercises/\[id\]/page.tsx \
   ~/projects/limitless/apps/cubes/src/app/\(coach\)/library/exercises/\[id\]/page.tsx
cp src/app/\(coach\)/library/exercises/new/page.tsx \
   ~/projects/limitless/apps/cubes/src/app/\(coach\)/library/exercises/new/page.tsx
```

**IMPORTANT:** After copying, manually verify that `next.config.ts` in the monorepo retains the turbopack.root config (the old repo doesn't have it — don't overwrite). Do NOT copy `package.json` (monorepo intentionally removed `"type": "module"`) or `next.config.ts`.

Verify: `cd ~/projects/limitless/apps/cubes && pnpm build`

**Step 0.3: Sync infrastructure .tf files (OLD AHEAD)**

```bash
# Copy uncommitted infra changes from old repo
for f in digital-twin.tf hub.tf paths.tf variables.tf; do
  cp ~/projects/LIMITLESS/limitless-infra/$f ~/projects/limitless/infra/$f
done

# Copy new CLAUDE.md
cp ~/projects/LIMITLESS/limitless-infra/CLAUDE.md ~/projects/limitless/infra/CLAUDE.md
```

**Step 0.4: Stranded branch review — COMPLETED**

All 5 ambiguous branches were reviewed (Director decision #3). Results:

| Branch | App | Verdict | Reason |
|--------|-----|---------|--------|
| `fix/builder-library-filter` | Cubes+ | **SKIP** | Removes published filter — monorepo already has no filter |
| `feature/feedback-widget` | HUB | **SKIP** | FeedbackModal already in monorepo, identical code |
| `feature/unified-header` | HUB | **PARK** | Large refactor DELETING components monorepo uses |
| `feature/greeting-banner` | OS Dashboard | **SKIP** | GreetingBanner already in monorepo, identical |
| `feature/unified-header` | OS Dashboard | **PARK** | Same — removes components monorepo actively uses |

**No unique work to rescue.** All branches are either duplicated or contradictory. No merges needed.

**Step 0.5: Migrate missing docs**

```bash
mkdir -p ~/projects/limitless/docs/research
mkdir -p ~/projects/limitless/docs/qa-reports
mkdir -p ~/projects/limitless/docs/business

# QA reports
cp ~/projects/LIMITLESS/docs/qa-report-*.md ~/projects/limitless/docs/qa-reports/

# Research
cp ~/projects/LIMITLESS/docs/research/*.md ~/projects/limitless/docs/research/

# Production accounts reference
cp ~/projects/LIMITLESS/docs/production-accounts.md ~/projects/limitless/docs/

# Business docs (gitignored — sensitive)
cp ~/projects/LIMITLESS/TEMP/project\ briefs/*.pdf ~/projects/limitless/docs/business/
cp ~/projects/LIMITLESS/TEMP/project\ briefs/*.docx ~/projects/limitless/docs/business/
cp ~/projects/LIMITLESS/TEMP/fuerte_brief.txt ~/projects/limitless/docs/business/
cp ~/projects/LIMITLESS/TEMP/recoletas_plan.txt ~/projects/limitless/docs/business/

# Agentic guide docs
cp ~/projects/LIMITLESS/docs/*.docx ~/projects/limitless/docs/

# Decision log
cp ~/projects/LIMITLESS/agentic-division-decisions.txt ~/projects/limitless/docs/

# Historical archive
cp ~/projects/LIMITLESS/docs/paths-learnhouse-archive.md ~/projects/limitless/docs/
```

Add to `.gitignore`:
```
docs/business/*.pdf
docs/business/*.docx
```

**Step 0.6: Commit all synced code**

```bash
cd ~/projects/limitless
git add apps/digital-twin/ infra/ docs/
git commit -m "Sync divergent code from old repos: DT auth fix, infra env vars, missing docs"
git push
```

---

### Phase 1: Switch Render to Monorepo

**Goal:** All services deploy from `LIMITLESS-LONGEVITY/limitless` monorepo.

**Step 1.1: Update Terraform for PATHS, HUB, Digital Twin**

In each service's `.tf` file, change:

```hcl
# BEFORE (all three services):
repo_url      = "https://github.com/LIMITLESS-LONGEVITY/limitless-paths"  # (or hub, digital-twin)
branch        = "main"
# No root_directory

# AFTER:
repo_url      = "https://github.com/LIMITLESS-LONGEVITY/limitless"
branch        = "main"
root_directory = "apps/paths"  # (or apps/hub, apps/digital-twin)
```

Update build commands to work from subdirectory:

```hcl
# PATHS:
build_command = "npm install -g pnpm && pnpm install --frozen-lockfile && pnpm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public"
# Start command stays the same — it runs from the root_directory

# HUB:
build_command = "npm install -g pnpm && pnpm install --frozen-lockfile && pnpm run build"

# Digital Twin:
build_command = "npm install -g pnpm && pnpm install --frozen-lockfile && pnpm run build"
```

**IMPORTANT:** Verify that Render's `root_directory` feature works with pnpm workspaces. The monorepo `pnpm-workspace.yaml` defines workspaces — `pnpm install` from a subdirectory may not resolve workspace dependencies. If needed, build commands must `cd` to monorepo root first:

```hcl
# Alternative if root_directory doesn't work with pnpm workspaces:
build_command = "cd ../.. && npm install -g pnpm && pnpm install --frozen-lockfile && pnpm --filter limitless-paths run build"
```

**Step 1.2: Add Cubes+ to Terraform**

Create `cubes.tf`:

```hcl
resource "render_web_service" "cubes" {
  name            = "limitless-cubes"
  plan            = "starter"
  region          = "frankfurt"
  runtime_source  = "native_runtime"
  
  native_runtime {
    auto_deploy    = true
    branch         = "main"
    build_command  = "npm install -g pnpm && pnpm install --frozen-lockfile && pnpm run build"
    build_filter   = { paths = ["apps/cubes/**"] }
    repo_url       = "https://github.com/LIMITLESS-LONGEVITY/limitless"
    root_directory = "apps/cubes"
    runtime        = "node"
    start_command  = "pnpm start"
  }
  
  # Import existing env vars from current manual config
  env_vars = {
    # ... (export from Render dashboard first)
  }
}
```

Run `terraform import render_web_service.cubes srv-d75rst9r0fns73f9qt70` to import existing service.

**Step 1.3: Update Cloudflare Pages for OS Dashboard**

```hcl
# In the Cloudflare Pages project config:
source {
  type = "github"
  config {
    owner             = "LIMITLESS-LONGEVITY"
    repo_name         = "limitless"           # Changed from limitless-os-dashboard
    production_branch = "main"
    root_directory    = "apps/os-dashboard"    # NEW
  }
}
```

**Step 1.4: Plan and apply**

```bash
cd ~/projects/limitless/infra
terraform plan    # Review ALL changes — must show ONLY repo_url and root_directory changes
terraform apply   # Apply after Director approval
```

**Step 1.5: Trigger test deploys**

After Terraform applies:

```bash
# Trigger a deploy for each service via Render API
for SVC_ID in srv-d70fsaua2pns73b48kf0 srv-d73o9j1aae7s73b45gf0 srv-d73p42khg0os739msrrg srv-d75rst9r0fns73f9qt70; do
  curl -s -X POST "https://api.render.com/v1/services/$SVC_ID/deploys" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"clearCache":"do_not_clear"}'
  echo ""
done
```

Wait for all deploys to complete, then verify health endpoints.

**Step 1.6: Update GitHub Actions deploy workflows**

The deploy workflows (`deploy-paths.yml`, etc.) trigger via Render API — they should already work since they use service IDs, not repo URLs. But verify the path triggers match monorepo structure:

```yaml
# Verify each workflow has correct path trigger:
on:
  push:
    branches: [main]
    paths:
      - 'apps/paths/**'    # NOT 'src/**' or root-level paths
      - 'packages/**'       # Shared packages trigger all deploys
```

---

### Phase 2: Verify Production

**Goal:** Every service deploys correctly from the monorepo and passes all health checks.

**Step 2.1: Health check all 5 services**

```bash
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/learn/api/health  # PATHS → 200
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/book/api/health   # HUB → 200
curl -s -o /dev/null -w "%{http_code}" https://limitless-digital-twin.onrender.com/api/health   # DT → 200
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/train/api/v1/domains  # Cubes+ → 401
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/                  # OS Dashboard → 200
```

**Step 2.2: Test data endpoints**

```bash
curl -s https://app.limitless-longevity.health/learn/api/courses?limit=1 | head -c 200   # Should return JSON
curl -s https://app.limitless-longevity.health/learn/api/health | jq .                     # Full health response
```

**Step 2.3: Test a real deploy**

Make a trivial change (e.g., add a comment to one app), push to main, and verify:
1. GitHub Actions detects the change
2. Render receives the deploy trigger
3. Build succeeds from monorepo subdirectory
4. Service restarts and passes health check

---

### Phase 3: Secure Assets & Clean Up

**Goal:** Move sensitive files, migrate remaining docs, clean up old directory.

**Step 3.1: Move SSH keys to proper location**

```bash
mkdir -p ~/.ssh
cp ~/projects/LIMITLESS/TEMP/ssh_keys/nefarious_ssh_key.key ~/.ssh/limitless_hetzner
cp ~/projects/LIMITLESS/TEMP/ssh_keys/nefarious_ssh_key.pub ~/.ssh/limitless_hetzner.pub
chmod 600 ~/.ssh/limitless_hetzner
chmod 644 ~/.ssh/limitless_hetzner.pub
```

Add to `~/.ssh/config`:
```
Host limitless-vps
    HostName 204.168.237.211
    User nefarious
    IdentityFile ~/.ssh/limitless_hetzner
```

Verify: `ssh limitless-vps echo ok`

**Step 3.2: Commit website changes**

```bash
cd ~/projects/LIMITLESS
git add index.html
git commit -m "Add Privacy Policy and Terms links to footer"
git push
```

**Step 3.3: Strip LIMITLESS/ down to website-only**

```bash
cd ~/projects/LIMITLESS

# Delete old app clones (3.5 GB) — ALL code is now in monorepo
rm -rf limitless-paths/ limitless-paths-workbench/ limitless-cubes/
rm -rf limitless-hub/ limitless-digital-twin/ limitless-os-dashboard/ limitless-infra/

# Delete files not needed for website
rm -f docker-compose.dev.yml get-docker.sh .mcp.json agentic-division-decisions.txt
rm -rf learnhouse/ scripts/

# Delete TEMP (SSH keys already moved, business docs already copied)
rm -rf TEMP/

# Delete docs (already migrated to monorepo)
rm -rf docs/

# KEEP: index.html, privacy.html, terms.html, CNAME, README.md,
#       LIMITLESS_Website_Build_Prompt.md, Images/, qrcode.png, .claude/
```

After cleanup, `LIMITLESS/` should be ~60 MB (website only):

```
LIMITLESS/
├── .claude/
├── .git/
├── .gitignore
├── CLAUDE.md
├── CNAME
├── Images/            (team photos)
├── LIMITLESS_Website_Build_Prompt.md
├── README.md
├── index.html
├── privacy.html
├── qrcode.png
└── terms.html
```

**Step 3.4: Clean up Claude memory directories**

```bash
# Delete old session caches (271 MB of obsolete conversation logs)
rm -rf ~/.claude/projects/-home-nefarious-projects-LIMITLESS/
rm -rf ~/.claude/projects/-home-nefarious-projects-LIMITLESS-limitless-paths-workbench/
rm -rf ~/.claude/projects/-mnt-c-Projects-LIMITLESS/
rm -rf ~/.claude/projects/-mnt-c-Projects-LIMITLESS-limitless-paths-workbench/
```

**Keep:** `~/.claude/projects/-home-nefarious-projects-limitless/` (active monorepo memory)

---

## 6. Post-Migration Verification

| Check | Command | Expected |
|-------|---------|----------|
| PATHS health | `curl -s -w "%{http_code}" https://app.limitless-longevity.health/learn/api/health` | 200 |
| HUB health | `curl -s -w "%{http_code}" https://app.limitless-longevity.health/book/api/health` | 200 |
| DT health | `curl -s -w "%{http_code}" https://limitless-digital-twin.onrender.com/api/health` | 200 |
| Cubes+ auth | `curl -s -w "%{http_code}" https://app.limitless-longevity.health/train/api/v1/domains` | 401 |
| OS Dashboard | `curl -s -w "%{http_code}" https://app.limitless-longevity.health/` | 200 |
| PATHS data | `curl -s https://app.limitless-longevity.health/learn/api/courses?limit=1 \| jq .docs[0].title` | Course title |
| DT auth works | Login → health profile fetch (browser test) | No 500 errors |
| Terraform state | `terraform plan` | "No changes" |
| Monorepo docs | `ls docs/superpowers/specs/ \| wc -l` | 52+ files |
| SSH key works | `ssh limitless-vps echo ok` | `ok` |
| LIMITLESS/ clean | `du -sh ~/projects/LIMITLESS/` | < 60 MB |
| Old clones gone | `ls ~/projects/LIMITLESS/limitless-*/` | "No such file" |
| Memory cleaned | `ls ~/.claude/projects/-*LIMITLESS*/` | "No such file" |
| Deploy trigger | Push trivial change → GH Actions → Render deploy → health green | All pass |

---

## 7. Space Recovery

| Item | Size |
|------|------|
| Old app clones (7 directories) | 3,493 MB |
| TEMP directory | ~10 MB |
| Legacy Claude memory dirs | 271 MB |
| Misc files | ~23 MB |
| **Total freed** | **~3.8 GB** |

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Render can't build from monorepo subdirectory** | CRITICAL | Test with one service first (HUB — smallest). If `root_directory` fails with pnpm workspaces, use `cd ../..` build command pattern. |
| **Terraform apply resets env vars** | HIGH | Export ALL current env vars from Render dashboard BEFORE applying. Terraform's `env_vars` map is declarative — anything not in .tf gets deleted. |
| **Deploy during migration causes downtime** | HIGH | Do Phase 1 during low-traffic hours. Keep old repos unarchived temporarily as rollback. |
| **Stranded branch has critical unfound code** | MEDIUM | Phase 0.3 reviews all 5 ambiguous branches before deleting old clones. |
| **Digital Twin auth copy misses a file** | MEDIUM | Full `pnpm build` + test after copy. Verify JWT verification works in local dev. |
| **SSH key deleted before being moved** | LOW | Step 3.1 (move) happens BEFORE Step 3.3 (delete TEMP). |
| **Old repos needed for git blame/history** | LOW | Repos are archived (read-only), not deleted. Full history accessible. Subtree import preserved squashed history. |

### Rollback Plan

If any service fails to deploy from monorepo:

1. **Immediate:** Unarchive the old repo on GitHub (`gh repo unarchive LIMITLESS-LONGEVITY/limitless-{app}`)
2. **Revert Terraform:** `git checkout HEAD~1 -- infra/{app}.tf && terraform apply`
3. **Trigger deploy:** Old repo auto-deploy kicks in
4. **Investigate:** Why did monorepo deploy fail? Fix before retrying.

---

## Director Decisions (All Finalized — 2026-04-03)

| # | Decision | Approved Choice | Rationale |
|---|----------|----------------|-----------|
| 1 | **Execution timing** | **Now** | Services are already frozen (archived repos). Delaying increases risk. |
| 2 | **Unarchive old repos temporarily?** | **Yes — unarchive now, re-archive after stable** | Preserves rollback path. Add branch protection to prevent accidental pushes. 5-min faster recovery if Terraform fails. |
| 3 | **Stranded feature branches** | **Review all 5 before cleanup** | Reviewed — all 5 are SKIP or PARK. No unique work to rescue. Monorepo is sole source of truth. |
| 4 | **Cubes+ Terraform import** | **Import now** | Cubes+ was missed due to timeline collision (IaC built March 22-28, Cubes+ v2 decided March 31). Must be brought into IaC. Export env vars from Render dashboard FIRST. |
| 5 | **OS Dashboard deploy source** | **Switch now** | No piecemeal — everything moves to monorepo in one operation. |

---

*This plan addresses the root cause: the monorepo migration was structural but not operational. After execution, all code lives in one place, all deploys come from one repo, and the old umbrella directory is reduced to its proper role as a website-only repository.*
