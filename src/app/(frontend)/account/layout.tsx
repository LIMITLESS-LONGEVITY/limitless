import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import React from 'react'
import { AccountNav } from './AccountNav'
import { isTenantManager } from '@/utilities/isTenantManager'

export const dynamic = 'force-dynamic'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()

  let user: any
  try {
    const auth = await payload.auth({ headers: headersList })
    user = auth.user
  } catch {}

  if (!user) return redirect('/login')

  return (
    <div className="pt-24 pb-24">
      <div className="container">
        {!user._verified && (
          <div className="mb-6 rounded-xl border border-brand-gold/20 bg-brand-gold-dim px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <p className="text-sm text-brand-silver flex-1">
              Your email is not verified. Check your inbox or{' '}
              <a href="/verify-email?pending=true" className="text-brand-gold hover:underline">
                resend verification email
              </a>
              .
            </p>
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-8">
          <AccountNav isManager={isTenantManager(user)} />
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
