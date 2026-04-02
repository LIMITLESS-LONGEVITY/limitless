'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utilities/ui'
import { LayoutDashboard, User, Heart, ClipboardList, Award, Users, CreditCard, BookOpen, Shield } from 'lucide-react'

const BASE_NAV_ITEMS = [
  { href: '/account', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/account/profile', label: 'Profile', icon: User },
  { href: '/account/health', label: 'Health Profile', icon: Heart },
  { href: '/account/plans', label: 'Action Plans', icon: ClipboardList },
  { href: '/account/certificates', label: 'Certificates', icon: Award },
]

const MANAGER_NAV_ITEM = { href: '/account/team', label: 'Team', icon: Users }

const BOTTOM_NAV_ITEMS = [
  { href: '/account/billing', label: 'Billing', icon: CreditCard },
  { href: '/account/courses', label: 'My Courses', icon: BookOpen },
  { href: '/account/privacy', label: 'Privacy & Data', icon: Shield },
]

export const AccountNav: React.FC<{ isManager?: boolean }> = ({ isManager }) => {
  const NAV_ITEMS = [
    ...BASE_NAV_ITEMS,
    ...(isManager ? [MANAGER_NAV_ITEM] : []),
    ...BOTTOM_NAV_ITEMS,
  ]
  const pathname = usePathname()

  return (
    <nav className="lg:w-[200px] flex-shrink-0">
      {/* Desktop: vertical nav */}
      <div className="hidden lg:flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === item.href
                ? 'bg-brand-gold/10 text-brand-gold font-medium'
                : 'text-brand-silver hover:text-foreground hover:bg-brand-glass-bg-hover',
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </div>

      {/* Mobile: horizontal tabs */}
      <div className="flex lg:hidden gap-1 border-b border-border pb-4 mb-4 overflow-x-auto flex-nowrap">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === item.href
                ? 'bg-brand-gold/10 text-brand-gold font-medium'
                : 'text-brand-silver hover:text-foreground',
            )}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
