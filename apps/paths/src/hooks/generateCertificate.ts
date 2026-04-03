import type { CollectionAfterChangeHook } from 'payload'

/**
 * Auto-generate a certificate when an enrollment status changes to 'completed'.
 * Runs as afterChange hook on the Enrollments collection.
 */
export const generateCertificate: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation: _operation,
}) => {
  // Only trigger on status change to 'completed'
  if (doc.status !== 'completed') return doc
  if (previousDoc?.status === 'completed') return doc // Already completed, skip

  const { payload } = req

  try {
    // Check if certificate already exists for this enrollment
    const existing = await payload.find({
      collection: 'certificates',
      where: { enrollment: { equals: doc.id } },
      limit: 1,
      overrideAccess: true,
      req,
    })

    if (existing.docs.length > 0) return doc // Certificate already issued

    // Fetch course with instructor and pillar
    const courseId = typeof doc.course === 'object' ? doc.course.id : doc.course
    const course = await payload.findByID({
      collection: 'courses',
      id: courseId,
      depth: 1,
      overrideAccess: true,
      req,
    })

    if (!course) return doc

    const pillarName = typeof course.pillar === 'object' ? course.pillar?.name : undefined
    const instructor = typeof course.instructor === 'object' ? course.instructor : null
    const instructorName = instructor
      ? [instructor.firstName, instructor.lastName].filter(Boolean).join(' ')
      : undefined

    // Generate unique certificate number
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    const certificateNumber = `PATHS-${timestamp}-${random}`

    const userId = typeof doc.user === 'object' ? doc.user.id : doc.user

    // Create certificate
    await payload.create({
      collection: 'certificates',
      data: {
        user: userId,
        enrollment: doc.id,
        course: courseId,
        courseTitle: course.title,
        coursePillar: pillarName,
        instructorName,
        estimatedDuration: course.estimatedDuration,
        certificateNumber,
        issuedAt: new Date().toISOString(),
        type: 'completion',
      },
      overrideAccess: true,
      req,
    })

    payload.logger.info(
      `Certificate ${certificateNumber} issued for enrollment ${doc.id} (${course.title})`,
    )
  } catch (err: any) {
    // Don't fail the enrollment update if certificate generation fails
    payload.logger.error({ err, message: `Failed to generate certificate for enrollment ${doc.id}` })
  }

  return doc
}
