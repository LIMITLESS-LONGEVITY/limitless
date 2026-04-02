import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export interface TestUserData {
  email: string
  password: string
  firstName: string
  lastName: string
  role: string
}

/**
 * Seeds a test user with proper tenant and tier assignment.
 * Returns the created user with ID.
 */
export async function seedTestUser(userData: TestUserData): Promise<any> {
  const payload = await getPayload({ config })

  // Ensure tenant exists
  let tenant = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: 'test-tenant' } },
    limit: 1,
    overrideAccess: true,
  })

  let tenantId: number
  if (tenant.totalDocs === 0) {
    const created = await payload.create({
      collection: 'tenants',
      data: { name: 'Test Tenant', slug: 'test-tenant' },
      overrideAccess: true,
    })
    tenantId = created.id as number
  } else {
    tenantId = tenant.docs[0].id as number
  }

  // Ensure free tier exists
  let freeTier = await payload.find({
    collection: 'membership-tiers',
    where: { slug: { equals: 'free' } },
    limit: 1,
    overrideAccess: true,
  })

  let tierId: number | undefined
  if (freeTier.totalDocs > 0) {
    tierId = freeTier.docs[0].id as number
  }

  // Delete existing user if any
  await payload.delete({
    collection: 'users',
    where: { email: { equals: userData.email } },
    overrideAccess: true,
  })

  // Create user with tenant and tier
  const user = await payload.create({
    collection: 'users',
    data: {
      ...userData,
      tenants: [{ tenant: tenantId }],
      ...(tierId ? { tier: tierId } : {}),
    } as any,
    overrideAccess: true,
  })

  return user
}

/**
 * Seeds all test users for the E2E suite.
 */
export async function seedAllTestUsers(users: TestUserData[]): Promise<Map<string, any>> {
  const created = new Map<string, any>()
  for (const user of users) {
    const result = await seedTestUser(user)
    created.set(user.role, result)
  }
  return created
}

/**
 * Cleans up all test users.
 */
export async function cleanupTestUsers(emails: string[]): Promise<void> {
  const payload = await getPayload({ config })
  for (const email of emails) {
    await payload.delete({
      collection: 'users',
      where: { email: { equals: email } },
      overrideAccess: true,
    }).catch(() => {})
  }
}
