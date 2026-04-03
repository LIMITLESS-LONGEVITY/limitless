'use client'
import React, { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/utilities/ui'
import Link from 'next/link'
import { useAuth } from '@/providers/Auth'
import { apiUrl } from '@/utilities/apiUrl'

/**
 * Validate that a redirect URL is safe (same-origin).
 * Allows paths starting with `/` but rejects protocol-relative URLs and absolute URLs to other hosts.
 */
function isValidRedirect(url: string): boolean {
  if (!url) return false
  // Must start with `/` and must NOT start with `//` (protocol-relative)
  if (!url.startsWith('/') || url.startsWith('//')) return false
  try {
    // Parse against a dummy base — if the resulting origin differs, it's not same-origin
    const parsed = new URL(url, window.location.origin)
    return parsed.origin === window.location.origin
  } catch {
    return false
  }
}

export default function LoginForm() {
  const searchParams = useSearchParams()
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)

    try {
      const res = await fetch(apiUrl('/api/users/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (res.ok) {
        if (data.user) auth.setUser(data.user)
        setMessage({ type: 'success', text: 'Signed in! Redirecting...' })
        const redirectTo = searchParams.get('redirect')
        const destination = redirectTo && isValidRedirect(redirectTo) ? redirectTo : '/courses'
        setTimeout(() => { window.location.href = destination }, 1000)
      } else {
        setMessage({ type: 'error', text: data.errors?.[0]?.message || 'Invalid email or password.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const inputClasses =
    'w-full px-4 py-3 bg-brand-glass-bg border border-brand-glass-border rounded-lg text-sm text-brand-light placeholder:text-brand-silver/50 outline-none focus:ring-1 focus:ring-brand-gold/50 focus:border-brand-gold/30 transition-colors'

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4 pt-24 pb-16">
      <div
        className="w-full max-w-md rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-8 md:p-10"
        style={{ WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold text-brand-light tracking-wide">
            Sign In
          </h1>
          <p className="mt-2 text-sm text-brand-silver">
            Welcome back to PATHS
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-brand-silver mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className={inputClasses}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-brand-silver" htmlFor="password">
                Password
              </label>
              <Link href="/forgot-password" className="text-brand-gold text-xs hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className={inputClasses}
            />
          </div>

          {message && (
            <p
              className={cn(
                'text-sm text-center',
                message.type === 'success' ? 'text-green-400' : 'text-red-400',
              )}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'w-full py-3 rounded-full text-sm font-medium uppercase tracking-[0.15em] transition-all duration-300',
              'border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark',
              'focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none',
              'min-h-[44px]',
              submitting && 'opacity-50 cursor-not-allowed',
            )}
          >
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-silver">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-brand-gold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
