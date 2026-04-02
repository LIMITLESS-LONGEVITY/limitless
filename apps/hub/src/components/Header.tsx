'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  User,
  BookOpen,
  HeartPulse,
  Stethoscope,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role?: string
  avatarUrl?: string
}

interface MenuItem {
  label: string
  href: string
  icon: string
  roles: string[]
}

interface OsConfig {
  userMenu?: MenuItem[]
}

/* ------------------------------------------------------------------ */
/*  Icon map                                                           */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, LucideIcon> = {
  user: User,
  'book-open': BookOpen,
  'heart-pulse': HeartPulse,
  stethoscope: Stethoscope,
}

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? User
}

/* ------------------------------------------------------------------ */
/*  Fallback menu                                                      */
/* ------------------------------------------------------------------ */

const FALLBACK_MENU: MenuItem[] = [
  { label: 'Profile', href: '/learn/account', icon: 'user', roles: [] },
]

/* ------------------------------------------------------------------ */
/*  Nav links                                                          */
/* ------------------------------------------------------------------ */

const navLinks = [
  { href: '/memberships', label: 'Memberships' },
  { href: '/diagnostics', label: 'Diagnostics' },
  { href: '/stays', label: 'Stays' },
  { href: '/telemedicine', label: 'Telemedicine' },
  { href: '/contact-sales', label: 'Contact' },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(FALLBACK_MENU)
  const [loading, setLoading] = useState(true)

  const pathname = usePathname()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  /* ---------- Fetch auth + config on mount ---------- */

  useEffect(() => {
    const controller = new AbortController()

    async function init() {
      const [authResult, configResult] = await Promise.allSettled([
        fetch('/learn/api/users/me', {
          credentials: 'include',
          signal: controller.signal,
        }),
        fetch('/api/twin/os/config', {
          signal: controller.signal,
        }),
      ])

      // Auth
      if (authResult.status === 'fulfilled' && authResult.value.ok) {
        try {
          const data = await authResult.value.json()
          if (data?.user) setUser(data.user)
        } catch {
          /* ignore parse errors */
        }
      }

      // Config
      if (configResult.status === 'fulfilled' && configResult.value.ok) {
        try {
          const data: OsConfig = await configResult.value.json()
          if (data?.userMenu?.length) setMenuItems(data.userMenu)
        } catch {
          /* keep fallback */
        }
      }

      setLoading(false)
    }

    init()
    return () => controller.abort()
  }, [])

  /* ---------- Close dropdown on outside click ---------- */

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  /* ---------- Close dropdown on Escape ---------- */

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  /* ---------- Close mobile menu on route change ---------- */

  useEffect(() => {
    setMobileOpen(false)
    setDropdownOpen(false)
  }, [pathname])

  /* ---------- Logout ---------- */

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/learn/api/users/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      /* best effort */
    }
    setUser(null)
    setDropdownOpen(false)
    setMobileOpen(false)
    router.push('/')
  }, [router])

  /* ---------- Filtered menu items ---------- */

  const filteredItems = menuItems.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true
    return user?.role ? item.roles.includes(user.role) : false
  })

  /* ---------- Avatar ---------- */

  const initial = user?.firstName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? '?'

  /* ---------- Render ---------- */

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b border-brand-glass-border bg-brand-dark/80 backdrop-blur-lg"
      style={{ WebkitBackdropFilter: 'blur(16px)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- cross-app nav to OS Dashboard */}
        <a
          href="/"
          className="font-display text-2xl tracking-[0.25em] text-brand-gold hover:text-brand-gold/80 motion-safe:transition-colors"
        >
          LIMITLESS
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm tracking-wide motion-safe:transition-colors hover:text-brand-gold ${
                pathname === link.href ? 'text-brand-gold' : 'text-brand-silver'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Auth area */}
          {!loading && (
            user ? (
              /* Logged-in: avatar + dropdown */
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                  aria-label="User menu"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="h-9 w-9 rounded-full border border-brand-glass-border object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-glass-border bg-brand-glass-bg text-sm font-medium text-brand-gold">
                      {initial}
                    </span>
                  )}
                  <ChevronDown
                    size={16}
                    className={`text-brand-silver motion-safe:transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 rounded-lg border border-brand-glass-border bg-brand-dark-alt shadow-lg backdrop-blur-md"
                    style={{ WebkitBackdropFilter: 'blur(12px)' }}
                    role="menu"
                  >
                    {/* User info */}
                    <div className="border-b border-brand-glass-border px-4 py-3">
                      <p className="text-sm font-medium text-brand-light">
                        {user.firstName
                          ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
                          : user.email}
                      </p>
                      <p className="mt-0.5 text-xs text-brand-silver">{user.email}</p>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      {filteredItems.map((item) => {
                        const Icon = getIcon(item.icon)
                        return (
                          <a
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            className="flex min-h-[44px] items-center gap-3 px-4 py-2 text-sm text-brand-silver motion-safe:transition-colors hover:bg-brand-glass-bg-hover hover:text-brand-light"
                          >
                            <Icon size={16} />
                            {item.label}
                          </a>
                        )
                      })}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-brand-glass-border py-1">
                      <button
                        onClick={handleLogout}
                        role="menuitem"
                        className="flex min-h-[44px] w-full items-center gap-3 px-4 py-2 text-sm text-red-400 motion-safe:transition-colors hover:bg-brand-glass-bg-hover hover:text-red-300"
                      >
                        <LogOut size={16} />
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Logged-out: Log In + Get Started */
              <div className="flex items-center gap-3">
                <a
                  href="/learn/login"
                  className="min-h-[44px] flex items-center px-4 py-2 text-sm text-brand-silver motion-safe:transition-colors hover:text-brand-gold"
                >
                  Log In
                </a>
                <a
                  href="/learn/register"
                  className="min-h-[44px] flex items-center rounded-lg border border-brand-gold bg-brand-gold/10 px-4 py-2 text-sm font-medium text-brand-gold motion-safe:transition-colors hover:bg-brand-gold/20"
                >
                  Get Started
                </a>
              </div>
            )
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? (
            <X size={24} className="text-brand-gold" />
          ) : (
            <Menu size={24} className="text-brand-gold" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav
          className="border-t border-brand-glass-border bg-brand-dark/95 px-6 py-6 backdrop-blur-lg md:hidden"
          style={{ WebkitBackdropFilter: 'blur(16px)' }}
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex min-h-[44px] items-center text-base tracking-wide motion-safe:transition-colors hover:text-brand-gold ${
                  pathname === link.href ? 'text-brand-gold' : 'text-brand-silver'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Divider */}
            <div className="my-3 border-t border-brand-glass-border" />

            {/* User section (mobile) */}
            {!loading && (
              user ? (
                <>
                  {/* User info */}
                  <div className="mb-2 flex items-center gap-3 px-0 py-2">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="h-9 w-9 rounded-full border border-brand-glass-border object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-glass-border bg-brand-glass-bg text-sm font-medium text-brand-gold">
                        {initial}
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-medium text-brand-light">
                        {user.firstName
                          ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
                          : user.email}
                      </p>
                      <p className="text-xs text-brand-silver">{user.email}</p>
                    </div>
                  </div>

                  {filteredItems.map((item) => {
                    const Icon = getIcon(item.icon)
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        className="flex min-h-[44px] items-center gap-3 text-sm text-brand-silver motion-safe:transition-colors hover:text-brand-light"
                      >
                        <Icon size={16} />
                        {item.label}
                      </a>
                    )
                  })}

                  <button
                    onClick={handleLogout}
                    className="flex min-h-[44px] items-center gap-3 text-sm text-red-400 motion-safe:transition-colors hover:text-red-300"
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <a
                    href="/learn/login"
                    className="flex min-h-[44px] items-center text-base text-brand-silver motion-safe:transition-colors hover:text-brand-gold"
                  >
                    Log In
                  </a>
                  <a
                    href="/learn/register"
                    className="flex min-h-[44px] items-center justify-center rounded-lg border border-brand-gold bg-brand-gold/10 px-4 py-2 text-sm font-medium text-brand-gold motion-safe:transition-colors hover:bg-brand-gold/20"
                  >
                    Get Started
                  </a>
                </div>
              )
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
