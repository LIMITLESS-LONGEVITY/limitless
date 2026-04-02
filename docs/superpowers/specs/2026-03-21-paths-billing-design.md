# PATHS Platform — Sub-project 6: Billing

**Date:** 2026-03-21
**Status:** Draft
**Platform:** LearnHouse (FastAPI + Next.js) + Stripe

## Context

Sub-projects 1-5 are complete. The platform has auth with membership tiers, articles with editorial workflow, tier-based access control, a public content browse/reader UI with upgrade CTAs, and org admin management. This final sub-project connects payments — letting B2C users self-service upgrade their tier via Stripe.

## Scope

### In scope
- Stripe Checkout integration for B2C subscription upgrades
- Subscription model: monthly/yearly per tier, admin-configured Stripe Price IDs
- Upgrade: immediate (prorated). Downgrade/cancel: end of billing period.
- Stripe webhook handling (subscription created, cancelled, payment failed, updated)
- StripeCustomer and StripeSubscription tracking tables
- Admin: Stripe config fields on MembershipTier (product ID, price IDs, display prices)
- User account page: current tier, billing info, upgrade/cancel
- ArticleTeaser "Upgrade" button links to account page
- Generic one-time purchase infrastructure (StripePayment table — not tied to content yet)
- Stripe test mode for development

### Out of scope
- B2B invoicing/billing (handled manually via superadmin)
- Content bundles, per-article, per-course purchases (future — infrastructure ready)
- Custom pricing pages (use Stripe Checkout hosted page)
- Stripe Connect (marketplace payouts)
- Refund management (handle in Stripe Dashboard)

## Architecture

```
User clicks "Upgrade" → /account page
  → Selects tier + billing period
  → POST /billing/checkout → creates Stripe Checkout Session
  → Redirect to Stripe Checkout (hosted page)
  → User pays
  → Stripe redirects to /billing/success?session_id=...
  → Stripe webhook → backend upgrades UserMembership
  → User has premium access
```

**Why Stripe Checkout:** PCI compliant (no card data on our servers), supports Apple Pay/Google Pay, professional UI, less code.

**Relationship to LearnHouse EE payments:** LearnHouse has an existing EE payment system (`PaymentsOffer`/`PaymentsEnrollment`) designed for course purchases. Our tier subscriptions are a **separate, parallel system** — different data models, different checkout flow, different webhook handlers. They coexist without conflict. The EE payment system may be used later for one-time course purchases.

**Stripe account:** Platform-wide — LIMITLESS's own Stripe account (not per-org Stripe Connect). B2B billing is manual, so no org-scoped Stripe accounts needed.

**Tier precedence:** If a user has both a manual superadmin-assigned tier AND a Stripe subscription, the **most recently activated tier wins** (most recent UserMembership with status="active"). In practice, superadmins should not manually assign tiers to users with active subscriptions. The admin UI should show a warning if the user has an active Stripe subscription.

## Data Model

### MembershipTier extensions

Add to existing MembershipTier model:
- `stripe_product_id` (string, nullable) — Stripe Product ID
- `stripe_price_monthly_id` (string, nullable) — Stripe Price ID for monthly billing
- `stripe_price_yearly_id` (string, nullable) — Stripe Price ID for yearly billing
- `price_monthly_display` (string, nullable) — display price e.g., "$19/mo" (for UI, not billing)
- `price_yearly_display` (string, nullable) — display price e.g., "$190/yr"

Tiers without Stripe IDs are not self-service purchasable (manual assignment only by superadmin).

### StripeCustomer (new)

```
StripeCustomer
├── id (PK)
├── user_id (FK → User, unique)
├── stripe_customer_id (string, unique) — Stripe Customer ID
├── creation_date (string, default_factory)
```

Links platform users to Stripe customers. Created on first checkout.

### StripeSubscription (new)

```
StripeSubscription
├── id (PK)
├── user_id (FK → User)
├── tier_id (FK → MembershipTier)
├── stripe_subscription_id (string, unique) — Stripe Subscription ID
├── status (string) — active, cancelling, cancelled, past_due
├── billing_period (string) — monthly, yearly
├── current_period_start (string)
├── current_period_end (string)
├── cancel_at_period_end (bool, default false)
├── creation_date (string, default_factory)
├── update_date (string, default_factory)
```

### StripePayment (new — generic one-time purchase tracking)

```
StripePayment
├── id (PK)
├── user_id (FK → User)
├── stripe_payment_intent_id (string, unique)
├── product_type (string) — "subscription", "one_time" (extensible for future)
├── product_reference (string, nullable) — reference to what was purchased (tier slug, future: bundle ID)
├── amount_cents (int)
├── currency (string, default "usd")
├── status (string) — succeeded, failed, refunded
├── creation_date (string, default_factory)
```

Generic tracking for all Stripe payments. Subscriptions get a record here too for audit trail.

## API Endpoints

