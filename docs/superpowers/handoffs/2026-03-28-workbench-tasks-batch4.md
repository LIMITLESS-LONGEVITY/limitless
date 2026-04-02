# Workbench Handoff Batch 4 — 2026-03-28

API Gateway implementation — Cloudflare Worker reverse proxy + app basePath configuration.

**Spec:** `docs/superpowers/specs/2026-03-28-api-gateway-design.md` (read this first)

---

## Task 1: HUB basePath + Cloudflare Worker (Phase A)

Lowest risk — only touches HUB config and adds new infrastructure. PATHS unchanged.

### 1A. HUB basePath

In `limitless-hub/next.config.ts`:
```typescript
basePath: process.env.NEXT_PUBLIC_BASE_PATH || ''
```

Set `NEXT_PUBLIC_BASE_PATH=/book` on Render env vars.

**Verify locally:**
- `pnpm dev` still works at `localhost:3000/book/stays` etc.
- All internal `<Link>` hrefs automatically include `/book` prefix
- Assets (`/_next/static/*`) serve under `/book/_next/static/*`
- API routes serve under `/book/api/*` (or separate — see note below)

**API routing note:** Next.js `basePath` applies to ALL routes including `/api/*`. This means HUB API becomes `/book/api/health`, `/book/api/contact`, `/book/api/billing/webhook` etc. The Worker routes `/book/*` → HUB, so this works. But Stripe webhook URL needs updating to `app.limitless-longevity.health/book/api/billing/webhook`.

### 1B. Cloudflare Worker

Create `limitless-infra/gateway-worker.js`:

```javascript
const ROUTES = [
  { prefix: '/book', backend: 'https://limitless-hub.onrender.com' },
  { prefix: '/api/twin', backend: 'https://limitless-digital-twin.onrender.com' },
  { prefix: '/learn', backend: 'https://limitless-paths.onrender.com' },
  { prefix: '/', backend: null },  // temp landing page
]

export default {
  async fetch(request) {
    const url = new URL(request.url)

    // Temp landing page until OS Dashboard
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(LANDING_HTML, {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    const route = ROUTES.find(r => r.prefix !== '/' && url.pathname.startsWith(r.prefix))
    if (!route) {
      // Fallback: redirect to /learn
      return Response.redirect(new URL('/learn', url.origin), 302)
    }

    const target = new URL(url.pathname + url.search, route.backend)
    const headers = new Headers(request.headers)
    headers.set('Host', new URL(route.backend).host)

    return fetch(target, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
    })
  }
}

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LIMITLESS Longevity OS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0e1a; color: #f5f0e8; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .container { text-align: center; max-width: 600px; padding: 2rem; }
    h1 { font-family: 'Cormorant Garamond', serif; font-size: 2.5rem; letter-spacing: 0.3em; color: #c9a84c; margin-bottom: 1rem; }
    p { color: #94a3b8; margin-bottom: 2rem; line-height: 1.6; }
    .links { display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; }
    a { display: inline-block; padding: 0.75rem 2rem; border: 1px solid #c9a84c; color: #c9a84c; text-decoration: none; border-radius: 4px; transition: all 0.3s; font-size: 0.9rem; letter-spacing: 0.1em; }
    a:hover { background: #c9a84c; color: #0a0e1a; }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
</head>
<body>
  <div class="container">
    <h1>LIMITLESS</h1>
    <p>Longevity Operating System — Education, Diagnostics, Clinical Care, and Coaching in one platform.</p>
    <div class="links">
      <a href="/learn">Learn</a>
      <a href="/book">Book</a>
    </div>
  </div>
</body>
</html>`
```

### 1C. Terraform Resources

Add to `limitless-infra/gateway.tf`:

```hcl
# Cloudflare Worker script
resource "cloudflare_workers_script" "gateway" {
  account_id = var.cloudflare_account_id
  name       = "limitless-gateway"
  content    = file("${path.module}/gateway-worker.js")
  module     = true
}

# Worker route
resource "cloudflare_workers_route" "gateway" {
  zone_id = var.cloudflare_zone_id
  pattern = "app.limitless-longevity.health/*"
  script_name = cloudflare_workers_script.gateway.name
}

