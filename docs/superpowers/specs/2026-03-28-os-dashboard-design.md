# OS Dashboard — Design Spec

**Date:** 2026-03-28
**Status:** Design phase
**Author:** Main Instance (Operator)
**Depends on:** OS design spec, API Gateway spec, HUB spec, Digital Twin spec

---

## 1. Purpose

The OS Dashboard is the **unified entry point** for the LIMITLESS Longevity OS. After login, users land here — not on PATHS or HUB. It aggregates activity across all apps into a single view: health summary, upcoming events, learning progress, and quick actions.

Currently `app.limitless-longevity.health/` serves a temporary landing page. The OS Dashboard replaces it.

### What the Dashboard Is NOT
- Not a standalone app with its own database — it reads from other services
- Not a content management system — no articles, courses, or bookings
- Not the PATHS account page — PATHS keeps its own `/learn/account` for course-specific settings

---

## 2. Architecture Decision: Embedded in Gateway Worker vs Separate App

### Option A: Separate Next.js App (original OS spec plan)
- New repo `limitless-os-dashboard`, deployed to Render/Vercel
- Gateway routes `/` to it
- Full SSR/ISR capabilities
- Its own build pipeline, CI, deployment

### Option B: Cloudflare Worker + Pages (recommended)
- Dashboard is a static site on Cloudflare Pages
- The gateway Worker already serves `/` — extend it to serve the dashboard
- No new Render service ($0 infra cost)
- Cloudflare Pages has free tier (unlimited requests, 500 builds/month)
- API calls to PATHS/HUB/DT happen client-side (fetch from the same `app.` domain — no CORS issues)

**Decision: Option B.** The dashboard has no backend database. It's a lightweight aggregation UI that makes API calls to existing services. Cloudflare Pages is the right fit — same domain, zero latency for the shell, $0 cost.

---

## 3. Pages & Routes

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Dashboard home (logged in) or marketing landing (logged out) | Conditional |
| `/account` | Unified account settings, profile, billing | Yes |
| `/account/billing` | Subscription management, invoices | Yes |
| `/account/privacy` | Data export, account deletion (GDPR) | Yes |

**Unauthenticated visitors** see the marketing landing page (current temp page, enhanced).
**Authenticated visitors** see the personalized dashboard.

The dashboard reads the `payload-token` cookie client-side to determine auth state.

---

## 4. Dashboard Widgets (Authenticated View)

### 4.1 App Launcher
Three cards linking to PATHS, HUB, and CUBES+:

| App | Card Content | Link |
|-----|-------------|------|
| **Learn** (PATHS) | Active courses, recent articles, AI tutor | `/learn` |
| **Book** (HUB) | Upcoming appointments, membership status | `/book` |
| **Train** (CUBES+) | Active routines, coach sessions | `/train` (future) |

Each card shows a summary count fetched from the respective API.

### 4.2 Health Summary
Reads from Digital Twin API (`/api/twin/:userId/summary`):
- Biological age vs chronological age
- Top 3 biomarker highlights (status badges: optimal/normal/borderline)
- Latest wearable data (sleep score, HRV, recovery)
- Pillar priorities visualization

### 4.3 Upcoming Events
Reads from HUB API (`/book/api/me/appointments`):
- Next 3 appointments (date, type, clinician)
- Telemedicine sessions with "Join" button
- Diagnostic bookings

### 4.4 Learning Progress
Reads from PATHS API (`/learn/api/me/enrollments`):
- Active course progress bars
- Recent certificate earned
- Daily protocol adherence streak

### 4.5 Daily Protocol
Reads from PATHS API (`/learn/api/me/protocol`):
- Today's protocol checklist
- Completion status
- "Ask AI Tutor" quick action

### 4.6 Quick Actions Bar
- "Book a Consultation" → `/book/telemedicine`
- "Ask AI Tutor" → `/learn/discover`
- "View Health Profile" → `/learn/account/health` (or future `/health`)
- "Manage Subscription" → `/account/billing`

