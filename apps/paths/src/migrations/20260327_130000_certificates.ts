import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "certificates" (
      "id" serial PRIMARY KEY,
      "user_id" integer NOT NULL,
      "enrollment_id" integer NOT NULL,
      "course_id" integer NOT NULL,
      "course_title" varchar NOT NULL,
      "course_pillar" varchar,
      "instructor_name" varchar,
      "estimated_duration" numeric,
      "certificate_number" varchar NOT NULL UNIQUE,
      "issued_at" timestamp(3) with time zone NOT NULL,
      "expires_at" timestamp(3) with time zone,
      "type" varchar DEFAULT 'completion' NOT NULL,
      "tenant_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      ALTER TABLE "certificates" ADD CONSTRAINT "certificates_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "certificates_user_idx" ON "certificates" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "certificates_enrollment_idx" ON "certificates" USING btree ("enrollment_id");
    CREATE INDEX IF NOT EXISTS "certificates_certificate_number_idx" ON "certificates" USING btree ("certificate_number");
    CREATE INDEX IF NOT EXISTS "certificates_created_at_idx" ON "certificates" USING btree ("created_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "certificates";`)
}
