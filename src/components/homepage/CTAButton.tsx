import { cn } from '@/utilities/ui'
import Link from 'next/link'
import React from 'react'

interface CTAButtonProps {
  href: string
  children: React.ReactNode
  variant?: 'gold' | 'ghost'
  className?: string
  size?: 'default' | 'lg'
}

export const CTAButton: React.FC<CTAButtonProps> = ({
  href,
  children,
  variant = 'gold',
  className,
  size = 'default',
}) => {
  const base =
    'inline-flex items-center justify-center font-sans text-sm uppercase tracking-[0.15em] font-medium rounded-full transition-all duration-300 min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none'
  const sizeClasses = size === 'lg' ? 'px-8 py-4 text-sm' : 'px-6 py-3 text-xs'
  const variants = {
    gold: 'border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark',
    ghost:
      'border border-brand-glass-border text-brand-silver hover:border-brand-silver hover:text-brand-light',
  }

  return (
    <Link href={href} className={cn(base, sizeClasses, variants[variant], className)}>
      {children}
    </Link>
  )
}
