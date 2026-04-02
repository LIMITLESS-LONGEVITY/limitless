'use client'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="font-display text-2xl font-semibold text-brand-light mb-3">Something went wrong</h1>
        <p className="text-brand-silver/60 text-sm mb-6">An unexpected error occurred. Please try again.</p>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-full text-sm font-medium uppercase tracking-[0.1em] border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
