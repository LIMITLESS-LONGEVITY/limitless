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
  meta?: string
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
        'flex gap-4 p-4 rounded-lg border border-brand-glass-border hover:bg-brand-glass-bg-hover transition-colors items-center',
        className,
      )}
    >
      {item.featuredImage && (
        <div className="hidden sm:block flex-shrink-0 w-[140px] h-[90px] rounded-lg overflow-hidden bg-brand-dark-alt">
          {typeof item.featuredImage !== 'string' && (
            <Media resource={item.featuredImage} className="w-full h-full object-cover" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 items-center text-[10px] mb-1">
          {item.pillarName && (
            <span className="text-brand-gold font-semibold uppercase">{item.pillarName}</span>
          )}
          <TierBadge tier={item.accessLevel} />
        </div>
        <h3 className="text-sm font-semibold truncate">{item.title}</h3>
        {item.excerpt && (
          <p className="text-xs text-brand-silver line-clamp-2 mt-1">{item.excerpt}</p>
        )}
        {item.authorName && (
          <p className="text-xs text-brand-silver mt-1">{item.authorName}</p>
        )}
      </div>
      {(item.readTime || item.meta) && (
        <span className="text-xs text-brand-silver whitespace-nowrap flex-shrink-0">
          {item.readTime || item.meta}
        </span>
      )}
    </Link>
  )
}
