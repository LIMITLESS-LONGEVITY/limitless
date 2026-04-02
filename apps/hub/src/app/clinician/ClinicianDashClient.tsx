'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import GlassCard from '@/components/dashboard/GlassCard'

interface Appointment {
  id: string
  title: string
  type: string
  scheduledAt: string
  status: string
  user: { firstName: string | null; lastName: string | null; email: string }
}

export default function ClinicianDashClient({ email }: { email: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/clinician/appointments')
      .then((r) => (r.ok ? r.json() : []))
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const todaysAppointments = appointments.filter(
    (a) => a.scheduledAt?.startsWith(today),
  )
  const upcomingCount = appointments.filter(
    (a) => new Date(a.scheduledAt) > new Date() && a.status !== 'CANCELLED',
  ).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-light tracking-wide text-brand-light">
          Clinician Dashboard
        </h1>
        <p className="mt-1 text-sm text-brand-silver">{email}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <GlassCard>
          <p className="text-2xl font-display font-light text-brand-gold">{todaysAppointments.length}</p>
          <p className="text-xs text-brand-silver mt-1">Today</p>
        </GlassCard>
        <GlassCard>
          <p className="text-2xl font-display font-light text-brand-light">{upcomingCount}</p>
          <p className="text-xs text-brand-silver mt-1">Upcoming</p>
        </GlassCard>
        <GlassCard>
          <p className="text-2xl font-display font-light text-brand-light">{appointments.length}</p>
          <p className="text-xs text-brand-silver mt-1">Total</p>
        </GlassCard>
      </div>

      {/* Today's Schedule */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-silver mb-4">
          Today&apos;s Schedule
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-brand-glass-bg animate-pulse" />
            ))}
          </div>
        ) : todaysAppointments.length === 0 ? (
          <GlassCard>
            <p className="text-brand-silver/50 text-sm text-center py-4">No appointments today</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {todaysAppointments.map((apt) => (
              <GlassCard key={apt.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-light">{apt.title || apt.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-brand-silver">
                    {apt.user.firstName} {apt.user.lastName} &middot;{' '}
                    {new Date(apt.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Link
                  href={`/clinician/patients/${apt.user.email}`}
                  className="text-xs text-brand-gold hover:underline"
                >
                  View Patient
                </Link>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
