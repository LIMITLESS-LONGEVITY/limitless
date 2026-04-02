# Handoff: HUB Repo Scaffold (Phase 3 of Agentic Dev Team)

**From:** Main Instance (Operator)
**To:** Workbench Instance (Engineer)
**Design spec:** `docs/superpowers/specs/2026-03-27-hub-design.md` — READ THIS FIRST
**Priority:** Next major implementation task

---

## Objective

Create the `limitless-hub` repo with a working Next.js + Prisma + Tailwind scaffold, agent-ready from day one. The HUB is the clinical & hospitality booking platform — memberships, diagnostics, hotel stays, telemedicine.

## Pre-Requisites

1. Create GitHub repo: `LIMITLESS-LONGEVITY/limitless-hub` (private)
2. Clone locally to `/mnt/c/Projects/LIMITLESS/limitless-hub/`
3. Configure GitHub branch protection on `main` (same rules as limitless-paths: require PR + 1 approval + "Test & Build" CI)

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| ORM | Prisma |
| Database | PostgreSQL (Render, Frankfurt) |
| Styling | Tailwind + LIMITLESS brand tokens |
| Auth | Cookie SSO (reads PATHS JWT, never issues tokens) |
| Email | Resend |
| Payments | Stripe SDK |
| Package manager | pnpm |

## Scaffold Structure

```
limitless-hub/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                      # Lint + build + staging migration
│   │   └── claude-review.yml           # Copy from docs/superpowers/templates/
│   └── PULL_REQUEST_TEMPLATE.md        # Copy from limitless-paths/.github/
├── prisma/
│   └── schema.prisma                   # From HUB design spec Section 3
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with brand tokens
│   │   ├── page.tsx                    # Landing page (placeholder)
│   │   └── api/
│   │       └── health/
│   │           └── route.ts            # GET /api/health endpoint
│   ├── lib/
│   │   ├── auth.ts                     # JWT cookie validation (from spec Section 6)
│   │   ├── prisma.ts                   # Prisma client singleton
│   │   └── stripe.ts                   # Stripe client (placeholder)
│   └── styles/
│       └── globals.css                 # Brand tokens (@theme inline from PATHS)
├── public/
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
├── Dockerfile
├── .env.example
├── .gitignore
├── CLAUDE.md                           # HUB-specific rules (see below)
└── README.md
```

## Key Files to Create

### 1. `package.json`
```json
{
  "name": "limitless-hub",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate"
  }
}
```

Dependencies: `next`, `react`, `react-dom`, `@prisma/client`, `jsonwebtoken`, `stripe`, `resend`
Dev dependencies: `prisma`, `typescript`, `@types/react`, `@types/node`, `@types/jsonwebtoken`, `tailwindcss`, `eslint`, `eslint-config-next`

### 2. `prisma/schema.prisma`
Copy the full Prisma schema from **HUB design spec Section 3**. It includes:
- User, Membership, MembershipPlan enum
- DiagnosticPackage, DiagnosticBooking
- StayPackage, StayBooking
- TelemedicineBooking, ConsultType enum
- Appointment, AppointmentType enum
- Clinician
- ContactInquiry, InquiryType/InquiryStatus enums
- HotelPartner
- BookingStatus enum

### 3. `src/lib/auth.ts`
JWT cookie validation — from **HUB design spec Section 6**:
```typescript
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export interface JWTPayload {
  sub: string      // PATHS user ID
  email: string
  role: string
  tier: string
  tenantId?: string
  iat: number
  exp: number
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) return null
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession()
  if (!session) {
    const loginUrl = `${process.env.NEXT_PUBLIC_PATHS_URL}/login?redirect=${process.env.NEXT_PUBLIC_HUB_URL}/dashboard`
    redirect(loginUrl)
  }
  return session
}
```

### 4. `src/app/api/health/route.ts`
```typescript
export async function GET() {
  return Response.json({ status: 'ok', service: 'limitless-hub' })
}
```

