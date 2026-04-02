import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'
import { generateMeta } from '@/utilities/generateMeta'
import { headers as getHeaders } from 'next/headers'
import CourseDetailClient from './page.client'

export const dynamic = 'force-dynamic'
export async function generateStaticParams() { return [] }

type Args = { params: Promise<{ slug?: string }> }

export default async function CourseDetailPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()

  // Authenticate first so the course query has user context for computeLockedStatus
  let user: any = null
  try {
    const auth = await payload.auth({ headers: headersList })
    user = auth.user
  } catch {}

  const result = await payload.find({
    collection: 'courses',
    where: { slug: { equals: decodeURIComponent(slug) } },
    depth: 3, // Populate modules -> lessons
    limit: 1,
    overrideAccess: true,
    user: user || undefined,
  })

  const course = result.docs[0]
  if (!course) return notFound()

  // Check user auth + enrollment
  let enrollState: 'not-logged-in' | 'no-access' | 'can-enroll' | 'enrolled' | 'completed' = 'not-logged-in'
  let completionPercentage: number | undefined
  let nextLessonHref: string | undefined
  let lessonProgress: Record<string, string> = {}
  let enrollmentId: string | undefined

  try {
    if (user) {
      // Check enrollment
      const enrollments = await payload.find({
        collection: 'enrollments',
        where: {
          and: [
            { user: { equals: user.id } },
            { course: { equals: course.id } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })

      if (enrollments.docs[0]) {
        const enrollment = enrollments.docs[0] as any
        enrollState = enrollment.status === 'completed' ? 'completed' : 'enrolled'
        completionPercentage = enrollment.completionPercentage
        enrollmentId = enrollment.id

        // Fetch lesson progress
        const progress = await payload.find({
          collection: 'lesson-progress',
          where: { enrollment: { equals: enrollment.id } },
          limit: 200,
          overrideAccess: true,
        })
        progress.docs.forEach((p: any) => {
          const lessonId = typeof p.lesson === 'string' ? p.lesson : p.lesson?.id
          if (lessonId) lessonProgress[lessonId] = p.status
        })

        // Find next incomplete lesson
        const modules = Array.isArray(course.modules) ? course.modules : []
        for (const mod of modules) {
          if (typeof mod !== 'object') continue
          const lessons = Array.isArray(mod.lessons) ? mod.lessons : []
          for (const lesson of lessons) {
            if (typeof lesson !== 'object') continue
            if (lessonProgress[lesson.id] !== 'completed') {
              nextLessonHref = `/courses/${course.slug}/lessons/${lesson.slug}`
              break
            }
          }
          if (nextLessonHref) break
        }
      } else if (course.locked) {
        enrollState = 'no-access'
      } else {
        enrollState = 'can-enroll'
      }
    }
  } catch {
    // Not authenticated
  }

  return (
    <CourseDetailClient
      course={course}
      enrollState={enrollState}
      completionPercentage={completionPercentage}
      nextLessonHref={nextLessonHref}
      lessonProgress={lessonProgress}
      enrollmentId={enrollmentId}
    />
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'courses',
    where: { slug: { equals: decodeURIComponent(slug) } },
    limit: 1,
    select: { title: true, meta: true, description: true, slug: true },
  })
  return generateMeta({ doc: result.docs[0] })
}
