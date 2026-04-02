import { CTAButton } from './CTAButton'
import React from 'react'

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-brand-dark">
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-brand-teal/[0.07] blur-[120px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-brand-gold/[0.05] blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-brand-teal/[0.03] blur-[160px]" />
      </div>

      {/* Fine grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="h-px w-12 bg-brand-gold/60" />
          <span className="text-brand-gold text-xs font-sans uppercase tracking-[0.3em] font-medium">
            PATHS by LIMITLESS
          </span>
          <span className="h-px w-12 bg-brand-gold/60" />
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-brand-light leading-[1.1] tracking-tight mb-6">
          Master the Science
          <br />
          <span className="text-brand-gold">of Living Longer</span>
        </h1>

        <p className="font-sans text-brand-silver text-base md:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          Evidence-based longevity education for executives and high-performers.
          Courses, articles, and AI-powered learning — all in one platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <CTAButton href="/courses" variant="gold" size="lg">
            Explore Courses
          </CTAButton>
          <CTAButton href="/articles" variant="ghost" size="lg">
            Read Articles
          </CTAButton>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-pulse">
        <span className="text-brand-silver/40 text-xs font-sans uppercase tracking-widest">Scroll</span>
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none" className="text-brand-silver/40" aria-hidden="true">
          <path d="M8 4v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  )
}
