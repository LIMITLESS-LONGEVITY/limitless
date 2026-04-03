# Workbench Handoff — 2026-03-27

Ordered task list for the workbench instance. Complete in sequence.

---

## Task 1: Fix Staging Migration CI (BLOCKING)

**Problem:** The `staging-migration` CI job fails with `Connection terminated unexpectedly` when connecting to the Render staging PostgreSQL from GitHub Actions.

**Root cause (likely):** The Render DB's `ipAllowList` was set to `0.0.0.0/0` via API, but the connection still drops. Possible causes:
1. The ipAllowList API call didn't actually persist (verify via GET)
2. SSL handshake fails before auth (despite `sslmode=require` + `ssl: true` + `NODE_TLS_REJECT_UNAUTHORIZED=0`)
3. The `STAGING_DATABASE_URL` GitHub secret may have the wrong hostname (internal vs external)

**What's been tried (5 attempts, all failed):**
- Added `sslmode=require` to connection string
- Set `ssl: true` on pool config
- Set `NODE_TLS_REJECT_UNAUTHORIZED=0` in CI env
- Verified Terraform outputs external hostname
- Enabled external access via Render API

**Key files:**
- CI workflow: `limitless-paths/.github/workflows/ci.yml` (lines 71-101, `staging-migration` job)
- Migration script: `limitless-paths/scripts/ci-staging-migrate.ts` (on main branch, not in workbench yet — merge main first)
- Render DB ID: `dpg-d738i6cg9agc73c02b7g-a`
- Terraform: `limitless-infra/paths.tf` (`render_postgres.paths_staging_db`)

**Debug steps:**
1. Merge main into workbench: `git merge main`
2. Verify ipAllowList is actually set:
   ```bash
   curl "https://api.render.com/v1/postgres/dpg-d738i6cg9agc73c02b7g-a" \
     -H "Authorization: Bearer ${RENDER_API_KEY}" | jq '.ipAllowList'
   ```
3. Verify the GitHub secret `STAGING_DATABASE_URL` uses the **external** hostname (ends in `.oregon-postgres.render.com`, NOT the internal `.render.com` without region)
4. Try a direct connection test from a GitHub Action step before the migration script:
   ```yaml
   - name: Test staging DB connection
     run: node -e "const pg = require('pg'); const c = new pg.Client({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}}); c.connect().then(() => {console.log('OK'); c.end()}).catch(e => {console.error(e); process.exit(1)})"
     env:
       DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
   ```
5. If connection test passes but Payload still fails — the issue is in Payload's `postgresAdapter` config override

**Reference memory:**
- `~/.claude/projects/-home-nefarious-projects-LIMITLESS/memory/feedback_render_external_db.md`
- `~/.claude/projects/-home-nefarious-projects-LIMITLESS/memory/project_environment_strategy.md`

---

## Task 2: Fix Claude Review Workflow

**Problem:** `claude-review.yml` fails on every PR with `Could not fetch an OIDC token`.

**Root cause:** Missing `id-token: write` in the `permissions` block. The `anthropics/claude-code-action@v1` needs it to mint a GitHub OIDC token for posting review comments.

**Secondary:** Three unrecognized inputs (`model`, `review_on_open`, `review_on_push`) — the `v1` action API doesn't accept these. Remove them.

**Files to fix:**
- `limitless-paths/.github/workflows/claude-review.yml`
- `docs/superpowers/templates/claude-review-workflow.yml` (shared template — keep in sync)

**Changes:**
1. Add `id-token: write` to the `permissions` block
2. Remove inputs: `model`, `review_on_open`, `review_on_push`
3. If model selection is needed, move it into `claude_args` (e.g. `--model claude-sonnet-4-6`)

**Not blocking CI** but every PR since deployment has silently skipped automated review.

---

## Task 3: Fix ESLint `continue-on-error` (Issue #19)

**Problem:** CI has `continue-on-error: true` on lint and tsc steps, masking real failures.

**What to do:**
1. Fix the 16 React Compiler lint errors (setState in useEffect)
2. Remove `continue-on-error: true` from lint step in `ci.yml`
3. Optionally: address the 46 TypeScript drift errors or keep tsc `continue-on-error` for now

**Reference:** GitHub issue [#19](https://github.com/LIMITLESS-LONGEVITY/limitless-paths/issues/19)

---

## Task 3: Fix E2E Seed Helpers (Issue #20)

**Problem:** E2E test seed helpers have slug validation failures.

**Reference:** GitHub issue [#20](https://github.com/LIMITLESS-LONGEVITY/limitless-paths/issues/20)

---

## Task 4: Digital Twin Repo Scaffold

**What to do:**
1. Create `limitless-digital-twin` GitHub repo
2. Scaffold: Fastify + Drizzle + TimescaleDB
3. Add CI pipeline with staging migration job from day one
4. Add CLAUDE.md + AGENTS.md

**Reference specs:**
- `docs/superpowers/specs/2026-03-27-digital-twin-design.md`
- `~/.claude/projects/-home-nefarious-projects-LIMITLESS/memory/project_longevity_os.md`

---

## Task 5: HUB Terraform

**What to do:**
1. Add HUB service + staging DB to `limitless-infra/`
2. Run `terraform plan` — verify only expected changes
3. Apply + run `restore-custom-domains.sh`
4. Enable external access on staging DB via Render API

**Reference specs:**
- `docs/superpowers/specs/2026-03-27-hub-design.md`
- `~/.claude/projects/-home-nefarious-projects-LIMITLESS/memory/project_environment_strategy.md`
- `~/.claude/projects/-home-nefarious-projects-LIMITLESS/memory/feedback_render_external_db.md`
