import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "subscriptions" CASCADE;
    DROP TABLE IF EXISTS "stripe_events" CASCADE;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Tables are not recreated — billing has moved to HUB.
  // To restore, redeploy from a commit before this migration.
}
