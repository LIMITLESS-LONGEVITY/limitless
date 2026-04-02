/**
 * Fetch JSON safely — returns null if response is not ok or not JSON.
 * Prevents client-side crashes when gateway returns HTML error pages.
 */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { credentials: 'include', ...init })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return null
    return await res.json()
  } catch {
    return null
  }
}
