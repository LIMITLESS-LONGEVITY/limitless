import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'HUB | LIMITLESS Longevity',
  description: 'Your health, redefined. Clinical excellence meets hospitality — memberships, diagnostics, hotel stays, and telemedicine.',
}

const services = [
  {
    title: 'Memberships',
    description: 'Tiered longevity programmes with dedicated coaching, diagnostic discounts, and priority access.',
    href: '/memberships',
    accent: 'text-brand-gold',
  },
  {
    title: 'Diagnostics',
    description: 'Comprehensive health screens and specialist testing powered by Europe\'s leading laboratories.',
    href: '/diagnostics',
    accent: 'text-brand-teal',
  },
  {
    title: 'Hotel Stays',
    description: 'Immersive wellness retreats at El Fuerte Marbella — diagnostics, coaching, and recovery in one stay.',
    href: '/stays',
    accent: 'text-brand-gold',
  },
  {
    title: 'Telemedicine',
    description: 'On-demand consultations with longevity specialists, AI coaching, and wearable-integrated follow-up.',
    href: '/telemedicine',
    accent: 'text-brand-teal',
  },
]

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="flex min-h-[85vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-5xl leading-tight text-brand-gold sm:text-6xl lg:text-7xl">
          Your Health, Redefined
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-silver sm:text-xl">
          Where clinical excellence meets five-star hospitality. Personalised longevity
          programmes designed for executives and high-performers who demand the best.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/memberships"
            className="rounded-lg bg-brand-gold px-8 py-3 text-sm font-semibold tracking-wide text-brand-dark transition-opacity hover:opacity-90"
          >
            Explore Memberships
          </Link>
          <Link
            href="/contact-sales"
            className="rounded-lg border border-brand-glass-border bg-brand-glass-bg px-8 py-3 text-sm font-semibold tracking-wide text-brand-light backdrop-blur-sm transition-colors hover:bg-brand-glass-bg-hover"
            style={{ WebkitBackdropFilter: 'blur(8px)' }}
          >
            Contact Sales
          </Link>
        </div>
      </section>

      {/* Services */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-center text-3xl text-brand-light sm:text-4xl">
            Our Services
          </h2>
          <p className="mt-4 text-center text-brand-silver">
            A unified platform for every dimension of your longevity journey.
          </p>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="group rounded-xl border border-brand-glass-border bg-brand-glass-bg p-8 backdrop-blur-sm transition-all hover:border-brand-gold/30 hover:bg-brand-glass-bg-hover"
                style={{ WebkitBackdropFilter: 'blur(12px)' }}
              >
                <h3 className={`font-display text-xl ${service.accent}`}>
                  {service.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-brand-silver">
                  {service.description}
                </p>
                <span className="mt-4 inline-block text-sm text-brand-gold opacity-0 transition-opacity group-hover:opacity-100">
                  Learn more &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div
          className="mx-auto max-w-3xl rounded-2xl border border-brand-glass-border bg-brand-glass-bg p-12 text-center backdrop-blur-sm sm:p-16"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          <h2 className="font-display text-3xl text-brand-light sm:text-4xl">
            Ready to Begin?
          </h2>
          <p className="mt-4 text-brand-silver">
            Speak with our team about membership options, corporate wellness
            programmes, or hotel partnership enquiries.
          </p>
          <Link
            href="/contact-sales"
            className="mt-8 inline-block rounded-lg bg-brand-gold px-10 py-3 text-sm font-semibold tracking-wide text-brand-dark transition-opacity hover:opacity-90"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </main>
  )
}
