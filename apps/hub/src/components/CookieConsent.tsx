'use client'

import { useCallback, useEffect, useState } from 'react'

interface CookiePreferences {
  essential: boolean
  functional: boolean
  analytics: boolean
}

const COOKIE_NAME = 'cookie_consent'
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 year in seconds

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    functional: false,
    analytics: false,
  })

  useEffect(() => {
    const existing = getCookie(COOKIE_NAME)
    if (!existing) {
      setVisible(true)
    }
  }, [])

  const save = useCallback((prefs: CookiePreferences) => {
    setCookie(COOKIE_NAME, JSON.stringify(prefs), COOKIE_MAX_AGE)
    setVisible(false)
  }, [])

  const handleAcceptSelected = () => save(preferences)

  const handleAcceptAll = () => {
    const all: CookiePreferences = { essential: true, functional: true, analytics: true }
    setPreferences(all)
    save(all)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[rgba(10,14,26,0.95)] backdrop-blur-md px-6 py-6 motion-safe:animate-slideUp"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-brand-silver leading-relaxed mb-5">
          We use cookies to ensure the site works correctly and to improve your experience.
          You can choose which categories to allow below.
        </p>

        <div className="flex flex-wrap gap-6 mb-5">
          {/* Essential */}
          <label className="flex items-center gap-3 min-h-[44px] cursor-not-allowed select-none">
            <span
              className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-brand-gold/60"
              aria-hidden="true"
            >
              <span className="inline-block h-4 w-4 translate-x-6 rounded-full bg-brand-gold" />
            </span>
            <span className="text-sm text-brand-silver">
              Essential <span className="text-brand-silver/40">(always on)</span>
            </span>
          </label>

          {/* Functional */}
          <label className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={preferences.functional}
              onClick={() => setPreferences((p) => ({ ...p, functional: !p.functional }))}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full motion-safe:transition-colors ${
                preferences.functional ? 'bg-brand-gold/60' : 'bg-white/10'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full motion-safe:transition-transform ${
                  preferences.functional
                    ? 'translate-x-6 bg-brand-gold'
                    : 'translate-x-1 bg-brand-silver/60'
                }`}
              />
            </button>
            <span className="text-sm text-brand-silver">Functional</span>
          </label>

          {/* Analytics */}
          <label className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={preferences.analytics}
              onClick={() => setPreferences((p) => ({ ...p, analytics: !p.analytics }))}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full motion-safe:transition-colors ${
                preferences.analytics ? 'bg-brand-gold/60' : 'bg-white/10'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full motion-safe:transition-transform ${
                  preferences.analytics
                    ? 'translate-x-6 bg-brand-gold'
                    : 'translate-x-1 bg-brand-silver/60'
                }`}
              />
            </button>
            <span className="text-sm text-brand-silver">Analytics</span>
          </label>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleAcceptSelected}
            className="min-h-[44px] rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-medium text-brand-dark hover:bg-brand-gold/90 motion-safe:transition-colors"
          >
            Accept Selected
          </button>
          <button
            onClick={handleAcceptAll}
            className="min-h-[44px] px-4 py-2.5 text-sm text-brand-silver hover:text-brand-gold motion-safe:transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}

/** Re-open the cookie banner (for "Manage Cookies" link) */
export function ManageCookiesButton() {
  const handleClick = () => {
    // Remove the cookie so the banner re-appears on next render cycle
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
    window.location.reload()
  }

  return (
    <button
      onClick={handleClick}
      className="mt-1 text-xs text-brand-silver/40 hover:text-brand-gold motion-safe:transition-colors"
    >
      Manage Cookies
    </button>
  )
}