### Billing endpoints (`/api/v1/billing/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/checkout` | Authenticated | Create Stripe Checkout Session for tier upgrade. Body: `{tier_id, billing_period: "monthly"|"yearly"}`. Returns `{checkout_url}` |
| `GET` | `/status` | Authenticated | Get current user's billing status: tier, subscription info, cancel_at_period_end, current_period_end |
| `POST` | `/cancel` | Authenticated | Cancel current subscription at period end |
| `GET` | `/portal` | Authenticated | Create Stripe Customer Portal session URL (for payment method updates, invoice history) |
| `POST` | `/webhook` | Public (Stripe signature verification) | Handle Stripe webhook events |

### Webhook events handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create StripeSubscription, upgrade UserMembership (expire old, create new with source="payment"), create StripePayment record |
| `invoice.payment_succeeded` | Update StripeSubscription period dates, create StripePayment record |
| `invoice.payment_failed` | Log event, update StripeSubscription status to "past_due". Do NOT downgrade immediately (Stripe retries). |
| `customer.subscription.deleted` | Expire StripeSubscription, expire UserMembership, auto-assign free tier |
| `customer.subscription.updated` | Update StripeSubscription (tier change, period change). If tier changed, update UserMembership. |

### Webhook security

Verify Stripe webhook signatures using `stripe.Webhook.construct_event()` with the webhook signing secret from config. Reject unsigned/invalid requests.

**Idempotency:** Webhook handlers must be idempotent. Use `stripe_subscription_id` (unique constraint) and `stripe_payment_intent_id` (unique constraint) to deduplicate replayed webhook events. If a record with the same Stripe ID already exists, skip processing.

**Payment failure flow:** When `invoice.payment_failed` fires, mark StripeSubscription as "past_due". Stripe retries failed payments automatically (default: 3 retries over ~3 weeks). If all retries fail, Stripe sends `customer.subscription.deleted` which triggers the downgrade to free. No custom retry logic needed.

**Proration:** Stripe handles proration automatically for mid-cycle upgrades. When `customer.subscription.updated` fires with a tier change, the backend immediately updates UserMembership to the new tier. The prorated charge is handled entirely by Stripe.

**Rate limiting:** `POST /billing/checkout` is rate-limited to 5 requests per minute per user to prevent session spam.

## Frontend

### Account page (new)

**Route:** `/account` within org layout

**Layout:**
- Current tier badge + name
- If paid subscription: billing period, next renewal date, "Cancel Subscription" button, "Manage Payment Method" link (→ Stripe Portal)
- If free tier: available paid tiers with prices (monthly/yearly toggle), "Upgrade" button per tier → creates checkout and redirects to Stripe
- If cancelling: "Your subscription ends on {date}" message

### Tier edit form enhancement (admin)

On the existing tier edit form (`admin.localhost:3000/tiers`), add:
- stripe_product_id text input
- stripe_price_monthly_id text input
- stripe_price_yearly_id text input
- price_monthly_display text input
- price_yearly_display text input

**Account page states:**
- **Free (no subscription):** shows available paid tiers with prices, upgrade buttons
- **Active subscription:** shows current tier, billing period, next renewal, cancel button, manage payment link
- **Cancelling:** shows "Your subscription ends on {date}", tier still active until then
- **Past due:** shows "Payment failed — please update your payment method" with link to Stripe Portal
- **Manually assigned (no Stripe sub):** shows current tier, no billing info, no cancel button

### ArticleTeaser CTA update

Change the "Upgrade" button on ArticleTeaser (from SP4) to link to `/account` instead of `/`.

## Stripe Configuration

In `config.yaml`, Stripe keys are already configured:
```yaml
payments_config:
  stripe:
    stripe_secret_key: "sk_test_..."
    stripe_publishable_key: "pk_test_..."
    stripe_webhook_standard_secret: "whsec_..."
```

For local development webhook testing, use Stripe CLI:
```bash
stripe listen --forward-to localhost:9000/api/v1/billing/webhook
```

## Testing & Verification Criteria

1. **Stripe Checkout flow** — POST /billing/checkout creates session, returns URL, Stripe page loads
2. **Webhook: subscription created** — checkout.session.completed upgrades UserMembership to paid tier
3. **Webhook: subscription cancelled** — customer.subscription.deleted downgrades to free
4. **Webhook: payment failed** — invoice.payment_failed logs event, doesn't immediately downgrade
5. **Tier access after upgrade** — newly upgraded user can read premium articles
6. **Cancel flow** — user cancels, keeps access until period end, then downgrades
7. **Admin config** — stripe_product_id and price IDs editable on tier form
8. **Account page** — shows current tier, billing info, upgrade/cancel buttons
9. **Stripe test mode** — all testing uses test keys and card 4242 4242 4242 4242
10. **ArticleTeaser CTA** — "Upgrade" button links to /account

## Success Criteria

1. All 10 verification criteria pass
2. Stripe webhook signature verification implemented (security)
3. UserMembership.source="payment" for Stripe-upgraded tiers
4. No card data stored on our servers (Stripe Checkout handles PCI)
5. Alembic migrations for new tables + tier extensions
6. Existing manual tier assignment (superadmin) still works alongside Stripe
