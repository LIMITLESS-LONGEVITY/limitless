'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  User,
  BookOpen,
  HeartPulse,
  Stethoscope,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface UserData {
  sub: string
  email: string
  tier: string
  role: string
  firstName?: string
  avatarUrl?: string
}

interface OSMenuItem {
  label: string
  href: string
  icon: string
  roles: string[] // empty = visible to all
}

interface OSConfig {
  menu: OSMenuItem[]
}

/* ------------------------------------------------------------------ */
/*  Icon map                                                          */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  user: User,
  'book-open': BookOpen,
  'heart-pulse': HeartPulse,
  stethoscope: Stethoscope,
}

const FALLBACK_MENU: OSMenuItem[] = [
  { label: 'Profile', href: '/learn/account/profile', icon: 'user', roles: [] },
]

/* ------------------------------------------------------------------ */
/*  Nav links                                                         */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
  { label: 'Dashboard', href: '/' },
  { label: 'Health', href: '/health' },
  { label: 'Train', href: '/train' },
]

/* ------------------------------------------------------------------ */
/*  Header                                                            */
/* ------------------------------------------------------------------ */

export default function Header({
  user: userProp,
}: {
  user?: UserData | null
}) {
  const pathname = usePathname()

  /* ----- Auth & config state ----- */
  const [user, setUser] = useState<UserData | null>(userProp ?? null)
  const [menuItems, setMenuItems] = useState<OSMenuItem[]>(FALLBACK_MENU)
  const [loaded, setLoaded] = useState(!!userProp)

  /* ----- UI state ----- */
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  /* ---------- Reduced motion ---------- */
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  /* ---------- Fetch user + config on mount ---------- */
  useEffect(() => {
    if (userProp !== undefined) {
      // User was passed in — skip fetch
      setUser(userProp)
      setLoaded(true)
    }

    // Always try to fetch config (it's public / no-auth)
    const fetchData = async () => {
      const results = await Promise.allSettled([
        // Only fetch user if not provided
        userProp !== undefined
          ? Promise.resolve(null)
          : fetch('/learn/api/users/me', { credentials: 'include' }).then((r) =>
              r.ok ? r.json() : null,
            ),
        fetch('/api/twin/os/config').then((r) => (r.ok ? r.json() : null)),
      ])

      // User
      if (userProp === undefined) {
        const userResult = results[0]
        if (userResult.status === 'fulfilled' && userResult.value?.user) {
          const u = userResult.value.user
          setUser({
            sub: String(u.id),
            email: u.email,
            tier:
              typeof u.tier === 'object'
                ? u.tier.accessLevel
                : u.tier ?? 'free',
            role: u.role ?? 'user',
            firstName: u.firstName || undefined,
            avatarUrl: u.avatarUrl || undefined,
          })
        }
        setLoaded(true)
      }

      // Config
      const configResult = results[1]
      if (
        configResult.status === 'fulfilled' &&
        configResult.value?.menu?.length
      ) {
        setMenuItems(configResult.value.menu as OSMenuItem[])
      }
    }

    fetchData()
  }, [userProp])

  /* ---------- Scroll detection ---------- */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ---------- Close dropdown on outside click / Escape ---------- */
  useEffect(() => {
    if (!dropdownOpen) return

    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [dropdownOpen])

  /* ---------- Close mobile menu on outside click / Escape ---------- */
  useEffect(() => {
    if (!mobileOpen) return

    const handleClick = (e: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [mobileOpen])

  /* ---------- Logout handler ---------- */
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/learn/api/users/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // proceed to redirect regardless
    }
    window.location.href = '/'
  }, [])

  /* ---------- Filtered menu items ---------- */
  const visibleMenuItems = menuItems.filter(
    (item) =>
      item.roles.length === 0 ||
      (user?.role && item.roles.includes(user.role)),
  )

  /* ---------- Avatar initial ---------- */
  const initial = user?.firstName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? '?'

  /* ---------- Transition classes ---------- */
  const transitionClass = reducedMotion ? '' : 'transition-all duration-300'

  if (!loaded) return null

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 border-b ${transitionClass} ${
          scrolled
            ? 'bg-brand-dark/90 border-brand-glass-border'
            : 'bg-transparent border-transparent'
        }`}
        style={
          scrolled
            ? {
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }
            : undefined
        }
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* ----- Logo ----- */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className={`font-display text-2xl font-semibold tracking-[0.12em] text-brand-gold hover:text-brand-gold/80 ${
              reducedMotion ? '' : 'transition-colors'
            }`}
          >
            LIMITLESS
          </a>

          {/* ----- Center nav (desktop) ----- */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`text-sm tracking-wide ${
                    active ? 'text-brand-gold' : 'text-brand-silver'
                  } hover:text-brand-gold ${
                    reducedMotion ? '' : 'transition-colors'
                  }`}
                >
                  {link.label}
                </a>
              )
            })}
          </nav>

          {/* ----- Right section ----- */}
          <div className="flex items-center gap-3">
            {user ? (
              /* --- Logged in: avatar + dropdown --- */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  className={`w-9 h-9 rounded-full bg-brand-glass-bg border border-brand-glass-border flex items-center justify-center text-sm font-medium text-brand-gold overflow-hidden ${
                    reducedMotion ? '' : 'transition-colors'
                  } hover:border-brand-gold/40`}
                >
                  {user.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={user.avatarUrl}
                      alt={user.firstName ?? user.email}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </button>

                {dropdownOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 rounded-lg border border-brand-glass-border bg-brand-dark-alt shadow-lg overflow-hidden"
                    style={{
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                    }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-brand-glass-border">
                      <p className="text-sm font-medium text-brand-light truncate">
                        {user.firstName ?? user.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-brand-silver truncate">
                        {user.email}
                      </p>
                      {user.tier && (
                        <span className="mt-1.5 inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-brand-gold-dim text-brand-gold capitalize">
                          {user.tier}
                        </span>
                      )}
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      {visibleMenuItems.map((item) => {
                        const IconComp = ICON_MAP[item.icon]
                        return (
                          <a
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            className={`flex items-center gap-3 px-4 py-2 text-sm text-brand-silver hover:bg-brand-glass-bg-hover ${
                              reducedMotion ? '' : 'transition-colors'
                            }`}
                            onClick={() => setDropdownOpen(false)}
                          >
                            {IconComp && (
                              <IconComp className="w-4 h-4 text-brand-silver" />
                            )}
                            {item.label}
                          </a>
                        )
                      })}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-brand-glass-border py-1">
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        className={`flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-brand-glass-bg-hover ${
                          reducedMotion ? '' : 'transition-colors'
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* --- Logged out: Log In + Get Started --- */
              <div className="hidden md:flex items-center gap-3">
                <a
                  href="/learn/login"
                  className={`text-sm text-brand-silver hover:text-brand-gold ${
                    reducedMotion ? '' : 'transition-colors'
                  }`}
                >
                  Log In
                </a>
                <a
                  href="/learn/register"
                  className={`text-sm px-4 py-2 rounded-lg border border-brand-gold text-brand-gold hover:bg-brand-gold/10 min-h-[44px] inline-flex items-center ${
                    reducedMotion ? '' : 'transition-colors'
                  }`}
                >
                  Get Started
                </a>
              </div>
            )}

            {/* ----- Hamburger (mobile) ----- */}
            <button
              ref={hamburgerRef}
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="md:hidden w-11 h-11 flex items-center justify-center text-brand-silver"
            >
              {mobileOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* ----- Mobile menu ----- */}
        {mobileOpen && (
          <div
            ref={mobileMenuRef}
            className="md:hidden border-t border-brand-glass-border bg-brand-dark-alt"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <nav className="px-6 py-4 space-y-1">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`block py-3 text-sm tracking-wide min-h-[44px] flex items-center ${
                      active ? 'text-brand-gold' : 'text-brand-silver'
                    } hover:text-brand-gold ${
                      reducedMotion ? '' : 'transition-colors'
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </a>
                )
              })}
            </nav>

            {user ? (
              <div className="border-t border-brand-glass-border px-6 py-4 space-y-1">
                {/* User info */}
                <div className="pb-2">
                  <p className="text-sm font-medium text-brand-light truncate">
                    {user.firstName ?? user.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-brand-silver truncate">
                    {user.email}
                  </p>
                </div>

                {visibleMenuItems.map((item) => {
                  const IconComp = ICON_MAP[item.icon]
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 py-3 text-sm text-brand-silver min-h-[44px] hover:text-brand-gold ${
                        reducedMotion ? '' : 'transition-colors'
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {IconComp && <IconComp className="w-4 h-4" />}
                      {item.label}
                    </a>
                  )
                })}

                <button
                  onClick={handleLogout}
                  className={`flex items-center gap-3 w-full py-3 text-sm text-red-400 hover:text-red-300 min-h-[44px] ${
                    reducedMotion ? '' : 'transition-colors'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            ) : (
              <div className="border-t border-brand-glass-border px-6 py-4 flex flex-col gap-3">
                <a
                  href="/learn/login"
                  className={`block py-3 text-sm text-brand-silver hover:text-brand-gold min-h-[44px] flex items-center ${
                    reducedMotion ? '' : 'transition-colors'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  Log In
                </a>
                <a
                  href="/learn/register"
                  className={`block py-3 text-sm text-center rounded-lg border border-brand-gold text-brand-gold hover:bg-brand-gold/10 min-h-[44px] flex items-center justify-center ${
                    reducedMotion ? '' : 'transition-colors'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  Get Started
                </a>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Spacer to offset fixed header */}
      <div className="h-[60px]" />
    </>
  )
}
