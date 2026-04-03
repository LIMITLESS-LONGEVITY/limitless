const statusStyles: Record<string, string> = {
  CONFIRMED: 'bg-brand-teal/20 text-brand-teal border-brand-teal/30',
  COMPLETED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PENDING: 'bg-brand-gold/20 text-brand-gold border-brand-gold/30',
  CANCELLED: 'bg-red-500/15 text-red-400/70 border-red-500/20',
  PAST_DUE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  IN_PROGRESS: 'bg-brand-teal/20 text-brand-teal border-brand-teal/30',
  NO_SHOW: 'bg-red-500/15 text-red-400/70 border-red-500/20',
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PAUSED: 'bg-brand-gold/20 text-brand-gold border-brand-gold/30',
}

export default function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] ?? 'bg-brand-glass-bg text-brand-silver border-brand-glass-border'
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide ${style}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
