# API Gateway — Cloudflare Worker Reverse Proxy Design

**Date:** 2026-03-28
**Status:** Approved — implementation not started
**Author:** Main Instance (Operator)
**Depends on:** OS design spec, HUB spec, Digital Twin spec

---

## 1. Problem

Users face 5+ subdomains (`paths-api`, `paths`, `hub`, `digital-twin-api`, `os`). This is confusing, not user-friendly, and wastes Render's 2 custom domain limit on Hobby tier. The Longevity OS needs a single gateway.

## 2. Solution

One Cloudflare Worker at `app.limitless-longevity.health` acts as a reverse proxy, routing by path prefix to the correct Render backend. Apps serve under their prefix natively using Next.js `basePath` (Option B — no path rewriting).

## 3. Routing Table

| Path Prefix | Backend (Render) | App | Notes |
|-------------|-----------------|-----|-------|
| `/` | OS Dashboard (or temp landing) | OS Gateway | Redirects to `/learn` until OS Dashboard is built |
| `/learn/*` | PATHS (`limitless-paths.onrender.com`) | All PATHS: homepage, courses, articles, guide, AI tutor |
| `/book/*` | HUB (`limitless-hub.onrender.com`) | All HUB: memberships, diagnostics, stays, telemedicine |
| `/api/learn/*` | PATHS (`limitless-paths.onrender.com`) | PATHS API (auth, content, AI, billing) |
| `/api/book/*` | HUB (`limitless-hub.onrender.com`) | HUB API (bookings, membership, Stripe webhook) |
| `/api/twin/*` | Digital Twin (`limitless-digital-twin.onrender.com`) | Health data API |

**Key principle:** PATHS is NOT the root. The OS Dashboard owns `/`. Each app owns its prefix entirely — frontend + API. No special cases.

**Before OS Dashboard exists:** Worker serves a minimal landing page at `/` with links to `/learn` and `/book`, or redirects `/` → `/learn`.

## 4. App Configuration Changes

### PATHS (`limitless-paths/next.config.ts`)
```typescript
basePath: '/learn'
```
- **Everything** in PATHS serves under `/learn` — homepage, courses, articles, guide, AI tutor, login, account
- PATHS homepage becomes `/learn` (not `/`)
- Guide becomes `/learn/guide`
- Login becomes `/learn/login` (redirects from OS dashboard)
- API becomes `/api/learn/*` (Worker routes this prefix to PATHS, which strips `/api/learn` or PATHS uses `basePath` for API routes too)
- Keep `basePath` env-configurable for local dev: `basePath: process.env.NEXT_PUBLIC_BASE_PATH || ''`

### HUB (`limitless-hub/next.config.ts`)
```typescript
basePath: '/book'
```
- All HUB routes automatically serve under `/book/*`
- Internal links (`<Link href="/stays">`) automatically become `/book/stays`
- Assets (`/_next/static/*`) automatically become `/book/_next/static/*`
- API routes become `/api/book/*`

### Digital Twin
No change needed — Fastify routes are already at `/api/twin/*`.

## 5. Cloudflare Worker

```javascript
// worker.js — deployed to app.limitless-longevity.health
const ROUTES = [
  { prefix: '/book', backend: 'https://limitless-hub.onrender.com' },
  { prefix: '/api/twin', backend: 'https://limitless-digital-twin.onrender.com' },
  { prefix: '/guide', backend: 'https://limitless-paths.onrender.com' },
  { prefix: '/api', backend: 'https://limitless-paths.onrender.com' },
  { prefix: '/learn', backend: 'https://limitless-paths.onrender.com' },
  { prefix: '/', backend: 'https://limitless-paths.onrender.com' },  // fallback
]

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const route = ROUTES.find(r => url.pathname.startsWith(r.prefix))
    const target = new URL(url.pathname + url.search, route.backend)

    return fetch(target, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    })
  }
}
```

**Note:** This is simplified. Production version needs:
- Cookie forwarding (for SSO)
- Host header management
- WebSocket passthrough (for Digital Twin ingest)
- CORS headers if needed
- Cache control

## 6. DNS Changes

