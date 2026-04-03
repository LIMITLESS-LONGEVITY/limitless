# Cubes+ Integration Architecture — LIMITLESS Longevity OS

**Date:** 2026-03-31
**Status:** Design spec — pending review
**Author:** Main Instance (Operator)
**Depends on:** OS design spec, Digital Twin spec, HUB spec, API Gateway spec, OS Dashboard spec

---

## 1. Executive Summary

Cubes+ is the training routine builder for longevity coaches. It enables coaches to create exercise cubes, assemble them into routines, and combine routines into multi-day super-routines (programs). Within the LIMITLESS Longevity OS, Cubes+ occupies the **"Train"** vertical — the ACT phase of the Learn-Assess-Understand-Act loop.

This document defines every integration point between Cubes+ and the four other LIMITLESS services (Digital Twin, PATHS, HUB, OS Dashboard), including gateway routing, API contracts, data flows, auth mechanisms, and implementation priority.

### Key Principles

1. **Cubes+ owns training data.** Routines, programs, cubes, and coaching assignments live in the Cubes+ database. Other services reference them by ID but never store copies.
2. **Digital Twin owns health data.** Cubes+ reads health context from DT but never stores biomarkers or wearable data locally.
3. **PATHS is the auth authority.** Cubes+ validates the shared `payload-token` cookie. No independent auth system.
4. **Gateway provides unified access.** Users reach Cubes+ at `app.limitless-longevity.health/train`.
5. **Service-to-service calls use scoped API keys.** No JWT forwarding between backends.

---

## 2. Gateway & Routing Design

### 2.1 Recommended Approach: Gateway Path + Subdomain (Both)

| Access Method | URL | Purpose |
|---|---|---|
| **Gateway path** | `app.limitless-longevity.health/train/*` | Primary user-facing access, consistent with `/learn` and `/book` |
| **Direct subdomain** | `cubes.limitless-longevity.health` | Service-to-service calls, CI/CD, local dev fallback |
| **Legacy redirect** | `cubes.elixyr.life` | 301 redirect for 6 months post-migration |

**Rationale:** The gateway path provides a unified user experience (one domain, one cookie, no CORS). The subdomain provides a stable endpoint for service-to-service calls and avoids coupling backend-to-backend communication to the gateway.

### 2.2 Gateway Worker Update

Add to the Cloudflare Worker routing table:

```javascript
const ROUTES = [
  { prefix: '/train', backend: 'https://cubes-frontend.onrender.com' },   // Cubes+ frontend (Next.js)
  { prefix: '/api/train', backend: 'https://cubes-api.onrender.com' },    // Cubes+ API (FastAPI)
  // ... existing routes
]
```

**Important:** The FastAPI backend currently serves routes at `/api/v1/*`. Under the gateway, the frontend will call `/api/train/v1/*`. Two options:

- **Option A (recommended):** Gateway strips `/api/train` prefix before forwarding to FastAPI, so FastAPI continues serving at `/api/v1/*` unchanged.
- **Option B:** FastAPI adds a `/api/train/v1/*` mount point. More invasive.

Decision: **Option A** — keep FastAPI unchanged. The Worker rewrites the path.

```javascript
// In the Worker fetch handler for /api/train/*:
if (url.pathname.startsWith('/api/train')) {
  const rewritten = url.pathname.replace('/api/train', '')
  const target = new URL(rewritten + url.search, 'https://cubes-api.onrender.com')
  return fetch(target, { method: request.method, headers: request.headers, body: request.body })
}
```

### 2.3 Next.js basePath Configuration

```typescript
// cubes-frontend/next.config.ts
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // Production: NEXT_PUBLIC_BASE_PATH=/train
  // Local dev: NEXT_PUBLIC_BASE_PATH= (empty)
}
```

All internal `<Link href="/routines">` calls automatically become `/train/routines` in production.

### 2.4 CORS Configuration

Since the gateway serves all apps from `app.limitless-longevity.health`, browser requests from the OS Dashboard or PATHS to Cubes+ API endpoints go through the same origin — **no CORS issues for gateway-routed traffic.**

For direct subdomain access (service-to-service or development), the FastAPI backend must allow:

```python
CORS_ORIGINS = [
    "https://app.limitless-longevity.health",
    "https://cubes.limitless-longevity.health",
    "https://cubes-api.limitless-longevity.health",
    "http://localhost:3000",  # local dev
]
```

### 2.5 DNS Records (Terraform)

```hcl
resource "cloudflare_dns_record" "cubes_frontend" {
  zone_id = var.cloudflare_zone_id
  name    = "cubes"
  content = "cubes-frontend.onrender.com"  # or Vercel CNAME
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_dns_record" "cubes_api" {
  zone_id = var.cloudflare_zone_id
  name    = "cubes-api"
  content = "cubes-api.onrender.com"
  type    = "CNAME"
  proxied = true
}
```

---

## 3. Authentication Design

### 3.1 Cookie-Based Auth (User Requests)

Cubes+ validates the `payload-token` cookie set by PATHS on `.limitless-longevity.health`.

**Frontend (Next.js):**
- Read `payload-token` from cookies client-side to determine auth state
- All API calls use `credentials: 'include'` to forward the cookie
- Login redirect: `window.location.href = 'https://app.limitless-longevity.health/learn/login?redirect=https://app.limitless-longevity.health/train'`

**Backend (FastAPI):**

