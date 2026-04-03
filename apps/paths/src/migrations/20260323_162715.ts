import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ai_config_rate_limits_tier" AS ENUM('free', 'regular', 'premium', 'enterprise');
  CREATE TABLE "ai_usage" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"feature" varchar NOT NULL,
  	"provider" varchar NOT NULL,
  	"model" varchar NOT NULL,
  	"input_tokens" numeric NOT NULL,
  	"output_tokens" numeric NOT NULL,
  	"estimated_cost" numeric NOT NULL,
  	"context_collection" varchar,
  	"context_id" varchar,
  	"refused" boolean DEFAULT false,
  	"duration_ms" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ai_config_rate_limits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"feature" varchar NOT NULL,
  	"tier" "enum_ai_config_rate_limits_tier" NOT NULL,
  	"daily_limit" numeric NOT NULL
  );
  
  CREATE TABLE "ai_config_staff_soft_limits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"feature" varchar NOT NULL,
  	"daily_warning" numeric NOT NULL
  );
  
  CREATE TABLE "ai_config_model_overrides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"feature" varchar NOT NULL,
  	"provider" varchar NOT NULL,
  	"model" varchar NOT NULL
  );
  
  CREATE TABLE "ai_config" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"token_budgets_tutor_max_tokens" numeric DEFAULT 1024,
  	"token_budgets_quiz_max_tokens" numeric DEFAULT 2048,
  	"default_provider" varchar DEFAULT 'default',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ai_usage_id" integer;
  ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ai_config_rate_limits" ADD CONSTRAINT "ai_config_rate_limits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ai_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ai_config_staff_soft_limits" ADD CONSTRAINT "ai_config_staff_soft_limits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ai_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ai_config_model_overrides" ADD CONSTRAINT "ai_config_model_overrides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ai_config"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ai_usage_user_idx" ON "ai_usage" USING btree ("user_id");
  CREATE INDEX "ai_usage_updated_at_idx" ON "ai_usage" USING btree ("updated_at");
  CREATE INDEX "ai_usage_created_at_idx" ON "ai_usage" USING btree ("created_at");
  CREATE INDEX "ai_config_rate_limits_order_idx" ON "ai_config_rate_limits" USING btree ("_order");
  CREATE INDEX "ai_config_rate_limits_parent_id_idx" ON "ai_config_rate_limits" USING btree ("_parent_id");
  CREATE INDEX "ai_config_staff_soft_limits_order_idx" ON "ai_config_staff_soft_limits" USING btree ("_order");
  CREATE INDEX "ai_config_staff_soft_limits_parent_id_idx" ON "ai_config_staff_soft_limits" USING btree ("_parent_id");
  CREATE INDEX "ai_config_model_overrides_order_idx" ON "ai_config_model_overrides" USING btree ("_order");
  CREATE INDEX "ai_config_model_overrides_parent_id_idx" ON "ai_config_model_overrides" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ai_usage_fk" FOREIGN KEY ("ai_usage_id") REFERENCES "public"."ai_usage"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_ai_usage_id_idx" ON "payload_locked_documents_rels" USING btree ("ai_usage_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ai_usage" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ai_config_rate_limits" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ai_config_staff_soft_limits" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ai_config_model_overrides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ai_config" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ai_usage" CASCADE;
  DROP TABLE "ai_config_rate_limits" CASCADE;
  DROP TABLE "ai_config_staff_soft_limits" CASCADE;
  DROP TABLE "ai_config_model_overrides" CASCADE;
  DROP TABLE "ai_config" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ai_usage_fk";
  
  DROP INDEX "payload_locked_documents_rels_ai_usage_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ai_usage_id";
  DROP TYPE "public"."enum_ai_config_rate_limits_tier";`)
}
