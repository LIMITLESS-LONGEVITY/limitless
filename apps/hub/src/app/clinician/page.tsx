import { requireClinician } from '@/lib/auth'
import ClinicianDashClient from './ClinicianDashClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Clinician Dashboard' }

export default async function ClinicianPage() {
  const session = await requireClinician()
  return <ClinicianDashClient email={session.email} />
}
