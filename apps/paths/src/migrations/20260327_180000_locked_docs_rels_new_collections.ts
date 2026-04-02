import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds missing columns to payload_locked_documents_rels for collections
 * added in Phases 3-6: health_profiles, action_plans, daily_protocols, certificates.
 *
 * Payload auto-manages this table via schema sync / push, but production uses
 * migrations only (no push: true). The custom collection migrations created
 * the tables but not the locked_documents_rels columns, so Payload's internal
 * queries fail with "column does not exist".
 *
 * Uses IF NOT EXISTS / IF EXISTS to be idempotent.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "health_profiles_id" integer,
      ADD COLUMN IF NOT EXISTS "action_plans_id" integer,
      ADD COLUMN IF NOT EXISTS "daily_protocols_id" integer,
      ADD COLUMN IF NOT EXISTS "certificates_id" integer;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_health_profiles_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_health_profiles_fk"
          FOREIGN KEY ("health_profiles_id") REFERENCES "public"."health_profiles"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_action_plans_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_action_plans_fk"
          FOREIGN KEY ("action_plans_id") REFERENCES "public"."action_plans"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_daily_protocols_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_daily_protocols_fk"
          FOREIGN KEY ("daily_protocols_id") REFERENCES "public"."daily_protocols"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_certificates_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_certificates_fk"
          FOREIGN KEY ("certificates_id") REFERENCES "public"."certificates"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_health_profiles_id_idx"
      ON "payload_locked_documents_rels" USING btree ("health_profiles_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_action_plans_id_idx"
      ON "payload_locked_documents_rels" USING btree ("action_plans_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_daily_protocols_id_idx"
      ON "payload_locked_documents_rels" USING btree ("daily_protocols_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_certificates_id_idx"
      ON "payload_locked_documents_rels" USING btree ("certificates_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_health_profiles_fk",
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_action_plans_fk",
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_daily_protocols_fk",
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_certificates_fk";

    DROP INDEX IF EXISTS "payload_locked_documents_rels_health_profiles_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_action_plans_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_daily_protocols_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_certificates_id_idx";

    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "health_profiles_id",
      DROP COLUMN IF EXISTS "action_plans_id",
      DROP COLUMN IF EXISTS "daily_protocols_id",
      DROP COLUMN IF EXISTS "certificates_id";
  `)
}
