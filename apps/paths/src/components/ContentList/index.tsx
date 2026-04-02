import React from 'react'
import { ContentListItem, type ContentListItemData } from '@/components/ContentListItem'
import { SearchX } from 'lucide-react'

export const ContentList: React.FC<{
  items: Array<ContentListItemData & { href: string }>
}> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <SearchX className="w-10 h-10 mx-auto mb-3 text-brand-silver/30" />
        <p className="text-brand-silver mb-1">No content found</p>
        <p className="text-xs text-brand-silver/60">Try adjusting your filters or browse all content.</p>
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
