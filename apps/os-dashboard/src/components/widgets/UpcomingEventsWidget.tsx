'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface Appointment {
  id: string
  date: string
  type: string
  provider?: string
}

function WidgetSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-brand-glass-bg animate-pulse" />
      ))}
    </div>
  )
}

export default function UpcomingEventsWidget() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson<{ appointments?: Appointment[] }>('/book/api/me/appointments')
      .then((d) => { if (d?.appointments) setAppointments(d.appointments.slice(0, 3)) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <h3 className="text-sm font-medium text-brand-silver uppercase tracking-wider mb-4">
        Upcoming Appointments
      </h3>

      {loading ? (
        <WidgetSkeleton />
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg className="w-10 h-10 text-brand-silver/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <p className="text-brand-silver/50 text-sm">No upcoming appointments</p>
          <a href="/book" className="text-brand-teal text-sm mt-2 hover:underline">
            Book Now
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="flex items-center justify-between rounded-lg bg-brand-dark-alt/50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-brand-light">{apt.type}</p>
                {apt.provider && (
                  <p className="text-xs text-brand-silver/60">{apt.provider}</p>
                )}
              </div>
              <time className="text-xs text-brand-silver/70 whitespace-nowrap">
                {new Date(apt.date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
