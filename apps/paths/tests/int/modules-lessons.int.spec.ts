import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload
let _adminUser: any
let courseId: string
let tenantId: number | string

describe('Modules and Lessons', () => {
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
      _adminUser = await payload.create({
        collection: 'users',
        overrideAccess: true,
        data: {
          email: 'modules-test-admin@test.com',
          password: 'TestPassword123!',
          firstName: 'Admin',
          lastName: 'ModTest',
          role: 'admin',
          tenant: tenantId,
          _verified: true,
        },
      })
    } catch {
      const found = await payload.find({
        collection: 'users',
        overrideAccess: true,
        where: { email: { equals: 'modules-test-admin@test.com' } },
      })
      _adminUser = found.docs[0]
    }

    try {
      const course = await payload.create({
        collection: 'courses',
        overrideAccess: true,
        data: { title: 'Module Test Course', slug: 'module-test-course', tenant: tenantId },
      })
      courseId = course.id as string
    } catch {
      const found = await payload.find({
        collection: 'courses',
        overrideAccess: true,
        where: { slug: { equals: 'module-test-course' } },
      })
      courseId = found.docs[0]?.id as string
    }
  })

  it('creates a module linked to a course', async () => {
    const mod = await payload.create({
      collection: 'modules',
      overrideAccess: true,
      data: {
        title: 'Module 1: Introduction',
        course: courseId,
        order: 1,
        tenant: tenantId,
      },
    })
    expect(mod.title).toBe('Module 1: Introduction')
    expect(mod.order).toBe(1)
  })

  it('creates a text lesson linked to a module', async () => {
    const mod = await payload.create({
      collection: 'modules',
      overrideAccess: true,
      data: { title: 'Lesson Test Module', course: courseId, order: 2, tenant: tenantId },
    })

    const lesson = await payload.create({
      collection: 'lessons',
      overrideAccess: true,
      data: {
        title: 'Lesson 1: Getting Started',
        slug: 'lesson-1-getting-started',
        module: mod.id,
        order: 1,
        lessonType: 'text',
        estimatedDuration: 15,
        tenant: tenantId,
      },
    })
    expect(lesson.title).toBe('Lesson 1: Getting Started')
    expect(lesson.lessonType).toBe('text')
    expect(lesson.estimatedDuration).toBe(15)
  })

  it('creates a video lesson with YouTube embed', async () => {
    const mod = await payload.create({
      collection: 'modules',
      overrideAccess: true,
      data: { title: 'Video Lesson Module', course: courseId, order: 3, tenant: tenantId },
    })

    const lesson = await payload.create({
      collection: 'lessons',
      overrideAccess: true,
      data: {
        title: 'Video Lesson',
        slug: 'video-lesson-test',
        module: mod.id,
        order: 1,
        lessonType: 'video',
        tenant: tenantId,
        videoEmbed: {
          platform: 'youtube',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          videoId: 'dQw4w9WgXcQ',
        },
        estimatedDuration: 10,
      },
    })
    expect(lesson.lessonType).toBe('video')
    expect(lesson.videoEmbed?.platform).toBe('youtube')
    expect(lesson.videoEmbed?.videoId).toBe('dQw4w9WgXcQ')
  })
})
