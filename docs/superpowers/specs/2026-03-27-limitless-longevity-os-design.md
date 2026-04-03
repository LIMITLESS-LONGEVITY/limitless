# LIMITLESS Longevity OS — Platform Architecture Design

**Date:** 2026-03-27
**Status:** Build phase — Phase 1 in progress (HUB live, Digital Twin scaffolded, PATHS stable)
**Author:** Main Instance (Operator)
**Scope:** Defines the LIMITLESS Longevity OS, its services, architecture, and migration path

---

## 1. Vision

### What Is the Longevity OS?

The LIMITLESS Longevity OS is the **unified platform layer** that connects education, diagnostics, clinical care, coaching, and lifestyle optimization into a single longevity journey. It is not a health app — it is the operating system upon which multiple specialized apps run, sharing identity, health data, billing, and a unified user experience.

> **The pitch:** "Most longevity companies sell one thing — tests, courses, or consultations. LIMITLESS connects all of them into a closed loop: Learn → Diagnose → Understand → Act → Re-Diagnose. The Longevity OS is what makes that loop possible."

### Why an OS, Not a Suite?

A suite is a collection of apps that happen to share a brand. An OS is a platform that provides **shared services** no individual app could provide alone:

| What a Suite Does | What an OS Does |
|-------------------|-----------------|
| Shared branding | **Shared identity** — one account, one login, one profile |
| Links between apps | **Shared health data** — biomarkers flow between education, clinical, and coaching |
| Separate billing | **Unified billing** — one subscription unlocks features across all apps |
| Independent dashboards | **Unified dashboard** — one view of your entire longevity journey |
| Per-app notifications | **Cross-app orchestration** — completing a course triggers a diagnostic suggestion in HUB |

### The LIMITLESS Moat

LIMITLESS is not a software company that built an app. It is a **longevity consultancy** that integrates into existing hospitals and hotels, providing turnkey longevity solutions. The technology platform (the OS) is what enables this integration at scale.

The moat has five pillars that no single competitor combines:

```
┌──────────────────────────────────────────────────────────────────────┐
│                       LIMITLESS LONGEVITY OS                         │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │  HOSPITAL  │  │   HOTEL    │  │ EDUCATION  │  │  AI ENGINE   │  │
│  │ Recoletas  │  │ El Fuerte  │  │   PATHS    │  │ Digital Twin │  │
│  │   Salud    │  │  Marbella  │  │   LMS      │  │ RAG + Coach  │  │
│  │            │  │            │  │            │  │              │  │
│  │ 3T MRI     │  │ Longevity  │  │ Courses    │  │ Health-aware │  │
│  │ DEXA/VO2   │  │ Suites     │  │ Articles   │  │ Tutor        │  │
│  │ 100+ bio   │  │ Wearables  │  │ Quizzes    │  │ Action Plans │  │
│  │ Genomics   │  │ Coaching   │  │ Certs      │  │ Protocols    │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘  │
│        │               │               │                 │          │
│        └───────────────┴───────┬───────┴─────────────────┘          │
│                                │                                     │
│                   ┌────────────┴────────────┐                        │
│                   │   DIGITAL TWIN          │                        │
│                   │   (Health Profile +     │                        │
│                   │    Biomarkers +          │                        │
│                   │    Wearable Data)        │                        │
│                   └─────────────────────────┘                        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  5TH PILLAR: B2B CONSULTANCY                                │    │
│  │  Turnkey longevity center design for hospitals & hotels      │    │
│  │  Staff training, protocol development, financial modeling    │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### The Real Business Model

LIMITLESS operates at three revenue levels:

| Level | Service | Revenue | Platform Role |
|-------|---------|---------|---------------|
| **B2B Consultancy** | Turnkey longevity center design for hospitals/hotels | Project fees + revenue share | Corporate website + sales |
| **Physical Center** | Longevity center at Hospital Recoletas (memberships €180-280/mo, diagnostics €800-3,500, hotel packages €3,500-9,500) | Recurring membership + per-service | HUB (booking, scheduling, patient portal) |
| **Digital Platform** | PATHS (education), e-Clinic (telemedicine €99/mo), AI coaching | SaaS subscriptions | PATHS + OS dashboard |

The Longevity OS is the **technology layer that enables all three levels** — from the hotel pilot program's cloud platform (Fuerte Group brief) to the Recoletas center's AI-driven Digital Twin to the global e-Clinic telemedicine channel.

### The Longevity Journey (The Closed Loop)

The OS's unique value is enabling a continuous cycle that no competitor offers end-to-end:

```
     ┌──── LEARN (PATHS) ────┐
     │  Courses, articles,    │
     │  AI tutor, protocols   │
     ▼                        │
