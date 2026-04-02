import React from 'react'
import { Activity } from 'lucide-react'

export const DiagnosticUpsell: React.FC<{
  pillarName?: string
  context: 'course-completion' | 'article'
}> = ({ pillarName, context }) => {
  const heading = pillarName
    ? `Curious about your ${pillarName.toLowerCase()} markers?`
    : 'Want to see where you stand?'

  const description =
    context === 'course-completion'
      ? 'Now that you\'ve completed this course, benchmark your health with a comprehensive diagnostic assessment at Hospital Recoletas Salud Marbella.'
      : 'Go beyond theory. Book a comprehensive diagnostic package to measure the biomarkers discussed in this article.'

  return (
    <div
      className="rounded-2xl border border-brand-teal/20 bg-brand-glass-bg backdrop-blur-md p-6"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-brand-teal-dim flex items-center justify-center flex-shrink-0">
          <Activity className="w-5 h-5 text-brand-teal" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-brand-light mb-1">{heading}</h3>
          <p className="text-xs text-brand-silver leading-relaxed mb-3">{description}</p>
          <a
            href="/book/diagnostics"
            className="inline-flex items-center gap-1.5 text-xs text-brand-gold hover:text-brand-gold/80 transition-colors group"
          >
            <span className="border-b border-brand-gold/30 group-hover:border-brand-gold/60 transition-colors">
              Explore Diagnostic Packages
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              <path
                d="M4.5 2.5L8 6L4.5 9.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
