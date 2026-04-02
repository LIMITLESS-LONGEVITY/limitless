import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "courses" DROP COLUMN IF EXISTS "stay_type";
    ALTER TABLE "courses" DROP COLUMN IF EXISTS "stay_location";
    ALTER TABLE "courses" DROP COLUMN IF EXISTS "stay_price";
    ALTER TABLE "courses" DROP COLUMN IF EXISTS "stay_member_price";
    ALTER TABLE "courses" DROP COLUMN IF EXISTS "follow_up_months";
    DROP TABLE IF EXISTS "courses_stay_includes" CASCADE;

    ALTER TABLE "enrollments" DROP COLUMN IF EXISTS "stay_start_date";
    ALTER TABLE "enrollments" DROP COLUMN IF EXISTS "stay_end_date";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Stay context has moved to Digital Twin.
}
