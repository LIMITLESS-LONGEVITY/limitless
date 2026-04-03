# PATHS Payload CMS — Phase 7: Account & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-facing account pages (profile, billing, enrolled courses) and mobile responsiveness (sidebar drawers, responsive list views, adaptive account nav).

**Architecture:** Next.js App Router account pages under `/account/` with a shared layout. A reusable `MobileSidebar` drawer component wraps existing sidebars for mobile. Responsive fixes use Tailwind classes — no new CSS or libraries.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Payload CMS 3.x REST API

**Spec:** `docs/superpowers/specs/2026-03-24-paths-phase7-account-polish-design.md`

**Depends on:** Phase 5 (Billing endpoints), Phase 6 (Content Pages — sidebars, components)

**Working directory:** `C:/Projects/LIMITLESS/limitless-paths/`

---

## File Structure

```
src/
├── app/(frontend)/
│   └── account/
│       ├── layout.tsx              # Account layout with nav (auth required)
│       ├── page.tsx                # Redirect to /account/profile
│       ├── profile/
│       │   └── page.tsx            # Profile settings form
│       ├── billing/
│       │   └── page.tsx            # Subscription status + tier selection
│       └── courses/
│           └── page.tsx            # Enrolled courses with progress
├── components/
│   ├── MobileSidebar/
│   │   └── index.tsx               # Reusable mobile drawer
│   ├── ArticleSidebar/
│   │   └── index.tsx               # Modified: add MobileSidebar wrapper
│   ├── CourseSidebar/
│   │   └── index.tsx               # Modified: add MobileSidebar wrapper
│   └── ContentListItem/
│       └── index.tsx               # Modified: responsive thumbnail
```

> **Note:** Frontend components are verified via `pnpm build` and visual inspection. No unit tests for React components (no existing pattern in this codebase).

---

## Task 1: Build MobileSidebar Component

**Files:**
- Create: `src/components/MobileSidebar/index.tsx`

- [ ] **Step 1: Create MobileSidebar component**

`src/components/MobileSidebar/index.tsx`:
```tsx
'use client'
import React, { useState, useEffect } from 'react'
import { cn } from '@/utilities/ui'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

export const MobileSidebar: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on navigation
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      {/* Trigger button — visible only on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-30 lg:hidden flex items-center justify-center w-12 h-12 rounded-full bg-card border border-border shadow-lg hover:bg-muted transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 left-0 h-full w-[280px] bg-background border-r border-border z-50 transform transition-transform duration-200 lg:hidden overflow-y-auto',
          open ? 'translate-x-0' : '-translate-x-full',
          className,
        )}
      >
        <div className="flex items-center justify-end p-4">
          <button
            onClick={() => setOpen(false)}
            className="p-1 hover:bg-muted rounded transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 pb-6">
          {children}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MobileSidebar/
git commit -m "Add MobileSidebar reusable drawer component for mobile navigation"
```

---

## Task 2: Add Mobile Support to ArticleSidebar and CourseSidebar

**Files:**
- Modify: `src/components/ArticleSidebar/index.tsx`
- Modify: `src/components/CourseSidebar/index.tsx`
- Modify: `src/components/ContentListItem/index.tsx`

- [ ] **Step 1: Modify ArticleSidebar to include MobileSidebar**

Read `src/components/ArticleSidebar/index.tsx`. The component currently uses `hidden lg:block` on its `<aside>` wrapper. Modify it to:

1. Keep the desktop rendering (`hidden lg:block`) as-is
2. Add a `MobileSidebar` rendering below it that wraps the same sidebar content

The pattern:
```tsx
// At the top, add import:
import { MobileSidebar } from '@/components/MobileSidebar'

// In the return, wrap with a fragment:
return (
  <>
    {/* Desktop sidebar */}
    <aside className="w-[240px] flex-shrink-0 hidden lg:block">
      <div className="sticky top-24 space-y-6">
        {/* ... existing sidebar content ... */}
      </div>
    </aside>

    {/* Mobile sidebar */}
    <MobileSidebar>
      <div className="space-y-6">
        {/* ... same sidebar content (extract to a shared variable or render function) ... */}
      </div>
    </MobileSidebar>
  </>
)
```

