import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRoleBySlug } from '../../../../../content/guide/manifest'
import { guideContentExists } from '@/utilities/mdx'
import {
  User,
  Crown,
  Building2,
  PenTool,
  FileCheck,
  Globe,
  Shield,
  ArrowRight,
} from 'lucide-react'

const iconMap: Record<string, React.ReactNode> = {
  User: <User className="w-6 h-6" />,
  Crown: <Crown className="w-6 h-6" />,
  Building2: <Building2 className="w-6 h-6" />,
  PenTool: <PenTool className="w-6 h-6" />,
  FileCheck: <FileCheck className="w-6 h-6" />,
  Globe: <Globe className="w-6 h-6" />,
  Shield: <Shield className="w-6 h-6" />,
}

export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{ role: string }>
}

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { role: roleSlug } = await params
  const role = getRoleBySlug(roleSlug)
  if (!role) return {}
  return {
    title: `${role.label} Guide`,
    description: role.description,
  }
}

export default async function RoleIndexPage({ params }: Args) {
  const { role: roleSlug } = await params
  const role = getRoleBySlug(roleSlug)

  if (!role) {
    notFound()
  }

  return (
    <div className="pb-16 px-6 lg:px-12 pt-8">
      <div className="max-w-3xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <Link href="/guide" className="hover:text-foreground transition-colors">
            Guide
          </Link>
          <span>/</span>
          <span className="text-foreground">{role.label}</span>
        </nav>

        {/* Role header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="text-brand-gold">
            {iconMap[role.icon] || <User className="w-6 h-6" />}
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {role.label} Guide
          </h1>
        </div>
        <p className="text-muted-foreground mb-8">
          {role.description}
        </p>

        {/* Topics list */}
        <div className="space-y-2">
          {role.topics.map((topic, index) => {
            const hasContent = guideContentExists(role.slug, topic.slug)
            return (
              <Link
                key={topic.slug}
                href={`/guide/${role.slug}/${topic.slug}`}
                className="group flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-all"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-brand-gold transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {topic.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!hasContent && (
                    <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wide">Coming soon</span>
                  )}
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-brand-gold transition-colors" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
