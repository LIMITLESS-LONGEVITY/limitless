'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { SearchIcon, HomeIcon } from 'lucide-react'

const CONTENT_NAV_KEYS = [
  { href: '/courses', key: 'courses' },
  { href: '/articles', key: 'articles' },
  { href: '/discover', key: 'discover' },
  { href: '/guide', key: 'guide' },
] as const

export const HeaderNav: React.FC<{ data: HeaderType; mobile?: boolean }> = ({ data, mobile }) => {
  const navItems = data?.navItems || []
  const pathname = usePathname()
  const t = useTranslations('nav')

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const linkClasses = (active: boolean) =>
    `${active ? 'text-brand-gold' : 'text-brand-silver hover:text-brand-gold'} text-xs uppercase tracking-[0.15em] font-sans font-medium transition-colors`

  return (
    <nav
      aria-label="Main navigation"
      className={mobile ? 'flex flex-col gap-4' : 'flex gap-6 items-center'}
    >
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- cross-app nav to OS Dashboard */}
      <a
        href="/"
        className="text-brand-silver/60 hover:text-brand-gold transition-colors"
        title={t('dashboard')}
      >
        <HomeIcon className="w-4 h-4" />
      </a>
      {CONTENT_NAV_KEYS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={linkClasses(isActive(item.href))}
          {...(isActive(item.href) ? { 'aria-current': 'page' as const } : {})}
        >
          {t(item.key)}
        </Link>
      ))}
      {navItems.map(({ link }, i) => {
        return (
          <CMSLink
            key={i}
            {...link}
            appearance="link"
            className="text-brand-silver hover:text-brand-gold text-xs uppercase tracking-[0.15em] font-sans font-medium transition-colors"
          />
        )
      })}
      <Link
        href="/search"
        className={`${isActive('/search') ? 'text-brand-gold' : 'text-brand-silver hover:text-brand-gold'} transition-colors`}
        {...(isActive('/search') ? { 'aria-current': 'page' as const } : {})}
      >
        <span className="sr-only">{t('search')}</span>
        <SearchIcon className="w-4 h-4" />
      </Link>
    </nav>
  )
}
