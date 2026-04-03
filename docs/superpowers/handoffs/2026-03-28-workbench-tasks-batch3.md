# Workbench Handoff Batch 3 — 2026-03-28

Two parallel tracks: HUB Phase 2 (booking flows) and Digital Twin schema implementation.

---

## Task 1: HUB Phase 2 — Booking Flows + Stripe

**Spec:** `docs/superpowers/specs/2026-03-27-hub-design.md` sections 5 (API Endpoints), 7 (Stripe Integration)
**AGENTS.md:** `limitless-hub/AGENTS.md` (just created — schema reference + endpoint list)

### 1A. Stripe Setup

1. Initialize Stripe in `src/lib/stripe.ts` (client already scaffolded)
2. Create Stripe products + prices for:
   - Membership plans: Optimus (€180/mo), Immortalitas (€220/mo), Transcendentia (€280/mo), VIP (custom)
   - E-Clinic (€99/mo)
   - Diagnostic packages: Comprehensive, Executive (one-time)
   - Stay packages: 3-day, 5-day, 7-day (one-time)
3. Store Stripe Price IDs in env vars or a config file (not hardcoded)

### 1B. API Endpoints

**Membership:**
- `POST /api/membership/subscribe` — creates Stripe Checkout Session (subscription mode)
- `POST /api/membership/change` — upgrade/downgrade (Stripe subscription update)
- `POST /api/membership/cancel` — cancel subscription
- `POST /api/billing/webhook` — Stripe webhook handler for: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`

**Booking (one-off payments):**
- `POST /api/bookings/diagnostics` — create diagnostic booking + Stripe Checkout (one-time)
- `POST /api/bookings/stays` — create stay booking + Stripe Checkout (one-time)
- `POST /api/bookings/telemedicine` — create telemedicine booking + Stripe Checkout (or covered by plan)

**User data:**
- `GET /api/me` — current user from JWT + local DB cache
- `GET /api/me/membership` — membership details
- `GET /api/me/appointments` — list appointments
- `GET /api/me/bookings/diagnostics` — list diagnostic bookings
- `GET /api/me/bookings/stays` — list stay bookings
- `GET /api/me/bookings/telemedicine` — list telemedicine bookings

### 1C. Webhook Logic

| Stripe Event | Action |
|--------------|--------|
| `checkout.session.completed` | Create/confirm booking or membership, upsert User |
| `invoice.paid` | Extend membership renewal date |
| `invoice.payment_failed` | Set membership `PAST_DUE`, send email via Resend |
| `customer.subscription.deleted` | Set membership `CANCELLED` |

Membership discount: apply server-side before creating checkout session (Premium = 10% off diagnostics, Transcendentia = 15%).

### 1D. Prisma Migration

Run `pnpm db:migrate:dev --name booking-flow` after any schema additions needed for booking metadata.

### Verification
- `pnpm build` passes
- Stripe webhook endpoint responds to test events (use `stripe listen --forward-to localhost:3000/api/billing/webhook`)
- Booking flows create DB records + Stripe sessions
- Membership subscribe/cancel lifecycle works end-to-end

---

## Task 2: Digital Twin — Schema + Core API

**Spec:** `docs/superpowers/specs/2026-03-27-digital-twin-design.md` sections 3 (Data Model), 4 (API Surface), 5 (Auth)
**CLAUDE.md:** `limitless-digital-twin/CLAUDE.md`

### 2A. Drizzle Schema

The spec has the full Drizzle schema. Implement in `src/db/schema.ts`:

1. `healthProfiles` — core profile (demographics, conditions, medications, goals, biological age)
2. `biomarkers` — lab results with reference ranges + optimal ranges + status
3. `diagnosticResults` — structured diagnostic reports
4. `wearableDevices` — connected wearable devices (Oura, Whoop, etc.)
5. `wearableData` — time-series readings (TimescaleDB hypertable)
6. `wearableSummaries` — daily aggregates (sleep, heart, activity, recovery)
7. `genomicData` — SNPs, epigenetic clock, telomere length
8. `activityLog` — cross-app events for AI context

**TimescaleDB note:** After initial migration, run `SELECT create_hypertable('wearable_data', 'time');` — this needs to happen in a migration file or a post-migration script.

### 2B. Core API Routes

Implement in `src/routes/` (one file per domain):

**Health Profile** (`src/routes/profile.ts`):
- `GET /api/twin/:userId/profile`
- `PATCH /api/twin/:userId/profile`
- `GET /api/twin/:userId/summary`

**Biomarkers** (`src/routes/biomarkers.ts`):
- `GET /api/twin/:userId/biomarkers` (paginated, filterable)
- `GET /api/twin/:userId/biomarkers/:name` (trend history)
- `POST /api/twin/:userId/biomarkers`
- `POST /api/twin/:userId/biomarkers/batch`

**Diagnostics** (`src/routes/diagnostics.ts`):
- `GET /api/twin/:userId/diagnostics`
- `POST /api/twin/:userId/diagnostics`
- `GET /api/twin/:userId/diagnostics/:id`

**AI Context** (`src/routes/ai-context.ts`):
- `GET /api/twin/:userId/ai-context` — pre-formatted health context for AI prompts

**GDPR** (`src/routes/gdpr.ts`):
- `GET /api/twin/:userId/export`
- `DELETE /api/twin/:userId`

### 2C. Auth Plugin

Implement `src/plugins/auth.ts` — Fastify plugin that reads `payload-token` cookie and validates JWT. Pattern is in the spec section 5.

**Access rules:**
- Users can only read/write their own data (`:userId` must match JWT `sub`)
- Service-to-service calls (from HUB/PATHS) use API key in `Authorization` header
- Admin endpoints require `role: 'admin'` in JWT

### 2D. Request Validation

Use Zod schemas for all request bodies. Define in `src/schemas/` alongside routes.

### 2E. Drizzle Migration

```bash
pnpm db:generate   # Generate migration from schema
pnpm db:migrate    # Apply migration
```

### Verification
- `pnpm build` passes
- `GET /api/health` returns 200
- `POST /api/twin/:userId/profile` creates a profile
- `POST /api/twin/:userId/biomarkers` stores a biomarker entry
- `GET /api/twin/:userId/ai-context` returns the pre-formatted object
- `DELETE /api/twin/:userId` removes all user data (GDPR)

---

## Task 3: Wearable Data Ingest (if time permits)

Lower priority — do after Tasks 1-2 are solid.

- `POST /api/twin/:userId/ingest/batch` — batch import wearable data
- `GET /api/twin/:userId/wearables/summary` — daily summaries
- `GET /api/twin/:userId/wearables/latest` — latest readings
- Wearable OAuth flows can be deferred to a later phase

---

## Priority Order

1. **Task 2** (Digital Twin schema + API) — foundational, blocks HUB health dashboard integration
2. **Task 1** (HUB booking + Stripe) — customer-facing, revenue-generating
3. **Task 3** (Wearable ingest) — nice to have, defer if needed

Note: Tasks 1 and 2 are in different repos and can be worked in parallel if the workbench wants to use agent teams or alternate between them.
