# HUB — Clinical & Hospitality Platform Design

**Date:** 2026-03-27
**Status:** Design phase — implementation not started
**Author:** Main Instance (Operator)
**Depends on:** OS design spec (`2026-03-27-limitless-longevity-os-design.md`)

---

## 1. Purpose

HUB is the **booking and clinical management** app within the LIMITLESS Longevity OS. It handles everything where the user **books or manages** something clinical or hospitality-related — memberships, diagnostics, hotel stays, telemedicine, scheduling.

HUB is NOT a simple booking form. It is the patient-facing portal for the Recoletas longevity center, the hotel partner coordination layer, and the e-Clinic telemedicine platform.

### What HUB Is NOT
- Not an LMS (that's PATHS)
- Not a content editor (no Lexical, no editorial workflow)
- Not a coaching tool (that's CUBES+)
- Not an AI tutor (that's PATHS — but HUB reads health data for clinical context)

---

## 2. Stack Decision

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 15 (App Router) | Same as PATHS — shared expertise, SSR for SEO |
| **ORM** | Prisma | No CMS overhead. Prisma gives type-safe DB access, visual Studio, migrations |
| **Database** | PostgreSQL (Render) | Frankfurt, GDPR-compliant, same provider as PATHS |
| **Styling** | Tailwind + brand tokens | Consistent with PATHS design system |
| **Auth** | Cookie SSO (reads PATHS JWT) | No auth implementation needed — just validate |
| **Email** | Resend | Transactional emails (confirmations, reminders) |
| **Payments** | Stripe SDK | Membership billing, one-off diagnostic/stay payments |
| **Calendar** | Cal.com embed or custom | Appointment scheduling (evaluate during implementation) |

**Why not Payload CMS?** HUB manages structured data (bookings, appointments, memberships) — not content. No need for Lexical editor, content versioning, editorial workflow, or admin panel WYSIWYG. Prisma is lighter and more appropriate for transactional data.

---

## 3. Domain Model (Prisma Schema)

```prisma
// ─── Identity (read from JWT, cached locally) ───

model User {
  id                String   @id @default(cuid())
  pathsUserId       String   @unique  // Links to PATHS user ID from JWT
  email             String   @unique
  firstName         String?
  lastName          String?
  phone             String?
  dateOfBirth       DateTime?
  tier              String   @default("free")  // Synced from JWT claims

  // Relations
  membership        Membership?
  stayBookings      StayBooking[]
  teleBookings      TelemedicineBooking[]
  diagBookings      DiagnosticBooking[]
  appointments      Appointment[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

// ─── Center Memberships ───

model Membership {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id])

  plan              MembershipPlan  // Optimus, Immortalitas, Transcendentia, VIP
  status            MembershipStatus @default(ACTIVE)
  stripeSubId       String?  @unique  // Stripe subscription ID
  stripeCustId      String?  // Stripe customer ID

  startDate         DateTime @default(now())
  renewalDate       DateTime
  cancelledAt       DateTime?

  // Included benefits
  coachSessionsRemaining  Int @default(0)
  diagnosticDiscount      Float @default(0)  // e.g., 0.10 = 10%

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum MembershipPlan {
  OPTIMUS           // €180/mo — basic access
  IMMORTALITAS      // €220/mo — standard (default for most)
  TRANSCENDENTIA    // €280/mo — premium
  VIP               // Custom pricing — UHNW/celebrity
}

enum MembershipStatus {
  ACTIVE
  PAUSED
  CANCELLED
  PAST_DUE
}

// ─── Diagnostic Packages ───

model DiagnosticPackage {
  id                String   @id @default(cuid())
  name              String   // "Comprehensive", "Executive", "Specialist Add-On"
  slug              String   @unique
  description       String
  price             Float    // in EUR
  currency          String   @default("EUR")
  durationMinutes   Int      // How long the appointment takes

  // What's included
  tests             Json     // Array of test names/descriptions

  // Availability
  available         Boolean  @default(true)
  requiresMembership Boolean @default(false)

  bookings          DiagnosticBooking[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model DiagnosticBooking {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  packageId         String
  package           DiagnosticPackage @relation(fields: [packageId], references: [id])

  status            BookingStatus @default(PENDING)
  scheduledAt       DateTime?
  completedAt       DateTime?

  // Payment
  stripePaymentId   String?
  amountPaid        Float?
  discountApplied   Float?   @default(0)

  // Clinical
  notes             String?  // Patient notes for clinician
  resultsSentToTwin Boolean  @default(false)  // Whether results pushed to Digital Twin

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

// ─── Hotel Stay Packages ───

model StayPackage {
  id                String   @id @default(cuid())
  name              String   // "3-Day Vitality Reset", "5-Day Immersion", "7-Day Transformation"
  slug              String   @unique
  description       String
  durationDays      Int      // 3, 5, or 7
  price             Float    // in EUR
  currency          String   @default("EUR")

  // What's included
  inclusions        Json     // Array of included services
  hotelPartner      String   // "El Fuerte Marbella", etc.

  available         Boolean  @default(true)

  bookings          StayBooking[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model StayBooking {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  packageId         String
  package           StayPackage @relation(fields: [packageId], references: [id])

  status            BookingStatus @default(PENDING)
  checkIn           DateTime?
  checkOut          DateTime?

  // Guest details
  guests            Int      @default(1)
  specialRequests   String?

  // Payment
  stripePaymentId   String?
  amountPaid        Float?

  // Wearable assignment during stay
  wearableAssigned  Boolean  @default(false)
  wearableDeviceId  String?  // Oura Ring serial, etc.

  // Post-stay
  transferToTwin    Boolean  @default(false)  // Guest opted to keep Digital Twin data
  followUpPeriodEnd DateTime? // PATHS Premium access expires here

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

// ─── Telemedicine / E-Clinic ───

model TelemedicineBooking {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  type              ConsultType  // INITIAL, FOLLOW_UP, SPECIALIST
  status            BookingStatus @default(PENDING)
  scheduledAt       DateTime?
  durationMinutes   Int      @default(30)

  // Clinician
  clinicianId       String?
  clinician         Clinician? @relation(fields: [clinicianId], references: [id])

  // Session
  meetingUrl        String?  // Video call link
  notes             String?  // Pre-consult patient notes
  clinicianNotes    String?  // Post-consult clinician notes (private)

  // Payment
  stripePaymentId   String?
  amountPaid        Float?
  coveredByPlan     Boolean  @default(false)  // Premium/E-Clinic members

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum ConsultType {
  INITIAL
  FOLLOW_UP
  SPECIALIST
  EMERGENCY
}

// ─── Appointments (general calendar) ───

model Appointment {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  type              AppointmentType
  title             String
  description       String?
  scheduledAt       DateTime
  durationMinutes   Int      @default(60)
  location          String?  // Room, address, or "virtual"

  // Staff
  clinicianId       String?
  clinician         Clinician? @relation(fields: [clinicianId], references: [id])

  status            BookingStatus @default(CONFIRMED)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum AppointmentType {
  COACH_SESSION
  SPECIALIST_CONSULT
  GROUP_CLASS
  DIAGNOSTIC
  FOLLOW_UP
  ORIENTATION
}

// ─── Clinicians / Staff ───

model Clinician {
  id                String   @id @default(cuid())
  pathsUserId       String?  @unique  // Optional link to PATHS user
  email             String   @unique
  firstName         String
  lastName          String
  title             String?  // "Dr.", "Coach", etc.
  specialty         String?  // "Functional Medicine", "Exercise Physiology"
  bio               String?
  photoUrl          String?

  available         Boolean  @default(true)

  teleBookings      TelemedicineBooking[]
  appointments      Appointment[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

// ─── Contact / Sales Inquiries ───

model ContactInquiry {
  id                String   @id @default(cuid())

  type              InquiryType
  name              String
  email             String
  phone             String?
  company           String?
  message           String

  // For corporate wellness
  employeeCount     Int?

  status            InquiryStatus @default(NEW)
  assignedTo        String?  // Staff email
  notes             String?  // Internal notes

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum InquiryType {
  GENERAL
  MEMBERSHIP
  CORPORATE_WELLNESS
  HOTEL_PARTNERSHIP
  MEDIA
}

enum InquiryStatus {
  NEW
  CONTACTED
  IN_PROGRESS
  CONVERTED
  CLOSED
}

// ─── Hotel Partner Portal ───

model HotelPartner {
  id                String   @id @default(cuid())
  name              String   // "El Fuerte Marbella"
  slug              String   @unique
  contactEmail      String
  contactName       String

  // Revenue sharing
  referralFeePercent Float   @default(0.10)  // 10%

  // Stats (denormalized for dashboard)
  totalReferrals    Int      @default(0)
  totalRevenue      Float    @default(0)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

// ─── Shared Enums ───

enum BookingStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

---

## 4. Pages & Routes

### Public Pages (no auth required)

| Route | Purpose | Content |
|-------|---------|---------|
| `/` | HUB landing | Overview of services, membership tiers, CTAs |
| `/memberships` | Membership tiers | Optimus/Immortalitas/Transcendentia/VIP comparison |
| `/diagnostics` | Diagnostic packages | Comprehensive/Executive packages, what's included |
| `/stays` | Hotel stay packages | 3/5/7-day programs, hotel partner info |
| `/telemedicine` | E-Clinic overview | Telemedicine services, pricing, how it works |
| `/contact-sales` | Sales inquiries | Enterprise, corporate wellness, hotel partnership forms |

### Authenticated Pages (JWT required)

| Route | Purpose | Content |
|-------|---------|---------|
| `/dashboard` | Patient portal home | Upcoming appointments, membership status, quick actions |
| `/dashboard/membership` | Membership management | Current plan, upgrade/downgrade, billing history |
| `/dashboard/appointments` | Appointment list | Past and upcoming, calendar view |
| `/dashboard/diagnostics` | Diagnostic history | Past results (links to Digital Twin), upcoming bookings |
| `/dashboard/stays` | Stay history | Past and upcoming stays, wearable data during stays |
| `/dashboard/telemedicine` | Telemedicine portal | Upcoming consults, session history, join video call |
| `/dashboard/health` | Health summary | Reads from Digital Twin API — biomarker trends, wearable data |

### Clinician Pages (clinician role required)

| Route | Purpose | Content |
|-------|---------|---------|
| `/clinician` | Clinician dashboard | Today's appointments, patient queue |
| `/clinician/patients/:id` | Patient view | Health summary from Digital Twin, appointment history, notes |
| `/clinician/schedule` | Schedule management | Availability, time slots, blocked time |

### Hotel Partner Pages (partner role required)

| Route | Purpose | Content |
|-------|---------|---------|
| `/partner` | Partner dashboard | Referral stats, revenue sharing, guest feedback |
| `/partner/guests` | Guest list | Current and past referred guests |

---

## 5. API Endpoints

### Public
```
GET  /api/packages/diagnostics          → List diagnostic packages
GET  /api/packages/stays                → List stay packages
GET  /api/packages/memberships          → List membership tiers
POST /api/contact                       → Submit sales inquiry
```

### Authenticated (user)
```
GET  /api/me                            → Current user profile (from JWT + local cache)
GET  /api/me/membership                 → Membership details
GET  /api/me/appointments               → List appointments
GET  /api/me/bookings/diagnostics       → List diagnostic bookings
GET  /api/me/bookings/stays             → List stay bookings
GET  /api/me/bookings/telemedicine      → List telemedicine bookings

POST /api/bookings/diagnostics          → Book diagnostic package
POST /api/bookings/stays                → Book hotel stay
POST /api/bookings/telemedicine         → Book telemedicine session

POST /api/membership/subscribe          → Start membership (Stripe checkout)
POST /api/membership/change             → Upgrade/downgrade plan
POST /api/membership/cancel             → Cancel membership

POST /api/billing/webhook               → Stripe webhook handler
```

### Authenticated (clinician)
```
GET  /api/clinician/appointments        → Today's appointments
GET  /api/clinician/patients/:id        → Patient summary (calls Digital Twin API)
POST /api/clinician/appointments/:id/notes → Add clinician notes
POST /api/clinician/diagnostics/:id/results → Submit results (writes to Digital Twin)
```

### Authenticated (partner)
```
GET  /api/partner/stats                 → Referral statistics
GET  /api/partner/guests                → Guest list
```

### Internal (service-to-service, API key auth)
```
POST /api/internal/user-sync            → Sync user data from PATHS (webhook)
POST /api/internal/tier-update          → Update user tier (from Stripe/PATHS)
```

---

## 6. Authentication Design

HUB does **not** implement its own auth. It reads the JWT cookie set by PATHS.

### Flow
1. User logs in at `paths.limitless-longevity.health/login` (or any app's login page that redirects there)
2. PATHS sets `HttpOnly` cookie on `.limitless-longevity.health`
3. User navigates to `hub.limitless-longevity.health` — browser sends cookie automatically
4. HUB middleware validates JWT signature (using shared secret or PATHS public key)
5. HUB extracts: `userId`, `email`, `tier`, `role`, `tenantId` from JWT claims
6. HUB upserts local `User` record (cache for joins/queries)

### JWT Claims Expected
```json
{
  "sub": "paths-user-id",
  "email": "user@example.com",
  "role": "user",
  "tier": "premium",
  "tenantId": "org-123",
  "iat": 1711540800,
  "exp": 1711627200
}
```

### Middleware Pattern
```typescript
// src/lib/auth.ts
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) return null

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    return decoded as JWTPayload
  } catch {
    return null
  }
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) redirect('/login-redirect')  // Redirect to PATHS login
  return session
}
```

### Login Redirect
When an unauthenticated user tries to access a protected HUB page:
1. Redirect to `https://paths.limitless-longevity.health/login?redirect=https://hub.limitless-longevity.health/dashboard`
2. After PATHS login, PATHS redirects back to the `redirect` URL
3. Cookie is now set — HUB reads it automatically

