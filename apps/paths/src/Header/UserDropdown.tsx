'use client'
import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, LogOut } from 'lucide-react'
import { iconMap } from './iconMap'
import { apiUrl } from '@/utilities/apiUrl'
import type { OSMenuItem } from './types'

interface UserDropdownProps {
  open: boolean
  onClose: () => void
  menuItems: OSMenuItem[]
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ open, onClose, menuItems }) => {
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)

  // Close on route change
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const handleLogout = () => {
    onClose()
    // Cross-app navigation to gateway root
    void fetch(apiUrl('/api/users/logout'), { method: 'POST', credentials: 'include' }).finally(() => {
      window.location.href = '/'
    })
  }

  return (
    <div
      ref={ref}
      role="menu"
      id="user-menu"
      className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-brand-glass-border bg-brand-dark/95 backdrop-blur-md py-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      {menuItems.map((item) => {
        const Icon = iconMap[item.icon] || User
        return (
          <Link
            key={item.href}
            href={item.href}
            role="menuitem"
            className="flex items-center gap-3 px-4 py-3 text-sm text-brand-silver hover:text-brand-gold hover:bg-brand-glass-bg-hover rounded-lg mx-1 transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none"
          >
            <Icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
      <div className="h-px bg-brand-glass-border my-1 mx-3" />
      <button
        role="menuitem"
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-brand-glass-bg-hover rounded-lg mx-1 transition-colors w-[calc(100%-8px)] min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        Log Out
      </button>
    </div>
  )
}
