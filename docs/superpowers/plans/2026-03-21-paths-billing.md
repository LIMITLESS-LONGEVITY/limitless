# PATHS Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stripe subscription billing so B2C users can self-service upgrade their membership tier via Stripe Checkout.

**Architecture:** Separate billing system alongside LearnHouse's existing EE payments. New data models (StripeCustomer, StripeSubscription, StripePayment), billing API endpoints (checkout, status, cancel, portal, webhook), admin tier config for Stripe IDs, and user account page for upgrade/cancel.

**Tech Stack:** Python 3.13 / FastAPI / SQLModel / Stripe Python SDK / Next.js / React / TypeScript

**Spec:** `docs/superpowers/specs/2026-03-21-paths-billing-design.md`

---

## Tasks

### Task 1: Data Models + Migration

**Files:**
- Create: `learnhouse/apps/api/src/db/billing.py` — StripeCustomer, StripeSubscription, StripePayment models
- Modify: `learnhouse/apps/api/src/db/membership_tiers.py` — add Stripe fields
- Create: Alembic migration

- [ ] **Step 1: Add Stripe fields to MembershipTier**

In `src/db/membership_tiers.py`, add to `MembershipTierBase`:
```python
stripe_product_id: Optional[str] = None
stripe_price_monthly_id: Optional[str] = None
stripe_price_yearly_id: Optional[str] = None
price_monthly_display: Optional[str] = None  # e.g., "$19/mo"
price_yearly_display: Optional[str] = None    # e.g., "$190/yr"
```

Add to `MembershipTierUpdate`:
```python
stripe_product_id: Optional[str] = None
stripe_price_monthly_id: Optional[str] = None
stripe_price_yearly_id: Optional[str] = None
price_monthly_display: Optional[str] = None
price_yearly_display: Optional[str] = None
```

- [ ] **Step 2: Create billing models**

Create `src/db/billing.py`:

```python
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import Integer, ForeignKey


class StripeCustomer(SQLModel, table=True):
    __tablename__ = "stripe_customers"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id"), unique=True, nullable=False))
    stripe_customer_id: str = Field(unique=True, index=True)
    creation_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))


class StripeSubscription(SQLModel, table=True):
    __tablename__ = "stripe_subscriptions"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id"), nullable=False))
    tier_id: int = Field(sa_column=Column(Integer, ForeignKey("membership_tiers.id"), nullable=False))
    stripe_subscription_id: str = Field(unique=True, index=True)
    status: str = Field(default="active")  # active, cancelling, cancelled, past_due
    billing_period: str = Field(default="monthly")  # monthly, yearly
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None
    cancel_at_period_end: bool = Field(default=False)
    creation_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))
    update_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))


class StripePayment(SQLModel, table=True):
    __tablename__ = "stripe_payments"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id"), nullable=False))
    stripe_payment_intent_id: str = Field(unique=True, index=True)
    product_type: str = Field(default="subscription")  # subscription, one_time
    product_reference: Optional[str] = None  # tier slug or future product ID
    amount_cents: int = Field(default=0)
    currency: str = Field(default="usd")
    status: str = Field(default="succeeded")  # succeeded, failed, refunded
    creation_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))
```

Add Read schemas for API responses.

- [ ] **Step 3: Generate and apply migration**

```bash
cd learnhouse/apps/api
uv run alembic revision --autogenerate -m "add_billing_tables"
# Clean EE drops, apply
uv run alembic upgrade head
```

- [ ] **Step 4: Commit**

```bash
cd learnhouse && git commit -m "feat: add billing data models (StripeCustomer, StripeSubscription, StripePayment) and tier Stripe fields"
```

---

### Task 2: Billing Service + Checkout Endpoint

**Files:**
- Create: `learnhouse/apps/api/src/services/billing/__init__.py`
- Create: `learnhouse/apps/api/src/services/billing/billing.py`
- Create: `learnhouse/apps/api/src/routers/billing.py`
- Modify: `learnhouse/apps/api/src/router.py`

- [ ] **Step 1: Create billing service**

`src/services/billing/billing.py`:

Key functions:
- `get_or_create_stripe_customer(user, db_session)` — finds existing StripeCustomer or creates one via Stripe API
- `create_checkout_session(user, tier, billing_period, db_session)` — creates Stripe Checkout Session with the tier's price ID, returns checkout URL
- `get_billing_status(user_id, db_session)` — returns current tier, subscription info, cancellation status
- `cancel_subscription(user_id, db_session)` — calls Stripe to cancel at period end, updates StripeSubscription
- `create_portal_session(user_id, db_session)` — creates Stripe Customer Portal session URL

Stripe SDK usage:
```python
import stripe
from config.config import get_learnhouse_config

config = get_learnhouse_config()
stripe.api_key = config.payments_config.stripe.stripe_secret_key
```

For `create_checkout_session`:
```python
session = stripe.checkout.Session.create(
    customer=stripe_customer_id,
    mode="subscription",
    line_items=[{"price": price_id, "quantity": 1}],
    success_url=f"{frontend_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
    cancel_url=f"{frontend_url}/account",
    subscription_data={"metadata": {"tier_id": str(tier.id), "user_id": str(user.id)}},
)
```

