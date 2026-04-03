'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface GreetingProps {
  firstName?: string
  email: string
  userId: string
  tier: string
}

interface HealthSummary {
  biologicalAge?: number
  chronologicalAge?: number
  topBiomarkers?: { name: string; value: string; status: string }[]
}

interface LongevityScore {
  currentScore: number
  trend?: 'up' | 'down' | 'stable'
  trendDelta?: number
}

interface Enrollment {
  course: { title: string }
  completionPercentage: number
  totalLessons: number
  completedLessons: number
}

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 4 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getDisplayName(firstName?: string, email?: string): string {
  if (firstName) return firstName
  // Extract name from email as fallback
  const local = email?.split('@')[0] || ''
  return local.charAt(0).toUpperCase() + local.slice(1)
}

function getScoreLine(score: LongevityScore | null): string | null {
  if (!score) return null
  const base = `Your longevity score is ${score.currentScore}`
  if (score.trend === 'up' && score.trendDelta != null && score.trendDelta > 0) {
    return `${base} — up ${score.trendDelta} point${score.trendDelta !== 1 ? 's' : ''} this week.`
  }
  if (score.trend === 'down' && score.trendDelta != null && score.trendDelta < 0) {
    return `${base} — down ${Math.abs(score.trendDelta)} point${Math.abs(score.trendDelta) !== 1 ? 's' : ''} this week.`
  }
  return `${base}.`
}

function getContextLines(
  health: HealthSummary | null,
  score: LongevityScore | null,
  enrollments: Enrollment[] | null,
  streak: number,
): string[] {
  const lines: string[] = []

  // Priority 1: Bio age improvement (if available)
  if (health?.biologicalAge && health?.chronologicalAge) {
    const diff = health.chronologicalAge - health.biologicalAge
    if (diff > 0) {
      lines.push(
        `Your biological age is ${health.biologicalAge.toFixed(1)} — ${diff.toFixed(1)} years younger than chronological.`,
      )
    }
  }

  // Priority 2: Longevity score (between bio age and course progress)
  const scoreLine = getScoreLine(score)
  if (scoreLine) {
    lines.push(scoreLine)
  }

  // Priority 3: Course near completion
  if (enrollments?.length) {
    const nearComplete = enrollments.find(
      (e) => e.completionPercentage >= 60 && e.completionPercentage < 100,
    )
    if (nearComplete) {
      const remaining = nearComplete.totalLessons - nearComplete.completedLessons
      lines.push(
        `You're ${remaining} lesson${remaining !== 1 ? 's' : ''} away from completing ${nearComplete.course.title}.`,
      )
    }
  }

  // Priority 4: Active streak
  if (streak >= 3) {
    lines.push(`${streak}-day learning streak — keep it going.`)
  }

  // Priority 5: Has enrollments in progress
  if (enrollments?.length && !lines.some((l) => l.includes('lesson'))) {
    const active = enrollments.find((e) => e.completionPercentage > 0 && e.completionPercentage < 100)
    if (active) {
      lines.push(`${Math.round(active.completionPercentage)}% through ${active.course.title}.`)
    }
  }

  return lines
}

export default function GreetingBanner({ firstName, email, userId, tier }: GreetingProps) {
  const [health, setHealth] = useState<HealthSummary | null>(null)
  const [score, setScore] = useState<LongevityScore | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null)
  const [streak, setStreak] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const [healthData, enrollData, scoreData] = await Promise.all([
          fetchJson<HealthSummary>(`/api/twin/${userId}/summary`),
          fetchJson<{ enrollments?: Enrollment[]; docs?: Enrollment[] }>('/learn/api/me/enrollments'),
          fetchJson<LongevityScore>(`/api/twin/${userId}/longevity-score/history?days=7`),
        ])

        if (healthData?.biologicalAge != null) setHealth(healthData)
        if (enrollData?.enrollments || enrollData?.docs) setEnrollments(enrollData.enrollments || enrollData.docs || [])
        if (scoreData && typeof scoreData.currentScore === 'number') setScore(scoreData)
      } finally {
        setLoaded(true)
      }
    }

    // Fetch streak from user data
    fetchJson<{ user?: { currentStreak?: number } }>('/learn/api/users/me')
      .then((data) => {
        if (data?.user?.currentStreak) setStreak(data.user.currentStreak)
      })

    fetchContext()
  }, [userId])

  const displayName = getDisplayName(firstName, email)
  const greeting = getTimeGreeting()
  const contextLines = loaded ? getContextLines(health, score, enrollments, streak) : []
  const contextLine = contextLines.length > 0 ? contextLines[0] : null
  const secondaryLine = contextLines.length > 1 ? contextLines[1] : null

  return (
    <div className="space-y-1">
      <h2
        className="text-2xl font-display font-semibold text-brand-light greeting-line"
        style={{ animationDelay: '200ms' }}
      >
        {greeting}, {displayName}.
      </h2>
      <p
        className={`text-brand-silver/70 greeting-line ${!loaded ? 'opacity-0' : ''}`}
        style={{ animationDelay: '500ms' }}
      >
        {contextLine || 'Your longevity dashboard awaits.'}
      </p>
      {secondaryLine && (
        <p
          className={`text-brand-silver/50 text-sm greeting-line ${!loaded ? 'opacity-0' : ''}`}
          style={{ animationDelay: '700ms' }}
        >
          {secondaryLine}
        </p>
      )}
    </div>
  )
}