```python
# middleware/auth.py
import jwt
from fastapi import Request, HTTPException

async def validate_payload_token(request: Request) -> dict:
    token = request.cookies.get("payload-token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, PAYLOAD_SECRET, algorithms=["HS256"])
        return payload  # { sub, email, role, tier, tenantId, iat, exp }
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### 3.2 Service-to-Service Auth (Backend Calls)

For Cubes+ backend calling Digital Twin, or other services calling Cubes+:

| Direction | Auth Mechanism | Header |
|---|---|---|
| Cubes+ -> Digital Twin | API key | `X-Service-Key: <CUBES_SERVICE_KEY>` |
| Cubes+ -> PATHS | API key | `X-Service-Key: <CUBES_PATHS_KEY>` |
| Cubes+ -> HUB | API key | `X-Service-Key: <CUBES_HUB_KEY>` |
| HUB -> Cubes+ | API key | `X-Service-Key: <HUB_CUBES_KEY>` |
| PATHS -> Cubes+ | API key | `X-Service-Key: <PATHS_CUBES_KEY>` |
| OS Dashboard -> Cubes+ | User JWT (cookie) | `Cookie: payload-token=...` (same-origin via gateway) |

Each service key is scoped to specific operations:

```python
SERVICE_KEYS = {
    os.environ["HUB_SERVICE_KEY"]: {
        "name": "hub",
        "scopes": ["read:routines", "read:programs", "write:assignments"]
    },
    os.environ["PATHS_SERVICE_KEY"]: {
        "name": "paths",
        "scopes": ["read:routines", "read:programs"]
    },
    os.environ["DT_SERVICE_KEY"]: {
        "name": "digital-twin",
        "scopes": ["write:activity"]
    },
}
```

### 3.3 Role Mapping

Cubes+ has its own role system (admin, head_coach, senior_coach, junior_coach) independent of PATHS roles. On first login via cookie SSO:

1. Cubes+ reads `sub` (PATHS user ID) from the JWT
2. Looks up local user by `paths_user_id`
3. If not found: creates local user with default role (`junior_coach` or `client` depending on context)
4. Role assignment is managed within Cubes+ by admins/head coaches

A new `client` role should be added to Cubes+ for end-users who consume routines but don't create them.

---

## 4. Digital Twin Integration

This is the richest integration point. The Digital Twin provides health context that makes Cubes+ routines intelligent and personalized.

### 4.1 Coach Views Client Health Data

**Use case:** A coach opens a client's profile in Cubes+ to build a personalized routine. They need to see the client's health constraints, recovery status, and relevant biomarkers.

**Data flow:**

```
Coach opens client profile in Cubes+
    │
    ▼
Cubes+ frontend calls: GET /api/train/v1/clients/:clientId/health-context
    │
    ▼
Cubes+ backend calls Digital Twin: GET /api/twin/:userId/ai-context
    │  (via X-Service-Key, scoped to read:ai-context)
    │
    ▼
Digital Twin returns health context → Cubes+ backend formats for coach view
    │
    ▼
Coach sees: health profile, biomarkers, wearable data, recovery status
```

**Why proxy through Cubes+ backend?** The coach may not have a direct relationship with the client in DT's access control model. The service key gives Cubes+ scoped read access. The Cubes+ backend also enriches the response with training-specific interpretations.

#### API Contract: Cubes+ -> Digital Twin

**Endpoint:** `GET /api/twin/:userId/ai-context`
**Auth:** `X-Service-Key` header (CUBES_SERVICE_KEY, scope: `read:ai-context`)
**Provider:** Digital Twin
**Consumer:** Cubes+

**Response (from DT, already defined):**
```json
{
  "profile": {
    "age": 45,
    "sex": "male",
    "conditions": ["hypertension", "mild lumbar disc herniation"],
    "medications": ["lisinopril 10mg"],
    "goals": ["improve cardiovascular fitness", "reduce body fat"]
  },
  "recentBiomarkers": [
    { "name": "vo2_max", "value": 38.5, "unit": "mL/kg/min", "status": "normal", "trend": "improving" },
    { "name": "resting_heart_rate", "value": 62, "unit": "bpm", "status": "optimal", "trend": "stable" },
    { "name": "testosterone", "value": 450, "unit": "ng/dL", "status": "normal", "trend": "stable" },
    { "name": "cortisol_am", "value": 18, "unit": "ug/dL", "status": "borderline", "trend": "worsening" }
  ],
  "wearableInsights": {
    "avgSleep": 6.8,
    "avgHRV": 42,
    "recoveryTrend": "declining",
    "lastNightSleepScore": 72,
    "readinessScore": 68
  },
  "pillarPriorities": [
    { "pillar": "exercise", "rank": 1 },
    { "pillar": "sleep", "rank": 2 },
    { "pillar": "stress", "rank": 3 }
  ],
  "recentActivity": [
    "Completed 'Strength Training Principles' course (3 days ago)",
    "Diagnostic: Executive package (2 weeks ago)",
    "Routine completed: 'Upper Body Hypertrophy A' (yesterday)"
  ]
}
```

#### API Contract: Cubes+ Internal (Coach-Facing)

**Endpoint:** `GET /api/train/v1/clients/:clientId/health-context`
**Auth:** `Cookie: payload-token` (coach must have client assignment)
**Provider:** Cubes+
**Consumer:** Cubes+ frontend

**Response (enriched for coach):**
```json
{
  "client": {
    "id": "cubes-user-123",
    "pathsUserId": "1",
    "name": "John Smith",
    "age": 45,
    "sex": "male"
  },
  "healthConstraints": {
    "conditions": ["hypertension", "mild lumbar disc herniation"],
    "medications": ["lisinopril 10mg"],
    "trainingImplications": [
      "Avoid Valsalva maneuver — hypertension risk",
      "No loaded spinal flexion — disc herniation",
      "Monitor blood pressure response to resistance training"
    ]
  },
  "fitnessMarkers": {
    "vo2Max": { "value": 38.5, "unit": "mL/kg/min", "percentile": 55, "trend": "improving" },
    "restingHR": { "value": 62, "unit": "bpm", "trend": "stable" },
    "hrvBaseline": { "value": 42, "unit": "ms", "trend": "declining" }
  },
  "recoveryStatus": {
    "readinessScore": 68,
    "sleepScore": 72,
    "avgSleepHours": 6.8,
    "hrvTrend": "declining",
    "recommendation": "REDUCE_INTENSITY",
    "message": "Client's HRV has been declining for 3 days. Sleep below 7 hours. Recommend lighter session or active recovery."
  },
  "goals": ["improve cardiovascular fitness", "reduce body fat"],
  "pillarFocus": "exercise"
}
```

The `trainingImplications` and `recommendation` fields are computed by Cubes+ backend logic using the raw DT data. This is where domain-specific training intelligence lives.

### 4.2 Routine Execution Tracking

**Use case:** A client completes a Cubes+ routine. The completion event and performance metrics should be logged in the Digital Twin activity log so all apps can see it.

**Data flow:**

```
Client completes routine in Cubes+
    │
    ▼
Cubes+ frontend: POST /api/train/v1/routines/:routineId/complete
    │  (sends: duration, exercises completed, subjective RPE)
    │
    ▼
