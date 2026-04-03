import type { CollectionAfterReadHook } from 'payload'
import { getEffectiveAccessLevels, type AccessLevel } from '../utilities/accessLevels'
import { getUserAccessLevel, getUserTenantAccessLevel } from '../utilities/types'

/**
 * Check if an article's relatedCourses overlap with the user's enrolled course IDs.
 * Exported for testing.
 */
export function shouldBypassForEnrollment(
  relatedCourses: any[] | undefined | null,
  enrolledCourseIds: string[],
): boolean {
  if (!relatedCourses || !Array.isArray(relatedCourses) || relatedCourses.length === 0) {
    return false
  }
  return relatedCourses.some((course) => {
    const courseId = typeof course === 'string' ? course : course?.id
    return courseId && enrolledCourseIds.includes(courseId)
  })
}

/**
 * Shared afterRead hook for content collections (Articles, Courses).
 * Computes whether the content is locked for the requesting user.
 *
 * Adds virtual fields to API response:
 * - `locked: boolean` — whether the user lacks access
 * - For locked content: `content` is replaced with a teaser (excerpt only)
 *
 * This is a virtual field pattern — `locked` is not a database column.
 *
 * Course Reference Bypass: Articles linked from courses via `relatedCourses`
 * skip the tier check for users enrolled in those courses.
 */
export const computeLockedStatus: CollectionAfterReadHook = async ({ doc, req }) => {
  const user = req.user

  // Admin bypass — never locked
  if (user?.role && ['admin', 'publisher', 'editor'].includes(user.role as string)) {
    return { ...doc, locked: false }
  }

  const effectiveLevels = getEffectiveAccessLevels(getUserAccessLevel(user), getUserTenantAccessLevel(user))

  const contentLevel = doc.accessLevel as string
  const locked = !effectiveLevels.includes(contentLevel as AccessLevel)

  if (locked && user) {
    // Course Reference Bypass: check if user is enrolled in a related course
    // Uses article.relatedCourses (not course.relatedArticles)
    const relatedCourses = doc.relatedCourses as any[] | undefined
    if (relatedCourses && relatedCourses.length > 0) {
      try {
        const enrollments = await req.payload.find({
          collection: 'enrollments',
          where: {
            and: [
              { user: { equals: user.id } },
              { status: { equals: 'active' } },
            ],
          },
          limit: 100,
          depth: 0,
          req,
          overrideAccess: false,
        })

        const enrolledCourseIds = enrollments.docs.map((e: any) =>
          typeof e.course === 'string' ? e.course : e.course?.id,
        ).filter(Boolean) as string[]

        if (shouldBypassForEnrollment(relatedCourses, enrolledCourseIds)) {
          return { ...doc, locked: false }
        }
      } catch {
        // If enrollment check fails, fall through to locked
      }
    }
  }

  if (locked) {
    return {
      ...doc,
      locked: true,
      content: null,
    }
  }

  return { ...doc, locked: false }
}
