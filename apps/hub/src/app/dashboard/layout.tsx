import { requireAuth } from '@/lib/auth'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth()

  return (
    <div className="min-h-[calc(100vh-73px)]">
      <DashboardSidebar />
      <main className="lg:ml-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