Cubes+ backend:
    ├── 1. Save completion to Cubes+ DB (routine_completions table)
    ├── 2. POST /api/twin/:userId/activity  (log to DT)
    └── 3. Return completion summary to frontend
```

#### API Contract: Cubes+ -> Digital Twin (Activity Log)

**Endpoint:** `POST /api/twin/:userId/activity`
**Auth:** `X-Service-Key` header (CUBES_SERVICE_KEY, scope: `write:activity`)
**Provider:** Digital Twin
**Consumer:** Cubes+

**Request:**
```json
{
  "source": "cubes",
  "eventType": "routine_completed",
  "metadata": {
    "routineId": "routine-uuid-456",
    "routineName": "Upper Body Hypertrophy A",
    "programId": "program-uuid-789",
    "programName": "8-Week Strength Foundation",
    "programDay": 12,
    "durationMinutes": 52,
    "exercisesCompleted": 8,
    "exercisesTotal": 8,
    "subjectiveRPE": 7,
    "coachId": "cubes-coach-user-id"
  },
  "occurredAt": "2026-03-31T09:30:00Z"
}
```

**Response:**
```json
{
  "id": "activity-uuid-001",
  "status": "logged"
}
```

### 4.3 Wearable Correlation with Routine Sessions

**Use case:** After a client completes a routine, their wearable data during that time window should be associable with the routine for performance review.

**Design decision:** Cubes+ does NOT store wearable data. Instead, when a coach or client wants to review performance data for a specific routine session, Cubes+ queries the Digital Twin for wearable data within the session time window.

#### API Contract: Cubes+ -> Digital Twin (Session Wearable Data)

**Endpoint:** `GET /api/twin/:userId/wearables/stream?start=<ISO>&end=<ISO>&metrics=heart_rate,calories`
**Auth:** `X-Service-Key` header (CUBES_SERVICE_KEY, scope: `read:wearables`)
**Provider:** Digital Twin (already defined in DT spec)
**Consumer:** Cubes+

**Request (query params):**
```
start=2026-03-31T08:38:00Z
end=2026-03-31T09:30:00Z
metrics=heart_rate,calories,hrv
```

**Response:**
```json
{
  "userId": "1",
  "timeRange": { "start": "2026-03-31T08:38:00Z", "end": "2026-03-31T09:30:00Z" },
  "data": [
    { "time": "2026-03-31T08:40:00Z", "metric": "heart_rate", "value": 72, "unit": "bpm" },
    { "time": "2026-03-31T08:45:00Z", "metric": "heart_rate", "value": 135, "unit": "bpm" },
    { "time": "2026-03-31T08:50:00Z", "metric": "heart_rate", "value": 148, "unit": "bpm" },
    { "time": "2026-03-31T09:25:00Z", "metric": "heart_rate", "value": 89, "unit": "bpm" }
  ],
  "summary": {
    "heart_rate": { "avg": 128, "max": 162, "min": 72 },
    "calories": { "total": 385 }
  }
}
```

**Cubes+ stores:** Only the `sessionStartedAt` and `sessionEndedAt` timestamps in its `routine_completions` table. These timestamps are the key for querying DT wearable data on demand.

### 4.4 Readiness-Based Routine Recommendations

**Use case:** The system suggests adjusting today's routine based on the client's recovery status. "Your HRV is low today — we recommend a lighter routine."

**Design:** This is a **pull** pattern, not a push. Cubes+ checks readiness when the client opens today's routine.

**Data flow:**

```
Client opens "Today's Routine" in Cubes+
    │
    ▼
Cubes+ frontend: GET /api/train/v1/me/today
    │
    ▼
Cubes+ backend:
    ├── 1. Look up client's active program and today's scheduled routine
    ├── 2. GET /api/twin/:userId/wearables/latest  (DT call)
    │       Returns: readiness score, last night sleep, HRV
    ├── 3. Apply readiness rules:
    │       - readinessScore >= 80: proceed as planned
    │       - readinessScore 60-79: suggest lighter alternative
    │       - readinessScore < 60: suggest rest day or mobility
    └── 4. Return routine with readiness overlay
