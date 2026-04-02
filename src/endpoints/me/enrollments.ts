import type { Endpoint } from 'payload'

/**
 * GET /api/me/enrollments
 * Returns authenticated user's course enrollments with progress.
 * Used by the OS Dashboard learning progress widget.
 */
export const myEnrollmentsEndpoint: Endpoint = {
  path: '/me/enrollments',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const enrollments = await req.payload.find({
      collection: 'enrollments',
      where: { user: { equals: req.user.id } },
      depth: 1,
      limit: 50,
      sort: '-enrolledAt',
      overrideAccess: false,
      user: req.user,
      req,
    })

    const mapped = enrollments.docs.map((enrollment: any) => ({
      id: enrollment.id,
      course: enrollment.course
        ? {
            id: enrollment.course.id || enrollment.course,
            title: enrollment.course.title || '',
            slug: enrollment.course.slug || '',
          }
        : null,
      progress: enrollment.completionPercentage || 0,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      completedAt: enrollment.completedAt || null,
    }))

    const totalActive = mapped.filter((e: any) => e.status === 'active').length
    const totalCompleted = mapped.filter((e: any) => e.status === 'completed').length

    return Response.json({
      enrollments: mapped,
      totalActive,
      totalCompleted,
    })
  },
}
