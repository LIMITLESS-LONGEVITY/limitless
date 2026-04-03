import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { MEMBERSHIP_PRICES } from '@/lib/stripe-config'

const VALID_PLANS = ['OPTIMUS', 'IMMORTALITAS', 'TRANSCENDENTIA', 'VIP', 'ECLINIC'] as const

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const { plan } = body as { plan: string }
    if (!plan || !VALID_PLANS.includes(plan as (typeof VALID_PLANS)[number])) {
      return NextResponse.json(
        { error: `Plan must be one of: ${VALID_PLANS.join(', ')}` },
        { status: 400 },
      )
    }

    const priceId = MEMBERSHIP_PRICES[plan]
    if (!priceId) {
      return NextResponse.json(
        { error: `Price not configured for plan: ${plan}` },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { pathsUserId: session.sub },
      include: { membership: true },
    })

    if (!user?.membership?.stripeSubId) {
      return NextResponse.json(
        { error: 'No active subscription found.' },
        { status: 404 },
      )
    }

    const subscription = await stripe.subscriptions.retrieve(user.membership.stripeSubId)
    await stripe.subscriptions.update(user.membership.stripeSubId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Membership change error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
