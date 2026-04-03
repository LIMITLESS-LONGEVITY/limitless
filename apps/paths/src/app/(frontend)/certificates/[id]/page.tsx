import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'
import CertificateViewClient from './CertificateViewClient'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  return []
}

type Args = {
  params: Promise<{ id?: string }>
}

export default async function CertificateViewPage({ params: paramsPromise }: Args) {
  const { id = '' } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  let certificate: any
  try {
    certificate = await payload.findByID({
      collection: 'certificates',
      id,
      depth: 1,
      overrideAccess: true,
    })
  } catch {
    return notFound()
  }

  if (!certificate) return notFound()

  // Get recipient name
  const user = typeof certificate.user === 'object' ? certificate.user : null
  const recipientName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ')
    : 'PATHS Member'

  return (
    <div className="pt-24 pb-24">
      <div className="container max-w-3xl">
        <CertificateViewClient
          certificate={{
            id: certificate.id,
            courseTitle: certificate.courseTitle,
            coursePillar: certificate.coursePillar,
            instructorName: certificate.instructorName,
            estimatedDuration: certificate.estimatedDuration,
            certificateNumber: certificate.certificateNumber,
            issuedAt: certificate.issuedAt,
            expiresAt: certificate.expiresAt,
            type: certificate.type,
            recipientName,
          }}
        />
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { id = '' } = await paramsPromise
  const payload = await getPayload({ config: configPromise })
  try {
    const cert = await payload.findByID({ collection: 'certificates', id, overrideAccess: true })
    return {
      title: `Certificate: ${cert.courseTitle}`,
      description: `Certificate of completion for ${cert.courseTitle} on PATHS by LIMITLESS.`,
    }
  } catch {
    return { title: 'Certificate' }
  }
}
