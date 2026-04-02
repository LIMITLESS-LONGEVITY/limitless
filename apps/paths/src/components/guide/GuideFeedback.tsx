'use client'
import React, { useState, useEffect } from 'react'
import { cn } from '@/utilities/ui'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { usePathname } from 'next/navigation'

export const GuideFeedback: React.FC<{
  className?: string
}> = ({ className }) => {
  const pathname = usePathname()
  const [feedback, setFeedback] = useState<'helpful' | 'not-helpful' | null>(null)

  useEffect(() => {
    queueMicrotask(() => {
      const stored = localStorage.getItem(`guide-feedback:${pathname}`)
      if (stored === 'helpful' || stored === 'not-helpful') {
        setFeedback(stored)
      } else {
        setFeedback(null)
      }
    })
  }, [pathname])

  const handleFeedback = (value: 'helpful' | 'not-helpful') => {
    setFeedback(value)
    localStorage.setItem(`guide-feedback:${pathname}`, value)
  }

  return (
    <div className={cn('flex items-center gap-4 py-4', className)}>
      {feedback ? (
        <p className="text-sm text-muted-foreground">Thanks for your feedback!</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Was this page helpful?</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleFeedback('helpful')}
              className="p-2 rounded-lg border border-border hover:bg-muted/50 hover:border-brand-gold/30 transition-colors"
              aria-label="Yes, this page was helpful"
            >
              <ThumbsUp className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => handleFeedback('not-helpful')}
              className="p-2 rounded-lg border border-border hover:bg-muted/50 hover:border-destructive/30 transition-colors"
              aria-label="No, this page was not helpful"
            >
              <ThumbsDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
