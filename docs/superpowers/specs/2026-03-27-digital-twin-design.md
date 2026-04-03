# Digital Twin — Health Data Microservice Design

**Date:** 2026-03-27
**Status:** Design phase — implementation not started
**Author:** Main Instance (Operator)
**Depends on:** OS design spec (`2026-03-27-limitless-longevity-os-design.md`)

---

## 1. Purpose

The Digital Twin is LIMITLESS's **AI-created health model** for each user — the single source of truth for a user's health state across all apps. Every app reads from it; multiple sources write to it.

From the Recoletas business plan: *"Every patient has an AI-created Digital Twin health profile that tracks progress and refines plans."*

### Why a Standalone Microservice?

The Digital Twin is a **cross-cutting concern** consumed by every app (PATHS, HUB, CUBES+, OS). It receives writes from 5+ sources, has its own data model, access patterns (time-series for wearables, point reads for AI), scaling profile, and security requirements (health data privacy, GDPR).

Embedding it in any single app creates asymmetric coupling where one app becomes a single point of failure for all others. The cost of extracting later always exceeds building separately now.

### What the Digital Twin Is NOT
- Not an LMS (that's PATHS)
- Not a booking system (that's HUB)
- Not an AI engine (PATHS runs the AI tutor; Digital Twin provides the health context)
- Not a medical record system (no clinical notes — those stay in HUB)

---

## 2. Stack Decision

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Runtime** | Node.js 20 | Same expertise as PATHS/HUB team |
| **Framework** | Fastify | Minimal overhead, excellent performance for API-only service. No SSR/frontend needed. |
| **ORM** | Drizzle | Type-safe, same as PATHS. Familiar migration patterns. |
| **Database** | PostgreSQL + TimescaleDB | Standard tables for structured data; TimescaleDB hypertables for time-series wearable data |
| **Auth** | JWT cookie validation | Reads `.limitless-longevity.health` cookie, same as HUB |
| **API** | REST + WebSocket | REST for CRUD, WebSocket for real-time wearable data ingest |
| **Infra** | Render web service | Frankfurt (EU), Terraform-managed |

### Why Fastify, Not Next.js?

The Digital Twin has **no frontend**. It is a pure API service. Next.js adds SSR, routing, React overhead that provide zero value. Fastify is ~3x faster for JSON responses, has native WebSocket support, and produces a smaller Docker image.

### Why TimescaleDB?

Wearable data is fundamentally time-series:
- Heart rate every 5 minutes (288 readings/day per user)
- Sleep stages per night (variable, ~50 events)
- HRV per day (1 reading)
- Activity data per hour (24 readings/day)

At 1,000 active users with wearables: ~300K rows/day. Standard PostgreSQL handles this fine initially, but TimescaleDB's automatic partitioning, compression, and time-based aggregation functions (like `time_bucket`) make queries predictable as data grows. It's a PostgreSQL extension — no separate infrastructure, same connection string.

---

## 3. Data Model (Drizzle Schema)

```typescript
// ─── Core Tables ───

export const healthProfiles = pgTable('health_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique(),  // PATHS user ID

  // Demographics (for reference range calculation)
  dateOfBirth: date('date_of_birth'),
  biologicalSex: text('biological_sex'),  // 'male' | 'female' | 'other'
  height: real('height'),  // cm
  weight: real('weight'),  // kg

  // Health context
  conditions: jsonb('conditions').$type<string[]>().default([]),
  medications: jsonb('medications').$type<string[]>().default([]),
  allergies: jsonb('allergies').$type<string[]>().default([]),
  familyHistory: jsonb('family_history').$type<string[]>().default([]),

  // Longevity-specific
  pillarPriorities: jsonb('pillar_priorities').$type<PillarPriority[]>().default([]),
  healthGoals: jsonb('health_goals').$type<string[]>().default([]),

  // Computed
  biologicalAge: real('biological_age'),  // Estimated from biomarkers
  chronologicalAge: real('chronological_age'),  // From DOB

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Biomarkers ───

export const biomarkers = pgTable('biomarkers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),

  category: text('category').notNull(),  // 'blood', 'hormonal', 'metabolic', 'genetic', 'imaging'
  name: text('name').notNull(),          // 'total_cholesterol', 'testosterone', 'vo2_max'
  value: real('value').notNull(),
  unit: text('unit').notNull(),          // 'mg/dL', 'ng/dL', 'mL/kg/min'

  // Reference ranges
  referenceMin: real('reference_min'),
  referenceMax: real('reference_max'),
  optimalMin: real('optimal_min'),       // Longevity-optimal range (tighter than clinical)
  optimalMax: real('optimal_max'),

  // Status
  status: text('status'),               // 'optimal', 'normal', 'borderline', 'abnormal'

  // Source
  source: text('source').notNull(),      // 'user_entry', 'diagnostic', 'import', 'wearable'
  sourceId: text('source_id'),           // Reference to diagnostic booking, etc.
  enteredBy: text('entered_by'),         // User ID or clinician ID

  measuredAt: timestamp('measured_at').notNull(),  // When the measurement was taken
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('biomarkers_user_idx').on(table.userId),
  userNameIdx: index('biomarkers_user_name_idx').on(table.userId, table.name),
  measuredAtIdx: index('biomarkers_measured_at_idx').on(table.measuredAt),
}))

// ─── Diagnostic Results (structured) ───

export const diagnosticResults = pgTable('diagnostic_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),

  packageType: text('package_type').notNull(),  // 'comprehensive', 'executive', 'specialist'
  performedAt: timestamp('performed_at').notNull(),

  // Source
  hubBookingId: text('hub_booking_id'),  // Reference to HUB diagnostic booking
  clinicianId: text('clinician_id'),
  facility: text('facility'),            // 'recoletas_marbella', 'partner_lab'

  // Results
  summary: text('summary'),              // Clinician-written summary
  recommendations: jsonb('recommendations').$type<string[]>().default([]),

  // Raw results stored as biomarker entries (linked via sourceId)

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('diag_results_user_idx').on(table.userId),
}))

// ─── Wearable Devices ───

export const wearableDevices = pgTable('wearable_devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),

  provider: text('provider').notNull(),   // 'oura', 'whoop', 'apple_health', 'garmin'
  deviceId: text('device_id'),            // Provider-specific device ID
  accessToken: text('access_token'),      // Encrypted OAuth token
  refreshToken: text('refresh_token'),    // Encrypted refresh token
  tokenExpiresAt: timestamp('token_expires_at'),

  isActive: boolean('is_active').default(true),
  lastSyncAt: timestamp('last_sync_at'),

  // For loaner devices during hotel stays
  isLoaner: boolean('is_loaner').default(false),
  stayBookingId: text('stay_booking_id'), // Reference to HUB stay booking

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('wearable_devices_user_idx').on(table.userId),
}))

// ─── Wearable Data (TimescaleDB hypertable) ───

export const wearableData = pgTable('wearable_data', {
  // No UUID primary key — TimescaleDB uses (time, userId, metric) as composite
  userId: text('user_id').notNull(),
  deviceId: uuid('device_id').notNull(),  // References wearable_devices.id

  metric: text('metric').notNull(),       // 'heart_rate', 'hrv', 'sleep_stage', 'steps', 'calories', 'spo2', 'skin_temp', 'recovery_score'
  value: real('value').notNull(),
  unit: text('unit').notNull(),           // 'bpm', 'ms', 'steps', 'kcal', '%', '°C', 'score'

  // Metadata
  quality: text('quality'),               // 'good', 'fair', 'poor' — sensor confidence

  time: timestamp('time').notNull(),      // TimescaleDB partitions on this column
}, (table) => ({
  userMetricIdx: index('wearable_data_user_metric_idx').on(table.userId, table.metric),
}))
// NOTE: After table creation, run:
// SELECT create_hypertable('wearable_data', 'time');
// This converts it to a TimescaleDB hypertable with automatic time-based partitioning.

// ─── Wearable Summaries (daily aggregates) ───

export const wearableSummaries = pgTable('wearable_summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),

  date: date('date').notNull(),
  provider: text('provider').notNull(),

  // Sleep
  sleepDurationMinutes: integer('sleep_duration_minutes'),
  sleepScore: real('sleep_score'),
  deepSleepMinutes: integer('deep_sleep_minutes'),
  remSleepMinutes: integer('rem_sleep_minutes'),
  lightSleepMinutes: integer('light_sleep_minutes'),
  awakeMinutes: integer('awake_minutes'),

  // Heart
  restingHeartRate: real('resting_heart_rate'),
  hrvAverage: real('hrv_average'),           // ms
  hrvMax: real('hrv_max'),

  // Activity
  steps: integer('steps'),
  caloriesBurned: integer('calories_burned'),
  activeMinutes: integer('active_minutes'),

  // Recovery / Readiness
  recoveryScore: real('recovery_score'),     // Provider-specific (Whoop recovery, Oura readiness)
  strainScore: real('strain_score'),         // Whoop-specific

  // Body
  skinTemperature: real('skin_temperature'), // °C deviation from baseline
  spo2Average: real('spo2_average'),         // %
  respiratoryRate: real('respiratory_rate'), // breaths/min

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userDateIdx: index('wearable_summaries_user_date_idx').on(table.userId, table.date),
  uniqueDaily: unique().on(table.userId, table.date, table.provider),
}))

// ─── Genomic / Epigenetic Data ───

export const genomicData = pgTable('genomic_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),

  type: text('type').notNull(),           // 'snp', 'epigenetic_clock', 'telomere_length', 'methylation'
  gene: text('gene'),                     // e.g., 'APOE', 'MTHFR', 'FOXO3'
  variant: text('variant'),               // e.g., 'e3/e4', 'C677T'
  value: text('value'),                   // String to handle various formats

  riskLevel: text('risk_level'),          // 'low', 'moderate', 'elevated', 'high'
  interpretation: text('interpretation'), // Plain-language explanation

  source: text('source').notNull(),       // 'executive_diagnostic', 'external_lab'
  measuredAt: timestamp('measured_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('genomic_data_user_idx').on(table.userId),
}))

// ─── Activity Log (cross-app events for AI context) ───

export const activityLog = pgTable('activity_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),

  source: text('source').notNull(),       // 'paths', 'hub', 'cubes', 'self'
  eventType: text('event_type').notNull(), // 'course_completed', 'diagnostic_done', 'protocol_adherence', 'goal_updated'

  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),

  occurredAt: timestamp('occurred_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('activity_log_user_idx').on(table.userId),
  occurredAtIdx: index('activity_log_occurred_at_idx').on(table.occurredAt),
}))

// ─── Types ───

interface PillarPriority {
  pillar: 'sleep' | 'nutrition' | 'exercise' | 'stress' | 'cognition' | 'social'
  rank: number   // 1 = highest priority
  reason?: string
}
```

---

## 4. API Surface

### Health Profile
```
GET    /api/twin/:userId/profile              → Full health profile
PATCH  /api/twin/:userId/profile              → Update profile fields
GET    /api/twin/:userId/summary              → Dashboard summary (profile + latest biomarkers + latest wearable)
```

### Biomarkers
```
GET    /api/twin/:userId/biomarkers           → All biomarkers (paginated, filterable by category/name/date range)
GET    /api/twin/:userId/biomarkers/:name     → Single biomarker history (for trend charts)
POST   /api/twin/:userId/biomarkers           → Add biomarker entry (user or clinician)
POST   /api/twin/:userId/biomarkers/batch     → Bulk import (diagnostic results → multiple biomarkers)
```

### Diagnostics
```
GET    /api/twin/:userId/diagnostics          → Diagnostic result history
POST   /api/twin/:userId/diagnostics          → Add diagnostic result + associated biomarkers
GET    /api/twin/:userId/diagnostics/:id      → Single diagnostic result detail
```

### Wearables
```
GET    /api/twin/:userId/wearables/devices    → List connected devices
POST   /api/twin/:userId/wearables/connect    → Initiate OAuth flow for wearable provider
DELETE /api/twin/:userId/wearables/:deviceId  → Disconnect device
GET    /api/twin/:userId/wearables/latest     → Latest readings across all devices
GET    /api/twin/:userId/wearables/summary    → Daily summaries (paginated, date range)
GET    /api/twin/:userId/wearables/stream     → Historical raw data (date range, metric filter)
```

### Wearable Data Ingest
```
WS     /api/twin/:userId/ingest              → Real-time WebSocket for wearable data push
POST   /api/twin/:userId/ingest/batch        → Batch import (nightly sync from provider API)
```

### Genomic Data
```
GET    /api/twin/:userId/genomics             → Genomic/epigenetic data
POST   /api/twin/:userId/genomics             → Add genomic result
```

### Activity Log
```
GET    /api/twin/:userId/activity             → Cross-app activity log
POST   /api/twin/:userId/activity             → Log event (called by PATHS, HUB, CUBES+)
```

### AI Context (optimized for AI consumers)
```
GET    /api/twin/:userId/ai-context           → Structured health context for AI prompts
```
Returns a pre-formatted object designed for injection into AI system prompts:
```json
{
  "profile": { "age": 45, "sex": "male", "conditions": [...], "goals": [...] },
  "recentBiomarkers": [{ "name": "total_cholesterol", "value": 210, "status": "borderline", "trend": "improving" }],
  "wearableInsights": { "avgSleep": 7.2, "avgHRV": 42, "recoveryTrend": "stable" },
  "pillarPriorities": [{ "pillar": "sleep", "rank": 1 }],
  "recentActivity": ["Completed 'Advanced Sleep Science' course", "Diagnostic: Executive package (2 weeks ago)"]
}
```

### Admin / GDPR
```
GET    /api/twin/:userId/export               → Full data export (GDPR right to portability)
DELETE /api/twin/:userId                      → Delete all user data (GDPR right to erasure)
GET    /api/admin/stats                       → Service health + aggregate stats (admin only)
```

---

## 5. Authentication & Authorization

### Cookie Validation
Same pattern as HUB — reads JWT from `.limitless-longevity.health` cookie.

```typescript
// src/plugins/auth.ts (Fastify plugin)
import fp from 'fastify-plugin'
import jwt from 'jsonwebtoken'

export default fp(async (fastify) => {
  fastify.decorateRequest('user', null)

  fastify.addHook('onRequest', async (request, reply) => {
    const token = request.cookies['payload-token']
    if (!token) {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }

    try {
      request.user = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
    } catch {
      reply.code(401).send({ error: 'Invalid token' })
    }
  })
})
```

### Access Control Rules

| Endpoint Pattern | Who Can Access |
|-----------------|---------------|
| `GET /api/twin/:userId/*` | User themselves (userId matches JWT sub) OR clinician with patient relationship |
| `POST /api/twin/:userId/biomarkers` | User themselves OR authorized clinician |
| `POST /api/twin/:userId/diagnostics` | Clinician only (via HUB) |
| `POST /api/twin/:userId/ingest/*` | Service account (wearable sync) OR user themselves |
| `POST /api/twin/:userId/activity` | Service accounts (PATHS, HUB, CUBES+) |
| `GET /api/twin/:userId/ai-context` | Service accounts (PATHS AI tutor, HUB telemedicine) |
| `DELETE /api/twin/:userId` | User themselves only |
| `GET /api/admin/*` | Admin role only |

### Service-to-Service Auth
For calls from PATHS/HUB/CUBES+ backends (not user-initiated):
- API key in `X-Service-Key` header
- Each service gets its own key (rotatable)
- Service keys have scoped permissions (PATHS can read ai-context, HUB can write diagnostics)

```typescript
// Service key middleware
const serviceKeys = {
  [process.env.PATHS_SERVICE_KEY!]: { name: 'paths', scopes: ['read:ai-context', 'write:activity'] },
  [process.env.HUB_SERVICE_KEY!]: { name: 'hub', scopes: ['read:*', 'write:diagnostics', 'write:activity'] },
  [process.env.CUBES_SERVICE_KEY!]: { name: 'cubes', scopes: ['read:ai-context', 'write:activity'] },
}
```

---

## 6. Migration from PATHS HealthProfiles

### Current State in PATHS
PATHS has a `HealthProfiles` collection with:
- Health goals, conditions, medications, allergies
- Pillar priorities
- Basic biomarker values (user self-reported)
- Used by: AI tutor (`buildHealthContextSection`), action plans, daily protocols

### Migration Plan

**Phase 1: Build + Parallel Read**
1. Deploy Digital Twin with the schema above
2. Write a one-time migration script: read all PATHS `HealthProfiles` → write to Digital Twin via API
3. Update PATHS `buildHealthContextSection` to call Digital Twin `/ai-context` endpoint
4. Keep PATHS HealthProfiles as fallback (if Digital Twin is down, use local data)

**Phase 2: Switch Write Path**
5. PATHS health profile forms now write to Digital Twin API (not local collection)
6. PATHS HealthProfiles becomes read-only cache (updated via webhook from Digital Twin)

**Phase 3: Remove Local Copy**
7. Remove HealthProfiles collection from PATHS
8. All health data reads go through Digital Twin API
9. Run migration to clean up PATHS database

### Data Mapping
| PATHS HealthProfiles Field | Digital Twin Location |
|---------------------------|---------------------|
| `user` | `healthProfiles.userId` |
| `healthGoals` | `healthProfiles.healthGoals` |
| `conditions` | `healthProfiles.conditions` |
| `medications` | `healthProfiles.medications` |
| `allergies` | `healthProfiles.allergies` |
| `pillarPriorities` | `healthProfiles.pillarPriorities` |
| `biomarkers` (array) | Individual rows in `biomarkers` table |

---

## 7. Wearable Integration Design

### Supported Providers (Phase 1)

| Provider | Data Available | Integration Method |
|----------|---------------|-------------------|
| **Oura Ring** | Sleep, HRV, readiness, activity, temperature | OAuth 2.0 API + webhook |
| **Whoop** | Strain, recovery, sleep, HRV | OAuth 2.0 API + webhook |

### Supported Providers (Phase 2+)

| Provider | Data Available | Integration Method |
|----------|---------------|-------------------|
| **Apple Health** | All HealthKit data | Via companion iOS app (HealthKit API) |
| **Google Health Connect** | All Health Connect data | Via companion Android app |
| **Garmin** | Activity, sleep, stress, body battery | OAuth 2.0 API |

### OAuth Flow
1. User clicks "Connect Oura Ring" in OS dashboard or HUB
2. Redirect to provider OAuth consent screen
3. Provider redirects back with auth code
4. Digital Twin exchanges code for access/refresh tokens
5. Tokens stored encrypted in `wearableDevices` table
6. Initial historical sync (past 30 days)
7. Ongoing: provider webhook pushes new data, or nightly batch sync

### Data Ingest Pipeline
```
Provider API/Webhook
    │
    ▼
Digital Twin Ingest Endpoint
    │
    ├── Validate + normalize data
    ├── Write raw readings to wearable_data (hypertable)
    ├── Compute daily summary → wearable_summaries
    └── Extract biomarker-equivalent values → biomarkers
        (e.g., Oura readiness → recovery_score biomarker)
```

### Hotel Stay Loaner Wearables
1. HUB assigns loaner device (Oura Ring) at check-in
2. HUB calls Digital Twin: `POST /api/twin/:userId/wearables/connect` with `isLoaner: true, stayBookingId: xxx`
3. Data streams during stay
4. At checkout:
   - **Option A (keep):** Guest creates account, loaner flag removed, data stays
   - **Option B (decline):** Digital Twin deletes all data for this device + temp user record (GDPR)

---

## 8. Privacy & Security

### Core Principles
1. **Health data never enters search** — no RAG indexing, no content search pipeline
2. **Users own their data** — full export, full deletion, no data selling
3. **Minimum necessary access** — each app gets only what it needs via scoped API keys
4. **Encryption at rest** — PostgreSQL TDE or application-level encryption for sensitive fields
5. **Audit trail** — all writes logged with source, timestamp, actor

### GDPR Compliance
| Right | Implementation |
|-------|---------------|
| Right to access | `GET /api/twin/:userId/export` returns all data as JSON |
| Right to portability | Same export endpoint, downloadable format |
| Right to erasure | `DELETE /api/twin/:userId` cascades to all tables |
| Right to rectification | Users can edit biomarkers, profile via API |
| Data minimization | Only collect what's needed; wearable raw data auto-archived after 90 days |
| Consent | Explicit opt-in for each wearable connection; hotel guests choose at checkout |

### Data Residency
- All data stored in Frankfurt (EU) on Render PostgreSQL
- No cross-region replication
- TimescaleDB compression kicks in after 7 days (raw data compressed, summaries retained)

### Encryption
- Wearable OAuth tokens encrypted at application level (AES-256-GCM) before storage
- Database connection uses SSL
- All API traffic over HTTPS

---

## 9. Infrastructure

### Render Deployment
```
Service: limitless-digital-twin
Type: Web Service
Runtime: Node.js 20
Build: pnpm install && pnpm build
Start: pnpm start
Region: Frankfurt (EU)
```

### Database
```
PostgreSQL with TimescaleDB extension
Plan: Starter (upgrade as wearable data grows)
Region: Frankfurt (EU)

-- After initial migration:
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('wearable_data', 'time');

-- Compression policy (after 7 days)
ALTER TABLE wearable_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'user_id,metric',
  timescaledb.compress_orderby = 'time DESC'
);
SELECT add_compression_policy('wearable_data', INTERVAL '7 days');

-- Retention policy (raw data: 1 year, summaries: forever)
SELECT add_retention_policy('wearable_data', INTERVAL '1 year');
```

### Environment Variables
```
DATABASE_URL=postgresql://...            # Digital Twin PostgreSQL + TimescaleDB
JWT_SECRET=...                           # Shared with PATHS for cookie validation
PATHS_SERVICE_KEY=...                    # PATHS → Digital Twin auth
HUB_SERVICE_KEY=...                      # HUB → Digital Twin auth
CUBES_SERVICE_KEY=...                    # CUBES+ → Digital Twin auth
OURA_CLIENT_ID=...                       # Oura Ring OAuth
OURA_CLIENT_SECRET=...
WHOOP_CLIENT_ID=...                      # Whoop OAuth
WHOOP_CLIENT_SECRET=...
ENCRYPTION_KEY=...                       # AES-256-GCM for token encryption
PORT=3001
```

### Terraform Module
```hcl
# In limitless-infra/digital-twin.tf
resource "render_web_service" "digital_twin" {
  name    = "limitless-digital-twin"
  # ... same pattern as PATHS
}

resource "render_postgres" "digital_twin_db" {
  name   = "limitless-digital-twin-db"
  region = "frankfurt"
  plan   = "starter"
}

resource "cloudflare_dns_record" "digital_twin" {
  zone_id = var.cloudflare_zone_id
  name    = "digital-twin-api"
  content = render_web_service.digital_twin.service_details.url
  type    = "CNAME"
}
```

---

## 10. Project Structure

```
limitless-digital-twin/
├── drizzle/
│   ├── migrations/
│   └── meta/
├── src/
│   ├── index.ts                         # Fastify server entry
│   ├── plugins/
│   │   ├── auth.ts                      # JWT cookie validation
│   │   ├── service-auth.ts              # X-Service-Key validation
│   │   ├── cors.ts                      # CORS for .limitless-longevity.health
│   │   └── websocket.ts                 # WebSocket plugin for ingest
│   ├── routes/
│   │   ├── profile.ts                   # /api/twin/:userId/profile
│   │   ├── biomarkers.ts               # /api/twin/:userId/biomarkers
│   │   ├── diagnostics.ts              # /api/twin/:userId/diagnostics
│   │   ├── wearables.ts                # /api/twin/:userId/wearables/*
│   │   ├── ingest.ts                   # /api/twin/:userId/ingest (WS + REST)
│   │   ├── genomics.ts                 # /api/twin/:userId/genomics
│   │   ├── activity.ts                 # /api/twin/:userId/activity
│   │   ├── ai-context.ts              # /api/twin/:userId/ai-context
│   │   ├── export.ts                   # /api/twin/:userId/export
│   │   └── admin.ts                    # /api/admin/*
│   ├── db/
│   │   ├── schema.ts                    # Drizzle schema (all tables)
│   │   ├── client.ts                    # Drizzle client singleton
│   │   └── seed.ts                      # Development seed data
│   ├── services/
│   │   ├── biomarker.service.ts         # Biomarker CRUD + trend calculation
│   │   ├── wearable.service.ts          # Wearable data processing + summarization
│   │   ├── ai-context.service.ts        # Build AI context object
│   │   └── export.service.ts            # GDPR data export
│   ├── integrations/
│   │   ├── oura.ts                      # Oura Ring API client
│   │   ├── whoop.ts                     # Whoop API client
│   │   └── types.ts                     # Shared integration types
│   ├── lib/
│   │   ├── encryption.ts                # AES-256-GCM for token storage
│   │   ├── validation.ts                # Zod schemas for request validation
│   │   └── errors.ts                    # Error types + handlers
│   └── types/
│       └── index.ts                     # Shared TypeScript types
├── tests/
│   ├── routes/
│   └── services/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── Dockerfile
└── .env.example
```

---

## 11. Implementation Phases

### Phase 1: Core API (Week 1-2)
- Scaffold repo with Fastify + Drizzle + PostgreSQL
- Health profile CRUD endpoints
- Biomarker CRUD endpoints (user entry + clinician entry)
- JWT cookie validation
- Service-to-service auth (API keys)
- `/ai-context` endpoint (replaces PATHS `buildHealthContextSection`)
- Deploy to Render + Terraform DNS
- Migration script: PATHS HealthProfiles → Digital Twin

### Phase 2: HUB Integration (Week 2-3)
- Diagnostic result import endpoint (HUB clinician writes)
- Batch biomarker import (diagnostic → individual biomarker rows)
- Summary endpoint for HUB patient portal
- Activity log endpoints (cross-app events)

### Phase 3: Wearable Foundation (Week 3-5)
- Oura Ring OAuth integration
- Wearable data ingest (REST batch + WebSocket real-time)
- Daily summary computation
- TimescaleDB hypertable setup + compression policies

### Phase 4: Whoop + Advanced (Week 5-7)
- Whoop API integration
- Wearable dashboard data endpoints
- Hotel stay loaner device flow
- Biomarker trend calculation (improving/stable/declining)

### Phase 5: GDPR + Production Hardening (Week 7-8)
- Full data export endpoint
- Cascading deletion endpoint
- Audit logging
- Token encryption for wearable OAuth tokens
- Rate limiting
- Error monitoring (Sentry)

### Phase 6: Genomic Data + AI Enhancement (Week 8+)
- Genomic/epigenetic data endpoints
- Biological age estimation from biomarkers
- Enhanced AI context with wearable insights
- Cross-app correlation (course completion → health outcome tracking)

---

## 12. Open Questions (to resolve during implementation)

1. **TimescaleDB on Render:** Does Render's managed PostgreSQL support the TimescaleDB extension? If not, use Timescale Cloud or self-hosted on Render Docker.
2. **Wearable OAuth redirect:** Where does the OAuth callback land? OS dashboard, HUB, or Digital Twin directly?
3. **Biological age calculation:** Which algorithm? (Levine PhenoAge, GrimAge, or simpler heuristic from available biomarkers)
4. **Real-time WebSocket scale:** At what user count do we need a dedicated WebSocket server (vs Fastify built-in)?
5. **HL7/FHIR integration:** What specific resource types does Recoletas export? (Needs hospital IT coordination)
6. **Token encryption key rotation:** How to handle key rotation without invalidating all stored OAuth tokens?