ASSESS ◄───────────────── ACT │
Diagnostics at        Daily protocols,  │
Recoletas (HUB)       coaching (CUBES+) │
     │                        ▲
     ▼                        │
UNDERSTAND ──────────────────┘
AI Digital Twin analyzes results,
personalizes next learning path
```

### Who Uses What?

| User Type | Primary App | Also Uses | Real-World Context |
|-----------|-------------|-----------|-------------------|
| Individual learner | PATHS | OS dashboard | Online subscriber exploring longevity science |
| Executive client | OS dashboard | PATHS, HUB | Recoletas member (€220/mo) with quarterly diagnostics |
| Hotel guest | HUB | PATHS (prep courses) | El Fuerte Marbella 5-day Immersion (€6,500) |
| Pilot participant | HUB | PATHS (assessment) | Fuerte Group pilot: lifestyle assessment + cloud platform |
| Longevity coach | CUBES+ | PATHS, HUB | Ken Mitelman building client routines + hotel workshops |
| Hotel staff | PATHS (B2B) | - | "LIMITLESS Certified Longevity Concierge" training |
| Hospital clinician | HUB | PATHS | Dr. Uchitel reviewing patient Digital Twin before consult |
| Family (parents + kids) | HUB + PATHS | OS dashboard | Pediatric longevity program — first in Spain |
| E-Clinic subscriber | OS dashboard | PATHS, HUB | €99/mo global telemedicine + AI coaching |
| Organization admin | OS dashboard | PATHS, HUB | Corporate wellness (€120/employee/mo, min 20) |
| B2B partner (hotel GM) | Corporate site | HUB (reporting) | Fuerte Group receiving pilot results report |

---

## 2. Service Taxonomy

### The Five Services

```
                    ┌──────────────────────────────┐
                    │     LIMITLESS LONGEVITY OS    │
                    │   os.limitless-longevity.health│
                    │                              │
                    │  Dashboard · Identity · Health│
                    │  Billing · Notifications      │
                    └──────┬───────────┬───────────┘
                           │           │
          ┌────────────────┼───────────┼────────────────┐
          │                │           │                │
    ┌─────┴─────┐   ┌─────┴─────┐  ┌──┴──────┐  ┌─────┴─────┐
    │   PATHS   │   │    HUB    │  │ CUBES+  │  │ Corporate │
    │   Learn   │   │   Book    │  │  Train  │  │   Brand   │
    │           │   │           │  │         │  │           │
    │ Courses   │   │ Stays     │  │Routines │  │ Website   │
    │ Articles  │   │Telemedicine│ │Programs │  │ About     │
    │ AI Tutor  │   │Diagnostics│  │Coaching │  │ Contact   │
    │ Quizzes   │   │ Booking   │  │         │  │           │
    │ Certs     │   │ Sales     │  │         │  │           │
    └───────────┘   └───────────┘  └─────────┘  └───────────┘
