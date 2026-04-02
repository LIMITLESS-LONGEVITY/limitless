'use client'
import React, { useState, useEffect } from 'react'
import { cn } from '@/utilities/ui'
import { GlassCard } from '@/components/homepage/GlassCard'
import { Sun, CloudSun, Moon, RefreshCw, CheckCircle2, Circle } from 'lucide-react'
import { apiUrl } from '@/utilities/apiUrl'

type Action = {
  id: string
  action: string
  sourceTitle?: string
  completed: boolean
}

type Block = {
  timeOfDay: 'morning' | 'afternoon' | 'evening'
  actions: Action[]
}

type Protocol = {
  id: string
  protocol: { blocks: Block[] }
  completedCount: number
  totalCount: number
}

const BLOCK_CONFIG = {
  morning: { icon: Sun, label: 'Morning', color: 'text-brand-gold' },
  afternoon: { icon: CloudSun, label: 'Afternoon', color: 'text-brand-teal' },
  evening: { icon: Moon, label: 'Evening', color: 'text-purple-400' },
}

export const DailyProtocolWidget: React.FC<{ tierAccess: string }> = ({ tierAccess }) => {
  const [protocol, setProtocol] = useState<Protocol | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  const canRegenerate = tierAccess === 'premium' || tierAccess === 'enterprise'

  useEffect(() => {
    fetchProtocol()
  }, [])

  const fetchProtocol = async (regenerate = false) => {
    try {
      const res = await fetch(apiUrl('/api/ai/daily-protocol'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regenerate ? { regenerate: true } : {}),
      })

      if (res.status === 401 || res.status === 403) {
        setLoading(false)
        return
      }

      if (res.status === 429) {
        setError('Protocol generation limit reached for today.')
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError('Could not load your protocol.')
        setLoading(false)
        return
      }

      const data = await res.json()
      setProtocol(data.protocol)
    } catch {
      setError('Could not load your protocol.')
    } finally {
      setLoading(false)
      setRegenerating(false)
    }
  }

  const toggleAction = async (actionId: string, completed: boolean) => {
    if (!protocol) return

    // Optimistic update
    setProtocol((prev) => {
      if (!prev) return prev
      const updated = JSON.parse(JSON.stringify(prev)) as Protocol
      let count = 0
      for (const block of updated.protocol.blocks) {
        for (const action of block.actions) {
          if (action.id === actionId) action.completed = completed
          if (action.completed) count++
        }
      }
      updated.completedCount = count
      return updated
    })

    try {
      await fetch(apiUrl('/api/ai/daily-protocol-status'), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolId: protocol.id, actionId, completed }),
      })
    } catch {
      // Revert on error
      fetchProtocol()
    }
  }

  const handleRegenerate = () => {
    setRegenerating(true)
    setLoading(true)
    setError(null)
    fetchProtocol(true)
  }

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-silver mb-4">
          Today&apos;s Protocol
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <GlassCard key={i} hover={false} className="p-4 animate-pulse">
              <div className="h-4 bg-brand-glass-bg-hover rounded w-20 mb-3" />
              <div className="space-y-2">
                <div className="h-3 bg-brand-glass-bg-hover rounded w-full" />
                <div className="h-3 bg-brand-glass-bg-hover rounded w-3/4" />
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-silver mb-4">
          Today&apos;s Protocol
        </h2>
        <GlassCard hover={false} className="p-4">
          <p className="text-xs text-brand-silver">{error}</p>
        </GlassCard>
      </div>
    )
  }

  if (!protocol) return null

  const progress = protocol.totalCount > 0
    ? Math.round((protocol.completedCount / protocol.totalCount) * 100)
    : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-silver">
          Today&apos;s Protocol
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-silver">
            {protocol.completedCount}/{protocol.totalCount}
          </span>
          {canRegenerate && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="p-1 text-brand-silver hover:text-brand-gold transition-colors"
              aria-label="Regenerate protocol"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', regenerating && 'animate-spin')} />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-brand-dark-alt rounded-full mb-4">
        <div
          className="h-full bg-brand-gold rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Protocol blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {protocol.protocol.blocks.map((block) => {
          const config = BLOCK_CONFIG[block.timeOfDay] || BLOCK_CONFIG.morning
          const Icon = config.icon
          return (
            <GlassCard key={block.timeOfDay} hover={false} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className={cn('w-4 h-4', config.color)} />
                <span className="text-xs font-semibold uppercase tracking-wider">{config.label}</span>
              </div>
              <div className="space-y-2">
                {block.actions.map((action) => (
                  <label
                    key={action.id}
                    className="flex items-start gap-2 cursor-pointer group"
                  >
                    <button
                      onClick={() => toggleAction(action.id, !action.completed)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {action.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-brand-silver/40 group-hover:text-brand-silver" />
                      )}
                    </button>
                    <span
                      className={cn(
                        'text-xs leading-relaxed',
                        action.completed ? 'text-brand-silver/50 line-through' : 'text-brand-silver',
                      )}
                    >
                      {action.action}
                    </span>
                  </label>
                ))}
              </div>
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
