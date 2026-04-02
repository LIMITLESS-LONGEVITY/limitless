import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Diagnostics',
  description: 'Comprehensive health screens and specialist testing — from executive panels to targeted add-ons.',
}

const packages = [
  {
    name: 'Comprehensive Package',
    tagline: 'Full-body longevity analysis',
    price: 'From \u20AC2,400',
    description:
      'Our flagship diagnostic experience. A thorough assessment covering cardiovascular, metabolic, hormonal, inflammatory, and genomic markers — designed to create a complete picture of your biological age and health trajectory.',
    includes: [
      'Advanced blood panel (80+ biomarkers)',
      'Cardiovascular imaging (carotid IMT, coronary calcium)',
      'Full-body MRI screening',
      'DEXA body composition scan',
      'Hormonal & metabolic profiling',
      'Genomic risk assessment',
      'Gut microbiome analysis',
      '90-minute results consultation with specialist',
    ],
  },
  {
    name: 'Executive Package',
    tagline: 'Focused executive health screen',
    price: 'From \u20AC1,200',
    description:
      'A streamlined but thorough screen built for time-pressed executives. Covers the highest-impact biomarkers and imaging in a single half-day session.',
    includes: [
      'Comprehensive blood panel (50+ biomarkers)',
      'Cardiovascular risk assessment',
      'DEXA body composition scan',
      'Metabolic & hormonal snapshot',
      'Cognitive performance baseline',
      '45-minute results consultation',
    ],
  },
  {
    name: 'Specialist Add-Ons',
    tagline: 'Targeted deep dives',
    price: 'From \u20AC300',
    description:
      'Complement any package with specialist testing. Available as standalone sessions for members or as add-ons to a comprehensive or executive screen.',
    includes: [
      'Advanced cardiac imaging',
      'Continuous glucose monitoring (14-day)',
      'VO\u2082 max & lactate threshold testing',
      'Neurocognitive assessment',
      'Sleep architecture analysis',
      'Epigenetic biological age test',
      'Food sensitivity & allergy panel',
      'Heavy metal & toxin screening',
    ],
  },
]

export default function DiagnosticsPage() {
  return (
    <main className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-4xl text-brand-gold sm:text-5xl">
            Diagnostics
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-brand-silver">
            Precision health screening powered by Europe&apos;s leading laboratories. Know your
            body at the deepest level.
          </p>
        </div>

        {/* Packages */}
        <div className="mt-16 space-y-8">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-8 backdrop-blur-sm sm:p-10"
              style={{ WebkitBackdropFilter: 'blur(12px)' }}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <h2 className="font-display text-2xl text-brand-light sm:text-3xl">
                    {pkg.name}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-brand-teal">{pkg.tagline}</p>
                  <p className="mt-4 leading-relaxed text-brand-silver">{pkg.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-2xl text-brand-gold">{pkg.price}</p>
                  <p className="mt-1 text-xs text-brand-silver">Members receive up to 15% off</p>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-silver">
                  What&apos;s included
                </h3>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {pkg.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-brand-silver">
                      <span className="mt-0.5 text-brand-teal">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  href="/contact-sales"
                  className="inline-block rounded-lg bg-brand-gold px-8 py-3 text-sm font-semibold tracking-wide text-brand-dark transition-opacity hover:opacity-90"
                >
                  Book This Package
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Process note */}
        <div className="mt-16 text-center">
          <p className="text-brand-silver">
            All diagnostic results are reviewed by our medical team and can be transferred
            to your Digital Health Twin for ongoing monitoring.
          </p>
        </div>
      </div>
    </main>
  )
}
