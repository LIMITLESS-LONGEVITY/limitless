'use client'

import { useEffect, useState } from 'react'
import GlassCard from '@/components/dashboard/GlassCard'
import StatusBadge from '@/components/dashboard/StatusBadge'

interface Appointment {
  id: string
  title: string
  type: string
  status: string
  scheduledAt: string
  durationMinutes: number
  location: string | null
  clinician?: { firstName: string; lastName: string; title?: string } | null
}

const typeLabels: Record<string, string> = {
  COACH_SESSION: 'Coaching',
  SPECIALIST_CONSULT: 'Specialist',
  GROUP_CLASS: 'Group Class',
  DIAGNOSTIC: 'Diagnostic',
  FOLLOW_UP: 'Follow-up',
  ORIENTATION: 'Orientation',
}

export default function AppointmentsClient() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    fetch('/api/me/appointments')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAppointments(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const upcoming = appointments.filter(
    (a) => new Date(a.scheduledAt) >= now && a.status !== 'CANCELLED'
  )
  const past = appointments.filter(
    (a) => new Date(a.scheduledAt) < now || a.status === 'CANCELLED'
  )

  const displayed = tab === 'upcoming' ? upcoming : past

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-brand-glass-border bg-brand-glass-bg p-1">
        {(['upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium tracking-wide transition-all ${
              tab === t
                ? 'bg-brand-gold-dim text-brand-gold'
                : 'text-brand-silver hover:text-white'
            }`}
          >
            {t === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
          </button>
        ))}
      </div>

      {/* Appointment list */}
      {displayed.length === 0 ? (
        <GlassCard className="py-12 text-center">
          <p className="text-brand-silver">
            {tab === 'upcoming' ? 'No upcoming appointments.' : 'No past appointments.'}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {displayed.map((apt) => (
            <GlassCard key={apt.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium text-white">{apt.title}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-brand-teal-dim px-2 py-0.5 text-xs font-medium text-brand-teal">
                      {typeLabels[apt.type] ?? apt.type}
                    </span>
                    <StatusBadge status={apt.status} />
                  </div>
                  {apt.clinician && (
                    <p className="text-sm text-brand-silver">
                      {apt.clinician.title ? `${apt.clinician.title} ` : ''}
                      {apt.clinician.firstName} {apt.clinician.lastName}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {new Date(apt.scheduledAt).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-brand-silver">
                    {new Date(apt.scheduledAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    &middot; {apt.durationMinutes} min
                  </p>
                  {apt.location && (
                    <p className="mt-1 text-xs text-brand-silver">{apt.location}</p>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
