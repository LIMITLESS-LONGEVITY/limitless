# PATHS Payload CMS — Phase 5: Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stripe-based subscription billing — users can subscribe to tiers via Stripe Checkout, manage subscriptions via Customer Portal, with webhook-driven tier sync and idempotent event processing.

**Architecture:** Custom Stripe SDK integration (not the Payload plugin). Stripe service layer handles SDK operations, webhook endpoint processes events and syncs user tiers, two new collections track subscriptions and event idempotency. Checkout endpoint creates initial subscriptions, Customer Portal handles plan changes and cancellations.

**Tech Stack:** Payload CMS 3.x, TypeScript, Stripe SDK (`stripe` npm package), PostgreSQL, Vitest

**Spec:** `docs/superpowers/specs/2026-03-23-paths-phase5-billing-design.md`

**Depends on:** Phase 1 (Users with `stripeCustomerId`, MembershipTiers with Stripe price IDs), Phase 4 (Enrollments with `paymentStatus`)

**Working directory:** `C:/Projects/LIMITLESS/limitless-paths/`

---

## File Structure

New and modified files for this phase:

```
src/
├── stripe/
│   ├── client.ts                    # Stripe SDK initialization
│   ├── customers.ts                 # Create/retrieve Stripe customers
│   ├── checkout.ts                  # Create Checkout Sessions
│   └── portal.ts                    # Create Customer Portal sessions
├── collections/
│   ├── Subscriptions/
│   │   └── index.ts                 # Subscription records
│   └── StripeEvents/
│       └── index.ts                 # Webhook idempotency log
├── hooks/
│   └── syncUserTier.ts              # Shared: update user tier + find tier by Stripe price
├── endpoints/
│   ├── billing/
│   │   ├── checkout.ts              # POST /api/billing/checkout
│   │   └── portal.ts                # POST /api/billing/portal
│   └── stripe/
│       └── webhooks.ts              # POST /api/stripe/webhooks
└── payload.config.ts                # Modified: register collections + endpoints
tests/
└── int/
    ├── stripe-service.int.spec.ts   # Stripe client + service layer tests
    └── billing-logic.int.spec.ts    # Tier sync helper tests
```

---

## Task 1: Install Stripe SDK

**Files:**
- Modify: `package.json` (via pnpm add)

- [ ] **Step 1: Install the Stripe SDK**

```bash
pnpm add stripe
```

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "Add Stripe SDK for billing integration"
```

---

## Task 2: Build Stripe Service Layer

**Files:**
- Create: `src/stripe/client.ts`
- Create: `src/stripe/customers.ts`
- Create: `src/stripe/checkout.ts`
- Create: `src/stripe/portal.ts`
- Create: `tests/int/stripe-service.int.spec.ts`

- [ ] **Step 1: Write Stripe service tests**

`tests/int/stripe-service.int.spec.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getStripe, clearStripeClient } from '@/stripe/client'

