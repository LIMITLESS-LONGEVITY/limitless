'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface Membership {
  planName: string
  status: 'active' | 'past_due' | 'cancelled' | 'trialing'
  renewalDate?: string
  diagnosticDiscount?: number
  features?: string[]
}

function WidgetSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-28 rounded-full bg-brand-glass-bg animate-pulse" />
      <div className="h-4 w-40 rounded bg-brand-glass-bg animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-brand-glass-bg animate-pulse" />
        <div className="h-3 w-3/4 rounded bg-brand-glass-bg animate-pulse" />
      </div>
    </div>
  )
}

const statusLabels: Record<string, { text: string; className: string }> = {
  active: { text: 'Active', className: 'bg-brand-teal-dim text-brand-teal' },
  trialing: { text: 'Trial', className: 'bg-brand-teal-dim text-brand-teal' },
  past_due: { text: 'Past Due', className: 'bg-red-500/10 text-red-400' },
  cancelled: { text: 'Cancelled', className: 'bg-brand-glass-bg text-brand-silver/60' },
}

export default function MembershipStatusWidget() {
  const [data, setData] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson<{ membership?: Membership }>('/book/api/me/membership')
      .then((d) => { if (d?.membership) setData(d.membership) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <h3 className="text-sm font-medium text-brand-silver uppercase tracking-wider mb-4">
        Membership
      </h3>

      {loading ? (
        <WidgetSkeleton />
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg className="w-10 h-10 text-brand-silver/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
          </svg>
          <p className="text-brand-silver/50 text-sm">No active membership</p>
          <a href="/book/memberships" className="text-brand-teal text-sm mt-2 hover:underline">
            Join a membership
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Plan name + status */}
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-brand-gold">{data.planName}</span>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                statusLabels[data.status]?.className ?? 'bg-brand-glass-bg text-brand-silver/60'
              }`}
            >
              {statusLabels[data.status]?.text ?? data.status}
            </span>
          </div>

          {/* Renewal + discount */}
          <div className="space-y-1">
            {data.renewalDate && (
              <p className="text-xs text-brand-silver/70">
                Renews {new Date(data.renewalDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
            {data.diagnosticDiscount != null && data.diagnosticDiscount > 0 && (
              <p className="text-xs text-brand-teal">
                {data.diagnosticDiscount}% diagnostic discount included
              </p>
            )}
          </div>

          {/* Features */}
          {data.features && data.features.length > 0 && (
            <ul className="space-y-1.5 border-t border-brand-glass-border pt-3">
              {data.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-brand-silver">
                  <svg
                    className="w-3.5 h-3.5 text-brand-teal mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          )}

          {/* Manage link */}
          <a
            href="/book/dashboard/membership"
            className="inline-block text-xs text-brand-gold hover:underline mt-1"
          >
            Manage membership &rarr;
          </a>
        </div>
      )}
    </div>
  )
}
