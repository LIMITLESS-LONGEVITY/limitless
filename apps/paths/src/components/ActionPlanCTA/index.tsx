'use client'
import React, { useState, useEffect } from 'react'
import { cn } from '@/utilities/ui'
import { Sparkles, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react'
import { apiUrl } from '@/utilities/apiUrl'

type WeekDay = {
  dayNumber: number
  morning?: string[]
  afternoon?: string[]
  evening?: string[]
}

type Week = {
  weekNumber: number
  theme: string
  days: WeekDay[]
  checkpoint?: string
}

type Plan = {
  title?: string
  weeks: Week[]
}

type ActionPlanData = {
  id: string
  status: string
  plan: Plan
  generatedAt: string
}

export const ActionPlanCTA: React.FC<{
  enrollmentId: string
  courseTitle: string
  pillarName: string
}> = ({ enrollmentId, courseTitle, pillarName }) => {
  const [actionPlan, setActionPlan] = useState<ActionPlanData | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null)

  // Check for existing plan on mount
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(
          `/api/action-plans?where[enrollment][equals]=${enrollmentId}&limit=1&sort=-generatedAt`,
        )
        if (res.ok) {
          const data = await res.json()
          if (data.docs?.[0]?.status === 'ready') {
            setActionPlan(data.docs[0])
          }
        }
      } catch {}
      setChecking(false)
    }
    check()
  }, [enrollmentId])

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(apiUrl('/api/ai/action-plan'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId }),
      })

      if (res.status === 429) {
        setError('Action plan generation limit reached. Upgrade for more access.')
        return
      }

      if (!res.ok) {
        setError('Failed to generate plan. Please try again.')
        return
      }

      const data = await res.json()
      setActionPlan(data.actionPlan)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) return null

  // Show CTA if no plan exists
  if (!actionPlan) {
    return (
      <div
        className="rounded-2xl border border-brand-gold/20 bg-brand-glass-bg backdrop-blur-md p-6"
        style={{ WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-brand-gold-dim flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-brand-gold" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-brand-light mb-1">
              Generate Your 30-Day Action Plan
            </h3>
            <p className="text-xs text-brand-silver leading-relaxed mb-3">
              Get a personalized action plan based on what you learned in {courseTitle}.
              {pillarName && ` Tailored to your ${pillarName.toLowerCase()} goals.`}
            </p>
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-medium transition-all',
                'border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark',
                loading && 'opacity-50 cursor-not-allowed',
              )}
            >
              {loading ? 'Generating...' : 'Generate Action Plan'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Display the plan
  const plan = actionPlan.plan
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-silver mb-4">
        {plan.title || '30-Day Action Plan'}
      </h3>
      <div className="space-y-2">
        {plan.weeks?.map((week) => (
          <div key={week.weekNumber} className="border border-brand-glass-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedWeek(expandedWeek === week.weekNumber ? null : week.weekNumber)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-glass-bg-hover transition-colors"
            >
              {expandedWeek === week.weekNumber ? (
                <ChevronDown className="w-4 h-4 text-brand-gold flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-brand-silver flex-shrink-0" />
              )}
              <span className="text-sm font-semibold">Week {week.weekNumber}</span>
              <span className="text-xs text-brand-silver ml-1">{week.theme}</span>
            </button>

            {expandedWeek === week.weekNumber && (
              <div className="px-4 pb-4 space-y-3">
                {week.days?.map((day) => (
                  <div key={day.dayNumber} className="pl-7">
                    <p className="text-xs font-semibold text-brand-gold mb-1.5">Day {day.dayNumber}</p>
                    <div className="space-y-1">
                      {day.morning?.map((action, i) => (
                        <p key={`m${i}`} className="text-xs text-brand-silver flex items-start gap-1.5">
                          <span className="text-brand-gold/60">AM</span> {action}
                        </p>
                      ))}
                      {day.afternoon?.map((action, i) => (
                        <p key={`a${i}`} className="text-xs text-brand-silver flex items-start gap-1.5">
                          <span className="text-brand-teal/60">PM</span> {action}
                        </p>
                      ))}
                      {day.evening?.map((action, i) => (
                        <p key={`e${i}`} className="text-xs text-brand-silver flex items-start gap-1.5">
                          <span className="text-purple-400/60">EVE</span> {action}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
                {week.checkpoint && (
                  <div className="pl-7 pt-2 border-t border-brand-glass-border">
                    <p className="text-xs text-brand-teal flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      {week.checkpoint}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
