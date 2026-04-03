'use client'

import { useEffect, useState } from 'react'
import GlassCard from '@/components/dashboard/GlassCard'
import StatusBadge from '@/components/dashboard/StatusBadge'

interface TelemedicineBooking {
  id: string
  type: string
  status: string
  scheduledAt: string | null
  durationMinutes: number
  meetingUrl: string | null
  amountPaid: number | null
  coveredByPlan: boolean
  createdAt: string
}

const typeLabels: Record<string, string> = {
  INITIAL: 'Initial Consultation',
  FOLLOW_UP: 'Follow-up',
  SPECIALIST: 'Specialist',
  EMERGENCY: 'Emergency',
}

export default function TelemedicineClient() {
  const [bookings, setBookings] = useState<TelemedicineBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me/bookings/telemedicine')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setBookings(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" />
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <GlassCard className="py-12 text-center">
        <p className="text-brand-silver">No telemedicine bookings yet.</p>
        <p className="mt-2 text-sm text-brand-silver/70">
          Schedule a virtual consultation with one of our specialist clinicians.
        </p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <GlassCard key={booking.id}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="font-medium text-white">
                {typeLabels[booking.type] ?? booking.type}
              </h3>
              <div className="flex items-center gap-2">
                <StatusBadge status={booking.status} />
                <span className="text-xs text-brand-silver">
                  {booking.durationMinutes} min
                </span>
                {booking.coveredByPlan && (
                  <span className="inline-flex items-center rounded-md bg-brand-teal-dim px-2 py-0.5 text-xs font-medium text-brand-teal">
                    Plan covered
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="text-sm text-white">
                {booking.scheduledAt
                  ? new Date(booking.scheduledAt).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }) +
                    ' at ' +
                    new Date(booking.scheduledAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : `Booked ${new Date(booking.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}`}
              </p>
              {booking.meetingUrl && booking.status === 'CONFIRMED' && (
                <a
                  href={booking.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-teal/80"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Join Session
                </a>
              )}
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  )
}
