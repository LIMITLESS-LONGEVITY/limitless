# Workbench Handoff Batch 2 — 2026-03-28

Previous batch (Tasks 1-6) complete. This batch continues with HUB feature development and remaining infra work.

---

## Task 1: HUB Phase 1 — Public Pages + Contact Form

**Context:** HUB scaffold is deployed, Terraform applied, SSO middleware exists. Now build the customer-facing pages.

**Spec:** `docs/superpowers/specs/2026-03-27-hub-design.md` sections 4 (Pages & Routes), 14 (Design Tokens)

**What to build:**
1. **Landing page** (`/`) — overview of services, membership tiers, CTAs to booking pages
2. **Memberships page** (`/memberships`) — tier comparison table (Optimus/Immortalitas/Transcendentia/VIP + E-Clinic)
3. **Diagnostics page** (`/diagnostics`) — diagnostic packages overview
4. **Stays page** (`/stays`) — hotel stay packages (3/5/7-day programs)
5. **Telemedicine page** (`/telemedicine`) — e-Clinic overview, how it works
6. **Contact Sales page** (`/contact-sales`) — inquiry form with type selection (General, Membership, Corporate, Hotel, Media)
7. **Contact API endpoint** (`POST /api/contact`) — saves inquiry to DB

**Design requirements:**
- Use PATHS brand tokens (copy `@theme inline` from PATHS `globals.css`)
- Same "Scientific Luxury" aesthetic — dark backgrounds, gold/teal accents, glassmorphism
- Cormorant Garamond (headings) + Inter (body)
- Responsive: 375px mobile + 1440px desktop
- Booking pages are informational for now (no actual payment flow yet — that's Phase 2)

**DB migration:**
- Run `npx prisma migrate dev --name init` to create initial migration from the existing schema
- Verify migration runs clean

**Verification:**
- `pnpm build` passes
- All 6 public routes render
- Contact form submits and creates DB record
- SSO middleware: unauthenticated users see public pages, `/dashboard` redirects to PATHS login

---

## Task 2: HUB CI — Add Staging Migration + Claude Review

**What to do:**
1. Add `staging-migration` job to `limitless-hub/.github/workflows/ci.yml` (same pattern as PATHS)
   - Needs `STAGING_DATABASE_URL` and `STAGING_PAYLOAD_SECRET` GitHub secrets (get from Terraform output)
   - Use `ssl: { rejectUnauthorized: false }` for Render external DB
2. Add `claude-review.yml` workflow (copy from `docs/superpowers/templates/claude-review-workflow.yml`)
   - Include `id-token: write` in permissions
   - Remove `model`, `review_on_open`, `review_on_push` inputs (not valid for v1)
3. Verify the Claude Code GitHub App is installed on `limitless-hub` (may need human to install via UI)
4. Enable external access on HUB staging DB via Render API (ipAllowList `0.0.0.0/0`)

**Reference:**
- PATHS CI: `limitless-paths/.github/workflows/ci.yml` (staging-migration job, lines 71-101)
- PATHS staging script: `limitless-paths/scripts/ci-staging-migrate.ts`

---

## Task 3: Digital Twin — CI + Terraform

**Prerequisite:** Task 5 from batch 1 (DT scaffold) must be complete.

**What to do:**
1. Add CI pipeline to `limitless-digital-twin/.github/workflows/ci.yml`
   - Lint, typecheck, test, build
   - Staging migration job (Drizzle, not Payload — different pattern)
2. Add Terraform resources to `limitless-infra/`:
   - TimescaleDB on Render (or standard PostgreSQL + TimescaleDB extension)
   - Web service for Fastify API
   - Cloudflare DNS record (`digital-twin-api.limitless-longevity.health`)
   - Staging DB for CI
3. Run `terraform plan` and `terraform apply`
4. Run `restore-custom-domains.sh` after apply
5. Enable external access on DT staging DB

---

## Task 4: PATHS CLAUDE.md Split (Phase 1 Agentic Plan)

**Context:** The umbrella CLAUDE.md is 308 lines (target: 150). PATHS-specific content (gotchas, build commands, collections) should live in `limitless-paths/CLAUDE.md`.

**What to do:**
1. Create `limitless-paths/CLAUDE.md` with PATHS-specific content extracted from umbrella
2. Trim umbrella `CLAUDE.md` to ~150 lines — platform overview, global rules, sub-project reference table
3. Verify both files are loaded by Claude Code (test by launching in each directory)
4. Ensure no information is lost — cross-reference before and after

**Reference:** `docs/superpowers/specs/2026-03-27-agentic-dev-team-design.md` Phase 1, section "CLAUDE.md Architecture"

---

## Priority Order

1. **Task 1** (HUB public pages) — highest value, first customer-visible feature
2. **Task 2** (HUB CI) — do alongside Task 1, submit as separate PR
3. **Task 3** (DT CI + Terraform) — after DT scaffold is stable
4. **Task 4** (CLAUDE.md split) — can be done anytime, lower urgency
