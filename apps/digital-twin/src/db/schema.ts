import {
  pgTable,
  uuid,
  text,
  real,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Health Profiles
// ---------------------------------------------------------------------------
export const healthProfiles = pgTable('health_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique(),
  dateOfBirth: text('date_of_birth'),
  biologicalSex: text('biological_sex'),
  height: real('height'),
  weight: real('weight'),
  conditions: jsonb('conditions').$type<string[]>().default([]),
  medications: jsonb('medications').$type<string[]>().default([]),
  allergies: jsonb('allergies').$type<string[]>().default([]),
  familyHistory: jsonb('family_history').$type<Record<string, unknown>[]>().default([]),
  pillarPriorities: jsonb('pillar_priorities').$type<Record<string, number>>().default({}),
  healthGoals: jsonb('health_goals').$type<string[]>().default([]),
  biologicalAge: real('biological_age'),
  chronologicalAge: real('chronological_age'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Biomarkers
// ---------------------------------------------------------------------------
export const biomarkers = pgTable(
  'biomarkers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    category: text('category').notNull(),
    name: text('name').notNull(),
    value: real('value').notNull(),
    unit: text('unit').notNull(),
    referenceMin: real('reference_min'),
    referenceMax: real('reference_max'),
    optimalMin: real('optimal_min'),
    optimalMax: real('optimal_max'),
    status: text('status'),
    source: text('source'),
    sourceId: text('source_id'),
    enteredBy: text('entered_by'),
    measuredAt: timestamp('measured_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('biomarkers_user_id_idx').on(table.userId),
    index('biomarkers_user_name_idx').on(table.userId, table.name),
    index('biomarkers_measured_at_idx').on(table.measuredAt),
  ],
);

// ---------------------------------------------------------------------------
// Wearable Data (will become TimescaleDB hypertable)
// ---------------------------------------------------------------------------
export const wearableData = pgTable(
  'wearable_data',
  {
    userId: text('user_id').notNull(),
    deviceId: uuid('device_id').notNull(),
    metric: text('metric').notNull(),
    value: real('value').notNull(),
    unit: text('unit'),
    quality: text('quality'),
    time: timestamp('time', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('wearable_data_user_metric_idx').on(table.userId, table.metric),
  ],
);

// ---------------------------------------------------------------------------
// Wearable Summaries
// ---------------------------------------------------------------------------
export const wearableSummaries = pgTable(
  'wearable_summaries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    provider: text('provider').notNull(),

    // Sleep
    sleepDuration: real('sleep_duration'),
    sleepEfficiency: real('sleep_efficiency'),
    sleepDeep: real('sleep_deep'),
    sleepRem: real('sleep_rem'),
    sleepLight: real('sleep_light'),
    sleepAwake: real('sleep_awake'),
    sleepScore: real('sleep_score'),

    // Heart
    heartRateAvg: real('heart_rate_avg'),
    heartRateMin: real('heart_rate_min'),
    heartRateMax: real('heart_rate_max'),
    heartRateResting: real('heart_rate_resting'),
    hrvAvg: real('hrv_avg'),

    // Activity
    steps: integer('steps'),
    caloriesActive: real('calories_active'),
    caloriesTotal: real('calories_total'),
    distanceMeters: real('distance_meters'),
    activeMinutes: integer('active_minutes'),

    // Recovery
    recoveryScore: real('recovery_score'),
    stressScore: real('stress_score'),

    // Body
    bodyWeight: real('body_weight'),
    bodyFatPercent: real('body_fat_percent'),
    muscleMass: real('muscle_mass'),

    // Multi-provider (future: Garmin, Apple Watch)
    bodyBattery: integer('body_battery'),
    spo2Avg: real('spo2_avg'),
    respirationRate: real('respiration_rate'),
    vo2Max: real('vo2_max'),
    wristTemperature: real('wrist_temperature'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('wearable_summaries_user_date_provider_uniq').on(
      table.userId,
      table.date,
      table.provider,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Activity Log
// ---------------------------------------------------------------------------
export const activityLog = pgTable(
  'activity_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    source: text('source').notNull(),
    eventType: text('event_type').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('activity_log_user_id_idx').on(table.userId),
    index('activity_log_occurred_at_idx').on(table.occurredAt),
  ],
);

// ---------------------------------------------------------------------------
// Diagnostic Results
// ---------------------------------------------------------------------------
export const diagnosticResults = pgTable(
  'diagnostic_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    packageType: text('package_type').notNull(),
    performedAt: timestamp('performed_at', { withTimezone: true }).notNull(),
    hubBookingId: text('hub_booking_id'),
    clinicianId: text('clinician_id'),
    facility: text('facility'),
    summary: text('summary'),
    recommendations: jsonb('recommendations').$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('diagnostic_results_user_id_idx').on(table.userId),
  ],
);

// ---------------------------------------------------------------------------
// Wearable Devices
// ---------------------------------------------------------------------------
export const wearableDevices = pgTable(
  'wearable_devices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    provider: text('provider').notNull(),
    deviceId: text('device_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    isActive: boolean('is_active').default(true).notNull(),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    isLoaner: boolean('is_loaner').default(false).notNull(),
    stayBookingId: text('stay_booking_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('wearable_devices_user_id_idx').on(table.userId),
  ],
);

// ---------------------------------------------------------------------------
// Stay Context
// ---------------------------------------------------------------------------
export const stayContext = pgTable(
  'stay_context',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    hubStayBookingId: text('hub_stay_booking_id'),
    stayType: text('stay_type').notNull(), // '3-day' | '5-day' | '7-day'
    stayLocation: text('stay_location').notNull(),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    followUpMonths: integer('follow_up_months'),
    status: text('status').notNull().default('upcoming'), // 'upcoming' | 'active' | 'completed' | 'follow-up'
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('stay_context_user_id_idx').on(table.userId),
    index('stay_context_status_idx').on(table.userId, table.status),
  ],
);

// ---------------------------------------------------------------------------
// Longevity Score
// ---------------------------------------------------------------------------
export const longevityScore = pgTable(
  'longevity_score',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    score: real('score').notNull(),
    components: jsonb('components').$type<Record<string, number>>().default({}),
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('longevity_score_user_id_idx').on(table.userId),
    unique('longevity_score_user_date_uniq').on(table.userId, table.date),
  ],
);

// ---------------------------------------------------------------------------
// Genomic Data
// ---------------------------------------------------------------------------
export const genomicData = pgTable(
  'genomic_data',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    type: text('type').notNull(),
    gene: text('gene').notNull(),
    variant: text('variant'),
    value: text('value'),
    riskLevel: text('risk_level'),
    interpretation: text('interpretation'),
    source: text('source'),
    measuredAt: timestamp('measured_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('genomic_data_user_id_idx').on(table.userId),
  ],
);
