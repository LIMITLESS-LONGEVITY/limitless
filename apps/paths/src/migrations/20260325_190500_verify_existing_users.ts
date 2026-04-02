import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // All users created before email verification was enabled should be marked as verified
  await db.execute(sql`
    UPDATE "users" SET "_verified" = true WHERE "_verified" = false OR "_verified" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // No-op: we can't know which users were previously unverified
}
