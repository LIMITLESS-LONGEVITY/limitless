import DiagnosticsClient from './DiagnosticsClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Diagnostics',
}

export default function DiagnosticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl tracking-wide text-brand-gold sm:text-4xl">
          Diagnostics
        </h1>
        <a
          href="/diagnostics"
          className="inline-flex items-center rounded-lg border border-brand-gold/30 bg-brand-gold-dim px-4 py-2 text-sm font-medium text-brand-gold transition-colors hover:bg-brand-gold/20"
        >
          Book New Diagnostic
        </a>
      </div>
      <DiagnosticsClient />
    </div>
  )
}