To avoid duplicating the sidebar content JSX, extract it into a `sidebarContent` variable or a `renderContent()` function and use it in both places.

- [ ] **Step 2: Modify CourseSidebar to include MobileSidebar**

Same pattern as ArticleSidebar. Read `src/components/CourseSidebar/index.tsx`, add the `MobileSidebar` import, and wrap the sidebar content for both desktop and mobile.

The desktop rendering uses `hidden lg:block` on the `<aside>`. Add a `MobileSidebar` wrapper for mobile with the same content.

- [ ] **Step 3: Make ContentListItem thumbnail responsive**

Read `src/components/ContentListItem/index.tsx`. The thumbnail div currently has a fixed width. Add `hidden sm:block` to hide it on very small screens:

Change:
```tsx
<div className="flex-shrink-0 w-[140px] h-[90px] rounded-lg overflow-hidden bg-muted">
```
To:
```tsx
<div className="flex-shrink-0 w-[140px] h-[90px] rounded-lg overflow-hidden bg-muted hidden sm:block">
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ArticleSidebar/ src/components/CourseSidebar/ src/components/ContentListItem/
git commit -m "Add mobile sidebar support and responsive thumbnail for content lists"
```

---

## Task 3: Build Account Layout and Redirect

**Files:**
- Create: `src/app/(frontend)/account/layout.tsx`
- Create: `src/app/(frontend)/account/page.tsx`

- [ ] **Step 1: Create account layout**

`src/app/(frontend)/account/layout.tsx`:
```tsx
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import React from 'react'
import Link from 'next/link'
import { AccountNav } from './AccountNav'

export const dynamic = 'force-dynamic'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()

  let user: any
  try {
    const auth = await payload.auth({ headers: headersList })
    user = auth.user
  } catch {}

  if (!user) return redirect('/admin')

  return (
    <div className="pt-24 pb-24">
      <div className="container">
        <h1 className="text-2xl font-bold mb-8">Account</h1>
        <div className="flex flex-col lg:flex-row gap-8">
          <AccountNav />
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
```

Create the `AccountNav` as a client component in the same directory:

`src/app/(frontend)/account/AccountNav.tsx`:
```tsx
'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utilities/ui'
import { User, CreditCard, BookOpen } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/account/profile', label: 'Profile', icon: User },
  { href: '/account/billing', label: 'Billing', icon: CreditCard },
  { href: '/account/courses', label: 'My Courses', icon: BookOpen },
]

export const AccountNav: React.FC = () => {
  const pathname = usePathname()

  return (
    <nav className="lg:w-[200px] flex-shrink-0">
      {/* Desktop: vertical nav */}
      <div className="hidden lg:flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === item.href
                ? 'bg-amber-500/10 text-amber-500 font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </div>

      {/* Mobile: horizontal tabs */}
      <div className="flex lg:hidden gap-1 border-b border-border pb-4 mb-4">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === item.href
                ? 'bg-amber-500/10 text-amber-500 font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Create account redirect page**

`src/app/(frontend)/account/page.tsx`:
```tsx
import { redirect } from 'next/navigation'

