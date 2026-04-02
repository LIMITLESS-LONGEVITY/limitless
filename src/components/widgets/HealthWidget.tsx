'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface HealthSummary {
  biologicalAge: number
  chronologicalAge: number
  topBiomarkers: { name: string; value: string; status: 'optimal' | 'warning' | 'critical' }[]
  wearableSummary?: string
}

function WidgetSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-32 rounded bg-brand-glass-bg animate-pulse" />
      <div className="h-12 w-20 rounded bg-brand-glass-bg animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-brand-glass-bg animate-pulse" />
        <div className="h-3 w-3/4 rounded bg-brand-glass-bg animate-pulse" />
      </div>
    </div>
  )
}

const statusColors = {
  optimal: 'text-brand-teal',
  warning: 'text-brand-gold',
  critical: 'text-red-400',
}

export default function HealthWidget({ userId }: { userId: string }) {
  const [data, setData] = useState<HealthSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson<HealthSummary>(`/api/twin/${userId}/summary`)
      .then((d) => {
        if (d && typeof d.biologicalAge === 'number' && Array.isArray(d.topBiomarkers)) {
          setData(d)
        }
      })
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div
      className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <h3 className="text-sm font-medium text-brand-silver uppercase tracking-wider mb-4">
        Health Overview
      </h3>

      {loading ? (
        <WidgetSkeleton />
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg className="w-10 h-10 text-brand-silver/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
          <p className="text-brand-silver/50 text-sm">No health data yet</p>
          <a href="/health" className="text-brand-teal text-sm mt-2 hover:underline">
            Connect your data
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-3xl font-semibold text-brand-gold">{data.biologicalAge}</p>
            <p className="text-xs text-brand-silver/60">
              Biological age (chronological: {data.chronologicalAge})
            </p>
          </div>

          {data.topBiomarkers.length > 0 && (
            <div className="space-y-2">
              {data.topBiomarkers.map((b) => (
                <div key={b.name} className="flex items-center justify-between text-sm">
                  <span className="text-brand-silver">{b.name}</span>
                  <span className={statusColors[b.status]}>{b.value}</span>
                </div>
              ))}
            </div>
          )}

          {data.wearableSummary && (
            <p className="text-xs text-brand-silver/50 border-t border-brand-glass-border pt-3">
              {data.wearableSummary}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
