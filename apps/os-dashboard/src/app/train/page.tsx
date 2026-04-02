import Link from 'next/link'
import Header from '@/components/Header'

export default function TrainPage() {
  return (
    <div className="min-h-screen bg-brand-dark">
      <Header />
      <div className="flex items-center justify-center px-6" style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div
          className="w-full max-w-md rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-10 text-center"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          <svg className="w-12 h-12 text-brand-gold mx-auto mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          <h1 className="font-display text-3xl font-semibold text-brand-light tracking-wide mb-3">
            Coming Soon
          </h1>
          <p className="text-brand-silver text-sm leading-relaxed mb-8">
            Personalised training protocols built from your biomarker data and health goals. Powered by CUBES+ methodology.
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
