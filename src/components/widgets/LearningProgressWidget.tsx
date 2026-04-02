'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface Enrollment {
  id: string
  courseTitle: string
  progress: number
  totalLessons: number
  completedLessons: number
}

function WidgetSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-40 rounded bg-brand-glass-bg animate-pulse" />
          <div className="h-2 w-full rounded-full bg-brand-glass-bg animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export default function LearningProgressWidget() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson<{ enrollments?: Enrollment[] }>('/learn/api/me/enrollments')
      .then((d) => { if (d?.enrollments) setEnrollments(d.enrollments) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <h3 className="text-sm font-medium text-brand-silver uppercase tracking-wider mb-4">
        Learning Progress
      </h3>

      {loading ? (
        <WidgetSkeleton />
      ) : enrollments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg className="w-10 h-10 text-brand-silver/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
          </svg>
          <p className="text-brand-silver/50 text-sm">Start your first course</p>
          <a href="/learn" className="text-brand-teal text-sm mt-2 hover:underline">
            Browse Courses
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {enrollments.map((e) => (
            <div key={e.id}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-brand-light truncate pr-4">
                  {e.courseTitle}
                </p>
                <span className="text-xs text-brand-silver/60 whitespace-nowrap">
                  {e.completedLessons}/{e.totalLessons}
                </span>
              </div>
              <div className="h-2 rounded-full bg-brand-dark-alt overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-teal transition-all"
                  style={{ width: `${Math.round(e.progress * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