---

## 7. Stripe Integration

### Membership Billing
- Each `MembershipPlan` maps to a Stripe Price ID
- `POST /api/membership/subscribe` creates a Stripe Checkout Session
- Stripe webhook updates `Membership.status` on payment events
- Membership includes PATHS tier upgrade — HUB calls PATHS API to sync tier

### One-Off Payments
- Diagnostic packages and hotel stays use Stripe Checkout (one-time payment mode)
- Membership discount applied server-side before creating checkout session

### Stripe Events Handled
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create/update booking, confirm membership |
| `invoice.paid` | Extend membership renewal date |
| `invoice.payment_failed` | Set membership to PAST_DUE, notify user |
| `customer.subscription.deleted` | Set membership to CANCELLED |

---

## 8. Digital Twin Integration

HUB is both a **reader** and **writer** of Digital Twin data.

### Reads (patient-facing)
- `/dashboard/health` displays biomarker trends, wearable data summaries
- Telemedicine pre-consult screen shows health context

### Reads (clinician-facing)
- `/clinician/patients/:id` shows full health profile from Digital Twin
- Clinician reviews biomarker trends before consult

### Writes (clinician entry)
- After diagnostic appointment: clinician enters key results via HUB form
- HUB calls `POST /api/twin/:userId/diagnostics` on the Digital Twin service
- Phase 2: automated import from hospital LIS via HL7/FHIR middleware

