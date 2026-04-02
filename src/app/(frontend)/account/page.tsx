import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import React from 'react'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) return null

  // Fetch all dashboard data in parallel
  const [enrollments, recentProgress, totalEnrollments, completedLessons] = await Promise.all([
    payload.find({
      collection: 'enrollments',
      where: {
        user: { equals: user.id },
        status: { in: ['active', 'completed'] },
      },
      sort: '-enrolledAt',
      depth: 1,
      limit: 10,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'lesson-progress',
      where: {
        user: { equals: user.id },
        status: { equals: 'completed' },
      },
      sort: '-completedAt',
      depth: 2,
      limit: 5,
      overrideAccess: true,
    }),
    payload.count({
      collection: 'enrollments',
      where: { user: { equals: user.id } },
      overrideAccess: true,
    }),
    payload.count({
      collection: 'lesson-progress',
      where: {
        user: { equals: user.id },
        status: { equals: 'completed' },
      },
      overrideAccess: true,
    }),
  ])

  // Get tier name
  const tierName =
    typeof user.tier === 'object' ? user.tier?.name : 'Free'
  const tierAccess =
    typeof user.tier === 'object' ? user.tier?.accessLevel : 'free'

  // Serialize data for client component
  const activeEnrollments = enrollments.docs
    .filter((e: any) => e.status === 'active')
    .map((e: any) => {
      const course = typeof e.course === 'object' ? e.course : null
      return {
        id: e.id,
        courseTitle: course?.title || 'Untitled Course',
        courseSlug: course?.slug || '',
        courseFeaturedImage: course?.featuredImage || null,
        completionPercentage: e.completionPercentage ?? 0,
        enrolledAt: e.enrolledAt,
      }
    })

  const completedEnrollments = enrollments.docs
    .filter((e: any) => e.status === 'completed')
    .map((e: any) => {
      const course = typeof e.course === 'object' ? e.course : null
      return {
        id: e.id,
        courseTitle: course?.title || 'Untitled Course',
        courseSlug: course?.slug || '',
        completedAt: e.completedAt,
      }
    })

  const recentActivity = recentProgress.docs.map((lp: any) => {
    const lesson = typeof lp.lesson === 'object' ? lp.lesson : null
    const enrollment = typeof lp.enrollment === 'object' ? lp.enrollment : null
    const course =
      enrollment && typeof enrollment.course === 'object' ? enrollment.course : null
    return {
      id: lp.id,
      lessonTitle: lesson?.title || 'Untitled Lesson',
      courseTitle: course?.title || '',
      courseSlug: course?.slug || '',
      completedAt: lp.completedAt,
    }
  })

  return (
    <DashboardClient
      firstName={user.firstName}
      tierName={tierName}
      tierAccess={tierAccess}
      activeEnrollments={activeEnrollments}
      completedEnrollments={completedEnrollments}
      recentActivity={recentActivity}
      stats={{
        coursesEnrolled: totalEnrollments.totalDocs,
        lessonsCompleted: completedLessons.totalDocs,
        coursesCompleted: completedEnrollments.length,
      }}
      showOnboarding={!user.hasCompletedOnboarding}
      userId={user.id}
      hasEnrollments={enrollments.docs.length > 0}
      currentStreak={(user.currentStreak as number) || 0}
      longestStreak={(user.longestStreak as number) || 0}
    />
  )
}