---

## 5. Unified Account Page

Currently each app has its own account page. The OS Dashboard consolidates:

### `/account`
- Profile info (name, email, phone, DOB) — reads from PATHS user
- Membership tier display
- Connected apps overview
- Connected wearable devices (reads from Digital Twin)

### `/account/billing`
- Current subscription (PATHS tier + HUB membership if any)
- Payment method (Stripe customer portal link)
- Invoice history
- Upgrade/downgrade buttons

### `/account/privacy` (GDPR)
- "Download My Data" — triggers export from all services, bundles into ZIP
- "Delete My Account" — triggers cascading delete (Section 4.5 of OS spec)
- Data processing consent management
- Connected third-party services

---

## 6. Technical Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Hosting** | Cloudflare Pages | Same domain as gateway, free tier, zero Render cost |
| **Framework** | Next.js 15 (static export) | SSG for shell, client-side API calls for data |
| **Styling** | Tailwind + brand tokens | Consistent with PATHS/HUB |
| **Auth** | Client-side cookie read | `payload-token` cookie → decode JWT → render user UI or landing |
| **API calls** | Client-side fetch | All APIs are same-origin via gateway — no CORS |
| **State** | React Context or Zustand | Lightweight, no server state needed |

### Build & Deploy
```bash
pnpm build    # Next.js static export
pnpm deploy   # Cloudflare Pages deploy (wrangler pages deploy)
```

### Directory Structure
```
limitless-os-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard (auth) or Landing (unauth)
│   │   ├── account/
│   │   │   ├── page.tsx               # Profile + settings
│   │   │   ├── billing/page.tsx       # Subscription management
│   │   │   └── privacy/page.tsx       # GDPR controls
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── AppLauncher.tsx
│   │   │   ├── HealthSummary.tsx
│   │   │   ├── UpcomingEvents.tsx
│   │   │   ├── LearningProgress.tsx
│   │   │   ├── DailyProtocol.tsx
│   │   │   └── QuickActions.tsx
│   │   ├── landing/
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   └── CTAs.tsx
│   │   └── ui/
│   │       └── GlassCard.tsx
│   ├── lib/
│   │   ├── auth.ts                    # Cookie decode, no verification (client-side)
│   │   ├── api.ts                     # Fetch helpers for PATHS/HUB/DT APIs
│   │   └── types.ts                   # Shared response types
├── CLAUDE.md
├── package.json
├── next.config.ts
└── tailwind.config.ts
```

---

## 7. API Dependencies

The dashboard consumes these endpoints (all same-origin via gateway):

| Widget | Endpoint | Source |
|--------|----------|--------|
| Health Summary | `GET /api/twin/:userId/summary` | Digital Twin |
| Upcoming Events | `GET /book/api/me/appointments` | HUB |
| Membership Status | `GET /book/api/me/membership` | HUB |
| Learning Progress | `GET /learn/api/me/enrollments` | PATHS (needs endpoint) |
| Daily Protocol | `GET /learn/api/me/protocol` | PATHS (needs endpoint) |
| Profile | `GET /learn/api/users/:id` | PATHS |
| Billing | Stripe Customer Portal link | via PATHS/HUB billing APIs |
| Data Export | `GET /learn/api/users/:id/export` + `GET /api/twin/:userId/export` + `GET /book/api/me/export` | All 3 |
| Account Delete | `DELETE /learn/api/users/:id` (triggers cascade) | PATHS orchestrates |

### Endpoints That Need to Be Created
- `GET /learn/api/me/enrollments` — PATHS: list active enrollments with progress %
- `GET /learn/api/me/protocol` — PATHS: today's daily protocol with completion status
- `GET /book/api/me/export` — HUB: GDPR data export

---

## 8. Gateway Integration

