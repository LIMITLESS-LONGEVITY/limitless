import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Consents — tracks user consent for specific data processing purposes
// ---------------------------------------------------------------------------
export const consents = pgTable(
  'consents',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    purpose: text('purpose').notNull(), // wearable_sync | biomarker_storage | ai_analysis | longevity_score | clinician_access
    granted: boolean('granted').notNull().default(false),
    grantedAt: timestamp('granted_at', { withTimezone: true }),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  },
  (table) => [
    unique('consents_user_purpose_uniq').on(table.userId, table.purpose),
  ],
);
