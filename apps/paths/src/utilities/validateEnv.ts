/**
 * Environment Variable Validation
 *
 * Called at app startup to ensure all required env vars are set.
 * Fails fast with a descriptive error rather than silent runtime failures.
 */

const REQUIRED = [
  'DATABASE_URL',
  'PAYLOAD_SECRET',
  'NEXT_PUBLIC_SERVER_URL',
] as const

const REQUIRED_FOR_FEATURES = {
  email: ['RESEND_API_KEY'],
  ai: ['AI_PROVIDER_DEFAULT_BASE_URL', 'AI_PROVIDER_DEFAULT_API_KEY'],
  rag: ['AI_PROVIDER_JINA_BASE_URL', 'AI_PROVIDER_JINA_API_KEY'],
  storage: ['R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT'],
} as const

/**
 * Validates that all required environment variables are set.
 * Logs warnings for optional feature vars that are missing.
 * Skips validation entirely in CI (test env uses fake values).
 */
export function validateEnv(): void {
  if (process.env.CI === 'true') return

  const missing: string[] = []
  const warnings: string[] = []

  // Check required vars
  for (const key of REQUIRED) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  // Check feature-specific vars (warn, don't fail)
  for (const [feature, keys] of Object.entries(REQUIRED_FOR_FEATURES)) {
    const featureMissing = keys.filter((k) => !process.env[k])
    if (featureMissing.length > 0 && featureMissing.length < keys.length) {
      // Partially configured — likely a mistake
      warnings.push(`${feature}: partially configured (missing ${featureMissing.join(', ')})`)
    } else if (featureMissing.length === keys.length) {
      warnings.push(`${feature}: not configured (${featureMissing.join(', ')})`)
    }
  }

  if (warnings.length > 0) {
    console.warn(
      `\n⚠ Environment warnings:\n${warnings.map((w) => `  - ${w}`).join('\n')}\n`,
    )
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nSee .env.example for reference.`,
    )
  }
}
