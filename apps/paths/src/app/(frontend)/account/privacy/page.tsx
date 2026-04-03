import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import React from 'react'
import PrivacyClient from './PrivacyClient'

export const dynamic = 'force-dynamic'

export default async function PrivacyPage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()

  let user: any
  try {
    const auth = await payload.auth({ headers: headersList })
    user = auth.user
  } catch {}

  if (!user) return redirect('/login')

  return <PrivacyClient userId={user.id as string} />
}
