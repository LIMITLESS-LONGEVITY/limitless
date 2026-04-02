# LIMITLESS HUB

Clinical & hospitality booking platform — memberships, diagnostics, hotel stays, telemedicine.

## Stack
- **Framework:** Next.js 15 (App Router)
- **ORM:** Prisma (PostgreSQL)
- **Styling:** Tailwind CSS + LIMITLESS brand tokens
- **Auth:** Cookie SSO (reads PATHS JWT, never issues tokens)
- **Payments:** Stripe SDK
- **Email:** Resend
- **Package manager:** pnpm

## Build Commands
```bash
pnpm dev              # Start dev server
pnpm build            # Production build (runs prisma generate first)
pnpm lint             # ESLint
pnpm db:push          # Push schema to DB (dev only)
pnpm db:migrate:dev   # Create migration (dev)
pnpm db:migrate       # Run migrations (production)
pnpm db:studio        # Open Prisma Studio
pnpm db:generate      # Regenerate Prisma client
```

## Auth Design
HUB reads the `payload-token` cookie set by PATHS. It NEVER issues its own tokens.
- `getSession()` — returns JWT payload or null
- `requireAuth()` — redirects to PATHS login if not authenticated
- JWT contains: sub (user ID), email, role, tier, tenantId

## Prisma Workflow
1. Edit `prisma/schema.prisma`
2. Run `pnpm db:migrate:dev` to create migration
3. Run `pnpm db:generate` to update client types
4. Never use `db push` in production

## Brand Tokens
Same design system as PATHS. Use `bg-brand-dark`, `text-brand-gold`, `text-brand-silver`, etc.

## Hard Constraints
- NEVER use Payload CMS — this is a Prisma project
- NEVER issue auth tokens — only validate PATHS JWTs
- NEVER use `db push` in production — use migrations
- Package manager: pnpm (not npm, yarn, or bun)
