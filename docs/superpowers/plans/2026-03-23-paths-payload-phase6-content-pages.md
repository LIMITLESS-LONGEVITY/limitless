# PATHS Payload CMS — Phase 6: Content Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public-facing content pages — article browse/reader, course catalog/detail, lesson viewer, AI tutor panel, locked content banner, and interactive quiz blocks.

**Architecture:** Next.js 15 App Router pages using server components for data fetching and client components for interactivity. Follows existing codebase patterns: Tailwind v4, shadcn/ui, Payload Local API in server components, REST API from client components. Shared components (ContentList, PillarFilter, TierBadge, LockedContentBanner) are built first, then composed into pages.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Payload CMS 3.x, Lexical rich text

**Spec:** `docs/superpowers/specs/2026-03-23-paths-phase6-content-pages-design.md`

**Depends on:** Phases 1-5 (all backend collections, hooks, endpoints, access control)

**Working directory:** `C:/Projects/LIMITLESS/limitless-paths/`

---

## File Structure

```
src/
├── app/(frontend)/
│   ├── articles/
│   │   ├── page.tsx                        # Article listing
│   │   ├── page.client.tsx                 # Client wrapper for listing
│   │   └── [slug]/
│   │       ├── page.tsx                    # Article reader
│   │       └── page.client.tsx             # Client wrapper for reader
│   ├── courses/
│   │   ├── page.tsx                        # Course catalog
│   │   ├── page.client.tsx                 # Client wrapper for catalog
│   │   └── [slug]/
│   │       ├── page.tsx                    # Course detail
│   │       ├── page.client.tsx             # Client wrapper for detail
│   │       └── lessons/
│   │           └── [lessonSlug]/
│   │               ├── page.tsx            # Lesson viewer
│   │               └── page.client.tsx     # Client wrapper for viewer
├── components/
│   ├── TierBadge/
│   │   └── index.tsx                       # FREE/REGULAR/PREMIUM/ENTERPRISE badge
│   ├── PillarFilter/
│   │   └── index.tsx                       # Content pillar filter pills
│   ├── ContentListItem/
│   │   └── index.tsx                       # List item (thumbnail + meta)
│   ├── ContentList/
│   │   └── index.tsx                       # Reusable list view wrapper
│   ├── LockedContentBanner/
│   │   └── index.tsx                       # Fade + inline upgrade banner
│   ├── ArticleSidebar/
│   │   └── index.tsx                       # Left sidebar: TOC, tutor, related
│   ├── CourseSidebar/
│   │   └── index.tsx                       # Left sidebar: course outline + progress
│   ├── TutorPanel/
│   │   └── index.tsx                       # Slide-out AI chat drawer
│   ├── QuizBlock/
│   │   └── index.tsx                       # Interactive quiz renderer
│   ├── EnrollButton/
│   │   └── index.tsx                       # Enroll/continue/upgrade CTA
│   ├── LessonNav/
│   │   └── index.tsx                       # Previous / Mark Complete & Next footer
│   └── VideoEmbed/
│       └── index.tsx                       # YouTube/Vimeo player
```

> **Note:** Frontend components are not unit-tested with vitest (no existing pattern for component tests in this codebase). Quality is verified via `pnpm build` (catches TypeScript errors, import issues, server/client boundary violations) and manual visual inspection.

---

## Task 1: Build Shared UI Components (TierBadge, PillarFilter)

**Files:**
- Create: `src/components/TierBadge/index.tsx`
- Create: `src/components/PillarFilter/index.tsx`

- [ ] **Step 1: Create TierBadge component**

`src/components/TierBadge/index.tsx`:
```tsx
import { cn } from '@/utilities/ui'
import React from 'react'

const TIER_STYLES: Record<string, string> = {
  free: 'text-muted-foreground',
  regular: 'text-muted-foreground bg-muted',
  premium: 'text-amber-500 bg-amber-500/10',
  enterprise: 'text-amber-500 bg-amber-500/15',
}

export const TierBadge: React.FC<{
  tier: string
  className?: string
}> = ({ tier, className }) => {
  if (tier === 'free') return null // No badge for free content

  return (
    <span
      className={cn(
        'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded',
        TIER_STYLES[tier] ?? TIER_STYLES.regular,
        className,
      )}
    >
      {tier}
    </span>
  )
}
```

- [ ] **Step 2: Create PillarFilter component**

