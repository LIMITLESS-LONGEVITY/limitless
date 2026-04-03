'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/safe-fetch'

interface Device {
  id: string
  provider: string
  isActive: boolean
  lastSyncAt: string | null
}

function WidgetSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-10 rounded bg-brand-glass-bg animate-pulse" />
      <div className="h-10 rounded bg-brand-glass-bg animate-pulse" />
    </div>
  )
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function WearableConnectWidget({ userId }: { userId: string }) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    fetchJson<{ devices?: Device[] }>(`/api/twin/${userId}/wearable-devices`)
      .then((d) => { if (d?.devices) setDevices(d.devices.filter((dev: Device) => dev.isActive)) })
      .finally(() => setLoading(false))
  }, [userId])

  const handleConnect = async () => {
    setConnecting(true)
    const data = await fetchJson<{ authUrl?: string }>(`/api/twin/${userId}/wearable-devices/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'oura' }),
    })
    if (data?.authUrl) {
      window.location.href = data.authUrl
    } else {
      setConnecting(false)
    }
  }

  return (
    <div
      className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <h3 className="text-sm font-medium text-brand-silver uppercase tracking-wider mb-4">
        Wearables
      </h3>

      {loading ? (
        <WidgetSkeleton />
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <svg className="w-10 h-10 text-brand-silver/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-brand-silver/50 text-sm mb-4">Track sleep, HRV, and recovery</p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium uppercase tracking-[0.1em] border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark transition-all min-h-[44px] ${
              connecting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {connecting ? 'Connecting...' : 'Connect Oura Ring'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between rounded-lg bg-brand-dark-alt/50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-teal-dim flex items-center justify-center">
                  <svg className="w-4 h-4 text-brand-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-light capitalize">{device.provider}</p>
                  <p className="text-xs text-brand-silver/60">
                    Last sync: {timeAgo(device.lastSyncAt)}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-brand-teal">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-teal" />
                Connected
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
