'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface CubesSummary {
  exerciseCount: number
  sessionCount: number
  programCount: number
  pendingAssignments: number
}

export default function CubesAppCard({ userId }: { userId: string }) {
  const [data, setData] = useState<CubesSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson<CubesSummary>('/train/api/v1/me/summary')
      .then((d) => {
        if (d && typeof d.exerciseCount === 'number') setData(d)
      })
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <a
      href="/train"
      className="block rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md transition-colors hover:border-[#e11d48]/40"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-brand-silver uppercase tracking-wider">
          Train
        </h3>
        <svg
          className="w-4 h-4 text-brand-silver/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
          />
        </svg>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-brand-glass-bg animate-pulse" />
          ))}
        </div>
      ) : !data ? (
        <p className="text-sm text-brand-silver/50">
          Open Cubes+ to start training
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="font-display text-xl font-semibold" style={{ color: '#e11d48' }}>
                {data.exerciseCount}
              </p>
              <p className="text-[11px] text-brand-silver/60 mt-0.5">Exercises</p>
            </div>
            <div className="text-center">
              <p className="font-display text-xl font-semibold" style={{ color: '#e11d48' }}>
                {data.sessionCount}
              </p>
              <p className="text-[11px] text-brand-silver/60 mt-0.5">Sessions</p>
            </div>
            <div className="text-center">
              <p className="font-display text-xl font-semibold" style={{ color: '#e11d48' }}>
                {data.programCount}
              </p>
              <p className="text-[11px] text-brand-silver/60 mt-0.5">Programs</p>
            </div>
          </div>

          {data.pendingAssignments > 0 && (
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-brand-glass-border">
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: '#e11d48' }}
              >
                {data.pendingAssignments}
              </span>
              <span className="text-xs text-brand-silver/60">pending assignments</span>
            </div>
          )}
        </div>
      )}
    </a>
  )
}