### Writes (wearable assignment)
- During hotel stays: loaner wearable assigned to guest
- HUB registers device with Digital Twin for data streaming
- At checkout: guest opts in/out of data transfer to permanent Twin

---

## 9. PATHS Integration Points

### Features Moving from PATHS to HUB
| PATHS Route | HUB Route | Migration |
|-------------|-----------|-----------|
| `/stays` | `/stays` | Move page + `POST /api/stay-booking` endpoint |
| `/telemedicine` | `/telemedicine` | Move page + `POST /api/telemedicine-booking` endpoint |
| `/diagnostics` | `/diagnostics` | Move page + `POST /api/diagnostic-booking` endpoint |
| `/contact-sales` | `/contact-sales` | Move page + `POST /api/contact-sales` endpoint |

### PATHS Header Update
After HUB launch, PATHS header nav replaces internal routes with external links:
- `/stays` → `https://hub.limitless-longevity.health/stays`
- `/telemedicine` → `https://hub.limitless-longevity.health/telemedicine`

### AI Tutor Escalation
- PATHS AI tutor `[SUGGEST_CONSULTATION]` marker → CTA links to `https://hub.limitless-longevity.health/telemedicine/book`
- HUB booking form pre-fills from Digital Twin health data (not PATHS health profile)

---

