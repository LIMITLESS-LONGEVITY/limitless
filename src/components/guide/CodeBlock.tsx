'use client'
import React, { useRef, useState, useEffect } from 'react'
import { cn } from '@/utilities/ui'
import { CopyButton } from './CopyButton'

export const CodeBlock: React.FC<React.HTMLAttributes<HTMLPreElement>> = ({
  children,
  className,
  ...props
}) => {
  const preRef = useRef<HTMLPreElement>(null)
  const [textContent, setTextContent] = useState('')

  useEffect(() => {
    const el = preRef.current
    if (el) {
      queueMicrotask(() => setTextContent(el.textContent || ''))
    }
  }, [children])

  return (
    <div className="relative group my-4">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={textContent} />
      </div>
      <pre
        ref={preRef}
        className={cn('p-4 rounded-lg bg-muted overflow-x-auto text-sm', className)}
        {...props}
      >
        {children}
      </pre>
    </div>
  )
}
