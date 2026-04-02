'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { cn } from '@/utilities/ui'
import { apiUrl } from '@/utilities/apiUrl'

interface ConsentPurpose {
  key: string
  label: string
  description: string
  warning: string
}

const CONSENT_PURPOSES: ConsentPurpose[] = [
  {
    key: 'wearable_data_sync',
    label: 'Wearable Data Sync',
    description: 'Allow syncing data from connected wearable devices',
    warning: 'Disabling this will stop syncing data from your connected wearable devices.',
  },
  {
    key: 'biomarker_storage',
    label: 'Biomarker Storage',
    description: 'Store biomarker test results',
    warning: 'Disabling this will stop storing new biomarker test results.',
  },
  {
    key: 'ai_health_analysis',
    label: 'AI Health Analysis',
    description: 'Use health data for AI-powered insights',
    warning: 'Disabling this will stop AI-powered health insights and recommendations.',
  },
  {
    key: 'longevity_score',
    label: 'Longevity Score',
    description: 'Calculate your longevity score from health data',
    warning: 'Disabling this will stop calculating and displaying your longevity score.',
  },
  {
    key: 'clinician_access',
    label: 'Clinician Access',
    description: 'Share health data with assigned clinicians',
    warning: 'Disabling this will revoke clinician access to your health data.',
  },
]

type ConsentMap = Record<string, boolean>

export default function PrivacyClient({ userId }: { userId: string }) {
  const [consents, setConsents] = useState<ConsentMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingToggle, setPendingToggle] = useState<string | null>(null)
  const [confirmWithdraw, setConfirmWithdraw] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Fetch consents on mount
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch(apiUrl(`/api/twin/${userId}/consents`), { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load consent preferences')
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
        for (const p of CONSENT_PURPOSES) {
          if (!(p.key in map)) map[p.key] = false
        }
        setConsents(map)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        const map: ConsentMap = {}
        for (const p of CONSENT_PURPOSES) map[p.key] = false
        setConsents(map)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const handleToggle = useCallback(
    (key: string) => {
      const currentValue = consents[key]

      // If turning off, show warning first
      if (currentValue) {
        setConfirmWithdraw(key)
        setPendingToggle(key)
        return
      }

      // If turning on, grant immediately
      submitConsent(key, true)
    },
    [consents],
  )

  const submitConsent = useCallback(
    async (key: string, granted: boolean) => {
      setUpdating(key)
      setError(null)
      setConfirmWithdraw(null)
      setPendingToggle(null)

      try {
        const method = granted ? 'POST' : 'PATCH'
        const res = await fetch(apiUrl(`/api/twin/${userId}/consents`), {
          method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purpose: key, granted }),
        })

        if (!res.ok) throw new Error(`Failed to update consent`)

        setConsents((prev) => ({ ...prev, [key]: granted }))
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setUpdating(null)
      }
    },
    [userId],
  )

  const confirmWithdrawal = useCallback(() => {
    if (!pendingToggle) return
    submitConsent(pendingToggle, false)
  }, [pendingToggle, submitConsent])

  const cancelWithdrawal = useCallback(() => {
    setConfirmWithdraw(null)
    setPendingToggle(null)
  }, [])

  const withdrawPurpose = CONSENT_PURPOSES.find((p) => p.key === confirmWithdraw)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-light mb-1 font-cormorant">
        Privacy &amp; Data
      </h1>
      <p className="text-sm text-brand-silver mb-6">
        Manage how your health data is processed. Changes take effect immediately.
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {CONSENT_PURPOSES.map((purpose) => {
            const isUpdating = updating === purpose.key

            return (
              <div
                key={purpose.key}
                className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-4"
                style={{ WebkitBackdropFilter: 'blur(12px)' }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-brand-light">{purpose.label}</h3>
                    <p className="text-xs text-brand-silver/70 mt-0.5">{purpose.description}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={consents[purpose.key] ?? false}
                    aria-label={`${purpose.label}: ${purpose.description}`}
                    disabled={isUpdating}
                    onClick={() => handleToggle(purpose.key)}
                    className={cn(
                      'relative inline-flex h-6 w-11 min-w-[44px] min-h-[44px] items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/50 p-[10px] flex-shrink-0',
                      consents[purpose.key] ? 'bg-brand-gold' : 'bg-brand-silver/30',
                      isUpdating && 'opacity-50 cursor-wait',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        consents[purpose.key] ? 'translate-x-5' : 'translate-x-0',
                      )}
                    />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Withdrawal confirmation dialog */}
      {confirmWithdraw && withdrawPurpose && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          style={{ WebkitBackdropFilter: 'blur(4px)' }}
        >
          <div
            role="alertdialog"
            aria-label="Confirm consent withdrawal"
            className={cn(
              'w-full max-w-sm rounded-2xl border border-brand-glass-border bg-brand-dark/95 backdrop-blur-md p-6 shadow-2xl',
              prefersReducedMotion ? '' : 'animate-in fade-in zoom-in-95 duration-200',
            )}
            style={{ WebkitBackdropFilter: 'blur(12px)' }}
          >
            <h3 className="text-base font-semibold text-brand-light mb-2">
              Withdraw Consent?
            </h3>
            <p className="text-sm text-brand-silver mb-5 leading-relaxed">
              {withdrawPurpose.warning}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={cancelWithdrawal}
                className="min-h-[44px] min-w-[44px] rounded-lg px-4 py-2 text-sm text-brand-silver transition-colors hover:text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              >
                Keep Enabled
              </button>
              <button
                onClick={confirmWithdrawal}
                className="min-h-[44px] min-w-[44px] rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
