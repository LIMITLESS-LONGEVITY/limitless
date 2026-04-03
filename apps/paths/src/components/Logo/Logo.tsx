import { cn } from '@/utilities/ui'
import React from 'react'

interface Props {
  className?: string
  iconOnly?: boolean
}

/** Inline SVG icon — twelve paths radiating from the center outward */
const PathsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={cn('w-6 h-6', className)}
    aria-hidden="true"
  >
    <line x1="12" y1="12" x2="12" y2="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="12" x2="17" y2="3.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="12" x2="20.66" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="12" x2="20.66" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="12" x2="17" y2="20.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="12" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="12" x2="7" y2="20.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="12" x2="3.34" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="12" x2="2" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="12" x2="3.34" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="12" x2="7" y2="3.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const Logo = (props: Props) => {
  const { className, iconOnly } = props

  if (iconOnly) {
    return <PathsIcon className={className} />
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 select-none',
        className,
      )}
      aria-label="PATHS by LIMITLESS"
    >
      <PathsIcon />
      <span className="font-display text-xl tracking-[0.25em] font-light">
        PATHS
      </span>
    </span>
  )
}