```

#### API Contract: Cubes+ Internal (Today's Routine)

**Endpoint:** `GET /api/train/v1/me/today`
**Auth:** `Cookie: payload-token`
**Provider:** Cubes+
**Consumer:** Cubes+ frontend, OS Dashboard (via gateway)

**Response:**
```json
{
  "scheduledRoutine": {
    "id": "routine-uuid-456",
    "name": "Lower Body Strength B",
    "programName": "8-Week Strength Foundation",
    "programDay": 13,
    "estimatedMinutes": 55,
    "exercises": [
      { "name": "Barbell Back Squat", "sets": 4, "reps": "6-8", "rest": "180s" },
      { "name": "Romanian Deadlift", "sets": 3, "reps": "8-10", "rest": "120s" }
    ]
  },
  "readiness": {
    "score": 65,
    "sleepScore": 58,
    "hrvDeviation": -18,
    "recommendation": "REDUCE_INTENSITY",
    "message": "Your recovery is below baseline. Consider reducing weights by 15-20% or switching to the mobility alternative.",
    "alternativeRoutineId": "routine-uuid-mobility-01",
    "alternativeRoutineName": "Active Recovery & Mobility"
  },
  "completedToday": false
}
```

### 4.5 Longevity Score Integration

**Use case:** Routine adherence and training metrics contribute to the client's longevity score in the Digital Twin.

**Design:** The longevity score algorithm lives in the Digital Twin. Cubes+ contributes data via the activity log (Section 4.2). The DT's longevity score calculation reads activity log entries with `source: 'cubes'` to compute the exercise pillar score.

**No additional API needed.** The activity log `POST /api/twin/:userId/activity` with `eventType: 'routine_completed'` already provides the data. The DT score algorithm weights:

- Routine adherence (completions / scheduled)
- Training volume (duration, exercises completed)
- Consistency (streak, frequency)
- Progressive overload signals (subjective RPE trending)

---

## 5. PATHS Integration

### 5.1 Courses Referencing Routines

**Use case:** A PATHS lesson on "Resistance Training for Longevity" includes a call-to-action: "Try this routine in Cubes+."

**Design options:**

| Approach | Description | Effort | UX |
|---|---|---|---|
| **A. Deep link** | PATHS lesson contains a link to `app.limitless-longevity.health/train/routines/:routineId` | Low | User leaves PATHS, opens Cubes+ |
| **B. Embed card** | PATHS lesson renders a Cubes+ routine summary card (fetched via API) with "Open in Cubes+" CTA | Medium | Rich preview without leaving PATHS |
| **C. Full embed** | PATHS renders the routine viewer inline using a Cubes+ web component | High | Seamless but complex |

**Recommendation: Option B (Embed Card).** A PATHS Lexical editor block called `RoutineEmbed` fetches minimal routine data from Cubes+ and renders a card.

#### API Contract: PATHS -> Cubes+ (Routine Summary)

**Endpoint:** `GET /api/train/v1/routines/:routineId/summary`
**Auth:** `X-Service-Key` header (PATHS_SERVICE_KEY, scope: `read:routines`)
**Provider:** Cubes+
**Consumer:** PATHS

**Response:**
```json
{
  "id": "routine-uuid-456",
  "name": "Upper Body Hypertrophy A",
  "description": "Chest, shoulders, and triceps focus with progressive overload.",
  "coachName": "Ken Mitelman",
  "exerciseCount": 8,
  "estimatedMinutes": 50,
  "difficulty": "intermediate",
  "targetMuscles": ["chest", "shoulders", "triceps"],
  "thumbnailUrl": "https://res.cloudinary.com/limitless/routines/upper-body-a.jpg",
  "deepLink": "/train/routines/routine-uuid-456"
}
```

**PATHS Lexical Block:**
```typescript
// In PATHS: a custom Lexical block that editors can insert into lessons
{
  slug: 'routineEmbed',
  fields: [
    { name: 'routineId', type: 'text', required: true },
    { name: 'ctaText', type: 'text', defaultValue: 'Try this routine' },
  ],
}
```

### 5.2 Learning-to-Training Loop

**Use case:** User completes PATHS course "Strength Training Principles" and gets suggested Cubes+ routines from the library that match the course topic.

**Design:** PATHS fires an activity log event when a course is completed. Cubes+ does not listen to this directly. Instead, the suggestion is rendered in:

1. **PATHS post-completion screen:** "Now put it into practice" with routine suggestions fetched from Cubes+.
2. **OS Dashboard:** The "Suggested Routines" widget shows routines matched to recently completed courses.

#### API Contract: PATHS/OS Dashboard -> Cubes+ (Routine Suggestions by Topic)

**Endpoint:** `GET /api/train/v1/routines/suggestions?topic=strength_training&tier=premium&limit=3`
**Auth:** `X-Service-Key` or `Cookie: payload-token`
**Provider:** Cubes+
**Consumer:** PATHS, OS Dashboard

**Request (query params):**
```
topic=strength_training     # Maps to Cubes+ domain/category
tier=premium                # User's subscription tier (filters library access)
limit=3
```

**Response:**
```json
{
  "routines": [
    {
      "id": "routine-uuid-456",
      "name": "Beginner Full Body Strength",
      "description": "A balanced introduction to resistance training.",
      "difficulty": "beginner",
      "estimatedMinutes": 40,
      "deepLink": "/train/routines/routine-uuid-456"
    },
    {
      "id": "routine-uuid-457",
      "name": "Upper/Lower Split - Week 1",
      "description": "Progressive overload program for intermediates.",
      "difficulty": "intermediate",
      "estimatedMinutes": 55,
      "deepLink": "/train/routines/routine-uuid-457"
    }
  ]
}
```

### 5.3 Shared Content Taxonomy

Cubes+ domains should align with PATHS content pillars for cross-referencing:

| PATHS Pillar | Cubes+ Domain | Example Content |
|---|---|---|
| Exercise / Movement | `strength`, `cardio`, `mobility`, `balance` | Resistance training routines, HIIT protocols |
| Sleep | `recovery`, `mobility` | Evening stretch routines, wind-down protocols |
| Nutrition | (no direct mapping) | Post-workout nutrition guides link back to PATHS |
| Stress / Mental | `breathwork`, `mindfulness` | Guided breathing exercises, meditation routines |
| Cognition | `neuromuscular` | Coordination drills, dual-task exercises |

**Implementation:** Both PATHS and Cubes+ use a shared `topic` taxonomy. PATHS courses are tagged; Cubes+ routines are tagged. Cross-referencing is by topic string match.

---

## 6. HUB Integration

### 6.1 Booking to Routine Assignment

**Use case:** A client books a coaching session via HUB. The coach attaches a Cubes+ routine to the appointment so the client knows what to prepare.

**Data flow:**

```
Coach creates appointment in HUB with routine attachment
    │
    ▼
HUB stores: appointment record with routineId reference
    │
    ▼
Client views appointment in HUB or OS Dashboard
    │
    ▼
HUB/OS Dashboard fetches routine summary from Cubes+
    │
    ▼
Client sees: "Appointment: Coach Session with Ken, Mar 31 10:00
              Routine: Upper Body Hypertrophy A (50 min) [View in Cubes+]"
