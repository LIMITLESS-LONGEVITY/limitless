import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'

export const metadata: Metadata = {
  title: {
    default: 'HUB | LIMITLESS Longevity',
    template: '%s | HUB by LIMITLESS',
  },
  description: 'Clinical & hospitality booking platform — memberships, diagnostics, hotel stays, telemedicine.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-brand-dark text-white antialiased font-sans">
        <Header />
        <div className="pt-[73px]">
          {children}
        </div>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  )
}
