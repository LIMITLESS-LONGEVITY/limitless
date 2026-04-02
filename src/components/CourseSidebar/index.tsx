'use client'
import React from 'react'
import Link from 'next/link'
import { cn } from '@/utilities/ui'
import { CheckCircle2, Circle } from 'lucide-react'
import { MobileSidebar } from '@/components/MobileSidebar'

type Module = {
  id: string
  title: string
  lessons: Array<{
    id: string
    title: string
    slug: string
    estimatedDuration?: number | null
  }>
}

export const CourseSidebar: React.FC<{
  courseTitle: string
  courseSlug: string
  modules: Module[]
  currentLessonId: string
  lessonProgress: Record<string, string>
  completionPercentage: number
}> = ({ courseTitle, courseSlug, modules, currentLessonId, lessonProgress, completionPercentage }) => {
  const sidebarContent = (
    <div>
      <Link
        href={`/courses/${courseSlug}`}
        className="text-sm font-bold hover:text-brand-gold transition-colors block mb-4"
      >
        {courseTitle}
      </Link>

      <div className="space-y-4">
        {modules.map((mod, i) => (
          <div key={mod.id}>
            <p className="text-[11px] font-semibold uppercase text-brand-silver mb-2">
              Module {i + 1}: {mod.title}
            </p>
            <div className="space-y-0.5">
              {mod.lessons.map((lesson) => {
                const status = lessonProgress[lesson.id]
                const isCurrent = lesson.id === currentLessonId
                return (
                  <Link
                    key={lesson.id}
                    href={`/courses/${courseSlug}/lessons/${lesson.slug}`}
                    className={cn(
                      'flex items-center gap-2 py-1.5 px-2 rounded text-xs transition-colors',
                      isCurrent
                        ? 'text-brand-gold font-semibold bg-brand-gold-dim'
                        : status === 'completed'
                          ? 'text-brand-silver'
                          : 'text-foreground hover:bg-brand-glass-bg-hover',
                    )}
                  >
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    ) : isCurrent ? (
                      <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0 text-brand-gold">&#8226;</span>
                    ) : (
                      <Circle className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    <span className="truncate">{lesson.title}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-6 p-3 bg-brand-glass-bg rounded-lg">
        <div className="flex justify-between text-[11px] mb-1">
          <span>Progress</span>
          <span>{completionPercentage}%</span>
        </div>
        <div className="h-1 bg-brand-dark-alt rounded-full">
          <div
            className="h-full bg-brand-gold rounded-full transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="w-[240px] flex-shrink-0 hidden lg:block bg-brand-dark-alt/50 border-r border-brand-glass-border">
        <div className="sticky top-0 h-screen overflow-y-auto p-4">
          {sidebarContent}
        </div>
      </aside>
      <MobileSidebar>
        {sidebarContent}
      </MobileSidebar>
    </>
  )
}
