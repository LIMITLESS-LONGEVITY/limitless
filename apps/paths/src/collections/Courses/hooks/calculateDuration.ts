import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Auto-calculate estimatedDuration from modules' lessons.
 * Only runs if estimatedDuration is not explicitly set.
 *
 * NOTE: Requires 'modules' and 'lessons' collections to exist.
 * Uncomment the hook registration in Courses/index.ts once Task 6 is complete.
 */
export const calculateDuration: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation: _operation,
}) => {
  // Skip if duration is explicitly set or no modules
  if (data.estimatedDuration != null || !data.modules?.length) return data

  try {
    let totalDuration = 0
    const moduleIds = Array.isArray(data.modules) ? data.modules : [data.modules]

    for (const moduleId of moduleIds) {
      const mod = await req.payload.findByID({
        collection: 'modules',
        id: typeof moduleId === 'string' ? moduleId : moduleId.id,
        depth: 1,
        req,
      })
      if (mod?.lessons) {
        const lessonIds = Array.isArray(mod.lessons) ? mod.lessons : []
        for (const lessonId of lessonIds) {
          const lesson =
            typeof lessonId === 'object'
              ? lessonId
              : await req.payload.findByID({ collection: 'lessons', id: lessonId as string, req })
          totalDuration += (lesson as { estimatedDuration?: number })?.estimatedDuration ?? 0
        }
      }
    }

    if (totalDuration > 0) {
      data.estimatedDuration = totalDuration
    }
  } catch {
    // If calculation fails, skip — don't block save
  }

  return data
}
