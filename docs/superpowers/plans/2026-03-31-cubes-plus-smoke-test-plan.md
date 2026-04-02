# Cubes+ v2 Smoke Test Plan

**Date:** 2026-03-31
**Purpose:** Validate the full Cubes+ v2 stack end-to-end after the UI rebuild
**Environment:** Production — `app.limitless-longevity.health/train`
**Test account:** admin@limitless-longevity.health / TestUser2026!

---

## Test Categories

### A. Authentication Flow

| # | Scenario | Steps | Expected | Method |
|---|---|---|---|---|
| A1 | Login via PATHS SSO | Navigate to `/train/builder`, should redirect to PATHS login | Redirect to `/learn/login?redirect=/train` | Browser |
| A2 | Authenticated access | Log in at PATHS, navigate to `/train/builder` | Builder page loads, header shows user name + avatar | Browser |
| A3 | API auth (cookie) | `curl -b cookies.txt /train/api/v1/me` | Returns user profile with id, email, role, memberships | curl |
| A4 | API auth (no cookie) | `curl /train/api/v1/me` (no cookie) | Returns 401 Unauthorized | curl |
| A5 | Logout | Click logout in header dropdown | Redirects to `/`, cookie cleared | Browser |
| A6 | User sync on first login | Log in with a new PATHS account | User created in Cubes+ DB with correct externalUserId | curl + DB |

### B. Builder Core

| # | Scenario | Steps | Expected | Method |
|---|---|---|---|---|
| B1 | Builder loads | Navigate to `/train/builder` | 3-panel layout: library, canvas, properties. Empty canvas state visible. | Browser |
| B2 | Library exercises load | Click "Exercises" tab in library panel | Fetches from `/api/v1/exercises`, shows exercise cards | Browser |
| B3 | Library search | Type "precision" in library search | Filters exercises by name | Browser |
| B4 | Drag exercise to canvas | Drag an exercise card from library to canvas | Exercise appears as Tetris block with correct height (duration-proportional) | Browser |
| B5 | Tetris block height | Add exercises with different durations | Short exercises = short blocks, long exercises = tall blocks. Min 32px, max 120px. | Browser |
| B6 | Phase colors | Add exercises to different phases | Warm-up = amber, Main = rose, Cooldown = cyan | Browser |
| B7 | Reorder items | Drag a canvas item to a new position | Items reorder, positions update | Browser |
| B8 | Remove item | Click X on a canvas item | Item removed, duration recalculated | Browser |
| B9 | Properties panel | Click a canvas item | Properties panel shows: override duration, sets, reps, rest, notes | Browser |
| B10 | Edit properties | Change sets to 3, reps to "8-12" | Item updates, total duration recalculates | Browser |
| B11 | Undo/Redo | Add item, undo, redo | Canvas state reverts and re-applies | Browser |
| B12 | Save session | Click Save, fill name + domains, submit | Session created via API, canvas marked clean | Browser |
| B13 | Program mode | Drag a session from library to canvas | Mode switches to "Program Builder", session block appears | Browser |
| B14 | Template loading | Click template tab, click load button | Session's exercises populate the canvas with fresh IDs | Browser |

### C. Library Pages

| # | Scenario | Steps | Expected | Method |
|---|---|---|---|---|
| C1 | Exercise library | Navigate to `/train/library/exercises` | Media-prominent cards with hero images, creator, domains, stats | Browser |
| C2 | Session library | Navigate to `/train/library/sessions` | Session cards with exercise count + duration | Browser |
| C3 | Program library | Navigate to `/train/library/programs` | Program cards with session count + duration | Browser |
| C4 | Library search | Search for "vault" in exercise library | Filters results | Browser |
| C5 | Domain filter | Click a domain pill filter | Shows only exercises in that domain | Browser |
| C6 | Difficulty filter | Filter by "Advanced" | Shows only advanced exercises | Browser |
| C7 | Sort options | Sort by "Most Liked" | Reorders results | Browser |
| C8 | Community tab | Navigate to `/train/library/community` | Shows community-visibility content from all orgs | Browser |
| C9 | Library index | Navigate to `/train/library` | Shows overview with entity counts + quick actions | Browser |

