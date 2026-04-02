'use client'

import { useEffect, useState } from 'react'
import GlassCard from '@/components/dashboard/GlassCard'
import StatusBadge from '@/components/dashboard/StatusBadge'

type Tab = 'health' | 'bookings'

interface AIContext {
  profile: {
    age: number | null
    sex: string | null
    conditions: string[]
    goals: string[]
  } | null
  recentBiomarkers: {
    name: string
    value: number
    unit: string
    status: string | null
    measuredAt: string
  }[]
  wearableInsights: {
    avgSleep: number | null
    avgHRV: number | null
    recoveryTrend: string | null
  }
}

interface Bookings {
  appointments: { id: string; title: string; type: string; scheduledAt: string; status: string }[]
  diagnostics: { id: string; status: string; scheduledAt: string; package: { name: string } | null }[]
  stays: { id: string; status: string; checkIn: string; package: { name: string } | null }[]
  telemedicine: { id: string; type: string; status: string; scheduledAt: string }[]
}

const statusColors: Record<string, string> = {
  optimal: 'text-brand-teal',
  normal: 'text-brand-teal',
  warning: 'text-brand-gold',
  high: 'text-brand-gold',
  low: 'text-brand-gold',
  critical: 'text-red-400',
}

export default function PatientDetailClient({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>('health')
  const [context, setContext] = useState<AIContext | null>(null)
  const [bookings, setBookings] = useState<Bookings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/clinician/patients/${userId}/health`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/clinician/patients/${userId}/bookings`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([ctx, bk]) => {
        setContext(ctx)
        setBookings(bk)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-light tracking-wide text-brand-light">Patient Detail</h1>
        <p className="mt-1 text-xs text-brand-silver font-mono">{userId}</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {(['health', 'bookings'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors ${
              tab === t
                ? 'bg-brand-gold-dim text-brand-gold border border-brand-gold/20'
                : 'text-brand-silver bg-brand-glass-bg border border-brand-glass-border hover:bg-brand-glass-bg-hover'
            }`}
          >
            {t === 'health' ? 'Health Summary' : 'Bookings'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-brand-glass-bg animate-pulse" />
          ))}
        </div>
      ) : tab === 'health' ? (
        <HealthTab context={context} />
      ) : (
        <BookingsTab bookings={bookings} />
      )}
    </div>
  )
}

function HealthTab({ context }: { context: AIContext | null }) {
  if (!context) {
    return (
      <GlassCard>
        <p className="text-brand-silver/50 text-sm text-center py-8">No health data available for this patient</p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile summary */}
      {context.profile && (
        <GlassCard>
          <h3 className="text-sm font-semibold text-brand-silver uppercase tracking-wider mb-3">Profile</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {context.profile.age && (
              <div>
                <p className="text-brand-silver/60 text-xs">Age</p>
                <p className="text-brand-light">{context.profile.age}</p>
              </div>
            )}
            {context.profile.sex && (
              <div>
                <p className="text-brand-silver/60 text-xs">Sex</p>
                <p className="text-brand-light capitalize">{context.profile.sex}</p>
              </div>
            )}
            {context.profile.conditions.length > 0 && (
              <div className="col-span-2">
                <p className="text-brand-silver/60 text-xs">Conditions</p>
                <p className="text-brand-light">{context.profile.conditions.join(', ')}</p>
              </div>
            )}
          </div>
          {context.profile.goals.length > 0 && (
            <div className="mt-3">
              <p className="text-brand-silver/60 text-xs mb-1">Health Goals</p>
              <div className="flex flex-wrap gap-1.5">
                {context.profile.goals.map((g) => (
                  <span key={g} className="px-2 py-0.5 rounded-full bg-brand-teal-dim text-brand-teal text-xs">
                    {g.replace(/-/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* Wearable insights */}
      {(context.wearableInsights.avgSleep || context.wearableInsights.avgHRV) && (
        <GlassCard>
          <h3 className="text-sm font-semibold text-brand-silver uppercase tracking-wider mb-3">Wearable Insights (7-day avg)</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {context.wearableInsights.avgSleep && (
              <div>
                <p className="text-brand-silver/60 text-xs">Sleep</p>
                <p className="text-brand-light">{Math.round(context.wearableInsights.avgSleep)}h</p>
              </div>
            )}
            {context.wearableInsights.avgHRV && (
              <div>
                <p className="text-brand-silver/60 text-xs">HRV</p>
                <p className="text-brand-light">{Math.round(context.wearableInsights.avgHRV)} ms</p>
              </div>
            )}
            {context.wearableInsights.recoveryTrend && (
              <div>
                <p className="text-brand-silver/60 text-xs">Recovery</p>
                <p className="text-brand-light capitalize">{context.wearableInsights.recoveryTrend}</p>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Biomarkers */}
      {context.recentBiomarkers.length > 0 && (
        <GlassCard>
          <h3 className="text-sm font-semibold text-brand-silver uppercase tracking-wider mb-3">Recent Biomarkers</h3>
          <div className="space-y-2">
            {context.recentBiomarkers.slice(0, 10).map((b, i) => (
              <div key={`${b.name}-${i}`} className="flex items-center justify-between text-sm">
                <span className="text-brand-silver">{b.name}</span>
                <span className={statusColors[b.status ?? 'normal'] ?? 'text-brand-silver'}>
                  {b.value} {b.unit}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}

function BookingsTab({ bookings }: { bookings: Bookings | null }) {
  if (!bookings) {
    return (
      <GlassCard>
        <p className="text-brand-silver/50 text-sm text-center py-8">No booking data</p>
      </GlassCard>
    )
  }

  const allBookings = [
    ...bookings.appointments.map((a) => ({ type: 'Appointment', title: a.title || a.type.replace(/_/g, ' '), date: a.scheduledAt, status: a.status })),
    ...bookings.diagnostics.map((d) => ({ type: 'Diagnostic', title: d.package?.name || 'Diagnostic', date: d.scheduledAt, status: d.status })),
    ...bookings.stays.map((s) => ({ type: 'Stay', title: s.package?.name || 'Stay', date: s.checkIn, status: s.status })),
    ...bookings.telemedicine.map((t) => ({ type: 'Telemedicine', title: t.type.replace(/_/g, ' '), date: t.scheduledAt, status: t.status })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (allBookings.length === 0) {
    return (
      <GlassCard>
        <p className="text-brand-silver/50 text-sm text-center py-8">No bookings for this patient</p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-2">
      {allBookings.map((b, i) => (
        <GlassCard key={i} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand-light">{b.title}</p>
            <p className="text-xs text-brand-silver">
              {b.type} &middot; {new Date(b.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <StatusBadge status={b.status} />
        </GlassCard>
      ))}
    </div>
  )
}
