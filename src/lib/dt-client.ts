const DT_BASE = process.env.DT_SERVICE_URL || 'https://limitless-digital-twin.onrender.com'

function headers() {
  return {
    'x-service-key': process.env.HUB_SERVICE_KEY || '',
    'Content-Type': 'application/json',
  }
}

export async function getPatientSummary(userId: string) {
  const res = await fetch(`${DT_BASE}/api/twin/${userId}/profile`, {
    headers: headers(),
    next: { revalidate: 60 },
  })
  if (!res.ok) return null
  return res.json()
}

export async function getPatientAIContext(userId: string) {
  const res = await fetch(`${DT_BASE}/api/twin/${userId}/ai-context`, {
    headers: headers(),
    next: { revalidate: 60 },
  })
  if (!res.ok) return null
  return res.json()
}

export async function getPatientBiomarkers(userId: string) {
  const res = await fetch(`${DT_BASE}/api/twin/${userId}/biomarkers?limit=50`, {
    headers: headers(),
    next: { revalidate: 60 },
  })
  if (!res.ok) return null
  return res.json()
}
