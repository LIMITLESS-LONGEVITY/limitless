'use client'
import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/utilities/ui'
import Link from 'next/link'
import { useAuth } from '@/providers/Auth'
import { apiUrl } from '@/utilities/apiUrl'

function VerifyEmailFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const pending = searchParams.get('pending')
  const auth = useAuth()

  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Auto-verify when token is present
  const verify = useCallback(async () => {
    if (!token || verifying) return
    setVerifying(true)
    setMessage(null)

    try {
      const res = await fetch(apiUrl(`/api/users/verify/${token}`), {
        method: 'POST',
        credentials: 'include',
      })

      if (res.ok) {
        // Refresh auth state
        const meRes = await fetch(apiUrl('/api/users/me'), { credentials: 'include' })
        if (meRes.ok) {
          const meData = await meRes.json()
          if (meData.user) auth.setUser(meData.user)
        }
        setMessage({ type: 'success', text: 'Email verified! Redirecting...' })
        setTimeout(() => router.push('/courses'), 2000)
      } else {
        setMessage({ type: 'error', text: 'Verification failed. The link may have expired.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setVerifying(false)
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (token) verify()
  }, [verify, token])

  const handleResend = async () => {
    setResending(true)
    setMessage(null)
    try {
      const res = await fetch(apiUrl('/api/auth/resend-verification'), {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: 'Verification email sent! Check your inbox.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to resend. Please try again.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong.' })
    } finally {
      setResending(false)
    }
  }

  // Pending mode — waiting for user to check email
  if (pending && !token) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4 pt-24 pb-16">
        <div
          className="w-full max-w-md rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-8 md:p-10 text-center"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          {/* Email icon */}
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-4 text-brand-gold" aria-hidden="true">
            <rect x="4" y="10" width="40" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
            <path d="M4 14l20 14 20-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="font-display text-3xl font-semibold text-brand-light tracking-wide mb-3">
            Check Your Email
          </h1>
          <p className="text-brand-silver text-sm leading-relaxed mb-6">
            We&apos;ve sent a verification link to your email address. Click the link to verify your account.
          </p>

          {message && (
            <p className={cn('text-sm mb-4', message.type === 'success' ? 'text-green-400' : 'text-red-400')}>
              {message.text}
            </p>
          )}

          <button
            onClick={handleResend}
            disabled={resending}
            className={cn(
              'text-brand-gold text-sm hover:underline transition-colors',
              resending && 'opacity-50 cursor-not-allowed',
            )}
          >
            {resending ? 'Sending...' : "Didn't receive it? Resend"}
          </button>

          <div className="mt-6">
            <Link
              href="/courses"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium uppercase tracking-[0.15em] border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark transition-all duration-300 min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none"
            >
              Continue to Courses
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Token verification mode
  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4 pt-24 pb-16">
      <div
        className="w-full max-w-md rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-8 md:p-10 text-center"
        style={{ WebkitBackdropFilter: 'blur(12px)' }}
      >
        <h1 className="font-display text-3xl font-semibold text-brand-light tracking-wide mb-3">
          {verifying ? 'Verifying...' : message?.type === 'success' ? 'Email Verified' : 'Verify Email'}
        </h1>

        {verifying && (
          <div className="w-8 h-8 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin mx-auto my-6" />
        )}

        {message && (
          <p className={cn('text-sm mt-4', message.type === 'success' ? 'text-green-400' : 'text-red-400')}>
            {message.text}
          </p>
        )}

        {message?.type === 'error' && (
          <div className="mt-6 space-y-3">
            <button
              onClick={handleResend}
              disabled={resending}
              className={cn(
                'text-brand-gold text-sm hover:underline',
                resending && 'opacity-50',
              )}
            >
              {resending ? 'Sending...' : 'Resend verification email'}
            </button>
            <div>
              <Link href="/login" className="text-brand-silver text-sm hover:text-brand-gold">
                Back to login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailForm() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-dark flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyEmailFormInner />
    </Suspense>
  )
}
