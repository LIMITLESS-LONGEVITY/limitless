import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
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

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_HUB_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_HUB_URL}/membership?subscription=cancelled`,
      metadata: {
        pathsUserId: session.sub,
        email: session.email,
        plan,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('Membership subscribe error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
