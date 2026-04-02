import { requireClinician } from '@/lib/auth'
import ClinicianSidebar from '@/components/ClinicianSidebar'

export const dynamic = 'force-dynamic'

export default async function ClinicianLayout({ children }: { children: React.ReactNode }) {
  await requireClinician()

  return (
    <div className="min-h-[calc(100vh-73px)]">
      <ClinicianSidebar />
      <main className="lg:ml-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
