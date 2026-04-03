import { cn } from '@/utilities/ui'
import React from 'react'

export const SkeletonLine: React.FC<{
  className?: string
  width?: string
}> = ({ className, width = 'w-full' }) => (
  <div className={cn('h-3 rounded bg-brand-glass-bg-hover animate-pulse', width, className)} />
)

export const SkeletonBlock: React.FC<{
  className?: string
  lines?: number
}> = ({ className, lines = 3 }) => (
  <div className={cn('space-y-2.5', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonLine key={i} width={i === lines - 1 ? 'w-2/3' : 'w-full'} />
    ))}
  </div>
)

export const SkeletonInput: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-1.5', className)}>
    <div className="h-3 w-20 rounded bg-brand-glass-bg-hover animate-pulse" />
    <div className="h-10 rounded-lg bg-brand-glass-bg-hover animate-pulse" />
  </div>
)

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'rounded-2xl border border-brand-glass-border bg-brand-glass-bg p-4 animate-pulse',
      className,
    )}
  >
    <div className="h-32 rounded-lg bg-brand-glass-bg-hover mb-4" />
    <div className="h-3 rounded bg-brand-glass-bg-hover w-1/3 mb-2" />
    <div className="h-4 rounded bg-brand-glass-bg-hover w-3/4 mb-2" />
    <div className="h-3 rounded bg-brand-glass-bg-hover w-1/2" />
  </div>
)

export const SkeletonListItem: React.FC = () => (
  <div className="flex gap-4 p-4 rounded-lg border border-brand-glass-border animate-pulse">
    <div className="hidden sm:block w-[140px] h-[90px] rounded-lg bg-brand-glass-bg-hover flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-2.5 rounded bg-brand-glass-bg-hover w-24" />
      <div className="h-3.5 rounded bg-brand-glass-bg-hover w-3/4" />
      <div className="h-2.5 rounded bg-brand-glass-bg-hover w-full" />
      <div className="h-2.5 rounded bg-brand-glass-bg-hover w-1/2" />
    </div>
  </div>
)

export const SkeletonProfileForm: React.FC = () => (
  <div className="max-w-lg space-y-8 animate-pulse">
    <div>
      <div className="h-5 rounded bg-brand-glass-bg-hover w-16 mb-4" />
      <div className="space-y-4">
        <SkeletonInput />
        <SkeletonInput />
        <SkeletonInput />
        <div className="h-10 rounded-lg bg-brand-glass-bg-hover w-32" />
      </div>
    </div>
  </div>
)
