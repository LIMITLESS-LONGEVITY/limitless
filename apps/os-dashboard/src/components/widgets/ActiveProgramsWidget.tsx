'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface ActiveProgram {
  id: string
  name: string
  progressPercent: number
  currentDay: number
  totalDays: number
  currentSession: number
  totalSessions: number
  streakDays: number
}

function WidgetSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-20 rounded-lg bg-brand-glass-bg animate-pulse" />
      ))}
    </div>
  )
}

function ProgramCard({ program }: { program: ActiveProgram }) {
  return (
    <div className="rounded-lg bg-brand-dark-alt/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-brand-light font-medium truncate pr-2">
          {program.name}
        </span>
        {program.streakDays > 0 && (
          <span className="text-xs text-brand-silver/60 whitespace-nowrap flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18z"
              />
            </svg>
            {program.streakDays}d
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-brand-glass-bg overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, program.progressPercent))}%`,
              backgroundColor: '#e11d48',
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-brand-silver/50">
          <span>{Math.round(program.progressPercent)}% complete</span>
          <span>
            Day {program.currentDay}/{program.totalDays}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function ActiveProgramsWidget({ userId }: { userId: string }) {
  const [programs, setPrograms] = useState<ActiveProgram[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson<ActiveProgram[]>('/train/api/v1/me/programs/active')
      .then((d) => {
        if (Array.isArray(d)) setPrograms(d)
      })
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div
      className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <h3 className="text-sm font-medium text-brand-silver uppercase tracking-wider mb-4">
        Active Programs
      </h3>

      {loading ? (
        <WidgetSkeleton />
      ) : programs.length === 0 ? (
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
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125z"
            />
          </svg>
          <p className="text-brand-silver/50 text-sm max-w-[220px]">
            No active programs
          </p>
          <a
            href="/train/library/programs"
            className="mt-2 text-sm font-medium hover:underline"
            style={{ color: '#e11d48' }}
          >
            Browse Programs
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.slice(0, 3).map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}

          {programs.length > 3 && (
            <a
              href="/train/library/programs"
              className="block text-center text-xs font-medium hover:underline mt-2"
              style={{ color: '#e11d48' }}
            >
              View all {programs.length} programs
            </a>
          )}
        </div>
      )}
    </div>
  )
}
