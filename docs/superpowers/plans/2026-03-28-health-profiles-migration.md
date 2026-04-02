# Phase 3: HealthProfiles → Digital Twin Migration

**Date:** 2026-03-28
**Risk:** Medium — real user data, AI endpoint quality depends on this
**Key insight:** Only 3 AI endpoints + 1 UI page read HealthProfiles. No hooks, no webhooks, no external integrations. Graceful degradation already built in.

---

## Dependency Map

### Writes (2 places)
1. **`/account/health` page** (`HealthProfileClient.tsx`) — user edits biomarkers, goals, conditions, medications via Payload REST API

### Reads (4 places)
1. **`getHealthProfile()` utility** — called by 3 AI endpoints
2. **AI Tutor** (`POST /api/ai/tutor`) — personalizes chat responses
3. **Action Plan** (`POST /api/ai/action-plan`) — generates 30-day plan + stores snapshot
4. **Daily Protocol** (`POST /api/ai/daily-protocol`) — personalizes daily protocol

### Not affected
- AI Recommendations — doesn't use health profiles
- AI Quiz — doesn't use health profiles
- AI Search — doesn't use health profiles
- RAG ContentChunks — HealthProfiles explicitly NOT indexed (by design)

---

## Schema Mapping: PATHS → Digital Twin

| PATHS HealthProfiles | DT healthProfiles | Notes |
|---------------------|-------------------|-------|
| `user` (relationship) | `userId` (text) | DT uses PATHS user ID string |
| `biomarkers[]` (array) | `biomarkers` table (separate) | DT stores as individual rows, not nested array |
| `biomarkers[].name` | `biomarkers.name` | Direct map |
| `biomarkers[].value` | `biomarkers.value` | Direct map |
| `biomarkers[].unit` | `biomarkers.unit` | Direct map |
| `biomarkers[].date` | `biomarkers.measuredAt` | Date → timestamp |
| `biomarkers[].normalRangeLow` | `biomarkers.referenceMin` | Rename |
| `biomarkers[].normalRangeHigh` | `biomarkers.referenceMax` | Rename |
| `biomarkers[].status` | `biomarkers.status` | Direct map |
| `healthGoals[]` | `healthProfiles.healthGoals` (jsonb) | Array → jsonb |
| `conditions[]` | `healthProfiles.conditions` (jsonb) | Array → jsonb |
| `medications[]` | `healthProfiles.medications` (jsonb) | Array → jsonb |
| `pillarPriorities[]` | `healthProfiles.pillarPriorities` (jsonb) | Relationship → jsonb record |
| (none) | `dateOfBirth`, `biologicalSex` | New fields in DT, not in PATHS |
| (none) | `height`, `weight` | New fields in DT, not in PATHS |
| (none) | `biologicalAge`, `chronologicalAge` | New fields in DT, not in PATHS |

**Key difference:** PATHS stores biomarkers as nested array in HealthProfiles. DT stores them as separate rows in a `biomarkers` table with richer metadata (source, sourceId, enteredBy, referenceMin/Max, optimalMin/Max).

---

## Phase 3A: Dual-Write (PATHS writes to both local + DT)

### Tasks
1. Add `DT_SERVICE_URL` and `DT_SERVICE_KEY` env vars to PATHS via Terraform
2. Create utility: `src/utilities/syncHealthToDT.ts`
   - Accepts userId + profile data
   - Calls DT `PATCH /api/twin/{userId}/profile` for profile fields
   - Calls DT `POST /api/twin/{userId}/biomarkers/batch` for biomarkers
   - Fails gracefully (log error, don't block PATHS operation)
3. Add `afterChange` hook to HealthProfiles collection → calls `syncHealthToDT()`
4. Create backfill script: `scripts/backfill-dt-profiles.ts`
   - Iterates all existing HealthProfiles
   - Syncs each to DT via API
   - Idempotent (can run multiple times safely)
5. Add `DT_SERVICE_KEY` to Digital Twin's service auth config (PATHS scope)
6. Deploy PATHS + run backfill

### Terraform changes
```hcl
# In paths.tf env_vars:
DT_SERVICE_URL = { value = "https://digital-twin-api.limitless-longevity.health" }
DT_SERVICE_KEY = { value = var.dt_service_key }

# In digital-twin.tf env_vars (add PATHS to allowed services):
# Already has HUB and PATHS in service-auth.ts plugin
```

### Verification
- Edit health profile in PATHS → data appears in DT within seconds
- Backfill completes without errors
- DT has all existing profiles
- PATHS continues working normally (DT errors don't break anything)

### Estimated effort: Small (3-4 hours)

---

## Phase 3B: Read from DT (PATHS AI reads from DT instead of local)

### Tasks
1. Update `getHealthProfile()` utility:
   - Change from: `payload.find({ collection: 'health-profiles' })`
   - Change to: `fetch(DT_SERVICE_URL + '/api/twin/' + userId + '/ai-context')`
   - Keep same return interface (or adapt AI prompt builders)
   - Graceful fallback: if DT fails, try local HealthProfiles (belt + suspenders)
2. Update `buildHealthContextSection()` if DT ai-context response shape differs
3. Update `/account/health` page:
   - Read from DT: `GET /api/twin/{userId}/profile` + `GET /api/twin/{userId}/biomarkers`
   - Write still goes to PATHS (dual-write sends to DT via hook)
4. Test all 3 AI endpoints with DT data source
5. Monitor for quality/performance issues (DT API latency)

### Verification
- AI tutor gives health-aware responses using DT data
- Action plans generate correctly with DT health context
- Daily protocols personalized correctly
- `/account/health` page displays data from DT
- Performance: DT API response < 500ms

### Estimated effort: Medium (4-6 hours)

---

## Phase 3C: Remove HealthProfiles from PATHS

### Prerequisites
- Phase 3B verified and stable for at least 1 week
- No fallback to local HealthProfiles triggered in production

### Tasks
1. Remove `afterChange` dual-write hook (DT is now source of truth)
2. Remove `getHealthProfile()` local fallback
3. Remove HealthProfiles collection from `payload.config.ts`
4. Delete collection file: `src/collections/HealthProfiles/`
5. Create migration to drop tables: `health_profiles`, `health_profiles_biomarkers`, `health_profiles_health_goals`, `health_profiles_conditions`, `health_profiles_medications`, `health_profiles_pillar_priorities`
6. Remove type references from `payload-types.ts` (auto-regenerated)
7. Update `/account/health` page: write directly to DT API (remove Payload REST calls)
8. Clean up imports and unused utilities
9. Deploy

### Verification
- `pnpm build` passes
- All AI features still work (reading from DT)
- `/account/health` reads/writes directly to DT
- No references to deleted collection in codebase

### Estimated effort: Small (2-3 hours)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| DT API down → AI endpoints broken | Phase 3B includes fallback to local HealthProfiles |
| Data loss during migration | Backfill is idempotent; original data stays in PATHS until Phase 3C |
| Schema mismatch | Mapping table above covers all fields; DT schema is a superset |
| Performance regression | DT API should be < 500ms; monitor before removing fallback |
| ActionPlan snapshots reference old format | Snapshots are frozen copies — they stay as-is in PATHS |

## Timeline

- **Phase 3A:** Can start immediately (1 session)
- **Phase 3B:** After 3A verified (1 session)
- **Phase 3C:** After 3B stable for 1 week (1 session)
- **Total:** ~2-3 weeks with verification gaps
