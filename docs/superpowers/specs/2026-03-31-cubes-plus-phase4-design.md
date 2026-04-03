# Cubes+ Phase 4 Design: Wearable Loop, Marketplace, Analytics

**Date:** 2026-03-31
**Status:** Draft
**Target:** Q1 2027
**Estimated effort:** ~21 dev-days
**Prerequisite:** Phases 1-3 complete (✅), UI rebuild landing (in progress)

---

## 1. What's Already Built

Phase 4 builds on substantial existing infrastructure:

| Component | Status | What Exists |
|---|---|---|
| DT client library | ✅ Built | `getHealthContext()`, `getWearableLatest()`, `getWearableStream()`, `logActivity()`, `deriveTrainingImplications()` |
| Session completion | ✅ Built | `POST /sessions/:id/complete` — fire-and-forget logging to DT activity log |
| Health context proxy | ✅ Built | `GET /clients/:id/health-context` — DT ai-context + training implications |
| Rating system | ✅ Built | `upsertRating()`, `getRatings()`, `addCreatorResponse()` for all entity types |
| Fork model | ✅ Built | `POST /:entity/:id/fork` with deep copy + attribution + notifications |
| Stripe billing | ✅ Built | Checkout, webhooks, portal, plan limits, 5 tiers configured with Stripe products/prices |
| Search | ✅ Built | `GET /search?q=` — federated across exercises/sessions/programs |
| Summary endpoints | ✅ Built | `GET /sessions/:id/summary`, `GET /programs/:id/summary` for PATHS/HUB embeds |
| Coach activity | ✅ Built | `GET /me/coach/activity`, `GET /me/summary` for OS Dashboard |

**What Phase 4 adds:** Timestamp tracking, wearable data visualization, readiness recommendations, Stripe Connect marketplace, coach analytics dashboard.

---

## 2. B2C Infrastructure (Pre-Track B)

Before the marketplace can serve both coaches and consumers, the data model needs these changes.

**Decisions locked (2026-04-01):**
- **D-38:** Add `athlete` role to `CoachRole` enum — consumers are first-class Users, not coach-managed Clients
- **D-39:** Default new users to `athlete` role (not `junior_coach`) — coach role assigned via upgrade flow or org invitation
- **D-40:** Bridge `Client` → `User` with optional FK — when a consumer self-registers and a coach already created a Client record for their email, link them
- **D-41:** Purchase-gated content access — marketplace content requires `MarketplacePurchase` record to access full content
- **D-42:** Add `GET /me/purchases` endpoint — consumer's personal library of purchased sessions/programs

### 2.1 Schema Changes

**CoachRole enum** — add `athlete`:
```prisma
enum CoachRole {
  head_coach
  senior_coach
  junior_coach
  athlete        // Consumer/client role — no builder/admin access
}
```

**User model** — change default role:
```prisma
role  CoachRole  @default(athlete)  // was: @default(junior_coach)
```

**Client model** — add User FK:
```prisma
model Client {
  // existing fields...
  userId  String?  @unique  @map("user_id")
  user    User?    @relation(fields: [userId], references: [id])
}
```

**User sync logic** (`syncUser.ts`) — on first login:
- If user's email matches an existing `Client.email` → link them, set role to `athlete`
- If user is invited to an org as a coach → set role to `junior_coach` (or whatever the invitation specifies)
- Otherwise → default `athlete`

### 2.2 Access Control Matrix

| Visibility | Who can see listing | Who can access full content |
|---|---|---|
| `private` | Creator only | Creator only |
| `organization` | Org members | Org members |
| `community` | All authenticated users | All authenticated users (free) |
| `marketplace` | All authenticated users (preview only) | Creator + users with `MarketplacePurchase` record |

**Preview vs. full content:** Marketplace listings show name, description, duration, difficulty, rating, exercise count. Full content (exercise details, video URLs, builder data) requires purchase.

### 2.3 Consumer UX Flow (Phase 5 scope, but schema supports it now)

```
Consumer signs up on PATHS → SSO cookie →
Cubes+ syncUser() → creates User with role=athlete →
Browse marketplace → Purchase program →
My Library shows purchased content →
Start program → Session execution → Exercise logs →
(Optional) Coach assigns additional programs
```

---

