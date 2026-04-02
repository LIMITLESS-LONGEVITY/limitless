import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Retry migration for ai_config token budget columns.
 *
 * The original migration (20260327_190000) was registered in code via
 * prodMigrations but may have been recorded in payload_migrations without
 * the SQL actually executing (squash-merge artifact). This retry migration
 * uses a new name so Payload's runner will execute it.
 *
 * All statements use IF NOT EXISTS/IF EXISTS for idempotency.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ai_config"
      ADD COLUMN IF NOT EXISTS "token_budgets_action_plan_max_tokens" numeric DEFAULT 2048,
      ADD COLUMN IF NOT EXISTS "token_budgets_daily_protocol_max_tokens" numeric DEFAULT 1024,
      ADD COLUMN IF NOT EXISTS "token_budgets_discover_max_tokens" numeric DEFAULT 1024;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ai_config"
      DROP COLUMN IF EXISTS "token_budgets_action_plan_max_tokens",
      DROP COLUMN IF EXISTS "token_budgets_daily_protocol_max_tokens",
      DROP COLUMN IF EXISTS "token_budgets_discover_max_tokens";
  `)
}
