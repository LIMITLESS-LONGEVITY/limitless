import Link from 'next/link'
import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Page Not Found | PATHS by LIMITLESS',
  description: 'The page you are looking for does not exist or has been moved.',
}

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-brand-dark px-4 py-16">
      <div
        className="w-full max-w-lg rounded-2xl border border-brand-glass-border bg-brand-glass-bg p-10 text-center backdrop-blur-md sm:p-14"
        style={{ WebkitBackdropFilter: 'blur(12px)' }}
      >
        {/* 404 display */}
        <p className="font-display text-8xl font-bold tracking-wide text-brand-gold sm:text-9xl">
          404
        </p>

        {/* Heading */}
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-wide text-brand-light sm:text-4xl">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="mt-4 font-sans text-base leading-relaxed text-brand-silver">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you
          back on track.
        </p>

        {/* Decorative divider */}
        <div className="mx-auto mt-8 h-px w-24 bg-brand-gold/30" />

        {/* CTAs */}
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-brand-gold px-6 py-3 text-sm font-medium uppercase tracking-[0.15em] text-brand-gold transition-all duration-300 hover:bg-brand-gold hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            Back to Home
          </Link>
          <Link
            href="/courses"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-brand-glass-border px-6 py-3 text-sm font-medium uppercase tracking-[0.15em] text-brand-silver transition-all duration-300 hover:border-brand-silver hover:text-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-silver"
          >
            Browse Courses
          </Link>
        </div>
      </div>
    </div>
  )
}