| Record | Current | New |
|--------|---------|-----|
| `app.limitless-longevity.health` | Does not exist | CNAME → Cloudflare Worker route |
| `paths-api.limitless-longevity.health` | CNAME → Render | Keep (for service-to-service, CI) |
| `paths.limitless-longevity.health` | CNAME → Render (custom domain) | Remove Render custom domain, keep DNS for redirects |
| `hub.limitless-longevity.health` | CNAME → Render (no custom domain) | Remove DNS or redirect to `app.limitless-longevity.health/book` |
| `digital-twin-api.limitless-longevity.health` | CNAME → Render (no custom domain) | Keep for service-to-service calls |

**Custom domain budget:** Only need `app.limitless-longevity.health` on Cloudflare (not Render). Render custom domains on PATHS can be freed. Solves the Hobby tier 2-domain limit entirely.

## 7. Cookie SSO Impact

Current cookie is set on `.limitless-longevity.health` (domain-scoped). The Worker serves from `app.limitless-longevity.health` which is a subdomain of `limitless-longevity.health` — **cookies work automatically**. No SSO changes needed.

## 8. Migration Strategy

### Phase A: Deploy Worker + HUB basePath (low risk)
1. Add `basePath: '/book'` to HUB's `next.config.ts`
2. Deploy Cloudflare Worker at `app.limitless-longevity.health`
3. Worker routes `/book/*` → HUB, `/` → temp landing page with links
4. Verify: `app.limitless-longevity.health/book/stays` renders HUB stays page
5. Render direct URLs still work for CI and service-to-service

### Phase B: Add PATHS basePath `/learn`
1. Add `basePath: '/learn'` to PATHS `next.config.ts`
2. Update all internal links, redirects, `NEXT_PUBLIC_SERVER_URL` references
3. Update auth redirects (login → `/learn/login`, register → `/learn/register`)
4. Worker routes `/learn/*` → PATHS, `/api/learn/*` → PATHS
5. Verify: `app.limitless-longevity.health/learn` renders PATHS homepage
6. This is the biggest change — PATHS has the most routes and internal links

### Phase C: Add Digital Twin routing
1. Worker routes `/api/twin/*` → Digital Twin
2. No app changes needed (routes are already `/api/twin/*`)

### Phase D: Redirect old domains + temp landing
1. `hub.limitless-longevity.health` → 301 to `app.limitless-longevity.health/book`
2. `paths.limitless-longevity.health` → 301 to `app.limitless-longevity.health/learn`
3. `paths-api.limitless-longevity.health` → keep for service-to-service (direct Render)
4. Free all Render custom domain slots
5. Worker serves temp landing at `/` until OS Dashboard replaces it (Phase 3 of OS roadmap)

## 9. Terraform Changes

Add to `limitless-infra/`:
- Cloudflare Worker script resource
- Cloudflare Worker route (`app.limitless-longevity.health/*`)
- DNS record for `app` subdomain

## 10. Verification

- `app.limitless-longevity.health/` → PATHS homepage
- `app.limitless-longevity.health/book/stays` → HUB stays page
- `app.limitless-longevity.health/book/api/health` → HUB health check
- `app.limitless-longevity.health/api/health` → PATHS health check
- `app.limitless-longevity.health/api/twin/health` → Digital Twin health check (if routed)
- Cookie SSO works across all paths (login on PATHS, access HUB pages)
- Assets load correctly (CSS, JS, images all under correct basePath)
- Internal links navigate correctly within each app

## 11. Open Questions

1. ~~**PATHS partial basePath:**~~ RESOLVED — all of PATHS goes under `/learn`. No partial routing. Clean separation.
2. **WebSocket passthrough:** Digital Twin spec includes `WS /api/twin/:userId/ingest`. Cloudflare Workers support WebSocket proxying — verify in implementation.
3. **Render direct URLs:** With `basePath: '/book'`, the Render direct URL only works at `/book/*`. Use env-based toggle (`NEXT_PUBLIC_BASE_PATH`) so local dev and Render direct URL work at `/` while the gateway serves at `/book`.
4. **PATHS API prefix:** PATHS API is currently at `/api/*`. Under the gateway it needs to be at `/api/learn/*`. Options: (a) PATHS `basePath` handles this automatically for Next.js API routes, or (b) Worker strips `/api/learn` → `/api` before forwarding. Need to test which approach Next.js supports with `basePath`.
