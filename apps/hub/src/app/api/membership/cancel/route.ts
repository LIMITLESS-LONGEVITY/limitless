import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })
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

    await stripe.subscriptions.update(user.membership.stripeSubId, {
      cancel_at_period_end: true,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Membership cancel error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
