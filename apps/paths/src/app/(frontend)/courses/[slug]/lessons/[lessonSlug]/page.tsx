import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound, redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import React from 'react'
import LessonViewerClient from './page.client'

export const dynamic = 'force-dynamic'
export async function generateStaticParams() { return [] }

type Args = { params: Promise<{ slug?: string; lessonSlug?: string }> }

export default async function LessonPage({ params: paramsPromise }: Args) {
  const { slug = '', lessonSlug = '' } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  // Auth check
  const headersList = await getHeaders()
  let user: any
  try {
    const auth = await payload.auth({ headers: headersList })
    user = auth.user
  } catch {}
  if (!user) return redirect(`/login?redirect=/courses/${slug}/lessons/${lessonSlug}`)

  // Fetch course with modules and lessons
  const courseResult = await payload.find({
    collection: 'courses',
    where: { slug: { equals: decodeURIComponent(slug) } },
    depth: 3,
    limit: 1,
    overrideAccess: true,
  })
  const course = courseResult.docs[0]
  if (!course) return notFound()

  // Check enrollment
  const enrollments = await payload.find({
    collection: 'enrollments',
    where: {
      and: [
        { user: { equals: user.id } },
        { course: { equals: course.id } },
        { status: { in: ['active', 'completed'] } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })
  if (enrollments.docs.length === 0) return redirect(`/courses/${slug}`)
  const enrollment = enrollments.docs[0] as any

  // Find the lesson
  const modules = Array.isArray(course.modules) ? course.modules.filter((m: any) => typeof m === 'object') : []
  let lesson: any = null
  let prevHref: string | null = null
  let nextHref: string | null = null
  const allLessons: Array<{ lesson: any; mi: number; li: number }> = []

  for (let mi = 0; mi < modules.length; mi++) {
    const mod = modules[mi]
    const lessons = Array.isArray(mod.lessons) ? mod.lessons.filter((l: any) => typeof l === 'object') : []
    for (let li = 0; li < lessons.length; li++) {
      allLessons.push({ lesson: lessons[li], mi: mi + 1, li: li + 1 })
    }
  }

  const currentIndex = allLessons.findIndex((l) => l.lesson.slug === decodeURIComponent(lessonSlug))
  if (currentIndex === -1) return notFound()

  lesson = { ...allLessons[currentIndex].lesson, _moduleIndex: allLessons[currentIndex].mi, _lessonIndex: allLessons[currentIndex].li }
  const base = process.env.NEXT_PUBLIC_BASE_PATH || ''
  if (currentIndex > 0) prevHref = `${base}/courses/${slug}/lessons/${allLessons[currentIndex - 1].lesson.slug}`
  if (currentIndex < allLessons.length - 1) nextHref = `${base}/courses/${slug}/lessons/${allLessons[currentIndex + 1].lesson.slug}`

  // Fetch lesson progress
  const progressResult = await payload.find({
    collection: 'lesson-progress',
    where: { enrollment: { equals: enrollment.id } },
    limit: 200,
    overrideAccess: true,
  })
  const lessonProgress: Record<string, string> = {}
  let lessonProgressId: string | null = null
  progressResult.docs.forEach((p: any) => {
    const lid = typeof p.lesson === 'string' ? p.lesson : p.lesson?.id
    if (lid) lessonProgress[lid] = p.status
    if (lid === lesson.id) lessonProgressId = p.id
  })

  const sidebarModules = modules.map((mod: any) => ({
    id: mod.id,
    title: mod.title,
    lessons: (Array.isArray(mod.lessons) ? mod.lessons : [])
      .filter((l: any) => typeof l === 'object')
      .map((l: any) => ({ id: l.id, title: l.title, slug: l.slug, estimatedDuration: l.estimatedDuration })),
  }))

  return (
    <LessonViewerClient
      course={{ title: course.title, slug: course.slug }}
      lesson={lesson}
      modules={sidebarModules}
      enrollmentId={enrollment.id}
      lessonProgressId={lessonProgressId}
      isCompleted={lessonProgress[lesson.id] === 'completed'}
      lessonProgress={lessonProgress}
      completionPercentage={enrollment.completionPercentage ?? 0}
      prevHref={prevHref}
      nextHref={nextHref}
    />
  )
}
