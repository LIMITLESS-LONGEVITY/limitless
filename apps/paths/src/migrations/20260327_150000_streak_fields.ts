import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "current_streak" numeric DEFAULT 0;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "longest_streak" numeric DEFAULT 0;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_activity_date" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN IF EXISTS "current_streak";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "longest_streak";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "last_activity_date";
  `)
}
