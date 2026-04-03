import type { CollectionAfterChangeHook } from 'payload'

export function calculateCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export const updateEnrollmentProgress: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (doc.status === previousDoc?.status) return doc

  const enrollmentId = typeof doc.enrollment === 'string' ? doc.enrollment : doc.enrollment?.id
  if (!enrollmentId) return doc

  try {
    const enrollment = await req.payload.findByID({
      collection: 'enrollments',
      id: enrollmentId,
      req,
      depth: 0,
    })

    const courseId =
      typeof enrollment.course === 'string'
        ? enrollment.course
        : (enrollment.course as { id?: string })?.id
    if (!courseId) return doc

    const course = await req.payload.findByID({
      collection: 'courses',
      id: courseId,
      req,
      depth: 1,
    })

    const moduleIds = Array.isArray(course.modules) ? course.modules : []
    let totalLessons = 0

    for (const mod of moduleIds) {
      const moduleDoc =
        typeof mod === 'object'
          ? mod
          : await req.payload.findByID({
              collection: 'modules',
              id: mod as string,
              req,
              depth: 0,
            })
      const lessons = Array.isArray(moduleDoc?.lessons)
        ? moduleDoc.lessons
        : []
      totalLessons += lessons.length
    }

    const completedProgress = await req.payload.find({
      collection: 'lesson-progress',
      where: {
        and: [
          { enrollment: { equals: enrollmentId } },
          { status: { equals: 'completed' } },
        ],
      },
      limit: 0,
      req,
    })

    const completedLessons = completedProgress.totalDocs
    const percentage = calculateCompletionPercentage(completedLessons, totalLessons)

    const updateData: Record<string, any> = {
      completionPercentage: percentage,
    }

    if (percentage === 100 && enrollment.status === 'active') {
      updateData.status = 'completed'
      updateData.completedAt = new Date().toISOString()
    }

    await req.payload.update({
      collection: 'enrollments',
      id: enrollmentId,
      data: updateData,
      req,
    })
  } catch (err) {
    console.error('[updateEnrollmentProgress] Error:', (err as Error).message)
  }

  return doc
}
