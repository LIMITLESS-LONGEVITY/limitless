'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '@/utilities/ui'
import { X } from 'lucide-react'
import { apiUrl } from '@/utilities/apiUrl'

type TourStep = {
  title: string
  description: string
  targetSelector?: string
  position: 'center' | 'bottom'
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome to PATHS',
    description:
      'Your personalized longevity learning platform. Here you can track your courses, view progress, and access AI-powered learning tools.',
    position: 'center',
  },
  {
    title: 'Browse Courses',
    description:
      'Structured learning paths designed by longevity experts. Enroll, track progress, and earn completions across all six health pillars.',
    targetSelector: 'a[href="/courses"]',
    position: 'bottom',
  },
  {
    title: 'Read Expert Articles',
    description:
      'Evidence-based articles from our team of scientists and coaches. Each article includes an AI tutor you can ask questions to.',
    targetSelector: 'a[href="/articles"]',
    position: 'bottom',
  },
  {
    title: 'AI-Powered Search',
    description:
      'Our semantic search understands what you mean, not just what you type. Find content across courses, articles, and lessons instantly.',
    targetSelector: 'a[href="/search"]',
    position: 'bottom',
  },
  {
    title: 'You\'re All Set!',
    description:
      'Start exploring — we recommend beginning with a course in the health pillar that matters most to you. Your dashboard will track everything.',
    position: 'center',
  },
]

export const OnboardingTour: React.FC<{ userId: string }> = ({ userId }) => {
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const currentStep = STEPS[step]

  const updateTargetRect = useCallback(() => {
    if (!currentStep?.targetSelector) {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(currentStep.targetSelector)
    if (el) {
      setTargetRect(el.getBoundingClientRect())
    } else {
      setTargetRect(null)
    }
  }, [currentStep])

  useEffect(() => {
    queueMicrotask(() => updateTargetRect())
    window.addEventListener('resize', updateTargetRect)
    window.addEventListener('scroll', updateTargetRect)
    return () => {
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect)
    }
  }, [updateTargetRect])

  const complete = async () => {
    setDismissed(true)
    try {
      await fetch(apiUrl(`/api/users/${userId}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasCompletedOnboarding: true }),
      })
    } catch {}
  }

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      complete()
    }
  }

  if (dismissed) return null

  const isCenter = currentStep?.position === 'center' || !targetRect
  const padding = 8

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      {/* Click catcher — dismiss on click outside */}
      <div className="fixed inset-0 z-50" onClick={complete} />

      {/* Center steps: subtle dim overlay */}
      {isCenter && <div className="fixed inset-0 z-50 bg-black/30 pointer-events-none" />}

      {/* Spotlight steps: single box-shadow layer creates overlay + cutout in one */}
      {targetRect && !isCenter && (
        <div
          className="fixed rounded-lg z-[51] pointer-events-none transition-all duration-300 ease-in-out"
          style={{
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            border: '2px solid rgba(201, 168, 76, 0.4)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className={cn(
          'fixed z-[52] w-[320px] max-w-[90vw]',
          'rounded-2xl border border-brand-glass-border bg-brand-dark-alt backdrop-blur-md p-5',
          isCenter && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_40px_rgba(201,168,76,0.15)]',
        )}
        style={
          !isCenter && targetRect
            ? {
                top: targetRect.bottom + padding + 8,
                left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 336)),
                WebkitBackdropFilter: 'blur(12px)',
              }
            : { WebkitBackdropFilter: 'blur(12px)' }
        }
      >
        {/* Close button */}
        <button
          onClick={complete}
          className="absolute top-3 right-3 p-1 text-brand-silver hover:text-brand-light transition-colors"
          aria-label="Close tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step content */}
        <h3 className="font-display text-lg font-normal tracking-wide text-brand-light mb-2 pr-6">
          {currentStep?.title}
        </h3>
        <p className="text-xs text-brand-silver leading-relaxed mb-4">
          {currentStep?.description}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {/* Step dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  i === step ? 'bg-brand-gold' : i < step ? 'bg-brand-teal/50' : 'bg-brand-silver/30',
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {step < STEPS.length - 1 && (
              <button
                onClick={complete}
                className="text-xs text-brand-silver hover:text-brand-light transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={next}
              className="px-4 py-1.5 text-xs font-medium text-brand-gold border border-brand-gold/40 rounded-full hover:bg-brand-gold hover:text-brand-dark transition-all"
            >
              {step < STEPS.length - 1 ? 'Next' : 'Get Started'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
