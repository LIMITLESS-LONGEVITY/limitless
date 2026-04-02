'use client'
import React, { useState } from 'react'
import { GlassCard } from '@/components/homepage/GlassCard'
import { CTAButton } from '@/components/homepage/CTAButton'
import { ChevronDown, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react'

type Plan = {
  id: string
  courseTitle: string
  pillarName?: string
  status: string
  plan: any
  generatedAt: string
}

export default function PlansClient({ plans }: { plans: Plan[] }) {
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null)

  if (plans.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-10 h-10 mx-auto mb-3 text-brand-silver/30" />
        <p className="text-brand-silver mb-4">
          Complete a course to generate your first personalized action plan.
        </p>
        <CTAButton href="/courses" variant="gold">
          Browse Courses
        </CTAButton>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Action Plans</h2>
      {plans.map((plan) => (
        <div key={plan.id}>
          <button
            onClick={() => {
              setExpandedPlan(expandedPlan === plan.id ? null : plan.id)
              setExpandedWeek(null)
            }}
            className="w-full"
          >
            <GlassCard className="flex items-center gap-4 !p-4">
              <div className="w-8 h-8 rounded-lg bg-brand-gold-dim flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-brand-gold" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h3 className="text-sm font-semibold">{plan.courseTitle}</h3>
                <div className="flex items-center gap-2 text-xs text-brand-silver">
                  {plan.pillarName && <span>{plan.pillarName}</span>}
                  <span>{new Date(plan.generatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              {expandedPlan === plan.id ? (
                <ChevronDown className="w-4 h-4 text-brand-silver flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-brand-silver flex-shrink-0" />
              )}
            </GlassCard>
          </button>

          {expandedPlan === plan.id && plan.plan?.weeks && (
            <div className="mt-2 space-y-2 pl-4">
              {plan.plan.weeks.map((week: any) => (
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
                      {week.days?.map((day: any) => (
                        <div key={day.dayNumber} className="pl-7">
                          <p className="text-xs font-semibold text-brand-gold mb-1.5">Day {day.dayNumber}</p>
                          <div className="space-y-1">
                            {day.morning?.map((action: string, i: number) => (
                              <p key={`m${i}`} className="text-xs text-brand-silver">
                                <span className="text-brand-gold/60">AM</span> {action}
                              </p>
                            ))}
                            {day.afternoon?.map((action: string, i: number) => (
                              <p key={`a${i}`} className="text-xs text-brand-silver">
                                <span className="text-brand-teal/60">PM</span> {action}
                              </p>
                            ))}
                            {day.evening?.map((action: string, i: number) => (
                              <p key={`e${i}`} className="text-xs text-brand-silver">
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
          )}
        </div>
      ))}
    </div>
  )
}
