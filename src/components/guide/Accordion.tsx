'use client'
import React from 'react'
import { cn } from '@/utilities/ui'
import { ChevronRight } from 'lucide-react'

export const Accordion: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => {
  return <div className={cn('my-6 space-y-2', className)}>{children}</div>
}

export const AccordionItem: React.FC<{
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}> = ({ title, defaultOpen = false, children, className }) => {
  return (
    <details
      open={defaultOpen}
      className={cn(
        'group rounded-lg border border-border overflow-hidden',
        className,
      )}
    >
      <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none text-sm font-medium text-foreground hover:bg-muted/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
        <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90 flex-shrink-0" />
        {title}
      </summary>
      <div className="px-4 pb-4 text-sm text-foreground/80">
        {children}
      </div>
    </details>
  )
}
