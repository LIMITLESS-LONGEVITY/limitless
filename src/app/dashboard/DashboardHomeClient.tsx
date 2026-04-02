'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import GlassCard from '@/components/dashboard/GlassCard'
import StatusBadge from '@/components/dashboard/StatusBadge'

interface Membership {
  plan: string
  status: string
  renewalDate: string
}

const quickActions = [
  {
    title: 'Appointments',
    description: 'View upcoming consultations and sessions',
    href: '/dashboard/appointments',
    icon: CalendarIcon,
  },
  {
    title: 'Diagnostics',
    description: 'Book or track diagnostic packages',
    href: '/dashboard/diagnostics',
    icon: BeakerIcon,
  },
  {
    title: 'Stays',
    description: 'Browse and manage hotel wellness stays',
    href: '/dashboard/stays',
    icon: BuildingIcon,
  },
  {
    title: 'Telemedicine',
    description: 'Schedule a virtual consultation',
    href: '/dashboard/telemedicine',
    icon: VideoIcon,
  },
  {
    title: 'Health Summary',
    description: 'View your Digital Twin health data',
    href: '/dashboard/health',
    icon: HeartIcon,
  },
]

export default function DashboardHomeClient({
  email,
  tier,
}: {
  email: string
  tier: string
}) {
  const [membership, setMembership] = useState<Membership | null>(null)

  useEffect(() => {
    fetch('/api/me/membership')
      .then((r) => r.json())
      .then((data) => { if (data && data.plan) setMembership(data) })
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-3xl tracking-wide text-brand-gold sm:text-4xl">
          Welcome back
        </h1>
        <p className="mt-2 text-brand-silver">{email}</p>
      </div>

      {/* Membership card */}
      <GlassCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-widest text-brand-silver">
              Membership
            </h2>
            {membership ? (
              <div className="mt-2 flex items-center gap-3">
                <span className="font-display text-xl text-white">
                  {membership.plan}
                </span>
                <StatusBadge status={membership.status} />
              </div>
            ) : (
              <p className="mt-2 text-brand-silver">
                {tier === 'free'
                  ? 'No active membership'
                  : `Tier: ${tier}`}
              </p>
            )}
          </div>
          {membership ? (
            <p className="text-sm text-brand-silver">
              Renews{' '}
              {new Date(membership.renewalDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          ) : (
            <Link
              href="/memberships"
              className="inline-flex items-center rounded-lg border border-brand-gold/30 bg-brand-gold-dim px-4 py-2 text-sm font-medium text-brand-gold transition-colors hover:bg-brand-gold/20"
            >
              Explore Memberships
            </Link>
          )}
        </div>
      </GlassCard>

      {/* Quick actions grid */}
      <div>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-brand-silver">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}>
                <GlassCard className="group cursor-pointer transition-all hover:border-brand-gold/20 hover:bg-brand-glass-bg-hover">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-gold-dim">
                      <Icon className="h-5 w-5 text-brand-gold" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white group-hover:text-brand-gold transition-colors">
                        {action.title}
                      </h3>
                      <p className="mt-1 text-sm text-brand-silver">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Inline SVG icon components ── */

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function BeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M5 14.5l-1.456 6.558a1.125 1.125 0 001.09 1.442h14.732a1.125 1.125 0 001.09-1.442L19 14.5" />
    </svg>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}
