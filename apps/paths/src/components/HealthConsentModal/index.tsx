'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/utilities/ui'

interface ConsentPurpose {
  key: string
  label: string
  description: string
}

const CONSENT_PURPOSES: ConsentPurpose[] = [
  {
    key: 'wearable_data_sync',
    label: 'Wearable Data Sync',
    description: 'Allow syncing data from connected wearable devices',
  },
  {
    key: 'biomarker_storage',
    label: 'Biomarker Storage',
    description: 'Store biomarker test results',
  },
  {
    key: 'ai_health_analysis',
    label: 'AI Health Analysis',
    description: 'Use health data for AI-powered insights',
  },
  {
    key: 'longevity_score',
    label: 'Longevity Score Calculation',
    description: 'Calculate your longevity score from health data',
  },
  {
    key: 'clinician_access',
    label: 'Clinician Access',
    description: 'Share health data with assigned clinicians',
  },
]

interface HealthConsentModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  dtBaseUrl?: string
}

type ConsentMap = Record<string, boolean>

/** Open the health consent modal programmatically via custom event */
export function openHealthConsentModal() {
  window.dispatchEvent(new CustomEvent('open-health-consent'))
}

export function HealthConsentModal({ isOpen, onClose, userId, dtBaseUrl }: HealthConsentModalProps) {
  const [consents, setConsents] = useState<ConsentMap>({})
  const [initialConsents, setInitialConsents] = useState<ConsentMap>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const baseUrl = dtBaseUrl || ''

  // Fetch current consent status on mount / open
  useEffect(() => {
    if (!isOpen || !userId) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`${baseUrl}/api/twin/${userId}/consents`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch consents')
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const map: ConsentMap = {}
        if (Array.isArray(data.consents)) {
          for (const c of data.consents) {
            map[c.purpose] = c.granted ?? false
          }
        }
        // Ensure all purposes have a value
        for (const p of CONSENT_PURPOSES) {
          if (!(p.key in map)) map[p.key] = false
        }
        setConsents({ ...map })
        setInitialConsents({ ...map })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        // Default to all false
        const map: ConsentMap = {}
        for (const p of CONSENT_PURPOSES) map[p.key] = false
        setConsents(map)
        setInitialConsents(map)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, userId, baseUrl])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleToggle = useCallback((key: string) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)

    try {
      // Find changed consents
      const changed = CONSENT_PURPOSES.filter((p) => consents[p.key] !== initialConsents[p.key])

      if (changed.length === 0) {
        onClose()
        return
      }

      // Submit each changed consent
      await Promise.all(
        changed.map((p) =>
          fetch(`${baseUrl}/api/twin/${userId}/consents`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              purpose: p.key,
              granted: consents[p.key],
            }),
          }).then((res) => {
            if (!res.ok) throw new Error(`Failed to update consent for ${p.label}`)
          }),
        ),
      )

      setInitialConsents({ ...consents })
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }, [consents, initialConsents, userId, baseUrl, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      style={{ WebkitBackdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
    >
      <div
        role="dialog"
        aria-label="Health data consent"
        aria-modal="true"
        className={cn(
          'w-full max-w-lg rounded-2xl border border-brand-glass-border bg-brand-dark/95 backdrop-blur-md p-6 shadow-2xl',
          prefersReducedMotion ? '' : 'animate-in fade-in zoom-in-95 duration-200',
        )}
        style={{ WebkitBackdropFilter: 'blur(12px)' }}
      >
        <h2 className="text-lg font-semibold text-brand-light mb-1">Health Data Consent</h2>
        <p className="text-xs text-brand-silver mb-5 leading-relaxed">
          Choose which health data processing purposes you consent to. Each can be changed
          independently at any time from your Privacy settings.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {CONSENT_PURPOSES.map((purpose) => (
              <label
                key={purpose.key}
                className="flex items-start gap-3 rounded-xl border border-brand-glass-border bg-brand-glass-bg p-3 cursor-pointer transition-colors hover:bg-brand-glass-bg-hover min-h-[44px]"
              >
                <input
                  type="checkbox"
                  checked={consents[purpose.key] ?? false}
                  onChange={() => handleToggle(purpose.key)}
                  className="mt-0.5 h-5 w-5 min-w-[20px] rounded border-brand-silver/30 text-brand-gold focus:ring-brand-gold/50 accent-[var(--brand-gold,#C9A84C)]"
                />
                <div>
                  <span className="text-sm font-medium text-brand-light">{purpose.label}</span>
                  <p className="text-xs text-brand-silver/70 mt-0.5">{purpose.description}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 mb-3">{error}</p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-lg px-4 py-2 text-sm text-brand-silver transition-colors hover:text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="min-h-[44px] min-w-[44px] rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-gold/90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}
