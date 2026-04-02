import { GlassCard } from './GlassCard'
import { SectionHeader } from './SectionHeader'
import { CTAButton } from './CTAButton'
import { ScrollReveal } from './ScrollReveal'
import React from 'react'

import type { MembershipTier } from '@/payload-types'

interface MembershipSectionProps {
  tiers: MembershipTier[]
}

export const MembershipSection: React.FC<MembershipSectionProps> = ({ tiers }) => {
  if (!tiers.length) return null

  return (
    <section className="py-24 md:py-32 bg-brand-dark relative">
      <div className="container max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <SectionHeader
            label="Membership"
            heading="Choose Your Path"
            description="Every tier unlocks deeper access to longevity science."
          />
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {tiers.map((tier, i) => {
            const isEnterprise = tier.accessLevel === 'enterprise'
            const isPremium = tier.accessLevel === 'premium' || isEnterprise

            return (
              <ScrollReveal key={tier.id} delay={i * 100}>
                <GlassCard
                  className={`h-full flex flex-col ${isPremium ? 'border-brand-gold/30 bg-brand-gold-dim' : ''}`}
                >
                  {isPremium && (
                    <span className="text-brand-gold text-xs font-sans uppercase tracking-[0.2em] font-medium mb-2">
                      {isEnterprise ? 'For Organizations' : 'Recommended'}
                    </span>
                  )}
                  <h3 className="font-display text-2xl font-light text-brand-light mb-1">
                    {tier.name}
                  </h3>
                  <div className="mb-4">
                    {isEnterprise ? (
                      <span className="font-display text-2xl text-brand-gold font-light">
                        Custom Pricing
                      </span>
                    ) : tier.monthlyPrice ? (
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-3xl text-brand-gold font-light">
                          ${tier.monthlyPrice}
                        </span>
                        <span className="text-brand-silver text-sm font-sans">/month</span>
                      </div>
                    ) : (
                      <span className="font-display text-3xl text-brand-gold font-light">Free</span>
                    )}
                  </div>

                  {tier.features && tier.features.length > 0 && (
                    <ul className="space-y-2 mb-6 flex-1">
                      {tier.features.map((f) => (
                        <li key={f.id} className="flex items-start gap-2 text-brand-silver text-sm font-sans">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            className="text-brand-teal mt-0.5 shrink-0"
                            aria-hidden="true"
                          >
                            <path
                              d="M3 8l3.5 3.5L13 5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {f.feature}
                        </li>
                      ))}
                    </ul>
                  )}

                  {isEnterprise ? (
                    <a
                      href="/book/contact-sales"
                      className="mt-auto w-full text-center inline-flex items-center justify-center font-sans text-xs uppercase tracking-[0.15em] font-medium rounded-full transition-all duration-300 min-h-[44px] px-6 py-3 border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none"
                    >
                      Contact Sales
                    </a>
                  ) : (
                    <CTAButton
                      href="/register"
                      variant={isPremium ? 'gold' : 'ghost'}
                      className="mt-auto w-full text-center"
                    >
                      Get Started
                    </CTAButton>
                  )}
                </GlassCard>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
