import { cn } from '@/utilities/ui'
import React from 'react'

interface SectionHeaderProps {
  label: string
  heading: string
  description?: string
  className?: string
  align?: 'left' | 'center'
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  heading,
  description,
  className,
  align = 'center',
}) => {
  return (
    <div className={cn(align === 'center' ? 'text-center' : 'text-left', 'mb-12 md:mb-16', className)}>
      <div
        className={cn(
          'flex items-center gap-3 mb-4',
          align === 'center' && 'justify-center',
        )}
      >
        <span className="h-px w-8 bg-brand-gold" />
        <span className="text-brand-gold text-xs font-sans uppercase tracking-[0.2em] font-medium">
          {label}
        </span>
        <span className="h-px w-8 bg-brand-gold" />
      </div>
      <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-light text-brand-light tracking-tight">
        {heading}
      </h2>
      {description && (
        <p className="mt-4 text-brand-silver font-sans text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}
