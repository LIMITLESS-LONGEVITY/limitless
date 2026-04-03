import type { CollectionBeforeChangeHook } from 'payload'

export const preventDuplicateEnrollment: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create') return data

  const userId = data.user as string
  const courseId = data.course as string

  if (!userId || !courseId) return data

  const existing = await req.payload.find({
    collection: 'enrollments',
    where: {
      and: [
        { user: { equals: userId } },
        { course: { equals: courseId } },
      ],
    },
    limit: 1,
    req,
  })

  if (existing.totalDocs > 0) {
    throw new Error('User is already enrolled in this course')
  }

  if (!data.enrolledAt) {
    data.enrolledAt = new Date().toISOString()
  }

  return data
}
