import type { CollectionBeforeChangeHook } from 'payload'

/**
 * On article creation, inherit the access level from the content pillar's
 * defaultAccessLevel if the article's accessLevel is not explicitly set.
 */
export const inheritPillarAccessLevel: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data
  if (data.accessLevel && data.accessLevel !== 'free') return data // Already set explicitly
  if (!data.pillar) return data

  try {
    const pillar = await req.payload.findByID({
      collection: 'content-pillars',
      id: data.pillar as string,
      req,
    })
    if (pillar?.defaultAccessLevel) {
      data.accessLevel = pillar.defaultAccessLevel
    }
  } catch {
    // If pillar not found, keep default
  }

  return data
}
