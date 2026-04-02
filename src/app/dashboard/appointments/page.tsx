import AppointmentsClient from './AppointmentsClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Appointments',
}

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl tracking-wide text-brand-gold sm:text-4xl">
        Appointments
      </h1>
      <AppointmentsClient />
    </div>
  )
}
