import React from 'react'
import type { Metadata } from 'next'
import { GuideSidebar } from '@/components/guide/GuideSidebar'

export const metadata: Metadata = {
  title: {
    template: '%s | PATHS Guide',
    default: 'Platform Guide | PATHS by LIMITLESS',
  },
  description: 'Comprehensive guide for using the PATHS longevity education platform.',
}

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pt-24">
      <div className="container mx-auto flex">
        <GuideSidebar />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
