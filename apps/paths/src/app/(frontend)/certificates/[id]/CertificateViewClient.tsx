'use client'
import React from 'react'
import { CertificateCard } from '@/components/CertificateCard'

type Props = {
  certificate: {
    id: string
    courseTitle: string
    coursePillar?: string | null
    instructorName?: string | null
    estimatedDuration?: number | null
    certificateNumber: string
    issuedAt: string
    expiresAt?: string | null
    type: 'completion' | 'certification'
    recipientName: string
  }
}

export default function CertificateViewClient({ certificate }: Props) {
  return <CertificateCard certificate={certificate} variant="full" />
}
