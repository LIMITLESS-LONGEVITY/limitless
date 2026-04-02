'use client'

import { useState } from 'react'

interface UserData {
  sub: string
  email: string
  tier: string
  role: string
}

export default function RegisterView({
  onLogin,
  onSwitchToLogin,
}: {
  onLogin: (user: UserData) => void
  onSwitchToLogin: () => void
}) {
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
      const res = await fetch('/learn/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, firstName, lastName }),
      })
      const data = await res.json()

      if (res.ok && data.user) {
        const u = data.user
        setMessage({ type: 'success', text: 'Account created! Loading dashboard...' })
        setTimeout(() => {
          onLogin({
            sub: String(u.id),
            email: u.email,
            tier: typeof u.tier === 'object' ? u.tier.accessLevel : u.tier ?? 'free',
            role: u.role ?? 'user',
          })
        }, 500)
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
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div
        className="w-full max-w-md rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-8 md:p-10"
        style={{ WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-[0.12em] text-brand-gold mb-2">
            LIMITLESS
          </h1>
          <p className="text-sm text-brand-silver">
            Begin your longevity journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-brand-silver mb-1.5" htmlFor="reg-firstName">
                First Name
              </label>
              <input
                id="reg-firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-silver mb-1.5" htmlFor="reg-lastName">
                Last Name
              </label>
              <input
                id="reg-lastName"
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
            <label className="block text-xs font-medium text-brand-silver mb-1.5" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className={inputClasses}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-silver mb-1.5" htmlFor="reg-password">
              Password
            </label>
            <input
              id="reg-password"
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
            <label className="block text-xs font-medium text-brand-silver mb-1.5" htmlFor="reg-confirm">
              Confirm Password
            </label>
            <input
              id="reg-confirm"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              className={inputClasses}
            />
          </div>

          {message && (
            <p className={`text-sm text-center ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3 rounded-full text-sm font-medium uppercase tracking-[0.15em] transition-all duration-300 border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none min-h-[44px] ${
              submitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-silver">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="text-brand-gold hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
