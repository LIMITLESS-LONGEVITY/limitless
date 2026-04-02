'use client'
import React, { useState } from 'react'
import { CourseSidebar } from '@/components/CourseSidebar'
import { LessonNav } from '@/components/LessonNav'
import { TutorPanel } from '@/components/TutorPanel'
import RichText from '@/components/RichText'
import { MessageCircle } from 'lucide-react'
import { Breadcrumb } from '@/components/Breadcrumb'

type LessonViewerProps = {
  course: any
  lesson: any
  modules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string; slug: string; estimatedDuration?: number | null }> }>
  enrollmentId: string
  lessonProgressId?: string | null
  isCompleted: boolean
  lessonProgress: Record<string, string>
  completionPercentage: number
  prevHref: string | null
  nextHref: string | null
}

const LessonViewerClient: React.FC<LessonViewerProps> = ({
  course, lesson, modules, enrollmentId, lessonProgressId, isCompleted,
  lessonProgress, completionPercentage, prevHref, nextHref,
}) => {
  const [tutorOpen, setTutorOpen] = useState(false)

  return (
    <>
      <div className="flex min-h-screen">
        <CourseSidebar
          courseTitle={course.title}
          courseSlug={course.slug}
          modules={modules}
          currentLessonId={lesson.id}
          lessonProgress={lessonProgress}
          completionPercentage={completionPercentage}
        />

        <main className="flex-1 pt-24 pb-24 px-8 max-w-[48rem] mx-auto">
          <Breadcrumb items={[
            { label: 'Courses', href: '/courses' },
            { label: course.title, href: `/courses/${course.slug}` },
            { label: lesson.title },
          ]} />
          <div className="mb-1 text-xs text-brand-silver uppercase">
            Module {lesson._moduleIndex} &bull; Lesson {lesson._lessonIndex}
          </div>
          <h1 className="text-2xl font-display font-normal tracking-wide mb-2">{lesson.title}</h1>
          <p className="text-sm text-brand-silver mb-6">
            {lesson.estimatedDuration && `${lesson.estimatedDuration} min`}
            {lesson.lessonType && ` \u00b7 ${lesson.lessonType} lesson`}
          </p>

          {/* Video embed */}
          {lesson.videoEmbed?.url && (
            <div className="aspect-video mb-8 rounded-lg overflow-hidden bg-brand-dark-alt">
              <iframe
                src={lesson.videoEmbed.platform === 'youtube'
                  ? `https://www.youtube.com/embed/${lesson.videoEmbed.videoId}`
                  : `https://player.vimeo.com/video/${lesson.videoEmbed.videoId}`}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          )}

          {/* Lesson content */}
          {lesson.content && (
            <RichText data={lesson.content} enableGutter={false} />
          )}

          {/* AI Tutor button */}
          <button
            onClick={() => setTutorOpen(true)}
            className="mt-6 flex items-center gap-2 px-4 py-2 bg-brand-gold/10 text-brand-gold rounded-lg text-sm hover:bg-brand-gold/20 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Ask AI Tutor about this lesson
          </button>

          <LessonNav
            prevHref={prevHref}
            nextHref={nextHref}
            lessonProgressId={lessonProgressId}
            enrollmentId={enrollmentId}
            courseId={course.id}
            lessonId={lesson.id}
            isCompleted={isCompleted}
          />
        </main>
      </div>

      <TutorPanel
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        contextType="lessons"
        contextId={lesson.id}
        contextTitle={lesson.title}
      />
    </>
  )
}

export default LessonViewerClient