export default function AccountPage() {
  return redirect('/account/profile')
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(frontend\)/account/layout.tsx src/app/\(frontend\)/account/AccountNav.tsx src/app/\(frontend\)/account/page.tsx
git commit -m "Add account layout with responsive nav and auth-guarded redirect"
```

---

## Task 4: Build Profile Page

**Files:**
- Create: `src/app/(frontend)/account/profile/page.tsx`

- [ ] **Step 1: Create profile page**

`src/app/(frontend)/account/profile/page.tsx`:
```tsx
'use client'
import React, { useEffect, useState } from 'react'
import { cn } from '@/utilities/ui'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    fetch('/api/users/me')
      .then((res) => res.json())
      .then((data) => {
        const u = data.user
        setUser(u)
        setFirstName(u?.firstName || '')
        setLastName(u?.lastName || '')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully.' })
      } else {
        setMessage({ type: 'error', text: 'Failed to update profile.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong.' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }

    setSavingPassword(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      if (res.ok) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully.' })
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordMessage({ type: 'error', text: 'Failed to change password.' })
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'Something went wrong.' })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="firstName">First name</label>
            <input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Avatar</label>
            <p className="text-xs text-muted-foreground mb-2">Upload a profile photo. Accepted formats: JPG, PNG.</p>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !user) return
                setSaving(true)
                setMessage(null)
                try {
                  // Upload to media collection
                  const formData = new FormData()
                  formData.append('file', file)
                  formData.append('alt', `${firstName} ${lastName} avatar`)
                  const uploadRes = await fetch('/api/media', { method: 'POST', body: formData })
                  if (!uploadRes.ok) throw new Error('Upload failed')
                  const media = await uploadRes.json()
                  // Link to user
                  await fetch(`/api/users/${user.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avatar: media.doc.id }),
                  })
                  setMessage({ type: 'success', text: 'Avatar updated.' })
                } catch {
                  setMessage({ type: 'error', text: 'Failed to upload avatar.' })
                } finally { setSaving(false) }
              }}
              className="text-sm"
            />
          </div>
          {message && (
            <p className={cn('text-sm', message.type === 'success' ? 'text-green-500' : 'text-red-400')}>
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className={cn(
              'px-5 py-2 bg-amber-500/20 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors',
              saving && 'opacity-50 cursor-not-allowed',
            )}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <hr className="border-border" />

      <div>
        <h2 className="text-lg font-semibold mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          {passwordMessage && (
            <p className={cn('text-sm', passwordMessage.type === 'success' ? 'text-green-500' : 'text-red-400')}>
              {passwordMessage.text}
            </p>
          )}
          <button
            type="submit"
            disabled={savingPassword}
            className={cn(
              'px-5 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors',
              savingPassword && 'opacity-50 cursor-not-allowed',
            )}
          >
            {savingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(frontend\)/account/profile/
git commit -m "Add profile page with name editing and password change"
```

---

## Task 5: Build Billing Page

**Files:**
- Create: `src/app/(frontend)/account/billing/page.tsx`

- [ ] **Step 1: Create billing page**

`src/app/(frontend)/account/billing/page.tsx`:
```tsx
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import React from 'react'
import { BillingClient } from './BillingClient'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) return null // Layout handles redirect

  // Fetch user's active subscription
  const subscriptions = await payload.find({
    collection: 'subscriptions',
    where: {
      and: [
        { user: { equals: user.id } },
        { status: { in: ['active', 'past_due'] } },
      ],
    },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })

  const subscription = subscriptions.docs[0] as any | undefined

  // Fetch current tier
  const currentTier = typeof user.tier === 'object' ? user.tier : null

  // Fetch all active tiers for tier selection
  const tiers = await payload.find({
    collection: 'membership-tiers',
    where: { isActive: { equals: true } },
    sort: 'displayOrder',
    limit: 10,
  })

  return (
    <BillingClient
      subscription={subscription ? {
        id: subscription.id,
        status: subscription.status,
        billingInterval: subscription.billingInterval,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        tierName: typeof subscription.tier === 'object' ? subscription.tier.name : '',
      } : null}
      currentTier={currentTier ? {
        name: currentTier.name,
        accessLevel: currentTier.accessLevel,
      } : { name: 'Free', accessLevel: 'free' }}
      tiers={tiers.docs.map((t: any) => ({
        id: t.id,
        name: t.name,
        accessLevel: t.accessLevel,
        monthlyPrice: t.monthlyPrice,
        yearlyPrice: t.yearlyPrice,
        features: t.features?.map((f: any) => f.feature) || [],
      }))}
      hasStripeCustomer={!!(user as any).stripeCustomerId}
      successParam={false}
      cancelledParam={false}
    />
  )
}
```

Create the client component:

`src/app/(frontend)/account/billing/BillingClient.tsx`:
```tsx
'use client'
import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import { useSearchParams } from 'next/navigation'
import { Check, CreditCard, AlertTriangle } from 'lucide-react'

type Subscription = {
  id: string
  status: string
  billingInterval: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  tierName: string
}

type Tier = {
  id: string
  name: string
  accessLevel: string
  monthlyPrice?: number | null
  yearlyPrice?: number | null
  features: string[]
}

export const BillingClient: React.FC<{
  subscription: Subscription | null
  currentTier: { name: string; accessLevel: string }
  tiers: Tier[]
  hasStripeCustomer: boolean
  successParam: boolean
  cancelledParam: boolean
}> = ({ subscription, currentTier, tiers, hasStripeCustomer }) => {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === 'true'
  const cancelled = searchParams.get('cancelled') === 'true'
  const [loading, setLoading] = useState<string | null>(null)

  const handleManageSubscription = async () => {
    setLoading('portal')
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {} finally { setLoading(null) }
  }

  const handleSubscribe = async (tierId: string, interval: 'monthly' | 'yearly') => {
    setLoading(`${tierId}-${interval}`)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId, interval }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {} finally { setLoading(null) }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Billing</h2>

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-500">
          Subscription activated successfully!
        </div>
      )}
      {cancelled && (
        <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          Checkout was cancelled. No changes were made.
        </div>
      )}

      {/* Current subscription */}
      <div className="p-5 border border-border rounded-xl">
        <p className="text-sm text-muted-foreground mb-1">Current plan</p>
        <p className="text-xl font-bold">{subscription ? subscription.tierName : currentTier.name}</p>

        {subscription && (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-muted-foreground">
              {subscription.billingInterval === 'yearly' ? 'Yearly' : 'Monthly'} billing
              {subscription.currentPeriodEnd && (
                <> &middot; Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</>
              )}
            </p>
            {subscription.cancelAtPeriodEnd && (
              <div className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="w-4 h-4" />
                Your subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </div>
            )}
            {subscription.status === 'past_due' && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                Payment failed. Please update your payment method.
              </div>
            )}
          </div>
        )}

        {subscription && (
          <button
            onClick={handleManageSubscription}
            disabled={loading === 'portal'}
            className={cn(
              'mt-4 flex items-center gap-2 px-4 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors',
              loading === 'portal' && 'opacity-50 cursor-not-allowed',
            )}
          >
            <CreditCard className="w-4 h-4" />
            {loading === 'portal' ? 'Redirecting...' : 'Manage Subscription'}
          </button>
        )}
      </div>

      {/* Tier selection (only when no active subscription) */}
      {!subscription && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold">Choose a plan</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {tiers
              .filter((t) => t.accessLevel !== 'free')
              .map((tier) => (
                <div key={tier.id} className="p-5 border border-border rounded-xl">
                  <h4 className="font-semibold mb-1">{tier.name}</h4>
                  <div className="text-sm text-muted-foreground mb-3">
                    {tier.monthlyPrice != null && <span>${tier.monthlyPrice}/mo</span>}
                    {tier.monthlyPrice != null && tier.yearlyPrice != null && <span> &middot; </span>}
                    {tier.yearlyPrice != null && <span>${tier.yearlyPrice}/yr</span>}
                  </div>
                  {tier.features.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                      {tier.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    {tier.monthlyPrice != null && (
                      <button
                        onClick={() => handleSubscribe(tier.id, 'monthly')}
                        disabled={loading !== null}
                        className={cn(
                          'flex-1 px-3 py-2 bg-amber-500/20 text-amber-500 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition-colors',
                          loading !== null && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        {loading === `${tier.id}-monthly` ? 'Redirecting...' : 'Monthly'}
                      </button>
                    )}
                    {tier.yearlyPrice != null && (
                      <button
                        onClick={() => handleSubscribe(tier.id, 'yearly')}
                        disabled={loading !== null}
                        className={cn(
                          'flex-1 px-3 py-2 bg-amber-500/20 text-amber-500 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition-colors',
                          loading !== null && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        {loading === `${tier.id}-yearly` ? 'Redirecting...' : 'Yearly'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(frontend\)/account/billing/
git commit -m "Add billing page with subscription status, tier selection, and Stripe portal"
```

---

## Task 6: Build My Courses Page

**Files:**
- Create: `src/app/(frontend)/account/courses/page.tsx`

- [ ] **Step 1: Create my courses page**

`src/app/(frontend)/account/courses/page.tsx`:
```tsx
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import React from 'react'
import Link from 'next/link'
import { Media } from '@/components/Media'
import { CheckCircle2, Clock, BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MyCoursesPage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) return null

  const enrollments = await payload.find({
    collection: 'enrollments',
    where: { user: { equals: user.id } },
    sort: '-enrolledAt',
    depth: 1,
    limit: 50,
    overrideAccess: true,
  })

  if (enrollments.docs.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-muted-foreground mb-4">You haven&apos;t enrolled in any courses yet.</p>
        <Link
          href="/courses"
          className="px-5 py-2.5 bg-amber-500/20 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
        >
          Browse Courses
        </Link>
      </div>
    )
  }

  const STATUS_STYLES: Record<string, string> = {
    active: 'text-amber-500 bg-amber-500/10',
    completed: 'text-green-500 bg-green-500/10',
    cancelled: 'text-muted-foreground bg-muted',
    expired: 'text-muted-foreground bg-muted',
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">My Courses</h2>
      {enrollments.docs.map((enrollment: any) => {
        const course = typeof enrollment.course === 'object' ? enrollment.course : null
        if (!course) return null

        return (
          <div key={enrollment.id} className="flex gap-4 p-4 rounded-lg border border-border items-center">
            {course.featuredImage && typeof course.featuredImage !== 'string' && (
              <div className="flex-shrink-0 w-[120px] h-[80px] rounded-lg overflow-hidden bg-muted hidden sm:block">
                <Media resource={course.featuredImage} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link href={`/courses/${course.slug}`} className="text-sm font-semibold hover:text-amber-500 transition-colors truncate">
                  {course.title}
                </Link>
                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${STATUS_STYLES[enrollment.status] || ''}`}>
                  {enrollment.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                {enrollment.status === 'completed' && enrollment.completedAt && (
                  <> &middot; Completed {new Date(enrollment.completedAt).toLocaleDateString()}</>
                )}
              </p>
              {enrollment.status === 'active' && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full max-w-[200px]">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${enrollment.completionPercentage ?? 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{enrollment.completionPercentage ?? 0}%</span>
                </div>
              )}
            </div>
            <Link
              href={`/courses/${course.slug}`}
              className="px-3 py-1.5 bg-muted rounded-lg text-xs hover:bg-muted/80 transition-colors whitespace-nowrap flex-shrink-0"
            >
              {enrollment.status === 'completed' ? 'Revisit' : 'Continue'}
            </Link>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(frontend\)/account/courses/
git commit -m "Add my courses page with enrollment list and progress bars"
```

---

## Task 7: Build Verification

**Files:** No new files — verification only.

- [ ] **Step 1: Run production build**

```bash
pnpm build
```

Expected: Build succeeds. All account routes and content page routes visible in output.

- [ ] **Step 2: Run all existing tests**

```bash
pnpm vitest run
```

Expected: All 78 unit tests still pass.

- [ ] **Step 3: Verify routes in build output**

Check for:
- `/account` (redirect)
- `/account/profile`
- `/account/billing`
- `/account/courses`
- `/articles` + `/articles/[slug]`
- `/courses` + `/courses/[slug]` + `/courses/[slug]/lessons/[lessonSlug]`

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "Fix build issues from Phase 7 account and polish"
```

---

## Phase 7 Milestone Checklist

After completing all 7 tasks, verify:

- [ ] MobileSidebar drawer works as a reusable wrapper
- [ ] ArticleSidebar shows mobile trigger button on small screens
- [ ] CourseSidebar shows mobile trigger button on small screens
- [ ] ContentListItem hides thumbnail on very small screens
- [ ] Account layout with responsive nav (vertical desktop, horizontal tabs mobile)
- [ ] Auth guard redirects to login when not authenticated
- [ ] Profile page: edit name, change password, inline feedback
- [ ] Billing page: subscription status display, Stripe portal redirect, tier selection cards
- [ ] My Courses page: enrollment list with progress, empty state
- [ ] All existing backend tests pass
- [ ] Production build succeeds

**Deferred to post-launch:**
- Custom admin dashboard widgets
- SEO fine-tuning
- Performance optimization
- Custom login/registration page (currently uses Payload admin)

**Next:** Launch preparation (DNS, Sentry, production env, smoke testing)
