'use client'

import { useState } from 'react'
import FeedbackModal from '@/components/FeedbackModal'

const apps = [
  {
    name: 'Learn',
    description: 'Evidence-based longevity education. Courses, guides, and AI-powered tutoring.',
    href: '/learn',
    status: 'Live',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    name: 'Book',
    description: 'Schedule consultations with our longevity physicians and specialists.',
    href: '/book',
    status: 'Coming Soon',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    name: 'Train',
    description: 'Personalized training protocols built from your biomarker data.',
    href: '/train',
    status: 'Coming Soon',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
]

import { manageCookies } from '@/components/CookieConsent'

export default function LandingView({
  onLogin,
  onRegister,
}: {
  onLogin: () => void
  onRegister: () => void
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      {/* Hero */}
      <header className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-[0.15em] text-brand-gold mb-4">
          LIMITLESS
        </h1>
        <p className="font-display text-xl md:text-2xl text-brand-silver mb-6 italic">
          The Longevity Operating System
        </p>
        <p className="max-w-xl text-brand-silver/70 text-base leading-relaxed mb-10">
          Your unified gateway to precision health, evidence-based education, and clinical consultancy.
          One login, every service.
        </p>

        {/* Auth buttons */}
        <div className="flex gap-4">
          <button
            onClick={onLogin}
            className="px-8 py-3 rounded-lg border border-brand-gold text-brand-gold font-medium hover:bg-brand-gold-dim transition-colors"
          >
            Log In
          </button>
          <button
            onClick={onRegister}
            className="px-8 py-3 rounded-lg bg-brand-gold text-brand-dark font-medium hover:bg-brand-gold/90 transition-colors"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* App cards */}
      <section className="max-w-5xl mx-auto w-full px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {apps.map((app) => (
            <a
              key={app.name}
              href={app.href}
              className="group rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 transition-colors hover:bg-brand-glass-bg-hover"
              style={{ WebkitBackdropFilter: 'blur(12px)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-brand-gold">{app.icon}</div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    app.status === 'Live'
                      ? 'bg-brand-teal-dim text-brand-teal'
                      : 'bg-brand-glass-bg text-brand-silver/60'
                  }`}
                >
                  {app.status}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-brand-light mb-2 group-hover:text-brand-gold transition-colors">
                {app.name}
              </h3>
              <p className="text-sm text-brand-silver/70 leading-relaxed">
                {app.description}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-brand-silver/40 text-sm border-t border-brand-glass-border">
        <span>Limitless Longevity Consultancy</span>
        <span className="mx-2">&middot;</span>
        <button
          onClick={() => setFeedbackOpen(true)}
          className="text-brand-silver/40 hover:text-brand-gold transition-colors"
        >
          Share Feedback
        </button>
        <span className="mx-2">&middot;</span>
        <button
          onClick={manageCookies}
          className="text-brand-silver/40 hover:text-brand-gold motion-safe:transition-colors"
        >
          Manage Cookies
        </button>
      </footer>

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  )
}
