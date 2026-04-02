import type { Metadata } from 'next/types'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { ContentList } from '@/components/ContentList'
import { ContentGrid } from '@/components/ContentGrid'
import { PillarFilter } from '@/components/PillarFilter'
import { ViewToggle } from '@/components/ViewToggle'
import { Pagination } from '@/components/Pagination'
import { PageRange } from '@/components/PageRange'
import PageClient from './page.client'

export const dynamic = 'force-dynamic'

type Args = {
  searchParams: Promise<{ pillar?: string; page?: string; view?: string }>
}

export default async function CoursesPage({ searchParams }: Args) {
  const { pillar, page: pageParam, view } = await searchParams
  const currentPage = Number(pageParam) || 1
  const payload = await getPayload({ config: configPromise })

  const pillarsResult = await payload.find({
    collection: 'content-pillars',
    where: { isActive: { equals: true } },
    sort: 'displayOrder',
    limit: 20,
  })

  const where: any = { editorialStatus: { equals: 'published' } }
  if (pillar) {
    const pillarDoc = await payload.find({
      collection: 'content-pillars',
      where: { slug: { equals: pillar } },
      limit: 1,
    })
    if (pillarDoc.docs[0]) {
      where.pillar = { equals: pillarDoc.docs[0].id }
    }
  }

  const courses = await payload.find({
    collection: 'courses',
    where,
    sort: '-publishedAt',
    limit: 12,
    page: currentPage,
    depth: 2,
  })

  const items = courses.docs.map((course: any) => {
    const moduleCount = Array.isArray(course.modules) ? course.modules.length : 0
    const duration = course.estimatedDuration
      ? `${Math.floor(course.estimatedDuration / 60)}h ${course.estimatedDuration % 60}m`
      : undefined

    return {
      slug: course.slug,
      title: course.title,
      excerpt: typeof course.description === 'string' ? course.description : undefined,
      accessLevel: course.accessLevel,
      pillarName: typeof course.pillar === 'object' ? course.pillar?.name : undefined,
      authorName: typeof course.instructor === 'object'
        ? [course.instructor?.firstName, course.instructor?.lastName].filter(Boolean).join(' ')
        : undefined,
      featuredImage: course.featuredImage,
      meta: [duration, moduleCount > 0 ? `${moduleCount} modules` : null].filter(Boolean).join(' · '),
      href: `/courses/${course.slug}`,
    }
  })

  const pillars = pillarsResult.docs.map((p: any) => ({
    id: p.id, name: p.name, slug: p.slug,
  }))

  const countResults = await Promise.all(
    pillarsResult.docs.map(async (p: any) => ({
      id: p.id,
      count: (await payload.count({
        collection: 'courses',
        where: { pillar: { equals: p.id }, editorialStatus: { equals: 'published' } },
      })).totalDocs,
    })),
  )
  const pillarCounts: Record<string, number> = {}
  countResults.forEach((r) => { pillarCounts[r.id] = r.count })
  const totalCourses = (await payload.count({
    collection: 'courses',
    where: { editorialStatus: { equals: 'published' } },
  })).totalDocs

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-8">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Courses</h1>
          <p className="text-brand-silver">Structured learning paths for longevity mastery</p>
        </div>
      </div>

      <div className="container mb-6 flex items-center justify-between gap-4 flex-wrap">
        <PillarFilter pillars={pillars} basePath="/courses" counts={pillarCounts} totalCount={totalCourses} />
        <ViewToggle basePath="/courses" />
      </div>

      <div className="container mb-8">
        <PageRange collection="courses" currentPage={courses.page} limit={12} totalDocs={courses.totalDocs} />
      </div>

      <div className="container mb-8">
        {view === 'grid' ? <ContentGrid items={items} /> : <ContentList items={items} />}
      </div>

      <div className="container">
        {courses.totalPages > 1 && courses.page && (
          <Pagination page={courses.page} totalPages={courses.totalPages} />
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Courses',
    description:
      'Structured longevity courses for executives and high-performers. Learn sleep, nutrition, stress, and more.',
    openGraph: {
      title: 'Courses | PATHS by LIMITLESS',
      description:
        'Structured longevity courses for executives and high-performers.',
      type: 'website',
    },
  }
}
