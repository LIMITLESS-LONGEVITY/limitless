/**
 * Fetch active stay context from the Digital Twin API.
 * Returns null if no active stay or on failure.
 */
export async function getStayContext(userId: string): Promise<{
  stayType: string
  stayLocation: string
  startDate: string
  endDate: string
  dayNumber: number | null
  phase: string
} | null> {
  const dtUrl = process.env.DT_SERVICE_URL
  const dtKey = process.env.DT_SERVICE_KEY

  if (!dtUrl || !dtKey) return null

  try {
    const res = await fetch(`${dtUrl}/api/twin/${userId}/stay/active`, {
      headers: { 'x-service-key': dtKey },
    })

    if (!res.ok) return null

    const data = await res.json()
    return data.stay ?? null
  } catch {
    return null
  }
}
