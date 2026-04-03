# LIMITLESS Longevity OS — Full Platform Smoke Test Report

**Date:** 2026-04-01
**Tester:** QA Operator (Claude Sonnet 4.6)
**Auth used:** admin@limitless-longevity.health / TestUser2026! (PATHS User ID 1, role: admin)
**Scope:** Comprehensive smoke test — all services, all major API endpoints, cross-service integration

---

## Summary

| Service | Status | Critical Issues |
|---|---|---|
| Corporate Website | WARN | privacy.html + terms.html returning 404 (CDN cache lag) |
| OS Dashboard | PASS | Loads correctly, skeleton shows while loading widgets |
| PATHS | PASS | All endpoints healthy, login/logout/auth working |
| HUB | PASS | Landing page loads, health endpoint responds |
| Digital Twin | WARN | Auth 401 on all user endpoints (JWT_SECRET mismatch suspected) |
| Cubes+ API | PASS (18/20) | 2 routes missing: me/today, me/programs/active |
| Cubes+ Pages | PASS | All 15 page routes return HTTP 200 |
| Cross-service Auth | PASS | Cookie scoped to .limitless-longevity.health confirmed |

**Total issues found:** 5
**Critical (P0):** 0
**High (P1):** 2
**Medium (P2):** 2
**Low (P3):** 1

---

## 1. Corporate Website — https://limitless-longevity.health

