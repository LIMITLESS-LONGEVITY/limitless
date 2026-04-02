import { GlassCard } from './GlassCard'
import { SectionHeader } from './SectionHeader'
import { ScrollReveal } from './ScrollReveal'
import React from 'react'

const steps = [
  {
    number: '01',
    title: 'Assess',
    description:
      'Understand your biological baseline through evidence-based frameworks and structured self-assessment.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16 8v8l6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Learn',
    description:
      'Dive deep into curated courses and articles from leading longevity researchers and clinicians.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="6" y="4" width="20" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 10h10M11 14h10M11 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Apply',
    description:
      'Translate knowledge into action with personalized protocols, quizzes, and AI-powered recommendations.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M6 16l8 8L26 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export const ValuePropSection: React.FC = () => {
  return (
    <section className="py-24 md:py-32 bg-brand-dark-alt relative">
      <div className="container max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <SectionHeader
            label="Your Journey"
            heading="Three Steps to Longevity Mastery"
            description="A structured approach to understanding and optimizing your healthspan."
          />
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, i) => (
            <ScrollReveal key={step.number} delay={i * 100}>
              <GlassCard className="text-center h-full">
                <div className="text-brand-teal mb-4">{step.icon}</div>
                <span className="text-brand-gold text-xs font-sans uppercase tracking-[0.2em] font-medium">
                  {step.number}
                </span>
                <h3 className="font-display text-2xl font-light text-brand-light mt-2 mb-3">
                  {step.title}
                </h3>
                <p className="font-sans text-brand-silver text-sm leading-relaxed">
                  {step.description}
                </p>
              </GlassCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
