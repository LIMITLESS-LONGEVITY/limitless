'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface WorkoutExercise {
  id: string
  name: string
}

interface TodaysWorkoutData {
  id: string
  name: string
  durationMinutes: number
  exercises: WorkoutExercise[]
  programName?: string
  readinessScore?: number
  readinessSuggestion?: string
  alternativeWorkout?: {
    id: string
    name: string
  }
}

function WidgetSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-5 w-48 rounded bg-brand-glass-bg animate-pulse" />
      <div className="h-4 w-32 rounded bg-brand-glass-bg animate-pulse" />
      <div className="flex gap-3 mt-3">
        <div className="h-8 w-8 rounded-full bg-brand-glass-bg animate-pulse" />
        <div className="h-4 w-20 rounded bg-brand-glass-bg animate-pulse mt-2" />
      </div>
      <div className="h-10 w-full rounded-lg bg-brand-glass-bg animate-pulse mt-4" />
    </div>
  )
}

function ReadinessIndicator({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#fbbf24' : '#e11d48'

  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
        aria-label={`Readiness ${score >= 80 ? 'high' : score >= 60 ? 'moderate' : 'low'}`}
      />
      <span className="text-sm text-brand-silver">{score}</span>
    </div>
  )
}

export default function TodaysWorkoutWidget({ userId }: { userId: string }) {
  const [data, setData] = useState<TodaysWorkoutData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson<TodaysWorkoutData>('/train/api/v1/me/today')
      .then((d) => {
        if (d && d.id && d.name && Array.isArray(d.exercises)) setData(d)
      })
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div
      className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <h3 className="text-sm font-medium text-brand-silver uppercase tracking-wider mb-4">
        Today&apos;s Workout
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
            No workout scheduled today
          </p>
          <a
            href="/train/library/sessions"
            className="mt-2 text-sm font-medium hover:underline"
            style={{ color: '#e11d48' }}
          >
            Browse Sessions
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Workout info */}
          <div>
            <p className="text-brand-light font-medium text-base">{data.name}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-brand-silver/60">
              <span>{data.durationMinutes} min</span>
              <span>&middot;</span>
              <span>{data.exercises.length} exercises</span>
            </div>
            {data.programName && (
              <p className="text-xs text-brand-silver/50 mt-1">
                {data.programName}
              </p>
            )}
          </div>

          {/* Readiness */}
          {data.readinessScore != null && (
            <div className="border-t border-brand-glass-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-brand-silver/50">Readiness</span>
                <ReadinessIndicator score={data.readinessScore} />
              </div>
              {data.readinessScore < 80 && data.readinessSuggestion && (
                <p className="text-xs text-brand-silver/60 mt-2">
                  {data.readinessSuggestion}
                </p>
              )}
              {data.readinessScore < 80 && data.alternativeWorkout && (
                <a
                  href={`/train/library/sessions/${data.alternativeWorkout.id}`}
                  className="text-xs mt-1 inline-block hover:underline"
                  style={{ color: '#e11d48' }}
                >
                  Try: {data.alternativeWorkout.name}
                </a>
              )}
            </div>
          )}

          {/* Start button */}
          <a
            href={`/train/library/sessions/${data.id}`}
            className="block w-full text-center py-2.5 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#e11d48' }}
          >
            Start Workout
          </a>
        </div>
      )}
    </div>
  )
}
