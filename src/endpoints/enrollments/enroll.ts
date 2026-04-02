import type { Endpoint } from 'payload'
import { getEffectiveAccessLevels, type AccessLevel } from '../../utilities/accessLevels'
import { getUserAccessLevel, getUserTenantAccessLevel } from '../../utilities/types'

export const enrollEndpoint: Endpoint = {
  path: '/enroll',
  method: 'post',
  handler: async (req) => {
    // 1. Authenticate
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await req.json?.() as { courseId?: string } | undefined

    if (!body?.courseId) {
      return Response.json({ error: 'Missing required field: courseId' }, { status: 400 })
    }

    // 3. Fetch the course (overrideAccess: true to get full doc for access check)
    let course: any
    try {
      course = await req.payload.findByID({
        collection: 'courses',
        id: body.courseId,
        req,
        overrideAccess: true,
        depth: 0,
      })
    } catch {
      return Response.json({ error: 'Course not found' }, { status: 404 })
    }

    // 4. Verify course is published
    if (course.editorialStatus !== 'published') {
      return Response.json({ error: 'Course not found' }, { status: 404 })
    }

    // 5. Verify user has access to this course's tier
    const effectiveLevels = getEffectiveAccessLevels(getUserAccessLevel(req.user), getUserTenantAccessLevel(req.user))

    if (!effectiveLevels.includes(course.accessLevel as AccessLevel)) {
      return Response.json(
        { error: 'Upgrade your plan to access this course' },
        { status: 403 },
      )
    }

    // 6. Check for existing enrollment
    const existing = await req.payload.find({
      collection: 'enrollments',
      where: {
        and: [
          { user: { equals: req.user.id } },
          { course: { equals: body.courseId } },
        ],
      },
      limit: 1,
      req,
    })

    if (existing.totalDocs > 0) {
      return Response.json(
        { error: 'Already enrolled in this course', enrollment: existing.docs[0] },
        { status: 409 },
      )
    }

    // 7. Create enrollment
    try {
      const enrollment = await req.payload.create({
        collection: 'enrollments',
        data: {
          user: req.user.id,
          course: body.courseId,
          enrolledAt: new Date().toISOString(),
          status: 'active',
          paymentStatus: 'free',
          completionPercentage: 0,
        },
        req,
      })

      return Response.json({ enrollment }, { status: 201 })
    } catch (_err) {
      return Response.json(
        { error: 'Failed to create enrollment' },
        { status: 500 },
      )
    }
  },
}
