# PATHS Phase 5: Billing Design Spec

**Date:** 2026-03-23
**Status:** Draft
**Depends on:** Phase 1 (Users, MembershipTiers), Phase 4 (Enrollments with `paymentStatus`)
**Working directory:** `C:/Projects/LIMITLESS/limitless-paths/`

---

## 1. Scope

Phase 5 adds Stripe-based subscription billing for B2C individual users:

1. **Stripe service layer** — SDK wrapper for checkout sessions, customer portal, and customer management
2. **Webhook handler** — Processes Stripe events to sync subscription state and user tiers
3. **Subscriptions collection** — Tracks active subscriptions per user
4. **StripeEvents collection** — Webhook idempotency log
5. **Billing endpoints** — Checkout session creation and Customer Portal redirect
6. **Tier sync logic** — Webhook-driven tier upgrades and downgrades

**Billing model:** Tier-gated subscriptions only. Users pay for a tier (Regular/Premium/Enterprise) which unlocks all content at that access level. No per-course purchases.

**B2B:** Enterprise/org customers are manually assigned tiers by admins in the Payload panel. No self-service Stripe flow for B2B.

**Subscription management:** Stripe's hosted Customer Portal handles cancellation, plan changes, and payment method updates. No custom billing UI.

**Cancellation:** Grace period — access continues until the end of the paid billing period (Stripe's default `cancel_at_period_end` behavior).

**Deferred to Phase 6:** Frontend billing page, pricing display, upgrade CTAs.

**Supersedes migration spec Section 8:** This spec uses the Stripe SDK directly instead of `@payloadcms/plugin-stripe` (the plugin would conflict with our existing field structure). The migration spec's `Payments` collection is replaced by `StripeEvents` — Stripe Dashboard serves as the payment audit trail, and `StripeEvents` handles webhook idempotency. A separate Payments collection would duplicate what Stripe already provides.

---

## 2. Stripe Service Layer

Pure Stripe SDK operations with no Payload dependencies. Lives in `src/stripe/`.

### `src/stripe/client.ts`

Initializes a shared Stripe SDK instance from `STRIPE_SECRET_KEY`:

```typescript
import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  stripeClient = new Stripe(key)
  return stripeClient
}
```

### `src/stripe/customers.ts`

Creates or retrieves Stripe customers linked to Payload users:

```typescript
// If user has stripeCustomerId, retrieve it. Otherwise create a new customer.
async function getOrCreateCustomer(user: { id: string; email: string; stripeCustomerId?: string }): Promise<Stripe.Customer>
```

When a new customer is created, the function returns the customer but does **not** update the Payload user record — that's the caller's responsibility (the endpoint or webhook handler updates `stripeCustomerId` via Payload Local API with `req`).

### `src/stripe/checkout.ts`

Creates Stripe Checkout Sessions for tier subscriptions:

```typescript
async function createCheckoutSession(options: {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
  metadata: { userId: string; tierId: string }
}): Promise<Stripe.Checkout.Session>
```

The `metadata` is critical — the webhook handler uses it to know which user and tier to update when the checkout completes.

### `src/stripe/portal.ts`

Creates Stripe Customer Portal sessions:

```typescript
async function createPortalSession(options: {
  customerId: string
  returnUrl: string
}): Promise<Stripe.BillingPortal.Session>
```

---

## 3. Webhook Handler

Payload custom endpoint at `POST /api/stripe/webhooks`.

### Security

1. Read raw request body (not parsed JSON — required for signature verification)
2. Verify signature using `STRIPE_WEBHOOK_SECRET` and `stripe.webhooks.constructEvent()`
3. Reject unverified events with 400

### Idempotency

Before processing, check if the event ID exists in `stripe-events` collection. If it does, return 200 immediately (already processed). After successful processing, create a record in `stripe-events`.

### Events Handled

#### `checkout.session.completed`

Triggered when a user completes a Stripe Checkout:

1. Extract `userId` and `tierId` from session metadata
2. Extract `subscription` ID from the session
3. Fetch the Stripe subscription for billing period details and plan interval (the session itself doesn't contain the interval — inspect `subscription.items.data[0].plan.interval` to determine `monthly` or `yearly`)
4. Create a `subscriptions` record in Payload
5. Update the user's `tier` to the purchased tier
6. Update the user's `stripeCustomerId` if not already set
7. If the user has an enrollment with `paymentStatus: 'pending'`, update to `'paid'`

#### `customer.subscription.updated`

Triggered on plan changes, cancellation requests, or renewals:

1. Look up the local subscription by `stripeSubscriptionId`
2. Sync `status`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`
3. If the subscription's plan/price changed, look up the new tier and update the user's `tier` relationship
4. If `cancel_at_period_end` is true, just flag it — don't downgrade yet

#### `customer.subscription.deleted`

Triggered when a subscription actually ends (after period end):

1. Look up the local subscription by `stripeSubscriptionId`
2. Set subscription status to `cancelled`
3. Downgrade the user's `tier` to the free tier
4. The user's content access changes immediately (free-tier content only)

#### `invoice.payment_failed`

Triggered when a payment retry fails:

1. Look up the local subscription by Stripe subscription ID (from the invoice)
2. Set subscription status to `past_due`
3. Do **not** downgrade the user — Stripe will retry and eventually send `customer.subscription.deleted` if all retries fail

### Error Handling

- Always return 200 to Stripe (even if processing fails) to prevent infinite retries
- Log errors to console for debugging
- If a webhook event fails to process, it still gets logged to `stripe-events` with `processed: false` so we can identify failures
- **Re-processing:** Deferred. Admins can identify failed events in the `stripe-events` collection and manually re-trigger from Stripe Dashboard (Stripe allows re-sending webhook events). An automated re-processing endpoint is not in Phase 5 scope.

---

## 4. Collections

### Subscriptions

**Slug:** `subscriptions`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| `user` | relationship → users | yes | — | Subscriber |
| `tier` | relationship → membership-tiers | yes | — | Subscribed tier |
| `stripeSubscriptionId` | text, unique | yes | — | Stripe subscription ID |
| `stripeCustomerId` | text | yes | — | Stripe customer ID |
| `status` | select | yes | `active` | `active`, `past_due`, `cancelled`, `expired` |
| `billingInterval` | select | yes | — | `monthly`, `yearly` |
| `currentPeriodStart` | date | no | — | Billing period start |
| `currentPeriodEnd` | date | no | — | Access continues until this date |
| `cancelAtPeriodEnd` | checkbox | no | false | User requested cancellation |

**Access:**
| Operation | Rule |
|-----------|------|
| `create` | None (programmatic only via webhook handler) |
| `read` | Users read their own (`canAccessOwnOrStaff`), staff read all |
| `update` | None (programmatic only via webhook handler) |
| `delete` | Admin only |

The `create` and `update` access returning `() => false` means only internal operations (with `overrideAccess: true` in the webhook handler) can create/modify subscriptions. Users and the REST API cannot.

### StripeEvents

**Slug:** `stripe-events`

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `stripeEventId` | text, unique | yes | Stripe event ID for deduplication |
| `eventType` | text | yes | e.g., `checkout.session.completed` |
| `processed` | checkbox | no (default true) | Whether processing succeeded |

**Access:** Admin read-only. Created programmatically by webhook handler with `overrideAccess: true`.

---

## 5. Billing Endpoints

### `POST /api/billing/checkout`

Creates a Stripe Checkout Session for tier subscription.

**Request:**
```typescript
{
  tierId: string
  interval: 'monthly' | 'yearly'
  successUrl?: string   // Defaults to /account/billing?success=true
  cancelUrl?: string    // Defaults to /account/billing?cancelled=true
}
```

**Response:**
```typescript
// Success (200)
{ url: string }  // Stripe Checkout URL — frontend redirects to this

// Errors
{ error: 'Tier not found' }              // 404
{ error: 'Tier has no Stripe price' }    // 400
{ error: 'Already subscribed to this tier' }  // 409
```

**Flow:**
1. Authenticate (401 if not logged in)
2. Fetch the membership tier — verify it exists and is active
3. Get the correct Stripe price ID based on `interval`
4. Check for any existing active subscription — if the user already has an active subscription (at any tier), return 409 with a message directing them to the Customer Portal to change plans. The checkout endpoint is for initial subscription only; plan changes go through Stripe's Customer Portal.
5. Get or create Stripe customer (update `stripeCustomerId` on user if new)
6. Create Checkout Session with `mode: 'subscription'`, metadata `{ userId, tierId }`
7. Return the checkout URL

### `POST /api/billing/portal`

Creates a Stripe Customer Portal session for subscription management.

**Request:**
```typescript
{
  returnUrl?: string  // Defaults to /account/billing
}
```

**Response:**
```typescript
// Success (200)
{ url: string }  // Portal URL — frontend redirects to this

// Errors
{ error: 'No billing account found' }  // 400 (no stripeCustomerId)
```

**Flow:**
1. Authenticate (401 if not logged in)
2. Verify user has `stripeCustomerId` (400 if not — they've never subscribed)
3. Create Portal Session with return URL
4. Return the portal URL

---

## 6. Tier Sync Logic

**`src/hooks/syncUserTier.ts`** — Shared function used by the webhook handler to update a user's tier:

```typescript
async function syncUserTier(
  payload: Payload,
  req: PayloadRequest,
  userId: string,
  tierId: string,
): Promise<void>
```

This function:
1. Updates the user's `tier` relationship to point to the new tier
2. Passes `req` for transaction safety

The webhook handler also needs a helper to find the correct tier from a Stripe price ID:

```typescript
async function findTierByStripePrice(
  payload: Payload,
  req: PayloadRequest,
  priceId: string,
): Promise<MembershipTier | null>
```

This queries `membership-tiers` where `stripeMonthlyPriceId` or `stripeYearlyPriceId` equals the given price ID.

---

## 7. File Structure

```
src/
├── stripe/
│   ├── client.ts                    # Stripe SDK initialization
│   ├── checkout.ts                  # Create Checkout Sessions
│   ├── portal.ts                    # Create Customer Portal sessions
│   └── customers.ts                 # Create/retrieve Stripe customers
├── collections/
│   ├── Subscriptions/
│   │   └── index.ts                 # Subscription records
│   └── StripeEvents/
│       └── index.ts                 # Webhook idempotency log
├── endpoints/
│   ├── billing/
│   │   ├── checkout.ts              # POST /api/billing/checkout
│   │   └── portal.ts                # POST /api/billing/portal
│   └── stripe/
│       └── webhooks.ts              # POST /api/stripe/webhooks
├── hooks/
│   └── syncUserTier.ts              # Update user's tier from subscription
└── payload.config.ts                # Modified: register collections + endpoints
tests/
└── int/
    ├── stripe-service.int.spec.ts   # Stripe service layer tests (client, checkout, portal)
    └── billing-logic.int.spec.ts    # Tier sync and webhook processing logic tests
```

---

## 8. Dependencies

### New npm package

| Package | Purpose |
|---------|---------|
| `stripe` | Stripe Node.js SDK |

### Existing infrastructure

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — already in `.env.example`
- `stripeCustomerId` on Users — already exists
- `stripeProductId`, `stripeMonthlyPriceId`, `stripeYearlyPriceId` on MembershipTiers — already exist
- `paymentStatus` on Enrollments — already exists (Phase 4 placeholder)
- `canAccessOwnOrStaff` access function — already exists (Phase 4)

---

## 9. Key Design Decisions

1. **Custom Stripe integration, not plugin** — `@payloadcms/plugin-stripe` would conflict with our existing field structure. The Stripe SDK gives us full control.
2. **Tier-gated only, no per-course purchases** — Keeps billing simple. One subscription per user determines access level.
3. **Stripe Customer Portal for management** — Zero frontend work for cancellation, plan changes, payment methods. Stripe maintains the UI.
4. **Grace period on cancellation** — Access continues until billing period ends (`cancel_at_period_end`). Standard SaaS pattern.
5. **Webhook-driven state** — All tier changes flow through Stripe webhooks. No direct user manipulation of subscription state.
6. **Idempotency via StripeEvents** — Prevents duplicate processing from Stripe's retry mechanism.
7. **B2B stays manual** — Enterprise customers get admin-assigned tiers. No Stripe integration for B2B.
8. **Webhook always returns 200** — Even on processing failure. Errors are logged and flagged for admin review via `processed: false` in StripeEvents.

---

## 10. Stripe Setup Prerequisites

Before this phase can be tested end-to-end, the following must be configured in Stripe Dashboard:

1. **Products** — Create products matching membership tiers (Regular, Premium, Enterprise)
2. **Prices** — Create monthly and yearly recurring prices for each product
3. **Customer Portal** — Enable and configure the Customer Portal in Stripe settings
4. **Webhook endpoint** — Register `https://paths-api.limitless-longevity.health/api/stripe/webhooks` with events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
5. **Link IDs** — Copy Stripe product/price IDs into MembershipTiers collection via Payload admin panel

For local development, use Stripe CLI (`stripe listen --forward-to localhost:3000/api/stripe/webhooks`) to forward test webhooks.

**Important:** `stripeMonthlyPriceId` and `stripeYearlyPriceId` on MembershipTiers must be populated before the checkout endpoint will function — `findTierByStripePrice` depends on them for mapping Stripe prices back to tiers.
