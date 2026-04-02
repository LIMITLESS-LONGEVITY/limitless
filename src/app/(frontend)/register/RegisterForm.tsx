'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/utilities/ui'
import Link from 'next/link'
import { useAuth } from '@/providers/Auth'
import { apiUrl } from '@/utilities/apiUrl'

export default function RegisterForm() {
  const router = useRouter()
  const auth = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
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
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      })
      const data = await res.json()

      if (res.ok) {
        if (data.user) auth.setUser(data.user)
        setMessage({ type: 'success', text: 'Account created! Check your email...' })
        setTimeout(() => router.push('/verify-email?pending=true'), 1500)
      } else {
        setMessage({ type: 'error', text: data.error || 'Registration failed.' })
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
            Create Account
          </h1>
          <p className="mt-2 text-sm text-brand-silver">
            Begin your longevity education journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-brand-silver mb-1.5" htmlFor="firstName">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-silver mb-1.5" htmlFor="lastName">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className={inputClasses}
              />
            </div>
          </div>

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
            <label className="block text-xs font-medium text-brand-silver mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className={inputClasses}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-silver mb-1.5" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
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
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-silver">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-gold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
