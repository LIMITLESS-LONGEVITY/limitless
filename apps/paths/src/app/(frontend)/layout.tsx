import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import React from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getLocale } from 'next-intl/server'

import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { CookieConsent } from '@/components/CookieConsent'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html className={cn(cormorant.variable, inter.variable)} lang={locale} suppressHydrationWarning>
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <Header />
            {children}
            <Footer />
            <CookieConsent />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  title: {
    template: '%s | PATHS by LIMITLESS',
    default: 'PATHS by LIMITLESS — Longevity Education Platform',
  },
  description:
    'Evidence-based longevity education for executives and high-performers. Courses, articles, and AI-powered learning — all in one platform.',
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@limitaboreu',
  },
}
