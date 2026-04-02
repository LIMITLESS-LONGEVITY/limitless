import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Ensure tenant_id column exists on certificates table.
  // The original migration may have created the table with this column,
  // but we need to be safe in case push:true created it without.
  await db.execute(sql`
    ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "tenant_id" integer;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "certificates" DROP COLUMN IF EXISTS "tenant_id";
  `)
}
