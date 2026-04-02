'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/utilities/ui'

export const Screenshot: React.FC<{
  src: string
  alt: string
  caption?: string
  className?: string
  priority?: boolean
}> = ({ src, alt, caption, className, priority }) => {
  const imageSrc = src.startsWith('/') ? src : `/guide/screenshots/${src}`
  const [hasError, setHasError] = useState(false)
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <figure className={cn('my-8', className)}>
      <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
        {hasError ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-muted-foreground bg-muted/20">
            <svg
              className="w-12 h-12 mb-3 opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
              />
            </svg>
            <span className="text-sm text-center">{alt}</span>
            {isDev && (
              <span className="mt-2 text-xs font-mono opacity-50">{imageSrc}</span>
            )}
          </div>
        ) : (
          <Image
            src={imageSrc}
            alt={alt}
            width={1200}
            height={675}
            className="w-full h-auto"
            quality={90}
            unoptimized
            priority={priority}
            onError={() => setHasError(true)}
          />
        )}
      </div>
      {caption && (
        <figcaption className="mt-2 text-sm text-muted-foreground text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
