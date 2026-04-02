import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "certification_enabled" boolean DEFAULT false;
    ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "certification_expiry" numeric;
    ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "organization_name" varchar;
    ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "organization_logo_id" integer;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tenants" DROP COLUMN IF EXISTS "certification_enabled";
    ALTER TABLE "tenants" DROP COLUMN IF EXISTS "certification_expiry";
    ALTER TABLE "tenants" DROP COLUMN IF EXISTS "organization_name";
    ALTER TABLE "tenants" DROP COLUMN IF EXISTS "organization_logo_id";
  `)
}