### D. Exercise CRUD

| # | Scenario | Steps | Expected | Method |
|---|---|---|---|---|
| D1 | Create exercise | Navigate to `/train/library/exercises/new`, fill form, submit | Exercise created, redirect to detail page | Browser |
| D2 | Required fields | Submit form without name | Validation error shown | Browser |
| D3 | Duration input | Enter 5 min 30 sec | Duration saved as 330 seconds | curl verify |
| D4 | Domain selection | Select "Parkour" + "Movement" | Exercise linked to both domains | curl verify |
| D5 | Visibility setting | Set to "Organization" | Exercise visible to org members only | curl verify |
| D6 | Exercise detail | Navigate to `/train/library/exercises/:id` | Hero area, full description, stats, actions, reviews | Browser |
| D7 | Like exercise | Click Like button on detail page | Like count increments, button shows liked state | Browser |
| D8 | Fork exercise | Click Fork on a community exercise | New draft exercise created in user's library with "(fork)" suffix | Browser |
| D9 | Edit exercise | Click Edit on own exercise, change name, save | Exercise updated | Browser |
| D10 | Delete exercise | Delete a draft exercise (not used in sessions) | Exercise soft-deleted, gone from library | Browser |
| D11 | Delete guard | Try to delete exercise used in a session | 409 error: "Cannot delete: used in N sessions" | curl |
| D12 | Role check — Junior | Log in as junior_coach, try to create exercise | 403: "Junior coaches cannot create exercises" | curl |

### E. Session & Program CRUD

| # | Scenario | Steps | Expected | Method |
|---|---|---|---|---|
| E1 | Session detail | Navigate to session detail page | Hero, Tetris read-only composition viz, reviews, "used in" programs | Browser |
| E2 | Session fork | Fork a community session | Deep copy with all exercises + positions + phases | curl verify |
| E3 | Program detail | Navigate to program detail page | Session list with mini Tetris blocks, stats, reviews | Browser |
| E4 | Program fork | Fork a community program | Deep copy with all session references + day labels | curl verify |
| E5 | Delete guard — session | Try to delete session used in program | 409 error: "Cannot delete: used in N programs" | curl |

### F. Social Features

| # | Scenario | Steps | Expected | Method |
|---|---|---|---|---|
| F1 | Like toggle | Like, then unlike an exercise | Count goes up then down, toggle state correct | Browser |
| F2 | Rate content | Rate an exercise 4 stars with review text | Rating created, average updates | curl |
| F3 | Creator response | Creator responds to a review | Response appears under the review | curl |
| F4 | Fork attribution | Fork an exercise, view fork | "Forked from [original] by [creator]" shown | Browser |
| F5 | Fork notification | Fork someone's exercise | Original creator gets fork_received notification | curl verify |
| F6 | Assignment | Assign a session to another coach | Assignment created, assignee gets notification | curl |
| F7 | Notifications page | Navigate to `/train/notifications` | Shows notifications grouped by time, unread indicators | Browser |
| F8 | Mark read | Click "Mark all read" | All notifications marked as read | Browser |

### G. Organization & Admin

| # | Scenario | Steps | Expected | Method |
|---|---|---|---|---|
| G1 | Admin overview | Navigate to `/train/admin` | Org stats, member count, content counts | Browser |
| G2 | Members page | Navigate to `/train/admin/members` | List of org members with roles, owner/admin badges | Browser |
| G3 | Invite coach | Send invitation to an email | Invitation created with 7-day expiry token | Browser |
| G4 | Invitations page | Navigate to `/train/admin/invitations` | Pending invitations list with status | Browser |
| G5 | Org settings | Change org name, save | Updated via API | Browser |
| G6 | Permission check | Non-admin navigates to admin pages | "Admin access required" message | Browser |

### H. Billing

