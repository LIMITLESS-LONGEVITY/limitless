import { getCachedGlobal } from '@/utilities/getGlobals'
import Link from 'next/link'
import React from 'react'
import { getTranslations } from 'next-intl/server'

import type { Footer } from '@/payload-types'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { CMSLink } from '@/components/Link'
import { FeedbackTrigger } from '@/components/FeedbackTrigger'
import { ManageCookiesLink } from '@/components/CookieConsent/ManageCookiesLink'
import { Logo } from '@/components/Logo/Logo'

const PLATFORM_LINKS = [
  { href: '/courses', key: 'courses' },
  { href: '/articles', key: 'articles' },
  { href: '/discover', key: 'discover' },
  { href: '/guide', key: 'platformGuide' },
] as const

const ACCOUNT_LINKS = [
  { href: '/account', key: 'dashboardLink' },
  { href: '/account/health', key: 'healthProfile' },
  { href: '/account/certificates', key: 'certificates' },
  { href: '/account/billing', key: 'billing' },
] as const

const COMPANY_LINKS = [
  { href: '/book/contact-sales', key: 'enterpriseSales' },
  { href: '/book/diagnostics', key: 'diagnosticPackages' },
] as const

export async function Footer() {
  const footerData: Footer = await (await getCachedGlobal('footer', 1))()
  const navItems = footerData?.navItems || []
  const t = await getTranslations('footer')

  return (
    <footer className="mt-auto bg-brand-dark text-white relative">
      {/* Gold accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent" />

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Column 1: Logo + tagline */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-3">
              <Logo className="text-brand-light" />
            </Link>
            <p className="text-brand-silver text-xs leading-relaxed mb-4">
              {t('tagline')}
            </p>
            <p className="text-brand-silver/50 text-[10px]">
              {t('copyright', { year: new Date().getFullYear() })}
              <br />{t('allRightsReserved')}
            </p>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-silver mb-4">
              {t('platform')}
            </h3>
            <ul className="space-y-2.5">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-brand-silver/70 hover:text-brand-gold text-xs transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Account */}
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-silver mb-4">
              {t('account')}
            </h3>
            <ul className="space-y-2.5">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-brand-silver/70 hover:text-brand-gold text-xs transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-silver mb-4">
              {t('company')}
            </h3>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-brand-silver/70 hover:text-brand-gold text-xs transition-colors"
                  >
                    {t(link.key)}
                  </a>
                </li>
              ))}
              {navItems.map(({ link }, i) => (
                <li key={i}>
                  <CMSLink
                    className="text-brand-silver/70 hover:text-brand-gold text-xs transition-colors"
                    {...link}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-brand-glass-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-brand-silver/40 text-[10px]">
              {t('location')}
            </p>
            <span className="text-brand-silver/20 text-[10px]">&middot;</span>
            <FeedbackTrigger />
            <span className="text-brand-silver/20 text-[10px]">&middot;</span>
            <ManageCookiesLink />
          </div>
          <div className="flex items-center gap-4">
            <ThemeSelector />
            <a
              href="https://www.linkedin.com/company/limitless-longevity"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-silver/40 hover:text-brand-gold transition-colors"
              aria-label="LinkedIn"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
