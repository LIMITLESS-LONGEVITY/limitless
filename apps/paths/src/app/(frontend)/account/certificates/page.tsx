import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import React from 'react'
import CertificatesClient from './CertificatesClient'

export const dynamic = 'force-dynamic'

export default async function CertificatesPage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) return null

  const result = await payload.find({
    collection: 'certificates',
    where: { user: { equals: user.id } },
    sort: '-issuedAt',
    limit: 50,
    overrideAccess: true,
  })

  const certificates = result.docs.map((cert: any) => ({
    id: cert.id,
    courseTitle: cert.courseTitle,
    coursePillar: cert.coursePillar,
    instructorName: cert.instructorName,
    certificateNumber: cert.certificateNumber,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    type: cert.type,
  }))

  return <CertificatesClient certificates={certificates} />
}
