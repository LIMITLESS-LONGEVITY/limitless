'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import type { Header } from '@/payload-types'

import { HeaderNav } from './Nav'
import { AuthSection } from './AuthSection'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import type { OSConfig } from './types'

interface HeaderClientProps {
  data: Header
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  const [theme, setTheme] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [osConfig, setOsConfig] = useState<OSConfig | null>(null)
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()

  useEffect(() => {
    // Defer state updates to avoid synchronous setState in effect
    queueMicrotask(() => {
      setHeaderTheme(null)
      setMobileOpen(false)
    })
  }, [pathname, setHeaderTheme])

  useEffect(() => {
    if (headerTheme && headerTheme !== theme) {
      queueMicrotask(() => setTheme(headerTheme))
    }
  }, [headerTheme, theme])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll() // initialize
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Fetch OS config on mount (parallel with existing auth fetch)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/twin/os/config', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('OS config fetch failed'))))
      .then((data: OSConfig) => setOsConfig(data))
      .catch(() => {
        // Silently fail — AuthSection uses hardcoded fallback
      })
    return () => controller.abort()
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-brand-dark/90 backdrop-blur-md border-b border-brand-glass-border'
          : 'bg-transparent'
      }`}
      style={scrolled ? { WebkitBackdropFilter: 'blur(12px)' } : undefined}
      {...(theme ? { 'data-theme': theme } : {})}
    >
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- cross-app nav to gateway root */}
        <a
          href="/"
          className="shrink-0 font-display text-2xl font-semibold tracking-[0.12em] text-brand-gold hover:text-brand-gold/80 transition-colors"
          aria-label="LIMITLESS"
        >
          LIMITLESS
        </a>

        {/* Desktop: nav + auth */}
        <div className="hidden md:flex items-center gap-6">
          <HeaderNav data={data} />
          <div className="w-px h-5 bg-brand-glass-border" aria-hidden="true" />
          <LocaleSwitcher />
          <div className="w-px h-5 bg-brand-glass-border" aria-hidden="true" />
          <AuthSection osConfig={osConfig} />
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-brand-light focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none rounded"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden bg-brand-dark/95 backdrop-blur-md border-t border-brand-glass-border px-6 py-6"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          <HeaderNav data={data} mobile />
          <div className="h-px bg-brand-glass-border my-4" aria-hidden="true" />
          <div className="mb-4">
            <LocaleSwitcher />
          </div>
          <div className="h-px bg-brand-glass-border my-4" aria-hidden="true" />
          <AuthSection mobile osConfig={osConfig} />
        </div>
      )}
    </header>
  )
}
