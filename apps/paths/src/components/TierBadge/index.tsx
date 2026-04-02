import { cn } from '@/utilities/ui'
import React from 'react'

const TIER_STYLES: Record<string, string> = {
  free: 'text-emerald-500 bg-emerald-500/10',
  regular: 'text-brand-silver bg-brand-glass-bg',
  premium: 'text-purple-400 bg-purple-500/10',
  enterprise: 'text-purple-400 bg-purple-500/15',
}

export const TierBadge: React.FC<{
  tier: string
  className?: string
}> = ({ tier, className }) => {
  return (
    <span
      className={cn(
        'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded',
        TIER_STYLES[tier] ?? TIER_STYLES.regular,
        className,
      )}
    >
      {tier}
    </span>
  )
}
