import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { guideRoles } from '../../../../content/guide/manifest'
import {
  User,
  Crown,
  Building2,
  PenTool,
  FileCheck,
  Globe,
  Shield,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Platform Guide',
  description: 'Comprehensive guide for using the PATHS longevity education platform — for learners, contributors, editors, publishers, and admins.',
}

const iconMap: Record<string, React.ReactNode> = {
  User: <User className="w-8 h-8" />,
  Crown: <Crown className="w-8 h-8" />,
  Building2: <Building2 className="w-8 h-8" />,
  PenTool: <PenTool className="w-8 h-8" />,
  FileCheck: <FileCheck className="w-8 h-8" />,
  Globe: <Globe className="w-8 h-8" />,
  Shield: <Shield className="w-8 h-8" />,
}

const roleAccentColors: Record<string, string> = {
  'user-free': 'group-hover:text-foreground',
  'user-paid': 'group-hover:text-brand-gold',
  'user-organization': 'group-hover:text-brand-teal',
  contributor: 'group-hover:text-purple-400',
  editor: 'group-hover:text-blue-400',
  publisher: 'group-hover:text-green-400',
  admin: 'group-hover:text-red-400',
}

export default function GuidePage() {
  return (
    <div className="pb-16 px-6 lg:px-12 pt-8">
      <div className="max-w-4xl">
        {/* Header */}
        <h1 className="text-4xl font-display font-bold text-foreground mb-3">
          Platform Guide
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl">
          Everything you need to know about using PATHS — from browsing content as a free user to
          managing the entire platform as an admin. Choose your role below to get started.
        </p>

        {/* Role cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guideRoles.map((role) => (
            <Link
              key={role.slug}
              href={`/guide/${role.slug}`}
              className="group block p-6 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all hover:border-border/80"
            >
              <div className="flex items-start gap-4">
                <div className={`text-muted-foreground transition-colors ${roleAccentColors[role.slug]}`}>
                  {iconMap[role.icon] || <User className="w-8 h-8" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    {role.label}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {role.description}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    {role.topics.length} topics
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
