import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import React from 'react'
import HealthProfileClient from './HealthProfileClient'

export const dynamic = 'force-dynamic'

/**
 * Fetch health profile from Digital Twin API (source of truth).
 */
async function fetchHealthFromDT(userId: string): Promise<any | null> {
  const dtUrl = process.env.DT_SERVICE_URL
  const dtKey = process.env.DT_SERVICE_KEY

  if (!dtUrl || !dtKey) return null

  try {
    const headers = { 'x-service-key': dtKey }

    const [profileRes, biomarkersRes] = await Promise.all([
      fetch(`${dtUrl}/api/twin/${userId}/profile`, { headers }),
      fetch(`${dtUrl}/api/twin/${userId}/biomarkers?limit=50`, { headers }),
    ])

    if (!profileRes.ok) return null

    const profile = await profileRes.json()
    const bioData = biomarkersRes.ok ? await biomarkersRes.json() : null
    const biomarkers = bioData?.biomarkers ?? []

    return {
      user: userId,
      conditions: (profile.conditions ?? []).map((c: string) => ({ condition: c })),
      medications: (profile.medications ?? []).map((m: string) => ({ medication: m })),
      healthGoals: (profile.healthGoals ?? []).map((g: string) => ({ goal: g })),
      pillarPriorities: Object.entries(profile.pillarPriorities ?? {} as Record<string, number>)
        .sort(([, a], [, b]) => (a as number) - (b as number))
        .map(([key]) => ({ pillar: { name: key } })),
      biomarkers: biomarkers.map((b: any) => ({
        name: b.name,
        value: b.value,
        unit: b.unit,
        date: b.measuredAt,
        normalRangeLow: b.referenceMin ?? undefined,
        normalRangeHigh: b.referenceMax ?? undefined,
        status: b.status,
      })),
    }
  } catch (err) {
    console.error('[health/page] DT error:', (err as Error).message)
    return null
  }
}

export default async function HealthProfilePage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) return null

  const userId = user.id as string

  const existingProfile = await fetchHealthFromDT(userId)

  // Fetch content pillars for priorities (always from Payload — PATHS content)
  const pillarsResult = await payload.find({
    collection: 'content-pillars',
    where: { isActive: { equals: true } },
    sort: 'displayOrder',
    limit: 20,
  })

  const pillars = pillarsResult.docs.map((p: any) => ({
    id: p.id,
    name: p.name,
  }))

  return (
    <HealthProfileClient
      existingProfile={existingProfile}
      pillars={pillars}
      userId={userId}
    />
  )
}
