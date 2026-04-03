import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Memberships',
  description: 'Tiered longevity memberships — from coaching and diagnostics to unlimited VIP access.',
}

const tiers = [
  {
    name: 'E-Clinic',
    price: '99',
    period: '/mo',
    description: 'Digital-first longevity management for the modern executive.',
    features: [
      'Unlimited telemedicine consultations',
      'AI-powered coaching dashboard',
      'Wearable data integration (Oura, Whoop)',
      'Monthly health report',
      'Priority booking for in-person add-ons',
    ],
    highlight: false,
  },
  {
    name: 'Optimus',
    price: '180',
    period: '/mo',
    description: 'Your foundation for proactive health optimisation.',
    features: [
      '1 coach session per month',
      'Basic diagnostic panel annually',
      'Access to educational content library',
      'Quarterly health review',
      'Email support',
    ],
    highlight: false,
  },
  {
    name: 'Immortalitas',
    price: '220',
    period: '/mo',
    description: 'Deeper engagement with advanced diagnostics and coaching.',
    features: [
      '2 coach sessions per month',
      '10% discount on all diagnostics',
      'Comprehensive annual panel',
      'Bi-monthly health review',
      'Priority email & chat support',
    ],
    highlight: true,
  },
  {
    name: 'Transcendentia',
    price: '280',
    period: '/mo',
    description: 'Premium longevity programme with priority access.',
    features: [
      '4 coach sessions per month',
      '15% discount on all diagnostics',
      'Full diagnostic suite annually',
      'Monthly health review',
      'Priority booking for hotel stays',
      'Dedicated account manager',
    ],
    highlight: false,
  },
  {
    name: 'VIP',
    price: 'Custom',
    period: '',
    description: 'Bespoke longevity concierge for the most discerning clients.',
    features: [
      'Unlimited coach sessions',
      'Dedicated medical team',
      'Comprehensive diagnostics on demand',
      'Complimentary hotel stay upgrades',
      'Global specialist network access',
      '24/7 concierge line',
    ],
    highlight: false,
  },
]

export default function MembershipsPage() {
  return (
    <main className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-4xl text-brand-gold sm:text-5xl">
            Memberships
          </h1>
          <p className="mt-4 text-lg text-brand-silver">
            Choose the tier that matches your ambition. Upgrade or customise at any time.
          </p>
        </div>

        {/* Tier cards */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-xl border p-8 backdrop-blur-sm transition-all ${
                tier.highlight
                  ? 'border-brand-gold/40 bg-brand-gold-dim'
                  : 'border-brand-glass-border bg-brand-glass-bg hover:border-brand-gold/20 hover:bg-brand-glass-bg-hover'
              }`}
              style={{ WebkitBackdropFilter: 'blur(12px)' }}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand-gold px-4 py-1 text-xs font-semibold tracking-wide text-brand-dark">
                  Most Popular
                </span>
              )}

              <h3 className="font-display text-2xl text-brand-light">{tier.name}</h3>

              <div className="mt-4 flex items-baseline gap-1">
                {tier.price !== 'Custom' && (
                  <span className="text-sm text-brand-silver">&euro;</span>
                )}
                <span className="font-display text-4xl text-brand-gold">{tier.price}</span>
                {tier.period && (
                  <span className="text-sm text-brand-silver">{tier.period}</span>
                )}
              </div>

              <p className="mt-3 text-sm leading-relaxed text-brand-silver">
                {tier.description}
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-brand-silver">
                    <span className="mt-0.5 text-brand-teal">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/contact-sales"
                className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold tracking-wide transition-opacity hover:opacity-90 ${
                  tier.highlight
                    ? 'bg-brand-gold text-brand-dark'
                    : 'border border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10'
                }`}
              >
                {tier.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
              </Link>
            </div>
          ))}
        </div>

        {/* Corporate note */}
        <div
          className="mt-16 rounded-xl border border-brand-glass-border bg-brand-glass-bg p-8 text-center backdrop-blur-sm sm:p-12"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          <h2 className="font-display text-2xl text-brand-light">Corporate Wellness</h2>
          <p className="mt-3 text-brand-silver">
            Tailored programmes for organisations. Volume discounts, dedicated account
            management, and custom reporting for your leadership team.
          </p>
          <Link
            href="/contact-sales"
            className="mt-6 inline-block rounded-lg bg-brand-gold px-8 py-3 text-sm font-semibold tracking-wide text-brand-dark transition-opacity hover:opacity-90"
          >
            Enquire About Corporate Plans
          </Link>
        </div>
      </div>
    </main>
  )
}
