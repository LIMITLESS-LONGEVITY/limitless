'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { apiUrl } from '@/utilities/apiUrl'

type Satisfaction = 'exceptional' | 'good' | 'could_improve'

const SATISFACTION_OPTIONS: { value: Satisfaction; label: string; emoji: string }[] = [
  { value: 'exceptional', label: 'Exceptional', emoji: '\u2728' },
  { value: 'good', label: 'Good', emoji: '\uD83D\uDC4D' },
  { value: 'could_improve', label: 'Could Improve', emoji: '\uD83D\uDCA1' },
]

interface CourseFeedbackPromptProps {
  isOpen: boolean
  onClose: () => void
  enrollmentId: string
  courseId: string
}

export function CourseFeedbackPrompt({
  isOpen,
  onClose,
  enrollmentId,
  courseId,
}: CourseFeedbackPromptProps) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const handleClose = useCallback(() => {
    // Mark as prompted even when dismissed so we don't re-show
    fetch(apiUrl(`/api/enrollments/${enrollmentId}`), {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedbackPrompted: true }),
    }).catch(() => {})
    onClose()
  }, [onClose, enrollmentId])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, handleClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) handleClose()
  }

  const handleSelect = async (satisfaction: Satisfaction) => {
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(apiUrl('/api/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          satisfaction,
          category: 'experience',
          message: `Course completion feedback | enrollmentId: ${enrollmentId} | courseId: ${courseId}`,
          pageUrl: window.location.pathname,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Something went wrong')
      }

      // Mark enrollment as prompted
      await fetch(apiUrl(`/api/enrollments/${enrollmentId}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackPrompted: true }),
      }).catch(() => {})

      setSuccess(true)
      setTimeout(onClose, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const transition = prefersReducedMotion ? '' : 'transition-all duration-200 ease-out'

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 ${transition} ${prefersReducedMotion ? 'opacity-100' : 'animate-in fade-in'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Course feedback"
    >
      <div
        className={`relative w-full max-w-sm rounded-2xl border border-brand-glass-border bg-[rgba(10,14,26,0.92)] p-6 shadow-2xl ${transition}`}
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-brand-silver/50 hover:text-brand-silver transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Dismiss feedback prompt"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {success ? (
          <div className={`flex flex-col items-center py-6 text-center ${transition}`}>
            <div className="mb-3 text-3xl">{'\u2713'}</div>
            <p className="text-brand-gold text-sm font-medium">Thank you for your feedback</p>
            <p className="mt-1 text-brand-silver/50 text-xs">
              Your input helps us improve PATHS.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 pr-8">
              <h2 className="text-brand-light text-base font-semibold">
                How was your experience?
              </h2>
              <p className="mt-1 text-brand-silver/60 text-xs">
                You just completed a course. We&apos;d love your quick take.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {SATISFACTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  disabled={submitting}
                  className={`flex items-center gap-3 rounded-xl border border-brand-glass-border px-4 py-3 text-left text-sm ${transition} hover:border-brand-gold/50 hover:bg-brand-gold/5 text-brand-silver disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]`}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
