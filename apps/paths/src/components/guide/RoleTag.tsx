import React from 'react'
import { cn } from '@/utilities/ui'

const roleColors: Record<string, string> = {
  'user-free': 'bg-muted text-muted-foreground border-border',
  'user-paid': 'bg-brand-gold/10 text-brand-gold border-brand-gold/30',
  'user-organization': 'bg-brand-teal/10 text-brand-teal border-brand-teal/30',
  contributor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  editor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  publisher: 'bg-green-500/10 text-green-400 border-green-500/30',
  admin: 'bg-red-500/10 text-red-400 border-red-500/30',
}

const roleLabels: Record<string, string> = {
  'user-free': 'Free User',
  'user-paid': 'Paid User',
  'user-organization': 'Organization User',
  contributor: 'Contributor',
  editor: 'Editor',
  publisher: 'Publisher',
  admin: 'Admin',
}

export const RoleTag: React.FC<{
  role: string
  className?: string
}> = ({ role, className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        roleColors[role] || 'bg-muted text-muted-foreground border-border',
        className,
      )}
    >
      {roleLabels[role] || role}
    </span>
  )
}
