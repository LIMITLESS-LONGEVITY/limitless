export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center">
      <div className="w-full max-w-5xl px-6 py-12 space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 rounded bg-brand-glass-bg animate-pulse" />
          <div className="h-10 w-28 rounded bg-brand-glass-bg animate-pulse" />
        </div>

        {/* Quick actions skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-brand-glass-border bg-brand-glass-bg animate-pulse"
            />
          ))}
        </div>

        {/* Widget grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-56 rounded-xl border border-brand-glass-border bg-brand-glass-bg animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