| # | Scenario | Steps | Expected | Method |
|---|---|---|---|---|
| H1 | Billing page | Navigate to `/train/admin/billing` | Current plan badge, usage bars, upgrade CTAs | Browser |
| H2 | Usage display | Check exercise/program/coach counts | Match actual DB counts | curl verify |
| H3 | Upgrade flow | Click "Upgrade to Pro" | Redirects to Stripe Checkout | Browser |
| H4 | Stripe Checkout | Complete test payment | Webhook fires, org plan updated to Pro | Stripe test card |
| H5 | Plan limit — free | On free plan, create 51st exercise | 403: "You've reached the exercise limit (50/50)" | curl |
| H6 | Customer portal | Click "Manage Billing" on paid plan | Redirects to Stripe portal | Browser |

### I. Clients

| # | Scenario | Steps | Expected | Method |
|---|---|---|---|---|
| I1 | Clients page | Navigate to `/train/clients` | Client list (empty if no clients) | Browser |
| I2 | Add client | Fill email + name, submit | Client created in DB | Browser |
| I3 | Duplicate check | Add same email again | 409: "Client with this email already exists" | Browser |
| I4 | Client health context | `GET /api/v1/clients/:id/health-context` | Returns DT health data + training implications (or graceful fallback) | curl |

### J. Gateway & Infrastructure

| # | Scenario | Steps | Expected | Method |
|---|---|---|---|---|
| J1 | Gateway routing | `curl app.limitless-longevity.health/train/builder` | 200 OK | curl |
| J2 | API through gateway | `curl -H "Cookie: ..." app.limitless-longevity.health/train/api/v1/me` | User profile JSON | curl |
| J3 | Legacy redirect | `curl -I cubes.elixyr.life` | 301 redirect to `/train` on gateway | curl |
| J4 | Direct Render access | `curl limitless-cubes.onrender.com/train/api/v1/domains` | 401 (auth working on direct access too) | curl |
| J5 | Seeded data | `GET /api/v1/domains` with auth | Returns 8 domains (Parkour, Movement, Strength, etc.) | curl |
| J6 | Seeded phases | `GET /api/v1/phases` with auth | Returns 3 phases (Warm-Up, Main, Cooldown) | curl |
| J7 | Seeded difficulty | `GET /api/v1/difficulty-levels` with auth | Returns 4 levels (Beginner through Elite) | curl |

### K. Landing & Navigation

| # | Scenario | Steps | Expected | Method |
|---|---|---|---|---|
| K1 | Landing page (logged out) | Navigate to `/train` without auth | CUBES+ branding, feature highlights, Log In + Get Started buttons | Browser |
| K2 | Home page (logged in) | Navigate to `/train` with auth | Dashboard with stats + "Open Builder" CTA | Browser |
| K3 | Header nav | Click Builder / Library / Clients / Admin links | Each navigates to correct page | Browser |
| K4 | Active nav state | While on `/train/builder` | "Builder" nav link highlighted in rose | Browser |
| K5 | Mobile header | Resize to < 768px | Hamburger menu, nav links in mobile drawer | Browser |
| K6 | 404 page | Navigate to `/train/nonexistent` | Warm Athletic styled 404 with "Back to Builder" link | Browser |

---

## Execution Strategy

**Phase 1: API smoke tests (curl)** — Main instance can execute these now
- All J tests (gateway + seeded data) — already verified ✅
- All A tests (auth) — A3 and A4 already verified ✅
- D11, D12, E5 (delete guards + role checks)
- F2, F3, F6 (ratings, assignments)
- H5 (plan limits)

**Phase 2: Browser smoke tests** — Requires manual browser testing or QA Operator
- All B tests (builder)
- All C tests (library pages)
- All D tests except D11/D12 (exercise CRUD via UI)
- All G tests (admin)
- All K tests (navigation)

**Phase 3: Stripe integration test** — H3, H4, H6 (requires Stripe test card)

---

## Test Data Needed

The seeded data (org, 2 users, 8 domains, 3 phases, 4 difficulty levels) is sufficient for most tests. For library browsing tests, we need:
- At least 5 exercises (mix of durations, difficulties, domains)
- At least 2 sessions (with different exercise compositions)
- At least 1 program

These can be created as part of the D1/E tests, or seeded in advance.
