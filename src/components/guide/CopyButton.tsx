'use client'
import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import { Copy, Check } from 'lucide-react'

export const CopyButton: React.FC<{
  text: string
  className?: string
}> = ({ text, className }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'p-1.5 rounded transition-colors',
        copied
          ? 'text-green-500'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
        className,
      )}
      aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}