```

#### API Contract: HUB -> Cubes+ (Routine Summary for Appointment)

**Endpoint:** `GET /api/train/v1/routines/:routineId/summary`
**Auth:** `X-Service-Key` header (HUB_SERVICE_KEY, scope: `read:routines`)
**Provider:** Cubes+ (same endpoint as PATHS, Section 5.1)
**Consumer:** HUB

Same response as Section 5.1. Reusing the same endpoint reduces API surface.

### 6.2 Stay Programs

**Use case:** A hotel guest books a 5-day Longevity Immersion stay via HUB. The stay includes a multi-day training program built in Cubes+.

**Design:** HUB stores a `cubesProgramId` on the `StayBooking` record. The program is a Cubes+ super-routine (multi-day sequence of routines).

#### API Contract: HUB -> Cubes+ (Program Summary)

**Endpoint:** `GET /api/train/v1/programs/:programId/summary`
**Auth:** `X-Service-Key` header (HUB_SERVICE_KEY, scope: `read:programs`)
**Provider:** Cubes+
**Consumer:** HUB

**Response:**
```json
{
  "id": "program-uuid-789",
  "name": "5-Day Vitality Reset",
  "description": "A progressive 5-day movement program combining strength, mobility, and recovery.",
  "durationDays": 5,
  "routines": [
    { "day": 1, "routineId": "r-001", "name": "Movement Assessment & Mobility", "minutes": 45 },
    { "day": 2, "routineId": "r-002", "name": "Foundation Strength", "minutes": 50 },
    { "day": 3, "routineId": "r-003", "name": "Active Recovery & Breathwork", "minutes": 40 },
    { "day": 4, "routineId": "r-004", "name": "Progressive Challenge", "minutes": 55 },
    { "day": 5, "routineId": "r-005", "name": "Integration & Goal Setting", "minutes": 45 }
  ],
  "coachName": "Ken Mitelman",
  "deepLink": "/train/programs/program-uuid-789"
}
```

#### API Contract: HUB -> Cubes+ (Assign Program to Client)

**Endpoint:** `POST /api/train/v1/programs/:programId/assign`
**Auth:** `X-Service-Key` header (HUB_SERVICE_KEY, scope: `write:assignments`)
**Provider:** Cubes+
**Consumer:** HUB

**Request:**
```json
{
  "clientUserId": "1",
  "startDate": "2026-04-05",
  "stayBookingId": "hub-stay-booking-uuid",
  "assignedBy": "system",
  "notes": "5-Day Vitality Reset — El Fuerte Marbella stay"
}
```

**Response:**
```json
{
  "assignmentId": "assignment-uuid-001",
  "status": "assigned",
  "programId": "program-uuid-789",
  "clientUserId": "1",
  "startDate": "2026-04-05"
}
```

### 6.3 Clinician-to-Coach Handoff

**Use case:** A clinician reviews a client's diagnostic results and prescribes exercise parameters (e.g., "max HR 150 bpm, no heavy axial loading, 3x/week resistance training"). The coach in Cubes+ sees these constraints when building routines.

**Design:** The clinician writes exercise prescriptions to the Digital Twin, not directly to Cubes+. Cubes+ reads them from the health context (Section 4.1).

**Data flow:**

```
Clinician enters exercise prescription in HUB
    │
    ▼
HUB writes to Digital Twin: POST /api/twin/:userId/prescriptions
    │
    ▼
Coach opens client in Cubes+
    │
    ▼
Cubes+ reads from Digital Twin: GET /api/twin/:userId/ai-context
    │  (includes exercise prescription in healthConstraints)
    │
    ▼
Coach sees: "Clinician Rx: Max HR 150 bpm, no heavy axial loading, 3x/week"
```

#### API Contract: HUB -> Digital Twin (Exercise Prescription)

**Endpoint:** `POST /api/twin/:userId/prescriptions` (new endpoint on DT)
**Auth:** `X-Service-Key` header (HUB_SERVICE_KEY, scope: `write:prescriptions`)
**Provider:** Digital Twin
**Consumer:** HUB

**Request:**
```json
{
  "type": "exercise",
  "clinicianId": "clinician-uuid-001",
  "clinicianName": "Dr. Uchitel",
  "prescribedAt": "2026-03-31T14:00:00Z",
  "validUntil": "2026-06-30T00:00:00Z",
  "parameters": {
    "maxHeartRate": 150,
    "frequencyPerWeek": 3,
    "restrictions": ["no heavy axial loading", "no Valsalva maneuver"],
    "recommendations": ["focus on unilateral exercises", "include 15 min warm-up"],
    "notes": "Patient has mild lumbar disc herniation. Progressive loading OK after 4 weeks if asymptomatic."
  }
}
```

The DT `/ai-context` response would include this in the `healthConstraints` section, which Cubes+ already reads (Section 4.1).

---

## 7. OS Dashboard Integration

### 7.1 Widgets

Three Cubes+ widgets on the OS Dashboard:

#### Widget A: "Today's Routine"

**Data source:** `GET /api/train/v1/me/today` (same endpoint as Section 4.4)
**Auth:** User cookie (same-origin via gateway)

**Widget display:**
```
┌──────────────────────────────────┐
│  TODAY'S ROUTINE                 │
│                                  │
│  Lower Body Strength B           │
│  8-Week Strength Foundation      │
│  Day 13 · ~55 min               │
│                                  │
│  ⚠ Recovery: 65/100             │
│  Consider lighter session        │
│                                  │
│  [ Start Routine → ]            │
└──────────────────────────────────┘
```

#### Widget B: "Active Programs"

**Data source:** New endpoint needed.

**Endpoint:** `GET /api/train/v1/me/programs/active`
**Auth:** `Cookie: payload-token`
**Provider:** Cubes+
**Consumer:** OS Dashboard

**Response:**
```json
{
  "programs": [
    {
      "id": "program-uuid-789",
      "name": "8-Week Strength Foundation",
      "progress": 0.46,
      "currentDay": 13,
      "totalDays": 28,
      "nextRoutineDate": "2026-03-31",
      "coachName": "Ken Mitelman"
    }
  ],
  "weeklyStats": {
    "routinesCompleted": 3,
    "routinesScheduled": 4,
    "totalMinutes": 145,
    "streak": 12
  }
}
```

**Widget display:**
```
┌──────────────────────────────────┐
│  TRAINING                        │
│                                  │
│  8-Week Strength Foundation      │
│  ████████████░░░░░░░░ 46%       │
│  Day 13 of 28 · Coach: Ken M.   │
│                                  │
│  This week: 3/4 routines · 🔥12 │
│                                  │
│  [ Open Cubes+ → ]              │
└──────────────────────────────────┘
```

#### Widget C: "Coach Activity" (Coach Role Only)

**Endpoint:** `GET /api/train/v1/me/coach/activity?limit=5`
**Auth:** `Cookie: payload-token`
**Provider:** Cubes+
**Consumer:** OS Dashboard

**Response:**
```json
{
  "recentActivity": [
    { "type": "routine_created", "routineName": "HIIT Circuit Alpha", "createdAt": "2026-03-30T16:00:00Z" },
    { "type": "client_completed", "clientName": "John S.", "routineName": "Upper Body A", "completedAt": "2026-03-31T09:30:00Z" },
    { "type": "program_assigned", "clientName": "Maria L.", "programName": "Mobility Reset", "assignedAt": "2026-03-30T10:00:00Z" }
  ],
  "clientCount": 8,
  "activePrograms": 5
}
```

### 7.2 App Launcher Card

The existing OS Dashboard app launcher (Section 4.1 of OS Dashboard spec) shows three cards. The Cubes+ card:

**Endpoint:** `GET /api/train/v1/me/summary`
**Auth:** `Cookie: payload-token`
**Provider:** Cubes+
**Consumer:** OS Dashboard

**Response:**
```json
{
  "activePrograms": 1,
  "routinesThisWeek": 3,
  "streak": 12,
  "nextRoutine": {
    "name": "Lower Body Strength B",
    "scheduledFor": "2026-03-31"
  },
  "role": "client"
}
```

**Card display:**
```
┌─────────┐
│  Train  │
│ 1 prog  │
│ 🔥 12   │
│ Next:   │
│ Today   │
└─────────┘
```

### 7.3 Unified Search

The OS Dashboard federated search should include Cubes+ routines and programs.

**Endpoint:** `GET /api/train/v1/search?q=<query>&limit=5`
**Auth:** `Cookie: payload-token`
**Provider:** Cubes+
**Consumer:** OS Dashboard

**Response:**
```json
{
  "results": [
    { "type": "routine", "id": "r-456", "name": "Upper Body Hypertrophy A", "deepLink": "/train/routines/r-456" },
    { "type": "program", "id": "p-789", "name": "8-Week Strength Foundation", "deepLink": "/train/programs/p-789" },
    { "type": "exercise", "id": "e-101", "name": "Barbell Back Squat", "deepLink": "/train/exercises/e-101" }
  ]
}
```

---

## 8. Wearable Data Closed Loop

The complete closed loop between coaching and wearable data:

```
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │  1. COACH creates routine ──────────────────────┐      │
    │     (Cubes+ routine builder)                     │      │
    │                                                  ▼      │
    │  5. COACH reviews performance     2. CLIENT does │      │
    │     data + adjusts future ◄──┐       routine     │      │
    │     routines (Cubes+)        │       (gym/hotel)  │      │
    │                              │                    │      │
    │  4. CUBES+ queries DT for    │    3. WEARABLE    │      │
    │     session wearable data    │       captures HR, │      │
    │     by time window           │       calories     │      │
    │     (GET /wearables/stream)  │       → syncs to   │      │
    │              ▲               │       Digital Twin  │      │
    │              │               │       (auto sync)   │      │
    │              └───────────────┘              │      │      │
    │                                            │      │      │
    │              ┌─────────────────────────────┘      │      │
    │              │                                     │      │
    │              ▼                                     │      │
    │         DIGITAL TWIN                              │      │
    │         (wearable_data hypertable)                │      │
    │         (wearable_summaries)                      │      │
    │         (activity_log: routine_completed)         │      │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
