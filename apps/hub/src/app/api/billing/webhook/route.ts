import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { MEMBERSHIP_DISCOUNTS } from '@/lib/stripe-config'
import type Stripe from 'stripe'

/* ── PATHS tier sync helper ── */

async function syncPathsTier(userId: string, hubPlan: string) {
  const tierMap: Record<string, string> = {
    OPTIMUS: 'premium',
    IMMORTALITAS: 'premium',
    TRANSCENDENTIA: 'premium',
    VIP: 'premium',
    ECLINIC: 'regular',
  }
  const tier = tierMap[hubPlan] || 'free'

  const pathsUrl = process.env.PATHS_INTERNAL_URL || process.env.NEXT_PUBLIC_PATHS_URL
  if (!pathsUrl || !process.env.HUB_SERVICE_KEY) return

  try {
    await fetch(`${pathsUrl}/api/internal/tier-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': process.env.HUB_SERVICE_KEY,
      },
      body: JSON.stringify({ userId, tier }),
    })
  } catch (err) {
    console.error('PATHS tier sync failed:', err)
  }
}

export async function POST(request: Request) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })
    }

    const rawBody = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature or webhook secret.' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const pathsUserId = session.metadata?.pathsUserId
        const email = session.metadata?.email
        const plan = session.metadata?.plan

        if (!pathsUserId || !email || !plan) {
          console.error('Webhook: missing metadata on checkout session', session.id)
          break
        }

        // Upsert user
        const user = await prisma.user.upsert({
          where: { pathsUserId },
          create: { pathsUserId, email },
          update: { email },
        })

        // Create or update membership
        const discount = MEMBERSHIP_DISCOUNTS[plan] ?? 0
        await prisma.membership.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            plan: plan as 'OPTIMUS' | 'IMMORTALITAS' | 'TRANSCENDENTIA' | 'VIP',
            status: 'ACTIVE',
            stripeSubId: session.subscription as string,
            stripeCustId: session.customer as string,
            renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            diagnosticDiscount: discount,
          },
          update: {
            plan: plan as 'OPTIMUS' | 'IMMORTALITAS' | 'TRANSCENDENTIA' | 'VIP',
            status: 'ACTIVE',
            stripeSubId: session.subscription as string,
            stripeCustId: session.customer as string,
            diagnosticDiscount: discount,
          },
        })

        // Sync tier to PATHS
        await syncPathsTier(pathsUserId, plan)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = invoice.subscription as string | null
        if (!subId) break

        await prisma.membership.updateMany({
          where: { stripeSubId: subId },
          data: {
            status: 'ACTIVE',
            renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = invoice.subscription as string | null
        if (!subId) break

        await prisma.membership.updateMany({
          where: { stripeSubId: subId },
          data: { status: 'PAST_DUE' },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Find the membership to get the user's pathsUserId for tier sync
        const membership = await prisma.membership.findFirst({
          where: { stripeSubId: subscription.id },
          include: { user: true },
        })

        await prisma.membership.updateMany({
          where: { stripeSubId: subscription.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
        })

        // Sync tier to PATHS (downgrade to free)
        if (membership?.user?.pathsUserId) {
          await syncPathsTier(membership.user.pathsUserId, 'free')
        }
        break
      }

      default:
        // Unhandled event type — acknowledge receipt
        break
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    console.error('Billing webhook error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
