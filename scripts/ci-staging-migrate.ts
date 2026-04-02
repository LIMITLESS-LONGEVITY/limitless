/**
 * CI Staging Migration Script
 *
 * Runs Payload migrations against the staging database on Render.
 * Render's external PostgreSQL requires SSL — we append sslmode=require
 * to the connection string and set ssl: { rejectUnauthorized: false } on the pool.
 *
 * Unlike ci-migrate.ts (which uses push: true for schema creation),
 * this uses push: false and runs actual migrations — matching production.
 */

import { getPayload } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import configPromise from '../src/payload.config.js'

function ensureSslMode(url: string): string {
  if (url.includes('sslmode=')) return url
  return url + (url.includes('?') ? '&' : '?') + 'sslmode=require'
}

async function main() {
  console.log('Running migrations against staging DB...')

  const dbUrl = ensureSslMode(process.env.DATABASE_URL!)
  console.log('SSL mode:', dbUrl.includes('sslmode=') ? 'enabled' : 'missing')

  const config = await configPromise

  config.db = postgresAdapter({
    pool: {
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    },
    push: false,
    prodMigrations: (await import('../src/migrations/index.js')).migrations,
  })

  await getPayload({ config })
  console.log('Staging migrations complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Staging migration failed:', err)
  process.exit(1)
})