```

### Step-by-Step Data Flow

**Step 1: Coach Creates Routine**
- Coach uses Cubes+ drag-and-drop builder
- Routine saved to Cubes+ database
- Optional: coach assigns routine to client via program

**Step 2: Client Executes Routine**
- Client opens Cubes+ app, starts "Today's Routine"
- Cubes+ records `sessionStartedAt` timestamp
- Client performs exercises, logs sets/reps/weights in Cubes+
- Cubes+ records `sessionEndedAt` timestamp

**Step 3: Wearable Captures Biometric Data**
- Oura Ring / Whoop / Garmin captures heart rate, HRV, calories during the session
- Data syncs to Digital Twin via existing wearable ingest pipeline (webhook or batch sync, per DT spec)
- DT stores raw readings in `wearable_data` hypertable with timestamps

**Step 4: Cubes+ Queries Session Data**
- After session completion, Cubes+ logs the completion to DT activity log
- When coach or client opens the session review screen in Cubes+:
  - Cubes+ backend calls `GET /api/twin/:userId/wearables/stream?start={sessionStartedAt}&end={sessionEndedAt}&metrics=heart_rate,calories`
  - Returns time-series heart rate data overlaid on the routine timeline

**Step 5: Coach Reviews and Adapts**
- Coach sees performance overlay: heart rate graph mapped to exercises
- Coach identifies: "Client's HR spiked to 175 during squat sets — above prescribed 150 max"
- Coach adjusts future routines: reduces squat intensity, adds longer rest periods
- The readiness check (Section 4.4) automatically suggests lighter sessions when recovery is low

### Session Correlation Schema

In Cubes+ database:

```sql
CREATE TABLE routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES routines(id),
  program_assignment_id UUID REFERENCES program_assignments(id),
  user_id UUID NOT NULL REFERENCES users(id),

  session_started_at TIMESTAMPTZ NOT NULL,
  session_ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  exercises_completed INTEGER,
  exercises_total INTEGER,
  subjective_rpe INTEGER CHECK (subjective_rpe BETWEEN 1 AND 10),
  notes TEXT,

  -- Wearable data is NOT stored here — queried from DT on demand
  -- These flags indicate whether wearable data is available for this session
  wearable_data_available BOOLEAN DEFAULT FALSE,
  wearable_device_provider TEXT,  -- 'oura', 'whoop', etc.

  dt_activity_log_id UUID,  -- Reference to DT activity log entry

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Wearable Availability Detection

How does Cubes+ know if wearable data exists for a session?

1. After logging completion to DT, Cubes+ makes a lightweight check:
   `GET /api/twin/:userId/wearables/stream?start={start}&end={end}&metrics=heart_rate&limit=1`
2. If data exists (non-empty response), set `wearable_data_available = true`
3. This avoids showing "View Performance Data" when no wearable was active

---

## 9. Data Flow Diagram (Full System)

