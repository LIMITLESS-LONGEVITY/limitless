import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Main health_profiles table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "health_profiles" (
      "id" serial PRIMARY KEY,
      "user_id" integer NOT NULL UNIQUE,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "health_profiles" ADD CONSTRAINT "health_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "health_profiles_user_idx" ON "health_profiles" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "health_profiles_created_at_idx" ON "health_profiles" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "health_profiles_updated_at_idx" ON "health_profiles" USING btree ("updated_at");
  `)

  // Biomarkers array
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "health_profiles_biomarkers" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "value" numeric NOT NULL,
      "unit" varchar NOT NULL,
      "date" timestamp(3) with time zone NOT NULL,
      "normal_range_low" numeric,
      "normal_range_high" numeric,
      "status" varchar NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "health_profiles_biomarkers" ADD CONSTRAINT "health_profiles_biomarkers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "health_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "health_profiles_biomarkers_order_idx" ON "health_profiles_biomarkers" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "health_profiles_biomarkers_parent_id_idx" ON "health_profiles_biomarkers" USING btree ("_parent_id");
  `)

  // Health goals array
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "health_profiles_health_goals" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "goal" varchar NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "health_profiles_health_goals" ADD CONSTRAINT "health_profiles_health_goals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "health_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "health_profiles_health_goals_order_idx" ON "health_profiles_health_goals" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "health_profiles_health_goals_parent_id_idx" ON "health_profiles_health_goals" USING btree ("_parent_id");
  `)

  // Conditions array
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "health_profiles_conditions" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "condition" varchar NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "health_profiles_conditions" ADD CONSTRAINT "health_profiles_conditions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "health_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "health_profiles_conditions_order_idx" ON "health_profiles_conditions" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "health_profiles_conditions_parent_id_idx" ON "health_profiles_conditions" USING btree ("_parent_id");
  `)

  // Medications array
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "health_profiles_medications" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "medication" varchar NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "health_profiles_medications" ADD CONSTRAINT "health_profiles_medications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "health_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "health_profiles_medications_order_idx" ON "health_profiles_medications" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "health_profiles_medications_parent_id_idx" ON "health_profiles_medications" USING btree ("_parent_id");
  `)

  // Pillar priorities array
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "health_profiles_pillar_priorities" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "pillar_id" integer NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "health_profiles_pillar_priorities" ADD CONSTRAINT "health_profiles_pillar_priorities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "health_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    DO $$ BEGIN
      ALTER TABLE "health_profiles_pillar_priorities" ADD CONSTRAINT "health_profiles_pillar_priorities_pillar_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "content_pillars"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "health_profiles_pillar_priorities_order_idx" ON "health_profiles_pillar_priorities" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "health_profiles_pillar_priorities_parent_id_idx" ON "health_profiles_pillar_priorities" USING btree ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "health_profiles_pillar_priorities";
    DROP TABLE IF EXISTS "health_profiles_medications";
    DROP TABLE IF EXISTS "health_profiles_conditions";
    DROP TABLE IF EXISTS "health_profiles_health_goals";
    DROP TABLE IF EXISTS "health_profiles_biomarkers";
    DROP TABLE IF EXISTS "health_profiles";
  `)
}
