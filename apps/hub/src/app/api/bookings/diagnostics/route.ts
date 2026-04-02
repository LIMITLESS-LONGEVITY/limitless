import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { MEMBERSHIP_DISCOUNTS } from '@/lib/stripe-config'

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

    const { packageId, notes, scheduledAt } = body as {
      packageId: string
      notes?: string
      scheduledAt?: string
    }

    if (!packageId || typeof packageId !== 'string') {
      return NextResponse.json({ error: 'packageId is required.' }, { status: 400 })
    }

    // Look up package
    const diagnosticPackage = await prisma.diagnosticPackage.findUnique({
      where: { id: packageId },
    })

    if (!diagnosticPackage || !diagnosticPackage.available) {
      return NextResponse.json({ error: 'Package not found or unavailable.' }, { status: 404 })
    }

    // Get or create user
    const user = await prisma.user.upsert({
      where: { pathsUserId: session.sub },
      create: { pathsUserId: session.sub, email: session.email },
      update: { email: session.email },
      include: { membership: true },
    })

    // Check membership requirement
    if (diagnosticPackage.requiresMembership && !user.membership) {
      return NextResponse.json(
        { error: 'This package requires an active membership.' },
        { status: 403 },
      )
    }

    // Calculate discount
    const discount = user.membership
      ? MEMBERSHIP_DISCOUNTS[user.membership.plan] ?? 0
      : 0
    const finalPrice = Math.round(diagnosticPackage.price * (1 - discount) * 100) // cents

    // Create Stripe Checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: diagnosticPackage.currency.toLowerCase(),
            product_data: { name: diagnosticPackage.name },
            unit_amount: finalPrice,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_HUB_URL}/dashboard/bookings?booking=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_HUB_URL}/diagnostics?booking=cancelled`,
      metadata: {
        type: 'diagnostic',
        pathsUserId: session.sub,
        packageId,
      },
    })

    // Create booking record
    const booking = await prisma.diagnosticBooking.create({
      data: {
        userId: user.id,
        packageId,
        status: 'PENDING',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        notes: notes ?? null,
        stripePaymentId: checkoutSession.id,
        amountPaid: finalPrice / 100,
        discountApplied: discount,
      },
    })

    return NextResponse.json({ url: checkoutSession.url, bookingId: booking.id })
  } catch (err) {
    console.error('Diagnostic booking error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
