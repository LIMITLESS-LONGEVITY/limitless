import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Stays',
  description: 'Immersive wellness retreats at El Fuerte Marbella — diagnostics, coaching, and recovery in one stay.',
}

const stayPackages = [
  {
    name: '3-Day Vitality Reset',
    duration: '3 nights',
    description:
      'A focused reset for executives who need maximum impact in minimum time. Arrive, assess, and leave with a clear action plan.',
    includes: [
      'Executive diagnostic panel',
      '1-on-1 coaching session',
      'Personalised nutrition plan',
      'Recovery spa session',
      'Oura Ring provided for biometric tracking',
      'Boutique suite at El Fuerte Marbella',
      'All meals curated by longevity-focused chef',
    ],
    price: 'From \u20AC3,200',
  },
  {
    name: '5-Day Immersion',
    duration: '5 nights',
    description:
      'Our most popular programme. Deep diagnostics, daily coaching, and structured recovery — enough time to shift habits and establish a baseline for your longevity journey.',
    includes: [
      'Comprehensive diagnostic package',
      '3 coaching sessions',
      'Daily guided movement & breathwork',
      'Sleep optimisation protocol',
      'Continuous glucose monitoring',
      'Oura Ring provided for biometric tracking',
      'Premium suite at El Fuerte Marbella',
      'All meals + supplement protocol',
      'Post-stay 30-day follow-up plan',
    ],
    price: 'From \u20AC5,800',
    popular: true,
  },
  {
    name: '7-Day Transformation',
    duration: '7 nights',
    description:
      'The definitive longevity retreat. A full week of clinical assessment, lifestyle reprogramming, and recovery — designed for clients who are ready to make a lasting change.',
    includes: [
      'Full diagnostic suite + specialist add-ons',
      '5 coaching sessions',
      'Daily guided movement, yoga & breathwork',
      'Advanced sleep & stress analysis',
      'Continuous glucose monitoring',
      'VO\u2082 max & body composition testing',
      'Oura Ring provided for biometric tracking',
      'Grand suite at El Fuerte Marbella',
      'All meals + personalised supplement protocol',
      'Spa & recovery sessions (cryotherapy, infrared sauna)',
      '90-day post-stay follow-up programme',
    ],
    price: 'From \u20AC9,500',
  },
]

export default function StaysPage() {
  return (
    <main className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-4xl text-brand-gold sm:text-5xl">
            Wellness Stays
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-brand-silver">
            Immersive retreats where clinical precision meets five-star hospitality.
            Every stay includes diagnostics, coaching, and recovery.
          </p>
        </div>

        {/* Hotel partner */}
        <div className="mt-12 text-center">
          <p className="text-sm uppercase tracking-wider text-brand-teal">
            In partnership with
          </p>
          <p className="mt-2 font-display text-2xl text-brand-light">
            El Fuerte Marbella
          </p>
          <p className="mt-1 text-sm text-brand-silver">
            A luxury beachfront hotel on the Costa del Sol, chosen for its world-class
            facilities and commitment to wellness.
          </p>
        </div>

        {/* Packages */}
        <div className="mt-16 space-y-8">
          {stayPackages.map((pkg) => (
            <div
              key={pkg.name}
              className={`relative rounded-xl border p-8 backdrop-blur-sm sm:p-10 ${
                pkg.popular
                  ? 'border-brand-gold/40 bg-brand-gold-dim'
                  : 'border-brand-glass-border bg-brand-glass-bg'
              }`}
              style={{ WebkitBackdropFilter: 'blur(12px)' }}
            >
              {pkg.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand-gold px-4 py-1 text-xs font-semibold tracking-wide text-brand-dark">
                  Most Popular
                </span>
              )}

              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <h2 className="font-display text-2xl text-brand-light sm:text-3xl">
                    {pkg.name}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-brand-teal">{pkg.duration}</p>
                  <p className="mt-4 leading-relaxed text-brand-silver">{pkg.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-2xl text-brand-gold">{pkg.price}</p>
                  <p className="mt-1 text-xs text-brand-silver">Per person, all-inclusive</p>
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
                  Enquire About This Stay
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Wearable note */}
        <div
          className="mt-16 rounded-xl border border-brand-glass-border bg-brand-glass-bg p-8 text-center backdrop-blur-sm"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          <h2 className="font-display text-2xl text-brand-light">Wearable Integration</h2>
          <p className="mt-3 max-w-2xl mx-auto text-brand-silver">
            Every guest receives an Oura Ring for the duration of their stay. Sleep, recovery,
            and activity data flow directly to your coaching team for real-time programme
            adjustments. Data can be transferred to your Digital Health Twin after checkout.
          </p>
        </div>
      </div>
    </main>
  )
}
