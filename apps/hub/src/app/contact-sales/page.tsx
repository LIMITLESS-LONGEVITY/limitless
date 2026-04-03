'use client'

import { useState, type FormEvent } from 'react'

const inquiryTypes = [
  { value: 'GENERAL', label: 'General Enquiry' },
  { value: 'MEMBERSHIP', label: 'Membership' },
  { value: 'CORPORATE_WELLNESS', label: 'Corporate Wellness' },
  { value: 'HOTEL_PARTNERSHIP', label: 'Hotel Partnership' },
  { value: 'MEDIA', label: 'Media & Press' },
] as const

type InquiryType = (typeof inquiryTypes)[number]['value']

interface FormErrors {
  name?: string
  email?: string
  message?: string
  type?: string
  employeeCount?: string
}

function validate(data: {
  name: string
  email: string
  message: string
  type: string
  employeeCount: string
}): FormErrors {
  const errors: FormErrors = {}
  if (!data.name.trim()) errors.name = 'Name is required.'
  if (!data.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!data.message.trim()) errors.message = 'Message is required.'
  if (!data.type) errors.type = 'Please select an enquiry type.'
  if (data.type === 'CORPORATE_WELLNESS' && data.employeeCount) {
    const n = Number(data.employeeCount)
    if (isNaN(n) || n < 1) errors.employeeCount = 'Enter a valid number.'
  }
  return errors
}

export default function ContactSalesPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [type, setType] = useState<InquiryType | ''>('')
  const [employeeCount, setEmployeeCount] = useState('')
  const [message, setMessage] = useState('')

  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [serverError, setServerError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setServerError('')

    const validationErrors = validate({ name, email, message, type, employeeCount })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setStatus('submitting')

    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        type,
      }
      if (phone.trim()) body.phone = phone.trim()
      if (company.trim()) body.company = company.trim()
      if (type === 'CORPORATE_WELLNESS' && employeeCount) {
        body.employeeCount = Number(employeeCount)
      }

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      setStatus('success')
    } catch (err) {
      setStatus('error')
      setServerError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    }
  }

  if (status === 'success') {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6">
        <div
          className="max-w-md rounded-xl border border-brand-glass-border bg-brand-glass-bg p-10 text-center backdrop-blur-sm"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-teal/20">
            <span className="text-3xl text-brand-teal">&#10003;</span>
          </div>
          <h1 className="font-display text-2xl text-brand-light">Thank You</h1>
          <p className="mt-3 text-brand-silver">
            Your enquiry has been received. Our team will be in touch within 24 hours.
          </p>
        </div>
      </main>
    )
  }

  const inputClasses =
    'w-full rounded-lg border border-brand-glass-border bg-brand-glass-bg px-4 py-3 text-sm text-brand-light placeholder:text-brand-silver/50 backdrop-blur-sm focus:border-brand-gold/50 focus:outline-none focus:ring-1 focus:ring-brand-gold/30'

  return (
    <main className="px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <h1 className="font-display text-4xl text-brand-gold sm:text-5xl">Contact Sales</h1>
          <p className="mt-4 text-lg text-brand-silver">
            Tell us about your needs and our team will craft a personalised proposal.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-12 rounded-xl border border-brand-glass-border bg-brand-glass-bg p-8 backdrop-blur-sm sm:p-10"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
          noValidate
        >
          {serverError && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {serverError}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-brand-silver">
              Name <span className="text-brand-gold">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClasses}
              placeholder="Your full name"
              style={{ WebkitBackdropFilter: 'blur(8px)' }}
            />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="mt-5">
            <label htmlFor="email" className="block text-sm font-medium text-brand-silver">
              Email <span className="text-brand-gold">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses}
              placeholder="your@email.com"
              style={{ WebkitBackdropFilter: 'blur(8px)' }}
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>

          {/* Phone (optional) */}
          <div className="mt-5">
            <label htmlFor="phone" className="block text-sm font-medium text-brand-silver">
              Phone <span className="text-xs text-brand-silver/60">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClasses}
              placeholder="+34 600 000 000"
              style={{ WebkitBackdropFilter: 'blur(8px)' }}
            />
          </div>

          {/* Company (optional) */}
          <div className="mt-5">
            <label htmlFor="company" className="block text-sm font-medium text-brand-silver">
              Company <span className="text-xs text-brand-silver/60">(optional)</span>
            </label>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={inputClasses}
              placeholder="Your organisation"
              style={{ WebkitBackdropFilter: 'blur(8px)' }}
            />
          </div>

          {/* Inquiry type */}
          <div className="mt-5">
            <label htmlFor="type" className="block text-sm font-medium text-brand-silver">
              Enquiry Type <span className="text-brand-gold">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as InquiryType)}
              className={inputClasses}
              style={{ WebkitBackdropFilter: 'blur(8px)' }}
            >
              <option value="">Select an option</option>
              {inquiryTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors.type && <p className="mt-1 text-xs text-red-400">{errors.type}</p>}
          </div>

          {/* Employee count (conditional) */}
          {type === 'CORPORATE_WELLNESS' && (
            <div className="mt-5">
              <label htmlFor="employeeCount" className="block text-sm font-medium text-brand-silver">
                Number of Employees
              </label>
              <input
                id="employeeCount"
                type="number"
                min={1}
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                className={inputClasses}
                placeholder="e.g. 250"
                style={{ WebkitBackdropFilter: 'blur(8px)' }}
              />
              {errors.employeeCount && (
                <p className="mt-1 text-xs text-red-400">{errors.employeeCount}</p>
              )}
            </div>
          )}

          {/* Message */}
          <div className="mt-5">
            <label htmlFor="message" className="block text-sm font-medium text-brand-silver">
              Message <span className="text-brand-gold">*</span>
            </label>
            <textarea
              id="message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={inputClasses}
              placeholder="Tell us about your goals, timeline, and any specific requirements..."
              style={{ WebkitBackdropFilter: 'blur(8px)' }}
            />
            {errors.message && <p className="mt-1 text-xs text-red-400">{errors.message}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="mt-8 w-full rounded-lg bg-brand-gold py-3 text-sm font-semibold tracking-wide text-brand-dark transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === 'submitting' ? 'Sending...' : 'Send Enquiry'}
          </button>
        </form>
      </div>
    </main>
  )
}
