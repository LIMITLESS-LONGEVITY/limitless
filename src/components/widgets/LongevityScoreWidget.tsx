'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface ScoreComponent {
  label: string
  value: number
  maxValue: number
}

interface ScoreHistoryEntry {
  date: string
  score: number
}

interface LongevityScoreData {
  currentScore: number
  previousScore?: number
  trend?: 'up' | 'down' | 'stable'
  trendDelta?: number
  components: ScoreComponent[]
  history: ScoreHistoryEntry[]
}

function WidgetSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-40 rounded bg-brand-glass-bg animate-pulse" />
      <div className="h-16 w-24 rounded bg-brand-glass-bg animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-brand-glass-bg animate-pulse" />
        <div className="h-3 w-full rounded bg-brand-glass-bg animate-pulse" />
        <div className="h-3 w-3/4 rounded bg-brand-glass-bg animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-brand-glass-bg animate-pulse" />
      </div>
    </div>
  )
}

function Sparkline({ history }: { history: ScoreHistoryEntry[] }) {
  if (history.length < 2) return null

  const scores = history.map((h) => h.score)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1
  const width = 200
  const height = 40
  const padding = 2

  const points = scores.map((score, i) => {
    const x = padding + (i / (scores.length - 1)) * (width - padding * 2)
    const y = height - padding - ((score - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-10"
      aria-label="Longevity score trend over last 30 days"
      role="img"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#C9A84C"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  )
}

function ComponentBar({ label, value, maxValue }: ScoreComponent) {
  const pct = Math.min(100, Math.max(0, (value / maxValue) * 100))
  // Gold for high values (>=70%), silver for mid/low
  const barColor = pct >= 70 ? 'bg-brand-gold' : 'bg-brand-silver/50'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-brand-silver">{label}</span>
        <span className="text-brand-silver/60">
          {value}/{maxValue}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-brand-glass-bg overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function LongevityScoreWidget({ userId }: { userId: string }) {
  const [data, setData] = useState<LongevityScoreData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson<LongevityScoreData>(`/api/twin/${userId}/longevity-score/history?days=30`)
      .then((d) => {
        if (d && typeof d.currentScore === 'number') setData(d)
      })
      .finally(() => setLoading(false))
  }, [userId])

  const isImproved = data?.trend === 'up'

  return (
    <div
      className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <h3 className="text-sm font-medium text-brand-silver uppercase tracking-wider mb-4">
        Longevity Score
      </h3>

      {loading ? (
        <WidgetSkeleton />
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg
            className="w-10 h-10 text-brand-silver/30 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605"
            />
          </svg>
          <p className="text-brand-silver/50 text-sm max-w-[220px]">
            Connect your wearable and complete your health profile to get your
            Longevity Score
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Score + Trend */}
          <div className="flex items-end gap-3">
            <span
              className={`font-display text-5xl font-semibold text-brand-gold ${isImproved ? 'score-glow' : ''}`}
            >
              {data.currentScore}
            </span>
            {data.trend && data.trend !== 'stable' && data.trendDelta != null && (
              <span
                className="flex items-center gap-1 text-sm mb-1.5"
                style={{
                  color: data.trend === 'up' ? '#4ECDC4' : '#B0B8C1',
                }}
              >
                {data.trend === 'up' ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25"
                    />
                  </svg>
                )}
                {data.trendDelta > 0 ? '+' : ''}
                {data.trendDelta}
              </span>
            )}
          </div>

          {/* Component Bars */}
          {(data.components?.length ?? 0) > 0 && (
            <div className="space-y-3">
              {data.components.map((c) => (
                <ComponentBar
                  key={c.label}
                  label={c.label}
                  value={c.value}
                  maxValue={c.maxValue}
                />
              ))}
            </div>
          )}

          {/* Sparkline */}
          {(data.history?.length ?? 0) >= 2 && (
            <div className="border-t border-brand-glass-border pt-3">
              <p className="text-xs text-brand-silver/50 mb-2">Last 30 days</p>
              <Sparkline history={data.history} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
