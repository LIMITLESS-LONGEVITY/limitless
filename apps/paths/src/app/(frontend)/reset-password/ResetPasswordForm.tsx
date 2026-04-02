'use client'
import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/utilities/ui'
import { apiUrl } from '@/utilities/apiUrl'
import Link from 'next/link'

function ResetPasswordFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    if (!token) {
      setMessage({ type: 'error', text: 'Missing reset token. Please use the link from your email.' })
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(apiUrl('/api/users/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Password reset! Redirecting to login...' })
        setTimeout(() => router.push('/login'), 2000)
      } else {
        const data = await res.json()
        setMessage({
          type: 'error',
          text: data.errors?.[0]?.message || 'Reset failed. The link may have expired.',
        })
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
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-brand-silver">
            Choose a new password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              className="block text-xs font-medium text-brand-silver mb-1.5"
              htmlFor="password"
            >
              New Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className={inputClasses}
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium text-brand-silver mb-1.5"
              htmlFor="confirmPassword"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
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
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-silver">
          Remember your password?{' '}
          <Link href="/login" className="text-brand-gold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-dark flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordFormInner />
    </Suspense>
  )
}
