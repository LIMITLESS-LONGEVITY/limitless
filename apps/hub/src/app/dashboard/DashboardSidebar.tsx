'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const sidebarLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/dashboard/membership', label: 'Membership', icon: MembershipIcon },
  { href: '/dashboard/appointments', label: 'Appointments', icon: AppointmentsIcon },
  { href: '/dashboard/diagnostics', label: 'Diagnostics', icon: DiagnosticsIcon },
  { href: '/dashboard/stays', label: 'Stays', icon: StaysIcon },
  { href: '/dashboard/telemedicine', label: 'Telemedicine', icon: TelemedicineIcon },
  { href: '/dashboard/health', label: 'Health', icon: HealthIcon },
]

export function DashboardSidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex items-center gap-2 rounded-lg border border-brand-glass-border bg-brand-glass-bg px-4 py-3 text-sm text-brand-silver md:hidden"
        style={{ WebkitBackdropFilter: 'blur(12px)' }}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'} />
        </svg>
        Navigation
      </button>

      {/* Sidebar */}
      <aside
        className={`w-full shrink-0 md:block md:w-56 ${mobileOpen ? 'block' : 'hidden'}`}
      >
        <div
          className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-4 backdrop-blur-sm"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          {/* User info */}
          <div className="mb-4 border-b border-brand-glass-border pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gold/20 text-sm font-semibold text-brand-gold">
              {email.charAt(0).toUpperCase()}
            </div>
            <p className="mt-2 truncate text-sm text-brand-silver">{email}</p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-1">
            {sidebarLinks.map((link) => {
              const Icon = link.icon
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-brand-gold/10 text-brand-gold'
                      : 'text-brand-silver hover:bg-brand-glass-bg-hover hover:text-brand-light'
                  }`}
                >
                  <Icon active={active} />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}

/* ── Inline SVG icons (lightweight, no dependency) ── */

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${active ? 'text-brand-gold' : 'text-brand-silver'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )
}

function MembershipIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${active ? 'text-brand-gold' : 'text-brand-silver'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )
}

function AppointmentsIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${active ? 'text-brand-gold' : 'text-brand-silver'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function DiagnosticsIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${active ? 'text-brand-gold' : 'text-brand-silver'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  )
}

function StaysIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${active ? 'text-brand-gold' : 'text-brand-silver'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M15.75 21H8.25m6.75-18.045V6m0-2.455a2.25 2.25 0 00-1.883-2.22A23.456 23.456 0 0012 1.125c-.352 0-.7.015-1.044.044a2.25 2.25 0 00-1.883 2.22" />
    </svg>
  )
}

function TelemedicineIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${active ? 'text-brand-gold' : 'text-brand-silver'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  )
}

function HealthIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${active ? 'text-brand-gold' : 'text-brand-silver'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}
