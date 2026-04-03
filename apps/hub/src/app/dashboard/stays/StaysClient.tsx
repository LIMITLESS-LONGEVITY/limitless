'use client'

import { useEffect, useState } from 'react'
import GlassCard from '@/components/dashboard/GlassCard'
import StatusBadge from '@/components/dashboard/StatusBadge'

interface StayBooking {
  id: string
  status: string
  checkIn: string | null
  checkOut: string | null
  guests: number
  amountPaid: number | null
  createdAt: string
  package: {
    name: string
    currency: string
    hotelPartner: string
  }
}

export default function StaysClient() {
  const [bookings, setBookings] = useState<StayBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me/bookings/stays')
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
        <p className="text-brand-silver">No stay bookings yet.</p>
        <p className="mt-2 text-sm text-brand-silver/70">
          Browse our curated wellness hotel stays to begin your immersive experience.
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
              <p className="text-xs text-brand-silver">{booking.package.hotelPartner}</p>
              <div className="flex items-center gap-2">
                <StatusBadge status={booking.status} />
                <span className="text-xs text-brand-silver">
                  {booking.guests} guest{booking.guests !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="text-right space-y-1">
              {booking.checkIn && booking.checkOut ? (
                <p className="text-sm text-white">
                  {new Date(booking.checkIn).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  &ndash;{' '}
                  {new Date(booking.checkOut).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              ) : (
                <p className="text-sm text-brand-silver">
                  Booked{' '}
                  {new Date(booking.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              )}
              {booking.amountPaid != null && (
                <p className="text-lg font-medium text-white">
                  {booking.package.currency === 'EUR' ? '\u20AC' : booking.package.currency}{' '}
                  {booking.amountPaid.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  )
}
