import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { HomePageClient } from './HomePageClient'
import './homepage.css'

import { HeroSection } from '@/components/homepage/HeroSection'
import { ValuePropSection } from '@/components/homepage/ValuePropSection'
import { FeaturedCoursesSection } from '@/components/homepage/FeaturedCoursesSection'
import { FeaturedArticlesSection } from '@/components/homepage/FeaturedArticlesSection'
import { MembershipSection } from '@/components/homepage/MembershipSection'
import { PillarsSection } from '@/components/homepage/PillarsSection'
import { FinalCTASection } from '@/components/homepage/FinalCTASection'

import type { Course, Article, MembershipTier, ContentPillar } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const payload = await getPayload({ config: configPromise })

  const [coursesResult, articlesResult, tiersResult, pillarsResult] = await Promise.all([
    payload.find({
      collection: 'courses',
      where: { editorialStatus: { equals: 'published' } },
      sort: '-publishedAt',
      limit: 3,
      depth: 2,
    }),
    payload.find({
      collection: 'articles',
      where: { editorialStatus: { equals: 'published' } },
      sort: '-publishedAt',
      limit: 4,
      depth: 2,
    }),
    payload.find({
      collection: 'membership-tiers',
      where: { isActive: { equals: true } },
      sort: 'displayOrder',
      limit: 10,
    }),
    payload.find({
      collection: 'content-pillars',
      where: { isActive: { equals: true } },
      sort: 'displayOrder',
      limit: 10,
    }),
  ])

  const courses = coursesResult.docs as Course[]
  const articles = articlesResult.docs as Article[]
  const tiers = tiersResult.docs as MembershipTier[]
  const pillars = pillarsResult.docs as ContentPillar[]

  return (
    <div data-theme="dark" className="bg-brand-dark min-h-screen">
      <HomePageClient />
      <HeroSection />
      <ValuePropSection />
      <FeaturedCoursesSection courses={courses} />
      <FeaturedArticlesSection articles={articles} />
      <MembershipSection tiers={tiers} />
      <PillarsSection pillars={pillars} />
      <FinalCTASection />
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: {
      absolute: 'PATHS by LIMITLESS — Master the Science of Living Longer',
    },
    description:
      'Evidence-based longevity education for executives and high-performers. Courses, articles, and AI-powered learning — all in one platform.',
    openGraph: {
      title: 'PATHS by LIMITLESS — Longevity Education Platform',
      description:
        'Evidence-based longevity education for executives and high-performers. Courses, articles, and AI-powered learning.',
      type: 'website',
    },
  }
}