## 10. Membership Tier Mapping

### Digital Platform Tiers (PATHS — global)
| Tier | Price | PATHS Access | HUB Access |
|------|-------|-------------|------------|
| Free | €0 | Free articles, 10 searches/day | Browse packages only |
| Regular | €15/mo | All content, 10 AI/day | Book at full price |
| Premium | €30/mo | Everything, 50 AI/day, protocols | 10% diagnostic discount |
| Enterprise | Custom | Everything + B2B | Priority booking |

### Center Tiers (HUB — Recoletas-specific)
| Tier | Price | Includes | PATHS Tier |
|------|-------|----------|-----------|
| Optimus | €180/mo | 1 coach session/mo, basic diagnostics access | Premium |
| Immortalitas | €220/mo | 2 coach sessions/mo, 10% diagnostic discount | Premium |
| Transcendentia | €280/mo | 4 coach sessions/mo, 15% diagnostic discount, priority booking | Premium |
| VIP | Custom | Unlimited, dedicated team, home visits | Premium |

### E-Clinic (HUB — global)
| Tier | Price | Includes | PATHS Tier |
|------|-------|----------|-----------|
| E-Clinic | €99/mo | Telemedicine, AI coaching, diagnostics review, wearable dashboard | Regular |

**Rule:** Center memberships and E-Clinic subscriptions always include PATHS access at the specified tier. The JWT `tier` claim reflects the **highest** applicable tier.

