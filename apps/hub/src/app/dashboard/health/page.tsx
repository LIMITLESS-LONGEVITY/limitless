import { requireAuth } from '@/lib/auth'
import GlassCard from '@/components/dashboard/GlassCard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Health Summary',
}

interface Biomarker {
  name: string
  value: number
  unit: string
  status: 'normal' | 'elevated' | 'low' | 'critical'
}

interface WearableInsight {
  metric: string
  value: string
  trend?: 'up' | 'down' | 'stable'
}

interface HealthSummary {
  profile?: {
    age?: number
    sex?: string
    conditions?: string[]
  }
  biomarkers?: Biomarker[]
  wearable?: WearableInsight[]
}

const biomarkerStatusStyles: Record<string, string> = {
  normal: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  elevated: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-brand-teal/20 text-brand-teal border-brand-teal/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default async function HealthPage() {
  const session = await requireAuth()

  let healthData: HealthSummary | null = null
  let fetchError = false

  const dtUrl = process.env.DIGITAL_TWIN_API_URL
  if (dtUrl) {
    try {
      const res = await fetch(`${dtUrl}/api/twin/${session.sub}/summary`, {
        headers: { 'X-Service-Key': process.env.HUB_SERVICE_KEY || '' },
        next: { revalidate: 60 },
      })
      if (res.ok) {
        healthData = await res.json()
      }
    } catch {
      fetchError = true
    }
  }

  const hasProfile = healthData?.profile && (healthData.profile.age || healthData.profile.sex)
  const hasBiomarkers = healthData?.biomarkers && healthData.biomarkers.length > 0
  const hasWearable = healthData?.wearable && healthData.wearable.length > 0
  const hasData = hasProfile || hasBiomarkers || hasWearable

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl tracking-wide text-brand-gold sm:text-4xl">
        Health Summary
      </h1>

      {fetchError && (
        <GlassCard className="border-amber-500/20">
          <p className="text-sm text-amber-400">
            Unable to connect to the Digital Twin service. Your health data may be temporarily unavailable.
          </p>
        </GlassCard>
      )}

      {!hasData ? (
        <GlassCard className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-gold-dim">
            <svg className="h-8 w-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <p className="text-brand-silver">No health data yet.</p>
          <p className="mt-2 text-sm text-brand-silver/70">
            Book a diagnostic to get started.
          </p>
          <a
            href="/diagnostics"
            className="mt-4 inline-flex items-center rounded-lg border border-brand-gold/30 bg-brand-gold-dim px-4 py-2 text-sm font-medium text-brand-gold transition-colors hover:bg-brand-gold/20"
          >
            Browse Diagnostics
          </a>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {/* Profile summary */}
          {hasProfile && (
            <GlassCard>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-brand-silver">
                Profile
              </h2>
              <div className="flex flex-wrap gap-6">
                {healthData!.profile!.age && (
                  <div>
                    <p className="text-xs text-brand-silver">Age</p>
                    <p className="text-lg font-medium text-white">{healthData!.profile!.age}</p>
                  </div>
                )}
                {healthData!.profile!.sex && (
                  <div>
                    <p className="text-xs text-brand-silver">Sex</p>
                    <p className="text-lg font-medium text-white capitalize">{healthData!.profile!.sex}</p>
                  </div>
                )}
                {healthData!.profile!.conditions && healthData!.profile!.conditions.length > 0 && (
                  <div>
                    <p className="text-xs text-brand-silver">Conditions</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {healthData!.profile!.conditions.map((c) => (
                        <span
                          key={c}
                          className="inline-flex rounded-full border border-brand-glass-border bg-brand-glass-bg px-2.5 py-0.5 text-xs text-brand-silver"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* Biomarkers grid */}
          {hasBiomarkers && (
            <div>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-brand-silver">
                Latest Biomarkers
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {healthData!.biomarkers!.map((bm) => (
                  <GlassCard key={bm.name} className="p-4">
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-brand-silver">{bm.name}</p>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                          biomarkerStatusStyles[bm.status] ?? biomarkerStatusStyles.normal
                        }`}
                      >
                        {bm.status}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-medium text-white">
                      {bm.value}
                      <span className="ml-1 text-sm text-brand-silver">{bm.unit}</span>
                    </p>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {/* Wearable insights */}
          {hasWearable && (
            <div>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-brand-silver">
                Wearable Insights
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {healthData!.wearable!.map((w) => (
                  <GlassCard key={w.metric} className="p-4">
                    <p className="text-sm text-brand-silver">{w.metric}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-2xl font-medium text-white">{w.value}</p>
                      {w.trend && (
                        <span
                          className={`text-sm ${
                            w.trend === 'up'
                              ? 'text-emerald-400'
                              : w.trend === 'down'
                                ? 'text-red-400'
                                : 'text-brand-silver'
                          }`}
                        >
                          {w.trend === 'up' ? '\u2191' : w.trend === 'down' ? '\u2193' : '\u2194'}
                        </span>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
