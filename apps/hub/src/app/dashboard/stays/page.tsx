import StaysClient from './StaysClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Stays',
}

export default function StaysPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl tracking-wide text-brand-gold sm:text-4xl">
          Stays
        </h1>
        <a
          href="/stays"
          className="inline-flex items-center rounded-lg border border-brand-gold/30 bg-brand-gold-dim px-4 py-2 text-sm font-medium text-brand-gold transition-colors hover:bg-brand-gold/20"
        >
          Browse Stays
        </a>
      </div>
      <StaysClient />
    </div>
  )
}
