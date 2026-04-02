import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import React from 'react'
import { isTenantManager, getUserTenantId } from '@/utilities/isTenantManager'
import TeamDashboardClient from './TeamDashboardClient'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user || !isTenantManager(user)) return redirect('/account')

  const tenantId = getUserTenantId(user)
  if (!tenantId) return redirect('/account')

  // Fetch tenant config
  const tenant = await payload.findByID({
    collection: 'tenants',
    id: tenantId,
    depth: 0,
    overrideAccess: true,
  })

  // Fetch all users in this tenant
  const staffResult = await payload.find({
    collection: 'users',
    where: {
      'tenants.tenant': { equals: tenantId },
    },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })

  const staffIds = staffResult.docs.map((u: any) => u.id)

  // Fetch enrollments + certificates for staff in parallel
  const [enrollmentsResult, certificatesResult] = staffIds.length > 0
    ? await Promise.all([
        payload.find({
          collection: 'enrollments',
          where: { user: { in: staffIds } },
          depth: 1,
          limit: 500,
          overrideAccess: true,
        }),
        payload.find({
          collection: 'certificates',
          where: { user: { in: staffIds } },
          depth: 0,
          limit: 500,
          overrideAccess: true,
        }),
      ])
    : [{ docs: [] }, { docs: [] }]

  // Build per-staff data
  const now = new Date()
  let overdueCount = 0

  const staff = staffResult.docs.map((member: any) => {
    const memberEnrollments = enrollmentsResult.docs
      .filter((e: any) => {
        const uid = typeof e.user === 'object' ? e.user.id : e.user
        return uid === member.id
      })
      .map((e: any) => {
        const course = typeof e.course === 'object' ? e.course : null
        return {
          courseTitle: course?.title || 'Course',
          status: e.status,
          completionPercentage: e.completionPercentage ?? 0,
          enrolledAt: e.enrolledAt,
          completedAt: e.completedAt,
        }
      })

    const memberCerts = certificatesResult.docs
      .filter((c: any) => {
        const uid = typeof c.user === 'object' ? c.user.id : c.user
        return uid === member.id
      })
      .map((c: any) => {
        const isExpired = c.expiresAt ? new Date(c.expiresAt) < now : false
        const isExpiringSoon = c.expiresAt
          ? new Date(c.expiresAt).getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000 && !isExpired
          : false
        if (isExpired) overdueCount++
        return {
          courseTitle: c.courseTitle,
          certificateNumber: c.certificateNumber,
          issuedAt: c.issuedAt,
          expiresAt: c.expiresAt,
          isExpired,
          isExpiringSoon,
        }
      })

    const hasActiveEnrollment = memberEnrollments.some((e: any) => e.status === 'active')
    const allCompleted = memberEnrollments.length > 0 && memberEnrollments.every((e: any) => e.status === 'completed')
    const status = memberEnrollments.length === 0
      ? 'not-started'
      : allCompleted
        ? 'completed'
        : hasActiveEnrollment
          ? 'in-progress'
          : 'not-started'

    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      role: member.role,
      enrollments: memberEnrollments,
      certificates: memberCerts,
      status,
    }
  })

  const activeEnrollments = enrollmentsResult.docs.filter((e: any) => e.status === 'active').length
  const completedCerts = certificatesResult.docs.length

  return (
    <TeamDashboardClient
      tenantName={tenant.name}
      organizationName={tenant.organizationName || tenant.name}
      certificationEnabled={tenant.certificationEnabled || false}
      certificationExpiry={tenant.certificationExpiry || null}
      stats={{
        totalStaff: staffResult.docs.length,
        activeEnrollments,
        completedCertifications: completedCerts,
        overdue: overdueCount,
      }}
      staff={staff}
    />
  )
}
