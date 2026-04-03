import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardHomeClient from './DashboardHomeClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard',
}

const CLINICIAN_ROLES = ['admin', 'contributor', 'editor']

export default async function DashboardPage() {
  const session = await requireAuth()
  if (CLINICIAN_ROLES.includes(session.role)) {
    redirect('/clinician')
  }
  return <DashboardHomeClient email={session.email} tier={session.tier} />
}
