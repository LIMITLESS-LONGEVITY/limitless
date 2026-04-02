export const ACCESS_LEVEL_HIERARCHY = ['free', 'regular', 'premium', 'enterprise'] as const
export type AccessLevel = (typeof ACCESS_LEVEL_HIERARCHY)[number]

/**
 * "Highest wins" — returns the higher of two access levels.
 */
export function higherOf(a?: string | null, b?: string | null): AccessLevel {
  const indexA = ACCESS_LEVEL_HIERARCHY.indexOf((a as AccessLevel) ?? 'free')
  const indexB = ACCESS_LEVEL_HIERARCHY.indexOf((b as AccessLevel) ?? 'free')
  return ACCESS_LEVEL_HIERARCHY[Math.max(indexA, indexB)] ?? 'free'
}

/**
 * Returns all access levels up to and including the effective level.
 * Used in Payload Where queries: { accessLevel: { in: getEffectiveAccessLevels(user) } }
 */
export function getEffectiveAccessLevels(tierLevel?: string | null, orgLevel?: string | null): AccessLevel[] {
  const effective = higherOf(tierLevel, orgLevel)
  const index = ACCESS_LEVEL_HIERARCHY.indexOf(effective)
  return [...ACCESS_LEVEL_HIERARCHY.slice(0, index + 1)]
}
