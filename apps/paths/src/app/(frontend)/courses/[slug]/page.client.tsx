'use client'
import React, { useEffect } from 'react'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { Media } from '@/components/Media'
import { TierBadge } from '@/components/TierBadge'
import { EnrollButton } from '@/components/EnrollButton'
import { LockedContentBanner } from '@/components/LockedContentBanner'
import RichText from '@/components/RichText'
import Link from 'next/link'
import { Clock, BookOpen, CheckCircle2, Circle, Award } from 'lucide-react'
import { ExpertCard } from '@/components/ExpertCard'
import { DiagnosticUpsell } from '@/components/DiagnosticUpsell'
import { ActionPlanCTA } from '@/components/ActionPlanCTA'
import { Breadcrumb } from '@/components/Breadcrumb'

type CourseDetailClientProps = {
  course: any
  enrollState: 'not-logged-in' | 'no-access' | 'can-enroll' | 'enrolled' | 'completed'
  completionPercentage?: number
  nextLessonHref?: string
  lessonProgress?: Record<string, string> // lessonId -> status
  enrollmentId?: string
}

const CourseDetailClient: React.FC<CourseDetailClientProps> = ({
  course,
  enrollState,
  completionPercentage,
  nextLessonHref,
  lessonProgress,
  enrollmentId,
}) => {
  const { setHeaderTheme } = useHeaderTheme()
  useEffect(() => { setHeaderTheme(null) }, [setHeaderTheme])

  const pillarName = typeof course.pillar === 'object' ? course.pillar?.name : ''
  const instructor = typeof course.instructor === 'object' ? course.instructor : null

  const modules = Array.isArray(course.modules)
    ? course.modules.filter((m: any) => typeof m === 'object')
    : []

  return (
    <div className="pt-24 pb-24">
      <div className="container max-w-[48rem]">
        {/* Hero */}
        {course.featuredImage && typeof course.featuredImage !== 'string' && (
          <div className="rounded-lg overflow-hidden mb-8">
            <Media resource={course.featuredImage} />
          </div>
        )}

        <Breadcrumb items={[
          { label: 'Courses', href: '/courses' },
          { label: course.title },
        ]} />
        <div className="flex items-center gap-2 mb-2">
          {pillarName && <span className="text-xs font-semibold uppercase text-brand-gold">{pillarName}</span>}
          <TierBadge tier={course.accessLevel} />
        </div>
        <h1 className="text-3xl font-display font-light tracking-wide mb-3">{course.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-brand-silver mb-6">
          {instructor && (
            <ExpertCard
              firstName={instructor.firstName}
              lastName={instructor.lastName}
              avatar={instructor.avatar}
              credentials={instructor.credentials}
              linkedIn={instructor.linkedIn}
            />
          )}
          {course.estimatedDuration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {Math.floor(course.estimatedDuration / 60)}h {course.estimatedDuration % 60}m
            </span>
          )}
          {modules.length > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {modules.length} modules
            </span>
          )}
        </div>

        {/* Enroll CTA */}
        <div className="mb-8">
          <EnrollButton
            state={enrollState}
            courseId={course.id}
            tierRequired={course.accessLevel}
            completionPercentage={completionPercentage}
            nextLessonHref={nextLessonHref}
          />
        </div>

        {/* Description */}
        {course.locked ? (
          <LockedContentBanner tierRequired={course.accessLevel} />
        ) : course.description ? (
          <div className="prose dark:prose-invert max-w-none mb-8">
            <RichText data={course.description} enableGutter={false} />
          </div>
        ) : null}

        {/* Module Breakdown */}
        {modules.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Course Content</h2>
            {modules.map((mod: any, i: number) => {
              const lessons = Array.isArray(mod.lessons)
                ? mod.lessons.filter((l: any) => typeof l === 'object')
                : []
              return (
                <div key={mod.id} className="border border-brand-glass-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-3">
                    Module {i + 1}: {mod.title}
                  </h3>
                  <div className="space-y-2">
                    {lessons.map((lesson: any) => {
                      const status = lessonProgress?.[lesson.id]
                      const isEnrolled = enrollState === 'enrolled' || enrollState === 'completed'
                      return (
                        <div key={lesson.id} className="flex items-center gap-2 text-sm">
                          {status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-brand-silver flex-shrink-0" />
                          )}
                          {isEnrolled ? (
                            <Link
                              href={`/courses/${course.slug}/lessons/${lesson.slug}`}
                              className="hover:text-brand-gold transition-colors"
                            >
                              {lesson.title}
                            </Link>
                          ) : (
                            <span className="text-brand-silver">{lesson.title}</span>
                          )}
                          {lesson.estimatedDuration && (
                            <span className="text-xs text-brand-silver ml-auto">
                              {lesson.estimatedDuration}m
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Certificate + action plan + diagnostic upsell for completed courses */}
        {enrollState === 'completed' && (
          <div className="mt-8 flex items-center gap-3 px-4 py-3 rounded-xl border border-brand-gold/20 bg-brand-gold-dim">
            <Award className="w-5 h-5 text-brand-gold flex-shrink-0" />
            <p className="text-sm flex-1">
              <span className="font-semibold text-brand-light">Congratulations!</span>{' '}
              <span className="text-brand-silver">Your certificate has been issued.</span>
            </p>
            <Link
              href="/account/certificates"
              className="text-xs text-brand-gold hover:text-brand-gold/80 transition-colors whitespace-nowrap"
            >
              View Certificates
            </Link>
          </div>
        )}
        {enrollState === 'completed' && enrollmentId && (
          <div className="mt-12">
            <ActionPlanCTA enrollmentId={enrollmentId} courseTitle={course.title} pillarName={pillarName} />
          </div>
        )}
        {enrollState === 'completed' && (
          <div className="mt-8">
            <DiagnosticUpsell context="course-completion" pillarName={pillarName} />
          </div>
        )}
      </div>
    </div>
  )
}

export default CourseDetailClient
