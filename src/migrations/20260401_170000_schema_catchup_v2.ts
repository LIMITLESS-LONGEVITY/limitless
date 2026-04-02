import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Schema catch-up v2 — fixes the failed v1 migration.
 *
 * v1 (20260401_160000) crashed because it tried to add a FK constraint
 * referencing public.feedback, but the feedback table was never created
 * (PR #58 added collection config without generating a table migration).
 *
 * This migration re-applies all the same changes WITHOUT the FK constraint.
 * All statements use IF NOT EXISTS for idempotency — safe to run even if
 * v1 partially succeeded before crashing.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. ai_config token budget columns
  await db.execute(sql`
    ALTER TABLE "ai_config"
      ADD COLUMN IF NOT EXISTS "token_budgets_action_plan_max_tokens" numeric DEFAULT 2048,
      ADD COLUMN IF NOT EXISTS "token_budgets_daily_protocol_max_tokens" numeric DEFAULT 1024,
      ADD COLUMN IF NOT EXISTS "token_budgets_discover_max_tokens" numeric DEFAULT 1024;
  `)

  // 2. payload_locked_documents_rels — feedback column (NO FK constraint)
  // The feedback table doesn't exist yet. Just add the column and index.
  // Payload will create the feedback table on next schema sync.
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "feedback_id" integer;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_feedback_id_idx"
      ON "payload_locked_documents_rels" USING btree ("feedback_id");
  `)

  // 3. enrollments.feedback_prompted
  await db.execute(sql`
    ALTER TABLE "enrollments"
      ADD COLUMN IF NOT EXISTS "feedback_prompted" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ai_config"
      DROP COLUMN IF EXISTS "token_budgets_action_plan_max_tokens",
      DROP COLUMN IF EXISTS "token_budgets_daily_protocol_max_tokens",
      DROP COLUMN IF EXISTS "token_budgets_discover_max_tokens";

    DROP INDEX IF EXISTS "payload_locked_documents_rels_feedback_id_idx";

    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "feedback_id";

    ALTER TABLE "enrollments"
      DROP COLUMN IF EXISTS "feedback_prompted";
  `)
}
