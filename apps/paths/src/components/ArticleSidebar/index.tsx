'use client'
import React, { useEffect, useState } from 'react'
import { cn } from '@/utilities/ui'
import { MessageCircle } from 'lucide-react'
import { MobileSidebar } from '@/components/MobileSidebar'

type TOCItem = {
  id: string
  text: string
  level: number
}

export const ArticleSidebar: React.FC<{
  contentRef: React.RefObject<HTMLDivElement | null>
  onOpenTutor: () => void
  relatedCourses?: Array<{ id: string; title: string; slug: string }>
  pillarArticles?: Array<{ id: string; title: string; slug: string }>
}> = ({ contentRef, onOpenTutor, relatedCourses, pillarArticles }) => {
  const [toc, setToc] = useState<TOCItem[]>([])
  const [activeId, setActiveId] = useState<string>('')

  // Build TOC from rendered headings
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const headings = el.querySelectorAll('h2, h3')
    const items: TOCItem[] = []
    headings.forEach((heading, i) => {
      if (!heading.id) heading.id = `heading-${i}`
      items.push({
        id: heading.id,
        text: heading.textContent || '',
        level: heading.tagName === 'H2' ? 2 : 3,
      })
    })
    queueMicrotask(() => setToc(items))
  }, [contentRef])

  // Scrollspy
  useEffect(() => {
    if (toc.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        })
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )
    toc.forEach((item) => {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [toc])

  const sidebarContent = (
    <div className="space-y-6">
      {/* Table of Contents */}
      {toc.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-brand-silver mb-3">
            On this page
          </p>
          <nav className="space-y-1">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  'block text-xs leading-relaxed transition-colors',
                  item.level === 3 && 'pl-3',
                  activeId === item.id
                    ? 'text-brand-gold font-medium'
                    : 'text-brand-silver hover:text-foreground',
                )}
              >
                {item.text}
              </a>
            ))}
          </nav>
        </div>
      )}

      {/* AI Tutor */}
      <div className="p-3 bg-brand-gold-dim border border-brand-gold/20 rounded-lg">
        <p className="text-xs font-semibold mb-1">AI Tutor</p>
        <p className="text-[11px] text-brand-silver mb-2">
          Ask questions about this article
        </p>
        <button
          onClick={onOpenTutor}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold/20 text-brand-gold rounded text-xs font-medium hover:bg-brand-gold/30 transition-colors"
        >
          <MessageCircle className="w-3 h-3" />
          Open Tutor
        </button>
      </div>

      {/* Related Courses */}
      {relatedCourses && relatedCourses.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2">Related Courses</p>
          <div className="space-y-1">
            {relatedCourses.map((course) => (
              <a
                key={course.id}
                href={`/courses/${course.slug}`}
                className="block text-xs text-brand-silver hover:text-foreground transition-colors"
              >
                {course.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* More from this pillar */}
      {pillarArticles && pillarArticles.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2">More in this topic</p>
          <div className="space-y-1">
            {pillarArticles.map((article) => (
              <a
                key={article.id}
                href={`/articles/${article.slug}`}
                className="block text-xs text-brand-silver hover:text-foreground transition-colors"
              >
                {article.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <aside className="w-[240px] flex-shrink-0 hidden lg:block">
        <div className="sticky top-24">
          {sidebarContent}
        </div>
      </aside>
      <MobileSidebar>
        {sidebarContent}
      </MobileSidebar>
    </>
  )
}