## 3. Shared Infrastructure

### 3.1 Session Timestamp Tracking

All three tracks need to know *when* a session was performed, not just *that* it was completed.

**Schema change:** Add to `ClientSessionProgress`:
```prisma
startedAt       DateTime?  @map("started_at") @db.Timestamptz
completedAt     DateTime?  @map("completed_at") @db.Timestamptz  // already exists
durationSeconds Int?       @map("duration_seconds")              // already exists
```

**API change:** Update `POST /sessions/:id/complete` to accept `startedAt`:
```json
{
  "startedAt": "2026-07-15T09:00:00Z",
  "durationSeconds": 2640,
  "subjectiveRPE": 7,
  "clientId": "uuid"
}
```

The `startedAt` + `completedAt` window is what enables wearable data correlation (Track A) and completion rate analytics (Track C).

### 2.2 Activity Event Schema

Standardize the DT activity log event format for Cubes+ events:

```typescript
type CubesActivityEvent = {
  type: 'session_started' | 'session_completed' | 'program_started' | 'program_completed' | 'exercise_rated' | 'content_published'
  entityId: string
  entityType: 'exercise' | 'session' | 'program'
  metadata: {
    sessionName?: string
    plannedDurationSeconds?: number
    actualDurationSeconds?: number
    subjectiveRPE?: number
    exerciseCount?: number
    completedBy: string       // Cubes+ user ID
    completedAt: string       // ISO timestamp
    wearableCorrelation?: {   // Filled by Track A
      deviceType: string
      avgHeartRate?: number
      maxHeartRate?: number
      calories?: number
      recoveryScore?: number
    }
  }
}
```

---

## 3. Track A: Wearable Loop

### 3.1 The Closed Loop

```
Coach creates session in Cubes+
         ↓
Client performs session (wearable captures HR, HRV, calories)
         ↓
Wearable data syncs to Digital Twin (Oura: every 15 min)
         ↓
Coach reviews session in Cubes+ → sees HR overlay on the routine timeline
         ↓
Coach adjusts future sessions based on physiological data
```

### 3.2 New Endpoints

**`POST /api/v1/sessions/:id/start`** — Log session start time
```typescript
// Request
{ clientId: string }

// Response
{ sessionProgressId: string, startedAt: string }

// Side effect: POST to DT /api/twin/:userId/activity (session_started)
```

**`GET /api/v1/sessions/:id/performance?clientSessionProgressId=xxx`** — Get wearable data for a completed session
```typescript
// Response
{
  session: { id, name, durationSeconds, exercises: [...] },
  client: { id, fullName },
  timing: { startedAt, completedAt, actualDurationSeconds },
  subjective: { rpe: 7 },
  wearable: {
    available: true,
    device: "Oura Ring Gen 3",
    heartRate: {
      avg: 142,
      max: 178,
      min: 68,
      timeline: [
        { timestamp: "2026-07-15T09:00:00Z", bpm: 72 },
        { timestamp: "2026-07-15T09:01:00Z", bpm: 85 },
        // ... per-minute data points
      ]
    },
    calories: 340,
    hrv: { preSession: 45, postSession: 32 },
    recovery: { preSession: 78, postSession: 62 }
  },
  exerciseTimeline: [
    // Exercise blocks mapped to wearable timeline
    { exerciseId: "...", name: "Dynamic Stretching", startOffset: 0, endOffset: 180, phase: "warmup" },
    { exerciseId: "...", name: "Precision Jumps", startOffset: 180, endOffset: 660, phase: "main" },
    // ...
  ]
}
```

This endpoint:
1. Reads `ClientSessionProgress` for timing
2. Calls DT `GET /api/twin/:userId/wearables/stream?start=X&end=Y` for wearable data
3. Maps exercise timeline (from `SessionExercise` positions + durations) onto the wearable timestamp range
4. Returns combined data for the performance review UI

### 3.3 Readiness-Based Recommendations

