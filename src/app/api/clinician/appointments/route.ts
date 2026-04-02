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

    const appointments = await prisma.appointment.findMany({
      where: { clinicianId: clinician.id },
      include: { user: true },
      orderBy: { scheduledAt: 'desc' },
    })

    return NextResponse.json(appointments)
  } catch (err) {
    console.error('Clinician appointments API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
