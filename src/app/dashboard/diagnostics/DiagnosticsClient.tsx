'use client'

import { useEffect, useState } from 'react'
import GlassCard from '@/components/dashboard/GlassCard'
import StatusBadge from '@/components/dashboard/StatusBadge'

interface DiagnosticBooking {
  id: string
  status: string
  scheduledAt: string | null
  completedAt: string | null
  amountPaid: number | null
  discountApplied: number | null
  createdAt: string
  package: {
    name: string
    currency: string
  }
}

export default function DiagnosticsClient() {
  const [bookings, setBookings] = useState<DiagnosticBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me/bookings/diagnostics')
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
        <p className="text-brand-silver">No diagnostic bookings yet.</p>
        <p className="mt-2 text-sm text-brand-silver/70">
          Book a diagnostic package to get started with your health journey.
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
              <h3 className="font-medium text-white">{booking.package.name}</h3>
              <div className="flex items-center gap-2">
                <StatusBadge status={booking.status} />
              </div>
              <p className="text-sm text-brand-silver">
                {booking.scheduledAt
                  ? `Scheduled: ${new Date(booking.scheduledAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}`
                  : `Booked: ${new Date(booking.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}`}
              </p>
            </div>
            <div className="text-right">
              {booking.amountPaid != null && (
                <p className="text-lg font-medium text-white">
                  {booking.package.currency === 'EUR' ? '\u20AC' : booking.package.currency}{' '}
                  {booking.amountPaid.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </p>
              )}
              {booking.discountApplied != null && booking.discountApplied > 0 && (
                <p className="text-xs text-brand-teal">
                  {booking.discountApplied}% member discount applied
                </p>
              )}
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  )
}
