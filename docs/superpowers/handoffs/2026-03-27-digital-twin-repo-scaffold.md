# Handoff: Digital Twin Repo Scaffold (Phase 4 of Agentic Dev Team)

**Date:** 2026-03-27
**From:** Main Instance (Operator/Architect)
**To:** Workbench Instance (Engineer)
**Priority:** After HUB scaffold + Terraform are complete
**Design spec:** `docs/superpowers/specs/2026-03-27-digital-twin-design.md` — READ THIS FIRST

---

## Objective

Create the `limitless-digital-twin` repo with a working Fastify + Drizzle + PostgreSQL scaffold, agent-ready from day one. The Digital Twin is a pure API microservice — no frontend. It stores health profiles, biomarkers, wearable data, and provides AI context to other apps.

## Pre-Requisites

1. Create GitHub repo: `LIMITLESS-LONGEVITY/limitless-digital-twin` (private) — **Main will do this**
2. Clone locally
3. Configure branch protection on `main` (same rules as limitless-paths/limitless-hub)

---

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20 |
| Framework | Fastify |
| ORM | Drizzle |
| Database | PostgreSQL (TimescaleDB extension later) |
| Auth | JWT cookie validation (reads PATHS cookie) |
| Service Auth | X-Service-Key header (API keys per consumer) |
| Package manager | pnpm |

**Why Fastify, not Next.js?** No frontend. Pure API. Fastify is ~3x faster for JSON, native WebSocket support, smaller Docker image.

---

## Scaffold Structure

```
limitless-digital-twin/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── claude-review.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── drizzle/
│   └── migrations/               # Empty initially
├── src/
│   ├── index.ts                  # Fastify server entry
│   ├── plugins/
│   │   ├── auth.ts               # JWT cookie validation (from spec Section 5)
│   │   ├── service-auth.ts       # X-Service-Key validation
│   │   └── cors.ts               # CORS for .limitless-longevity.health
│   ├── routes/
│   │   ├── health.ts             # GET /api/health
│   │   └── profile.ts            # GET/PATCH /api/twin/:userId/profile (placeholder)
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema — full schema from spec Section 3
│   │   └── client.ts             # Drizzle client singleton
│   ├── lib/
│   │   └── errors.ts             # Error types + handlers
│   └── types/
│       └── index.ts              # JWTPayload, shared types
├── tests/
│   └── health.test.ts            # Basic health endpoint test
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── Dockerfile
├── .env.example
├── .gitignore
├── CLAUDE.md
└── README.md
```

---

## Key Files to Create

### 1. `package.json`

```json
{
  "name": "limitless-digital-twin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/",
    "test": "vitest run",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

**Dependencies:** `fastify`, `@fastify/cookie`, `@fastify/cors`, `@fastify/websocket`, `drizzle-orm`, `postgres` (pg driver for drizzle), `jsonwebtoken`, `zod`

**Dev dependencies:** `drizzle-kit`, `typescript`, `tsx`, `vitest`, `@types/node`, `@types/jsonwebtoken`, `eslint`, `@eslint/js`

### 2. `src/index.ts` — Server Entry

```typescript
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import { healthRoutes } from './routes/health.js'

const fastify = Fastify({ logger: true })

// Plugins
await fastify.register(cookie)
await fastify.register(cors, {
  origin: [
    'https://os.limitless-longevity.health',
    'https://paths.limitless-longevity.health',
    'https://hub.limitless-longevity.health',
    'https://cubes.limitless-longevity.health',
  ],
  credentials: true,
})

// Routes
await fastify.register(healthRoutes)

// Start
const port = parseInt(process.env.PORT || '3001', 10)
await fastify.listen({ port, host: '0.0.0.0' })
```

### 3. `src/routes/health.ts`

```typescript
import { FastifyPluginAsync } from 'fastify'

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/health', async () => {
    return { status: 'ok', service: 'limitless-digital-twin' }
  })
}
```

### 4. `src/db/schema.ts`

Copy the **full Drizzle schema from spec Section 3**: healthProfiles, biomarkers, diagnosticResults, wearableDevices, wearableData, wearableSummaries, genomicData, activityLog.

**Important:** Include all indexes and the `// NOTE: After table creation, run: SELECT create_hypertable(...)` comment for the wearable_data table. Do NOT run the hypertable command in the scaffold — TimescaleDB extension setup comes later.

### 5. `src/plugins/auth.ts`

JWT cookie validation — from **spec Section 5**:

