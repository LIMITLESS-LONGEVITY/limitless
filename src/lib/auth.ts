import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { redirect } from 'next/navigation'

export interface JWTPayload {
  sub: string
  email: string
  role: string
  tier: string
  tenantId?: string
  iat: number
  exp: number
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) return null
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession()
  if (!session) {
    const loginUrl = `${process.env.NEXT_PUBLIC_PATHS_URL}/login?redirect=${process.env.NEXT_PUBLIC_HUB_URL}/dashboard`
    redirect(loginUrl)
  }
  return session
}

const CLINICIAN_ROLES = ['admin', 'contributor', 'editor']

export async function requireClinician(): Promise<JWTPayload> {
  const session = await requireAuth()
  if (!CLINICIAN_ROLES.includes(session.role)) {
    redirect('/dashboard')
  }
  return session
}