**`GET /api/v1/me/today`** — Today's workout with readiness check
```typescript
// Response
{
  greeting: "Good morning, Coach Martinez",
  scheduledWorkout: {
    id: "...",
    name: "Parkour Fundamentals — Day 3",
    durationSeconds: 2640,
    exerciseCount: 8,
    programName: "Week 1 Foundation"
  },
  readiness: {
    score: 72,          // From DT wearables/latest
    level: "moderate",  // < 60 = low, 60-79 = moderate, >= 80 = high
    suggestion: "Consider reducing intensity by 20-30%",
    factors: [
      { metric: "HRV", value: 35, trend: "declining", note: "Below your 7-day average of 42" },
      { metric: "Sleep", value: 6.2, unit: "hours", note: "Below target of 7-8 hours" },
      { metric: "Recovery", value: 68, note: "Moderate recovery from yesterday" }
    ]
  },
  alternatives: [
    { id: "...", name: "Light Mobility Flow", durationSeconds: 1200, reason: "Lower intensity alternative" },
    { id: "...", name: "Rest Day — Breathing", durationSeconds: 600, reason: "Recovery focused" }
  ]
}
```

**Logic:**
- Fetch active `ClientProgramAssignment` → determine today's session from `ProgramSession.position` + `startDate`
- Call DT `GET /api/twin/:userId/wearables/latest` for readiness
- If readiness < 80, query lighter sessions from the same program or org library
- If readiness < 60, suggest rest day

### 3.4 Performance Review UI (Workbench Scope)

New page: `/library/sessions/:id/performance/:clientSessionProgressId`

- Hero: session name, client name, date, actual vs. planned duration
- Heart rate chart: SVG line chart overlaid on exercise timeline blocks (Tetris-style, read-only)
- Each exercise block shows the HR range during that period
- Summary cards: avg HR, max HR, calories, pre/post HRV, RPE
- "Notes" section for coach to add observations
- Compare link: "View previous performances" (list of past completions for this session)

**No external chart library.** Use SVG path rendering (same approach as the OS Dashboard longevity score sparkline). The chart is a simple time-series line with colored background zones for exercises.

### 3.5 Effort Estimate

| Task | Days |
|---|---|
| Session start endpoint + timestamp schema | 1 |
| Performance data endpoint (DT stream + timeline mapping) | 2 |
| Readiness-based /me/today endpoint | 2 |
| Performance review UI page (SVG HR chart + Tetris overlay) | 3 |
| **Track A Total** | **8** |

---

## 4. Track B: Marketplace

### 4.1 Overview

The marketplace lets coaches sell sessions and programs to other coaches. Built on Stripe Connect for direct creator payouts.

**Decisions locked (2026-04-01):**
- **D-33:** Stripe Connect Express — good enough for launch, zero compliance burden
- **D-34:** Commission 80/20 (direct) — no marketplace-referred surcharge (single rate, simpler)
- **D-35:** Minimum price $2.99 — Stripe fixed fees make lower prices uneconomical
- **D-36:** Selling requires Pro tier or higher — creates upgrade incentive for free-tier coaches
- **D-37:** Sessions and programs only — individual exercises are too low-value for paid content

### 4.2 Stripe Connect Setup

**Account type:** Express (Stripe handles onboarding, compliance, tax forms)

**Flow:**
1. Creator clicks "Start Selling" → Cubes+ calls Stripe to create a Connected Account
2. Stripe redirects to their onboarding flow (bank account, identity verification)
3. On completion, Stripe webhooks update the creator's `stripeConnectAccountId`
4. Creator sets prices on their content (Session: $2.99-100, Program: $2.99-500). Requires Pro tier+.
5. Buyer clicks "Purchase" → Stripe Checkout with `payment_intent_data.transfer_data` splitting the payment
6. Platform takes 20%, creator gets 80%

### 4.3 Schema Additions

```prisma
// Add to User model
stripeConnectAccountId  String?  @map("stripe_connect_account_id")
stripeConnectOnboarded  Boolean  @default(false) @map("stripe_connect_onboarded")

// MarketplacePurchase already exists in schema — add:
stripeTransferId        String?  @map("stripe_transfer_id")
```

### 4.4 New Endpoints

**`POST /api/v1/marketplace/connect`** — Create Stripe Connect account + onboarding link
```typescript
// Response
{ onboardingUrl: "https://connect.stripe.com/..." }
```

**`GET /api/v1/marketplace/connect/status`** — Check Connect account status
```typescript
// Response
{ connected: true, payoutsEnabled: true, accountId: "acct_..." }
```

