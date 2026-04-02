import React from 'react'
import Link from 'next/link'
import { Lock, Calendar } from 'lucide-react'

export const StayDayGate: React.FC<{
  dayNumber: number
  stayStartDate: string
  courseSlug: string
  phase: 'pre-arrival' | 'future-day'
}> = ({ dayNumber, stayStartDate, courseSlug, phase }) => {
  const availableDate = new Date(stayStartDate)
  availableDate.setDate(availableDate.getDate() + dayNumber - 1)

  return (
    <div className="pt-24 pb-24 px-8 max-w-[48rem] mx-auto">
      <div
        className="rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-8 text-center"
        style={{ WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div className="w-12 h-12 rounded-full bg-brand-gold-dim flex items-center justify-center mx-auto mb-4">
          {phase === 'pre-arrival' ? (
            <Lock className="w-5 h-5 text-brand-gold" />
          ) : (
            <Calendar className="w-5 h-5 text-brand-gold" />
          )}
        </div>

        <h2 className="font-display text-xl font-light tracking-wide text-brand-light mb-2">
          {phase === 'pre-arrival'
            ? 'Available During Your Stay'
            : `Available on Day ${dayNumber}`}
        </h2>

        <p className="text-sm text-brand-silver mb-4">
          {phase === 'pre-arrival'
            ? `This content will be unlocked when your stay begins on ${availableDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`
            : `This content will be available on ${availableDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`}
        </p>

        <Link
          href={`/courses/${courseSlug}`}
          className="text-xs text-brand-gold hover:text-brand-gold/80 transition-colors"
        >
          &larr; Back to Stay Program
        </Link>
      </div>
    </div>
  )
}
