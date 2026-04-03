import { requireClinician } from '@/lib/auth'
import PatientDetailClient from './PatientDetailClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Patient Detail' }

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  await requireClinician()
  const { userId } = await params
  return <PatientDetailClient userId={userId} />
}