**`POST /api/v1/marketplace/purchase`** — Purchase content
```typescript
// Request
{ entityType: "session", entityId: "uuid" }

// Response
{ checkoutUrl: "https://checkout.stripe.com/..." }
// Stripe Checkout with application_fee_amount for platform cut
```

**`GET /api/v1/marketplace/listings`** — Browse marketplace content
```typescript
// Query: ?type=session|program&domain=&difficulty=&minPrice=&maxPrice=&sort=newest|popular|rating
// Returns: paginated content where visibility = 'marketplace' and marketplacePrice >= 2.99
```

**`GET /api/v1/marketplace/my-sales`** — Creator's sales dashboard
```typescript
// Response
{
  totalRevenue: 1250.00,
  totalSales: 47,
  platformFees: 250.00,
  pendingPayout: 340.00,
  recentSales: [...]
}
```

**`PATCH /api/v1/sessions/:id/marketplace`** + **`PATCH /api/v1/programs/:id/marketplace`** — Set/update marketplace pricing
```typescript
// Request
{ marketplacePrice: 9.99, visibility: "marketplace" }
// Only content creator can set. Must be published first. Requires Pro tier+. Min price $2.99.
```

**`GET /api/v1/me/purchases`** — Consumer's purchased content library
```typescript
// Query: ?type=session|program&page=1&limit=20
// Response
{
  data: [
    { entityType: "program", entityId: "uuid", name: "...", purchasedAt: "...", price: 19.99, seller: { id, fullName, avatarUrl } },
    ...
  ],
  total: 12
}
// Joins MarketplacePurchase with Session/Program for display data
// Available to all roles (athlete + coach)
```

**Purchase gate middleware** — applied to `GET /sessions/:id` and `GET /programs/:id`:
```typescript
// If visibility === 'marketplace' && user is NOT creator && no MarketplacePurchase exists:
//   → Return preview only (name, description, duration, difficulty, rating, exerciseCount, price)
//   → Omit: exercise details, video URLs, builder composition data, creator notes
// If purchased OR creator OR visibility !== 'marketplace':
//   → Return full content
```

### 4.5 Webhook Events (Additional)

```
account.updated → Update user.stripeConnectOnboarded
checkout.session.completed (marketplace) → Create MarketplacePurchase, increment downloadCount
transfer.created → Update MarketplacePurchase.stripeTransferId
```

### 4.6 Commission Structure

| Scenario | Creator | Platform |
|---|---|---|
| All paid sales | 80% | 20% |
| Free download | N/A | N/A |

Single rate, no referral tracking complexity. Minimum price: $2.99.

### 4.7 Effort Estimate

| Task | Days |
|---|---|
| B2C schema migration (athlete role, Client→User FK, default role, user-sync update) | 0.5 |
| Stripe Connect account creation + onboarding | 1 |
| Marketplace purchase flow (Checkout + webhook + purchase gate) | 2 |
| Marketplace browse/listing endpoint + `/me/purchases` | 1 |
| Sales dashboard endpoint | 1 |
| Price setting UI + publish-to-marketplace flow (Pro tier gate) | 1 |
| **Track B Total** | **6.5** |

---

## 5. Track C: Coach Analytics

### 5.1 Dashboard Metrics

The analytics dashboard shows coaches how their content and clients are performing.

**Section 1: Content Performance**
- Total exercises / sessions / programs created
- Total likes, forks, ratings received (across all content)
- Most liked/forked content (top 5)
- Content published this month vs. last month

**Section 2: Client Engagement (requires B2C data)**
- Active clients (completed a session in last 7 days)
- Completion rate: sessions completed / sessions assigned (%)
- Average RPE across all completions
- Adherence trend: weekly completion rate over last 12 weeks (sparkline)

**Section 3: Community Impact**
- Fork tree depth: how many times your content was re-forked
- Total downstream forks (your forks + forks of your forks)
- Rating average + distribution (1-5 star histogram)
- Review response rate

**Section 4: Revenue (if marketplace enabled)**
- Total revenue (all time + this month)
- Best-selling content
- Sales trend (monthly, last 6 months)

### 5.2 New Endpoints

