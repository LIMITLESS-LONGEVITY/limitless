import type { CollectionAfterChangeHook } from 'payload'

/**
 * Update user's learning streak when a lesson is completed.
 * Runs as afterChange hook on LessonProgress collection.
 */
export const updateStreak: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}) => {
  // Only trigger when status changes to 'completed'
  if (doc.status !== 'completed') return doc
  if (previousDoc?.status === 'completed') return doc

  const { payload } = req
  const userId = typeof doc.user === 'object' ? doc.user.id : doc.user
  if (!userId) return doc

  try {
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      overrideAccess: true,
      req,
    })

    if (!user) return doc

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const lastActivity = user.lastActivityDate
      ? new Date(user.lastActivityDate as string)
      : null

    if (lastActivity) {
      lastActivity.setUTCHours(0, 0, 0, 0)
    }

    const lastActivityStr = lastActivity?.toISOString().split('T')[0]

    // Already counted today
    if (lastActivityStr === todayStr) return doc

    let newStreak = 1

    if (lastActivity) {
      const yesterday = new Date(today)
      yesterday.setUTCDate(yesterday.getUTCDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (lastActivityStr === yesterdayStr) {
        // Consecutive day — increment
        newStreak = ((user.currentStreak as number) || 0) + 1
      }
      // Else: gap > 1 day — reset to 1
    }

    const longestStreak = Math.max(newStreak, (user.longestStreak as number) || 0)

    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        currentStreak: newStreak,
        longestStreak,
        lastActivityDate: today.toISOString(),
      },
      overrideAccess: true,
      req,
    })
  } catch (err: any) {
    // Don't fail the lesson progress update
    payload.logger.error({ err, message: `Failed to update streak for user ${userId}` })
  }

  return doc
}
