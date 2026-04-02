import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "daily_protocols" (
      "id" serial PRIMARY KEY,
      "user_id" integer NOT NULL,
      "date" timestamp(3) with time zone NOT NULL,
      "status" varchar DEFAULT 'generating' NOT NULL,
      "protocol" jsonb NOT NULL,
      "completed_count" numeric DEFAULT 0,
      "total_count" numeric DEFAULT 0,
      "generated_at" timestamp(3) with time zone NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "daily_protocols" ADD CONSTRAINT "daily_protocols_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "daily_protocols_user_idx" ON "daily_protocols" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "daily_protocols_date_idx" ON "daily_protocols" USING btree ("date");
    CREATE UNIQUE INDEX IF NOT EXISTS "daily_protocols_user_date_idx" ON "daily_protocols" USING btree ("user_id", "date");
    CREATE INDEX IF NOT EXISTS "daily_protocols_created_at_idx" ON "daily_protocols" USING btree ("created_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "daily_protocols";`)
}
