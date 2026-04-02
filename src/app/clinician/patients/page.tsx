import { requireClinician } from '@/lib/auth'
import PatientsClient from './PatientsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Patients' }

export default async function PatientsPage() {
  await requireClinician()
  return <PatientsClient />
}