# DNS for the gateway
resource "cloudflare_dns_record" "gateway" {
  zone_id = var.cloudflare_zone_id
  name    = "app"
  content = "limitless-paths.onrender.com"  # proxied through Worker
  type    = "CNAME"
  proxied = true
}
```

**Note:** Check Cloudflare Terraform provider v5 syntax — resource names and field names may differ from v4. Read existing `foundation.tf` for patterns.

### 1D. Verification

- `app.limitless-longevity.health/` → temp landing page with Learn/Book links
- `app.limitless-longevity.health/book/stays` → HUB stays page
- `app.limitless-longevity.health/book/api/health` → HUB health check 200
- Cookie SSO: login via PATHS, then access `/book/dashboard` — should read JWT
- `limitless-hub.onrender.com/book/stays` → still works directly (for CI/service-to-service)

---

## Task 2: PATHS basePath `/learn` (Phase B)

**This is the biggest change.** PATHS has the most routes, internal links, and hardcoded paths.

### 2A. Next.js Config

In `limitless-paths/next.config.ts`:
```typescript
basePath: process.env.NEXT_PUBLIC_BASE_PATH || ''
```

Set `NEXT_PUBLIC_BASE_PATH=/learn` on Render env vars.

### 2B. Impact Analysis

PATHS routes that move under `/learn`:
- `/` → `/learn` (PATHS homepage)
- `/login` → `/learn/login`
- `/register` → `/learn/register`
- `/account` → `/learn/account`
- `/courses/*` → `/learn/courses/*`
- `/articles/*` → `/learn/articles/*`
- `/guide/*` → `/learn/guide/*`
- `/discover` → `/learn/discover`
- `/search` → `/learn/search`
- `/api/*` → `/learn/api/*` (all PATHS API endpoints)

**Things that need updating:**
1. `NEXT_PUBLIC_SERVER_URL` env var — update to `https://app.limitless-longevity.health/learn` (or keep as Render URL for API calls)
2. Auth redirect URLs — HUB redirects to `/learn/login?redirect=...`
3. AI tutor escalation CTA — links to `/book/telemedicine/book`
4. Cookie domain — stays `.limitless-longevity.health` (no change)
5. Stripe webhook URL — update to `app.limitless-longevity.health/learn/api/billing/webhook`
6. Any hardcoded `paths-api.limitless-longevity.health` references in other services

### 2C. Update Worker Routes

Update `gateway-worker.js` to route `/learn/*` → PATHS.

### 2D. Verification

- `app.limitless-longevity.health/learn` → PATHS homepage
- `app.limitless-longevity.health/learn/guide` → platform guide
- `app.limitless-longevity.health/learn/login` → login page
- `app.limitless-longevity.health/learn/api/health` → PATHS health check 200
- All internal links within PATHS include `/learn` prefix
- Login → redirects back correctly within `/learn/*`
- HUB → PATHS login redirect works (`/learn/login?redirect=/book/dashboard`)

---

## Task 3: Digital Twin Routing + Domain Redirects (Phase C-D)

### 3A. Digital Twin

No app changes needed — routes are already at `/api/twin/*`. Just verify the Worker forwards correctly.

Test: `app.limitless-longevity.health/api/twin/health` → Digital Twin health check (if exists, or test a real endpoint)

### 3B. Old Domain Redirects

Add Cloudflare Page Rules or Worker logic:
- `hub.limitless-longevity.health/*` → 301 to `app.limitless-longevity.health/book/*`
- `paths.limitless-longevity.health/*` → 301 to `app.limitless-longevity.health/learn/*`
- `paths-api.limitless-longevity.health` → **keep** (service-to-service, CI)

### 3C. Free Render Custom Domains

After redirects are working:
1. Remove `paths.limitless-longevity.health` custom domain from Render PATHS service
2. Keep `paths-api.limitless-longevity.health` for direct backend access
3. No custom domains needed on HUB or DT Render services

---

## Priority Order

1. **Task 1** (HUB basePath + Worker) — lowest risk, proves the architecture
2. **Task 2** (PATHS basePath) — highest effort, most routes to update
3. **Task 3** (DT routing + redirects) — cleanup, do last

**Important:** Task 2 is a significant refactor of PATHS. Create a feature branch (`feature/gateway-basepath`), test thoroughly locally with `NEXT_PUBLIC_BASE_PATH=/learn pnpm dev`, verify all pages before pushing.
