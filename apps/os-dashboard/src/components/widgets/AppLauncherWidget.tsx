'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface AppCard {
  name: string
  description: string
  href: string
  icon: React.ReactNode
  status: string
  loading: boolean
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 rounded bg-brand-glass-bg animate-pulse" />
        <div className="h-5 w-16 rounded-full bg-brand-glass-bg animate-pulse" />
      </div>
      <div className="h-4 w-20 rounded bg-brand-glass-bg animate-pulse" />
      <div className="h-3 w-32 rounded bg-brand-glass-bg animate-pulse" />
    </div>
  )
}

export default function AppLauncherWidget({ userId }: { userId: string }) {
  const [learnCount, setLearnCount] = useState<number | null>(null)
  const [bookCount, setBookCount] = useState<number | null>(null)
  const [healthLabel, setHealthLabel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let done = 0
    const check = () => { if (++done >= 3) setLoading(false) }

    fetchJson<{ enrollments?: { progress: number }[] }>('/learn/api/me/enrollments')
      .then((d) => {
        if (d?.enrollments) {
          const active = d.enrollments.filter((e) => e.progress < 1).length
          setLearnCount(active)
        }
      })
      .finally(check)

    fetchJson<{ appointments?: { date: string }[] }>('/book/api/me/appointments')
      .then((d) => {
        if (d?.appointments) {
          const upcoming = d.appointments.filter(
            (a) => new Date(a.date) > new Date(),
          ).length
          setBookCount(upcoming)
        }
      })
      .finally(check)

    fetchJson<{ lastUpdated?: string }>(`/api/twin/${userId}/summary`)
      .then((d) => {
        if (d?.lastUpdated) {
          const days = Math.floor(
            (Date.now() - new Date(d.lastUpdated).getTime()) / 86400000,
          )
          setHealthLabel(days === 0 ? 'Updated today' : `Last: ${days}d ago`)
        } else {
          setHealthLabel('No data')
        }
      })
      .finally(check)
  }, [userId])

  const apps: AppCard[] = [
    {
      name: 'Learn',
      description: 'Courses & education',
      href: '/learn',
      loading,
      status: learnCount !== null ? `${learnCount} active` : '',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
        </svg>
      ),
    },
    {
      name: 'Book',
      description: 'Appointments & consultations',
      href: '/book',
      loading,
      status: bookCount !== null ? `${bookCount} upcoming` : '',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      ),
    },
    {
      name: 'Health',
      description: 'Digital twin & biomarkers',
      href: '/health',
      loading,
      status: healthLabel ?? '',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      ),
    },
    {
      name: 'Train',
      description: 'Personalised protocols',
      href: '/train',
      loading: false,
      status: 'Coming soon',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {apps.map((app) =>
        app.loading ? (
          <CardSkeleton key={app.name} />
        ) : (
          <a
            key={app.name}
            href={app.href}
            className="group rounded-xl border border-brand-glass-border bg-brand-glass-bg p-5 backdrop-blur-md transition-colors hover:bg-brand-glass-bg-hover hover:border-brand-gold/20"
            style={{ WebkitBackdropFilter: 'blur(12px)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-brand-gold">{app.icon}</div>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  app.status === 'Coming soon'
                    ? 'bg-brand-glass-bg text-brand-silver/60'
                    : 'bg-brand-teal-dim text-brand-teal'
                }`}
              >
                {app.status}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-brand-light group-hover:text-brand-gold transition-colors">
              {app.name}
            </h3>
            <p className="text-xs text-brand-silver/60 mt-0.5">{app.description}</p>
          </a>
        ),
      )}
    </div>
  )
}
