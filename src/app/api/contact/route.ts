import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const VALID_TYPES = ['GENERAL', 'MEMBERSHIP', 'CORPORATE_WELLNESS', 'HOTEL_PARTNERSHIP', 'MEDIA'] as const
type InquiryType = (typeof VALID_TYPES)[number]

interface ContactPayload {
  name: string
  email: string
  phone?: string
  company?: string
  message: string
  type: InquiryType
  employeeCount?: number
}

function validatePayload(body: unknown): { data?: ContactPayload; error?: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid request body.' }
  }

  const b = body as Record<string, unknown>

  // Required fields
  if (typeof b.name !== 'string' || !b.name.trim()) {
    return { error: 'Name is required.' }
  }
  if (typeof b.email !== 'string' || !b.email.trim()) {
    return { error: 'Email is required.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) {
    return { error: 'Invalid email address.' }
  }
  if (typeof b.message !== 'string' || !b.message.trim()) {
    return { error: 'Message is required.' }
  }
  if (typeof b.type !== 'string' || !VALID_TYPES.includes(b.type as InquiryType)) {
    return { error: `Type must be one of: ${VALID_TYPES.join(', ')}` }
  }

  // Optional fields
  if (b.phone !== undefined && typeof b.phone !== 'string') {
    return { error: 'Phone must be a string.' }
  }
  if (b.company !== undefined && typeof b.company !== 'string') {
    return { error: 'Company must be a string.' }
  }
  if (b.employeeCount !== undefined) {
    if (typeof b.employeeCount !== 'number' || b.employeeCount < 1 || !Number.isInteger(b.employeeCount)) {
      return { error: 'Employee count must be a positive integer.' }
    }
  }

  return {
    data: {
      name: (b.name as string).trim(),
      email: (b.email as string).trim(),
      message: (b.message as string).trim(),
      type: b.type as InquiryType,
      ...(b.phone ? { phone: (b.phone as string).trim() } : {}),
      ...(b.company ? { company: (b.company as string).trim() } : {}),
      ...(b.employeeCount !== undefined ? { employeeCount: b.employeeCount as number } : {}),
    },
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const { data, error } = validatePayload(body)

    if (error || !data) {
      return NextResponse.json({ error: error || 'Invalid request.' }, { status: 400 })
    }

    const inquiry = await prisma.contactInquiry.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        company: data.company ?? null,
        message: data.message,
        type: data.type,
        employeeCount: data.employeeCount ?? null,
      },
    })

    return NextResponse.json({ id: inquiry.id }, { status: 201 })
  } catch (err) {
    console.error('Contact API error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
