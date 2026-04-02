# Handoff: Fix Staging Migration SSL Connection

**Date:** 2026-03-27
**From:** Main Instance (Operator)
**To:** Workbench Instance (Engineer)
**Priority:** HIGH — CI is red on main
**Repo:** `limitless-paths`

---

## Problem

The "Test Migrations (Staging DB)" CI job fails on every push to `main` with:

```
Error: cannot connect to Postgres. Details: Connection terminated unexpectedly
```

This is a TCP-level connection drop. Render's external PostgreSQL requires SSL, and the current `ci-staging-migrate.ts` script's SSL config is not being applied properly by the `@payloadcms/db-postgres` adapter.

**CI run:** https://github.com/LIMITLESS-LONGEVITY/limitless-paths/actions/runs/23659546308
**Failing job:** `Test Migrations (Staging DB)` — step "Run migrations against staging DB"

### What's been tried (all failed — last 4 commits on main)

1. `NODE_TLS_REJECT_UNAUTHORIZED=0` env var alone
2. Fixed duplicate `NEXT_PUBLIC_SERVER_URL` in CI env
3. `ssl: { rejectUnauthorized: false }` in `postgresAdapter` pool config
4. Fixed Terraform output to use external DB hostname

### Other CI jobs

| Job | Status | Notes |
|-----|--------|-------|
| Test & Build | PASS | Working fine |
| Integration Tests (DB) | PASS | Uses local PostgreSQL service container |
| E2E Tests | FAIL | Pre-existing failures, not related |

---

## Root Cause Analysis

The `postgresAdapter` from `@payloadcms/db-postgres` may not forward the `ssl` option from the `pool` config to the underlying `pg.Pool` correctly. Additionally, Render's external connection string may not include `?sslmode=require`, which the `pg` driver needs to initiate an SSL handshake.

The "Connection terminated unexpectedly" error means the PostgreSQL server closed the TCP connection — this happens when the server requires SSL but the client didn't send an SSL negotiation request.

---

## Fix (two files)

### 1. `scripts/ci-staging-migrate.ts`

**Current (broken):**
```ts
config.db = postgresAdapter({
  pool: {
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  },
  push: false,
  prodMigrations: (await import('../src/migrations/index.js')).migrations,
})
```

**Fix:** Ensure `sslmode=require` is appended to the connection string (so `pg` negotiates SSL at the protocol level), and use `ssl: true` instead of the object form:

```ts
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
      ssl: true,
    },
    push: false,
    prodMigrations: (await import('../src/migrations/index.js')).migrations,
  })

  await getPayload({ config })
  console.log('Staging migrations complete.')
  process.exit(0)
}
```

### 2. `.github/workflows/ci.yml`

**Add `NODE_TLS_REJECT_UNAUTHORIZED: '0'`** to the staging migration step env (belt and suspenders — Render uses self-signed certs):

```yaml
      - name: Run migrations against staging DB
        run: npx tsx scripts/ci-staging-migrate.ts
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
          PAYLOAD_SECRET: ${{ secrets.STAGING_PAYLOAD_SECRET }}
          NEXT_PUBLIC_SERVER_URL: https://paths-api.limitless-longevity.health
          NODE_TLS_REJECT_UNAUTHORIZED: '0'
```

---

## Verification

1. Create branch `fix/staging-migration-ssl`
2. Apply both changes
3. Push and open PR
4. CI must show "Test Migrations (Staging DB)" as PASS
5. The console output should show `SSL mode: enabled` and `Staging migrations complete.`

---

## Pre-requisite Check

If the fix still fails, the `STAGING_DATABASE_URL` GitHub secret may be wrong. It was last set at `2026-03-27T17:09:56Z`. Verify by:
1. Running `terraform output -raw paths_staging_db_external_url` in `limitless-infra/`
2. Comparing to the secret value (you can't read secrets, but you can update them)
3. The URL should look like: `postgresql://user:pass@host.frankfurt-postgres.render.com:5432/dbname`

If the Render staging DB is suspended or unreachable, check the Render dashboard.
