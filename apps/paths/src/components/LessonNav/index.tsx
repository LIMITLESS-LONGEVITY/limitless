'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utilities/ui'
import { useAuth } from '@/providers/Auth'
import { apiUrl } from '@/utilities/apiUrl'
import { fireCourseCompleteConfetti } from '@/components/CelebrationConfetti'
import { StreakToast, isMilestone } from '@/components/StreakToast'
import { CourseFeedbackPrompt } from '@/components/CourseFeedbackPrompt'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const LessonNav: React.FC<{
  prevHref?: string | null
  nextHref?: string | null
  lessonProgressId?: string | null
  enrollmentId: string
  courseId: string
  lessonId: string
  isCompleted: boolean
}> = ({ prevHref, nextHref, lessonProgressId, enrollmentId, courseId, lessonId, isCompleted }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(isCompleted)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [courseComplete, setCourseComplete] = useState(false)
  const [streakMilestone, setStreakMilestone] = useState<number | null>(null)
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false)

  const handleMarkComplete = async () => {
    setLoading(true)
    try {
      if (lessonProgressId) {
        await fetch(apiUrl(`/api/lesson-progress/${lessonProgressId}`), {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        })
      } else {
        await fetch(apiUrl('/api/lesson-progress'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: user?.id,
            lesson: lessonId,
            enrollment: enrollmentId,
            status: 'completed',
          }),
        })
      }

      setCompleted(true)
      setShowCheckmark(true)

      // Check for course completion and streak milestones in parallel
      const [enrollmentRes, userRes] = await Promise.all([
        fetch(apiUrl(`/api/enrollments/${enrollmentId}`), {
          credentials: 'include',
        }).catch(() => null),
        user?.id
          ? fetch(apiUrl(`/api/users/${user.id}`), {
              credentials: 'include',
            }).catch(() => null)
          : null,
      ])

      let hasCelebration = false
      let shouldPromptFeedback = false

      if (enrollmentRes?.ok) {
        const enrollment = await enrollmentRes.json()
        if (enrollment.status === 'completed' || enrollment.completionPercentage === 100) {
          setCourseComplete(true)
          fireCourseCompleteConfetti()
          hasCelebration = true
          if (!enrollment.feedbackPrompted) {
            shouldPromptFeedback = true
          }
        }
      }

      if (userRes?.ok) {
        const userData = await userRes.json()
        const streak = userData.currentStreak ?? userData.user?.currentStreak
        if (streak && isMilestone(streak)) {
          setStreakMilestone(streak)
          hasCelebration = true
        }
      }

      // If course just completed and feedback not yet prompted, show prompt after confetti
      if (shouldPromptFeedback) {
        const confettiDelay = hasCelebration ? 2500 : 1200
        setTimeout(() => {
          setShowFeedbackPrompt(true)
        }, confettiDelay)
        return
      }

      // Delay navigation to show celebration
      const delay = hasCelebration ? 2500 : 1200
      setTimeout(() => {
        if (nextHref) window.location.href = `${basePath}${nextHref}`
        else window.location.reload()
      }, delay)
    } catch {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex justify-between items-center pt-6 mt-8 border-t border-border">
        {prevHref ? (
          <Link
            href={prevHref}
            className="px-4 py-2 text-sm text-brand-silver hover:text-foreground transition-colors"
          >
            &larr; Previous
          </Link>
        ) : (
          <div />
        )}
        <AnimatePresence mode="wait">
          {!completed ? (
            <motion.button
              key="complete-btn"
              onClick={handleMarkComplete}
              disabled={loading}
              className={cn(
                'px-5 py-2.5 bg-brand-gold/20 text-brand-gold rounded-lg text-sm font-medium hover:bg-brand-gold/30 transition-colors',
                loading && 'opacity-50 cursor-not-allowed',
              )}
            >
              {loading ? 'Saving...' : `Mark Complete${nextHref ? ' & Next \u2192' : ''}`}
            </motion.button>
          ) : showCheckmark ? (
            <motion.span
              key="checkmark"
              initial={prefersReducedMotion() ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex items-center gap-2 text-sm font-medium text-green-500"
            >
              <motion.svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                initial={prefersReducedMotion() ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                className="text-green-500"
              >
                <motion.circle
                  cx="10"
                  cy="10"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  initial={prefersReducedMotion() ? undefined : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
                <motion.path
                  d="M6 10.5L8.5 13L14 7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  initial={prefersReducedMotion() ? undefined : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }}
                />
              </motion.svg>
              {courseComplete ? 'Course Complete!' : 'Lesson Complete'}
            </motion.span>
          ) : nextHref ? (
            <Link
              href={nextHref}
              className="px-5 py-2.5 bg-brand-gold/20 text-brand-gold rounded-lg text-sm font-medium hover:bg-brand-gold/30 transition-colors"
            >
              Next &rarr;
            </Link>
          ) : (
            <span className="text-sm text-green-500 font-medium">Lesson Complete</span>
          )}
        </AnimatePresence>
      </div>
      <StreakToast streak={streakMilestone} />
      <CourseFeedbackPrompt
        isOpen={showFeedbackPrompt}
        onClose={() => {
          setShowFeedbackPrompt(false)
          // Navigate after feedback prompt is dismissed or submitted
          setTimeout(() => {
            if (nextHref) window.location.href = `${basePath}${nextHref}`
            else window.location.reload()
          }, 300)
        }}
        enrollmentId={enrollmentId}
        courseId={courseId}
      />
    </>
  )
}
