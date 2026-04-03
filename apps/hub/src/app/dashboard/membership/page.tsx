import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { MembershipClient } from './MembershipClient'

export const metadata: Metadata = {
  title: 'Membership',
}

export const dynamic = 'force-dynamic'

export default async function MembershipPage() {
  await requireAuth()

  return <MembershipClient />
}