```
                         ┌──────────────────────────────────────────────┐
                         │           API GATEWAY (Cloudflare Worker)     │
                         │         app.limitless-longevity.health        │
                         │                                              │
                         │  /learn/* ──► PATHS                          │
                         │  /book/*  ──► HUB                            │
                         │  /train/* ──► CUBES+ Frontend                │
                         │  /api/train/* ──► CUBES+ API (rewrite path)  │
                         │  /api/twin/* ──► Digital Twin                 │
                         │  /         ──► OS Dashboard                   │
                         └──────────┬───────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
     ┌────┴─────┐            ┌──────┴──────┐           ┌─────┴─────┐
     │  PATHS   │            │    HUB      │           │  CUBES+   │
     │  /learn  │            │   /book     │           │  /train   │
     │          │            │             │           │           │
     │ Courses  │            │ Bookings    │           │ Routines  │
     │ AI Tutor │            │ Membership  │           │ Programs  │
     │ Articles │            │ Diagnostics │           │ Coaching  │
     │ Certs    │            │ Stays       │           │ Exercises │
     └────┬─────┘            └──────┬──────┘           └─────┬─────┘
          │                         │                         │
          │    ┌────────────────────┼─────────────────────────┤
          │    │                    │                         │
          │    │  Service-to-Service (X-Service-Key)         │
          │    │                    │                         │
          ▼    ▼                    ▼                         ▼
     ┌─────────────────────────────────────────────────────────────┐
     │                      DIGITAL TWIN                           │
     │              /api/twin (Fastify + TimescaleDB)              │
     │                                                             │
     │  Health Profiles │ Biomarkers │ Wearable Data │ Activity Log│
     │  Prescriptions   │ Genomics   │ Diagnostics   │ AI Context  │
     └────────────────────────────┬────────────────────────────────┘
                                  │
                                  │ Wearable Ingest
                                  │
                    ┌─────────────┴──────────────┐
                    │  Oura Ring  │  Whoop  │ ...│
                    └────────────────────────────┘

          ┌─────────────────────────────────────────┐
          │            OS DASHBOARD                   │
          │      app.limitless-longevity.health/      │
          │                                           │
          │  Reads from ALL services via gateway:     │
          │  - PATHS: learning progress, protocol     │
          │  - HUB: appointments, membership          │
          │  - CUBES+: today's routine, programs      │
          │  - DT: health summary, longevity score    │
          └─────────────────────────────────────────┘
```

### Data Ownership Summary

| Data | Owner | Writers | Readers |
|---|---|---|---|
| User accounts, auth | PATHS | PATHS | All (via JWT cookie) |
| Courses, articles, certificates | PATHS | PATHS | PATHS, OS Dashboard |
| Bookings, memberships, appointments | HUB | HUB | HUB, OS Dashboard |
| Cubes, routines, programs, assignments | Cubes+ | Cubes+ | Cubes+, PATHS, HUB, OS Dashboard |
| Health profiles, biomarkers | Digital Twin | DT, HUB (clinician), user (self-report) | All services (scoped) |
| Wearable data | Digital Twin | DT (via wearable sync) | DT, Cubes+ (time-window queries), OS Dashboard |
| Activity log | Digital Twin | All services write | DT (score calc), OS Dashboard |
| Exercise prescriptions | Digital Twin | HUB (clinician) | Cubes+ (via ai-context) |

---

## 10. API Contract Summary

All endpoints referenced in this document, consolidated:

### Cubes+ Endpoints (Provider: Cubes+)

| Method | Endpoint | Auth | Consumer | Purpose |
|---|---|---|---|---|
| `GET` | `/api/train/v1/routines/:id/summary` | Service key or cookie | PATHS, HUB, OS Dashboard | Routine summary card |
| `GET` | `/api/train/v1/programs/:id/summary` | Service key | HUB | Program summary for stay booking |
| `POST` | `/api/train/v1/programs/:id/assign` | Service key (HUB) | HUB | Assign program to client |
| `GET` | `/api/train/v1/routines/suggestions` | Service key or cookie | PATHS, OS Dashboard | Topic-based routine suggestions |
| `GET` | `/api/train/v1/me/today` | Cookie | Cubes+ frontend, OS Dashboard | Today's routine + readiness |
| `GET` | `/api/train/v1/me/programs/active` | Cookie | OS Dashboard | Active programs + weekly stats |
| `GET` | `/api/train/v1/me/summary` | Cookie | OS Dashboard | App launcher card data |
| `GET` | `/api/train/v1/me/coach/activity` | Cookie (coach role) | OS Dashboard | Coach activity feed |
| `POST` | `/api/train/v1/routines/:id/complete` | Cookie | Cubes+ frontend | Log routine completion |
| `GET` | `/api/train/v1/clients/:id/health-context` | Cookie (coach role) | Cubes+ frontend | Client health data (proxied from DT) |
| `GET` | `/api/train/v1/search` | Cookie | OS Dashboard | Federated search results |

### Digital Twin Endpoints (Provider: DT, Consumer: Cubes+)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/twin/:userId/ai-context` | Service key (CUBES) | Health context for coach view |
| `POST` | `/api/twin/:userId/activity` | Service key (CUBES) | Log routine completion event |
| `GET` | `/api/twin/:userId/wearables/stream` | Service key (CUBES) | Session wearable data (time window) |
| `GET` | `/api/twin/:userId/wearables/latest` | Service key (CUBES) | Latest readiness/recovery data |

### Digital Twin Endpoints (Provider: DT, Consumer: HUB — New)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/twin/:userId/prescriptions` | Service key (HUB) | Clinician exercise prescriptions |

### Service Key Scope Matrix

| Service Key | Scopes Granted |
|---|---|
| `CUBES_SERVICE_KEY` (Cubes+ -> DT) | `read:ai-context`, `read:wearables`, `write:activity` |
| `PATHS_SERVICE_KEY` (PATHS -> Cubes+) | `read:routines`, `read:programs` |
| `HUB_SERVICE_KEY` (HUB -> Cubes+) | `read:routines`, `read:programs`, `write:assignments` |

---

## 11. Implementation Priority

### Phase 1: Foundation (Week 1-2)

**Goal:** Cubes+ accessible via gateway, cookie auth working, basic DT read.

| Task | Effort | Dependencies |
|---|---|---|
| Add `/train` and `/api/train` routes to gateway Worker | 1 day | Gateway Worker deployed |
| Add `basePath: '/train'` to Cubes+ Next.js frontend | 1 day | None |
| Implement `CookieAuthMiddleware` in FastAPI | 2-3 days | Shared `PAYLOAD_SECRET` |
| Add `client` role to Cubes+ user model | 1 day | None |
| DNS records for `cubes.limitless-longevity.health` | 1 day | Terraform |
| Cubes+ backend: `GET /routines/:id/summary` endpoint | 1 day | None |
| Cubes+ backend: `GET /me/summary` endpoint | 1 day | Cookie auth |

