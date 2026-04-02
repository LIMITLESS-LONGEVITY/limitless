import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Courses: stay program fields
  await db.execute(sql`
    ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "stay_type" varchar;
    ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "stay_location" varchar;
    ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "stay_price" numeric;
    ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "stay_member_price" numeric;
    ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "follow_up_months" numeric;
  `)

  // Courses: stayIncludes array table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "courses_stay_includes" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "item" varchar NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "courses_stay_includes" ADD CONSTRAINT "courses_stay_includes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "courses_stay_includes_order_idx" ON "courses_stay_includes" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "courses_stay_includes_parent_id_idx" ON "courses_stay_includes" USING btree ("_parent_id");
  `)

  // Enrollments: stay date fields
  await db.execute(sql`
    ALTER TABLE "enrollments" ADD COLUMN IF NOT EXISTS "stay_start_date" timestamp(3) with time zone;
    ALTER TABLE "enrollments" ADD COLUMN IF NOT EXISTS "stay_end_date" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "enrollments" DROP COLUMN IF EXISTS "stay_start_date";
    ALTER TABLE "enrollments" DROP COLUMN IF EXISTS "stay_end_date";
    DROP TABLE IF EXISTS "courses_stay_includes";
    ALTER TABLE "courses" DROP COLUMN IF EXISTS "stay_type";
    ALTER TABLE "courses" DROP COLUMN IF EXISTS "stay_location";
    ALTER TABLE "courses" DROP COLUMN IF EXISTS "stay_price";
    ALTER TABLE "courses" DROP COLUMN IF EXISTS "stay_member_price";
    ALTER TABLE "courses" DROP COLUMN IF EXISTS "follow_up_months";
  `)
}
