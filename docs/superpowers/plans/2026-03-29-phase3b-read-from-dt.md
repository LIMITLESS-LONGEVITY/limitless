# Phase 3B: Switch PATHS AI to Read Health Data from Digital Twin

## Context

Phase 3A established dual-write: PATHS writes health profiles to both local DB and DT. Phase 3B switches the read path: PATHS AI endpoints and the /account/health page read from DT instead of the local HealthProfiles collection. The local collection stays as fallback until Phase 3C removes it.

## Data Sources from DT

Two DT endpoints provide all needed data:

1. **`GET /api/twin/{userId}/profile`** — returns: conditions, medications, healthGoals, pillarPriorities, dateOfBirth, biologicalSex, height, weight, biologicalAge, chronologicalAge
2. **`GET /api/twin/{userId}/biomarkers?limit=50`** — returns full biomarker objects with referenceMin/Max, optimalMin/Max, status, measuredAt

Combined, these provide everything `buildHealthContextSection` needs, plus extra data (age, sex, wearables) not available locally.

## Plan

### 1. Update getHealthProfile utility

**File:** `src/utilities/getHealthProfile.ts`

Replace the Payload query with DT API calls. Transform DT response to match the shape `buildHealthContextSection` expects.

```
Current: payload.find({ collection: 'health-profiles', where: { user: userId } })
New:     fetch DT profile + biomarkers → transform to Payload-compatible shape
```

**Transform mapping:**
- DT `profile.conditions[]` (strings) → `{ condition: string }[]`
- DT `profile.medications[]` (strings) → `{ medication: string }[]`
- DT `profile.healthGoals[]` (strings) → `{ goal: string }[]`
- DT `profile.pillarPriorities{}` (map) → `{ pillar: { name: key } }[]`
- DT `biomarkers[]` → map `referenceMin` → `normalRangeLow`, `referenceMax` → `normalRangeHigh`, `measuredAt` → `date`

**Fallback:** If DT is unreachable, fall back to local Payload query (same as current). Log warning.

**Auth:** Use `x-service-key` header with `process.env.DT_SERVICE_KEY`. URL from `process.env.DT_SERVICE_URL`.

### 2. Update /account/health page read

**File:** `src/app/(frontend)/account/health/page.tsx`

Change the server-side read from Payload to a fetch from DT:
```
Current: payload.find({ collection: 'health-profiles' })
New:     fetch(DT_SERVICE_URL + '/api/twin/' + userId + '/profile') + fetch(.../biomarkers)
```

This is a server component, so it can call DT directly with the service key.

**Write path stays on Payload** — the afterChange hook syncs to DT.

### 3. No changes needed to AI prompt builders

`buildHealthContextSection` and the three AI endpoints (tutor, actionPlan, dailyProtocol) don't need changes — they receive the profile from `getHealthProfile()` which handles the transformation internally.

### 4. ActionPlan snapshot

The `healthProfileSnapshot` stored in ActionPlans captures `{ biomarkers, healthGoals }` from whatever `getHealthProfile` returns. Since we're transforming DT data to match the Payload shape, snapshots will continue to work. The snapshot format stays the same.

## Files to modify
- `src/utilities/getHealthProfile.ts` — main change: DT fetch + transform + fallback
- `src/app/(frontend)/account/health/page.tsx` — read from DT instead of Payload

## Files NOT modified
- `src/endpoints/ai/tutor.ts` — no change (calls getHealthProfile)
- `src/endpoints/ai/actionPlan.ts` — no change
- `src/endpoints/ai/dailyProtocol.ts` — no change
- `src/ai/prompts/healthContext.ts` — no change
- `src/collections/HealthProfiles/index.ts` — no change (collection stays for Phase 3C)
- `src/app/(frontend)/account/health/HealthProfileClient.tsx` — write path stays on Payload

## Verification
1. `pnpm build` passes
2. AI tutor gives health-aware responses (test with admin user who has DT data)
3. `/account/health` page displays biomarkers from DT
4. Edit health profile → saves to Payload → hook syncs to DT → next AI call uses updated data
5. If DT is unreachable: AI endpoints still work (fallback to local Payload)
6. ActionPlan generation stores correct healthProfileSnapshot