### 5. `globals.css` — Brand Tokens
Copy the `@theme inline` block from PATHS `globals.css`. Same design system.

### 6. `CLAUDE.md`
Use the existing agent definition at `.claude/agents/hub-engineer.md` as the base. Expand into a full CLAUDE.md with:
- Stack overview
- Build commands (`pnpm dev`, `pnpm build`, `pnpm db:migrate`)
- Prisma workflow (schema changes → `prisma migrate dev`)
- Auth design (reads PATHS JWT, never issues tokens)
- Brand tokens reference
- Branch strategy (ENFORCED — PR only, same as PATHS)

### 7. `.github/workflows/ci.yml`
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
      - run: npx prisma generate
      - run: pnpm build
        env:
          JWT_SECRET: ci-test-secret-minimum-32-characters
          NEXT_PUBLIC_HUB_URL: http://localhost:3000
          NEXT_PUBLIC_PATHS_URL: http://localhost:3001

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
      - name: Run Prisma migrations against staging DB
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
```

### 8. `.github/workflows/claude-review.yml`
Copy from `docs/superpowers/templates/claude-review-workflow.yml`. Set `ANTHROPIC_API_KEY` secret on the repo.

### 9. `.env.example`
```
DATABASE_URL=postgresql://user:password@localhost:5432/limitless_hub
JWT_SECRET=your-shared-jwt-secret-minimum-32-chars
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
DIGITAL_TWIN_API_URL=https://digital-twin-api.limitless-longevity.health
DIGITAL_TWIN_API_KEY=
PATHS_API_URL=https://paths-api.limitless-longevity.health
RESEND_API_KEY=
RESEND_FROM_ADDRESS=info@limitless-longevity.health
NEXT_PUBLIC_HUB_URL=http://localhost:3000
NEXT_PUBLIC_PATHS_URL=http://localhost:3001
```

## Terraform (Infra Engineer task — separate PR)

Add to `limitless-infra/paths.tf` (or create `hub.tf`):
- `render_web_service.hub` (Starter, Frankfurt, auto-deploy from main)
- `render_postgres.hub_db` (basic_256mb, Frankfurt)
- `render_postgres.hub_staging_db` (basic_256mb, Frankfurt — for CI)
- `cloudflare_dns_record.hub` (CNAME → hub.onrender.com)
- `cloudflare_dns_record.hub_api` (CNAME → hub.onrender.com)

Run `restore-custom-domains.sh` after apply (update script to include HUB domains).

## GitHub Setup

After repo is created:
1. Branch protection on `main` (same rules as limitless-paths)
2. Secrets: `ANTHROPIC_API_KEY`, `STAGING_DATABASE_URL`, `STAGING_PAYLOAD_SECRET` (for Prisma it's just `DATABASE_URL`)
3. Labels: copy the agent labels from limitless-paths (`agent:hub`, `priority:urgent`, `status:in-progress`, `status:awaiting-qa`)

## Agent-Ready Checklist

- [ ] `CLAUDE.md` in repo root
- [ ] `.github/workflows/ci.yml` with staging migration gate
- [ ] `.github/workflows/claude-review.yml` for PR auto-review
- [ ] `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] GitHub branch protection on `main`
- [ ] GitHub secrets configured
- [ ] Labels created
- [ ] `/api/health` endpoint returns 200
- [ ] `pnpm build` passes locally
- [ ] Prisma schema compiles (`npx prisma generate`)

## Verification

After scaffold is complete:
1. `pnpm build` passes
2. `pnpm dev` starts without errors
3. `GET /api/health` returns `{"status":"ok","service":"limitless-hub"}`
4. Prisma Studio opens (`pnpm db:studio`)
5. CI passes on first PR
6. Claude review triggers on PR open

## What NOT to Build Yet

- No actual pages beyond the landing placeholder
- No Stripe integration (just the client file)
- No Digital Twin API client (just a placeholder in `src/lib/`)
- No booking flows, dashboards, or forms
- This is the **scaffold** — Phase 3 of the agentic plan. Feature implementation comes later.