**`GET /api/v1/analytics/content`** — Content performance metrics
```typescript
{
  totals: { exercises: 42, sessions: 18, programs: 5 },
  engagement: { likes: 234, forks: 67, ratings: 89, avgRating: 4.6 },
  topContent: [
    { id, name, type: "session", likes: 63, forks: 28, rating: 4.9 },
    ...
  ],
  trend: {
    thisMonth: { created: 8, likes: 45, forks: 12 },
    lastMonth: { created: 5, likes: 32, forks: 8 }
  }
}
```

**`GET /api/v1/analytics/clients`** — Client engagement metrics
```typescript
{
  activeClients: 12,  // completed session in last 7 days
  totalClients: 18,
  completionRate: 0.73,
  avgRPE: 6.8,
  adherenceTrend: [
    { week: "2026-W28", rate: 0.82 },
    { week: "2026-W29", rate: 0.75 },
    // ... last 12 weeks
  ]
}
```

**`GET /api/v1/analytics/community`** — Community impact metrics
```typescript
{
  totalForks: 67,
  downstreamForks: 23,  // forks of your forks
  forkDepth: 3,         // deepest fork chain
  ratingDistribution: { "1": 2, "2": 3, "3": 8, "4": 28, "5": 48 },
  reviewResponseRate: 0.85
}
```

**`GET /api/v1/analytics/revenue`** — Sales metrics (marketplace coaches only)
```typescript
{
  totalRevenue: 1250.00,
  thisMonth: 340.00,
  lastMonth: 280.00,
  bestSelling: [
    { id, name, type, sales: 28, revenue: 279.72 },
    ...
  ],
  monthlyTrend: [
    { month: "2026-10", revenue: 180 },
    { month: "2026-11", revenue: 280 },
    // ... last 6 months
  ]
}
```

### 5.3 Analytics UI (Workbench Scope)

New page: `/admin/analytics`

- Tab navigation: Content | Clients | Community | Revenue
- Each tab has stat cards (large numbers with trend arrows) + a main chart area (SVG sparklines/bars)
- Warm Athletic palette: rose for primary metrics, cyan for positive trends, amber for attention items
- Export: "Download CSV" button for client adherence data
- Time range selector: Last 7 days / 30 days / 90 days / Year

### 5.4 Effort Estimate

| Task | Days |
|---|---|
| Content performance endpoint + queries | 1 |
| Client engagement endpoint + queries | 2 |
| Community impact endpoint (fork tree traversal) | 1 |
| Revenue endpoint (Stripe data aggregation) | 1 |
| Analytics UI page (4 tabs, charts, stat cards) | 3 |
| **Track C Total** | **8** |

---

## 6. Implementation Order

**Decision (2026-04-01): B → C → A**

```
Week 1: Track B (Marketplace)
  ├── Stripe Connect setup + onboarding
  ├── Purchase flow (Checkout + webhook)
  └── Marketplace browse + sales dashboard + pricing UI

Week 2-3: Track C (Analytics)
  ├── Content + client + community endpoints
  ├── Revenue endpoint (builds on Track B)
  └── Analytics UI page (4 tabs)

Week 3-4: Track A (Wearable Loop)
  ├── Session start/complete timestamp schema
  ├── Performance data endpoint (DT stream)
  ├── Readiness /me/today endpoint
  └── Performance review UI (SVG HR chart)

Week 5: Integration + Polish
  ├── OS Dashboard widgets (if not done)
  ├── HUB program assignment
  └── End-to-end testing
```

**Why this order:**
1. Marketplace first — enables revenue generation and listing seeding ahead of Q4 public launch
2. Analytics second — content/community metrics work without wearable data; revenue tab builds on Track B
3. Wearable loop last — external blockers: Oura test ring in transit (no brand approval needed), Garmin Health SDK access pending (request submitted via developer.garmin.com). Can start Track A backend once either device arrives for E2E testing.

---

## 7. Dependency Graph

```
B2C schema (athlete role) ──── Track B: Purchase flow (buyerId works for athletes)
                               └── Phase 5: Consumer app

Client→User FK ────────────── Track B: Purchase gate (check buyer access)
                               └── Phase 5: Consumer self-registration

Session timestamps (shared) ──┬── Track A: Performance review
                               ├── Track C: Completion rate analytics
                               └── Track C: Adherence trend

DT wearable stream ────────── Track A: HR overlay + readiness

Stripe Connect ────────────── Track B: Marketplace purchases
                               └── Track C: Revenue analytics

Fork model (existing) ─────── Track C: Community impact (fork tree)

Rating system (existing) ──── Track C: Rating distribution
                               └── Track B: Marketplace quality signal
```

