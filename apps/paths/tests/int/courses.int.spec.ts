import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload
let adminUser: any
let tenantId: number | string

describe('Courses collection', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Ensure a tenant exists (required by multi-tenant plugin)
    const tenants = await payload.find({ collection: 'tenants', overrideAccess: true, limit: 1 })
    if (tenants.totalDocs === 0) {
      const t = await payload.create({ collection: 'tenants', overrideAccess: true, data: { name: 'Test Tenant', slug: 'test-tenant' } })
      tenantId = t.id
    } else {
      tenantId = tenants.docs[0].id
    }

    try {
      adminUser = await payload.create({
        collection: 'users',
        overrideAccess: true,
        data: {
          email: 'courses-test-admin@test.com',
          password: 'TestPassword123!',
          firstName: 'Admin',
          lastName: 'CourseTest',
          role: 'admin',
          tenant: tenantId,
          _verified: true,
        },
      })
    } catch {
      const found = await payload.find({
        collection: 'users',
        overrideAccess: true,
        where: { email: { equals: 'courses-test-admin@test.com' } },
      })
      adminUser = found.docs[0]
    }
  })

  it('creates a course with defaults', async () => {
    const course = await payload.create({
      collection: 'courses',
      overrideAccess: true,
      data: {
        title: 'Test Course',
        slug: 'test-course-crud',
        instructor: adminUser.id,
        tenant: tenantId,
      },
    })
    expect(course.title).toBe('Test Course')
    expect(course.editorialStatus).toBe('draft')
    expect(course.accessLevel).toBe('premium') // Courses default to premium
  })

  it('supports versioning', async () => {
    const course = await payload.create({
      collection: 'courses',
      overrideAccess: true,
      data: {
        title: 'Versioned Course',
        slug: 'test-course-versioned',
        tenant: tenantId,
      },
    })

    await payload.update({
      collection: 'courses',
      id: course.id,
      overrideAccess: true,
      data: { title: 'Versioned Course v2' },
    })

    const versions = await payload.findVersions({
      collection: 'courses',
      overrideAccess: true,
      where: { parent: { equals: course.id } },
    })
    expect(versions.totalDocs).toBeGreaterThanOrEqual(1)
  })
})
