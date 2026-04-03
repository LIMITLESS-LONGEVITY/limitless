import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Comprehensive schema catch-up migration.
 *
 * Multiple features were merged with migrations that were recorded
 * in payload_migrations without the SQL executing. This migration
 * idempotently adds ALL known missing columns.
 *
 * All statements use IF NOT EXISTS for safety.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Original migration had a FK referencing non-existent feedback table.
  // Replaced with no-op — v2 (20260401_170000) handles all changes.
  await db.execute(sql`SELECT 1`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ai_config"
      DROP COLUMN IF EXISTS "token_budgets_action_plan_max_tokens",
      DROP COLUMN IF EXISTS "token_budgets_daily_protocol_max_tokens",
      DROP COLUMN IF EXISTS "token_budgets_discover_max_tokens";

    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_feedback_fk";

    DROP INDEX IF EXISTS "payload_locked_documents_rels_feedback_id_idx";

    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "feedback_id";

    ALTER TABLE "enrollments"
      DROP COLUMN IF EXISTS "feedback_prompted";
  `)
}
