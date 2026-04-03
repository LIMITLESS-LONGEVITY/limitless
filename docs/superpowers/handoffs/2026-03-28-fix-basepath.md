# URGENT Fix: basePath Not Active on PATHS or HUB

## Problem

PRs #37 (PATHS) and #4 (HUB) were merged but `basePath` is NOT in either `next.config.ts`. Both apps still serve at `/` instead of `/learn` and `/book`.

Gateway landing page at `app.limitless-longevity.health/` works (200), but `/learn` and `/book` return 404/502.

## Current State

**PATHS `next.config.ts`:** No `basePath` property at all.
**HUB `next.config.ts`:** No `basePath` property at all.

Render env vars are already set:
- PATHS: `NEXT_PUBLIC_BASE_PATH=/learn`
- HUB: `NEXT_PUBLIC_BASE_PATH=/book`

## Fix

### PATHS (`limitless-paths/next.config.ts`)

Add `basePath` to the `nextConfig` object:

```typescript
const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  output: 'standalone',
  // ... rest of config
}
```

### HUB (`limitless-hub/next.config.ts`)

Add `basePath` to the `nextConfig` object:

```typescript
const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  reactStrictMode: true,
}
```

### Important Notes

1. `NEXT_PUBLIC_BASE_PATH` is a **build-time** variable — Next.js inlines it during `next build`. It's already set on Render, so the next deploy after merging will pick it up.
2. The `|| ''` default means local dev (`pnpm dev`) still works at root `/` without setting the env var.
3. **Test locally before pushing:** `NEXT_PUBLIC_BASE_PATH=/learn pnpm dev` for PATHS, `NEXT_PUBLIC_BASE_PATH=/book pnpm dev` for HUB. Verify pages load at `/learn` and `/book`.
4. `pnpm build` must pass with the basePath set.

### Verification After Deploy

```bash
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/       # 200 (landing)
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/learn   # 200 (PATHS)
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/book    # 200 (HUB)
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/learn/api/health  # 200
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/book/api/health   # 200
```
