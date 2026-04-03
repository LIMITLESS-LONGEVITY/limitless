import { GlassCard } from './GlassCard'
import { SectionHeader } from './SectionHeader'
import { CTAButton } from './CTAButton'
import { ScrollReveal } from './ScrollReveal'
import { Media } from '@/components/Media'
import React from 'react'

import type { Article, Media as MediaType } from '@/payload-types'

interface FeaturedArticlesSectionProps {
  articles: Article[]
}

export const FeaturedArticlesSection: React.FC<FeaturedArticlesSectionProps> = ({ articles }) => {
  if (!articles.length) return null

  return (
    <section className="py-24 md:py-32 bg-brand-dark-alt relative">
      <div className="container max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <SectionHeader
            label="Latest Articles"
            heading="Expert Insights"
            description="Curated articles on the latest in longevity science, nutrition, and human performance."
          />
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {articles.map((article, i) => (
            <ScrollReveal key={article.id} delay={i * 80}>
              <a href={`/articles/${article.slug}`} className="block h-full group rounded-xl focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none">
                <GlassCard className="h-full flex flex-col overflow-hidden !p-0">
                  {article.featuredImage && typeof article.featuredImage === 'object' && (
                    <div className="relative h-40 overflow-hidden">
                      <Media
                        resource={article.featuredImage as MediaType}
                        fill
                        imgClassName="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--limitless-dark-alt)] to-transparent" />
                    </div>
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    {typeof article.pillar === 'object' && article.pillar?.name && (
                      <span className="text-brand-teal text-xs font-sans uppercase tracking-[0.15em] font-medium mb-2">
                        {article.pillar.name}
                      </span>
                    )}
                    <h3 className="font-display text-lg font-light text-brand-light mb-2 group-hover:text-brand-gold transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="font-sans text-brand-silver text-xs leading-relaxed line-clamp-2 mt-auto">
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                </GlassCard>
              </a>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="text-center mt-12">
            <CTAButton href="/articles" variant="ghost">
              View All Articles
            </CTAButton>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
