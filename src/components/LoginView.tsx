'use client'

import { useState } from 'react'

interface UserData {
  sub: string
  email: string
  tier: string
  role: string
}

export default function LoginView({
  onLogin,
  onSwitchToRegister,
}: {
  onLogin: (user: UserData) => void
  onSwitchToRegister: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)

    try {
      const res = await fetch('/learn/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (res.ok && data.user) {
        const u = data.user
        setMessage({ type: 'success', text: 'Signed in! Loading dashboard...' })
        setTimeout(() => {
          onLogin({
            sub: String(u.id),
            email: u.email,
            tier: typeof u.tier === 'object' ? u.tier.accessLevel : u.tier ?? 'free',
            role: u.role ?? 'user',
          })
        }, 500)
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
            Sign in to your longevity dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-brand-silver mb-1.5" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
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
              <label className="block text-xs font-medium text-brand-silver" htmlFor="login-password">
                Password
              </label>
              <a href="/learn/forgot-password" className="text-brand-gold text-xs hover:underline">
                Forgot password?
              </a>
            </div>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
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
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-silver">
          Don&apos;t have an account?{' '}
          <button onClick={onSwitchToRegister} className="text-brand-gold hover:underline">
            Create one
          </button>
        </p>
      </div>
    </div>
  )
}
