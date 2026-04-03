/**
 * CI Migration Script
 *
 * Initializes the database schema by temporarily enabling Drizzle push.
 * Used in CI before running integration and E2E tests.
 *
 * The main payload.config.ts has push: false (production safety).
 * This script overrides that for the one-time CI schema setup.
 */

import { getPayload } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import configPromise from '../src/payload.config.js'

async function main() {
  console.log('Initializing database schema (push: true)...')

  const config = await configPromise

  // Override the db adapter to enable push for schema creation
  const _originalDb = config.db
  config.db = postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL! },
    push: true,
  })

  await getPayload({ config })
  console.log('Database schema initialized successfully.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Schema initialization failed:', err)
  process.exit(1)
})
