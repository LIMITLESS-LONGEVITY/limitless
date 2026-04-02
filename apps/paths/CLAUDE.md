# PATHS Platform

Educational SaaS — Payload CMS 3.x + Next.js 15 + TypeScript + PostgreSQL. AI-integrated LMS for B2B (hospital/hotel staff training) and B2C (individual wellness education).

**Status:** LIVE — all phases complete, deployed on Render.

**Stack:** Payload CMS 3.x + Next.js 15 + TypeScript + PostgreSQL + pgvector + Lexical editor + OpenAI SDK + Stripe + Jina AI

**Collections:** 22 collections (18 custom + 4 template/plugin), 4 globals, 14 custom endpoints, 8 Lexical blocks, 215 integration tests

**Platform Guide:** 50 MDX pages at `/guide` across 7 roles, 14 custom components. Content in `content/guide/`, components in `src/components/guide/`.

**Architecture:** Monolithic on Render (API + frontend in single Next.js app). Payload Local API requires direct DB access.

**RAG:** Two-stage retrieval (Jina embeddings → pgvector search → Jina reranker), access-controlled at database level.

**URLs:**
- Backend + Frontend: `https://paths-api.limitless-longevity.health`
- Frontend alias: `https://paths.limitless-longevity.health`

**Reference docs:**
- Migration spec: `docs/superpowers/specs/2026-03-23-paths-payload-migration-design.md` (read before architecture decisions)
- AGENTS.md: Before Payload collection/hook work
- Phase specs/plans: `docs/superpowers/specs/` and `docs/superpowers/plans/`

---

## Hard Constraints

- NEVER use `push: true` in production Payload config — use Drizzle migrations
- NEVER push to Render without local `pnpm build` success
- NEVER import `@payloadcms/ui` SCSS from custom components — it only works in Payload's monorepo
- NEVER use `workspace:*` dependencies in `package.json` — use actual version numbers
- ALWAYS run `pnpm generate:importmap` after creating or modifying admin components
- ALWAYS return empty arrays from `generateStaticParams` if production DB may have no schema yet
- ALWAYS pass `req` to nested operations in Payload hooks (transaction safety)
- ALWAYS set `overrideAccess: false` when passing `user` to Payload Local API
- Package manager: `pnpm`. Do NOT use npm, yarn, or bun.

---

## Verification Gate

Before claiming work is complete:
1. `pnpm build` succeeds locally before ANY remote deploy
2. If Dockerfile changed: `docker build -t paths-test .` succeeds locally
3. If DB schema changed: migration created (`pnpm payload migrate:create`), never `push: true` in production
4. If admin components added/modified: `pnpm generate:importmap` run

---

## Build & Dev Commands

```bash
pnpm dev                      # Start dev server (Next.js + Payload)
pnpm build                    # Production build — MUST pass before deploy
pnpm start                    # Start production server locally
pnpm lint                     # ESLint
pnpm lint:fix                 # ESLint with auto-fix
tsc --noEmit                  # TypeScript type check (run separately — build skips TS)
pnpm payload migrate:create   # Generate new migration after schema changes
pnpm generate:types           # Regenerate Payload types after schema changes
pnpm generate:importmap       # Regenerate import map after component changes
pnpm test                     # Run integration tests (vitest)
pnpm guide:search-index       # Rebuild guide search index (auto-runs via prebuild)
docker build -t paths-test .  # Test Docker build locally
```

**Pre-deploy verification:**
```bash
pnpm build && pnpm lint
```

---

## Key Design Decisions

- **No video hosting** — YouTube/Vimeo embeds only
- **AI is core, not a feature** — RAG-powered tutor, semantic search, recommendations, quiz generation
- **RAG via pgvector** — embeddings in PostgreSQL, Jina AI for embeddings + reranking
- **Monolithic deploy** — Render serves both API and frontend
- **Editorial workflow** — Draft → In Review → Approved → Published → Archived
- **Access control** — "highest wins" union of user tier + org access level
- **Multi-tenancy** — `@payloadcms/plugin-multi-tenant` for B2B org isolation
- **Custom Stripe** — direct SDK, not `@payloadcms/plugin-stripe`. Webhook-driven tier sync
- **SSO** — deferred. JWT + email/password for launch

**Superseded decisions:**
- Billing: `@payloadcms/plugin-stripe` → custom Stripe SDK (Phase 5)
- Deploy: Vercel + Render split → monolithic Render (Phase 8)

---

## Gotchas (hard-won)

1. **Render: `corepack enable pnpm` fails** (EROFS) — use `npm install -g pnpm` in build command
2. **Payload template SCSS components** fail outside monorepo — delete and regenerate import map
3. **Template `workspace:*` dependencies** must be replaced with actual version numbers
4. **`generateStaticParams` queries DB at build time** — return empty arrays if DB may be empty
5. **Drizzle `push: true` races with incoming requests** — use migrations for production, `push` for dev only
6. **Template TypeScript drift** — `ignoreBuildErrors: true` in `next.config.ts`, run TS checks separately
7. **`sameSite` cookie value** must be capitalized: `'Lax'` not `'lax'`
8. **Drizzle push prompts interactively** for enum changes — drop and recreate DB for fresh start
9. **Multi-tenant plugin `userHasAccessToAllTenants`** — must use `req?.user?.role` (safe access), NOT destructured `{ user }` from `req`
10. **Terraform resets Render custom domains** — re-add via `restore-custom-domains.sh` after any `terraform apply`
11. **Content creation requires `tenant` field** — create a default tenant first
12. **RAG indexing only triggers on content change** — title-only changes don't trigger re-indexing
13. **First user needs seed** — `first-register` creates user without tenant/tier. Run `POST /next/seed` immediately after.
14. **Stripe webhook secret** — must match what's deployed via Terraform
15. **Payload `slugField()` requires migration** — adds `generate_slug` column
16. **Lexical block converters must be registered** in `src/components/RichText/index.tsx`
17. **Stripe tiers need price IDs** — without `stripeMonthlyPriceId`/`stripeYearlyPriceId`, checkout returns 400
18. **Production accounts use @test.com emails** — see memory file `reference_production_accounts.md`
19. **Homepage sections are server components** — only `HeroSection` and `ScrollReveal` need `'use client'`
20. **`-webkit-backdrop-filter` via inline style** — use `style={{ WebkitBackdropFilter: 'blur(12px)' }}`
21. **Brand tokens over hardcoded CSS vars** — use `bg-brand-dark`, `text-brand-gold` etc.
22. **WSL environment** — Node.js 20 (fnm), pnpm (corepack), git with Windows GCM, all on Linux FS
23. **Self-registration requires custom endpoint** — `POST /api/auth/register` with `overrideAccess: true`
24. **Frontend pages need server+client split** for `force-dynamic` — server page.tsx renders client form
25. **Enabling `auth.verify` blocks existing users** — must migrate `_verified = true` for existing users
26. **Payload Drizzle column naming** — `_verificationToken` maps to `_verificationtoken` (all lowercase)
27. **Guide search index is auto-generated** — `prebuild` runs `scripts/build-guide-search-index.ts`
28. **Guide sidebar must be inside container** — wrap in `container mx-auto` to align with header
