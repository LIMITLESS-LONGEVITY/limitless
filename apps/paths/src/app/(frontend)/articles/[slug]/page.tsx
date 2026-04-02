import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'
import { generateMeta } from '@/utilities/generateMeta'
import { headers as getHeaders } from 'next/headers'
import ArticleClient from './page.client'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  return []
}

type Args = {
  params: Promise<{ slug?: string }>
}

export default async function ArticlePage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()

  // Authenticate so computeLockedStatus has user context for tier checks
  let user: any = null
  try {
    const auth = await payload.auth({ headers: headersList })
    user = auth.user
  } catch {}

  const result = await payload.find({
    collection: 'articles',
    where: { slug: { equals: decodedSlug } },
    depth: 2,
    limit: 1,
    overrideAccess: true,
    user: user || undefined,
  })

  const article = result.docs[0]
  if (!article) return notFound()

  // Fetch related courses (populated from article.relatedCourses)
  const relatedCourses = (article.relatedCourses || [])
    .filter((c: any) => typeof c === 'object')
    .map((c: any) => ({ id: c.id, title: c.title, slug: c.slug }))

  // Fetch sibling articles in same pillar
  const pillarId = typeof article.pillar === 'object' ? article.pillar?.id : article.pillar
  let pillarArticles: Array<{ id: string; title: string; slug: string }> = []
  if (pillarId) {
    const siblings = await payload.find({
      collection: 'articles',
      where: {
        and: [
          { pillar: { equals: pillarId } },
          { editorialStatus: { equals: 'published' } },
          { id: { not_equals: article.id } },
        ],
      },
      limit: 5,
      sort: '-publishedAt',
      select: { title: true, slug: true },
    })
    pillarArticles = siblings.docs.map((a: any) => ({ id: a.id, title: a.title, slug: a.slug }))
  }

  return <ArticleClient article={article} relatedCourses={relatedCourses} pillarArticles={pillarArticles} />
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'articles',
    where: { slug: { equals: decodeURIComponent(slug) } },
    limit: 1,
    select: { title: true, meta: true, excerpt: true, slug: true },
  })
  const article = result.docs[0]
  return generateMeta({ doc: article })
}
