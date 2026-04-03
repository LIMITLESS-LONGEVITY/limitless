# PATHS Migration State Audit

**Date:** 2026-04-05
**Author:** Architect
**Purpose:** Document the complete migration state, known gaps, and incident history so migration issues don't recur from undocumented state

---

## Current Migration Chain (31 migrations)

All migrations registered in `apps/paths/src/migrations/index.ts`. Payload runs them in order on every deploy (`npx payload migrate` in start command).

| Migration | Date | Purpose | Status |
|-----------|------|---------|--------|
| `20260323_124701` | Mar 23 | Initial Payload schema | RAN |
| `20260323_143059` | Mar 23 | Schema update | RAN |
| `20260323_162715` | Mar 23 | Schema update | RAN |
| `20260323_170839` | Mar 23 | Schema update | RAN |
| `20260323_175345` | Mar 23 | Schema update | RAN |
| `20260324_165232` | Mar 24 | Schema update | RAN |
| `20260324_165300_vector` | Mar 24 | pgvector extension + embeddings | RAN |
| `20260325_113832` | Mar 25 | Schema update | RAN |
| `20260325_170000_email_verification` | Mar 25 | Email verification fields | RAN |
| `20260325_185500_fix_verification_columns` | Mar 25 | Fix column naming | RAN |
| `20260325_190500_verify_existing_users` | Mar 25 | Backfill `_verified=true` for existing users | RAN |
| `20260326_120000_expert_profile_fields` | Mar 26 | Expert profile columns | RAN |
| `20260326_140000_add_onboarding_field` | Mar 26 | Onboarding field | RAN |
| `20260327_100000_health_profiles` | Mar 27 | Health profiles tables | RAN |
| `20260327_110000_action_plans` | Mar 27 | Action plans table | RAN |
| `20260327_120000_daily_protocols` | Mar 27 | Daily protocols table | RAN |
| `20260327_130000_certificates` | Mar 27 | Certificates table | RAN |
| `20260327_140000_tenant_certification` | Mar 27 | Tenant certification fields | RAN |
| `20260327_150000_streak_fields` | Mar 27 | Streak tracking fields | RAN |
| `20260327_160000_certificates_tenant` | Mar 27 | Certificate tenant relationship | RAN |
| `20260327_170000_stay_fields` | Mar 27 | Stay-related fields | RAN |
| `20260327_180000_locked_docs_rels_new_collections` | Mar 27 | locked_documents_rels for new collections | RAN |
| `20260327_190000_ai_config_token_budgets` | Mar 27 | AI config token budget columns | RAN |
| `20260327_200000_ai_config_token_budgets_retry` | Mar 27 | Retry of token budgets (idempotent) | RAN |
| `20260328_100000_drop_billing_tables` | Mar 28 | Remove old billing tables | RAN |
| `20260329_100000_drop_health_profiles` | Mar 29 | Drop health profiles (moved to DT) | RAN |
| `20260329_110000_drop_stay_fields` | Mar 29 | Drop stay fields (moved to DT) | RAN |
| `20260330_180000_i18n_restructure` | Mar 30 | i18n localization restructure | RAN |
| `20260401_130000_add_feedback_prompted` | Apr 1 | Add `feedback_prompted` to enrollments | RAN |
| `20260401_160000_schema_catchup` | Apr 1 | **NEUTERED** — replaced with `SELECT 1` (see Incident #4) | RAN (no-op) |
| `20260401_170000_schema_catchup_v2` | Apr 1 | Real catch-up: ai_config columns + feedback_id + feedback_prompted | RAN |

---

## Known Schema Gap: Feedback Table Does Not Exist

**Severity:** Medium — collection is registered but non-functional
**Discovered during:** Handoff O investigation (2026-04-05)

### What Happened

1. **PR #58** (March 30) added the `Feedback` collection to `payload.config.ts` (line 118) and created `src/collections/Feedback/index.ts` (92 lines)
2. **No migration was generated** — `pnpm payload migrate:create` was never run after adding the collection
3. The `feedback` **table does not exist** in the production database
4. The catch-up migration v1 tried to add a FK from `payload_locked_documents_rels.feedback_id` to `public.feedback(id)` — this crashed because the table doesn't exist
5. The v2 fix added the `feedback_id` column WITHOUT the FK constraint

### Current State

| Component | Exists | Notes |
|-----------|--------|-------|
| `src/collections/Feedback/index.ts` | YES | Collection config with 8 fields |
| `Feedback` in `payload.config.ts` collections array | YES | Line 118 |
| `feedback` table in database | **NO** | Never created |
| `payload_locked_documents_rels.feedback_id` column | YES | Added by v2, no FK constraint |
| `payload_locked_documents_rels.feedback_id` FK constraint | NO | Intentionally omitted |

### Impact

- **API calls to `/api/feedback`** will fail with a database error (no table)
- **Admin panel** will show the Feedback collection but creating/reading entries will error
- **No user-facing impact currently** — no frontend page links to the Feedback API
- **`payload_locked_documents_rels`** works correctly — the `feedback_id` column exists but is always NULL (no records reference it)

### Required Fix (Future Task)

To make the Feedback collection functional:

1. Run `pnpm payload migrate:create` — this will generate a migration creating the `feedback` table
2. The generated migration should include:
   - `CREATE TABLE feedback` with all columns from the collection config
   - `ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT ... FOREIGN KEY (feedback_id) REFERENCES feedback(id)` — the FK that v1 tried to add
3. Register the new migration in `src/migrations/index.ts`
4. Run `pnpm payload generate:types` to update `payload-types.ts`
5. Verify: `pnpm build` passes, then `POST /api/feedback` with auth returns 201

**Priority:** P3 — the Feedback collection is not used by any frontend feature yet. Fix when the feedback widget is implemented.

---

## Incident History — Migration Failures

### Incident 1: AI Config Fields Missing (March 26)

**Duration:** 5 days
**Root cause:** `ai_config` columns (`token_budgets_*`) added in collection config without generating a migration. AI tutor endpoint returned 500 because the columns didn't exist.
**Fix:** Migration `20260327_190000_ai_config_token_budgets` added the columns. Required a retry migration (`200000`) because the first attempt was recorded as complete but didn't execute.
**Lesson:** Migration enforcement hook (`enforce-migrations.sh`) created after this incident.

### Incident 2: ALL PATHS Writes Return 500 (March 30)

**Duration:** ~1 day
**Root cause:** Feedback collection added to `payload.config.ts` without migration. Payload's locking system needs `payload_locked_documents_rels` to have a column for every collection. Missing `feedback_id` column caused ALL write operations to fail.
**Fix:** Migration `20260327_180000_locked_docs_rels_new_collections` added the missing columns.
**Lesson:** New collections MUST include a `payload_locked_documents_rels` FK column in their migration.

### Incident 3: PATHS Homepage Down — No-Op Migration (March 31)

**Duration:** ~1 day
**Root cause:** i18n `localized: true` change with a `SELECT 1` placeholder migration (no real SQL). The schema change required actual `ALTER TABLE` statements.
**Fix:** Migration `20260330_180000_i18n_restructure` with real SQL.
**Lesson:** `enforce-migrations.sh` hook now rejects `SELECT 1` placeholder migrations.

### Incident 4: 3-Deploy Failure Loop — FK to Non-Existent Table (April 1)

**Duration:** ~1 day (3 deploy attempts)
**Root cause:** Catch-up migration v1 added `FOREIGN KEY (feedback_id) REFERENCES public.feedback(id)` but the `feedback` table was never created (see gap above). Payload runs failed migrations on every deploy — so every deploy crashed on the same migration.
**Fix:** Neuter v1 to `SELECT 1`, create v2 with the same changes minus the FK. Both registered in index.ts so v1 passes (no-op) and v2 runs the real SQL.
**Lesson:** You CANNOT fix a broken migration by adding a new one after it. You MUST neuter the broken one first. This is now documented in CLAUDE.md as the "Fixing broken migrations" protocol.

---

## Enforcement Layers (Preventing Recurrence)

| Layer | Mechanism | What It Catches |
|-------|-----------|----------------|
| **Hook** | `enforce-migrations.sh` (PreToolUse on Bash) | Blocks `git commit` if schema files staged without migration files. Rejects `SELECT 1` placeholders. Warns about missing `payload_locked_documents_rels` for new collections. |
| **CI** | `validate-payload-schema` GitHub Actions job | Fails PRs with schema changes but no real migration SQL |
| **CLAUDE.md** | Schema Change Gate documentation | Step-by-step protocol for any Payload schema change |
| **This document** | Migration state audit | Documents what exists, what's missing, and why |

---

## Rules for Future Migrations

1. **ANY change to `src/collections/`, `src/globals/`, or `payload.config.ts`** requires `pnpm payload migrate:create`
2. **New collections** must include a `payload_locked_documents_rels` FK column
3. **Migration files must contain real SQL** — never `SELECT 1` placeholders
4. **Broken migrations cannot be fixed by adding new ones** — neuter the broken one (replace `up()` with `SELECT 1`), then create a new migration with the fix
5. **Test locally**: `pnpm build && pnpm start` — verify collection endpoints return data, not 500
6. **Stage migration files in the same commit** as schema changes — never in a follow-up
