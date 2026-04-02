'use client'
import React from 'react'
import { cn } from '@/utilities/ui'
import { GlassCard } from '@/components/homepage/GlassCard'
import { Award, Printer } from 'lucide-react'
import Link from 'next/link'

type CertificateData = {
  id: string
  courseTitle: string
  coursePillar?: string | null
  instructorName?: string | null
  estimatedDuration?: number | null
  certificateNumber: string
  issuedAt: string
  expiresAt?: string | null
  type: 'completion' | 'certification'
  recipientName?: string
}

export const CertificateCard: React.FC<{
  certificate: CertificateData
  variant?: 'compact' | 'full'
}> = ({ certificate, variant = 'compact' }) => {
  if (variant === 'compact') {
    return (
      <Link href={`/certificates/${certificate.id}`}>
        <GlassCard className="flex items-center gap-4 !p-4">
          <div className="w-10 h-10 rounded-lg bg-brand-gold-dim flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-brand-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate">{certificate.courseTitle}</h3>
            <div className="flex items-center gap-2 text-xs text-brand-silver">
              {certificate.coursePillar && <span>{certificate.coursePillar}</span>}
              <span>{new Date(certificate.issuedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <span className="text-[10px] text-brand-silver/50 font-mono flex-shrink-0">
            {certificate.certificateNumber}
          </span>
        </GlassCard>
      </Link>
    )
  }

  // Full certificate view
  const durationHours = certificate.estimatedDuration
    ? `${Math.floor(certificate.estimatedDuration / 60)}h ${certificate.estimatedDuration % 60}m`
    : null

  return (
    <>
      {/* Print button */}
      <div className="flex justify-end mb-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-xs text-brand-silver hover:text-brand-light transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Certificate
        </button>
      </div>

      {/* Certificate */}
      <div
        className={cn(
          'relative rounded-2xl border-2 border-brand-gold/30 bg-brand-dark-alt p-8 md:p-12',
          'print:border-brand-gold print:bg-white print:text-gray-900',
        )}
      >
        {/* Gold corner accents */}
        <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-brand-gold/40 rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-brand-gold/40 rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-brand-gold/40 rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-brand-gold/40 rounded-br-lg" />

        <div className="text-center">
          {/* Logo */}
          <p className="text-xs uppercase tracking-[0.3em] text-brand-gold font-medium mb-1">
            PATHS by LIMITLESS
          </p>
          <div className="w-16 h-px bg-brand-gold/30 mx-auto mb-6" />

          {/* Certificate type */}
          <p className="text-xs uppercase tracking-[0.2em] text-brand-silver mb-2 print:text-gray-500">
            Certificate of {certificate.type === 'certification' ? 'Certification' : 'Completion'}
          </p>

          {/* Heading */}
          <h1 className="font-display text-sm text-brand-silver mb-2 print:text-gray-500">
            This certifies that
          </h1>

          {/* Recipient name */}
          <p className="font-display text-3xl md:text-4xl font-light tracking-wide text-brand-light mb-4 print:text-gray-900">
            {certificate.recipientName || 'PATHS Member'}
          </p>

          <p className="text-sm text-brand-silver mb-1 print:text-gray-500">
            has successfully completed
          </p>

          {/* Course title */}
          <h2 className="font-display text-xl md:text-2xl font-normal tracking-wide text-brand-gold mb-4 print:text-amber-700">
            {certificate.courseTitle}
          </h2>

          {/* Details */}
          <div className="flex items-center justify-center gap-4 text-xs text-brand-silver mb-8 print:text-gray-500">
            {certificate.coursePillar && <span>{certificate.coursePillar}</span>}
            {durationHours && <span>{durationHours}</span>}
            {certificate.instructorName && <span>Instructor: {certificate.instructorName}</span>}
          </div>

          {/* Divider */}
          <div className="w-24 h-px bg-brand-gold/30 mx-auto mb-6" />

          {/* Date and certificate number */}
          <p className="text-sm text-brand-silver print:text-gray-500">
            Issued {new Date(certificate.issuedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          {certificate.expiresAt && (
            <p className="text-xs text-brand-silver/60 mt-1 print:text-gray-400">
              Valid until {new Date(certificate.expiresAt).toLocaleDateString()}
            </p>
          )}
          <p className="text-[10px] text-brand-silver/40 font-mono mt-3 print:text-gray-400">
            {certificate.certificateNumber}
          </p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          nav, header, footer, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </>
  )
}