```typescript
import fp from 'fastify-plugin'
import jwt from 'jsonwebtoken'
import { FastifyRequest, FastifyReply } from 'fastify'

export interface JWTPayload {
  sub: string
  email: string
  role: string
  tier: string
  tenantId?: string
  iat: number
  exp: number
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload | null
  }
}

export default fp(async (fastify) => {
  fastify.decorateRequest('user', null)

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health endpoint
    if (request.url === '/api/health') return

    const token = request.cookies['payload-token']
    if (!token) {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }

    try {
      request.user = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
    } catch {
      reply.code(401).send({ error: 'Invalid token' })
    }
  })
})
```

### 6. `src/db/client.ts`

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString)
export const db = drizzle(client, { schema })
```

### 7. `drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

### 8. `.env.example`

```
DATABASE_URL=postgresql://user:password@localhost:5432/limitless_digital_twin
JWT_SECRET=your-shared-jwt-secret-minimum-32-chars
PATHS_SERVICE_KEY=generate-random-key-for-paths
HUB_SERVICE_KEY=generate-random-key-for-hub
CUBES_SERVICE_KEY=generate-random-key-for-cubes
ENCRYPTION_KEY=generate-32-byte-hex-key
PORT=3001
```

### 9. `CLAUDE.md`

Include:
- Stack overview (Fastify + Drizzle + PostgreSQL, pure API, no frontend)
- Build commands (`pnpm dev`, `pnpm build`, `pnpm db:migrate`)
- Drizzle workflow (schema changes → `drizzle-kit generate` → `drizzle-kit migrate`)
- Auth design: cookie SSO (reads PATHS JWT, never issues tokens) + service-to-service keys
- Privacy rules: health data never enters search/RAG, GDPR endpoints mandatory
- Branch strategy (ENFORCED — PR only, same as PATHS/HUB)
- Verification gate: `pnpm build && pnpm lint && pnpm test`

### 10. `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    name: Test & Build
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: pnpm/action-setup@v4
        with:
          version: 10
          run_install: false
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm build
      - run: pnpm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          JWT_SECRET: ci-test-secret-minimum-32-characters

  staging-migration:
    name: Test Migrations (Staging DB)
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: pnpm/action-setup@v4
        with:
          version: 10
          run_install: false
      - run: pnpm install --frozen-lockfile
      - name: Run Drizzle migrations against staging DB
        run: npx drizzle-kit migrate
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
          NODE_TLS_REJECT_UNAUTHORIZED: '0'
```

**Note:** Uses `drizzle-kit migrate` (not Payload's migration system). Also includes `NODE_TLS_REJECT_UNAUTHORIZED=0` for Render external DB SSL — learned from PATHS staging migration issue.

### 11. `.github/workflows/claude-review.yml`

Copy from `docs/superpowers/templates/claude-review-workflow.yml`.

### 12. `Dockerfile`

```dockerfile
FROM node:20-slim AS base
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY dist/ ./dist/
COPY drizzle/ ./drizzle/

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

---

## Terraform (separate handoff)

Digital Twin infrastructure will be covered in a dedicated Terraform handoff (`digital-twin.tf`), same pattern as `hub.tf`. Key differences from HUB:
- Runtime is plain Node.js (not Next.js standalone)
- May need TimescaleDB extension on PostgreSQL (investigate Render support)
- Needs service-to-service API key env vars (PATHS_SERVICE_KEY, HUB_SERVICE_KEY)
- No Stripe, no Resend

---

## Agent-Ready Checklist

- [ ] `CLAUDE.md` in repo root
- [ ] `.github/workflows/ci.yml` with test + staging migration
- [ ] `.github/workflows/claude-review.yml` for PR auto-review
- [ ] `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] GitHub branch protection on `main`
- [ ] GitHub secrets configured (ANTHROPIC_API_KEY, STAGING_DATABASE_URL)
- [ ] Labels created (agent:dt, priority:urgent, status:in-progress, status:awaiting-qa)
- [ ] `/api/health` endpoint returns 200
- [ ] `pnpm build` passes locally
- [ ] Drizzle schema compiles (`pnpm db:generate` succeeds)
- [ ] At least one test passes (`pnpm test`)

## Verification

1. `pnpm build` passes (TypeScript compiles to `dist/`)
2. `pnpm dev` starts Fastify server without errors
3. `GET http://localhost:3001/api/health` returns `{"status":"ok","service":"limitless-digital-twin"}`
4. `pnpm test` passes
5. CI passes on first PR
6. Claude review triggers on PR open

## What NOT to Build Yet

- No wearable integrations (Oura, Whoop) — just the schema
- No WebSocket ingest endpoint — just the plugin placeholder
- No service-auth middleware — just the skeleton
- No AI context endpoint — just the route file placeholder
- No GDPR export/deletion — just the route file placeholder
- This is the **scaffold** — feature implementation comes in Digital Twin Phase 1