### Phase 2: Digital Twin Integration (Week 3-4)

**Goal:** Coaches see client health data, routine completions logged to DT.

| Task | Effort | Dependencies |
|---|---|---|
| DT: verify `CUBES_SERVICE_KEY` in service key config | 0.5 day | DT deployed |
| Cubes+ backend: health context proxy (`/clients/:id/health-context`) | 2 days | DT ai-context endpoint live |
| Training implications engine (conditions -> constraints) | 3 days | Health context proxy |
| `POST /routines/:id/complete` with DT activity log write | 2 days | DT activity endpoint |
| `routine_completions` table + Alembic migration | 1 day | None |
| Readiness check in `GET /me/today` | 2 days | DT wearables/latest endpoint |

### Phase 3: OS Dashboard Widgets (Week 4-5)

**Goal:** Cubes+ data visible on the unified dashboard.

| Task | Effort | Dependencies |
|---|---|---|
| `GET /me/today` endpoint (full) | 1 day | Phase 2 readiness check |
| `GET /me/programs/active` endpoint | 1 day | Cookie auth |
| `GET /me/coach/activity` endpoint | 1 day | Cookie auth |
| OS Dashboard: "Today's Routine" widget | 2 days | Cubes+ endpoints |
| OS Dashboard: "Training" app launcher card | 1 day | `/me/summary` endpoint |
| OS Dashboard: "Active Programs" widget | 1 day | `/me/programs/active` |

### Phase 4: PATHS + HUB Integration (Week 5-7)

**Goal:** Cross-app content linking, stay program assignment.

| Task | Effort | Dependencies |
|---|---|---|
| PATHS: `RoutineEmbed` Lexical block | 3 days | `/routines/:id/summary` |
| `GET /routines/suggestions` endpoint | 2 days | Topic taxonomy |
| `GET /programs/:id/summary` endpoint | 1 day | None |
| `POST /programs/:id/assign` endpoint | 2 days | Program assignments table |
| HUB: routine attachment on appointments | 2 days | `/routines/:id/summary` |
| HUB: stay program linking | 2 days | `/programs/:id/assign` |

### Phase 5: Wearable Closed Loop (Week 7-9)

**Goal:** Full session-level wearable data correlation.

| Task | Effort | Dependencies |
|---|---|---|
| Session start/end timestamp tracking in Cubes+ | 1 day | `routine_completions` |
| DT wearable stream query with time window | 1 day | DT wearables/stream |
| Session performance review screen in Cubes+ | 3 days | Both above |
| Wearable availability detection | 1 day | DT stream endpoint |
| HR zone overlay on routine timeline | 3 days | Performance review screen |

### Phase 6: Advanced (Week 9+)

**Goal:** Intelligence features.

| Task | Effort | Dependencies |
|---|---|---|
| DT: Exercise prescriptions endpoint | 2 days | DT service |
| Cubes+ federated search endpoint | 2 days | Search infrastructure |
| OS Dashboard unified search integration | 1 day | Search endpoint |
| DT: Longevity score exercise pillar calculation | 3 days | Activity log data |
| Coach dashboard: multi-client performance view | 5 days | Wearable loop |
| Auto-suggestions: "Client's HRV low, suggest lighter routine" | 3 days | Readiness engine |

### Total Timeline: ~9-12 weeks

---

## 12. Cubes+ Rebuild Stack Decision

The existing Cubes+ is FastAPI (Python) + Next.js. The rebuild should consider alignment with the LIMITLESS ecosystem:

| Option | Backend | Frontend | Pros | Cons |
|---|---|---|---|---|
| **A. Keep current** | FastAPI + SQLAlchemy | Next.js 16 | No rewrite, 101 E2E tests exist | Python backend is the only non-Node service |
| **B. Full Node.js** | Next.js API routes + Prisma | Next.js 16 | Consistent with HUB, shared Prisma patterns | Rewrite cost, lose FastAPI async perf |
| **C. Fastify + Drizzle** | Fastify | Next.js 16 | Consistent with DT, high performance | Rewrite cost |

**Recommendation: Option A for now.** The FastAPI backend works, has tests, and the integration is via HTTP APIs — the backend language doesn't matter for interop. Cookie auth validation works the same in Python (PyJWT) as in Node (jsonwebtoken). Rewriting the backend to Node.js would delay integration by 4-6 weeks with no user-facing benefit.

If a rewrite is desired later, **Option B (Next.js + Prisma)** aligns with HUB and reduces the number of languages in the stack.

---

## 13. Open Questions

1. **Cubes+ `client` role:** How do clients get assigned to coaches? Self-service browse + request? Coach invites client? HUB assigns during booking?
2. **Routine access control:** Can any logged-in user browse the routine library, or only assigned clients? Tier-gated (Free = view, Premium = use)?
3. **Real-time session tracking:** Should Cubes+ show live heart rate during a workout (requires WebSocket from DT to Cubes+), or is post-session review sufficient for V1?
4. **Offline support:** Hotel guests may train in gyms without reliable WiFi. Should Cubes+ support offline routine execution with sync-on-reconnect?
5. **Multi-language routines:** Cubes+ routines need i18n (en/es/ru) to match PATHS. Exercise names and instructions need translation support in the Cubes+ data model.
6. **Video content:** Should exercise demonstrations (video) live in Cubes+ (Cloudinary) or in PATHS (media library)?

---

## 14. References

| Document | Path |
|---|---|
| OS Architecture | `docs/superpowers/specs/2026-03-27-limitless-longevity-os-design.md` |
| Digital Twin Design | `docs/superpowers/specs/2026-03-27-digital-twin-design.md` |
| HUB Design | `docs/superpowers/specs/2026-03-27-hub-design.md` |
| OS Dashboard Design | `docs/superpowers/specs/2026-03-28-os-dashboard-design.md` |
| API Gateway Design | `docs/superpowers/specs/2026-03-28-api-gateway-design.md` |
| Cubes+ Architecture | Memory: `cubes_plus_architecture.md` |
| Cubes+ Integration Plan (legacy) | Memory: `plan_cubes_integration.md` |
| Demo/Pitch Strategy | `docs/superpowers/plans/2026-03-29-demo-pitch-strategy.md` |
