/**
 * Fetch a user's health profile from the Digital Twin API.
 * DT is the source of truth for health data. Returns null on failure.
 * Used by AI endpoints for personalization with graceful degradation.
 */
export async function getHealthProfile(userId: string): Promise<any | null> {
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

    return transformDTResponse(profile, bioData?.biomarkers ?? [])
  } catch (err) {
    console.error('[getHealthProfile] DT error:', (err as Error).message)
    return null
  }
}

/**
 * Transform DT API response to the shape AI endpoints expect.
 */
function transformDTResponse(
  profile: {
    conditions?: string[]
    medications?: string[]
    healthGoals?: string[]
    pillarPriorities?: Record<string, number>
  },
  biomarkers: {
    name: string
    value: number
    unit: string
    measuredAt: string
    referenceMin?: number | null
    referenceMax?: number | null
    status: string
  }[],
): any {
  return {
    conditions: (profile.conditions ?? []).map((c) => ({ condition: c })),
    medications: (profile.medications ?? []).map((m) => ({ medication: m })),
    healthGoals: (profile.healthGoals ?? []).map((g) => ({ goal: g })),
    pillarPriorities: Object.entries(profile.pillarPriorities ?? {})
      .sort(([, a], [, b]) => a - b)
      .map(([key]) => ({ pillar: { name: key } })),
    biomarkers: biomarkers.map((b) => ({
      name: b.name,
      value: b.value,
      unit: b.unit,
      date: b.measuredAt,
      normalRangeLow: b.referenceMin ?? undefined,
      normalRangeHigh: b.referenceMax ?? undefined,
      status: b.status,
    })),
  }
}
