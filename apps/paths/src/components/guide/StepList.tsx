import React from 'react'
import { cn } from '@/utilities/ui'
import { Screenshot } from './Screenshot'

export const StepList: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => {
  return (
    <div className={cn('my-6 space-y-4', className)}>
      {children}
    </div>
  )
}

export const Step: React.FC<{
  number: number
  screenshot?: string
  screenshotAlt?: string
  children: React.ReactNode
}> = ({ number, screenshot, screenshotAlt, children }) => {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
          <span className="text-sm font-semibold text-brand-gold">{number}</span>
        </div>
        <div className="flex-1 pt-1 text-sm text-foreground/80 [&>p]:m-0">
          {children}
        </div>
      </div>
      {screenshot && (
        <div className="ml-12">
          <Screenshot src={screenshot} alt={screenshotAlt || `Step ${number}`} />
        </div>
      )}
    </div>
  )
}
