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
import { ExpertCard } from '@/components/ExpertCard'
import { DiagnosticUpsell } from '@/components/DiagnosticUpsell'
import { Breadcrumb } from '@/components/Breadcrumb'

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
  const author = typeof article.author === 'object' ? article.author : null

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
                <Breadcrumb items={[
                  { label: 'Articles', href: '/articles' },
                  ...(pillarName ? [{ label: pillarName, href: `/articles?pillar=${typeof article.pillar === 'object' ? article.pillar?.slug : ''}` }] : []),
                  { label: article.title },
                ]} />
                <div className="flex items-center gap-2 mb-2">
                  {pillarName && (
                    <span className="text-xs font-semibold uppercase text-brand-gold">
                      {pillarName}
                    </span>
                  )}
                  <TierBadge tier={article.accessLevel} />
                </div>
                <h1 className="text-3xl font-display font-light tracking-wide mb-3">{article.title}</h1>
                <div className="flex items-center gap-4">
                  {author && (
                    <ExpertCard
                      firstName={author.firstName}
                      lastName={author.lastName}
                      avatar={author.avatar}
                      credentials={author.credentials}
                      linkedIn={author.linkedIn}
                    />
                  )}
                  {article.publishedAt && (
                    <span className="text-xs text-brand-silver">
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
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
                <>
                  <div ref={contentRef}>
                    <RichText data={article.content} enableGutter={false} />
                  </div>
                  <div className="mt-12">
                    <DiagnosticUpsell context="article" pillarName={pillarName} />
                  </div>
                </>
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
