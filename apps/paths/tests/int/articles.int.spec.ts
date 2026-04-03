import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload
let adminUser: any
let pillarId: string
let tenantId: number | string

describe('Articles collection', () => {
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

    // Create admin user for tests (_verified skips email sending)
    try {
      adminUser = await payload.create({
        collection: 'users',
        overrideAccess: true,
        data: {
          email: 'articles-test-admin@test.com',
          password: 'TestPassword123!',
          firstName: 'Admin',
          lastName: 'Test',
          role: 'admin',
          tenant: tenantId,
          _verified: true,
        },
      })
    } catch {
      const found = await payload.find({
        collection: 'users',
        overrideAccess: true,
        where: { email: { equals: 'articles-test-admin@test.com' } },
      })
      adminUser = found.docs[0]
    }

    // Create a pillar for tests
    try {
      const pillar = await payload.create({
        collection: 'content-pillars',
        overrideAccess: true,
        data: { name: 'Test Pillar', slug: 'test-pillar-articles', isActive: true },
      })
      pillarId = pillar.id as string
    } catch {
      const found = await payload.find({
        collection: 'content-pillars',
        overrideAccess: true,
        where: { slug: { equals: 'test-pillar-articles' } },
      })
      pillarId = found.docs[0]?.id as string
    }
  })

  it('creates an article with required fields', async () => {
    const article = await payload.create({
      collection: 'articles',
      overrideAccess: true,
      data: {
        title: 'Test Article',
        slug: 'test-article-crud',
        pillar: pillarId,
        author: adminUser.id,
        editorialStatus: 'draft',
        accessLevel: 'free',
        tenant: tenantId,
      },
    })
    expect(article.title).toBe('Test Article')
    expect(article.editorialStatus).toBe('draft')
    expect(article.accessLevel).toBe('free')
  })

  it('defaults editorialStatus to draft', async () => {
    const article = await payload.create({
      collection: 'articles',
      overrideAccess: true,
      data: {
        title: 'Default Status',
        slug: 'test-article-default-status',
        pillar: pillarId,
        author: adminUser.id,
        tenant: tenantId,
      },
    })
    expect(article.editorialStatus).toBe('draft')
  })

  it('supports versioning', async () => {
    const article = await payload.create({
      collection: 'articles',
      overrideAccess: true,
      data: {
        title: 'Versioned Article',
        slug: 'test-article-versioned',
        pillar: pillarId,
        author: adminUser.id,
        tenant: tenantId,
      },
    })

    // Update should create a version
    await payload.update({
      collection: 'articles',
      id: article.id,
      overrideAccess: true,
      data: { title: 'Versioned Article v2' },
    })

    const versions = await payload.findVersions({
      collection: 'articles',
      overrideAccess: true,
      where: { parent: { equals: article.id } },
    })
    expect(versions.totalDocs).toBeGreaterThanOrEqual(1)
  })
})
