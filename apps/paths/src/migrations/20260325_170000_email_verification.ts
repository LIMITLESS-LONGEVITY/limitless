import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "_verified" boolean DEFAULT false;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "_verificationtoken" varchar;
    ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "_verification_token";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false;
    ALTER TABLE "users" DROP COLUMN IF EXISTS "_verified";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "_verificationtoken";
  `)
}
