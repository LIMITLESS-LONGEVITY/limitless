'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utilities/ui'
import { MobileSidebar } from '@/components/MobileSidebar'
import { GuideSearch } from './GuideSearch'
import { guideRoles } from '../../../content/guide/manifest'
import {
  ChevronDown,
  ChevronRight,
  User,
  Crown,
  Building2,
  PenTool,
  FileCheck,
  Globe,
  Shield,
  BookOpen,
} from 'lucide-react'

const iconMap: Record<string, React.ReactNode> = {
  User: <User className="w-4 h-4" />,
  Crown: <Crown className="w-4 h-4" />,
  Building2: <Building2 className="w-4 h-4" />,
  PenTool: <PenTool className="w-4 h-4" />,
  FileCheck: <FileCheck className="w-4 h-4" />,
  Globe: <Globe className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
}

export const GuideSidebar: React.FC = () => {
  const pathname = usePathname()

  // Determine which role is currently active based on the URL
  const activeRole = guideRoles.find((r) => pathname.startsWith(`/guide/${r.slug}`))

  // Expand the active role by default, plus allow manual toggle
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (activeRole) initial.add(activeRole.slug)
    return initial
  })

  const toggleRole = (slug: string) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
      }
      return next
    })
  }

  const sidebarContent = (
    <div>
      <Link
        href="/guide"
        className="flex items-center gap-2 text-sm font-bold hover:text-brand-gold transition-colors mb-4"
      >
        <BookOpen className="w-4 h-4" />
        Platform Guide
      </Link>

      <GuideSearch className="mb-4" />

      <div className="space-y-1">
        {guideRoles.map((role) => {
          const isExpanded = expandedRoles.has(role.slug)
          const isActiveRole = activeRole?.slug === role.slug

          return (
            <div key={role.slug}>
              {/* Role header — collapsible */}
              <button
                onClick={() => toggleRole(role.slug)}
                className={cn(
                  'w-full flex items-center gap-2 py-2 px-2 rounded text-xs font-semibold uppercase tracking-wide transition-colors',
                  isActiveRole
                    ? 'text-brand-gold bg-brand-gold/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                {iconMap[role.icon] || <User className="w-4 h-4" />}
                <span className="flex-1 text-left truncate">{role.label}</span>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                )}
              </button>

              {/* Topics list */}
              {isExpanded && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {role.topics.map((topic) => {
                    const topicPath = `/guide/${role.slug}/${topic.slug}`
                    const isActive = pathname === topicPath

                    return (
                      <Link
                        key={topic.slug}
                        href={topicPath}
                        className={cn(
                          'block py-1.5 px-2 rounded text-xs transition-colors',
                          isActive
                            ? 'text-brand-gold font-semibold bg-brand-gold/5'
                            : 'text-foreground/70 hover:text-foreground hover:bg-muted/50',
                        )}
                      >
                        {topic.title}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      <aside className="w-[260px] flex-shrink-0 hidden lg:block border-r border-border">
        <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto p-4">
          {sidebarContent}
        </div>
      </aside>
      <MobileSidebar>
        {sidebarContent}
      </MobileSidebar>
    </>
  )
}