- [ ] **Step 2: Create billing router**

`src/routers/billing.py`:

```python
router = APIRouter()

@router.post("/checkout")
# Auth required. Rate limit: 5/min per user.
# Body: {tier_id: int, billing_period: "monthly"|"yearly"}
# Returns: {checkout_url: str}

@router.get("/status")
# Auth required.
# Returns: {tier, subscription, cancel_at_period_end, current_period_end}

@router.post("/cancel")
# Auth required.
# Cancels at period end.

@router.get("/portal")
# Auth required.
# Returns: {portal_url: str}
```

Register: `v1_router.include_router(billing_router, prefix="/billing", tags=["Billing"])`

- [ ] **Step 3: Test checkout (requires Stripe test keys)**

If Stripe keys are configured:
```bash
curl -X POST http://127.0.0.1:9000/api/v1/billing/checkout \
  -H "Content-Type: application/json" \
  -b "access_token=..." \
  -d '{"tier_id": 2, "billing_period": "monthly"}'
# Should return {checkout_url: "https://checkout.stripe.com/..."}
```

If Stripe keys are NOT configured: endpoint should return a clear error message ("Stripe not configured").

- [ ] **Step 4: Commit**

```bash
cd learnhouse && git commit -m "feat: add billing service with Stripe Checkout, status, cancel, and portal endpoints"
```

---

### Task 3: Webhook Handler

**Files:**
- Create: `learnhouse/apps/api/src/services/billing/webhooks.py`
- Modify: `learnhouse/apps/api/src/routers/billing.py` — add webhook endpoint

- [ ] **Step 1: Create webhook handler service**

`src/services/billing/webhooks.py`:

```python
import stripe
from sqlmodel import Session, select
from src.db.billing import StripeSubscription, StripePayment, StripeCustomer
from src.db.membership_tiers import MembershipTier
from src.services.membership_tiers.user_memberships import assign_tier_to_user, auto_assign_free_tier
from src.db.user_memberships import UserMembershipCreate


def handle_checkout_completed(event, db_session):
    """New subscription created via checkout."""
    session = event.data.object
    subscription_id = session.subscription
    customer_id = session.customer
    metadata = session.metadata or {}

    tier_id = int(metadata.get("tier_id", 0))
    user_id = int(metadata.get("user_id", 0))

    if not tier_id or not user_id:
        return  # Invalid metadata

    # Idempotency: skip if already processed
    existing = db_session.exec(
        select(StripeSubscription).where(StripeSubscription.stripe_subscription_id == subscription_id)
    ).first()
    if existing:
        return

    # Get subscription details from Stripe
    sub = stripe.Subscription.retrieve(subscription_id)

    # Create StripeSubscription record
    stripe_sub = StripeSubscription(
        user_id=user_id,
        tier_id=tier_id,
        stripe_subscription_id=subscription_id,
        status="active",
        billing_period="yearly" if sub.items.data[0].price.recurring.interval == "year" else "monthly",
        current_period_start=str(sub.current_period_start),
        current_period_end=str(sub.current_period_end),
    )
    db_session.add(stripe_sub)

    # Upgrade UserMembership
    assign_tier_to_user(
        UserMembershipCreate(user_id=user_id, tier_id=tier_id, source="payment"),
        assigned_by=user_id,
        db_session=db_session,
    )

    # Create payment record
    # (payment intent may not be directly available — use session.payment_intent or generate from subscription)

    db_session.commit()


def handle_subscription_deleted(event, db_session):
    """Subscription ended — downgrade to free."""
    sub = event.data.object
    stripe_sub = db_session.exec(
        select(StripeSubscription).where(StripeSubscription.stripe_subscription_id == sub.id)
    ).first()
    if stripe_sub:
        stripe_sub.status = "cancelled"
        db_session.add(stripe_sub)
        auto_assign_free_tier(stripe_sub.user_id, db_session)
        db_session.commit()


def handle_payment_failed(event, db_session):
    """Payment failed — mark as past_due, don't downgrade yet."""
    invoice = event.data.object
    sub_id = invoice.subscription
    if sub_id:
        stripe_sub = db_session.exec(
            select(StripeSubscription).where(StripeSubscription.stripe_subscription_id == sub_id)
        ).first()
        if stripe_sub:
            stripe_sub.status = "past_due"
            db_session.add(stripe_sub)
            db_session.commit()


def handle_subscription_updated(event, db_session):
    """Subscription changed (tier upgrade/downgrade, period change)."""
    sub = event.data.object
    stripe_sub = db_session.exec(
        select(StripeSubscription).where(StripeSubscription.stripe_subscription_id == sub.id)
    ).first()
    if stripe_sub:
        stripe_sub.current_period_start = str(sub.current_period_start)
        stripe_sub.current_period_end = str(sub.current_period_end)
        stripe_sub.cancel_at_period_end = sub.cancel_at_period_end
        if sub.cancel_at_period_end:
            stripe_sub.status = "cancelling"
        db_session.add(stripe_sub)
        db_session.commit()
```

- [ ] **Step 2: Add webhook endpoint to billing router**

