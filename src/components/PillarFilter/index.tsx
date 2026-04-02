'use client'
import { cn } from '@/utilities/ui'
import { useRouter, useSearchParams } from 'next/navigation'
import React from 'react'

type Pillar = {
  id: string
  name: string
  slug: string
}

export const PillarFilter: React.FC<{
  pillars: Pillar[]
  basePath: string
  counts?: Record<string, number>
  totalCount?: number
}> = ({ pillars, basePath, counts, totalCount }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activePillar = searchParams.get('pillar')

  const handleClick = (slug: string | null) => {
    if (slug) {
      router.push(`${basePath}?pillar=${slug}`)
    } else {
      router.push(basePath)
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => handleClick(null)}
        className={cn(
          'px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors',
          !activePillar
            ? 'bg-brand-gold/20 text-brand-gold'
            : 'bg-brand-glass-bg text-brand-silver hover:bg-brand-glass-bg-hover',
        )}
      >
        All{totalCount != null && <span className="ml-1 opacity-60">({totalCount})</span>}
      </button>
      {pillars.map((pillar) => (
        <button
          key={pillar.id}
          onClick={() => handleClick(pillar.slug)}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors',
            activePillar === pillar.slug
              ? 'bg-brand-gold/20 text-brand-gold'
              : 'bg-brand-glass-bg text-brand-silver hover:bg-brand-glass-bg-hover',
          )}
        >
          {pillar.name}{counts?.[pillar.id] != null && <span className="ml-1 opacity-60">({counts[pillar.id]})</span>}
        </button>
      ))}
    </div>
  )
}
