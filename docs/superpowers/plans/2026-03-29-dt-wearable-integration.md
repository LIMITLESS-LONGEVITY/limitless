# DT Phase 3: Wearable Integration (Oura Ring + Whoop)

## Context

El Fuerte Marbella hotel pilot requires wearable tracking during longevity stays. Guests receive a loaner Oura Ring on arrival; some bring their own Whoop. The Digital Twin must ingest sleep, HRV, recovery, activity data and make it available to the AI, the OS Dashboard, and the clinician.

**Good news:** The DT schema already has `wearableDevices`, `wearableData`, and `wearableSummaries` tables fully designed with OAuth token storage, TimescaleDB hypertable for time-series, and daily summary aggregation.

## Approach: Polling First, Webhooks Later

For the pilot, start with **polling** — simpler, no webhook endpoint exposure needed, works immediately. Add webhooks after the pilot proves the data flow.

Start with **Oura first** (simpler API, most pilot guests will use loaner rings), then replicate the pattern for Whoop.

## Plan

### 1. Oura OAuth Client

**File:** `src/services/oura.ts`

- `getAuthUrl(userId, redirectUri)` — builds Oura OAuth2 authorization URL with state token
- `exchangeCode(code)` — exchanges authorization code for access + refresh tokens
- `refreshToken(refreshToken)` — refreshes expired access token
- `fetchDailySleep(accessToken, startDate, endDate)` — GET /v2/usercollection/daily_sleep
- `fetchDailyActivity(accessToken, startDate, endDate)` — GET /v2/usercollection/daily_activity
- `fetchDailyReadiness(accessToken, startDate, endDate)` — GET /v2/usercollection/daily_readiness
- `fetchHeartRate(accessToken, startDate, endDate)` — GET /v2/usercollection/heart_rate

Env vars: `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`

### 2. Whoop OAuth Client

**File:** `src/services/whoop.ts`

Same pattern as Oura:
- `getAuthUrl`, `exchangeCode`, `refreshToken`
- `fetchRecovery`, `fetchSleep`, `fetchWorkouts`, `fetchCycles`

Env vars: `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`

### 3. Wearable Sync Service

**File:** `src/services/wearable-sync.ts`

- `syncDevice(deviceId)` — main sync function:
  1. Load device from DB (get tokens, provider, lastSyncAt)
  2. Check token expiry, refresh if needed, update DB
  3. Fetch data from provider API since lastSyncAt
  4. Transform provider data → `wearableSummaries` format (see mapping table)
  5. Upsert into `wearableSummaries` (unique on userId+date+provider)
  6. Optionally store raw time-series in `wearableData`
  7. Update device `lastSyncAt`

**Data mapping (provider → DT schema):**
- Oura daily_sleep → sleepDuration, sleepEfficiency, sleepDeep, sleepRem, sleepLight, sleepScore
- Oura daily_readiness → heartRateResting, hrvAvg
- Oura daily_activity → steps, caloriesActive, activeMinutes
- Whoop recovery → recoveryScore, heartRateResting
- Whoop sleep → sleepDuration, sleepEfficiency
- Whoop cycle → stressScore (strain)

### 4. Wearable Device Routes

**File:** `src/routes/wearable.ts`

- `GET /api/twin/:userId/wearable-devices` — list connected devices
- `POST /api/twin/:userId/wearable-devices/connect` — initiate OAuth (returns auth URL)
- `GET /api/twin/oauth/callback` — handle OAuth redirect (no userId in path — state token maps to user)
- `DELETE /api/twin/:userId/wearable-devices/:deviceId` — disconnect device (revoke tokens)
- `POST /api/twin/:userId/wearable-devices/:deviceId/sync` — trigger manual sync

### 5. Wearable Data Routes

**File:** `src/routes/wearable-data.ts`

- `GET /api/twin/:userId/wearable-summaries` — query daily summaries (filter: date range, provider)
- `GET /api/twin/:userId/wearable-data` — query time-series (filter: metric, date range)

