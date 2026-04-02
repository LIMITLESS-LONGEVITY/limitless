'use client'

import React, { useCallback, useEffect, useState, startTransition } from 'react'
import { cn } from '@/utilities/ui'

interface CookieConsentState {
  essential: boolean
  functional: boolean
  analytics: boolean
  timestamp: string
}

const COOKIE_NAME = 'cookie_consent'
const COOKIE_MAX_AGE_DAYS = 365

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function getConsentFromCookie(): CookieConsentState | null {
  const raw = getCookie(COOKIE_NAME)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CookieConsentState
  } catch {
    return null
  }
}

/** Open the cookie consent banner programmatically */
export function openCookieConsent() {
  window.dispatchEvent(new CustomEvent('open-cookie-consent'))
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [functional, setFunctional] = useState(false)
  const [analytics, setAnalytics] = useState(false)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const existing = getConsentFromCookie()
    if (!existing) {
      startTransition(() => setVisible(true))
    }

    const handleOpen = () => {
      const current = getConsentFromCookie()
      if (current) {
        startTransition(() => {
          setFunctional(current.functional)
          setAnalytics(current.analytics)
          setVisible(true)
        })
      } else {
        startTransition(() => setVisible(true))
      }
    }

    window.addEventListener('open-cookie-consent', handleOpen)
    return () => window.removeEventListener('open-cookie-consent', handleOpen)
  }, [])

  const saveConsent = useCallback(
    (func: boolean, anal: boolean) => {
      const consent: CookieConsentState = {
        essential: true,
        functional: func,
        analytics: anal,
        timestamp: new Date().toISOString(),
      }
      setCookie(COOKIE_NAME, JSON.stringify(consent), COOKIE_MAX_AGE_DAYS)
      setVisible(false)
    },
    [],
  )

  const handleAcceptSelected = useCallback(() => {
    saveConsent(functional, analytics)
  }, [functional, analytics, saveConsent])

  const handleAcceptAll = useCallback(() => {
    setFunctional(true)
    setAnalytics(true)
    saveConsent(true, true)
  }, [saveConsent])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 border-t border-brand-glass-border bg-brand-dark/95 backdrop-blur-md',
        prefersReducedMotion ? '' : 'animate-in slide-in-from-bottom duration-300',
      )}
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div className="container mx-auto px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          {/* Description */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-brand-light mb-1">Cookie Preferences</h2>
            <p className="text-xs text-brand-silver leading-relaxed">
              We use cookies to enhance your experience. Essential cookies are always active as they
              are required for the platform to function. You can choose which optional cookies to
              allow.
            </p>
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6 flex-shrink-0">
            {/* Essential — always on */}
            <ToggleRow
              label="Essential"
              description="Required for the platform to work"
              checked={true}
              disabled
              onChange={() => {}}
            />
            {/* Functional */}
            <ToggleRow
              label="Functional"
              description="Preferences and personalisation"
              checked={functional}
              onChange={setFunctional}
            />
            {/* Analytics */}
            <ToggleRow
              label="Analytics"
              description="Usage data and improvements"
              checked={analytics}
              onChange={setAnalytics}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <button
              onClick={handleAcceptSelected}
              className="min-h-[44px] min-w-[44px] rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-gold/90 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            >
              Accept Selected
            </button>
            <button
              onClick={handleAcceptAll}
              className="min-h-[44px] min-w-[44px] text-sm text-brand-silver underline underline-offset-2 transition-colors hover:text-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/50 rounded"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  const id = `cookie-toggle-${label.toLowerCase()}`

  return (
    <div className="flex items-center gap-3">
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${description}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 min-w-[44px] min-h-[44px] items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/50',
          'p-[10px]',
          checked ? 'bg-brand-gold' : 'bg-brand-silver/30',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
      <div className="flex flex-col">
        <label htmlFor={id} className="text-xs font-medium text-brand-light cursor-pointer">
          {label}
        </label>
        <span className="text-[10px] text-brand-silver/70">{description}</span>
      </div>
    </div>
  )
}
