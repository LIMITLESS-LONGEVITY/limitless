import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params

    const [appointments, diagnostics, stays, telemedicine] = await Promise.all([
      prisma.appointment.findMany({
        where: { userId },
        include: { clinician: true },
        orderBy: { scheduledAt: 'desc' },
      }),
      prisma.diagnosticBooking.findMany({
        where: { userId },
        include: { package: true },
        orderBy: { scheduledAt: 'desc' },
      }),
      prisma.stayBooking.findMany({
        where: { userId },
        include: { package: true },
        orderBy: { checkIn: 'desc' },
      }),
      prisma.telemedicineBooking.findMany({
        where: { userId },
        include: { clinician: true },
        orderBy: { scheduledAt: 'desc' },
      }),
    ])

    return NextResponse.json({ appointments, diagnostics, stays, telemedicine })
  } catch (err) {
    console.error('Patient bookings API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
