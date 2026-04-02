'use client'
import React, { useState, useEffect } from 'react'
import { cn } from '@/utilities/ui'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

export const MobileSidebar: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on navigation
  useEffect(() => {
    queueMicrotask(() => setOpen(false))
  }, [pathname])

  return (
    <>
      {/* Trigger button — visible only on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-30 lg:hidden flex items-center justify-center w-12 h-12 rounded-full bg-card border border-border shadow-lg hover:bg-muted transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 left-0 h-full w-[280px] bg-background border-r border-border z-50 transform transition-transform duration-200 lg:hidden overflow-y-auto',
          open ? 'translate-x-0' : '-translate-x-full',
          className,
        )}
      >
        <div className="flex items-center justify-end p-4">
          <button
            onClick={() => setOpen(false)}
            className="p-1 hover:bg-muted rounded transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 pb-6">
          {children}
        </div>
      </div>
    </>
  )
}
