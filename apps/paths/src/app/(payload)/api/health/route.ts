import { NextResponse } from 'next/server'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getPayload({ config: configPromise })
    // Simple DB query to verify the connection is alive
    await payload.count({ collection: 'users', where: { id: { equals: '' } } })
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
