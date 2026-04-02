import Link from 'next/link'
import Header from '@/components/Header'

export default function HealthPage() {
  return (
    <div className="min-h-screen bg-brand-dark">
      <Header />
      <div className="flex items-center justify-center px-6" style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div
          className="w-full max-w-md rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-10 text-center"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          <svg className="w-12 h-12 text-brand-gold mx-auto mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
          <h1 className="font-display text-3xl font-semibold text-brand-light tracking-wide mb-3">
            Coming Soon
          </h1>
          <p className="text-brand-silver text-sm leading-relaxed mb-8">
            Your Digital Health Twin is under development. Track biomarkers, wearable data, and get AI-powered health insights — all in one place.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium uppercase tracking-[0.15em] border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark transition-all duration-300 min-h-[44px]"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