---

## 11. Infrastructure

### Render Deployment
```
Service: limitless-hub
Type: Web Service
Runtime: Node.js 20
Build: pnpm install && pnpm build
Start: pnpm start
Region: Frankfurt (EU)
```

### Environment Variables
```
DATABASE_URL=postgresql://...        # HUB's own PostgreSQL
JWT_SECRET=...                       # Shared with PATHS for cookie validation
STRIPE_SECRET_KEY=...                # HUB's Stripe account (or shared)
STRIPE_WEBHOOK_SECRET=...
DIGITAL_TWIN_API_URL=https://digital-twin-api.limitless-longevity.health
DIGITAL_TWIN_API_KEY=...             # Service-to-service auth
PATHS_API_URL=https://paths-api.limitless-longevity.health
PATHS_INTERNAL_KEY=...               # For user/tier sync callbacks
RESEND_API_KEY=...                   # Transactional emails
NEXT_PUBLIC_HUB_URL=https://hub.limitless-longevity.health
NEXT_PUBLIC_PATHS_URL=https://paths.limitless-longevity.health
```

### Terraform Module
```hcl
# In limitless-infra/hub.tf
resource "render_web_service" "hub" {
  name    = "limitless-hub"
  # ... same pattern as PATHS
}

resource "render_postgres" "hub_db" {
  name   = "limitless-hub-db"
  region = "frankfurt"
  plan   = "starter"
}

resource "cloudflare_dns_record" "hub" {
  zone_id = var.cloudflare_zone_id
  name    = "hub"
  content = render_web_service.hub.service_details.url
  type    = "CNAME"
}
```

---

## 12. Project Structure