### 1.1 Homepage
- **PASS** — HTTP 200, served via Cloudflare
- **PASS** — Viewport meta tag present: `content="width=device-width, initial-scale=1.0"`
- **PASS** — All navigation links are anchor links (#hero, #about, #longevity, #services, #approach, #founders, #team, #contact) — all point to sections present in the HTML
- **PASS** — CNAME file contains `limitless-longevity.health` — GitHub Pages custom domain intact

### Sections confirmed present:
- Hero (`#hero`) — "The Future of Longevity, Engineered for Your Business"
- About (`#about`)
- Longevity (`#longevity`) — "The Longevity Opportunity"
- Services (`#services`) — 5 service cards
- Approach (`#approach`)
- Founders (`#founders`) — Iris Arbel, Dr. Marina Lysenko, Amit James Gelblum
- Team (`#team`) — Dr. Uchitel Natalia, Ken Mitelman
- Contact (`#contact`)

### Navigation links:
- All anchor links: PASS (all IDs exist in page)
- LinkedIn links: 3 founder links, all use `target="_blank" rel="noopener noreferrer"` — PASS
- Email links: Cloudflare email obfuscation (`/cdn-cgi/l/email-protection`) — expected, not broken

### 1.2 Privacy Page — https://limitless-longevity.health/privacy.html
- **FAIL (P1)** — HTTP 404 via Cloudflare / GitHub Pages CDN
- **Root cause:** File was added as a NEW file in commit `0679ca4` (2026-03-31). GitHub Pages Fastly CDN has a stale 404 cached (`x-origin-cache: HIT`). The file IS correctly committed and on GitHub (`raw.githubusercontent.com` returns HTTP 200).
- **Content verified on GitHub:** Contains "Coach Professional Data", "Marketplace & Transaction Data", "Community Library & Marketplace" sections — Cubes+ sections are present and correct.
- **Action required:** Wait for GitHub Pages CDN to invalidate (typically 10–60 minutes). No code fix needed. If still 404 after 2 hours, touch the file with a blank commit to force re-deploy.

### 1.3 Terms Page — https://limitless-longevity.health/terms.html
- **FAIL (P1)** — HTTP 404 via Cloudflare / GitHub Pages CDN
- **Root cause:** Same as privacy.html — newly added file, CDN cache lag.
- **Content verified on GitHub:** Contains "10. Content Moderation (Cubes+)" section, "Cubes+ Subscriptions & Marketplace" section, coach content IP provisions — all present and correct.
- **Action required:** Same as privacy.html.

---

## 2. OS Dashboard — https://app.limitless-longevity.health

### 2.1 Landing page (unauthenticated)
- **PASS** — HTTP 200
- **PASS** — Page title: "LIMITLESS OS"
- **PASS** — Meta description: "The Longevity Operating System — your unified health, learning, and wellness dashboard."
- **PASS** — Shows skeleton loading state (animated pulse placeholders for widgets) for unauthenticated users — this is the expected SSR behavior before client-side hydration checks auth

### 2.2 Widget rendering (browser-side, inferred from source)
- **GreetingBanner** — fetches `/api/twin/{userId}/longevity-score/history?days=7` — will show "unauthorized" gracefully (DT auth issue, see section 5)
- **LongevityScoreWidget** — fetches `/api/twin/{userId}/longevity-score/history?days=30` — same DT auth issue
- **CoachActivityWidget** — fetches `/train/api/v1/me/coach/activity` — PASS (endpoint returns 200 with cookie auth)
- **TodaysWorkoutWidget** — fetches `/train/api/v1/me/today` — **FAIL** (route returns 404, see Cubes+ issue #1)
- **ActiveProgramsWidget** — fetches `/train/api/v1/me/programs/active` — **FAIL** (route returns 404, see Cubes+ issue #2)
- **CubesAppCard** — fetches `/train/api/v1/me/summary` — PASS (returns `{"exercises":2,"sessions":1,"programs":0,...}`)

### 2.3 Navigation header
- Not testable via curl (client-side rendered)
- All gateway routes confirmed reachable: /learn (200), /book (200), /train (200)

---

## 3. PATHS — https://app.limitless-longevity.health/learn

### 3.1 Page loads
- **PASS** — Homepage: HTTP 200
- **PASS** — Login page (`/learn/login`): HTTP 200
- **PASS** — Course listing (`/learn/courses`): HTTP 200
- **PASS** — Article listing (`/learn/articles`): HTTP 200
- **PASS** — Admin panel (`/learn/admin`): HTTP 200 (Payload CMS admin UI)
- **WARN** — Account page (`/learn/account`): HTTP 307 redirect → `/learn/login` (unauthenticated redirect is correct behavior)

### 3.2 API endpoints

| Endpoint | Status | Result |
|---|---|---|
| GET /learn/api/health | 200 | `{"status":"ok"}` |
| POST /learn/api/users/login | 200 | Full user object returned, JWT token issued |
| GET /learn/api/users/me (with JWT) | 200 | email=admin@limitless-longevity.health, role=admin |
| GET /learn/api/courses?limit=1 | 200 | totalDocs=3 |
| GET /learn/api/articles?limit=1 | 200 | totalDocs=16 |
| POST /learn/api/users/logout | 200 | `{"message":"Logout successful."}` |

### 3.3 Auth cookie
- **PASS** — Login sets `payload-token` cookie with:
  - `Domain=.limitless-longevity.health` (correct — scoped for cross-service)
  - `Path=/`
  - `Secure=true`
  - `HttpOnly=true`
  - `SameSite=Lax`
- **PASS** — Token expiry: 8 hours from login (correct)

### 3.4 User data
- Admin user: ID=1, email=admin@limitless-longevity.health, role=admin, tier=Free
- Current streak: 2, Longest streak: 2
- hasCompletedOnboarding: false (note: may want to trigger onboarding flow)

---

## 4. HUB — https://app.limitless-longevity.health/book

### 4.1 Page loads
- **PASS** — Landing page (`/book`): HTTP 200, title "HUB | LIMITLESS Longevity"
- **NOTE** — HUB direct Render URL (`limitless-hub.onrender.com`) returns 404 on `/api/health` because HUB uses Next.js `basePath: "/book"` — this is expected and correct

### 4.2 API endpoints

| Endpoint | Status | Result |
|---|---|---|
| GET /book/api/health | 200 | `{"status":"ok","service":"limitless-hub"}` |

### 4.3 HUB login/auth
- `/book/login` returns 404 — HUB may use a different auth route or rely on shared PATHS cookie
- Gateway correctly proxies `/book/*` to `limitless-hub.onrender.com`

---

## 5. Digital Twin — https://app.limitless-longevity.health/api/twin

### 5.1 Health check
- **PASS** — `https://limitless-digital-twin.onrender.com/api/health` → HTTP 200 `{"status":"ok","service":"digital-twin"}`

### 5.2 Authenticated endpoints
- **FAIL (P2)** — `GET /api/twin/1/profile` → HTTP 401 `{"error":"Unauthorized"}`
- **FAIL (P2)** — `GET /api/twin/1/longevity-score/history` → HTTP 401 `{"error":"Unauthorized"}`

**Root cause analysis:**
DT auth plugin (`src/plugins/auth.ts`) uses `jwt.verify(token, process.env.JWT_SECRET)` to verify the PATHS `payload-token` cookie. This requires `JWT_SECRET` on DT to match `PAYLOAD_SECRET` on PATHS exactly. The 401 response (not 403) means JWT verification is failing — the secrets do not match, OR `JWT_SECRET` is not set on the DT Render service.

**Secondary issue:** Even if secrets matched, PATHS stores user ID as integer (`id: 1`) while DT's `assertAccess` compares `request.user.id !== userId` where `userId` is the URL string `"1"`. JavaScript strict equality `1 !== "1"` would return 403. This is a type mismatch bug.

**Impact:** OS Dashboard's `LongevityScoreWidget` and `GreetingBanner` will show empty/error states for all users. Longevity score tracking is non-functional in production.

**Action:** File GitHub Issue on `limitless-digital-twin` with label `agent:workbench`. Two fixes needed:
1. Verify `JWT_SECRET` env var on DT Render service matches `PAYLOAD_SECRET` on PATHS Render service
2. Fix type coercion in `assertAccess`: compare `String(request.user.id) !== userId`

### 5.3 Correct longevity-score URL
- The GET endpoint is `/api/twin/:userId/longevity-score/history?days=N` (not `/longevity-score` as tested initially)
- OS Dashboard correctly uses this URL — source verified

---

## 6. Cubes+ — https://app.limitless-longevity.health/train

### 6.1 Unauthenticated

| Check | Status | Result |
|---|---|---|
| GET /train (landing page) | PASS | HTTP 200, title "Cubes+ \| Training Routine Builder" |
| GET /train/api/v1/domains (unauth) | PASS | HTTP 401 `{"error":"Unauthorized"}` — correct JSON, not HTML |
| GET /train/api/v1/phases (unauth) | PASS | HTTP 401 `{"error":"Unauthorized"}` — correct JSON, not HTML |

### 6.2 Page routes (authenticated with payload-token cookie)

All pages return HTTP 200. Titles confirmed as "Cubes+ | Training Routine Builder".

| Route | HTTP | Title |
|---|---|---|
| /train | 200 | Cubes+ \| Training Routine Builder |
| /train/builder | 200 | Cubes+ \| Training Routine Builder |
| /train/library | 200 | Cubes+ \| Training Routine Builder |
| /train/library/exercises | 200 | Cubes+ \| Training Routine Builder |
| /train/library/sessions | 200 | Cubes+ \| Training Routine Builder |
| /train/library/programs | 200 | Cubes+ \| Training Routine Builder |
| /train/library/exercises/new | 200 | Cubes+ \| Training Routine Builder |
| /train/library/community | 200 | Cubes+ \| Training Routine Builder |
| /train/clients | 200 | Cubes+ \| Training Routine Builder |
| /train/notifications | 200 | Cubes+ \| Training Routine Builder |
| /train/admin | 200 | Cubes+ \| Training Routine Builder |
| /train/admin/members | 200 | Cubes+ \| Training Routine Builder |
| /train/admin/billing | 200 | Cubes+ \| Training Routine Builder |
| /train/admin/analytics | 200 | Cubes+ \| Training Routine Builder (Phase 4) |
| /train/marketplace | 200 | Cubes+ \| Training Routine Builder (Phase 4) |
| /train/marketplace/sell | 200 | Cubes+ \| Training Routine Builder (Phase 4) |

Note: The page titles are all generic "Cubes+ | Training Routine Builder" — per-page titles (e.g. "Builder", "Library") may be set client-side after hydration, which is normal for Next.js SPA routing.

### 6.3 API endpoints (authenticated via payload-token cookie)

| Endpoint | HTTP | Result |
|---|---|---|
| GET /train/api/v1/me | 200 | Full user profile, role + memberships |
| GET /train/api/v1/domains | 200 | Domain list (Cardio, etc.) |
| GET /train/api/v1/phases | 200 | Phases: Warm-Up, Main, Cooldown |
| GET /train/api/v1/exercises?limit=1 | 200 | 1 exercise returned ("Precision Jumps...") |
| GET /train/api/v1/sessions?limit=1 | 200 | 1 session returned ("Parkour Fundamentals — Day 1") |
| GET /train/api/v1/programs?limit=1 | 200 | 0 programs (empty, expected — no programs seeded) |
| GET /train/api/v1/organizations | 200 | LIMITLESS Longevity org returned |
| GET /train/api/v1/notifications | 200 | `{"data":[],"unreadCount":0}` |
| GET /train/api/v1/search?q=test | 200 | `{"exercises":[],"sessions":[],"programs":[],"total":0}` |
| GET /train/api/v1/me/summary | 200 | `{"exercises":2,"sessions":1,"programs":0,...}` |
| GET /train/api/v1/me/coach/activity | 200 | Coach stats + recent content |
| GET /train/api/v1/me/purchases | 200 | `{"data":[],"total":0}` |
| GET /train/api/v1/marketplace/listings?type=session | 200 | `{"data":[],"total":0}` |
| GET /train/api/v1/marketplace/connect | 200 | `{"connected":false}` |
| GET /train/api/v1/analytics/content | 200 | Totals, engagement, top content |
| GET /train/api/v1/analytics/clients | 200 | Client stats (0 active clients) |
| GET /train/api/v1/analytics/community | 200 | Fork/rating stats |
| GET /train/api/v1/analytics/revenue | 403 | `{"error":"Not a marketplace seller"}` — correct behavior |
| GET /train/api/v1/billing/status?organizationId=... | 200 | `{"currentPlan":"enterprise",...}` |

**Issues:**

**ISSUE #1 (P2): `GET /train/api/v1/me/today` — 404 Not Found (HTML response)**
The OS Dashboard's `TodaysWorkoutWidget` fetches this endpoint. The route does not exist in Cubes+ (`limitless-cubes/src/app/api/v1/me/` only has `route.ts`, `summary/route.ts`, `coach/activity/route.ts`). The widget will fail silently or show empty state.

**ISSUE #2 (P2): `GET /train/api/v1/me/programs/active` — 404 Not Found (HTML response)**
The OS Dashboard's `ActiveProgramsWidget` fetches this endpoint. The route does not exist. The `programs/` directory only has `[id]/` and `route.ts` (list all programs). The widget will fail silently or show empty state.

**Billing/status note:** The endpoint requires `organizationId` as a query parameter. Without it, returns 400 `{"error":"organizationId is required"}`. The OS Dashboard `CubesAppCard` calls `/train/api/v1/me/summary` (not billing/status), so this is not an OS Dashboard issue — but any code calling billing/status must include the orgId.

---

## 7. Cross-Service Integration

### 7.1 Auth cookie propagation
- **PASS** — PATHS login sets `payload-token` with `Domain=.limitless-longevity.health`
- **PASS** — Cubes+ correctly reads this cookie and delegates JWT validation to PATHS `/api/users/me` endpoint
- **PASS** — Cross-service auth: PATHS login → Cubes+ API authenticated successfully

### 7.2 Gateway routing
- **PASS** — `/learn` → PATHS (HTTP 200)
- **PASS** — `/book` → HUB (HTTP 200)
- **PASS** — `/train` → Cubes+ (HTTP 200)
- **PASS** — `/api/twin` → Digital Twin (health: HTTP 200)

### 7.3 Cookie → /book (HUB) cross-service
- Not fully testable via curl (HUB requires browser session), but cookie domain scoping is correct

---

## Issue Register

### P1 Issues (High)

**ISSUE-001: privacy.html returns 404 on production**
- URL: https://limitless-longevity.health/privacy.html
- HTTP: 404 (Cloudflare/GitHub Pages CDN cache lag)
- Root cause: New file added to git, GitHub Pages Fastly CDN serving stale 404
- File IS on GitHub (raw.githubusercontent.com returns 200) with correct Cubes+ content
- Resolution: Automatic — CDN should clear within 1 hour. Touch file if persists.
- Repo: LIMITLESS-LONGEVITY/limitless-website

**ISSUE-002: terms.html returns 404 on production**
- URL: https://limitless-longevity.health/terms.html
- HTTP: 404 (same cause as ISSUE-001)
- Resolution: Same as ISSUE-001

### P2 Issues (Medium)

**ISSUE-003: Digital Twin auth broken — all user endpoints return 401**
- Endpoints: `/api/twin/:userId/profile`, `/api/twin/:userId/longevity-score/history`, all user-scoped DT endpoints
- Root cause: `JWT_SECRET` env var on DT Render service does not match `PAYLOAD_SECRET` on PATHS (or is unset). Secondary bug: user ID type mismatch (integer vs string).
- Impact: LongevityScoreWidget and GreetingBanner on OS Dashboard show empty/error states. Longevity score feature non-functional in production.
- Fix needed (workbench):
  1. Verify/set `JWT_SECRET` on `limitless-digital-twin` Render service to match PATHS `PAYLOAD_SECRET`
  2. In `src/plugins/auth.ts`: cast decoded user ID to string (`id: String(decoded.id)`)
  3. In `src/routes/profile.ts` + other routes: ensure `assertAccess` comparison works with string IDs
- Repo: LIMITLESS-LONGEVITY/limitless-digital-twin

**ISSUE-004: Missing Cubes+ API routes for OS Dashboard widgets**
- Missing: `GET /train/api/v1/me/today` and `GET /train/api/v1/me/programs/active`
- Impact: `TodaysWorkoutWidget` and `ActiveProgramsWidget` on OS Dashboard will fail (404 response, HTML not JSON)
- These endpoints are referenced in OS Dashboard source (`TodaysWorkoutWidget.tsx:59`, `ActiveProgramsWidget.tsx:85`)
- Fix needed (workbench): Implement both routes in `limitless-cubes/src/app/api/v1/me/`
  - `today/route.ts` — return today's assigned session (or readiness-adjusted recommendation)
  - `programs/active/route.ts` — return active program assignments with progress
- Repo: LIMITLESS-LONGEVITY/limitless-cubes

### P3 Issues (Low)

**ISSUE-005: Admin user hasCompletedOnboarding: false**
- The admin account has `hasCompletedOnboarding: false` and `stripeCustomerId: null`
- This is a data issue, not a code issue — admin account was created without going through onboarding
- Impact: May trigger onboarding prompts for admin testing sessions
- Resolution: Update via PATHS admin panel or seed script — not urgent

---

## Services Confirmed Live

| Service | URL | Status | Last Verified |
|---|---|---|---|
| Corporate Website | https://limitless-longevity.health | LIVE | 2026-04-01 10:46 UTC |
| OS Dashboard | https://app.limitless-longevity.health | LIVE | 2026-04-01 10:46 UTC |
| PATHS API | https://app.limitless-longevity.health/learn | LIVE | 2026-04-01 10:46 UTC |
| HUB | https://app.limitless-longevity.health/book | LIVE | 2026-04-01 10:52 UTC |
| Digital Twin | https://limitless-digital-twin.onrender.com | LIVE | 2026-04-01 10:46 UTC |
| Cubes+ | https://app.limitless-longevity.health/train | LIVE | 2026-04-01 10:46 UTC |
| API Gateway | https://app.limitless-longevity.health | LIVE | 2026-04-01 10:52 UTC |

---

## Seeded Data State (Production DB)

As observed via API responses:

| Entity | Count |
|---|---|
| Exercises | 2 |
| Sessions | 1 ("Parkour Fundamentals — Day 1") |
| Programs | 0 |
| Organizations | 1 (LIMITLESS Longevity) |
| Users (PATHS) | ≥1 (admin) |
| Courses (PATHS) | 3 |
| Articles (PATHS) | 16 |

---

## Recommended Next Actions

1. **Monitor** ISSUE-001 and ISSUE-002 (privacy/terms CDN cache) — check again in 1 hour
2. **File GitHub Issue** for ISSUE-003 (DT auth) on limitless-digital-twin repo, label `agent:workbench`
3. **File GitHub Issue** for ISSUE-004 (missing me/today + me/programs/active) on limitless-cubes repo, label `agent:workbench`
4. **Pilot prep** — Seed real parkour exercise content for El Fuerte demo (2 exercises + 1 session is very thin)
5. **Browser smoke test** — This report was generated via curl/API testing. A full Playwright browser test would additionally verify: client-side rendering, JavaScript errors, form submissions, the builder UI interaction, login redirect flow end-to-end

---

*Report generated by QA Operator on 2026-04-01. No source code was modified during testing.*
