import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

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

    const { packageId, checkIn, guests, specialRequests } = body as {
      packageId: string
      checkIn: string
      guests?: number
      specialRequests?: string
    }

    if (!packageId || typeof packageId !== 'string') {
      return NextResponse.json({ error: 'packageId is required.' }, { status: 400 })
    }

    if (!checkIn || typeof checkIn !== 'string') {
      return NextResponse.json({ error: 'checkIn date is required.' }, { status: 400 })
    }

    // Look up package
    const stayPackage = await prisma.stayPackage.findUnique({
      where: { id: packageId },
    })

    if (!stayPackage || !stayPackage.available) {
      return NextResponse.json({ error: 'Package not found or unavailable.' }, { status: 404 })
    }

    // Get or create user
    const user = await prisma.user.upsert({
      where: { pathsUserId: session.sub },
      create: { pathsUserId: session.sub, email: session.email },
      update: { email: session.email },
    })

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkInDate)
    checkOutDate.setDate(checkOutDate.getDate() + stayPackage.durationDays)

    const amountInCents = Math.round(stayPackage.price * 100)

    // Create Stripe Checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: stayPackage.currency.toLowerCase(),
            product_data: { name: stayPackage.name },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_HUB_URL}/dashboard/bookings?booking=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_HUB_URL}/stays?booking=cancelled`,
      metadata: {
        type: 'stay',
        pathsUserId: session.sub,
        packageId,
      },
    })

    // Create booking record
    const booking = await prisma.stayBooking.create({
      data: {
        userId: user.id,
        packageId,
        status: 'PENDING',
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: guests ?? 1,
        specialRequests: specialRequests ?? null,
        stripePaymentId: checkoutSession.id,
        amountPaid: stayPackage.price,
      },
    })

    return NextResponse.json({ url: checkoutSession.url, bookingId: booking.id })
  } catch (err) {
    console.error('Stay booking error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
