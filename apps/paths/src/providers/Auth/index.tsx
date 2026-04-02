'use client'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import type { User } from '@/payload-types'
import { apiUrl } from '@/utilities/apiUrl'

type AuthStatus = 'loading' | 'loggedIn' | 'loggedOut'

interface AuthContext {
  user: User | null
  status: AuthStatus
  setUser: (user: User | null) => void
  logout: () => Promise<void>
}

const Context = createContext<AuthContext>({
  user: null,
  status: 'loading',
  setUser: () => {},
  logout: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const router = useRouter()

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/users/me'), { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data?.user) {
          setUser(data.user)
          setStatus('loggedIn')
          return
        }
      }
      setUser(null)
      setStatus('loggedOut')
    } catch {
      setUser(null)
      setStatus('loggedOut')
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => { void fetchMe() })
  }, [fetchMe])

  const handleSetUser = useCallback((user: User | null) => {
    setUser(user)
    setStatus(user ? 'loggedIn' : 'loggedOut')
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch(apiUrl('/api/users/logout'), { method: 'POST', credentials: 'include' })
    } catch {
      // Proceed with client-side cleanup even if request fails
    }
    setUser(null)
    setStatus('loggedOut')
    router.refresh()
    router.push('/')
  }, [router])

  return (
    <Context.Provider value={{ user, status, setUser: handleSetUser, logout }}>
      {children}
    </Context.Provider>
  )
}

export const useAuth = () => useContext(Context)
