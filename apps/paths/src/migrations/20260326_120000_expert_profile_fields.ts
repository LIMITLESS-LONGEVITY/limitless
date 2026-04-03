import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Add expert profile fields to users table
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "linked_in" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "public_profile" boolean DEFAULT false;
  `)

  // Create expertise array table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "users_expertise" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "area" varchar NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "users_expertise" ADD CONSTRAINT "users_expertise_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "users_expertise_order_idx" ON "users_expertise" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "users_expertise_parent_id_idx" ON "users_expertise" USING btree ("_parent_id");
  `)

  // Create credentials array table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "users_credentials" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "institution" varchar,
      "year" numeric
    );
    DO $$ BEGIN
      ALTER TABLE "users_credentials" ADD CONSTRAINT "users_credentials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "users_credentials_order_idx" ON "users_credentials" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "users_credentials_parent_id_idx" ON "users_credentials" USING btree ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "users_credentials";
    DROP TABLE IF EXISTS "users_expertise";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "bio";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "linked_in";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "public_profile";
  `)
}
