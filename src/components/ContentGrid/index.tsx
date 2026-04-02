import React from 'react'
import Link from 'next/link'
import { GlassCard } from '@/components/homepage/GlassCard'
import { Media } from '@/components/Media'
import { TierBadge } from '@/components/TierBadge'
import type { ContentListItemData } from '@/components/ContentListItem'

export const ContentGrid: React.FC<{
  items: Array<ContentListItemData & { href: string }>
}> = ({ items }) => {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <Link
          key={item.slug}
          href={item.href}
          className="block group rounded-xl focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none"
        >
          <GlassCard className="h-full flex flex-col overflow-hidden !p-0">
            {item.featuredImage && typeof item.featuredImage !== 'string' && (
              <div className="relative h-40 overflow-hidden">
                <Media
                  resource={item.featuredImage}
                  fill
                  imgClassName="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark to-transparent" />
              </div>
            )}
            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-2">
                {item.pillarName && (
                  <span className="text-brand-teal text-[10px] font-sans uppercase tracking-[0.15em] font-medium">
                    {item.pillarName}
                  </span>
                )}
                <TierBadge tier={item.accessLevel} />
              </div>
              <h3 className="font-display text-lg font-light text-brand-light mb-2 group-hover:text-brand-gold transition-colors line-clamp-2">
                {item.title}
              </h3>
              {item.excerpt && (
                <p className="text-xs text-brand-silver line-clamp-2 mb-3">{item.excerpt}</p>
              )}
              <div className="mt-auto pt-2 flex items-center justify-between text-brand-silver text-xs">
                {item.authorName && <span>{item.authorName}</span>}
                {(item.readTime || item.meta) && (
                  <span className="text-brand-silver/70">{item.readTime || item.meta}</span>
                )}
              </div>
            </div>
          </GlassCard>
        </Link>
      ))}
    </div>
  )
}
