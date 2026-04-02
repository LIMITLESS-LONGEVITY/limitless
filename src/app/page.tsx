'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import LandingView from '@/components/LandingView'
import LoginView from '@/components/LoginView'
import RegisterView from '@/components/RegisterView'
import DashboardView from '@/components/DashboardView'
import LoadingSkeleton from '@/components/LoadingSkeleton'

interface UserData {
  sub: string
  email: string
  tier: string
  role: string
  firstName?: string
}

type View = 'loading' | 'landing' | 'login' | 'register' | 'dashboard'

export default function HomePage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [view, setView] = useState<View>('loading')

  useEffect(() => {
    fetch('/learn/api/users/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          const u = data.user
          setUser({
            sub: String(u.id),
            email: u.email,
            tier: typeof u.tier === 'object' ? u.tier.accessLevel : u.tier ?? 'free',
            role: u.role ?? 'user',
            firstName: u.firstName || undefined,
          })
          setView('dashboard')
        } else {
          setView('landing')
        }
      })
      .catch(() => setView('landing'))
  }, [])

  const handleLogin = (userData: UserData) => {
    setUser(userData)
    setView('dashboard')
  }

  if (view === 'loading') return <LoadingSkeleton />
  if (view === 'login') return <LoginView onLogin={handleLogin} onSwitchToRegister={() => setView('register')} />
  if (view === 'register') return <RegisterView onLogin={handleLogin} onSwitchToLogin={() => setView('login')} />
  if (view === 'dashboard' && user) return (
    <>
      <Header user={user} />
      <DashboardView user={user} />
    </>
  )
  return (
    <>
      <Header user={null} />
      <LandingView onLogin={() => setView('login')} onRegister={() => setView('register')} />
    </>
  )
}
