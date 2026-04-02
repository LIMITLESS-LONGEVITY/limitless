import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "health_profiles_pillar_priorities" CASCADE;
    DROP TABLE IF EXISTS "health_profiles_medications" CASCADE;
    DROP TABLE IF EXISTS "health_profiles_conditions" CASCADE;
    DROP TABLE IF EXISTS "health_profiles_health_goals" CASCADE;
    DROP TABLE IF EXISTS "health_profiles_biomarkers" CASCADE;
    DROP TABLE IF EXISTS "health_profiles" CASCADE;

    DELETE FROM "payload_locked_documents_rels"
    WHERE "health_profiles_id" IS NOT NULL;

    ALTER TABLE "payload_locked_documents_rels"
    DROP COLUMN IF EXISTS "health_profiles_id";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Tables are not recreated — health data has moved to Digital Twin.
  // To restore, redeploy from a commit before this migration.
}
