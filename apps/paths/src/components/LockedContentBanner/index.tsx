import React from 'react'
import Link from 'next/link'
import { Lock, Check, Sparkles } from 'lucide-react'

const TIER_BENEFITS: Record<string, string[]> = {
  regular: [
    'Full access to all regular-tier articles and courses',
    'AI-powered tutor with 10 daily conversations',
    'Quiz generation and progress tracking',
  ],
  premium: [
    'All content including premium courses and articles',
    'AI tutor with 50 daily conversations',
    'Personalized health profile and action plans',
    'Daily longevity protocols',
    '10% discount on diagnostic packages',
  ],
  enterprise: [
    'Everything in Premium, plus unlimited AI access',
    'Priority expert Q&A sessions',
    'Telemedicine access',
    'Family accounts and cohort programs',
  ],
}

export const LockedContentBanner: React.FC<{
  tierRequired: string
}> = ({ tierRequired }) => {
  const tierLabel = tierRequired.charAt(0).toUpperCase() + tierRequired.slice(1)
  const benefits = TIER_BENEFITS[tierRequired] || TIER_BENEFITS.regular

  return (
    <div className="relative">
      {/* Blurred content preview effect */}
      <div className="relative overflow-hidden rounded-xl">
        <div className="h-32 bg-gradient-to-b from-transparent via-brand-dark/60 to-brand-dark" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full max-w-md px-4 space-y-2 opacity-20 blur-sm select-none" aria-hidden="true">
            <div className="h-3 bg-brand-silver/30 rounded w-full" />
            <div className="h-3 bg-brand-silver/30 rounded w-4/5" />
            <div className="h-3 bg-brand-silver/30 rounded w-3/4" />
            <div className="h-3 bg-brand-silver/30 rounded w-full" />
            <div className="h-3 bg-brand-silver/30 rounded w-2/3" />
          </div>
        </div>
      </div>

      {/* Upgrade card */}
      <div
        className="rounded-2xl border border-brand-gold/20 bg-brand-glass-bg backdrop-blur-md p-6 md:p-8 text-center"
        style={{ WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div className="w-12 h-12 rounded-full bg-brand-gold-dim flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-brand-gold" />
        </div>

        <h3 className="font-display text-xl font-light tracking-wide text-brand-light mb-2">
          {tierLabel} Content
        </h3>
        <p className="text-sm text-brand-silver mb-6 max-w-sm mx-auto">
          Upgrade to {tierLabel} to unlock this content and everything that comes with it.
        </p>

        {/* Benefits */}
        <div className="text-left max-w-sm mx-auto mb-6 space-y-2.5">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-brand-teal mt-0.5 flex-shrink-0" />
              <span className="text-xs text-brand-silver">{benefit}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/account/billing"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium uppercase tracking-[0.15em] border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark transition-all duration-300 min-h-[44px]"
          >
            Upgrade to {tierLabel}
          </Link>
          <Link
            href="/account/billing"
            className="text-xs text-brand-silver hover:text-brand-light transition-colors"
          >
            Compare all plans
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-[10px] text-brand-silver/40 mt-6">
          <Sparkles className="w-3 h-3 inline mr-1" />
          Join members learning longevity science with AI-powered tools
        </p>
      </div>
    </div>
  )
}
