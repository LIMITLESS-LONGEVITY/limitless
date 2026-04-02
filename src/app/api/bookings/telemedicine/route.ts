import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { TELEMEDICINE_PRICES, PLANS_WITH_TELEMEDICINE } from '@/lib/stripe-config'

const VALID_TYPES = ['INITIAL', 'FOLLOW_UP', 'SPECIALIST'] as const

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const { type, scheduledAt, notes } = body as {
      type: string
      scheduledAt?: string
      notes?: string
    }

    if (!type || !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return NextResponse.json(
        { error: `Type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      )
    }

    // Get or create user
    const user = await prisma.user.upsert({
      where: { pathsUserId: session.sub },
      create: { pathsUserId: session.sub, email: session.email },
      update: { email: session.email },
      include: { membership: true },
    })

    // Check if covered by membership plan
    const coveredByPlan =
      user.membership?.status === 'ACTIVE' &&
      PLANS_WITH_TELEMEDICINE.includes(user.membership.plan)

    let checkoutUrl: string | null = null

    if (!coveredByPlan) {
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })
      }

      const price = TELEMEDICINE_PRICES[type]
      if (!price) {
        return NextResponse.json({ error: 'Invalid consultation type.' }, { status: 400 })
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: { name: `Telemedicine: ${type.replace('_', ' ')}` },
              unit_amount: price * 100,
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_HUB_URL}/dashboard/bookings?booking=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_HUB_URL}/telemedicine?booking=cancelled`,
        metadata: {
          type: 'telemedicine',
          pathsUserId: session.sub,
          consultType: type,
        },
      })

      checkoutUrl = checkoutSession.url
    }

    // Create booking record
    const booking = await prisma.telemedicineBooking.create({
      data: {
        userId: user.id,
        type: type as 'INITIAL' | 'FOLLOW_UP' | 'SPECIALIST',
        status: coveredByPlan ? 'CONFIRMED' : 'PENDING',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        notes: notes ?? null,
        coveredByPlan,
        amountPaid: coveredByPlan ? 0 : TELEMEDICINE_PRICES[type],
      },
    })

    return NextResponse.json({
      ...(checkoutUrl ? { url: checkoutUrl } : {}),
      bookingId: booking.id,
    })
  } catch (err) {
    console.error('Telemedicine booking error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
