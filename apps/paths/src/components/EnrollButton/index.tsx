'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/utilities/ui'
import { apiUrl } from '@/utilities/apiUrl'

type EnrollState = 'not-logged-in' | 'no-access' | 'can-enroll' | 'enrolled' | 'completed'

export const EnrollButton: React.FC<{
  state: EnrollState
  courseId: string
  tierRequired: string
  completionPercentage?: number
  nextLessonHref?: string
}> = ({ state, courseId, tierRequired, completionPercentage, nextLessonHref }) => {
  const [loading, setLoading] = useState(false)
  const [enrolled, setEnrolled] = useState(state === 'enrolled' || state === 'completed')

  const handleEnroll = async () => {
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/enroll'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })
      if (res.ok) {
        setEnrolled(true)
        window.location.reload()
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false)
    }
  }

  if (state === 'not-logged-in') {
    return (
      <Link href="/login" className="inline-block px-6 py-3 bg-brand-gold/20 text-brand-gold rounded-lg font-medium hover:bg-brand-gold/30 transition-colors">
        Sign in to enroll
      </Link>
    )
  }

  if (state === 'no-access') {
    return (
      <Link href="/account/billing" className="inline-block px-6 py-3 bg-brand-gold/20 text-brand-gold rounded-lg font-medium hover:bg-brand-gold/30 transition-colors">
        Upgrade to {tierRequired.charAt(0).toUpperCase() + tierRequired.slice(1)} to access
      </Link>
    )
  }

  if (state === 'completed') {
    return (
      <div className="flex items-center gap-3">
        <span className="px-4 py-2 bg-green-500/10 text-green-500 rounded-lg text-sm font-medium">
          Completed
        </span>
        {nextLessonHref && (
          <Link href={nextLessonHref} className="px-4 py-2 bg-brand-glass-bg rounded-lg text-sm hover:bg-brand-glass-bg/80 transition-colors">
            Revisit
          </Link>
        )}
      </div>
    )
  }

  if (enrolled || state === 'enrolled') {
    return (
      <div className="space-y-2">
        {completionPercentage != null && completionPercentage > 0 && (
          <div className="flex items-center gap-2 text-sm text-brand-silver">
            <div className="flex-1 h-1.5 bg-brand-glass-bg rounded-full">
              <div className="h-full bg-brand-gold rounded-full" style={{ width: `${completionPercentage}%` }} />
            </div>
            <span>{completionPercentage}%</span>
          </div>
        )}
        <Link href={nextLessonHref || '#'} className="inline-block px-6 py-3 bg-brand-gold/20 text-brand-gold rounded-lg font-medium hover:bg-brand-gold/30 transition-colors">
          Continue Learning
        </Link>
      </div>
    )
  }

  return (
    <button
      onClick={handleEnroll}
      disabled={loading}
      className={cn(
        'px-6 py-3 bg-brand-gold/20 text-brand-gold rounded-lg font-medium hover:bg-brand-gold/30 transition-colors',
        loading && 'opacity-50 cursor-not-allowed',
      )}
    >
      {loading ? 'Enrolling...' : 'Enroll in this course'}
    </button>
  )
}
