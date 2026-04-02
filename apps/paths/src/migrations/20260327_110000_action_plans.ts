import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "action_plans" (
      "id" serial PRIMARY KEY,
      "user_id" integer NOT NULL,
      "enrollment_id" integer NOT NULL,
      "course_id" integer NOT NULL,
      "pillar_id" integer,
      "status" varchar DEFAULT 'generating' NOT NULL,
      "plan" jsonb NOT NULL,
      "health_profile_snapshot" jsonb,
      "generated_at" timestamp(3) with time zone NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "action_plans_user_idx" ON "action_plans" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "action_plans_created_at_idx" ON "action_plans" USING btree ("created_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "action_plans";`)
}
