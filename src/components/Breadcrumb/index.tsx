import React from 'react'
import Link from 'next/link'

type BreadcrumbItem = {
  label: string
  href?: string
}

export const Breadcrumb: React.FC<{
  items: BreadcrumbItem[]
}> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex items-center gap-1.5 text-xs">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-brand-silver/40" aria-hidden="true">›</span>}
            {item.href && i < items.length - 1 ? (
              <Link
                href={item.href}
                className="text-brand-silver hover:text-brand-light transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-brand-silver/60 truncate max-w-[200px]">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
