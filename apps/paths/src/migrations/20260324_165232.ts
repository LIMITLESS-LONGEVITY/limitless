import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_content_chunks_access_level" AS ENUM('free', 'regular', 'premium', 'enterprise');
  CREATE TABLE "content_chunks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"source_collection" varchar NOT NULL,
  	"source_id" varchar NOT NULL,
  	"source_title" varchar NOT NULL,
  	"access_level" "enum_content_chunks_access_level" NOT NULL,
  	"pillar_id" integer,
  	"chunk_index" numeric NOT NULL,
  	"token_count" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_chunks_id" integer;
  ALTER TABLE "content_chunks" ADD CONSTRAINT "content_chunks_pillar_id_content_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."content_pillars"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "content_chunks_pillar_idx" ON "content_chunks" USING btree ("pillar_id");
  CREATE INDEX "content_chunks_updated_at_idx" ON "content_chunks" USING btree ("updated_at");
  CREATE INDEX "content_chunks_created_at_idx" ON "content_chunks" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_chunks_fk" FOREIGN KEY ("content_chunks_id") REFERENCES "public"."content_chunks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_content_chunks_id_idx" ON "payload_locked_documents_rels" USING btree ("content_chunks_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "content_chunks" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "content_chunks" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_chunks_fk";
  
  DROP INDEX "payload_locked_documents_rels_content_chunks_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_chunks_id";
  DROP TYPE "public"."enum_content_chunks_access_level";`)
}
