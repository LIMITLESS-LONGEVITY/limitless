import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_enrollments_status" AS ENUM('active', 'completed', 'cancelled', 'expired');
  CREATE TYPE "public"."enum_enrollments_payment_status" AS ENUM('free', 'paid', 'pending', 'refunded');
  CREATE TYPE "public"."enum_lesson_progress_status" AS ENUM('not_started', 'in_progress', 'completed');
  CREATE TABLE "enrollments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"course_id" integer NOT NULL,
  	"enrolled_at" timestamp(3) with time zone NOT NULL,
  	"status" "enum_enrollments_status" DEFAULT 'active' NOT NULL,
  	"completed_at" timestamp(3) with time zone,
  	"completion_percentage" numeric DEFAULT 0 NOT NULL,
  	"payment_status" "enum_enrollments_payment_status" DEFAULT 'free' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "lesson_progress" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"lesson_id" integer NOT NULL,
  	"enrollment_id" integer NOT NULL,
  	"status" "enum_lesson_progress_status" DEFAULT 'not_started' NOT NULL,
  	"completed_at" timestamp(3) with time zone,
  	"video_watch_time" numeric DEFAULT 0,
  	"video_total_duration" numeric DEFAULT 0,
  	"last_accessed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "enrollments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "lesson_progress_id" integer;
  ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "enrollments_user_idx" ON "enrollments" USING btree ("user_id");
  CREATE INDEX "enrollments_course_idx" ON "enrollments" USING btree ("course_id");
  CREATE INDEX "enrollments_updated_at_idx" ON "enrollments" USING btree ("updated_at");
  CREATE INDEX "enrollments_created_at_idx" ON "enrollments" USING btree ("created_at");
  CREATE INDEX "lesson_progress_user_idx" ON "lesson_progress" USING btree ("user_id");
  CREATE INDEX "lesson_progress_lesson_idx" ON "lesson_progress" USING btree ("lesson_id");
  CREATE INDEX "lesson_progress_enrollment_idx" ON "lesson_progress" USING btree ("enrollment_id");
  CREATE INDEX "lesson_progress_updated_at_idx" ON "lesson_progress" USING btree ("updated_at");
  CREATE INDEX "lesson_progress_created_at_idx" ON "lesson_progress" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_enrollments_fk" FOREIGN KEY ("enrollments_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lesson_progress_fk" FOREIGN KEY ("lesson_progress_id") REFERENCES "public"."lesson_progress"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_enrollments_id_idx" ON "payload_locked_documents_rels" USING btree ("enrollments_id");
  CREATE INDEX "payload_locked_documents_rels_lesson_progress_id_idx" ON "payload_locked_documents_rels" USING btree ("lesson_progress_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "enrollments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "lesson_progress" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "enrollments" CASCADE;
  DROP TABLE "lesson_progress" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_enrollments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_lesson_progress_fk";
  
  DROP INDEX "payload_locked_documents_rels_enrollments_id_idx";
  DROP INDEX "payload_locked_documents_rels_lesson_progress_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "enrollments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "lesson_progress_id";
  DROP TYPE "public"."enum_enrollments_status";
  DROP TYPE "public"."enum_enrollments_payment_status";
  DROP TYPE "public"."enum_lesson_progress_status";`)
}
