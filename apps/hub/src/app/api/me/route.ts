import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Upsert user from JWT — create if not in DB yet, update tier/email if changed
    const user = await prisma.user.upsert({
      where: { pathsUserId: session.sub },
      create: {
        pathsUserId: session.sub,
        email: session.email,
        tier: session.tier ?? 'free',
      },
      update: {
        email: session.email,
        tier: session.tier ?? 'free',
      },
    })

    return NextResponse.json(user)
  } catch (err) {
    console.error('Me API error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
