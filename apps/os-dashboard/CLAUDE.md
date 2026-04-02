# LIMITLESS OS Dashboard

Static Next.js 15 app for Cloudflare Pages. The unified longevity operating system dashboard.

## Architecture

- **No backend, no database** — pure frontend, static export (`output: 'export'`)
- **Auth detection** via PATHS `/learn/api/me` call (checks `.limitless-longevity.health` cookie)
- **All API calls** go to sibling services via gateway routing:
  - `/learn/*` — PATHS platform (education, enrollments, protocol)
  - `/book/*` — Booking service (appointments)
  - `/api/twin/*` — Digital Twin API (health data)
- **Deploy:** `pnpm build` produces `out/` directory, deployed to Cloudflare Pages
- **Package manager:** pnpm (do NOT use npm, yarn, or bun)

## Commands

```bash
pnpm dev        # Start dev server
pnpm build      # Production build (static export to out/)
pnpm lint       # ESLint
```

## Design System

Uses the shared LIMITLESS "Scientific Luxury" design tokens defined in `src/app/globals.css`.
Brand tokens: `brand-dark`, `brand-gold`, `brand-teal`, `brand-silver`, `brand-light`, `brand-glass-*`.
Fonts: Cormorant Garamond (display), Inter (body) via Google Fonts CDN.

## Hard Constraints

- NEVER add a backend or database — this is a static site
- NEVER commit `.env*` files
- ALWAYS include `-webkit-backdrop-filter` alongside `backdrop-filter` (Safari)
- ALWAYS use brand tokens from globals.css, not hardcoded color values
