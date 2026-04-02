'use client'
import { cn } from '@/utilities/ui'
import { useRouter, useSearchParams } from 'next/navigation'
import { LayoutList, LayoutGrid } from 'lucide-react'
import React from 'react'

export const ViewToggle: React.FC<{
  basePath: string
}> = ({ basePath }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = searchParams.get('view') || 'list'

  const setView = (v: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (v === 'list') {
      params.delete('view')
    } else {
      params.set('view', v)
    }
    const qs = params.toString()
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  return (
    <div className="flex gap-1 rounded-lg border border-brand-glass-border p-0.5">
      <button
        onClick={() => setView('list')}
        className={cn(
          'p-1.5 rounded transition-colors',
          view === 'list'
            ? 'bg-brand-gold/20 text-brand-gold'
            : 'text-brand-silver hover:text-brand-light',
        )}
        aria-label="List view"
      >
        <LayoutList className="w-4 h-4" />
      </button>
      <button
        onClick={() => setView('grid')}
        className={cn(
          'p-1.5 rounded transition-colors',
          view === 'grid'
            ? 'bg-brand-gold/20 text-brand-gold'
            : 'text-brand-silver hover:text-brand-light',
        )}
        aria-label="Grid view"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
    </div>
  )
}