### 6. Scheduled Sync

**File:** `src/services/scheduled-sync.ts`

Simple setInterval-based sync (no external job queue for MVP):
- Every 15 minutes: iterate all active devices, call `syncDevice()`
- Token refresh happens automatically during sync
- Log errors per device, don't stop the loop

Register in `src/index.ts` on server start.

### 7. Update AI Context

**File:** `src/routes/ai-context.ts`

The ai-context endpoint already returns `wearableInsights` (7-day averages). Update to pull from actual `wearableSummaries` instead of empty data.

### 8. Terraform: Add OAuth Credentials

Add to `digital-twin.tf` env vars:
- `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`
- `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`

Add to `variables.tf` + `terraform.tfvars`.

**Note:** Oura and Whoop developer accounts need to be created first:
- Oura: https://cloud.ouraring.com/oauth/applications
- Whoop: https://developer.whoop.com/

## Files to create (DT repo)
- `src/services/oura.ts` — Oura API client
- `src/services/whoop.ts` — Whoop API client
- `src/services/wearable-sync.ts` — sync logic + data transformation
- `src/services/scheduled-sync.ts` — polling interval
- `src/routes/wearable.ts` — device management routes
- `src/routes/wearable-data.ts` — data query routes
- `src/schemas/wearable.ts` — Zod validation schemas

## Files to modify (DT repo)
- `src/index.ts` — register new routes + scheduled sync
- `src/routes/ai-context.ts` — populate wearableInsights from real data
- `src/plugins/service-auth.ts` — add wearable scopes (optional)

## Files to modify (Infra repo)
- `digital-twin.tf` — add OAuth env vars
- `variables.tf` — declare OAuth variables
- `terraform.tfvars` — store OAuth credentials

## Prerequisites
- [ ] Create Oura developer account + app (get client ID + secret)
- [ ] Create Whoop developer account + app (get client ID + secret)
- [ ] Set OAuth redirect URI to `https://app.limitless-longevity.health/api/twin/oauth/callback` on both providers

## Verification
1. `pnpm build` passes
2. Connect Oura: hit /connect endpoint → OAuth flow → device saved in DB
3. Manual sync: hit /sync endpoint → data pulled from Oura → summaries in DB
4. Query summaries: GET /wearable-summaries → returns sleep, HRV, steps
5. AI context: GET /ai-context → wearableInsights populated with real data
6. OS Dashboard: Health widget shows wearable data
7. Scheduled sync: after 15 min, new data auto-appears

## Implementation Order

### Step 0: Developer Account Setup (human task)
1. **Oura:** Go to https://cloud.ouraring.com/oauth/applications → create app
   - App name: "LIMITLESS Longevity OS"
   - Redirect URI: `https://app.limitless-longevity.health/api/twin/oauth/callback`
   - Request scopes: personal_info, daily_activity, daily_readiness, daily_sleep, heart_rate, workout
   - Save: Client ID + Client Secret
2. **Whoop:** Go to https://developer.whoop.com/ → create app
   - App name: "LIMITLESS Longevity OS"
   - Redirect URI: `https://app.limitless-longevity.health/api/twin/oauth/callback`
   - Request scopes: read:profile, read:cycles, read:sleep, read:recovery, read:workout, offline
   - Save: Client ID + Client Secret
3. Add credentials to `terraform.tfvars` and deploy via Terraform

### Step 1: Oura client + sync service
Build the Oura OAuth client, sync service, and data transformation.

### Step 2: Routes
Device management (connect, list, disconnect, manual sync) + data query routes.

### Step 3: Scheduled sync
Polling interval (every 15 min) for all active devices.

### Step 4: AI context update
Populate wearableInsights from real wearableSummaries data.

### Step 5: Whoop client
Replicate Oura pattern for Whoop API.

### Step 6: Terraform + deploy
Add OAuth env vars, deploy all changes.