`src/components/PillarFilter/index.tsx`:
```tsx
'use client'
import { cn } from '@/utilities/ui'
import { useRouter, useSearchParams } from 'next/navigation'
import React from 'react'

type Pillar = {
  id: string
  name: string
  slug: string
}

export const PillarFilter: React.FC<{
  pillars: Pillar[]
  basePath: string
}> = ({ pillars, basePath }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activePillar = searchParams.get('pillar')

  const handleClick = (slug: string | null) => {
    if (slug) {
      router.push(`${basePath}?pillar=${slug}`)
    } else {
      router.push(basePath)
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => handleClick(null)}
        className={cn(
          'px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors',
          !activePillar
            ? 'bg-amber-500/20 text-amber-500'
            : 'bg-muted text-muted-foreground hover:bg-muted/80',
        )}
      >
        All
      </button>
      {pillars.map((pillar) => (
        <button
          key={pillar.id}
          onClick={() => handleClick(pillar.slug)}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors',
            activePillar === pillar.slug
              ? 'bg-amber-500/20 text-amber-500'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          {pillar.name}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/TierBadge/ src/components/PillarFilter/
git commit -m "Add TierBadge and PillarFilter shared components"
```

---

## Task 2: Build ContentList and ContentListItem Components

**Files:**
- Create: `src/components/ContentListItem/index.tsx`
- Create: `src/components/ContentList/index.tsx`

- [ ] **Step 1: Create ContentListItem component**

`src/components/ContentListItem/index.tsx`:
```tsx
import { cn } from '@/utilities/ui'
import Link from 'next/link'
import React from 'react'
import { Media } from '@/components/Media'
import { TierBadge } from '@/components/TierBadge'

export type ContentListItemData = {
  slug: string
  title: string
  excerpt?: string | null
  accessLevel: string
  pillarName?: string
  authorName?: string
  featuredImage?: any
  readTime?: string
  meta?: string // e.g., "4h 30m · 3 modules · 12 lessons"
}

export const ContentListItem: React.FC<{
  item: ContentListItemData
  href: string
  className?: string
}> = ({ item, href, className }) => {
  return (
    <Link
      href={href}
      className={cn(
        'flex gap-4 p-4 rounded-lg border border-border hover:bg-card/50 transition-colors items-center',
        className,
      )}
    >
      {item.featuredImage && (
        <div className="flex-shrink-0 w-[140px] h-[90px] rounded-lg overflow-hidden bg-muted">
          {typeof item.featuredImage !== 'string' && (
            <Media resource={item.featuredImage} className="w-full h-full object-cover" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 items-center text-[10px] mb-1">
          {item.pillarName && (
            <span className="text-amber-500 font-semibold uppercase">{item.pillarName}</span>
          )}
          <TierBadge tier={item.accessLevel} />
        </div>
        <h3 className="text-sm font-semibold truncate">{item.title}</h3>
        {item.excerpt && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.excerpt}</p>
        )}
        {item.authorName && (
          <p className="text-xs text-muted-foreground mt-1">{item.authorName}</p>
        )}
      </div>
      {(item.readTime || item.meta) && (
        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
          {item.readTime || item.meta}
        </span>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: Create ContentList component**

`src/components/ContentList/index.tsx`:
```tsx
import React from 'react'
import { ContentListItem, type ContentListItemData } from '@/components/ContentListItem'

export const ContentList: React.FC<{
  items: Array<ContentListItemData & { href: string }>
}> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No content found.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <ContentListItem key={item.slug} item={item} href={item.href} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ContentListItem/ src/components/ContentList/
git commit -m "Add ContentList and ContentListItem components for article/course browse"
```

---

## Task 3: Build LockedContentBanner Component

**Files:**
- Create: `src/components/LockedContentBanner/index.tsx`

- [ ] **Step 1: Create LockedContentBanner component**

`src/components/LockedContentBanner/index.tsx`:
```tsx
import React from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'

