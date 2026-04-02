import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

/**
 * Seeds content pillars if they don't exist.
 */
export async function seedPillars(): Promise<number> {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'content-pillars',
    where: { slug: { equals: 'test-nutrition' } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.totalDocs > 0) return existing.docs[0].id as number

  const pillar = await payload.create({
    collection: 'content-pillars',
    data: {
      name: 'Test Nutrition',
      slug: 'test-nutrition',
      description: 'Test pillar for E2E',
      isActive: true,
      displayOrder: 99,
    },
    overrideAccess: true,
  })

  return pillar.id as number
}

/**
 * Seeds membership tiers if they don't exist.
 */
export async function seedTiers(): Promise<{ freeId: number; premiumId: number }> {
  const payload = await getPayload({ config })

  let freeId: number
  let premiumId: number

  const freeTier = await payload.find({
    collection: 'membership-tiers',
    where: { slug: { equals: 'free' } },
    limit: 1,
    overrideAccess: true,
  })
  if (freeTier.totalDocs > 0) {
    freeId = freeTier.docs[0].id as number
  } else {
    const created = await payload.create({
      collection: 'membership-tiers',
      data: { name: 'Free', slug: 'free', accessLevel: 'free', isActive: true, displayOrder: 0 },
      overrideAccess: true,
    })
    freeId = created.id as number
  }

  const premiumTier = await payload.find({
    collection: 'membership-tiers',
    where: { slug: { equals: 'premium' } },
    limit: 1,
    overrideAccess: true,
  })
  if (premiumTier.totalDocs > 0) {
    premiumId = premiumTier.docs[0].id as number
  } else {
    const created = await payload.create({
      collection: 'membership-tiers',
      data: { name: 'Premium', slug: 'premium', accessLevel: 'premium', isActive: true, displayOrder: 2, monthlyPrice: 29 },
      overrideAccess: true,
    })
    premiumId = created.id as number
  }

  return { freeId, premiumId }
}

/**
 * Seeds a test article.
 */
export async function seedArticle(data: {
  title: string
  slug: string
  excerpt: string
  accessLevel: string
  editorialStatus?: string
  authorId: number
  tenantId: number
  pillarId: number
  content?: any
}): Promise<any> {
  const payload = await getPayload({ config })

  // Delete existing articles matching this slug
  await payload.delete({
    collection: 'articles',
    where: { slug: { equals: data.slug } },
    overrideAccess: true,
  }).catch(() => {})

  return payload.create({
    collection: 'articles',
    data: {
      title: data.title,
      slug: data.slug,
      generateSlug: false,
      excerpt: data.excerpt,
      accessLevel: data.accessLevel,
      editorialStatus: data.editorialStatus ?? 'draft',
      author: data.authorId,
      tenant: data.tenantId,
      pillar: data.pillarId,
      content: data.content,
    } as any,
    overrideAccess: true,
  })
}

/**
 * Seeds a test course with modules and lessons.
 */
export async function seedCourse(data: {
  title: string
  slug: string
  accessLevel: string
  tenantId: number
  pillarId: number
  instructorId: number
}): Promise<{ courseId: number; moduleId: number; lessonIds: number[] }> {
  const payload = await getPayload({ config })

  // Delete existing course matching this slug
  await payload.delete({
    collection: 'courses',
    where: { slug: { equals: data.slug } },
    overrideAccess: true,
  }).catch(() => {})

  // Clean up lessons from previous runs
  await payload.delete({
    collection: 'lessons',
    where: { slug: { contains: `${data.slug}-lesson` } },
    overrideAccess: true,
  }).catch(() => {})

  const course = await payload.create({
    collection: 'courses',
    data: {
      title: data.title,
      slug: data.slug,
      accessLevel: data.accessLevel,
      editorialStatus: 'published',
      tenant: data.tenantId,
      pillar: data.pillarId,
      instructor: data.instructorId,
    } as any,
    overrideAccess: true,
  })

  const testModule = await payload.create({
    collection: 'modules',
    data: {
      title: 'Test Module 1',
      course: course.id,
      order: 1,
      tenant: data.tenantId,
    } as any,
    overrideAccess: true,
  })

  const lesson1 = await payload.create({
    collection: 'lessons',
    data: {
      title: 'Lesson 1: Introduction',
      slug: `${data.slug}-lesson-1-intro`,
      module: testModule.id,
      order: 1,
      lessonType: 'text',
      estimatedDuration: 10,
      tenant: data.tenantId,
      content: {
        root: {
          type: 'root',
          children: [
            { type: 'paragraph', children: [{ type: 'text', text: 'Lesson 1 content for testing.' }] },
          ],
          direction: null, format: '', indent: 0, version: 1,
        },
      },
    } as any,
    overrideAccess: true,
  })

  const lesson2 = await payload.create({
    collection: 'lessons',
    data: {
      title: 'Lesson 2: Deep Dive',
      slug: `${data.slug}-lesson-2-deep-dive`,
      module: testModule.id,
      order: 2,
      lessonType: 'text',
      estimatedDuration: 15,
      tenant: data.tenantId,
    } as any,
    overrideAccess: true,
  })

  // Link lessons to module
  await payload.update({
    collection: 'modules',
    id: testModule.id,
    data: { lessons: [lesson1.id, lesson2.id] },
    overrideAccess: true,
  })

  // Link module to course
  await payload.update({
    collection: 'courses',
    id: course.id,
    data: { modules: [testModule.id] },
    overrideAccess: true,
  })

  return {
    courseId: course.id as number,
    moduleId: testModule.id as number,
    lessonIds: [lesson1.id as number, lesson2.id as number],
  }
}
