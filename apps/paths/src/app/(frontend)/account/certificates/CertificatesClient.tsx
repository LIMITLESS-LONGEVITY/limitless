'use client'
import React from 'react'
import { CertificateCard } from '@/components/CertificateCard'
import { CTAButton } from '@/components/homepage/CTAButton'
import { Award } from 'lucide-react'

type Certificate = {
  id: string
  courseTitle: string
  coursePillar?: string | null
  instructorName?: string | null
  certificateNumber: string
  issuedAt: string
  expiresAt?: string | null
  type: 'completion' | 'certification'
}

export default function CertificatesClient({ certificates }: { certificates: Certificate[] }) {
  if (certificates.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="w-10 h-10 mx-auto mb-3 text-brand-silver/30" />
        <p className="text-brand-silver mb-4">
          Complete a course to earn your first certificate.
        </p>
        <CTAButton href="/courses" variant="gold">
          Browse Courses
        </CTAButton>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Certificates</h2>
      <div className="space-y-3">
        {certificates.map((cert) => (
          <CertificateCard key={cert.id} certificate={cert} variant="compact" />
        ))}
      </div>
    </div>
  )
}
