import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "_articles_v" ADD COLUMN "version_generate_slug" boolean DEFAULT true;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles" DROP COLUMN "generate_slug";
  ALTER TABLE "_articles_v" DROP COLUMN "version_generate_slug";`)
}
