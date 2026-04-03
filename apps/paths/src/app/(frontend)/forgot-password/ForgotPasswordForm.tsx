'use client'
import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import { apiUrl } from '@/utilities/apiUrl'
import Link from 'next/link'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)

    try {
      const res = await fetch(apiUrl('/api/users/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setMessage({
          type: 'success',
          text: 'Check your email for a password reset link.',
        })
      } else {
        const data = await res.json()
        setMessage({
          type: 'error',
          text: data.errors?.[0]?.message || 'Something went wrong. Please try again.',
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
            Forgot Password
          </h1>
          <p className="mt-2 text-sm text-brand-silver">
            Enter your email and we&apos;ll send you a reset link
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
            {submitting ? 'Sending...' : 'Send Reset Link'}
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
