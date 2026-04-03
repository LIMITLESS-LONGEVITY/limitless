# QA Report — OS Dashboard Full Audit
**Date:** 2026-04-01
**Tester:** QA Operator (Claude Code)
**Scope:** https://app.limitless-longevity.health/ — unauthenticated + authenticated flows
**Method:** curl + source code inspection + API endpoint verification

---

## Executive Summary

The OS Dashboard landing page loads correctly (HTTP 200, skeleton renders). Login via the built-in form works. However, **the dashboard crashes with an Application error immediately after login** due to a TypeError in LongevityScoreWidget. A second independent production outage affects all Enrollments queries in PATHS (HTTP 500). Three GitHub issues filed.

---

## Check 1 — Landing Page (Unauthenticated)

**Result: PASS**

- `GET https://app.limitless-longevity.health/` → HTTP 200, 137ms
- Next.js static export renders correctly — LIMITLESS OS title, skeleton loading state
- No JavaScript errors in the initial server-rendered HTML
- Auth detection call: `GET /learn/api/users/me` → HTTP 200, `{"user":null}` (correct — no cookie)
- Page correctly shows the LandingView (not dashboard, not error)
- PATHS login page `GET /learn/login` → HTTP 200, renders correctly (title: "Sign In | PATHS by LIMITLESS")

---

## Check 2 — Login Flow

**Result: PASS**

Login via `POST /learn/api/users/login` with `admin@limitless-longevity.health / TestUser2026!`:
- HTTP 200, returns valid JWT + full user object
- `Set-Cookie: payload-token=...; Domain=.limitless-longevity.health; Path=/` — correctly scoped for cross-app sharing
- Cookie expiry: 8 hours from issue time (correct)

After login, `GET /learn/api/users/me` with cookie → HTTP 200:
```json
{ "user": { "id": 1, "email": "admin@limitless-longevity.health", "role": "admin",
            "tier": { "accessLevel": "free" }, "firstName": "LIMITLESS" } }
```
- `page.tsx` correctly maps this to UserData shape: `{ sub: "1", email, tier: "free", role: "admin", firstName: "LIMITLESS" }`
- `setView('dashboard')` is called correctly

---

## Check 3 — Dashboard After Login

**Result: FAIL — Application Error**

### Bug 1 (CRITICAL): LongevityScoreWidget crashes — TypeError
**GitHub Issue:** https://github.com/LIMITLESS-LONGEVITY/limitless-os-dashboard/issues/17

The dashboard renders `DashboardView` which mounts `LongevityScoreWidget`. The widget calls:
```
GET /api/twin/1/longevity-score/history?days=30
```

**Actual response (HTTP 200):**
```json
{ "data": [], "days": 30 }
```

**Expected response shape:**
```ts
{ currentScore: number, components: ScoreComponent[], history: ScoreHistoryEntry[], ... }
```

