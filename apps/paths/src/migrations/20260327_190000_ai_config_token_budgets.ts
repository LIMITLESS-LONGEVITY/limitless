import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds missing token budget columns to ai_config for new AI features
 * (actionPlan, dailyProtocol, discover).
 *
 * These fields were added to the AIConfig global schema in PR #12 but
 * the production DB doesn't have the columns. Payload's query includes
 * all schema fields, so any query to ai-config crashes with
 * "column does not exist".
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
