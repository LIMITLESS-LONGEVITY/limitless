'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface CoachStats {
  exercisesCreated: number
  sessionsCreated: number
  programsCreated: number
  assignmentsGiven: number
  pendingAssignments: number
}

interface RecentContentItem {
  id: string
  name: string
  status: string
  durationSeconds: number
  createdAt: string
}

interface CoachActivityData {
  stats: CoachStats
  recentContent: RecentContentItem[]
}

function WidgetSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-brand-glass-bg animate-pulse" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-4 w-full rounded bg-brand-glass-bg animate-pulse" />
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-brand-dark-alt/60 p-3 text-center">
      <p className="font-display text-2xl font-semibold text-brand-gold">{value}</p>
      <p className="text-[11px] text-brand-silver/60 leading-tight mt-1">{label}</p>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function CoachActivityWidget({ userId }: { userId: string }) {
  const [data, setData] = useState<CoachActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCoach, setIsCoach] = useState(true)

  useEffect(() => {
    fetchJson<CoachActivityData>('/train/api/v1/me/coach/activity')
      .then((d) => {
        if (d && d.stats && Array.isArray(d.recentContent)) {
          setData(d)
        } else {
          setIsCoach(false)
        }
      })
      .finally(() => setLoading(false))
  }, [userId])

  // Non-coach: show minimal card with fallback
  if (!isCoach) {
    return (
      <div
        className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md"
        style={{ WebkitBackdropFilter: 'blur(12px)' }}
      >
        <h3 className="text-sm font-medium text-brand-silver uppercase tracking-wider mb-4">
          Cubes+ Coach
        </h3>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-brand-silver/50 text-sm">
            Start building training sessions in Cubes+
          </p>
          <a
            href="/train/builder"
            className="text-brand-teal text-sm mt-2 hover:underline"
          >
            Open Session Builder
          </a>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <h3 className="text-sm font-medium text-brand-silver uppercase tracking-wider mb-4">
        Cubes+ Coach Activity
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
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
            />
          </svg>
          <p className="text-brand-silver/50 text-sm max-w-[220px]">
            Start building training sessions in Cubes+
          </p>
          <a
            href="/train/builder"
            className="text-brand-teal text-sm mt-2 hover:underline"
          >
            Open Session Builder
          </a>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Exercises" value={data.stats.exercisesCreated} />
            <StatCard label="Sessions" value={data.stats.sessionsCreated} />
            <StatCard label="Programs" value={data.stats.programsCreated} />
            <StatCard
              label="Pending"
              value={data.stats.pendingAssignments}
            />
          </div>

          {/* Recent Sessions */}
          {data.recentContent.length > 0 && (
            <div className="border-t border-brand-glass-border pt-4">
              <p className="text-xs text-brand-silver/50 mb-3">Recent Content</p>
              <ul className="space-y-2">
                {data.recentContent.slice(0, 5).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-brand-light truncate pr-3">
                      {item.name}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-brand-silver/60 whitespace-nowrap">
                      <span>{Math.round(item.durationSeconds / 60)} min</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
