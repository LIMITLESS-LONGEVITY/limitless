# URGENT Fix: Render Health Check Fails with basePath

## Problem

PATHS deploy with `basePath: '/learn'` fails on Render — `update_failed`. The app builds fine locally (`NEXT_PUBLIC_BASE_PATH=/learn pnpm build` passes).

**Root cause:** Render's health check hits `/` to verify the service is alive. With `basePath: '/learn'`, Next.js no longer serves anything at `/` — it returns 404. Render interprets this as a crash and rolls back.

HUB will have the same issue with `basePath: '/book'`.

## Fix Options (pick one)

### Option A: Update Render health check path (preferred)

Update via Terraform or Render API. Each service's health check should point to its basePath:

**PATHS:** health check path → `/learn/api/health`
**HUB:** health check path → `/book/api/health`

In `limitless-infra/paths.tf`, find the `render_web_service` resource and add/update:
```hcl
health_check_path = "/learn/api/health"
```

Same in `limitless-infra/hub.tf`:
```hcl
health_check_path = "/book/api/health"
```

Then `terraform apply`.

### Option B: Add root redirect in each app

Add a Next.js redirect in `next.config.ts`:

**PATHS:**
```typescript
async redirects() {
  return process.env.NEXT_PUBLIC_BASE_PATH ? [
    { source: '/', destination: process.env.NEXT_PUBLIC_BASE_PATH, permanent: false },
  ] : []
},
```

This ensures `/` always returns a response (302 redirect), satisfying the health check.

**Note:** Next.js `redirects` in config run BEFORE basePath is applied, so `source: '/'` matches the actual root.

### Option C: Both

Do Option A for proper health checks + Option B for user experience (anyone hitting the raw Render URL gets redirected).

## Recommended: Option C

1. Update Terraform health check paths (proper monitoring)
2. Add root redirects (good UX fallback)
3. `terraform apply` + redeploy both services

## Verification

After fix:
- `paths-api.limitless-longevity.health/learn` → 200
- `paths-api.limitless-longevity.health/` → 302 redirect to `/learn`
- `paths-api.limitless-longevity.health/learn/api/health` → 200
- Render deploy status → `live`
- Same pattern for HUB with `/book`

## Also needed

After PATHS and HUB deploys succeed, verify the full gateway:
```bash
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/       # 200
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/learn   # 200
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/book    # 200
```

Then merge the remaining PRs:
- HUB #5 (membership billing)
- HUB #6 (patient portal)
- PATHS #38 (tier-sync)
- PATHS #39 (cross-service links)
