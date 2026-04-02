'use client'
import React, { useRef } from 'react'
import { GuideTableOfContents } from '@/components/guide/GuideTableOfContents'

export const TopicContent: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <div ref={contentRef}>
          {children}
        </div>
      </div>
      <GuideTableOfContents contentRef={contentRef} />
    </div>
  )
}