export const LockedContentBanner: React.FC<{
  tierRequired: string
}> = ({ tierRequired }) => {
  const tierLabel = tierRequired.charAt(0).toUpperCase() + tierRequired.slice(1)

  return (
    <div className="relative">
      {/* Fade gradient overlay */}
      <div className="h-20 bg-gradient-to-b from-transparent to-background" />

      {/* Inline upgrade banner */}
      <div className="flex items-center gap-4 p-5 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <div className="flex-1">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4" />
            This is {tierLabel} content
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade your plan to continue reading this and all {tierLabel.toLowerCase()} content.
          </p>
        </div>
        <Link
          href="/account/billing"
          className="px-5 py-2.5 bg-amber-500/20 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors whitespace-nowrap"
        >
          Upgrade
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LockedContentBanner/
git commit -m "Add LockedContentBanner with fade gradient and inline upgrade CTA"
```

---

## Task 4: Build Article Listing Page

**Files:**
- Create: `src/app/(frontend)/articles/page.tsx`
- Create: `src/app/(frontend)/articles/page.client.tsx`

- [ ] **Step 1: Create article listing page client wrapper**

`src/app/(frontend)/articles/page.client.tsx`:
```tsx
'use client'
import React from 'react'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { useEffect } from 'react'

const PageClient: React.FC = () => {
  const { setHeaderTheme } = useHeaderTheme()
  useEffect(() => {
    setHeaderTheme(null)
  }, [setHeaderTheme])
  return <React.Fragment />
}

export default PageClient
```

- [ ] **Step 2: Create article listing page**

`src/app/(frontend)/articles/page.tsx`:
```tsx
import type { Metadata } from 'next/types'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { ContentList } from '@/components/ContentList'
import { PillarFilter } from '@/components/PillarFilter'
import { Pagination } from '@/components/Pagination'
import { PageRange } from '@/components/PageRange'
import PageClient from './page.client'

export const dynamic = 'force-dynamic'

type Args = {
  searchParams: Promise<{ pillar?: string; page?: string }>
}

export default async function ArticlesPage({ searchParams }: Args) {
  const { pillar, page: pageParam } = await searchParams
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
    authorName: typeof article.author === 'object'
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

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-8">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Articles</h1>
          <p className="text-muted-foreground">
            Expert insights on longevity, nutrition, and performance
          </p>
        </div>
      </div>

      <div className="container mb-6">
        <PillarFilter pillars={pillars} basePath="/articles" />
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
        <ContentList items={items} />
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
    title: 'Articles — PATHS by LIMITLESS',
  }
}
```

- [ ] **Step 3: Verify build passes**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(frontend\)/articles/
git commit -m "Add article listing page with pillar filter and list view"
```

---

## Task 5: Build Article Reader Page

**Files:**
- Create: `src/components/ArticleSidebar/index.tsx`
- Create: `src/app/(frontend)/articles/[slug]/page.tsx`
- Create: `src/app/(frontend)/articles/[slug]/page.client.tsx`

- [ ] **Step 1: Create ArticleSidebar component**

`src/components/ArticleSidebar/index.tsx`:
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import { cn } from '@/utilities/ui'
import { MessageCircle } from 'lucide-react'

type TOCItem = {
  id: string
  text: string
  level: number
}

export const ArticleSidebar: React.FC<{
  contentRef: React.RefObject<HTMLDivElement | null>
  onOpenTutor: () => void
  relatedCourses?: Array<{ id: string; title: string; slug: string }>
  pillarArticles?: Array<{ id: string; title: string; slug: string }>
}> = ({ contentRef, onOpenTutor, relatedCourses, pillarArticles }) => {
  const [toc, setToc] = useState<TOCItem[]>([])
  const [activeId, setActiveId] = useState<string>('')

  // Build TOC from rendered headings
  useEffect(() => {
    if (!contentRef.current) return
    const headings = contentRef.current.querySelectorAll('h2, h3')
    const items: TOCItem[] = []
    headings.forEach((heading, i) => {
      if (!heading.id) heading.id = `heading-${i}`
      items.push({
        id: heading.id,
        text: heading.textContent || '',
        level: heading.tagName === 'H2' ? 2 : 3,
      })
    })
    setToc(items)
  }, [contentRef])

  // Scrollspy
  useEffect(() => {
    if (toc.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        })
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )
    toc.forEach((item) => {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [toc])

  return (
    <aside className="w-[240px] flex-shrink-0 hidden lg:block">
      <div className="sticky top-24 space-y-6">
        {/* Table of Contents */}
        {toc.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">
              On this page
            </p>
            <nav className="space-y-1">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={cn(
                    'block text-xs leading-relaxed transition-colors',
                    item.level === 3 && 'pl-3',
                    activeId === item.id
                      ? 'text-amber-500 font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </div>
        )}

        {/* AI Tutor */}
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <p className="text-xs font-semibold mb-1">AI Tutor</p>
          <p className="text-[11px] text-muted-foreground mb-2">
            Ask questions about this article
          </p>
          <button
            onClick={onOpenTutor}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-500 rounded text-xs font-medium hover:bg-amber-500/30 transition-colors"
          >
            <MessageCircle className="w-3 h-3" />
            Open Tutor
          </button>
        </div>

        {/* Related Courses */}
        {relatedCourses && relatedCourses.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">Related Courses</p>
            <div className="space-y-1">
              {relatedCourses.map((course) => (
                <a
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {course.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* More from this pillar */}
        {pillarArticles && pillarArticles.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">More in this topic</p>
            <div className="space-y-1">
              {pillarArticles.map((article) => (
                <a
                  key={article.id}
                  href={`/articles/${article.slug}`}
                  className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {article.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create article reader client wrapper**

`src/app/(frontend)/articles/[slug]/page.client.tsx`:
```tsx
'use client'
import React, { useRef, useState } from 'react'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { useEffect } from 'react'
import RichText from '@/components/RichText'
import { ArticleSidebar } from '@/components/ArticleSidebar'
import { LockedContentBanner } from '@/components/LockedContentBanner'
import { TierBadge } from '@/components/TierBadge'
import { TutorPanel } from '@/components/TutorPanel'
import { Media } from '@/components/Media'

type ArticleClientProps = {
  article: any
  relatedCourses: Array<{ id: string; title: string; slug: string }>
  pillarArticles: Array<{ id: string; title: string; slug: string }>
}

const ArticleClient: React.FC<ArticleClientProps> = ({
  article,
  relatedCourses,
  pillarArticles,
}) => {
  const { setHeaderTheme } = useHeaderTheme()
  const contentRef = useRef<HTMLDivElement>(null)
  const [tutorOpen, setTutorOpen] = useState(false)

  useEffect(() => {
    setHeaderTheme(null)
  }, [setHeaderTheme])

  const pillarName = typeof article.pillar === 'object' ? article.pillar?.name : ''
  const authorName = typeof article.author === 'object'
    ? [article.author?.firstName, article.author?.lastName].filter(Boolean).join(' ')
    : ''

  return (
    <>
      <div className="pt-24 pb-24">
        <div className="container">
          <div className="flex gap-8">
            {/* Left Sidebar */}
            <ArticleSidebar
              contentRef={contentRef}
              onOpenTutor={() => setTutorOpen(true)}
              relatedCourses={relatedCourses}
              pillarArticles={pillarArticles}
            />

            {/* Main Content */}
            <article className="flex-1 min-w-0 max-w-[48rem]">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  {pillarName && (
                    <span className="text-xs font-semibold uppercase text-amber-500">
                      {pillarName}
                    </span>
                  )}
                  <TierBadge tier={article.accessLevel} />
                </div>
                <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {authorName && `By ${authorName}`}
                  {article.publishedAt && ` · ${new Date(article.publishedAt).toLocaleDateString()}`}
                </p>
              </div>

              {article.featuredImage && typeof article.featuredImage !== 'string' && (
                <div className="rounded-lg overflow-hidden mb-8">
                  <Media resource={article.featuredImage} />
                </div>
              )}

              {article.locked ? (
                <>
                  {article.excerpt && (
                    <div className="prose dark:prose-invert max-w-none">
                      <p>{article.excerpt}</p>
                    </div>
                  )}
                  <LockedContentBanner tierRequired={article.accessLevel} />
                </>
              ) : (
                <div ref={contentRef}>
                  <RichText data={article.content} enableGutter={false} />
                </div>
              )}
            </article>
          </div>
        </div>
      </div>

      {/* AI Tutor Panel */}
      {!article.locked && (
        <TutorPanel
          open={tutorOpen}
          onClose={() => setTutorOpen(false)}
          contextType="articles"
          contextId={article.id}
          contextTitle={article.title}
        />
      )}
    </>
  )
}

export default ArticleClient
```

- [ ] **Step 3: Create article reader server page**

`src/app/(frontend)/articles/[slug]/page.tsx`:
```tsx
import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'
import { generateMeta } from '@/utilities/generateMeta'
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

  const result = await payload.find({
    collection: 'articles',
    where: { slug: { equals: decodedSlug } },
    depth: 2,
    limit: 1,
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
    select: { title: true, meta: true },
  })
  const article = result.docs[0]
  return generateMeta({ doc: article })
}
```

- [ ] **Step 4: Commit** (TutorPanel doesn't exist yet — will be built in Task 8. The import will cause a build error, so create a stub first)

Create a stub `src/components/TutorPanel/index.tsx`:
```tsx
'use client'
import React from 'react'

export const TutorPanel: React.FC<{
  open: boolean
  onClose: () => void
  contextType: string
  contextId: string
  contextTitle: string
}> = () => null // Stub — full implementation in Task 8
```

```bash
git add src/components/ArticleSidebar/ src/components/TutorPanel/ src/app/\(frontend\)/articles/
git commit -m "Add article reader page with left sidebar, TOC, and locked content handling"
```

---

## Task 6: Build Course Catalog and Course Detail Pages

**Files:**
- Create: `src/app/(frontend)/courses/page.tsx`
- Create: `src/app/(frontend)/courses/page.client.tsx`
- Create: `src/components/EnrollButton/index.tsx`
- Create: `src/app/(frontend)/courses/[slug]/page.tsx`
- Create: `src/app/(frontend)/courses/[slug]/page.client.tsx`

- [ ] **Step 1: Create course catalog client wrapper**

`src/app/(frontend)/courses/page.client.tsx`:
```tsx
'use client'
import React, { useEffect } from 'react'
import { useHeaderTheme } from '@/providers/HeaderTheme'

const PageClient: React.FC = () => {
  const { setHeaderTheme } = useHeaderTheme()
  useEffect(() => { setHeaderTheme(null) }, [setHeaderTheme])
  return <React.Fragment />
}

export default PageClient
```

- [ ] **Step 2: Create course catalog page**

`src/app/(frontend)/courses/page.tsx`:
```tsx
import type { Metadata } from 'next/types'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { ContentList } from '@/components/ContentList'
import { PillarFilter } from '@/components/PillarFilter'
import { Pagination } from '@/components/Pagination'
import { PageRange } from '@/components/PageRange'
import PageClient from './page.client'

export const dynamic = 'force-dynamic'

type Args = {
  searchParams: Promise<{ pillar?: string; page?: string }>
}

export default async function CoursesPage({ searchParams }: Args) {
  const { pillar, page: pageParam } = await searchParams
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

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-8">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Courses</h1>
          <p className="text-muted-foreground">Structured learning paths for longevity mastery</p>
        </div>
      </div>

      <div className="container mb-6">
        <PillarFilter pillars={pillars} basePath="/courses" />
      </div>

      <div className="container mb-8">
        <PageRange collection="courses" currentPage={courses.page} limit={12} totalDocs={courses.totalDocs} />
      </div>

      <div className="container mb-8">
        <ContentList items={items} />
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
  return { title: 'Courses — PATHS by LIMITLESS' }
}
```

- [ ] **Step 3: Create EnrollButton component**

`src/components/EnrollButton/index.tsx`:
```tsx
'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/utilities/ui'

type EnrollState = 'not-logged-in' | 'no-access' | 'can-enroll' | 'enrolled' | 'completed'

export const EnrollButton: React.FC<{
  state: EnrollState
  courseId: string
  tierRequired: string
  completionPercentage?: number
  nextLessonHref?: string
}> = ({ state, courseId, tierRequired, completionPercentage, nextLessonHref }) => {
  const [loading, setLoading] = useState(false)
  const [enrolled, setEnrolled] = useState(state === 'enrolled' || state === 'completed')

  const handleEnroll = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/enrollments/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })
      if (res.ok) {
        setEnrolled(true)
        window.location.reload()
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false)
    }
  }

  if (state === 'not-logged-in') {
    return (
      <Link href="/admin" className="inline-block px-6 py-3 bg-amber-500/20 text-amber-500 rounded-lg font-medium hover:bg-amber-500/30 transition-colors">
        Sign in to enroll
      </Link>
    )
  }

  if (state === 'no-access') {
    return (
      <Link href="/account/billing" className="inline-block px-6 py-3 bg-amber-500/20 text-amber-500 rounded-lg font-medium hover:bg-amber-500/30 transition-colors">
        Upgrade to {tierRequired.charAt(0).toUpperCase() + tierRequired.slice(1)} to access
      </Link>
    )
  }

  if (state === 'completed') {
    return (
      <div className="flex items-center gap-3">
        <span className="px-4 py-2 bg-green-500/10 text-green-500 rounded-lg text-sm font-medium">
          Completed
        </span>
        {nextLessonHref && (
          <Link href={nextLessonHref} className="px-4 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors">
            Revisit
          </Link>
        )}
      </div>
    )
  }

  if (enrolled || state === 'enrolled') {
    return (
      <div className="space-y-2">
        {completionPercentage != null && completionPercentage > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex-1 h-1.5 bg-muted rounded-full">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${completionPercentage}%` }} />
            </div>
            <span>{completionPercentage}%</span>
          </div>
        )}
        <Link href={nextLessonHref || '#'} className="inline-block px-6 py-3 bg-amber-500/20 text-amber-500 rounded-lg font-medium hover:bg-amber-500/30 transition-colors">
          Continue Learning
        </Link>
      </div>
    )
  }

  return (
    <button
      onClick={handleEnroll}
      disabled={loading}
      className={cn(
        'px-6 py-3 bg-amber-500/20 text-amber-500 rounded-lg font-medium hover:bg-amber-500/30 transition-colors',
        loading && 'opacity-50 cursor-not-allowed',
      )}
    >
      {loading ? 'Enrolling...' : 'Enroll in this course'}
    </button>
  )
}
```

- [ ] **Step 4: Create course detail client wrapper and page**

`src/app/(frontend)/courses/[slug]/page.client.tsx`:
```tsx
'use client'
import React, { useEffect } from 'react'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { Media } from '@/components/Media'
import { TierBadge } from '@/components/TierBadge'
import { EnrollButton } from '@/components/EnrollButton'
import { LockedContentBanner } from '@/components/LockedContentBanner'
import RichText from '@/components/RichText'
import Link from 'next/link'
import { Clock, BookOpen, CheckCircle2, Circle } from 'lucide-react'

type CourseDetailClientProps = {
  course: any
  enrollState: 'not-logged-in' | 'no-access' | 'can-enroll' | 'enrolled' | 'completed'
  completionPercentage?: number
  nextLessonHref?: string
  lessonProgress?: Record<string, string> // lessonId → status
}

const CourseDetailClient: React.FC<CourseDetailClientProps> = ({
  course,
  enrollState,
  completionPercentage,
  nextLessonHref,
  lessonProgress,
}) => {
  const { setHeaderTheme } = useHeaderTheme()
  useEffect(() => { setHeaderTheme(null) }, [setHeaderTheme])

  const pillarName = typeof course.pillar === 'object' ? course.pillar?.name : ''
  const instructorName = typeof course.instructor === 'object'
    ? [course.instructor?.firstName, course.instructor?.lastName].filter(Boolean).join(' ')
    : ''

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

        <div className="flex items-center gap-2 mb-2">
          {pillarName && <span className="text-xs font-semibold uppercase text-amber-500">{pillarName}</span>}
          <TierBadge tier={course.accessLevel} />
        </div>
        <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6">
          {instructorName && <span>By {instructorName}</span>}
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
                <div key={mod.id} className="border border-border rounded-lg p-4">
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
                            <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          {isEnrolled ? (
                            <Link
                              href={`/courses/${course.slug}/lessons/${lesson.slug}`}
                              className="hover:text-amber-500 transition-colors"
                            >
                              {lesson.title}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">{lesson.title}</span>
                          )}
                          {lesson.estimatedDuration && (
                            <span className="text-xs text-muted-foreground ml-auto">
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
      </div>
    </div>
  )
}

export default CourseDetailClient
```

- [ ] **Step 5: Create course detail server page**

`src/app/(frontend)/courses/[slug]/page.tsx`:
```tsx
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

  const result = await payload.find({
    collection: 'courses',
    where: { slug: { equals: decodeURIComponent(slug) } },
    depth: 3, // Populate modules → lessons
    limit: 1,
  })

  const course = result.docs[0]
  if (!course) return notFound()

  // Check user auth + enrollment
  let enrollState: 'not-logged-in' | 'no-access' | 'can-enroll' | 'enrolled' | 'completed' = 'not-logged-in'
  let completionPercentage: number | undefined
  let nextLessonHref: string | undefined
  let lessonProgress: Record<string, string> = {}

  try {
    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList })

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
    select: { title: true, meta: true },
  })
  return generateMeta({ doc: result.docs[0] })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(frontend\)/courses/ src/components/EnrollButton/
git commit -m "Add course catalog and course detail pages with enrollment state"
```

---

## Task 7: Build Lesson Viewer Page

**Files:**
- Create: `src/components/CourseSidebar/index.tsx`
- Create: `src/components/LessonNav/index.tsx`
- Create: `src/app/(frontend)/courses/[slug]/lessons/[lessonSlug]/page.tsx`
- Create: `src/app/(frontend)/courses/[slug]/lessons/[lessonSlug]/page.client.tsx`

- [ ] **Step 1: Create CourseSidebar component**

`src/components/CourseSidebar/index.tsx`:
```tsx
'use client'
import React from 'react'
import Link from 'next/link'
import { cn } from '@/utilities/ui'
import { CheckCircle2, Circle } from 'lucide-react'

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
  return (
    <aside className="w-[240px] flex-shrink-0 hidden lg:block bg-card/50 border-r border-border">
      <div className="sticky top-0 h-screen overflow-y-auto p-4">
        <Link
          href={`/courses/${courseSlug}`}
          className="text-sm font-bold hover:text-amber-500 transition-colors block mb-4"
        >
          {courseTitle}
        </Link>

        <div className="space-y-4">
          {modules.map((mod, i) => (
            <div key={mod.id}>
              <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">
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
                          ? 'text-amber-500 font-semibold bg-amber-500/5'
                          : status === 'completed'
                            ? 'text-muted-foreground'
                            : 'text-foreground hover:bg-muted/50',
                      )}
                    >
                      {status === 'completed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      ) : isCurrent ? (
                        <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0 text-amber-500">&#8226;</span>
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
        <div className="mt-6 p-3 bg-muted/50 rounded-lg">
          <div className="flex justify-between text-[11px] mb-1">
            <span>Progress</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create LessonNav component**

`src/components/LessonNav/index.tsx`:
```tsx
'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/utilities/ui'

export const LessonNav: React.FC<{
  prevHref?: string | null
  nextHref?: string | null
  lessonProgressId?: string | null
  enrollmentId: string
  lessonId: string
  isCompleted: boolean
}> = ({ prevHref, nextHref, lessonProgressId, enrollmentId, lessonId, isCompleted }) => {
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(isCompleted)

  const handleMarkComplete = async () => {
    setLoading(true)
    try {
      if (lessonProgressId) {
        // Update existing progress
        await fetch(`/api/lesson-progress/${lessonProgressId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        })
      } else {
        // Create new progress record
        await fetch('/api/lesson-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: '', // Will be set by access control
            lesson: lessonId,
            enrollment: enrollmentId,
            status: 'completed',
          }),
        })
      }
      setCompleted(true)
      if (nextHref) window.location.href = nextHref
      else window.location.reload()
    } catch {
      // Handle error
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-between items-center pt-6 mt-8 border-t border-border">
      {prevHref ? (
        <Link href={prevHref} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Previous
        </Link>
      ) : (
        <div />
      )}
      {!completed ? (
        <button
          onClick={handleMarkComplete}
          disabled={loading}
          className={cn(
            'px-5 py-2.5 bg-amber-500/20 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors',
            loading && 'opacity-50 cursor-not-allowed',
          )}
        >
          {loading ? 'Saving...' : `Mark Complete${nextHref ? ' & Next →' : ''}`}
        </button>
      ) : nextHref ? (
        <Link href={nextHref} className="px-5 py-2.5 bg-amber-500/20 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors">
          Next &rarr;
        </Link>
      ) : (
        <span className="text-sm text-green-500 font-medium">Lesson Complete</span>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create lesson viewer client wrapper**

`src/app/(frontend)/courses/[slug]/lessons/[lessonSlug]/page.client.tsx`:
```tsx
'use client'
import React, { useState } from 'react'
import { CourseSidebar } from '@/components/CourseSidebar'
import { LessonNav } from '@/components/LessonNav'
import { TutorPanel } from '@/components/TutorPanel'
import { TierBadge } from '@/components/TierBadge'
import RichText from '@/components/RichText'
import { MessageCircle } from 'lucide-react'

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
          <div className="mb-1 text-xs text-muted-foreground uppercase">
            Module {lesson._moduleIndex} &bull; Lesson {lesson._lessonIndex}
          </div>
          <h1 className="text-2xl font-bold mb-2">{lesson.title}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {lesson.estimatedDuration && `${lesson.estimatedDuration} min`}
            {lesson.lessonType && ` · ${lesson.lessonType} lesson`}
          </p>

          {/* Video embed */}
          {lesson.videoEmbed?.url && (
            <div className="aspect-video mb-8 rounded-lg overflow-hidden bg-muted">
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
            className="mt-6 flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 rounded-lg text-sm hover:bg-amber-500/20 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Ask AI Tutor about this lesson
          </button>

          <LessonNav
            prevHref={prevHref}
            nextHref={nextHref}
            lessonProgressId={lessonProgressId}
            enrollmentId={enrollmentId}
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
```

- [ ] **Step 4: Create lesson viewer server page**

`src/app/(frontend)/courses/[slug]/lessons/[lessonSlug]/page.tsx`:
```tsx
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
  if (!user) return redirect(`/admin?redirect=/courses/${slug}/lessons/${lessonSlug}`)

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
  let moduleIndex = 0
  let lessonIndex = 0
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
  if (currentIndex > 0) prevHref = `/courses/${slug}/lessons/${allLessons[currentIndex - 1].lesson.slug}`
  if (currentIndex < allLessons.length - 1) nextHref = `/courses/${slug}/lessons/${allLessons[currentIndex + 1].lesson.slug}`

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
```

- [ ] **Step 5: Commit**

```bash
git add src/components/CourseSidebar/ src/components/LessonNav/ src/app/\(frontend\)/courses/\[slug\]/lessons/
git commit -m "Add lesson viewer with course sidebar, progress tracking, and navigation"
```

---

## Task 8: Build AI Tutor Panel (Replace Stub)

**Files:**
- Modify: `src/components/TutorPanel/index.tsx` (replace stub)

- [ ] **Step 1: Implement the full TutorPanel**

`src/components/TutorPanel/index.tsx`:
```tsx
'use client'
import React, { useState, useRef, useEffect } from 'react'
import { X, Send, MessageCircle, Lock } from 'lucide-react'
import { cn } from '@/utilities/ui'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export const TutorPanel: React.FC<{
  open: boolean
  onClose: () => void
  contextType: string
  contextId: string
  contextTitle: string
}> = ({ open, onClose, contextType, contextId, contextTitle }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    setError(null)

    const newMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          contextType,
          contextId,
        }),
      })

      if (res.status === 429) {
        setError('Daily tutor limit reached. Upgrade your plan for more access.')
        setLoading(false)
        return
      }

      if (res.status === 503) {
        setError('AI features are temporarily unavailable.')
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError('Something went wrong. Try again.')
        setLoading(false)
        return
      }

      // Stream SSE response
      const reader = res.body?.getReader()
      if (!reader) return

      let assistantContent = ''
      setMessages([...newMessages, { role: 'assistant', content: '' }])

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                assistantContent += parsed.text
                setMessages((prev) => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                  return updated
                })
              }
            } catch {}
          }
        }
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-background border-l border-border z-50 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-sm font-semibold">AI Tutor</p>
              <p className="text-[11px] text-muted-foreground truncate max-w-[250px]">{contextTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground pt-8">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>Ask me anything about this content.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-muted rounded-lg p-3 ml-8'
                  : 'pr-8',
              )}
            >
              {msg.content || (loading && i === messages.length - 1 && (
                <span className="inline-block w-2 h-4 bg-amber-500/50 animate-pulse" />
              ))}
            </div>
          ))}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/5 rounded-lg p-3">{error}</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage() }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-1 focus:ring-amber-500/50"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={cn(
                'p-2 rounded-lg transition-colors',
                input.trim() ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : 'text-muted-foreground',
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TutorPanel/
git commit -m "Implement AI Tutor slide-out panel with streaming SSE chat"
```

---

## Task 9: Build QuizBlock Component

**Files:**
- Create: `src/components/QuizBlock/index.tsx`

- [ ] **Step 1: Create QuizBlock component**

`src/components/QuizBlock/index.tsx`:
```tsx
'use client'
import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import { CheckCircle2, XCircle } from 'lucide-react'

type QuizBlockProps = {
  question: string
  options: Array<{ text: string }>
  correctAnswer: number
  explanation?: string
}

export const QuizBlock: React.FC<QuizBlockProps> = ({
  question,
  options,
  correctAnswer,
  explanation,
}) => {
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  const handleSelect = (index: number) => {
    if (revealed) return
    setSelected(index)
    setRevealed(true)
  }

  return (
    <div className="my-6 p-5 border border-border rounded-xl bg-card/50">
      <p className="text-sm font-semibold mb-4">{question}</p>
      <div className="space-y-2">
        {options.map((option, i) => {
          const isCorrect = i === correctAnswer
          const isSelected = i === selected

          let optionStyle = 'border-border hover:bg-muted/50 cursor-pointer'
          if (revealed) {
            if (isCorrect) optionStyle = 'border-green-500/50 bg-green-500/5'
            else if (isSelected && !isCorrect) optionStyle = 'border-red-500/50 bg-red-500/5'
            else optionStyle = 'border-border opacity-50'
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={revealed}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border text-sm text-left transition-all',
                optionStyle,
              )}
            >
              <span className="w-6 h-6 flex items-center justify-center rounded-full border border-current text-xs font-medium flex-shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{option.text}</span>
              {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
              {revealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
            </button>
          )
        })}
      </div>
      {revealed && explanation && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Explanation: </span>
          {explanation}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Register QuizBlock in the RichText renderer**

Read `src/components/RichText/index.tsx` to understand how blocks are rendered. The existing `RichText` component uses `@payloadcms/richtext-lexical/react` which auto-resolves block components. The QuizBlock needs to be registered as a block renderer.

Check if blocks are rendered via a `blocks` prop or auto-resolved. If auto-resolved, the component needs to be placed where Payload expects it (usually via the import map). If manually mapped, add `quizQuestion: QuizBlock` to the mapping.

> **Note:** The exact integration depends on the existing RichText component's implementation. The implementer should read `src/components/RichText/index.tsx` and follow the pattern used for existing blocks (Banner, Code, MediaBlock, etc.).

- [ ] **Step 3: Commit**

```bash
git add src/components/QuizBlock/
git commit -m "Add interactive QuizBlock component with answer reveal"
```

---

## Task 10: Build Verification

**Files:** No new files — verification only.

- [ ] **Step 1: Run production build**

```bash
pnpm build
```

Expected: Build succeeds. If there are TypeScript errors from type mismatches with Payload types, fix them.

- [ ] **Step 2: Run all existing tests**

```bash
pnpm vitest run
```

Expected: All 78 unit tests still pass (no backend regressions).

- [ ] **Step 3: Commit any build fixes**

```bash
git add -A
git commit -m "Fix build issues from Phase 6 content pages"
```

---

## Phase 6 Milestone Checklist

After completing all 10 tasks, verify:

- [ ] `/articles` — list view with pillar filter, tier badges, pagination
- [ ] `/articles/[slug]` — left sidebar (TOC, AI tutor, related), locked content banner
- [ ] `/courses` — list view with pillar filter, tier badges, pagination
- [ ] `/courses/[slug]` — course overview with modules, enroll button, progress
- [ ] `/courses/[slug]/lessons/[lessonSlug]` — course sidebar, lesson content, video embed, navigation
- [ ] AI Tutor panel slides out from right, streams responses, handles errors
- [ ] Locked content shows fade + inline upgrade banner
- [ ] QuizBlock renders interactive quiz with answer reveal
- [ ] EnrollButton handles all states (not logged in, no access, can enroll, enrolled, completed)
- [ ] LessonNav marks lessons complete and navigates
- [ ] All existing backend tests pass
- [ ] Production build succeeds

**Deferred to Phase 7:**
- Account page (profile, billing, enrollment history)
- Responsive audit and mobile optimization
- Admin dashboard enhancements
- SEO fine-tuning

**Next:** Phase 7 plan (Account & Polish)