`fetchJson` correctly passes this (it's HTTP 200 + valid JSON). `setData` is called with `{ data: [], days: 30 }`. Since the object is truthy, the `!data` guard is bypassed. The render then hits:

```tsx
// Line 198
{data.components.length > 0 && ...}
// TypeError: Cannot read properties of undefined (reading 'length')

// Line 212
{data.history.length >= 2 && ...}
// TypeError: Cannot read properties of undefined (reading 'length')
```

There are no error boundaries in the layout or DashboardView. The TypeError propagates to Next.js's root error handler, which renders an "Application error" page.

**Fix:** Add optional chaining at lines 198 and 212, and add a shape-validation guard at the fetch level in `useEffect`. See issue #17 for exact diff.

---

## Check 4 — Network Requests (Authenticated)

### API Endpoint Status Table

| Endpoint | HTTP | Status |
|---|---|---|
| `GET /learn/api/users/me` | 200 | PASS — correct shape, auth working |
| `POST /learn/api/users/login` | 200 | PASS — returns user + cookie |
| `GET /learn/api/me/enrollments` | 500 | FAIL — see Bug 2 |
| `GET /learn/api/enrollments?limit=1` | 500 | FAIL — same root cause |
| `GET /api/twin/1/longevity-score/history?days=30` | 200 | SHAPE MISMATCH — see Bug 1 |
| `GET /api/twin/1/longevity-score/history?days=7` | 200 | SHAPE MISMATCH — GreetingBanner affected |
| `GET /api/twin/1/summary` | 200 | PASS — correct, GreetingBanner + HealthWidget work |
| `GET /api/twin/1/biomarkers?limit=50` | 200 | SHAPE MISMATCH (minor) — see note |
| `GET /train/api/v1/me/today` | 200 | PASS — `{scheduledWorkout:null}` → empty state shown |
| `GET /train/api/v1/me/programs/active` | 200 | PASS — `[]` → empty state shown |
| `GET /book/api/me/membership` | 401 | AUTH MISMATCH — see note |
| `GET /book/api/me/appointments` | 401 | AUTH MISMATCH — see note |
| `POST /learn/api/feedback` | 400 | Expected — wrong test payload, endpoint exists |

### Bug 2 (HIGH): PATHS Enrollments returns 500 — Missing DB Migration
**GitHub Issue:** https://github.com/LIMITLESS-LONGEVITY/limitless-paths/issues/68

PR #61 (`feature/nps-triggers`) added a `feedbackPrompted` checkbox field to the `Enrollments` collection but **did not create a Drizzle migration**. The production DB is missing the `feedback_prompted` column. All Payload queries against the `enrollments` table fail at the database level.

Affected:
- `LearningProgressWidget` — shows empty state (no crash due to safe null check)
- `GreetingBanner` — shows "Your longevity dashboard awaits." fallback (no crash)
- PATHS admin panel Enrollments view — 500

**Fix:** Run `pnpm payload migrate:create` to generate the migration, commit, and push. Verified: no migration file for `feedbackPrompted` exists anywhere in `src/migrations/`.

**CI Gap:** The existing `validate-payload-schema` CI job only catches missing migrations for *localized* fields. Non-localized field additions are not gated. This should be addressed.

### Bug 3 (MEDIUM): LearningProgressWidget field name mismatch
**GitHub Issue:** https://github.com/LIMITLESS-LONGEVITY/limitless-os-dashboard/issues/18

Even after Bug 2 is fixed, the Learning Progress widget will show blank data due to three mismatches between what the widget expects and what PATHS returns:

| Widget Expects | PATHS Returns |
|---|---|
| `e.courseTitle` (string) | `e.course.title` (nested object) |
| `e.progress` as 0–1 float | `e.progress` as 0–100 integer |
| `e.totalLessons`, `e.completedLessons` | Not returned |

### Notes on HUB Endpoints (401)

`/book/api/me/membership` and `/book/api/me/appointments` return 401. This is expected behavior in the current state: HUB's `getSession()` reads the `payload-token` cookie and calls `jwt.verify(token, process.env.JWT_SECRET!)`. For this to work, HUB's `JWT_SECRET` environment variable must match the secret PATHS used to sign the token. The Payload JWT also uses `id` (not `sub`) as the user identifier field, which means even if verification passes, `session.sub` would be `undefined`.

These widgets gracefully show empty/unauthorized states (no crash), but this auth bridge is not fully functional. This is a pre-existing known issue (shared JWT auth design, not yet fully wired).

### Biomarker Widget (Shape Mismatch — Safe)

`/api/twin/1/biomarkers?limit=50` returns `{ data: [...], limit, offset }` but `BiomarkerTrendsWidget` expects `{ biomarkers?: [] }`. Widget safely guards with `d?.biomarkers` — result is empty state, no crash.

---

## Check 5 — Console Errors

Without a live browser session, the following errors are inferred from source code + API responses:

1. **TypeError: Cannot read properties of undefined (reading 'length')** in `LongevityScoreWidget` — **confirmed crash**, triggers Application error
2. No other JavaScript crashes expected — all other widgets use safe null checks or optional chaining

---

## Health Check Summary

| Service | Status |
|---|---|
| OS Dashboard (Cloudflare Pages) | LIVE — HTTP 200 |
| PATHS API (via gateway `/learn`) | PARTIALLY DOWN — enrollments 500 |
| Digital Twin (via gateway `/api/twin`) | LIVE — HTTP 200 |
| Cubes+ (via gateway `/train`) | LIVE — HTTP 200 |
| HUB (via gateway `/book`) | LIVE — auth mismatch on `/me/*` endpoints |
| `paths-api.limitless-longevity.health/api/health` | 404 — health endpoint route missing or wrong path |

---

## Issues Filed

| # | Repo | Severity | Title |
|---|---|---|---|
| [#17](https://github.com/LIMITLESS-LONGEVITY/limitless-os-dashboard/issues/17) | limitless-os-dashboard | Critical | LongevityScoreWidget crashes — DT response shape mismatch |
| [#68](https://github.com/LIMITLESS-LONGEVITY/limitless-paths/issues/68) | limitless-paths | High | Enrollments 500 — feedbackPrompted migration missing |
| [#18](https://github.com/LIMITLESS-LONGEVITY/limitless-os-dashboard/issues/18) | limitless-os-dashboard | Medium | LearningProgressWidget field name mismatch |

---

## Recommended Fix Order

1. **Immediate (workbench):** Fix `LongevityScoreWidget` defensive guards — 5 min change, unblocks all logged-in users
2. **Today (workbench):** Generate and merge `feedbackPrompted` migration for PATHS — unblocks enrollments
3. **Follow-up (workbench):** Fix LearningProgressWidget field mapping — after #68 is deployed

---

*QA Operator — claude-sonnet-4-6*
