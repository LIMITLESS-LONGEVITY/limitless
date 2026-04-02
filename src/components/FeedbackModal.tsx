'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Satisfaction = 'exceptional' | 'good' | 'could_improve'
type Category = 'experience' | 'content' | 'feature_request' | 'bug_report'

const SATISFACTION_OPTIONS: { value: Satisfaction; label: string; emoji: string }[] = [
  { value: 'exceptional', label: 'Exceptional', emoji: '\u2728' },
  { value: 'good', label: 'Good', emoji: '\uD83D\uDC4D' },
  { value: 'could_improve', label: 'Could Improve', emoji: '\uD83D\uDCA1' },
]

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'experience', label: 'Experience' },
  { value: 'content', label: 'Content' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug_report', label: 'Bug Report' },
]

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [satisfaction, setSatisfaction] = useState<Satisfaction | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [message, setMessage] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const prefersReducedMotion = useReducedMotion()

  const reset = useCallback(() => {
    setStep(1)
    setSatisfaction(null)
    setCategory(null)
    setMessage('')
    setAnonymous(false)
    setSubmitting(false)
    setSuccess(false)
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    onClose()
    setTimeout(reset, 200)
  }, [onClose, reset])

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

  const handleSatisfactionSelect = (value: Satisfaction) => {
    setSatisfaction(value)
    setStep(2)
  }

  const handleCategorySelect = (value: Category) => {
    setCategory(value)
    setStep(3)
  }

  const handleSubmit = async () => {
    if (!satisfaction || !category) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/learn/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          satisfaction,
          category,
          message: message.trim() || undefined,
          pageUrl: window.location.pathname,
          anonymous,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Something went wrong')
      }

      setSuccess(true)
      setTimeout(handleClose, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const t = prefersReducedMotion ? '' : 'transition-all duration-200 ease-out'

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      style={prefersReducedMotion ? undefined : { animation: 'feedbackFadeIn 200ms ease-out' }}
      role="dialog"
      aria-modal="true"
      aria-label="Share feedback"
    >
      <div
        className={`relative w-full max-w-md rounded-2xl border border-brand-glass-border p-6 shadow-2xl ${t}`}
        style={{
          backgroundColor: 'rgba(10, 14, 26, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-brand-silver/50 hover:text-brand-silver transition-colors"
          aria-label="Close feedback dialog"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Success state */}
        {success ? (
          <div className={`flex flex-col items-center py-8 text-center ${t}`}>
            <div className="mb-4 text-3xl text-brand-gold">{'\u2713'}</div>
            <p className="text-brand-gold text-sm font-medium">Thank you for sharing your thoughts</p>
            <p className="mt-1 text-brand-silver/50 text-xs">Your feedback helps us improve.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-brand-light text-base font-semibold">Share Feedback</h2>
              <p className="mt-1 text-brand-silver/60 text-xs">
                {step === 1 && 'How has your experience been?'}
                {step === 2 && 'What is this feedback about?'}
                {step === 3 && 'Anything else you\'d like to share?'}
              </p>
              {/* Step indicator */}
              <div className="mt-3 flex gap-1.5">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-0.5 flex-1 rounded-full ${t} ${
                      s <= step ? 'bg-brand-gold' : 'bg-brand-glass-border'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Step 1: Satisfaction */}
            {step === 1 && (
              <div className="flex flex-col gap-2">
                {SATISFACTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSatisfactionSelect(opt.value)}
                    className={`flex items-center gap-3 rounded-xl border border-brand-glass-border px-4 py-3 text-left text-sm ${t} hover:border-brand-gold/50 hover:bg-brand-gold/5 text-brand-silver`}
                  >
                    <span className="text-lg">{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Category */}
            {step === 2 && (
              <div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleCategorySelect(opt.value)}
                      className={`rounded-full border px-4 py-2 text-xs font-medium ${t} ${
                        category === opt.value
                          ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                          : 'border-brand-glass-border text-brand-silver hover:border-brand-gold/40 hover:text-brand-gold'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="mt-4 text-brand-silver/40 text-xs hover:text-brand-silver transition-colors"
                >
                  &larr; Back
                </button>
              </div>
            )}

            {/* Step 3: Message + Submit */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Optional: Tell us more..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-brand-glass-border bg-brand-glass-bg px-4 py-3 text-sm text-brand-light placeholder:text-brand-silver/30 focus:border-brand-gold/40 focus:outline-none"
                />
                <label className="flex items-center gap-2 text-xs text-brand-silver/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-brand-glass-border accent-brand-gold"
                  />
                  Submit anonymously
                </label>
                {error && (
                  <p className="text-xs text-red-400">{error}</p>
                )}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="text-brand-silver/40 text-xs hover:text-brand-silver transition-colors"
                  >
                    &larr; Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`rounded-full border border-brand-gold px-6 py-2 text-xs font-medium uppercase tracking-wider text-brand-gold ${t} hover:bg-brand-gold/10 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {submitting ? 'Sending...' : 'Submit'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** SSR-safe hook that respects prefers-reduced-motion */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}
