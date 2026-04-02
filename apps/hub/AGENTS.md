# HUB — Schema & API Reference

## Prisma Schema (`prisma/schema.prisma`)

### Models
| Model | Purpose |
|-------|---------|
| `User` | Local cache of PATHS user (synced from JWT) |
| `Membership` | Center membership (Optimus/Immortalitas/Transcendentia/VIP) |
| `StayBooking` | Hotel stay reservation |
| `DiagnosticBooking` | Diagnostic package booking |
| `TelemedicineBooking` | E-Clinic telemedicine session |
| `Appointment` | General calendar appointment |
| `Clinician` | Staff (doctors, coaches) |
| `ContactInquiry` | Sales/partnership inquiry |
| `HotelPartner` | Hotel partner (referral tracking) |

### Key Enums
- `MembershipPlan`: OPTIMUS, IMMORTALITAS, TRANSCENDENTIA, VIP
- `MembershipStatus`: ACTIVE, PAST_DUE, CANCELLED, PAUSED
- `BookingStatus`: PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
- `ConsultType`: INITIAL, FOLLOW_UP, SPECIALIST, EMERGENCY
- `AppointmentType`: COACH_SESSION, SPECIALIST_CONSULT, GROUP_CLASS, DIAGNOSTIC, FOLLOW_UP, ORIENTATION

## API Endpoints

### Public
- `GET /api/health` — Health check
- `POST /api/contact` — Submit sales inquiry

### Public Pages (server-rendered)
- `/` — Landing page
- `/memberships` — Tier comparison
- `/diagnostics` — Diagnostic packages
- `/stays` — Hotel stay packages
- `/telemedicine` — E-Clinic overview
- `/contact-sales` — Inquiry form

### Authenticated (planned Phase 2-4)
- `GET /api/me` — Current user from JWT
- `POST /api/bookings/diagnostics` — Book diagnostic
- `POST /api/bookings/stays` — Book hotel stay
- `POST /api/bookings/telemedicine` — Book telemedicine
- `POST /api/membership/subscribe` — Start Stripe subscription
- `POST /api/billing/webhook` — Stripe webhook

## Auth Flow
1. User logs in at PATHS → cookie set on `.limitless-longevity.health`
2. HUB reads `payload-token` cookie → validates JWT
3. HUB upserts local `User` record (cache for joins)
4. Unauthenticated users redirected to PATHS login with `?redirect=` param

## Design Spec
See: `~/projects/LIMITLESS/docs/superpowers/specs/2026-03-27-hub-design.md`