```

| Service | Domain | Stack | Purpose |
|---------|--------|-------|---------|
| **Longevity OS** | `os.limitless-longevity.health` | Next.js + lightweight backend | Dashboard, app launcher, Digital Twin health summary, unified account, shared platform services |
| **PATHS** | `paths.limitless-longevity.health` | Payload CMS 3.x + Next.js + PostgreSQL | LMS — courses, articles, AI tutor, quizzes, certificates, content discovery, staff training (B2B) |
| **HUB** | `hub.limitless-longevity.health` | Next.js + backend (TBD) | Clinical & hospitality — center memberships (€180-280/mo), diagnostics (€800-3,500), hotel stay packages (€3,500-9,500), telemedicine/e-clinic (€99/mo), appointment scheduling, patient portal |
| **CUBES+** | `cubes.limitless-longevity.health` | Next.js + FastAPI + PostgreSQL | Training routine builder for longevity coaches — workshop programming, client routines, hotel activity planning |
| **Corporate** | `limitless-longevity.health` | Static HTML (GitHub Pages) | B2B consultancy positioning — turnkey longevity center design for hospitals & hotels |

### Service Boundaries — The Rule

> **PATHS** handles anything where you **learn** something (courses, articles, AI tutor, certifications).
> **HUB** handles anything where you **book or manage** something clinical or hospitality (memberships, diagnostics, stays, telemedicine, scheduling).
> **CUBES+** handles anything where you **build** a training routine or coaching program.
> **OS** handles anything **shared** across apps (identity, Digital Twin, billing, notifications, wearable data).
> **Corporate** handles B2B **sales** (consultancy briefs, partnership inquiries).

### HUB: More Than Booking

The project briefs reveal that HUB needs to be significantly more substantial than originally planned. It's not just a booking form — it's the **patient-facing portal for the Recoletas longevity center**:

| HUB Feature | Source | Description |
|-------------|--------|-------------|
| **Membership management** | Recoletas business plan | Optimus/Immortalitas/Transcendentia/VIP tiers, monthly billing |
| **Diagnostic scheduling** | Both briefs | Comprehensive (€800) and Executive (€2,500) packages, calendar booking |
| **Hotel stay packages** | Both briefs | 3/5/7-day programs with partner hotel coordination |
| **Appointment calendar** | Recoletas plan | Coach sessions, specialist consults, group classes (14hr/day, 7 days/week) |
| **Wearable data dashboard** | Fuerte brief | Oura Ring, Whoop — sleep tracking, HRV, activity data during stays |
| **E-Clinic portal** | Recoletas plan | €99/mo telemedicine, AI coaching, diagnostics review from local labs |
| **Hotel partner portal** | Fuerte brief | Concierge integration, referral tracking, revenue sharing |
| **Pilot results dashboard** | Fuerte brief | Guest engagement, satisfaction scores, health outcome indicators |
| **Family programs** | Recoletas plan | Pediatric longevity — age-adapted activities, family health tracking |
| **Corporate wellness portal** | Recoletas plan | €120/employee/mo, group enrollment, quarterly health reports |

---

## 3. Feature Separation — PATHS → HUB

### What Moves to HUB

| Feature | Current PATHS Route | HUB Route | Endpoint |
|---------|-------------------|-----------|----------|
| Longevity Stay Packages | `/stays` | `/stays` | `POST /api/stay-booking` |
| Telemedicine Consultations | `/telemedicine` | `/telemedicine` | `POST /api/telemedicine-booking` |
| Diagnostic Packages | `/diagnostics` | `/diagnostics` | `POST /api/diagnostic-booking` |
| Enterprise Sales | `/contact-sales` | `/contact-sales` | `POST /api/contact-sales` |

### What Stays in PATHS

| Feature | Route | Why It Stays |
|---------|-------|-------------|
| Courses, Modules, Lessons | `/courses/*` | Core LMS |
| Articles | `/articles/*` | Educational content |
| AI Tutor | Sidebar panel | Learning tool |
| Quizzes | Inline in content | Assessment |
| Certificates | `/account/certificates` | Course completion credential |
| Content Discovery | `/discover` | Learning path recommendation |
| Search | `/search` | Content search |
| Platform Guide | `/guide` | User documentation |
| Action Plans | `/account/plans` | AI-generated from course completion |
| Daily Protocols | Dashboard widget | Personalized from health data |
| Enrollments & Progress | `/account/courses` | Learning tracking |

### Bridge Features (Shared via OS)

| Feature | Currently In | Used By | OS Solution |
|---------|-------------|---------|-------------|
| **Health Profiles** | PATHS DB | PATHS (AI tutor), HUB (telemedicine) | OS Health Data API — PATHS writes, HUB reads |
| **User Accounts** | PATHS (Payload) | All apps | OS Identity — PATHS remains auth authority, cookie SSO |
| **Billing** | PATHS (Stripe) | PATHS + HUB | OS Billing — single subscription, tier in JWT claims |
| **Membership Tiers** | PATHS DB | PATHS + HUB (pricing) | Tier resolution via JWT or API |

### AI Tutor Escalation After Separation

Currently, the AI tutor escalates to `/telemedicine` (internal PATHS route). After separation:
- Tutor shows same gold CTA card
- "Book a Consultation" links to `https://hub.limitless-longevity.health/telemedicine`
- Booking form on HUB reads health data via OS Health Data API
- User stays authenticated via cookie SSO — seamless cross-app transition

---

## 4. Shared Platform Services

### 4.1 Identity & Authentication

```
User → Login at any app → PATHS auth endpoint
                              │
                              ├→ Issues JWT token
                              ├→ Sets HttpOnly cookie
                              │  Domain: .limitless-longevity.health
                              │
                              └→ Cookie sent to ALL subdomains automatically
                                  │
                    ┌───────────────┼───────────────┐
                    │               │               │
                OS Dashboard    HUB app        CUBES+ app
                (validates)    (validates)    (validates)
```

**Current state:** PATHS is auth authority. Cookie SSO works.
**Phase 1:** Keep PATHS as auth authority. All apps validate the JWT cookie.
**Phase 3+:** Extract auth to standalone OS Identity Service (when 4+ apps exist).

### 4.2 Digital Twin — Standalone Microservice

The **Digital Twin** is LIMITLESS's AI-created health model for each user. It is the central shared resource of the OS — the single source of truth for a user's health state across all apps. The concept comes from the Recoletas business plan: "Every patient has an AI-created Digital Twin health profile that tracks progress and refines plans."

**Architecture decision: Standalone microservice from day 1.**

The Digital Twin is a cross-cutting concern consumed by every app (PATHS, HUB, CUBES+, OS). It receives writes from 5+ sources (user self-reports, diagnostic results, wearable streams, AI insights, clinician annotations). It has its own data model, access patterns (time-series for wearables, point reads for AI), scaling profile, and security requirements (health data privacy, GDPR). These are the four signals that Domain-Driven Design uses to identify a natural service boundary. Embedding it in any single app creates asymmetric coupling where one app becomes a single point of failure for all others — and the cost of extracting later always exceeds building separately now.

**What the Digital Twin contains:**

| Data Type | Source | Used By |
|-----------|--------|---------|
| Biomarker values + trends | User entry, diagnostic imports | AI tutor, protocols, action plans, clinician review |
| Health goals | User self-reported | Content discovery, protocol generation, AI coaching |
| Conditions + medications | User self-reported | AI tutor (avoid conflicts), clinician context |
| Pillar priorities | User-ranked | Protocol weighting, content recommendations |
| Wearable data streams | Oura Ring, Whoop, Apple Watch, Garmin | Real-time HRV, sleep quality, activity, recovery |
| Diagnostic results | Hospital systems (HUB) | Longitudinal tracking, AI re-analysis, learning paths |
| Genomic/epigenetic data | Executive diagnostic package | Personalized risk, biological age |
| Course completions + quiz scores | PATHS | AI coaching context, action plan generation |
| Protocol adherence | PATHS (daily check-offs) | AI plan refinement, clinician review |

**Technical stack:**

```
digital-twin-api.limitless-longevity.health

Runtime:    Node.js (same expertise as PATHS)
Framework:  Fastify or Express (no CMS overhead)
ORM:        Drizzle (type-safe, same as PATHS)
Database:   PostgreSQL + TimescaleDB extension (Frankfurt)
            TimescaleDB for time-series wearable data
            Standard tables for biomarkers, goals, conditions
Auth:       Validates .limitless-longevity.health JWT cookie
API:        REST + WebSocket (real-time wearable streams)
Infra:      Render web service, Terraform module
```

**Why TimescaleDB:** Wearable data is fundamentally time-series (heart rate every 5 min, sleep stages per night, HRV per day). Standard relational models struggle at scale; TimescaleDB handles this natively while staying PostgreSQL-compatible.

**API surface:**

```
GET  /api/twin/:userId/summary           → Health summary for dashboards
GET  /api/twin/:userId/biomarkers        → Biomarker values + trends
GET  /api/twin/:userId/wearables         → Latest wearable data
GET  /api/twin/:userId/diagnostics       → Diagnostic history
POST /api/twin/:userId/biomarkers        → User/clinician writes
POST /api/twin/:userId/diagnostics       → Hospital result import (HUB)
POST /api/twin/:userId/goals             → Update health goals
WS   /api/twin/:userId/stream            → Real-time wearable data ingest
```

**Migration path from current state:**
1. Build the Digital Twin service with the API surface above
2. Migrate HealthProfiles data from PATHS PostgreSQL to Digital Twin database
3. Update PATHS `buildHealthContextSection` to call Digital Twin API instead of local DB
4. Remove HealthProfiles collection from PATHS
5. HUB and OS consume the same API from day 1

**Design principles:**
- **Write access:** User (via any app UI), clinicians (via HUB), wearable integrations (via WebSocket)
- **Read access:** User's own apps + authorized clinicians (via authenticated API)
- **Never indexed in search:** Health data never enters any app's RAG/content search pipeline
- **Privacy by default:** Each app requests only what it needs; full raw data only for the user and their clinician
- **GDPR-ready:** Data residency in Frankfurt, right to deletion, export capability

### 4.3 Unified Billing

One subscription unlocks features across apps:

| Tier | PATHS Access | HUB Access | CUBES+ Access |
|------|-------------|------------|---------------|
| Free | Free articles, 10 searches/day | Browse packages | View routines |
| Regular (€15/mo) | All content, 10 AI conversations/day | Telemedicine €99/session | Build routines |
| Premium (€30/mo) | All content, 50 AI/day, health profile, protocols | Telemedicine included, 10% diagnostic discount | Full access |
| Enterprise | Everything + B2B | Everything + priority booking | Everything + team mgmt |

**Implementation:** Tier stored in JWT claims. Each app reads the tier from the cookie — no API call needed for basic access checks.

### 4.4 Notification Service

| Event | Source App | Notification | Channel |
|-------|-----------|-------------|---------|
| Course completed | PATHS | "Generate an action plan?" | In-app + email |
| Stay booked | HUB | Confirmation + prep course enrollment | Email + PATHS enrollment |
| Diagnostic results | HUB | "View your results in Health Profile" | Email + OS dashboard |
| Telemedicine scheduled | HUB | Calendar invite + prep content | Email |
| Streak milestone | PATHS | "7-day streak! Keep it up" | In-app |
| Certificate earned | PATHS | Share prompt | In-app + email |

**Phase 1:** Each app sends its own emails via Resend.
**Phase 3+:** Extract to shared notification service with templates.

### 4.5 GDPR Cascading Delete — User Erasure Across Services

When a user requests account deletion (GDPR Article 17 — Right to Erasure), all services must purge their data. PATHS is the auth authority, so deletion initiates there.

**Flow:**

```
User requests deletion (PATHS /account/delete)
    │
    ├─ 1. PATHS deletes local user data
    │     (courses, enrollments, progress, certificates,
    │      AI conversations, content chunks, health profile)
    │
    ├─ 2. PATHS calls DELETE /api/twin/:userId
    │     → Digital Twin cascades: profile, biomarkers,
    │       diagnostics, wearables, genomics, activity log
    │
    ├─ 3. PATHS calls DELETE /api/book/internal/user/:userId
    │     → HUB cascades: bookings, membership, appointments,
    │       contact inquiries, local user cache
    │
    ├─ 4. PATHS calls Stripe API
    │     → Cancel active subscriptions
    │     → Delete customer (or retain for legal invoicing period)
    │
    ├─ 5. PATHS invalidates JWT
    │     → Clear cookie on .limitless-longevity.health
    │
    └─ 6. Confirmation email via Resend
          → "Your data has been deleted across all LIMITLESS services"
```

**Design decisions:**
- **PATHS orchestrates** — it's the auth authority and has the user's primary record. When auth service is extracted (Phase 3+), the OS Identity Service takes over orchestration.
- **Synchronous cascade** — deletion waits for all services to confirm before responding. If any service fails, the request fails and the user is notified to retry. No partial deletions.
- **Service-to-service auth** — internal deletion endpoints use API key auth (`Authorization: Bearer <INTERNAL_API_KEY>`), not JWT. The user's JWT may already be invalid.
- **Stripe retention** — Stripe requires invoice records for legal compliance. Cancel subscriptions and delete payment methods, but Stripe customer record may persist per their retention policy.
- **Audit log** — log the deletion event (timestamp, services confirmed) but NOT the deleted data. Retain for 30 days for support purposes.

**Endpoints each service needs:**

| Service | Endpoint | What it deletes |
|---------|----------|----------------|
| PATHS | `DELETE /api/users/:id` (admin/self) | User, enrollments, progress, certificates, AI conversations, content chunks, health profile |
| Digital Twin | `DELETE /api/twin/:userId` | Already spec'd — cascades all tables |
| HUB | `DELETE /api/book/internal/user/:userId` | User cache, bookings, membership, appointments, inquiries |

**Data export (Right to Portability — Article 20):**
Before deletion, user can request export. Each service provides its own export endpoint:
- PATHS: `GET /api/users/:id/export`
- Digital Twin: `GET /api/twin/:userId/export` (already spec'd)
- HUB: `GET /api/book/internal/user/:userId/export`

The OS Dashboard (when built) aggregates these into a single ZIP download.

**Implementation timeline:** Phase 2-3 (after booking flows and Digital Twin API are stable). Each service implements its own deletion endpoint first; PATHS orchestration comes last.

---

## 5. Technical Architecture

### 5.1 Domain Map

```
limitless-longevity.health              → GitHub Pages (corporate site)
os.limitless-longevity.health           → Longevity OS dashboard (Vercel)
paths.limitless-longevity.health        → PATHS LMS (Render)
paths-api.limitless-longevity.health    → PATHS API (Render, same service)
hub.limitless-longevity.health          → HUB (Vercel or Render)
hub-api.limitless-longevity.health      → HUB API (Render)
cubes.limitless-longevity.health        → CUBES+ frontend (Vercel)
cubes-api.limitless-longevity.health    → CUBES+ API (Render)
```

### 5.2 Data Architecture

```
┌─────────────────────┐   ┌─────────────────────┐   ┌────────────────┐
│ PATHS PostgreSQL    │   │ HUB PostgreSQL      │   │ CUBES+ PG      │
│                     │   │                     │   │                │
│ Users (auth)        │   │ StayBookings        │   │ Users (linked) │
│ Courses/Modules/    │   │ TelemedicineBookings│   │ Cubes          │
│   Lessons           │   │ DiagnosticBookings  │   │ Routines       │
│ Articles            │   │ ContactInquiries    │   │ SuperRoutines  │
│ Enrollments         │   │ Appointments        │   │                │
│ HealthProfiles ◄────┼───┤ (reads via API)     │   │                │
│ ContentChunks       │   │                     │   │                │
│ Certificates        │   │                     │   │                │
│ MembershipTiers     │   │                     │   │                │
│ Subscriptions       │   │                     │   │                │
│ Stripe/Billing      │   │                     │   │                │
└─────────────────────┘   └─────────────────────┘   └────────────────┘
         ▲                         ▲                        ▲
         │                         │                        │
         └────────────┬────────────┘────────────────────────┘
                      │
              Cookie SSO via
          .limitless-longevity.health
```

### 5.3 OS Dashboard Architecture

The OS dashboard is a **lightweight Next.js app** that aggregates data from all services:

```
OS Dashboard
├── App Launcher (PATHS, HUB, CUBES+ cards with activity counts)
├── Health Summary (reads from PATHS Health Data API)
├── Upcoming Events (reads from HUB bookings)
├── Learning Progress (reads from PATHS enrollments)
├── Unified Account (profile, billing, tier)
└── Cross-App Search (federated search across all apps)
```

**Stack:** Next.js (App Router) + Tailwind + brand tokens. No backend database — reads from other services via API. Deployed on Vercel (static + ISR).

### 5.4 Infrastructure (Terraform)

Extend existing Terraform with:
```hcl
# In limitless-infra/
hub.tf           # HUB Render service + PostgreSQL + DNS
os-dashboard.tf  # OS dashboard Vercel project + DNS
```

All services in Frankfurt (EU) for GDPR compliance.

---

## 6. Competitive Positioning

### Market Landscape

| Company | Model | Revenue | What They Do |
|---------|-------|---------|-------------|
| Fountain Life | Physical centers + digital | $21.5K/yr subscription | Diagnostics + physician coordination |
| Human Longevity Inc | Membership + centers | Undisclosed | Genome sequencing + MRI + biomarkers |
| Viome | DTC testing + supplements | Per-test + subscription | RNA analysis + personalized supplements |
| InsideTracker | DTC biomarker testing | $119-599/test | Blood biomarkers + wearable data + recommendations |
| Lifeforce | Telehealth + biomarkers | Subscription | Biomarker testing + clinician consults + pharma access |
| Neko Health | Physical scanning | £299/scan | 70+ sensor full-body scan, AI analysis |
| Wild Health | Genomics + telehealth | Subscription | Genetics-first functional medicine |
| Levels Health | CGM + app | Subscription tiers | Continuous glucose monitoring + metabolic health |

### LIMITLESS Differentiation

**What competitors offer individually, LIMITLESS integrates:**

```
LIMITLESS = Education (PATHS) + Clinical (HUB) + Coaching (CUBES+)
            ────────────────────────────────────────────────────
            All connected by Health Data + AI + Real Clinicians
```

| Capability | Fountain Life | InsideTracker | Viome | LIMITLESS |
|-----------|:---:|:---:|:---:|:---:|
| Diagnostic testing | ✓ | ✓ | ✓ | ✓ (via Recoletas) |
| AI recommendations | ○ | ✓ | ✓ | ✓ (RAG tutor) |
| Educational courses | ✗ | ✗ | ✗ | **✓ (PATHS)** |
| Expert clinicians | ✓ | ✗ | ✗ | **✓ (telemedicine)** |
| Hotel longevity stays | ✗ | ✗ | ✗ | **✓ (El Fuerte)** |
| Coaching routines | ✗ | ✗ | ✗ | **✓ (CUBES+)** |
| B2B staff training | ✗ | ✗ | ✗ | **✓ (multi-tenant)** |
| Certification | ✗ | ✗ | ✗ | **✓ (certificates)** |
| Biomarker-linked learning | ✗ | ✗ | ✗ | **✓ (health-aware AI)** |

**The OS advantage:** No competitor offers a platform that connects education → diagnostics → clinical care → lifestyle protocols → re-testing in a single integrated experience.

### Local Competitive Landscape (Marbella)

From the Recoletas business plan — the direct competitive context where the OS operates:

| Competitor | Model | Pricing | LIMITLESS Advantage |
|-----------|-------|---------|-------------------|
| **Lanserhof Finca Cortesín** (opening 2027) | Ultra-luxury resort, 71 suites, €100M investment | €5,000-20,000+/week | Hospital-grade diagnostics, ongoing membership care, family programs, 10x lower price point |
| **Buchinger Wilhelmi** | Fasting-focused wellness clinic since 1973 | Multi-day residential stays | Broader 4-pillar approach (not just fasting), AI personalization, ongoing digital care |
| **Tiara Health** | Anti-aging clinic, 1-5 day programs | Per-program | Hospital infrastructure (3T MRI, DEXA), ongoing membership vs one-off visits |
| **Long Life Clinic** | Hormone replacement since 1991 | Per-treatment | Comprehensive lifestyle intervention, not just hormonal optimization |

**LIMITLESS's unique position:** The only **hospital-based** longevity center in Marbella with **ongoing membership care**, **family/pediatric programs**, **AI-driven Digital Twin**, and **hotel partnership ecosystem** — at accessible price points (€180-280/mo vs competitors' €5,000+/visit).

---

## 7. Migration Roadmap

### Phase 1: HUB App Creation (weeks 1-3) — IN PROGRESS
- ~~Create `limitless-hub` repo (Next.js + Tailwind + brand tokens)~~ DONE
- ~~Deploy to `hub.limitless-longevity.health` (Terraform)~~ DONE
- ~~Public pages: landing, memberships, diagnostics, stays, telemedicine, contact-sales~~ DONE
- ~~Cookie SSO middleware~~ DONE
- ~~CI pipeline: Test & Build + Staging Migration + Claude Code Review~~ DONE
- TODO: Booking flows + Stripe integration (Phase 2 of HUB spec)
- TODO: Update PATHS header — replace internal routes with HUB external links
- TODO: Update AI tutor escalation CTA to link to HUB telemedicine

### Phase 1.5: API Gateway (week 2-3) — NEW
- Deploy Cloudflare Worker at `app.limitless-longevity.health`
- PATHS: `basePath: '/learn'` — all routes under `/learn/*`
- HUB: `basePath: '/book'` — all routes under `/book/*`
- Digital Twin: routes already at `/api/twin/*`
- Temp landing page at `/` until OS Dashboard (Phase 3)
- Redirect old subdomains to new paths
- **Spec:** `docs/superpowers/specs/2026-03-28-api-gateway-design.md`

### Phase 2: CUBES+ Domain Migration (weeks 3-6)
- Execute existing 6-phase Cubes+ integration plan
- DNS migration to `cubes.limitless-longevity.health`
- Cookie auth bridge in FastAPI backend
- User sync script

### Phase 3: OS Dashboard (weeks 6-8)
- Create `limitless-os` repo (Next.js, lightweight)
- Build app launcher UI (PATHS/HUB/CUBES+ cards)
- Health summary widget (reads PATHS Health Data API)
- Upcoming events widget (reads HUB bookings)
- Deploy to `os.limitless-longevity.health`
- Update post-login redirect: `→ os.limitless-longevity.health`

### Phase 4: Service Extraction (weeks 8-12)
- Extract Health Data API as standalone service
- Unified billing service (Stripe integration shared)
- Shared notification service (Resend templates)
- Federated search across apps

### Phase 5: Wearable Integration & Digital Twin (weeks 12-16)
- Oura Ring API integration (sleep, HRV, readiness, activity)
- Whoop API integration (strain, recovery, sleep)
- Apple HealthKit / Google Health Connect bridge
- Real-time data streaming to Digital Twin
- Dashboard widgets showing live wearable data

### Phase 6: Advanced Features (weeks 16+)
- Cross-app orchestration (course completion → diagnostic suggestion)
- Family accounts (parent-child linking, pediatric longevity programs)
- White-label per-tenant branding (hotel partners see their own branding)
- Hotel partner portal (referral tracking, revenue sharing reports)
- Mobile app (React Native, consuming OS APIs)
- Multi-location support (Madrid, Lisbon expansion per Recoletas Year 5 plan)
- Corporate wellness portal (group enrollment, quarterly health reports)

### Alignment with Business Timeline

| Business Milestone | OS Phase | Date |
|-------------------|----------|------|
| Fuerte Group pilot program | Phase 1 (HUB MVP for booking + PATHS for assessments) | Q3 2026 |
| Recoletas center pre-launch | Phase 2-3 (HUB membership + scheduling + OS dashboard) | Q3 2026 |
| Recoletas center launch (50+ members) | Phase 3-4 (full OS with Digital Twin) | Q4 2026 |
| 300+ members, 4 hotel partnerships | Phase 5-6 (wearables, partner portal) | Q2 2027 |
| €4.4M revenue, expansion evaluation | Full OS + multi-location | 2030 |

---

## 8. Design Principles

1. **Each app is independently deployable** — the OS enhances but doesn't gate individual app functionality
2. **Health data flows one way** — users write via PATHS, other apps read via API
3. **One subscription, many apps** — billing is centralized, tier is in the JWT
4. **Cookie SSO is the glue** — no additional auth integration needed per app
5. **Start with PATHS as auth authority** — extract to standalone service when complexity warrants
6. **Frankfurt (EU) for everything** — GDPR compliance, data residency
7. **Terraform for all infrastructure** — no manual provisioning
8. **Brand consistency** — shared design tokens (`bg-brand-dark`, `text-brand-gold`, `font-display`)

---

## 9. Resolved Design Decisions

All key architectural questions have been resolved through collaborative design review.

### Architecture
1. **OS dashboard replaces PATHS dashboard as primary landing.** After login, users land on the OS dashboard. PATHS `/account` becomes app-specific (courses, certificates, billing only). The OS dashboard shows Digital Twin summary, app cards (PATHS/HUB/CUBES+), daily protocols, upcoming events.
2. **Digital Twin is a standalone microservice.** See Section 4.2. Cross-cutting concern with multi-source writes, time-series access patterns, independent security requirements.
3. **HUB uses Next.js + Prisma (not Payload CMS).** HUB manages bookings/scheduling, not content. No need for Lexical editor, editorial workflow, or content versioning. Stack: Next.js (App Router) + Tailwind + Prisma ORM + PostgreSQL + cookie SSO.
4. B2B tenants needing both PATHS and HUB: tenant scope applies at OS level. Single tenant ID works across apps via JWT claims.

### Business Model
5. **Separate tiers, bundled.** PATHS tiers (Free/Regular €15/Premium €30/Enterprise) are global digital-only. Recoletas tiers (Optimus €180/Immortalitas €220/Transcendentia €280/VIP) are location-specific and include PATHS Premium. E-Clinic (€99/mo) includes PATHS Regular. Hotel stay guests get PATHS Premium for stay duration + follow-up period.
6. **E-Clinic is a HUB subscription that bundles PATHS Regular.** Includes telemedicine, AI coaching, diagnostics review, wearable dashboard (HUB) plus all courses, articles, AI tutor (PATHS). Positioned as global entry point — clients may later visit Marbella for in-person care.
7. Hotel partner revenue sharing: tracked in HUB partner portal. Hotels retain 100% accommodation revenue + 10-15% referral fee on medical program. Implementation in Phase 6.

### Digital Twin
8. **Standalone microservice from day 1.** See Section 4.2.
9. **Clinician entry via HUB in Phase 1.** Clinicians enter key biomarker results into HUB patient portal → HUB calls Digital Twin API. Phase 2: HL7/FHIR middleware for automated import from hospital LIS. Phase 3: direct FHIR R4 real-time streaming.
10. **Temporary Digital Twin with opt-in transfer for hotel guests.** Guest gets temp account + loaner wearable → data syncs to temp Twin during stay → at checkout: Option A (keep account, data transfers to permanent Twin, can upgrade to e-Clinic) or Option B (PDF summary emailed, data purged per GDPR).

### Scale
11. **Mobile app after OS dashboard is live (Phase 4+).** Q3-Q4 2026: web-only. Q1 2027: PWA wrapper. Q2-Q3 2027: React Native app (justified at 300+ members milestone). Web-first per Recoletas plan: "web-based portal — no app installation required."
12. **Shared OS + per-location HUB instances.** One OS, one PATHS, one Digital Twin, one CUBES+ (global). Each physical location gets its own HUB instance (own scheduling, staff, bookings, hotel partnerships, pricing). Users see all locations in OS dashboard.
13. Third-party integrations: deferred to Phase 6+. Focus on first-party apps first.

### Family & Pediatric
14. **OS-level family linking.** Parent account links to child accounts. Each family member has their own Digital Twin. Parent can view children's health data and manage subscriptions. Family membership = single billing. Privacy: children can't see parent data.
15. Age-appropriate content: PATHS content filtered by age flag on user profile. Pediatric protocols generated by Digital Twin based on age-specific reference ranges. Detailed content tagging system TBD.

## 10. Remaining Open Questions

These are lower-priority items to address during implementation:

1. How do hotel partner revenue-sharing reports work in the HUB partner portal? (UI design)
2. What specific HL7/FHIR resource types does Recoletas export? (needs hospital IT coordination)
3. Should CUBES+ eventually merge into HUB or remain independent? (depends on coach workflow evolution)
4. ~~How does the OS handle user deletion across all services?~~ RESOLVED — see Section 4.5 (GDPR Cascading Delete)
5. What content tagging system enables age-appropriate filtering in PATHS for pediatric users?

---

## 11. Key References

| Document | Path | Relevance |
|----------|------|-----------|
| CLAUDE.md | `~/projects/LIMITLESS/CLAUDE.md` | Multi-app vision, auth convergence |
| Improvement Plan | `docs/superpowers/plans/2026-03-26-paths-platform-improvement-plan.md` | Feature inventory, competitive argument |
| Terraform IaC | `docs/superpowers/specs/2026-03-22-terraform-iac-design.md` | Infrastructure layout, module pattern |
| Cubes+ Integration | Memory: `plan_cubes_integration.md` | 6-phase auth bridge plan |
| Cubes+ Architecture | Memory: `cubes_plus_architecture.md` | Cubes+ stack and auth details |
| Two-Instance Governance | Memory: `workflow_two_instance_governance.md` | Task routing for implementation |
| Feature Audit | This document, Section 3 | Complete PATHS feature classification |
