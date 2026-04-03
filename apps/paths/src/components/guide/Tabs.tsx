'use client'
import React, { useState, createContext, useContext, useEffect } from 'react'
import { cn } from '@/utilities/ui'

type TabsContextType = {
  activeTab: string
  setActiveTab: (id: string) => void
}

const TabsContext = createContext<TabsContextType>({
  activeTab: '',
  setActiveTab: () => {},
})

export const Tabs: React.FC<{
  defaultTab?: string
  storageKey?: string
  children: React.ReactNode
  className?: string
}> = ({ defaultTab, storageKey, children, className }) => {
  const [activeTab, setActiveTab] = useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`guide-tab-${storageKey}`)
      if (stored) return stored
    }
    return defaultTab || ''
  })

  useEffect(() => {
    if (storageKey && activeTab) {
      localStorage.setItem(`guide-tab-${storageKey}`, activeTab)
    }
  }, [activeTab, storageKey])

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('my-6', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export const TabList: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => {
  return (
    <div
      className={cn('flex border-b border-border gap-0', className)}
      role="tablist"
    >
      {children}
    </div>
  )
}

export const Tab: React.FC<{
  id: string
  children: React.ReactNode
  className?: string
}> = ({ id, children, className }) => {
  const { activeTab, setActiveTab } = useContext(TabsContext)
  const isActive = activeTab === id

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setActiveTab(id)
        }
      }}
      className={cn(
        'px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
        isActive
          ? 'border-brand-gold text-brand-gold'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
        className,
      )}
    >
      {children}
    </button>
  )
}

export const TabPanel: React.FC<{
  id: string
  children: React.ReactNode
  className?: string
}> = ({ id, children, className }) => {
  const { activeTab } = useContext(TabsContext)

  if (activeTab !== id) return null

  return (
    <div
      role="tabpanel"
      className={cn('pt-4', className)}
    >
      {children}
    </div>
  )
}