---

## 8. API Contract Summary

### New Endpoints (Phase 4)

| Method | Path | Track | Purpose |
|---|---|---|---|
| — | Schema: athlete role + Client→User FK | Pre-B | B2C infrastructure |
| `POST` | `/api/v1/marketplace/connect` | B | Create Stripe Connect account |
| `GET` | `/api/v1/marketplace/connect/status` | B | Connect account status |
| `POST` | `/api/v1/marketplace/purchase` | B | Purchase content via Checkout |
| `GET` | `/api/v1/marketplace/listings` | B | Browse marketplace (sessions + programs) |
| `GET` | `/api/v1/marketplace/my-sales` | B | Creator sales dashboard |
| `GET` | `/api/v1/me/purchases` | B | Consumer purchased content library |
| `PATCH` | `/api/v1/sessions/:id/marketplace` | B | Set session marketplace pricing |
| `PATCH` | `/api/v1/programs/:id/marketplace` | B | Set program marketplace pricing |
| `GET` | `/api/v1/analytics/content` | C | Content performance metrics |
| `GET` | `/api/v1/analytics/clients` | C | Client engagement metrics |
| `GET` | `/api/v1/analytics/community` | C | Community impact metrics |
| `GET` | `/api/v1/analytics/revenue` | C | Revenue metrics |
| `POST` | `/api/v1/sessions/:id/start` | A | Log session start time |
| `GET` | `/api/v1/sessions/:id/performance` | A | Wearable data + exercise timeline |
| `GET` | `/api/v1/me/today` | A | Today's workout + readiness |

### Existing Endpoints Consumed

| Method | Path | Provider | Consumer |
|---|---|---|---|
| `GET` | `/api/twin/:userId/wearables/stream` | DT | Track A |
| `GET` | `/api/twin/:userId/wearables/latest` | DT | Track A |
| `POST` | `/api/twin/:userId/activity` | DT | Track A |

---

## 9. Workbench Handoff Structure

When Phase 4 begins, decompose into 4 sequential PRs:

**PR 0: B2C Schema Migration (Pre-Track B)**
- Add `athlete` to `CoachRole` enum
- Change User default role to `athlete`
- Add `userId` FK to Client model
- Update `syncUser()` to handle athlete default + Client→User linking
- Update coach-facing routes to gate on `role !== 'athlete'`

**PR 1: Marketplace (Track B)**
- Stripe Connect endpoints + webhooks
- Purchase flow with purchase gate middleware
- Marketplace browse endpoint (sessions + programs only)
- `/me/purchases` endpoint
- Sales dashboard endpoint
- Marketplace UI pages (Pro tier gate for selling)

**PR 2: Analytics (Track C)**
- 4 analytics endpoints
- Analytics dashboard page (4 tabs)
- CSV export

**PR 3: Wearable Loop (Track A)**
- Schema migration (startedAt field)
- Session start + performance endpoints
- Readiness /me/today endpoint
- Performance review page with SVG HR chart

Each PR is independently deployable and testable.

---

## 10. Open Questions

| # | Question | Impact | Status |
|---|---|---|---|
| P4-01 | Should wearable HR data be cached in Cubes+ DB or always queried from DT? | Caching reduces DT load but adds data sync complexity. For pilot scale (<100 users), always query is fine. | **Open** — decide before Track A |
| P4-02 | ~~Marketplace minimum price?~~ | ~~Affects Stripe processing fees~~ | **Resolved (D-35):** $2.99 minimum |
| P4-03 | ~~Analytics tier gating?~~ | ~~Gating drives upgrades~~ | **Resolved (D-43):** All tiers get analytics. Revenue tab only for marketplace sellers. |
| P4-04 | ~~Fork tree: recursive CTE or denormalized counter?~~ | ~~CTE slow at scale~~ | **Resolved (D-44):** Recursive CTE with depth limit 10. Optimize to counter only if query >100ms in prod. |
