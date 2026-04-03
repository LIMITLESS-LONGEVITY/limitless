import React from 'react'
import { cn } from '@/utilities/ui'
import { Info, AlertTriangle, CheckCircle2, Lightbulb, AlertCircle } from 'lucide-react'

const calloutStyles = {
  info: {
    container: 'border-brand-teal/30 bg-brand-teal/5',
    icon: <Info className="w-5 h-5 text-brand-teal flex-shrink-0" />,
    title: 'text-brand-teal',
  },
  warning: {
    container: 'border-warning/30 bg-warning/5',
    icon: <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />,
    title: 'text-warning',
  },
  success: {
    container: 'border-success/30 bg-success/5',
    icon: <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />,
    title: 'text-success',
  },
  tip: {
    container: 'border-brand-gold/30 bg-brand-gold/5',
    icon: <Lightbulb className="w-5 h-5 text-brand-gold flex-shrink-0" />,
    title: 'text-brand-gold',
  },
  important: {
    container: 'border-red-500/30 bg-red-500/5',
    icon: <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
    title: 'text-red-500',
  },
}

export const Callout: React.FC<{
  type?: keyof typeof calloutStyles
  title?: string
  children: React.ReactNode
}> = ({ type = 'info', title, children }) => {
  const styles = calloutStyles[type]

  return (
    <div className={cn('my-6 rounded-lg border p-4', styles.container)}>
      <div className="flex gap-3">
        {styles.icon}
        <div className="flex-1 min-w-0">
          {title && (
            <p className={cn('font-semibold text-sm mb-1', styles.title)}>{title}</p>
          )}
          <div className="text-sm text-foreground/80 [&>p]:m-0">{children}</div>
        </div>
      </div>
    </div>
  )
}
