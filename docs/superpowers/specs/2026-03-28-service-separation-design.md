# Service Separation Design — LIMITLESS Longevity OS

**Date:** 2026-03-28
**Status:** Planning
**Context:** PATHS currently contains booking pages, health profiles, and billing that belong in HUB and Digital Twin. HUB and DT already have the infrastructure built. This spec defines what goes where and the migration path.

---

## 1. Service Boundaries (Final State)

### PATHS — The Learning Platform
Everything related to education, content, and AI-powered learning.

| Component | Type |
|-----------|------|
| Courses, Modules, Lessons | Collections |
| Enrollments, LessonProgress, Certificates | Collections |
| Articles, Posts, Pages, Categories, ContentPillars | Collections |
| AI Tutor, Search, Quiz, Recommendations, Related Content | Endpoints |
| ContentChunks (RAG), AIUsage, AIConfig | Collections/Globals |
| ActionPlans, DailyProtocols | Collections (AI-generated, reads health data from DT) |
| Tenants (B2B orgs) | Collection |
| Media | Collection |
| Guide (50 MDX pages) | Static content |
| User auth | Auth authority (until extraction at 4+ apps) |
| MembershipTiers | Collection (read-only, for content gating — billing managed by HUB) |

**Does NOT contain:** Booking pages, health profiles, Stripe billing, clinical services.

### HUB — Clinical & Hospitality Platform
Everything related to bookings, memberships, appointments, and clinical operations.

| Component | Type |
|-----------|------|
| Memberships, Stripe billing | Prisma models + API |
| StayPackages, StayBookings | Prisma models + API |
| DiagnosticPackages, DiagnosticBookings | Prisma models + API |
| TelemedicineBookings | Prisma model + API |
| Appointments | Prisma model + API |
| Clinicians | Prisma model |
| ContactInquiries | Prisma model + API |
| HotelPartners | Prisma model |
| User dashboard (bookings, appointments, health via DT) | Pages |
| Public pages (memberships, diagnostics, stays, telemedicine, contact) | Pages |

**Billing authority:** HUB owns Stripe subscriptions. Syncs tier to PATHS via JWT claims.

### Digital Twin — Health Data Microservice
Single source of truth for all health and biometric data.

| Component | Type |
|-----------|------|
| HealthProfiles | Drizzle table + API |
| Biomarkers (historical, with trends) | Drizzle table + API |
| WearableData + Summaries + Devices | Drizzle tables (TimescaleDB) |
| DiagnosticResults | Drizzle table + API |
| ActivityLog | Drizzle table + API |
| GenomicData | Drizzle table + API |
| AI Context endpoint (serves PATHS AI) | API |
| GDPR export/delete | API |

**Health data authority:** All health reads go through DT. PATHS AI calls `/api/twin/:userId/ai-context`.

---

## 2. What Moves from PATHS

### A. Booking Pages & Endpoints → DELETE (HUB already has them)

| PATHS Component | HUB Equivalent | Action |
|----------------|----------------|--------|
| `/stays` page | `/stays` page (richer, with packages) | Delete from PATHS |
| `/telemedicine` page | `/telemedicine` page | Delete from PATHS |
| `/diagnostics` page | `/diagnostics` page | Delete from PATHS |
| `/contact-sales` page | `/contact-sales` page | Delete from PATHS |
| `POST /stay-booking` endpoint | `POST /api/bookings/stays` (Stripe + DB) | Delete from PATHS |
| `POST /telemedicine-booking` endpoint | `POST /api/bookings/telemedicine` (Stripe + DB) | Delete from PATHS |
| `POST /diagnostic-booking` endpoint | `POST /api/bookings/diagnostics` (Stripe + DB) | Delete from PATHS |
| `POST /contact-sales` endpoint | `POST /api/contact` (DB persistence) | Delete from PATHS |

**PATHS versions** are email-only forms with no DB persistence. **HUB versions** have full DB models, Stripe checkout, dashboard views. Clean delete, no data migration needed.

### B. HealthProfiles → Digital Twin (3-phase migration)

| Phase | Action | Risk |
|-------|--------|------|
| B1. Dual-write | PATHS writes to local HealthProfiles AND calls DT API | Low — additive |
| B2. Read from DT | PATHS AI endpoints call DT `/api/twin/:userId/ai-context` instead of local collection | Medium — DT must be reliable |
| B3. Remove from PATHS | Delete HealthProfiles collection + migration | Low — after verification period |

### C. Billing → HUB authority

| PATHS Component | Action |
|----------------|--------|
| Subscriptions collection | Delete (HUB Membership model replaces it) |
| StripeEvents collection | Delete (HUB handles webhooks) |
| `/stripe/webhooks` endpoint | Delete (HUB has `/api/billing/webhook`) |
| `/billing/checkout` endpoint | Delete (HUB has `/api/membership/subscribe`) |
| `/billing/portal` endpoint | Delete (HUB handles portal) |
| `/billing/tier-sync` endpoint | Keep as `/api/internal/tier-sync` — HUB calls this to update user tier |
| MembershipTiers collection | Keep (read-only, for content access gating) |

### D. Course Stay Fields → HUB Reference

| PATHS Field | Action |
|------------|--------|
| `Courses.stayType` | Replace with `hubStayPackageId` reference |
| `Courses.stayLocation` | Remove (lives in HUB StayPackage) |
| `Courses.stayPrice`, `stayMemberPrice` | Remove (lives in HUB StayPackage) |
| `Courses.stayIncludes` | Remove (lives in HUB StayPackage) |
| `Courses.followUpMonths` | Remove (lives in HUB StayPackage) |
| `Enrollments.stayStartDate`, `stayEndDate` | Replace with `hubStayBookingId` reference |

---

## 3. Cross-Service Integration Points

### PATHS ↔ HUB
- PATHS reads user tier from JWT claims (set by HUB after Stripe events)
- HUB calls PATHS `/api/internal/tier-sync` to update user tier after subscription changes
- PATHS courses reference HUB stay packages by ID (for stay-enabled courses)
- Gateway routes: `/learn/*` → PATHS, `/book/*` → HUB

### PATHS ↔ Digital Twin
- PATHS AI endpoints call DT `/api/twin/:userId/ai-context` for health-aware responses
- PATHS ActionPlans/DailyProtocols read health data from DT (not local)
- DT `/api/twin/:userId/activity` logs PATHS learning events (course completion, etc.)
- PATHS auth token works with DT (shared JWT secret)

### HUB ↔ Digital Twin
- HUB dashboard `/dashboard/health` calls DT summary endpoint (already implemented)
- HUB diagnostic completion calls DT to create DiagnosticResult + Biomarkers
- HUB stay booking can register loaner wearable via DT
- HUB uses service key auth to write to DT

---

## 4. Gateway Routing (Final State)

| Path | Service | Content |
|------|---------|---------|
| `/` | OS Dashboard | Landing page, app launcher |
| `/learn/*` | PATHS | Courses, articles, AI tutor, guide |
| `/book/*` | HUB | Bookings, memberships, dashboard, clinical |
| `/api/twin/*` | Digital Twin | Health data API |
| `/account/*` | PATHS (for now) | User profile, learning progress |

---

## 5. What Does NOT Move

- **User auth stays in PATHS** — extract to shared service only when 4+ apps need it
- **MembershipTiers stays in PATHS** — read-only, gates content access by tier
- **ActionPlans/DailyProtocols stay in PATHS** — AI-generated learning content, reads data from DT
- **Tenants stay in PATHS** — B2B org management is learning-platform specific
- **AI endpoints stay in PATHS** — they serve the learning experience