```python
@router.post("/webhook")
async def stripe_webhook(request: Request, db_session=Depends(get_db_session)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    config = get_learnhouse_config()
    webhook_secret = config.payments_config.stripe.stripe_webhook_standard_secret

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    handlers = {
        "checkout.session.completed": handle_checkout_completed,
        "customer.subscription.deleted": handle_subscription_deleted,
        "invoice.payment_failed": handle_payment_failed,
        "customer.subscription.updated": handle_subscription_updated,
    }

    handler = handlers.get(event.type)
    if handler:
        handler(event, db_session)

    return {"status": "ok"}
```

No auth on webhook endpoint — Stripe signature verification is the auth.

- [ ] **Step 3: Commit**

```bash
cd learnhouse && git commit -m "feat: add Stripe webhook handler for subscription lifecycle events"
```

---

### Task 4: Admin Tier Config + Account Page + CTA Update

**Files:**
- Modify: `learnhouse/apps/web/components/Admin/Tiers/TierForm.tsx` — add Stripe fields
- Create: `learnhouse/apps/web/app/orgs/[orgslug]/(withmenu)/account/page.tsx` — account page
- Create: `learnhouse/apps/web/components/Pages/Account/AccountBilling.tsx` — billing UI
- Create: `learnhouse/apps/web/services/billing/billing.ts` — billing API service
- Modify: `learnhouse/apps/web/components/Pages/Articles/ArticleTeaser.tsx` — update CTA link

- [ ] **Step 1: Add Stripe fields to tier edit form**

In the existing TierForm component, add 5 new text inputs:
- stripe_product_id
- stripe_price_monthly_id
- stripe_price_yearly_id
- price_monthly_display
- price_yearly_display

Group them in a "Stripe Configuration" section. These save via the existing tier update endpoint.

- [ ] **Step 2: Create billing API service**

`services/billing/billing.ts`:
- `createCheckout(tierId, billingPeriod, token)` — POST /billing/checkout
- `getBillingStatus(token)` — GET /billing/status
- `cancelSubscription(token)` — POST /billing/cancel
- `getPortalUrl(token)` — GET /billing/portal

- [ ] **Step 3: Create account page**

Route: `/account` within org `(withmenu)` layout.

Component `AccountBilling.tsx`:
- Fetch billing status from API
- Display based on state:
  - **Free:** show available paid tiers (from GET /tiers/, filter to those with stripe_price_monthly_id), monthly/yearly toggle, upgrade buttons
  - **Active subscription:** show tier name, billing period, next renewal, cancel button, manage payment link
  - **Cancelling:** show "ends on {date}" message
  - **Past due:** show warning + link to Stripe Portal
  - **Manual (no Stripe sub):** show tier name, no billing controls

Upgrade button: calls createCheckout() → gets checkout_url → `window.location.href = checkout_url`

Cancel button: confirmation dialog → calls cancelSubscription() → refresh status

- [ ] **Step 4: Create billing success page**

Route: `/billing/success` within org layout.

Simple page: "Payment successful! Your membership has been upgraded." + link back to articles.

This is where Stripe redirects after checkout. The actual tier upgrade happens via webhook (not on this page).

- [ ] **Step 5: Update ArticleTeaser CTA**

In `components/Pages/Articles/ArticleTeaser.tsx`, change the "Upgrade" button link from `/` to `/account`.

- [ ] **Step 6: Commit**

```bash
cd learnhouse && git commit -m "feat: add account page with billing UI, Stripe tier config, and upgrade CTA"
```

---

### Task 5: End-to-End Verification

- [ ] **Step 1:** Admin can set stripe_product_id and price IDs on a tier
- [ ] **Step 2:** Account page shows current tier and available upgrades (or placeholder if no Stripe keys)
- [ ] **Step 3:** ArticleTeaser "Upgrade" button links to /account
- [ ] **Step 4:** POST /billing/checkout creates a Stripe Checkout Session (if keys configured) or returns clear error
- [ ] **Step 5:** GET /billing/status returns correct billing state
- [ ] **Step 6:** POST /billing/cancel marks subscription for end-of-period cancellation
- [ ] **Step 7:** Webhook endpoint accepts and verifies Stripe signatures
- [ ] **Step 8:** Webhook: checkout.session.completed upgrades UserMembership
- [ ] **Step 9:** Webhook: customer.subscription.deleted downgrades to free
- [ ] **Step 10:** All billing endpoints require authentication (except webhook)

**Note:** Steps 4, 8, 9 require Stripe test keys and Stripe CLI for webhook forwarding. If keys are not configured, verify the code paths exist and return appropriate errors.

---

## Verification Checklist

- [ ] Stripe fields on tier edit form (admin)
- [ ] Account page shows tier + billing info
- [ ] ArticleTeaser CTA → /account
- [ ] Checkout endpoint creates Stripe session
- [ ] Billing status endpoint works
- [ ] Cancel endpoint works
- [ ] Webhook signature verification
- [ ] Webhook: subscription created → tier upgrade
- [ ] Webhook: subscription deleted → downgrade to free
- [ ] Auth required on all endpoints (except webhook)
