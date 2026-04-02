'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface Biomarker {
  name: string
  value: number
  unit: string
  measuredAt: string
  status: string
}

interface GroupedBiomarker {
  name: string
  latest: Biomarker
  previous?: Biomarker
  trend: 'up' | 'down' | 'stable'
}

function WidgetSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="h-4 w-28 rounded bg-brand-glass-bg animate-pulse" />
          <div className="h-4 w-16 rounded bg-brand-glass-bg animate-pulse" />
        </div>
      ))}
    </div>
  )
}

const statusColor: Record<string, string> = {
  optimal: 'text-brand-teal',
  normal: 'text-brand-teal',
  borderline: 'text-brand-gold',
  warning: 'text-brand-gold',
  high: 'text-brand-gold',
  low: 'text-brand-gold',
  critical: 'text-red-400',
}

const trendArrow: Record<string, string> = {
  up: '↑',
  down: '↓',
  stable: '→',
}

function groupBiomarkers(biomarkers: Biomarker[]): GroupedBiomarker[] {
  const byName = new Map<string, Biomarker[]>()

  for (const b of biomarkers) {
    const existing = byName.get(b.name) || []
    existing.push(b)
    byName.set(b.name, existing)
  }

  const grouped: GroupedBiomarker[] = []

  for (const [name, entries] of byName) {
    const sorted = entries.sort(
      (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
    )
    const latest = sorted[0]
    const previous = sorted[1]
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (previous) {
      if (latest.value > previous.value) trend = 'up'
      else if (latest.value < previous.value) trend = 'down'
    }
    grouped.push({ name, latest, previous, trend })
  }

  return grouped.slice(0, 5)
}

export default function BiomarkerTrendsWidget({ userId }: { userId: string }) {
  const [data, setData] = useState<GroupedBiomarker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson<{ biomarkers?: Biomarker[] }>(`/api/twin/${userId}/biomarkers?limit=50`)
      .then((d) => {
        if (d?.biomarkers) setData(groupBiomarkers(d.biomarkers))
      })
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div
      className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <h3 className="text-sm font-medium text-brand-silver uppercase tracking-wider mb-4">
        Biomarker Trends
      </h3>

      {loading ? (
        <WidgetSkeleton />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg className="w-10 h-10 text-brand-silver/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          <p className="text-brand-silver/50 text-sm">Complete your first diagnostic to track biomarker trends</p>
          <a href="/book/diagnostics" className="text-brand-teal text-sm mt-2 hover:underline">
            Book a Diagnostic
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-lg bg-brand-dark-alt/50 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-light truncate">{item.name}</p>
                <p className="text-xs text-brand-silver/60">
                  {new Date(item.latest.measuredAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {item.previous && (
                  <span
                    className={`text-xs font-medium ${
                      item.trend === 'up' ? 'text-brand-gold' : item.trend === 'down' ? 'text-brand-teal' : 'text-brand-silver/50'
                    }`}
                  >
                    {trendArrow[item.trend]}
                  </span>
                )}
                <span className={`text-sm font-semibold ${statusColor[item.latest.status] ?? 'text-brand-silver'}`}>
                  {item.latest.value} {item.latest.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
