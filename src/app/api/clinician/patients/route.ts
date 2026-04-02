import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clinician = await prisma.clinician.findFirst({
      where: { email: session.email },
    })

    if (!clinician) {
      return NextResponse.json([])
    }

    // Get unique patients from appointments + telemedicine
    const [appointmentUsers, teleUsers] = await Promise.all([
      prisma.appointment.findMany({
        where: { clinicianId: clinician.id },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.telemedicineBooking.findMany({
        where: { clinicianId: clinician.id },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ])

    const uniqueUserIds = [
      ...new Set([
        ...appointmentUsers.map((a) => a.userId),
        ...teleUsers.map((t) => t.userId),
      ]),
    ]

    if (uniqueUserIds.length === 0) {
      return NextResponse.json([])
    }

    const patients = await prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: {
        id: true,
        pathsUserId: true,
        email: true,
        firstName: true,
        lastName: true,
        tier: true,
      },
    })

    return NextResponse.json(patients)
  } catch (err) {
    console.error('Clinician patients API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
