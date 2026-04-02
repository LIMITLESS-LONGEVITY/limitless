# Phase 3A: Dual-Write HealthProfiles to Digital Twin

## Context

PATHS currently stores health profiles locally in its PostgreSQL database. The Digital Twin (DT) service is the intended health data authority. Phase 3A establishes dual-write: when a user creates or updates their health profile in PATHS, the data is also synced to DT. This is the first step of a 3-phase migration.

DT already has the schema, API, service auth, and demo data. The infra (service keys, env vars) is deployed. This plan covers the PATHS code changes only.

## Plan

### 1. Create DT sync utility

**File:** `src/utilities/syncHealthToDT.ts`

Responsible for transforming PATHS HealthProfile data to DT format and calling the DT API. Must fail gracefully (log error, never block PATHS operation).

Two API calls:
- `PATCH /api/twin/{userId}/profile` — syncs profile fields (conditions, medications, goals, pillar priorities)
- `POST /api/twin/{userId}/biomarkers/batch` — syncs biomarkers array

**Field mapping:**
- `conditions[]` → `conditions[]` (direct)
- `medications[]` → `medications[]` (direct)
- `healthGoals[].goal` → `healthGoals[]` (extract goal slug from select field)
- `pillarPriorities[].contentPillar` → `pillarPriorities{}` (transform relationship array to `{ pillarSlug: index }` object)
- Biomarkers: `name`, `value`, `unit` direct; `date` → `measuredAt` (ISO 8601); `normalRangeLow` → `referenceMin`; `normalRangeHigh` → `referenceMax`; `status` direct; add `category: "user-entered"`, `source: "paths"`

**Auth:** Uses `x-service-key` header with `process.env.DT_SERVICE_KEY`. URL from `process.env.DT_SERVICE_URL`.

**Error handling:** try/catch, `console.error` on failure, never throw. Follows the pattern from `generateCertificate.ts`.

### 2. Create afterChange hook

**File:** `src/hooks/syncHealthProfileToDT.ts`

```typescript
import type { CollectionAfterChangeHook } from 'payload'
import { syncHealthToDT } from '../utilities/syncHealthToDT'

export const syncHealthProfileToDT: CollectionAfterChangeHook = async ({ doc, req }) => {
  // Get user ID (resolve relationship if needed)
  const userId = typeof doc.user === 'object' ? doc.user.id : doc.user

  // Fire-and-forget — don't await, don't block PATHS
  syncHealthToDT(String(userId), doc).catch(err => {
    console.error('DT sync failed:', err.message)
  })

  return doc
}
```

### 3. Register hook on HealthProfiles collection

**File:** `src/collections/HealthProfiles/index.ts`

Add to the collection config:
```typescript
hooks: {
  afterChange: [syncHealthProfileToDT],
}
```

### 4. Create backfill script

**File:** `scripts/backfill-dt-profiles.ts`

One-time script to sync all existing HealthProfiles to DT:
- Uses `getPayload()` to get Payload instance
- Fetches all HealthProfiles with `overrideAccess: true`
- Iterates and calls `syncHealthToDT()` for each
- Logs progress and errors
- Idempotent (DT PATCH is upsert, safe to run multiple times)

Run via: `npx tsx scripts/backfill-dt-profiles.ts`

### 5. Skip env var changes (already done)

`DT_SERVICE_URL` and `DT_SERVICE_KEY` are already set on PATHS via Terraform.

## Files to create
- `src/utilities/syncHealthToDT.ts` — transform + send to DT API
- `src/hooks/syncHealthProfileToDT.ts` — afterChange hook
- `scripts/backfill-dt-profiles.ts` — one-time backfill

## Files to modify
- `src/collections/HealthProfiles/index.ts` — add afterChange hook

## What this does NOT do
- Does not change how PATHS reads health data (still local, Phase 3B)
- Does not remove the HealthProfiles collection (Phase 3C)
- Does not modify the DT codebase (service auth already updated)

## Verification
1. `pnpm build` passes
2. Edit health profile in PATHS admin → DT API receives the data (check DT logs or query DT directly)
3. Run backfill script → all existing profiles synced to DT
4. PATHS continues working normally if DT is unreachable (graceful failure)
5. Create PR
