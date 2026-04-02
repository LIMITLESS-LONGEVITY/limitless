# Service Separation Migration Plan

**Date:** 2026-03-28
**Depends on:** `docs/superpowers/specs/2026-03-28-service-separation-design.md`
**Goal:** Remove booking, health profiles, and billing from PATHS. Each phase is independently deployable.

---

## Migration Order

### Phase 1: Delete booking pages/endpoints from PATHS (Low risk, no data)
**Why first:** These are simple form pages with no DB persistence. HUB already has richer versions with Stripe and database. Pure deletion — nothing to migrate.

**Tasks:**
1. Delete frontend routes: `/stays`, `/telemedicine`, `/diagnostics`, `/contact-sales`
2. Delete endpoint files: `/stay-booking`, `/telemedicine-booking`, `/diagnostic-booking`, `/contact-sales`
3. Remove endpoint registrations from `payload.config.ts`
4. Remove any navigation links to these pages (Header global, internal links)
5. Update sitemap config if these pages were included
6. Run `pnpm build` to verify no broken imports
7. Deploy PATHS

**Verification:**
- `pnpm build` passes
- No 404s on remaining PATHS routes
- HUB `/book/stays`, `/book/diagnostics`, `/book/telemedicine`, `/book/contact-sales` serve correctly via gateway
- AI tutor doesn't reference deleted booking pages

**Estimated effort:** Small (1-2 hours)

---

### Phase 2: Delete billing from PATHS (Low risk, HUB is authority)
**Why second:** HUB already handles all Stripe billing. PATHS billing endpoints are dead weight. But we must keep MembershipTiers (content gating) and the tier-sync internal endpoint.

**Prerequisite:** Verify HUB's `/api/billing/webhook` is processing Stripe events and calling PATHS tier-sync.

**Tasks:**
1. Verify HUB Stripe webhook is live and processing subscription events
2. Verify HUB calls PATHS `/api/internal/tier-sync` on subscription changes
3. Delete PATHS collections: `Subscriptions`, `StripeEvents`
4. Delete PATHS endpoints: `/stripe/webhooks`, `/billing/checkout`, `/billing/portal`
5. Keep: `MembershipTiers` collection (read-only), `/billing/tier-sync` endpoint
6. Create migration to drop `subscriptions` and `stripe_events` tables
7. Remove Stripe SDK dependency from PATHS (if no longer used)
8. Update PATHS frontend: `/account/billing` should redirect to HUB dashboard `/book/dashboard/membership`
9. Run `pnpm build` + tests

**Verification:**
- New user subscribes via HUB → tier reflected in PATHS JWT
- Existing subscribers unaffected (HUB reads from its own DB)
- PATHS content gating still works (MembershipTiers still exists)
- `/account/billing` redirects to HUB

**Estimated effort:** Medium (3-5 hours)

---

### Phase 3: Migrate HealthProfiles to Digital Twin (Medium risk, data migration)
**Why third:** This is the most complex migration — real user data needs to move. DT already has the schema and API. Three sub-phases for safety.

#### Phase 3A: Dual-write
**Tasks:**
1. Add DT service key to PATHS env vars
2. Create PATHS utility: `syncHealthProfileToDT(userId, profileData)`
3. Add `afterChange` hook to HealthProfiles collection → calls DT `PATCH /api/twin/:userId/profile`
4. Backfill: one-time script to sync all existing HealthProfiles to DT
5. Deploy PATHS, monitor for DT write errors (graceful — log, don't fail)

**Verification:**
- Edit health profile in PATHS → data appears in DT
- DT has all existing profiles after backfill
- PATHS still works normally (DT write failure doesn't break anything)

#### Phase 3B: Read from DT
**Tasks:**
1. Update PATHS AI middleware: `getHealthProfile()` calls DT `/api/twin/:userId/ai-context` instead of local Payload query
2. Update `/account/health` page: fetch from DT API instead of local HealthProfiles
3. Update ActionPlan/DailyProtocol generation: read health data from DT
4. Keep HealthProfiles collection temporarily (fallback)
5. Deploy, monitor AI endpoint quality

**Verification:**
- AI tutor gives health-aware responses using DT data
- `/account/health` displays correctly
- ActionPlans generate with DT health data
- Performance acceptable (DT API latency)

#### Phase 3C: Remove HealthProfiles from PATHS
**Tasks:**
1. Remove HealthProfiles collection from Payload config
2. Create migration to drop `health_profiles` table
3. Remove `afterChange` dual-write hook
4. Remove DT sync utility
5. Clean up any remaining references
6. Deploy

**Verification:**
- `pnpm build` passes
- All AI features still work (reading from DT)
- No references to deleted collection

**Estimated effort:** Large (1-2 weeks across sub-phases, with verification gaps)

---

### Phase 4: Clean up Course stay fields (Low risk, schema change)
**Why last:** Depends on Phase 1 (booking pages gone) and Phase 3 (health data in DT). This is a schema cleanup.

**Tasks:**
1. Add `hubStayPackageId` field to Courses collection (text, optional)
2. Create migration to add column
3. Map existing stay-enabled courses to HUB StayPackage IDs
4. Remove fields: `stayType`, `stayLocation`, `stayPrice`, `stayMemberPrice`, `stayIncludes`, `followUpMonths`
5. Replace `Enrollments.stayStartDate`/`stayEndDate` with `hubStayBookingId` reference
6. Create migration for field removal
7. Update any frontend code that reads these fields → call HUB API instead
8. Deploy

**Verification:**
- Stay-enabled courses display correctly (reading package info from HUB)
- Enrollments link to HUB stay bookings
- `pnpm build` passes

**Estimated effort:** Medium (3-5 hours)

---

## Summary

| Phase | What | Risk | Effort | Dependencies |
|-------|------|------|--------|-------------|
| 1 | Delete booking pages/endpoints | Low | Small | None |
| 2 | Delete billing (keep tier-sync) | Low | Medium | HUB billing live |
| 3A | Dual-write health profiles to DT | Low | Small | DT deployed |
| 3B | Read health from DT | Medium | Medium | 3A verified |
| 3C | Remove HealthProfiles from PATHS | Low | Small | 3B verified |
| 4 | Clean up Course stay fields | Low | Medium | Phases 1, 3 |

**Total estimated timeline:** 3-4 weeks (with verification gaps between Phase 3 sub-phases)

---

## Rollback Strategy

Each phase is independently reversible:
- **Phase 1:** Re-add deleted files from git history
- **Phase 2:** Re-add collections + endpoints, re-point Stripe webhook
- **Phase 3A:** Remove dual-write hook (PATHS still has local data)
- **Phase 3B:** Revert AI middleware to read local HealthProfiles
- **Phase 3C:** Restore collection from git + restore table from backup
- **Phase 4:** Restore fields from git + run reverse migration
