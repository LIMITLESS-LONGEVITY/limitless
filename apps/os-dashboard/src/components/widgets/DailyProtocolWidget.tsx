'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface ProtocolItem {
  id: string
  label: string
  completed: boolean
  time?: string
}

function WidgetSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-8 rounded bg-brand-glass-bg animate-pulse" />
      ))}
    </div>
  )
}

export default function DailyProtocolWidget() {
  const [items, setItems] = useState<ProtocolItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson<{ items?: ProtocolItem[] }>('/learn/api/me/protocol')
      .then((d) => { if (d?.items) setItems(d.items) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <h3 className="text-sm font-medium text-brand-silver uppercase tracking-wider mb-4">
        Daily Protocol
      </h3>

      {loading ? (
        <WidgetSkeleton />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg className="w-10 h-10 text-brand-silver/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-brand-silver/50 text-sm">Generate a protocol with AI Tutor</p>
          <a href="/learn/discover" className="text-brand-teal text-sm mt-2 hover:underline">
            Get Started
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-brand-glass-bg-hover transition-colors"
            >
              <input
                type="checkbox"
                checked={item.completed}
                readOnly
                className="w-4 h-4 rounded border-brand-glass-border accent-brand-teal"
              />
              <span
                className={`text-sm flex-1 ${
                  item.completed ? 'text-brand-silver/40 line-through' : 'text-brand-light'
                }`}
              >
                {item.label}
              </span>
              {item.time && (
                <span className="text-xs text-brand-silver/50">{item.time}</span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
