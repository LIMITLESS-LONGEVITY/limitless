'use client'
import React, { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/providers/Auth'
import { User, LogOut } from 'lucide-react'
import { UserDropdown } from './UserDropdown'
import { iconMap } from './iconMap'
import { apiUrl } from '@/utilities/apiUrl'
import type { OSConfig, OSMenuItem } from './types'

/** Hardcoded fallback if OS config fetch fails */
const FALLBACK_MENU: OSMenuItem[] = [
  { label: 'Profile', href: '/account/profile', icon: 'user', roles: [] },
]

interface AuthSectionProps {
  mobile?: boolean
  osConfig: OSConfig | null
}

export const AuthSection: React.FC<AuthSectionProps> = ({ mobile, osConfig }) => {
  const { user, status } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const closeDropdown = useCallback(() => setDropdownOpen(false), [])

  /** Filter menu items by user role — empty roles array means show to all */
  const menuItems = useMemo(() => {
    const items = osConfig?.userMenu?.length ? osConfig.userMenu : FALLBACK_MENU
    const userRole = user?.role
    return items.filter(
      (item) => item.roles.length === 0 || (userRole && item.roles.includes(userRole)),
    )
  }, [osConfig, user?.role])

  // Loading state
  if (status === 'loading') {
    if (mobile) return null
    return <div className="w-9 h-9 rounded-full bg-brand-glass-bg animate-pulse shrink-0" />
  }

  // Logged in — mobile: inline menu items
  if (status === 'loggedIn' && user) {
    if (mobile) {
      return <MobileLoggedIn user={user} menuItems={menuItems} />
    }

    // Logged in — desktop: avatar with dropdown
    const initial = user.firstName?.charAt(0)?.toUpperCase() || 'U'

    return (
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-label="User menu"
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
          aria-controls="user-menu"
          className="w-9 h-9 rounded-full bg-brand-glass-bg border border-brand-glass-border flex items-center justify-center text-brand-gold font-serif text-sm font-semibold transition-colors hover:border-brand-gold/30 focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none"
        >
          {initial}
        </button>
        <UserDropdown open={dropdownOpen} onClose={closeDropdown} menuItems={menuItems} />
      </div>
    )
  }

  // Logged out
  if (mobile) {
    return (
      <div className="flex flex-col gap-3">
        <Link
          href="/login"
          className="text-brand-silver hover:text-brand-gold text-xs uppercase tracking-[0.15em] font-sans font-medium transition-colors min-h-[44px] flex items-center"
        >
          Log In
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full text-xs font-medium uppercase tracking-[0.15em] border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark transition-all duration-300 min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none"
        >
          Get Started
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/login"
        className="text-brand-silver hover:text-brand-gold text-xs uppercase tracking-[0.15em] font-sans font-medium transition-colors"
      >
        Log In
      </Link>
      <Link
        href="/register"
        className="inline-flex items-center justify-center px-5 py-2 rounded-full text-xs font-medium uppercase tracking-[0.15em] border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark transition-all duration-300 min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none"
      >
        Get Started
      </Link>
    </div>
  )
}

/** Mobile logged-in menu — renders config-driven items inline */
const MobileLoggedIn: React.FC<{
  user: NonNullable<ReturnType<typeof useAuth>['user']>
  menuItems: OSMenuItem[]
}> = ({ user, menuItems }) => {
  const handleLogout = () => {
    // Cross-app navigation to gateway root
    void fetch(apiUrl('/api/users/logout'), { method: 'POST', credentials: 'include' }).finally(() => {
      window.location.href = '/'
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-brand-silver text-xs uppercase tracking-[0.15em] font-sans font-medium mb-1">
        {user.firstName} {user.lastName}
      </div>
      {menuItems.map((item) => {
        const Icon = iconMap[item.icon] || User
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 text-brand-silver hover:text-brand-gold text-xs uppercase tracking-[0.15em] font-sans font-medium transition-colors min-h-[44px]"
          >
            <Icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 text-red-400 hover:text-red-300 text-xs uppercase tracking-[0.15em] font-sans font-medium transition-colors min-h-[44px]"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        Log Out
      </button>
    </div>
  )
}
