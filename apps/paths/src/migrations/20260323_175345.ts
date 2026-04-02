import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_subscriptions_status" AS ENUM('active', 'past_due', 'cancelled', 'expired');
  CREATE TYPE "public"."enum_subscriptions_billing_interval" AS ENUM('monthly', 'yearly');
  CREATE TABLE "subscriptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"tier_id" integer NOT NULL,
  	"stripe_subscription_id" varchar NOT NULL,
  	"stripe_customer_id" varchar NOT NULL,
  	"status" "enum_subscriptions_status" DEFAULT 'active' NOT NULL,
  	"billing_interval" "enum_subscriptions_billing_interval" NOT NULL,
  	"current_period_start" timestamp(3) with time zone,
  	"current_period_end" timestamp(3) with time zone,
  	"cancel_at_period_end" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stripe_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stripe_event_id" varchar NOT NULL,
  	"event_type" varchar NOT NULL,
  	"processed" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "subscriptions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "stripe_events_id" integer;
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tier_id_membership_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tiers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");
  CREATE INDEX "subscriptions_tier_idx" ON "subscriptions" USING btree ("tier_id");
  CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_idx" ON "subscriptions" USING btree ("stripe_subscription_id");
  CREATE INDEX "subscriptions_updated_at_idx" ON "subscriptions" USING btree ("updated_at");
  CREATE INDEX "subscriptions_created_at_idx" ON "subscriptions" USING btree ("created_at");
  CREATE UNIQUE INDEX "stripe_events_stripe_event_id_idx" ON "stripe_events" USING btree ("stripe_event_id");
  CREATE INDEX "stripe_events_updated_at_idx" ON "stripe_events" USING btree ("updated_at");
  CREATE INDEX "stripe_events_created_at_idx" ON "stripe_events" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscriptions_fk" FOREIGN KEY ("subscriptions_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stripe_events_fk" FOREIGN KEY ("stripe_events_id") REFERENCES "public"."stripe_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("subscriptions_id");
  CREATE INDEX "payload_locked_documents_rels_stripe_events_id_idx" ON "payload_locked_documents_rels" USING btree ("stripe_events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "subscriptions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stripe_events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "subscriptions" CASCADE;
  DROP TABLE "stripe_events" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_subscriptions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_stripe_events_fk";
  
  DROP INDEX "payload_locked_documents_rels_subscriptions_id_idx";
  DROP INDEX "payload_locked_documents_rels_stripe_events_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "subscriptions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "stripe_events_id";
  DROP TYPE "public"."enum_subscriptions_status";
  DROP TYPE "public"."enum_subscriptions_billing_interval";`)
}
