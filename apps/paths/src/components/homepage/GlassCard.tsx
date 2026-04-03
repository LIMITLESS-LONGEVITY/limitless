import { cn } from '@/utilities/ui'
import React from 'react'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className, hover = true }) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-6 md:p-8',
        hover && 'transition-all duration-300 hover:bg-brand-glass-bg-hover hover:border-brand-gold/20',
        className,
      )}
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      {children}
    </div>
  )
}