```
limitless-hub/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with brand tokens
│   │   ├── page.tsx                    # Landing page
│   │   ├── memberships/
│   │   ├── diagnostics/
│   │   ├── stays/
│   │   ├── telemedicine/
│   │   ├── contact-sales/
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # Patient portal home
│   │   │   ├── membership/
│   │   │   ├── appointments/
│   │   │   ├── diagnostics/
│   │   │   ├── stays/
│   │   │   ├── telemedicine/
│   │   │   └── health/
│   │   ├── clinician/
│   │   │   ├── page.tsx
│   │   │   ├── patients/[id]/
│   │   │   └── schedule/
│   │   ├── partner/
│   │   │   ├── page.tsx
│   │   │   └── guests/
│   │   └── api/
│   │       ├── packages/
│   │       ├── bookings/
│   │       ├── membership/
│   │       ├── billing/
│   │       ├── clinician/
│   │       ├── partner/
│   │       ├── contact/
│   │       ├── me/
│   │       └── internal/
│   ├── lib/
│   │   ├── auth.ts                     # JWT validation, session helpers
│   │   ├── prisma.ts                   # Prisma client singleton
│   │   ├── stripe.ts                   # Stripe client + helpers
│   │   ├── digital-twin.ts            # Digital Twin API client
│   │   └── email.ts                    # Resend email helpers
│   ├── components/
│   │   ├── ui/                         # Shared UI components
│   │   ├── dashboard/                  # Dashboard widgets
│   │   ├── booking/                    # Booking forms
│   │   └── clinician/                  # Clinician-specific components
│   └── styles/
│       └── globals.css                 # Brand tokens (@theme inline)
├── public/
├── tailwind.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
├── Dockerfile
└── .env.example
```

---

## 13. Implementation Phases

### Phase 1: MVP (Week 1-2)
- Scaffold repo with Next.js + Prisma + Tailwind + brand tokens
- Cookie SSO middleware (read PATHS JWT)
- Public pages: `/stays`, `/telemedicine`, `/diagnostics`, `/contact-sales`
- Contact inquiry form + API endpoint
- Deploy to Render + Terraform DNS

### Phase 2: Booking (Week 2-3)
- Stripe integration for one-off payments
- Diagnostic booking flow (browse → select → pay → confirm)
- Stay booking flow (browse → select dates → pay → confirm)
- Telemedicine booking flow (browse → schedule → pay/verify plan → confirm)
- Email confirmations via Resend

### Phase 3: Memberships (Week 3-4)
- Membership tier comparison page
- Stripe subscription billing
- Membership management dashboard
- PATHS tier sync (webhook to update JWT tier claim)

### Phase 4: Patient Portal (Week 4-5)
- Dashboard with upcoming appointments
- Appointment history
- Booking history (diagnostics, stays, telemedicine)
- Health summary widget (reads Digital Twin API)

### Phase 5: Clinician Portal (Week 5-6)
- Clinician dashboard
- Patient view with Digital Twin health data
- Post-consult notes
- Diagnostic result entry → Digital Twin write

### Phase 6: Partner Portal (Week 6+)
- Hotel partner dashboard
- Referral tracking
- Revenue sharing reports
- Guest management

---

## 14. Design Tokens

HUB uses the same brand design system as PATHS. Copy `globals.css` `@theme inline` block from PATHS:

```css
@theme inline {
  --color-brand-dark: #0a0e1a;
  --color-brand-gold: #c9a84c;
  --color-brand-teal: #2dd4bf;
  --color-brand-cream: #f5f0e8;
  /* ... full token set from PATHS */
}
```

### Visual Identity
- Same "Scientific Luxury" aesthetic as PATHS
- Dark backgrounds, gold/teal accents, glassmorphism
- Cormorant Garamond (headings) + Inter (body)
- Booking flows should feel clinical yet premium — clean white cards on dark backgrounds

---

## 15. Open Questions (to resolve during implementation)

1. **Calendar provider:** Cal.com embed vs custom calendar component? Cal.com saves weeks of work but adds a dependency.
2. **Video call provider:** Which telemedicine video platform? (Daily.co, Twilio, Zoom SDK)
3. **Clinician auth:** Separate clinician login or role-based within PATHS JWT?
4. **Stripe account:** Shared with PATHS or separate? (Separate is cleaner for accounting)
5. **Hotel partner auth:** How do partners authenticate? (Invite-only magic link? Separate login?)
