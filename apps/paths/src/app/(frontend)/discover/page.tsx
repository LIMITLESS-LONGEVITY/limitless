import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import DiscoverClient from './DiscoverClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Discover Your Learning Path',
  description:
    'Describe your health goals and our AI will build a personalized learning path from our expert-curated content library.',
  openGraph: {
    title: 'Discover | PATHS by LIMITLESS',
    description: 'AI-powered personalized learning paths for your longevity goals.',
    type: 'website',
  },
}

export default async function DiscoverPage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()

  let isAuthenticated = false
  try {
    const auth = await payload.auth({ headers: headersList })
    isAuthenticated = !!auth.user
  } catch {}

  return <DiscoverClient isAuthenticated={isAuthenticated} />
}
