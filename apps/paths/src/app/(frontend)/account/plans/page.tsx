import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import React from 'react'
import PlansClient from './PlansClient'

export const dynamic = 'force-dynamic'

export default async function PlansPage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) return null

  const result = await payload.find({
    collection: 'action-plans',
    where: { user: { equals: user.id } },
    sort: '-generatedAt',
    depth: 1,
    limit: 20,
    overrideAccess: true,
  })

  const plans = result.docs.map((plan: any) => ({
    id: plan.id,
    courseTitle: typeof plan.course === 'object' ? plan.course?.title : 'Course',
    pillarName: typeof plan.pillar === 'object' ? plan.pillar?.name : undefined,
    status: plan.status,
    plan: plan.plan,
    generatedAt: plan.generatedAt,
  }))

  return <PlansClient plans={plans} />
}
