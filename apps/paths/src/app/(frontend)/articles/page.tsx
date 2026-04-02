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

export default async function ArticlesPage({ searchParams }: Args) {
  const { pillar, page: pageParam, view } = await searchParams
  const currentPage = Number(pageParam) || 1
  const payload = await getPayload({ config: configPromise })

  // Fetch content pillars for filter
  const pillarsResult = await payload.find({
    collection: 'content-pillars',
    where: { isActive: { equals: true } },
    sort: 'displayOrder',
    limit: 20,
  })

  // Build article query
  const where: any = { editorialStatus: { equals: 'published' } }
  if (pillar) {
    // Find pillar by slug to get its ID
    const pillarDoc = await payload.find({
      collection: 'content-pillars',
      where: { slug: { equals: pillar } },
      limit: 1,
    })
    if (pillarDoc.docs[0]) {
      where.pillar = { equals: pillarDoc.docs[0].id }
    }
  }

  const articles = await payload.find({
    collection: 'articles',
    where,
    sort: '-publishedAt',
    limit: 12,
    page: currentPage,
    depth: 2,
  })

  // Map articles to ContentListItem format
  const items = articles.docs.map((article: any) => ({
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    accessLevel: article.accessLevel,
    pillarName: typeof article.pillar === 'object' ? article.pillar?.name : undefined,
    authorName:
      typeof article.author === 'object'
        ? [article.author?.firstName, article.author?.lastName].filter(Boolean).join(' ')
        : undefined,
    featuredImage: article.featuredImage,
    href: `/articles/${article.slug}`,
  }))

  const pillars = pillarsResult.docs.map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
  }))

  // Fetch counts per pillar + total count in parallel
  const [totalArticlesResult, ...countResults] = await Promise.all([
    payload.count({
      collection: 'articles',
      where: { editorialStatus: { equals: 'published' } },
    }),
    ...pillarsResult.docs.map(async (p: any) => ({
      id: p.id,
      count: (await payload.count({
        collection: 'articles',
        where: { pillar: { equals: p.id }, editorialStatus: { equals: 'published' } },
      })).totalDocs,
    })),
  ])
  const pillarCounts: Record<string, number> = {}
  countResults.forEach((r) => { pillarCounts[r.id] = r.count })
  const totalArticles = totalArticlesResult.totalDocs

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-8">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Articles</h1>
          <p className="text-brand-silver">
            Expert insights on longevity, nutrition, and performance
          </p>
        </div>
      </div>

      <div className="container mb-6 flex items-center justify-between gap-4 flex-wrap">
        <PillarFilter pillars={pillars} basePath="/articles" counts={pillarCounts} totalCount={totalArticles} />
        <ViewToggle basePath="/articles" />
      </div>

      <div className="container mb-8">
        <PageRange
          collection="articles"
          currentPage={articles.page}
          limit={12}
          totalDocs={articles.totalDocs}
        />
      </div>

      <div className="container mb-8">
        {view === 'grid' ? <ContentGrid items={items} /> : <ContentList items={items} />}
      </div>

      <div className="container">
        {articles.totalPages > 1 && articles.page && (
          <Pagination page={articles.page} totalPages={articles.totalPages} />
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Articles',
    description:
      'Expert insights on longevity, nutrition, and performance. Evidence-based articles from leading health scientists.',
    openGraph: {
      title: 'Articles | PATHS by LIMITLESS',
      description:
        'Expert insights on longevity, nutrition, and performance from leading health scientists.',
      type: 'website',
    },
  }
}
