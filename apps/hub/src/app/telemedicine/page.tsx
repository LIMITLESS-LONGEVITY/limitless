import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Telemedicine',
  description: 'On-demand longevity consultations — initial assessments, follow-ups, and specialist referrals from anywhere.',
}

const steps = [
  {
    number: '01',
    title: 'Book',
    description:
      'Choose a consultation type, select your preferred time slot, and tell us what you\'d like to discuss. Available 7 days a week.',
  },
  {
    number: '02',
    title: 'Consult',
    description:
      'Meet your clinician via secure video. Share wearable data, review diagnostics, and receive personalised recommendations in real time.',
  },
  {
    number: '03',
    title: 'Follow-up',
    description:
      'Receive a written summary, updated action plan, and any prescriptions or referrals within 24 hours. Your coaching team is notified automatically.',
  },
]

const consultTypes = [
  {
    name: 'Initial Consultation',
    duration: '60 minutes',
    description:
      'A thorough introduction to your health history, goals, and current biomarkers. Your clinician will create a personalised longevity roadmap.',
    price: '\u20AC250',
    note: 'Included with E-Clinic membership',
  },
  {
    name: 'Follow-up',
    duration: '30 minutes',
    description:
      'Review progress, adjust protocols, and address new concerns. Ideal for monthly check-ins between diagnostic cycles.',
    price: '\u20AC120',
    note: 'Included with E-Clinic membership',
  },
  {
    name: 'Specialist Referral',
    duration: '45 minutes',
    description:
      'Connect with a specialist in cardiology, endocrinology, sleep medicine, or sports performance from our global network.',
    price: '\u20AC350',
    note: '20% off with E-Clinic membership',
  },
]

export default function TelemedicinePage() {
  return (
    <main className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-4xl text-brand-gold sm:text-5xl">
            Telemedicine
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-brand-silver">
            Longevity medicine without borders. Consult with our clinical team from
            anywhere in the world, integrated with your wearable and diagnostic data.
          </p>
        </div>

        {/* How it works */}
        <div className="mt-20">
          <h2 className="font-display text-center text-2xl text-brand-light sm:text-3xl">
            How It Works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-xl border border-brand-glass-border bg-brand-glass-bg p-8 text-center backdrop-blur-sm"
                style={{ WebkitBackdropFilter: 'blur(12px)' }}
              >
                <span className="font-display text-4xl text-brand-gold">{step.number}</span>
                <h3 className="mt-4 font-display text-xl text-brand-light">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-brand-silver">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Consultation types */}
        <div className="mt-24">
          <h2 className="font-display text-center text-2xl text-brand-light sm:text-3xl">
            Consultation Types
          </h2>
          <p className="mt-4 text-center text-brand-silver">
            Pay per session, or access unlimited consultations with the E-Clinic membership.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {consultTypes.map((consult) => (
              <div
                key={consult.name}
                className="flex flex-col rounded-xl border border-brand-glass-border bg-brand-glass-bg p-8 backdrop-blur-sm"
                style={{ WebkitBackdropFilter: 'blur(12px)' }}
              >
                <h3 className="font-display text-xl text-brand-light">{consult.name}</h3>
                <p className="mt-1 text-sm text-brand-teal">{consult.duration}</p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-brand-silver">
                  {consult.description}
                </p>
                <div className="mt-6 border-t border-brand-glass-border pt-4">
                  <p className="font-display text-2xl text-brand-gold">{consult.price}</p>
                  <p className="mt-1 text-xs text-brand-teal">{consult.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* E-Clinic callout */}
        <div
          className="mt-20 rounded-xl border border-brand-glass-border bg-brand-glass-bg p-8 text-center backdrop-blur-sm sm:p-12"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          <h2 className="font-display text-2xl text-brand-light sm:text-3xl">
            E-Clinic Membership
          </h2>
          <p className="mt-2 font-display text-3xl text-brand-gold">
            &euro;99<span className="text-lg text-brand-silver">/mo</span>
          </p>
          <p className="mt-4 max-w-xl mx-auto text-brand-silver">
            Unlimited telemedicine consultations, AI-powered coaching, wearable dashboard,
            and monthly health reports. The most accessible way to begin your longevity journey.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/memberships"
              className="rounded-lg border border-brand-gold/30 px-8 py-3 text-sm font-semibold tracking-wide text-brand-gold transition-colors hover:bg-brand-gold/10"
            >
              View All Memberships
            </Link>
            <Link
              href="/contact-sales"
              className="rounded-lg bg-brand-gold px-8 py-3 text-sm font-semibold tracking-wide text-brand-dark transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
