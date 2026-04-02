'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface ActivityEvent {
  id: string
  timestamp: string
  source: 'paths' | 'hub' | 'wearable' | string
  eventType: string
  metadata?: Record<string, string>
}

function WidgetSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-brand-glass-bg animate-pulse" />
      ))}
    </div>
  )
}

const sourceIcons: Record<string, React.ReactNode> = {
  paths: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  hub: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  ),
  wearable: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
}

function formatEventType(type: string): string {
  return type
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function ActivityFeedWidget({ userId }: { userId: string }) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson<{ events?: ActivityEvent[] }>(`/api/twin/${userId}/activity?limit=10`)
      .then((d) => { if (d?.events) setEvents(d.events) })
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div
      className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <h3 className="text-sm font-medium text-brand-silver uppercase tracking-wider mb-4">
        Activity Feed
      </h3>

      {loading ? (
        <WidgetSkeleton />
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg className="w-10 h-10 text-brand-silver/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-brand-silver/50 text-sm">Your activity will appear here as you use the platform</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-brand-glass-bg-hover transition-colors"
            >
              <div className="text-brand-silver/60 flex-shrink-0">
                {sourceIcons[event.source] ?? sourceIcons.paths}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-brand-light truncate">
                  {formatEventType(event.eventType)}
                </p>
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <p className="text-xs text-brand-silver/50 truncate">
                    {Object.values(event.metadata).join(' · ')}
                  </p>
                )}
              </div>
              <time className="text-xs text-brand-silver/50 whitespace-nowrap flex-shrink-0">
                {timeAgo(event.timestamp)}
              </time>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
