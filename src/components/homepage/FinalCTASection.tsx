import { CTAButton } from './CTAButton'
import { ScrollReveal } from './ScrollReveal'
import React from 'react'

export const FinalCTASection: React.FC = () => {
  return (
    <section className="py-24 md:py-32 bg-brand-dark relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-brand-gold/[0.04] blur-[100px]" />

      <div className="relative z-10 container max-w-3xl mx-auto px-6 text-center">
        <ScrollReveal>
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="h-px w-12 bg-brand-gold/60" />
            <span className="text-brand-gold text-xs font-sans uppercase tracking-[0.2em] font-medium">
              Begin Today
            </span>
            <span className="h-px w-12 bg-brand-gold/60" />
          </div>

          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-light text-brand-light tracking-tight mb-6">
            Your Longevity Journey
            <br />
            <span className="text-brand-gold">Starts Here</span>
          </h2>

          <p className="font-sans text-brand-silver text-base md:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            Join a community of executives and high-performers committed to
            evidence-based longevity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTAButton href="/register" variant="gold" size="lg">
              Create Account
            </CTAButton>
            <CTAButton href="/courses" variant="ghost" size="lg">
              Browse Courses
            </CTAButton>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
