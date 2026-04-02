'use client'
import React, { useEffect, useState, useRef } from 'react'
import { cn } from '@/utilities/ui'

type TOCItem = {
  id: string
  text: string
  level: number
}

export const GuideTableOfContents: React.FC<{
  contentRef: React.RefObject<HTMLElement | null>
}> = ({ contentRef }) => {
  const [items, setItems] = useState<TOCItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Build TOC from headings
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const headings = el.querySelectorAll('h1, h2, h3')
    const tocItems: TOCItem[] = []

    headings.forEach((heading) => {
      if (!heading.id) {
        heading.id = heading.textContent
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || ''
      }
      if (heading.id) {
        tocItems.push({
          id: heading.id,
          text: heading.textContent || '',
          level: parseInt(heading.tagName[1]),
        })
      }
    })

    queueMicrotask(() => setItems(tocItems))
  }, [contentRef])

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    const el = contentRef.current
    if (!el || items.length === 0) return

    observerRef.current?.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )

    items.forEach((item) => {
      const heading = document.getElementById(item.id)
      if (heading) observerRef.current?.observe(heading)
    })

    return () => observerRef.current?.disconnect()
  }, [items, contentRef])

  if (items.length === 0) return null

  return (
    <aside className="hidden xl:block w-[220px] flex-shrink-0">
      <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto py-4 pl-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          On this page
        </p>
        <nav className="space-y-1">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className={cn(
                'block text-xs leading-relaxed transition-colors',
                item.level >= 3 && 'pl-3',
                activeId === item.id
                  ? 'text-brand-gold font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}
