'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

/* ── Plan metadata ── */

interface PlanInfo {
  name: string
  key: string
  price: string
  period: string
  features: string[]
}

const PLANS: PlanInfo[] = [
  {
    name: 'E-Clinic',
    key: 'ECLINIC',
    price: '99',
    period: '/mo',
    features: [
      'Unlimited telemedicine consultations',
      'AI-powered coaching dashboard',
      'Wearable data integration',
      'Monthly health report',
    ],
  },
  {
    name: 'Optimus',
    key: 'OPTIMUS',
    price: '180',
    period: '/mo',
    features: [
      '1 coach session per month',
      'Basic diagnostic panel annually',
      'Access to educational content',
      'Quarterly health review',
    ],
  },
  {
    name: 'Immortalitas',
    key: 'IMMORTALITAS',
    price: '220',
    period: '/mo',
    features: [
      '2 coach sessions per month',
      '10% discount on diagnostics',
      'Comprehensive annual panel',
      'Priority support',
    ],
  },
  {
    name: 'Transcendentia',
    key: 'TRANSCENDENTIA',
    price: '280',
    period: '/mo',
    features: [
      '4 coach sessions per month',
      '15% discount on diagnostics',
      'Full diagnostic suite annually',
      'Dedicated account manager',
    ],
  },
  {
    name: 'VIP',
    key: 'VIP',
    price: 'Custom',
    period: '',
    features: [
      'Unlimited coach sessions',
      'Dedicated medical team',
      'Diagnostics on demand',
      '24/7 concierge line',
    ],
  },
]

/* ── Types ── */

interface Membership {
  id: string
  plan: string
  status: string
  renewalDate: string
  diagnosticDiscount: number
  coachSessionsRemaining: number
  cancelledAt: string | null
}

/* ── Status badge ── */

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    PAUSED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
    PAST_DUE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  }
  return (
    <span className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-medium tracking-wide ${colors[status] ?? 'bg-brand-glass-bg text-brand-silver border-brand-glass-border'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

/* ── Main client component ── */

export function MembershipClient() {
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMembership = useCallback(async () => {
    try {
      const res = await fetch('/api/me/membership')
      if (!res.ok) throw new Error('Failed to load membership')
      const data = await res.json()
      setMembership(data)
    } catch {
      setError('Unable to load membership data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembership()
  }, [fetchMembership])

  /* ── Actions ── */

  async function handleSubscribe(planKey: string) {
    setActionLoading(planKey)
    setError(null)
    try {
      const res = await fetch('/api/membership/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Subscribe failed')
      if (data.url) window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscribe failed')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleChange(planKey: string) {
    setActionLoading(planKey)
    setError(null)
    try {
      const res = await fetch('/api/membership/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Plan change failed')
      await fetchMembership()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Plan change failed')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCancel() {
    setActionLoading('cancel')
    setError(null)
    try {
      const res = await fetch('/api/membership/cancel', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Cancel failed')
      setShowCancelConfirm(false)
      await fetchMembership()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setActionLoading(null)
    }
  }

  /* ── Loading state ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" />
      </div>
    )
  }

  const currentPlan = membership ? PLANS.find((p) => p.key === membership.plan) : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-brand-gold sm:text-4xl">Membership</h1>
        <p className="mt-2 text-brand-silver">
          {membership ? 'Manage your plan and billing.' : 'Choose a plan to get started.'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Current plan card */}
      {membership && currentPlan && (
        <div
          className="rounded-xl border border-brand-gold/30 bg-brand-gold-dim p-6 backdrop-blur-sm sm:p-8"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-brand-silver">Current Plan</p>
              <h2 className="mt-1 font-display text-2xl text-brand-light">{currentPlan.name}</h2>
            </div>
            <StatusBadge status={membership.status} />
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-brand-silver">Price</p>
              <p className="mt-1 font-display text-xl text-brand-gold">
                {currentPlan.price !== 'Custom' ? `\u20AC${currentPlan.price}${currentPlan.period}` : 'Custom'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-brand-silver">Renewal Date</p>
              <p className="mt-1 text-brand-light">
                {new Date(membership.renewalDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-brand-silver">Diagnostic Discount</p>
              <p className="mt-1 text-brand-light">
                {membership.diagnosticDiscount > 0
                  ? `${Math.round(membership.diagnosticDiscount * 100)}%`
                  : 'None'}
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-6 border-t border-brand-glass-border pt-6">
            <p className="mb-3 text-xs uppercase tracking-widest text-brand-silver">Included</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {currentPlan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-brand-silver">
                  <span className="text-brand-teal">&#10003;</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Cancel button */}
          {membership.status === 'ACTIVE' && (
            <div className="mt-6 border-t border-brand-glass-border pt-6">
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-sm text-red-400 transition-colors hover:text-red-300"
                >
                  Cancel subscription
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-sm text-red-400">
                    Your plan will remain active until the end of the billing period. Are you sure?
                  </p>
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading === 'cancel'}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {actionLoading === 'cancel' ? 'Cancelling...' : 'Yes, cancel'}
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="text-sm text-brand-silver transition-colors hover:text-brand-light"
                  >
                    Keep plan
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Available plans */}
      <div>
        <h2 className="font-display text-xl text-brand-light">
          {membership ? 'Change Plan' : 'Choose a Plan'}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = membership?.plan === plan.key
            const isVip = plan.key === 'VIP'
            return (
              <div
                key={plan.key}
                className={`flex flex-col rounded-xl border p-6 backdrop-blur-sm transition-all ${
                  isCurrent
                    ? 'border-brand-gold/40 bg-brand-gold-dim'
                    : 'border-brand-glass-border bg-brand-glass-bg hover:border-brand-gold/20 hover:bg-brand-glass-bg-hover'
                }`}
                style={{ WebkitBackdropFilter: 'blur(12px)' }}
              >
                {isCurrent && (
                  <span className="mb-3 inline-flex w-fit rounded-full bg-brand-gold px-3 py-0.5 text-xs font-semibold tracking-wide text-brand-dark">
                    Current Plan
                  </span>
                )}
                <h3 className="font-display text-xl text-brand-light">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  {plan.price !== 'Custom' && (
                    <span className="text-sm text-brand-silver">&euro;</span>
                  )}
                  <span className="font-display text-2xl text-brand-gold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-brand-silver">{plan.period}</span>
                  )}
                </div>

                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-brand-silver">
                      <span className="mt-0.5 text-brand-teal">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="mt-6 rounded-lg border border-brand-gold/20 py-2.5 text-center text-sm text-brand-gold">
                    Active
                  </div>
                ) : isVip ? (
                  <Link
                    href="/contact-sales"
                    className="mt-6 block rounded-lg border border-brand-gold/30 py-2.5 text-center text-sm font-semibold tracking-wide text-brand-gold transition-colors hover:bg-brand-gold/10"
                  >
                    Contact Sales
                  </Link>
                ) : (
                  <button
                    onClick={() =>
                      membership ? handleChange(plan.key) : handleSubscribe(plan.key)
                    }
                    disabled={actionLoading === plan.key}
                    className="mt-6 rounded-lg bg-brand-gold py-2.5 text-center text-sm font-semibold tracking-wide text-brand-dark transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {actionLoading === plan.key
                      ? 'Processing...'
                      : membership
                        ? 'Switch to this plan'
                        : 'Subscribe'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
