import { GlassCard } from './GlassCard'
import { SectionHeader } from './SectionHeader'
import { ScrollReveal } from './ScrollReveal'
import React from 'react'

import type { ContentPillar } from '@/payload-types'

interface PillarsSectionProps {
  pillars: ContentPillar[]
}

const pillarIcons: Record<string, React.ReactNode> = {
  nutrition: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M14 3v22M7 8c0-2.8 3.1-5 7-5s7 2.2 7 5-3.1 5-7 5-7-2.2-7-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  exercise: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M4 14h4l3-7 6 14 3-7h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sleep: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M21 15.5A8.5 8.5 0 1112.5 7a6.5 6.5 0 008.5 8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  mindfulness: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
}

const defaultIcon = (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <path d="M14 4l2.5 7.5H24l-6 4.5 2.5 7.5-7-5-7 5 2.5-7.5-6-4.5h7.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const PillarsSection: React.FC<PillarsSectionProps> = ({ pillars }) => {
  if (!pillars.length) return null

  return (
    <section className="py-24 md:py-32 bg-brand-dark-alt relative">
      <div className="container max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <SectionHeader
            label="Disciplines"
            heading="Content Pillars"
            description="Our curriculum spans the core disciplines of longevity science."
          />
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {pillars.map((pillar, i) => (
            <ScrollReveal key={pillar.id} delay={i * 60}>
              <a href={`/articles?pillar=${pillar.slug}`} className="block group rounded-xl focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none">
                <GlassCard className="text-center">
                  <div className="text-brand-teal mb-3 flex justify-center group-hover:text-brand-gold transition-colors">
                    {pillarIcons[pillar.slug] || defaultIcon}
                  </div>
                  <h3 className="font-display text-lg font-light text-brand-light group-hover:text-brand-gold transition-colors">
                    {pillar.name}
                  </h3>
                  {pillar.description && (
                    <p className="font-sans text-brand-silver text-xs leading-relaxed mt-2 line-clamp-2">
                      {pillar.description}
                    </p>
                  )}
                </GlassCard>
              </a>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