The gateway Worker currently serves a temp landing page at `/`. When the dashboard is ready:

1. Deploy dashboard to Cloudflare Pages (gets a `*.pages.dev` URL)
2. Update gateway Worker: route `/` and `/account/*` to the Pages deployment
3. Remove the inline `LANDING_HTML` from the Worker

Alternatively, the dashboard can be built directly into the Worker as a static site (no separate Pages deployment). Since it's a static export, the HTML/CSS/JS can be served from the Worker's edge — zero additional infrastructure.

---

## 9. Design

Same "Scientific Luxury" aesthetic:
- Dark background (`bg-brand-dark`)
- Gold accents (`text-brand-gold`)
- Glassmorphism cards
- Cormorant Garamond headings + Inter body
- Responsive: mobile-first (many users will check from phone)

### Dashboard Layout
```
┌─────────────────────────────────────────────────────┐
│  LIMITLESS          [Account] [Notifications] [Tier]│
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │  Learn   │  │  Book   │  │  Train  │   App       │
│  │ 2 active │  │ 1 appt  │  │ Coming  │   Launcher  │
│  │ courses  │  │ next wk │  │  soon   │             │
│  └─────────┘  └─────────┘  └─────────┘             │
│                                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐ │
│  │   Health Summary     │  │   Upcoming Events    │ │
│  │   Bio age: 38 (43)   │  │   Mar 30 - Tele...  │ │
│  │   ● Cholesterol ↓    │  │   Apr 5 - DEXA...   │ │
│  │   ● HRV: 42ms       │  │   Apr 12 - Coach... │ │
│  └──────────────────────┘  └──────────────────────┘ │
│                                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐ │
│  │  Learning Progress   │  │   Daily Protocol     │ │
│  │  Sleep Science 67%   │  │   ☑ Morning HRV     │ │
│  │  Nutrition 101 23%   │  │   ☐ 30min walk      │ │
│  │  🏆 Cert earned!     │  │   ☐ Supplements     │ │
│  └──────────────────────┘  └──────────────────────┘ │
│                                                      │
│  [ Book Consultation ] [ Ask AI Tutor ] [ Health ]  │
└─────────────────────────────────────────────────────┘
```

---

## 10. Implementation Phases

### Phase A: Static Landing Enhancement (1-2 days)
- Enhance the current temp landing page with marketing content
- Add login button → redirects to `/learn/login?redirect=/`
- After login, show basic dashboard with app launcher cards
- No API integrations yet — just navigation

### Phase B: Core Dashboard (3-5 days)
- Health Summary widget (Digital Twin API)
- Upcoming Events widget (HUB API)
- Learning Progress widget (PATHS API — needs new endpoint)
- Quick Actions bar
- Responsive layout

### Phase C: Unified Account (2-3 days)
- `/account` page — profile, tier, connected services
- `/account/billing` — Stripe customer portal integration
- `/account/privacy` — GDPR export + delete

### Phase D: Polish (2-3 days)
- Notifications system (bell icon, unread count)
- Cross-app search (federated search widget)
- Performance optimization (prefetch, skeleton loading)
- PWA manifest (home screen installable)

---

## 11. Open Questions

1. **Cloudflare Pages vs Worker-embedded:** Should the dashboard be a separate Cloudflare Pages deployment or built into the Worker? Pages is simpler for development; Worker-embedded has lower latency.
2. **CUBES+ card:** CUBES+ isn't migrated yet. Show a "Coming Soon" card or hide it?
3. **Notification service:** The dashboard needs a notification bell. Where do notifications come from? Each app pushes to a shared store, or the dashboard polls each app?
4. **Mobile layout:** Dashboard on phone — tabs or scrollable cards?
5. **Post-login redirect flow:** User logs in at `/learn/login?redirect=/` → cookie set → redirected to `/` → dashboard detects cookie → renders personalized view. Does this work with `basePath: '/learn'`?
