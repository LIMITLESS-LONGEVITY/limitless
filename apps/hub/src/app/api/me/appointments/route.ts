import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { pathsUserId: session.sub },
    })

    if (!user) {
      return NextResponse.json([])
    }

    const appointments = await prisma.appointment.findMany({
      where: { userId: user.id },
      include: { clinician: true },
      orderBy: { scheduledAt: 'desc' },
    })

    return NextResponse.json(appointments)
  } catch (err) {
    console.error('Me appointments API error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