describe('Stripe client', () => {
  beforeEach(() => {
    clearStripeClient()
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake_key_for_testing')
  })

  describe('getStripe', () => {
    it('returns a Stripe instance', () => {
      const stripe = getStripe()
      expect(stripe).toBeDefined()
      expect(typeof stripe.customers).toBe('object')
    })

    it('returns the same instance on subsequent calls', () => {
      const a = getStripe()
      const b = getStripe()
      expect(a).toBe(b)
    })

    it('throws if STRIPE_SECRET_KEY is not set', () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '')
      expect(() => getStripe()).toThrow('STRIPE_SECRET_KEY is not configured')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/int/stripe-service.int.spec.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement Stripe client**

`src/stripe/client.ts`:
```ts
import Stripe from 'stripe'

let stripeClient: Stripe | null = null

/**
 * Get the shared Stripe SDK instance.
 * Initialized from STRIPE_SECRET_KEY env var.
 */
export function getStripe(): Stripe {
  if (stripeClient) return stripeClient

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  stripeClient = new Stripe(key)
  return stripeClient
}

/**
 * Clear the cached client (for testing).
 */
export function clearStripeClient(): void {
  stripeClient = null
}
```

- [ ] **Step 4: Implement customers module**

`src/stripe/customers.ts`:
```ts
import { getStripe } from './client'
import type Stripe from 'stripe'

/**
 * Get or create a Stripe customer for a Payload user.
 * If the user already has a stripeCustomerId, retrieve it.
 * Otherwise create a new customer.
 *
 * Note: The caller is responsible for saving stripeCustomerId
 * back to the Payload user record.
 */
export async function getOrCreateCustomer(user: {
  id: string
  email: string
  firstName?: string
  lastName?: string
  stripeCustomerId?: string | null
}): Promise<Stripe.Customer> {
  const stripe = getStripe()

  // Retrieve existing customer
  if (user.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerId)
      if (!existing.deleted) {
        return existing as Stripe.Customer
      }
    } catch {
      // Customer not found in Stripe — create new one
    }
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
    metadata: {
      payloadUserId: user.id,
    },
  })

  return customer
}
```

- [ ] **Step 5: Implement checkout module**

`src/stripe/checkout.ts`:
```ts
import { getStripe } from './client'
import type Stripe from 'stripe'

export interface CheckoutOptions {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
  metadata: {
    userId: string
    tierId: string
  }
}

/**
 * Create a Stripe Checkout Session for a subscription.
 */
export async function createCheckoutSession(
  options: CheckoutOptions,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()

  return stripe.checkout.sessions.create({
    customer: options.customerId,
    mode: 'subscription',
    line_items: [
      {
        price: options.priceId,
        quantity: 1,
      },
    ],
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    metadata: options.metadata,
    subscription_data: {
      metadata: options.metadata,
    },
  })
}
```

- [ ] **Step 6: Implement portal module**

`src/stripe/portal.ts`:
```ts
import { getStripe } from './client'
import type Stripe from 'stripe'

/**
 * Create a Stripe Customer Portal session for subscription management.
 */
export async function createPortalSession(options: {
  customerId: string
  returnUrl: string
}): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe()

  return stripe.billingPortal.sessions.create({
    customer: options.customerId,
    return_url: options.returnUrl,
  })
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
pnpm vitest run tests/int/stripe-service.int.spec.ts
```

Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/stripe/ tests/int/stripe-service.int.spec.ts
git commit -m "Add Stripe service layer: client, customers, checkout, portal"
```

---

## Task 3: Build Tier Sync Helpers

**Files:**
- Create: `src/hooks/syncUserTier.ts`
- Create: `tests/int/billing-logic.int.spec.ts`

- [ ] **Step 1: Write tier sync tests**

`tests/int/billing-logic.int.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { matchPriceToInterval } from '@/hooks/syncUserTier'

describe('Billing logic', () => {
  describe('matchPriceToInterval', () => {
    it('returns monthly when price matches monthly ID', () => {
      const tier = {
        stripeMonthlyPriceId: 'price_monthly_123',
        stripeYearlyPriceId: 'price_yearly_456',
      }
      expect(matchPriceToInterval(tier, 'price_monthly_123')).toBe('monthly')
    })

    it('returns yearly when price matches yearly ID', () => {
      const tier = {
        stripeMonthlyPriceId: 'price_monthly_123',
        stripeYearlyPriceId: 'price_yearly_456',
      }
      expect(matchPriceToInterval(tier, 'price_yearly_456')).toBe('yearly')
    })

    it('returns null when price matches neither', () => {
      const tier = {
        stripeMonthlyPriceId: 'price_monthly_123',
        stripeYearlyPriceId: 'price_yearly_456',
      }
      expect(matchPriceToInterval(tier, 'price_unknown')).toBeNull()
    })

    it('handles missing price IDs', () => {
      expect(matchPriceToInterval({}, 'price_123')).toBeNull()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/int/billing-logic.int.spec.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement tier sync helpers**

`src/hooks/syncUserTier.ts`:
```ts
import type { Payload, PayloadRequest } from 'payload'

/**
 * Determine billing interval from a Stripe price ID by matching against tier fields.
 * Exported for testing.
 */
export function matchPriceToInterval(
  tier: { stripeMonthlyPriceId?: string | null; stripeYearlyPriceId?: string | null },
  priceId: string,
): 'monthly' | 'yearly' | null {
  if (tier.stripeMonthlyPriceId === priceId) return 'monthly'
  if (tier.stripeYearlyPriceId === priceId) return 'yearly'
  return null
}

/**
 * Find a membership tier by its Stripe price ID.
 * Searches both stripeMonthlyPriceId and stripeYearlyPriceId.
 */
export async function findTierByStripePrice(
  payload: Payload,
  req: PayloadRequest,
  priceId: string,
): Promise<any | null> {
  // Check monthly price
  const monthlyMatch = await payload.find({
    collection: 'membership-tiers',
    where: { stripeMonthlyPriceId: { equals: priceId } },
    limit: 1,
    req,
  })
  if (monthlyMatch.totalDocs > 0) return monthlyMatch.docs[0]

  // Check yearly price
  const yearlyMatch = await payload.find({
    collection: 'membership-tiers',
    where: { stripeYearlyPriceId: { equals: priceId } },
    limit: 1,
    req,
  })
  if (yearlyMatch.totalDocs > 0) return yearlyMatch.docs[0]

  return null
}

/**
 * Update a user's tier relationship.
 * Used by the webhook handler after subscription changes.
 */
export async function syncUserTier(
  payload: Payload,
  req: PayloadRequest,
  userId: string,
  tierId: string,
): Promise<void> {
  await payload.update({
    collection: 'users',
    id: userId,
    data: { tier: tierId },
    req,
  })
}

/**
 * Downgrade a user to the free tier.
 */
export async function downgradeToFree(
  payload: Payload,
  req: PayloadRequest,
  userId: string,
): Promise<void> {
  const freeTier = await payload.find({
    collection: 'membership-tiers',
    where: { accessLevel: { equals: 'free' } },
    limit: 1,
    req,
  })

  if (freeTier.totalDocs > 0) {
    await payload.update({
      collection: 'users',
      id: userId,
      data: { tier: freeTier.docs[0].id },
      req,
    })
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run tests/int/billing-logic.int.spec.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/syncUserTier.ts tests/int/billing-logic.int.spec.ts
git commit -m "Add tier sync helpers: find tier by Stripe price, sync user tier, downgrade to free"
```

---

## Task 4: Create Subscriptions and StripeEvents Collections

**Files:**
- Create: `src/collections/Subscriptions/index.ts`
- Create: `src/collections/StripeEvents/index.ts`
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Create the Subscriptions collection**

`src/collections/Subscriptions/index.ts`:
```ts
import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../access/isAdmin'
import { canAccessOwnOrStaff } from '../../access/canAccessOwnOrStaff'

export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  admin: {
    useAsTitle: 'stripeSubscriptionId',
    defaultColumns: ['user', 'tier', 'status', 'billingInterval', 'currentPeriodEnd', 'cancelAtPeriodEnd'],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'tier',
      type: 'relationship',
      relationTo: 'membership-tiers',
      required: true,
    },
    {
      name: 'stripeSubscriptionId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'stripeCustomerId',
      type: 'text',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Past Due', value: 'past_due' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    {
      name: 'billingInterval',
      type: 'select',
      required: true,
      options: [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Yearly', value: 'yearly' },
      ],
    },
    { name: 'currentPeriodStart', type: 'date' },
    { name: 'currentPeriodEnd', type: 'date' },
    {
      name: 'cancelAtPeriodEnd',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
  access: {
    create: () => false,  // Only created by webhook handler
    read: canAccessOwnOrStaff,
    update: () => false,  // Only updated by webhook handler
    delete: isAdmin,
  },
}
```

- [ ] **Step 2: Create the StripeEvents collection**

`src/collections/StripeEvents/index.ts`:
```ts
import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../access/isAdmin'

export const StripeEvents: CollectionConfig = {
  slug: 'stripe-events',
  admin: {
    useAsTitle: 'stripeEventId',
    defaultColumns: ['stripeEventId', 'eventType', 'processed', 'createdAt'],
  },
  fields: [
    {
      name: 'stripeEventId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'eventType',
      type: 'text',
      required: true,
    },
    {
      name: 'processed',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  access: {
    create: () => false,  // Only created by webhook handler
    read: isAdmin,
    update: () => false,
    delete: isAdmin,
  },
}
```

- [ ] **Step 3: Register both in payload.config.ts**

Add imports:
```ts
import { Subscriptions } from './collections/Subscriptions'
import { StripeEvents } from './collections/StripeEvents'
```

Add both to the `collections` array.

- [ ] **Step 4: Commit**

```bash
git add src/collections/Subscriptions/ src/collections/StripeEvents/ src/payload.config.ts
git commit -m "Add Subscriptions and StripeEvents collections for billing state tracking"
```

---

## Task 5: Build Webhook Handler

**Files:**
- Create: `src/endpoints/stripe/webhooks.ts`
- Modify: `src/payload.config.ts` (register endpoint)

- [ ] **Step 1: Create the webhook handler**

`src/endpoints/stripe/webhooks.ts`:
```ts
import type { Endpoint } from 'payload'
import { getStripe } from '../../stripe/client'
import { findTierByStripePrice, syncUserTier, downgradeToFree, matchPriceToInterval } from '../../hooks/syncUserTier'

export const stripeWebhookEndpoint: Endpoint = {
  path: '/stripe/webhooks',
  method: 'post',
  handler: async (req) => {
    const stripe = getStripe()

    // 1. Verify webhook signature
    const signature = req.headers.get('stripe-signature')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!signature || !webhookSecret) {
      return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
    }

    let event
    try {
      const rawBody = await req.text?.()
      if (!rawBody) {
        return Response.json({ error: 'Empty request body' }, { status: 400 })
      }
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', (err as Error).message)
      return Response.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // 2. Idempotency check
    const existing = await req.payload.find({
      collection: 'stripe-events',
      where: { stripeEventId: { equals: event.id } },
      limit: 1,
      overrideAccess: true,
      req,
    })

    if (existing.totalDocs > 0) {
      return Response.json({ received: true, duplicate: true })
    }

    // 3. Process event
    let processed = true
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object as any, req)
          break
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as any, req)
          break
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as any, req)
          break
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as any, req)
          break
        default:
          // Unhandled event type — ignore
          break
      }
    } catch (err) {
      console.error(`[Stripe Webhook] Error processing ${event.type}:`, (err as Error).message)
      processed = false
    }

    // 4. Log event for idempotency
    try {
      await req.payload.create({
        collection: 'stripe-events',
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          processed,
        },
        overrideAccess: true,
        req,
      })
    } catch (err) {
      console.error('[Stripe Webhook] Failed to log event:', (err as Error).message)
    }

    // Always return 200 to Stripe
    return Response.json({ received: true })
  },
}

/**
 * Handle checkout.session.completed
 * Creates subscription record and upgrades user tier.
 */
async function handleCheckoutCompleted(session: any, req: any): Promise<void> {
  const userId = session.metadata?.userId
  const tierId = session.metadata?.tierId

  if (!userId || !tierId) {
    console.error('[Stripe Webhook] checkout.session.completed missing metadata')
    return
  }

  const stripe = getStripe()

  // Fetch the Stripe subscription for billing details
  const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string)
  const priceId = stripeSubscription.items.data[0]?.price?.id
  const interval = stripeSubscription.items.data[0]?.plan?.interval

  // Find the tier to determine billing interval
  const tier = await req.payload.findByID({
    collection: 'membership-tiers',
    id: tierId,
    req,
    overrideAccess: true,
  })

  const billingInterval = matchPriceToInterval(tier, priceId ?? '') ?? (interval === 'year' ? 'yearly' : 'monthly')

  // Create subscription record
  await req.payload.create({
    collection: 'subscriptions',
    data: {
      user: userId,
      tier: tierId,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: session.customer as string,
      status: 'active',
      billingInterval,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
    overrideAccess: true,
    req,
  })

  // Upgrade user tier
  await syncUserTier(req.payload, req, userId, tierId)

  // Update any pending enrollments for this user's courses to 'paid'
  const pendingEnrollments = await req.payload.find({
    collection: 'enrollments',
    where: {
      and: [
        { user: { equals: userId } },
        { paymentStatus: { equals: 'pending' } },
      ],
    },
    overrideAccess: true,
    req,
  })

  for (const enrollment of pendingEnrollments.docs) {
    await req.payload.update({
      collection: 'enrollments',
      id: enrollment.id,
      data: { paymentStatus: 'paid' },
      overrideAccess: true,
      req,
    })
  }

  // Update stripeCustomerId on user if not set
  const user = await req.payload.findByID({
    collection: 'users',
    id: userId,
    req,
    overrideAccess: true,
  })

  if (!user.stripeCustomerId) {
    await req.payload.update({
      collection: 'users',
      id: userId,
      data: { stripeCustomerId: session.customer as string },
      req,
      overrideAccess: true,
    })
  }
}

/**
 * Handle customer.subscription.updated
 * Syncs subscription status and handles plan changes.
 */
async function handleSubscriptionUpdated(subscription: any, req: any): Promise<void> {
  // Find local subscription
  const localSubs = await req.payload.find({
    collection: 'subscriptions',
    where: { stripeSubscriptionId: { equals: subscription.id } },
    limit: 1,
    overrideAccess: true,
    req,
  })

  if (localSubs.totalDocs === 0) return

  const localSub = localSubs.docs[0]

  // Map Stripe status to our status
  let status = localSub.status
  if (subscription.status === 'active') status = 'active'
  else if (subscription.status === 'past_due') status = 'past_due'
  else if (subscription.status === 'canceled') status = 'cancelled'

  // Sync subscription data
  await req.payload.update({
    collection: 'subscriptions',
    id: localSub.id,
    data: {
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    overrideAccess: true,
    req,
  })

  // Check for plan change — if the price changed, update the user's tier
  const newPriceId = subscription.items?.data?.[0]?.price?.id
  if (newPriceId) {
    const newTier = await findTierByStripePrice(req.payload, req, newPriceId)
    if (newTier) {
      const currentTierId = typeof localSub.tier === 'string' ? localSub.tier : localSub.tier?.id
      if (newTier.id !== currentTierId) {
        // Plan changed — update subscription tier and user tier
        await req.payload.update({
          collection: 'subscriptions',
          id: localSub.id,
          data: { tier: newTier.id },
          overrideAccess: true,
          req,
        })
        const userId = typeof localSub.user === 'string' ? localSub.user : localSub.user?.id
        if (userId) {
          await syncUserTier(req.payload, req, userId, newTier.id)
        }
      }
    }
  }
}

/**
 * Handle customer.subscription.deleted
 * Downgrades user to free tier.
 */
async function handleSubscriptionDeleted(subscription: any, req: any): Promise<void> {
  const localSubs = await req.payload.find({
    collection: 'subscriptions',
    where: { stripeSubscriptionId: { equals: subscription.id } },
    limit: 1,
    overrideAccess: true,
    req,
  })

  if (localSubs.totalDocs === 0) return

  const localSub = localSubs.docs[0]

  // Mark subscription as cancelled
  await req.payload.update({
    collection: 'subscriptions',
    id: localSub.id,
    data: { status: 'cancelled' },
    overrideAccess: true,
    req,
  })

  // Downgrade user to free tier
  const userId = typeof localSub.user === 'string' ? localSub.user : localSub.user?.id
  if (userId) {
    await downgradeToFree(req.payload, req, userId)
  }
}

/**
 * Handle invoice.payment_failed
 * Marks subscription as past_due.
 */
async function handlePaymentFailed(invoice: any, req: any): Promise<void> {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  const localSubs = await req.payload.find({
    collection: 'subscriptions',
    where: { stripeSubscriptionId: { equals: subscriptionId } },
    limit: 1,
    overrideAccess: true,
    req,
  })

  if (localSubs.totalDocs === 0) return

  await req.payload.update({
    collection: 'subscriptions',
    id: localSubs.docs[0].id,
    data: { status: 'past_due' },
    overrideAccess: true,
    req,
  })
}
```

- [ ] **Step 2: Register webhook endpoint in payload.config.ts**

Add import:
```ts
import { stripeWebhookEndpoint } from './endpoints/stripe/webhooks'
```

Add `stripeWebhookEndpoint` to the `endpoints` array.

- [ ] **Step 3: Commit**

```bash
git add src/endpoints/stripe/webhooks.ts src/payload.config.ts
git commit -m "Add Stripe webhook handler with idempotent event processing and tier sync"
```

---

## Task 6: Build Billing Endpoints (Checkout + Portal)

**Files:**
- Create: `src/endpoints/billing/checkout.ts`
- Create: `src/endpoints/billing/portal.ts`
- Modify: `src/payload.config.ts` (register endpoints)

- [ ] **Step 1: Create the checkout endpoint**

`src/endpoints/billing/checkout.ts`:
```ts
import type { Endpoint } from 'payload'
import { getOrCreateCustomer } from '../../stripe/customers'
import { createCheckoutSession } from '../../stripe/checkout'
import { getServerSideURL } from '../../utilities/getURL'

export const billingCheckoutEndpoint: Endpoint = {
  path: '/billing/checkout',
  method: 'post',
  handler: async (req) => {
    // 1. Authenticate
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await req.json?.() as {
      tierId?: string
      interval?: 'monthly' | 'yearly'
      successUrl?: string
      cancelUrl?: string
    } | undefined

    if (!body?.tierId || !body?.interval) {
      return Response.json({ error: 'Missing required fields: tierId, interval' }, { status: 400 })
    }

    if (body.interval !== 'monthly' && body.interval !== 'yearly') {
      return Response.json({ error: 'Invalid interval. Must be "monthly" or "yearly".' }, { status: 400 })
    }

    // 3. Fetch the membership tier
    let tier: any
    try {
      tier = await req.payload.findByID({
        collection: 'membership-tiers',
        id: body.tierId,
        req,
        overrideAccess: true,
      })
    } catch {
      return Response.json({ error: 'Tier not found' }, { status: 404 })
    }

    if (!tier.isActive) {
      return Response.json({ error: 'Tier not found' }, { status: 404 })
    }

    // 4. Get the Stripe price ID
    const priceId = body.interval === 'monthly'
      ? tier.stripeMonthlyPriceId
      : tier.stripeYearlyPriceId

    if (!priceId) {
      return Response.json({ error: 'Tier has no Stripe price configured for this interval' }, { status: 400 })
    }

    // 5. Check for existing active subscription
    const existingSubs = await req.payload.find({
      collection: 'subscriptions',
      where: {
        and: [
          { user: { equals: req.user.id } },
          { status: { in: ['active', 'past_due'] } },
        ],
      },
      limit: 1,
      overrideAccess: true,
      req,
    })

    if (existingSubs.totalDocs > 0) {
      return Response.json({
        error: 'You already have an active subscription. Use the Customer Portal to manage your plan.',
      }, { status: 409 })
    }

    // 6. Get or create Stripe customer
    const customer = await getOrCreateCustomer({
      id: req.user.id as string,
      email: req.user.email as string,
      firstName: (req.user as any).firstName,
      lastName: (req.user as any).lastName,
      stripeCustomerId: (req.user as any).stripeCustomerId,
    })

    // Save stripeCustomerId if new
    if (!(req.user as any).stripeCustomerId) {
      await req.payload.update({
        collection: 'users',
        id: req.user.id,
        data: { stripeCustomerId: customer.id },
        req,
        overrideAccess: true,
      })
    }

    // 7. Create Checkout Session
    const baseUrl = getServerSideURL()
    const session = await createCheckoutSession({
      customerId: customer.id,
      priceId,
      successUrl: body.successUrl ?? `${baseUrl}/account/billing?success=true`,
      cancelUrl: body.cancelUrl ?? `${baseUrl}/account/billing?cancelled=true`,
      metadata: {
        userId: req.user.id as string,
        tierId: body.tierId,
      },
    })

    return Response.json({ url: session.url })
  },
}
```

- [ ] **Step 2: Create the portal endpoint**

`src/endpoints/billing/portal.ts`:
```ts
import type { Endpoint } from 'payload'
import { createPortalSession } from '../../stripe/portal'
import { getServerSideURL } from '../../utilities/getURL'

export const billingPortalEndpoint: Endpoint = {
  path: '/billing/portal',
  method: 'post',
  handler: async (req) => {
    // 1. Authenticate
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Check for stripeCustomerId
    const stripeCustomerId = (req.user as any).stripeCustomerId as string | undefined
    if (!stripeCustomerId) {
      return Response.json({ error: 'No billing account found. Subscribe to a plan first.' }, { status: 400 })
    }

    // 3. Parse optional return URL
    const body = await req.json?.() as { returnUrl?: string } | undefined

    // 4. Create portal session
    const baseUrl = getServerSideURL()
    const session = await createPortalSession({
      customerId: stripeCustomerId,
      returnUrl: body?.returnUrl ?? `${baseUrl}/account/billing`,
    })

    return Response.json({ url: session.url })
  },
}
```

- [ ] **Step 3: Register both endpoints in payload.config.ts**

Add imports:
```ts
import { billingCheckoutEndpoint } from './endpoints/billing/checkout'
import { billingPortalEndpoint } from './endpoints/billing/portal'
```

Add both to the `endpoints` array.

- [ ] **Step 4: Commit**

```bash
git add src/endpoints/billing/ src/payload.config.ts
git commit -m "Add billing checkout and portal endpoints for Stripe subscription management"
```

---

## Task 7: Full Test Suite, Migration, and Build Verification

**Files:** No new files — verification only.

- [ ] **Step 1: Run all unit tests**

```bash
pnpm vitest run
```

Expected: All unit tests pass.

- [ ] **Step 2: Generate types and import map**

```bash
pnpm generate:types
pnpm generate:importmap
```

- [ ] **Step 3: Create database migration**

```bash
docker compose up -d
# Wait for DB to be ready
pnpm payload migrate
pnpm payload migrate:create
```

- [ ] **Step 4: Run production build**

```bash
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit generated files**

```bash
git add src/migrations/ src/payload-types.ts src/app/\(payload\)/admin/importMap.js
git commit -m "Add Phase 5 migration, regenerate types and import map"
```

- [ ] **Step 6: Stop containers**

```bash
docker compose down
```

---

## Phase 5 Milestone Checklist

After completing all 7 tasks, verify:

- [ ] Stripe SDK installed and client initializes from env var
- [ ] Customer creation/retrieval working
- [ ] Checkout Session creation with subscription mode and metadata
- [ ] Customer Portal session creation
- [ ] Subscriptions collection tracking subscription state
- [ ] StripeEvents collection preventing duplicate webhook processing
- [ ] Webhook handler processes: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
- [ ] Webhook signature verification rejecting invalid events
- [ ] Checkout endpoint validates tier, checks for existing subscription, creates Stripe customer
- [ ] Portal endpoint returns portal URL for existing customers
- [ ] Tier sync: checkout upgrades tier, plan change updates tier, deletion downgrades to free
- [ ] All nested Payload operations pass `req` (transaction safety)
- [ ] All unit tests passing
- [ ] Database migration created
- [ ] Production build succeeds

**Deferred to Phase 6:**
- Frontend billing page, pricing display, upgrade CTAs
- Stripe Dashboard configuration (products, prices, portal, webhook endpoint)
- End-to-end testing with Stripe test mode
- Re-processing mechanism for failed webhook events

**Next:** Phase 6 plan (Frontend & Polish)
