# Workbench Handoff Batch 6 — 2026-03-28

OS Dashboard implementation. Two tasks in sequence.

**Spec:** `docs/superpowers/specs/2026-03-28-os-dashboard-design.md` (read this first)
**Gateway spec:** `docs/superpowers/specs/2026-03-28-api-gateway-design.md`

---

## Task 1: PATHS API Endpoints for Dashboard

The OS Dashboard needs two new endpoints from PATHS that don't exist yet.

### 1A. Enrollments Endpoint

`GET /learn/api/me/enrollments`

Returns the authenticated user's active course enrollments with progress percentage.

```typescript
// Response shape
{
  enrollments: [
    {
      id: string,
      course: { id: string, title: string, slug: string, thumbnail?: string },
      progress: number,        // 0-100
      completedLessons: number,
      totalLessons: number,
      enrolledAt: string,
      lastAccessedAt?: string,
      certificate?: { id: string, issuedAt: string } | null
    }
  ],
  totalActive: number,
  totalCompleted: number
}
```

**Implementation hints:**
- Use `payload.find()` on `enrollments` collection filtered by `user: req.user.id`
- Join with `courses` to get title/slug/thumbnail
- Calculate progress from `lesson-progress` collection: completed lessons / total lessons in course
- Use `payload.count()` for efficient totals

### 1B. Daily Protocol Endpoint

`GET /learn/api/me/protocol`

Returns today's daily protocol for the authenticated user with completion status.

```typescript
// Response shape
{
  date: string,              // YYYY-MM-DD
  protocol: {
    id: string,
    title: string,
    items: [
      {
        id: string,
        text: string,        // "Morning HRV measurement"
        category: string,    // "measurement", "exercise", "supplement", "mindfulness"
        completed: boolean,
        completedAt?: string
      }
    ],
    completionRate: number   // 0-100
  } | null                   // null if user has no active protocol
}
```

**Implementation hints:**
- Check if PATHS has a `protocols` or `daily-protocols` collection
- If not, this may need to read from the AI-generated action plans
- If no protocol system exists yet, return `{ protocol: null }` with a 200 — the dashboard handles empty state gracefully

### Verification
- `pnpm build` passes
- `GET /learn/api/me/enrollments` with valid JWT → returns enrollment data
- `GET /learn/api/me/protocol` with valid JWT → returns protocol or null
- Both endpoints return 401 without auth

---

## Task 2: OS Dashboard — Scaffold + Phases A-B

### 2A. Scaffold New Repo

Create `limitless-os-dashboard/` with:
- Next.js 15 (static export mode — `output: 'export'` in next.config.ts)
- Tailwind + LIMITLESS brand tokens (copy from PATHS/HUB)
- CLAUDE.md
- No database, no backend — pure frontend

**Important:** This is NOT a Render service. It deploys to Cloudflare Pages. No Terraform needed initially — just `wrangler pages deploy` or connect GitHub for auto-deploy.

For now, develop locally and we'll set up Cloudflare Pages deployment after the code is ready.

### 2B. Phase A — Enhanced Landing + Auth Detection

Replace the inline HTML in the gateway Worker with a real app:

1. **Unauthenticated view** (`/`):
   - LIMITLESS branding (hero)
   - What is the Longevity OS (brief)
   - App cards: Learn, Book, Train (with descriptions)
   - "Log In" button → `/learn/login?redirect=/`
   - "Get Started" button → `/learn/register?redirect=/`

2. **Authenticated view** (`/`):
   - Read `payload-token` cookie client-side
   - Decode JWT (don't verify — client-side can't, and cookie is HttpOnly... see note below)
   - Show personalized dashboard with app launcher cards

**Auth note:** `payload-token` is `HttpOnly` — JavaScript can't read it. Two options:
- **Option A:** Add a lightweight `/learn/api/me` call on page load — if 200, user is logged in, use response data. If 401, show landing.
- **Option B:** PATHS sets an additional non-HttpOnly cookie (e.g., `limitless-auth=1`) alongside the HttpOnly one. Dashboard reads that for quick auth detection, then fetches full user data.
- **Recommended: Option A.** Simpler, no PATHS changes needed. Single fetch to determine auth state.

3. **App Launcher cards:**
   - "Learn" → `/learn` with enrollment count badge
   - "Book" → `/book` with upcoming appointment count badge
   - "Train" → `/train` with "Coming Soon" badge

### 2C. Phase B — Widget Integration

Connect dashboard widgets to live APIs:

1. **Health Summary** — `GET /api/twin/:userId/summary`
   - Biological age vs chronological age
   - Top 3 biomarker highlights
   - Latest wearable summary (if connected)
   - Empty state if no health data

2. **Upcoming Events** — `GET /book/api/me/appointments`
   - Next 3 appointments
   - "Join" button for telemedicine sessions
   - Empty state: "No upcoming appointments" + "Book Now" CTA

3. **Learning Progress** — `GET /learn/api/me/enrollments`
   - Active course progress bars
   - Most recent certificate
   - Empty state: "Start your first course" CTA

4. **Daily Protocol** — `GET /learn/api/me/protocol`
   - Checklist with completion toggles
   - Completion rate percentage
   - Empty state: "Generate a protocol with AI Tutor" CTA

5. **Quick Actions bar:**
   - "Book Consultation" → `/book/telemedicine`
   - "Ask AI Tutor" → `/learn/discover`
   - "View Health Profile" → `/book/dashboard/health`
   - "Manage Subscription" → `/book/dashboard/membership`

### Design Requirements
- Same "Scientific Luxury" aesthetic as PATHS/HUB
- Brand tokens: `bg-brand-dark`, `text-brand-gold`, `text-brand-teal`
- Glassmorphism cards (`backdrop-blur` + `-webkit-backdrop-filter` inline style)
- Responsive: mobile-first (phone is primary use case for dashboard)
- Skeleton loading states for each widget while APIs load
- Cormorant Garamond headings + Inter body

### Verification
- `pnpm build` passes (static export)
- `/` unauthenticated → shows landing with Login/Get Started buttons
- `/` authenticated (after login via PATHS) → shows personalized dashboard
- All widgets show empty states gracefully when APIs return no data
- All widget links navigate correctly (`/learn/*`, `/book/*`)
- Responsive at 375px and 1440px

---

## Gateway Integration (after dashboard is built)

Once the dashboard is ready to deploy:
1. Deploy to Cloudflare Pages
2. Update gateway Worker: route `/` to the Pages deployment instead of inline HTML
3. Route `/account/*` to the Pages deployment
4. This step will be a separate handoff after we verify the dashboard locally

---

## Priority

1. **Task 1** first (PATHS endpoints) — dashboard depends on these APIs
2. **Task 2** after Task 1 merges — scaffold + build the dashboard
