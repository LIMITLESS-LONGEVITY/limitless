import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getPatientAIContext } from '@/lib/dt-client'
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

    // Look up the user's pathsUserId for the DT call
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pathsUserId: true },
    })

    if (!user?.pathsUserId) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const context = await getPatientAIContext(user.pathsUserId)
    if (!context) {
      return NextResponse.json({ error: 'Health data unavailable' }, { status: 404 })
    }

    return NextResponse.json(context)
  } catch (err) {
    console.error('Patient health API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
