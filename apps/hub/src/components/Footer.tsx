'use client'

import { useState } from 'react'
import FeedbackModal from './FeedbackModal'
import { ManageCookiesButton } from './CookieConsent'

export default function Footer() {
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  return (
    <>
      <footer className="border-t border-brand-glass-border bg-brand-dark px-6 py-10">
        <div className="mx-auto max-w-7xl text-center">
          <p className="font-display text-lg tracking-[0.25em] text-brand-gold">
            LIMITLESS
          </p>
          <p className="mt-2 text-sm text-brand-silver">
            Limitless Longevity Consultancy &copy; {new Date().getFullYear()}. All rights reserved.
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              onClick={() => setFeedbackOpen(true)}
              className="text-xs text-brand-silver/40 hover:text-brand-gold motion-safe:transition-colors"
            >
              Share Feedback
            </button>
            <span className="text-brand-silver/20">&middot;</span>
            <ManageCookiesButton />
          </div>
        </div>
      </footer>
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  )
}
