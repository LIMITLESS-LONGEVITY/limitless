export default function GlassCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-brand-glass-border bg-brand-glass-bg p-6 backdrop-blur-md ${className}`}
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      {children}
    </div>
  )
}
