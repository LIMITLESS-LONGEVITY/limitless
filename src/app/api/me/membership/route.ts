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
      include: { membership: true },
    })

    if (!user) {
      return NextResponse.json(null)
    }

    return NextResponse.json(user.membership ?? null)
  } catch (err) {
    console.error('Me membership API error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
