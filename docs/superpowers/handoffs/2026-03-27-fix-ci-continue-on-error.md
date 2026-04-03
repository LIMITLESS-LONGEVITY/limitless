# Handoff: Remove continue-on-error from CI Pipeline

**Issue:** [#19](https://github.com/LIMITLESS-LONGEVITY/limitless-paths/issues/19)
**From:** Main Instance (Operator)
**To:** Workbench Instance (Engineer)
**Priority:** Normal — but blocking our "test quality is critical" principle

---

## Problem

`.github/workflows/ci.yml` has `continue-on-error: true` on two steps, meaning lint and type errors never fail the build:

```yaml
# Line 46
- name: Lint
  run: pnpm lint
  continue-on-error: true  # ESLint FlatCompat throws "circular structure to JSON"

# Line 50
- name: TypeScript check
  run: npx tsc --noEmit --skipLibCheck
  continue-on-error: true  # Payload db adapter has type drift
```

## Fix: Two Separate Issues

### Issue A: ESLint "circular structure to JSON"

**Root cause:** `FlatCompat` from `@eslint/eslintrc` wrapping `next/core-web-vitals` and `next/typescript` produces a circular reference when ESLint tries to serialize the config.

**Current config** (`eslint.config.mjs`):
```js
import { FlatCompat } from '@eslint/eslintrc'
const compat = new FlatCompat({ baseDirectory: __dirname })
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { rules: { ... } }
]
```

**Fix options (try in order):**

1. **Upgrade to native flat config** — Next.js 15 supports ESLint flat config natively since `eslint-config-next@15.1`. Remove `FlatCompat` entirely:
   ```js
   import nextConfig from 'eslint-config-next'
   export default [
     ...nextConfig({ rootDir: __dirname }),
     { rules: { /* keep existing rules */ } }
   ]
   ```
   Check if `eslint-config-next` version supports flat config export by reading its package.json.

2. **If native doesn't work** — pin `@eslint/eslintrc` to a version without the circular ref bug, or wrap with `JSON.parse(JSON.stringify(...))` to break the cycle before spreading.

3. **Last resort** — split the extends: use `compat.extends('next/core-web-vitals')` and `compat.extends('next/typescript')` separately, which sometimes avoids the circular reference.

**Verify:** `pnpm lint` runs without the "circular structure to JSON" error.

### Issue B: TypeScript "Payload db adapter type drift"

**Root cause:** Payload's Drizzle adapter generates types that drift from the actual schema when using custom migrations. The `tsc --noEmit` check catches type mismatches in generated files.

**Fix options:**

1. **Regenerate types** — `pnpm generate:types` to refresh `src/payload-types.ts` from current schema
2. **If specific errors persist** — Add targeted `// @ts-expect-error` annotations on the specific lines where Payload's generated types diverge (document each one with a comment explaining the drift)
3. **Exclude generated files** — If the errors are only in `src/migrations/*.ts` or `src/payload-types.ts`, add them to `tsconfig.json` `exclude` array (these are auto-generated and don't need strict checking)

**Verify:** `npx tsc --noEmit --skipLibCheck` passes with exit code 0.

## Key Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Lines 46 and 50 — remove `continue-on-error: true` |
| `eslint.config.mjs` | ESLint flat config — needs FlatCompat fix or replacement |
| `tsconfig.json` | May need `exclude` additions for generated files |
| `src/payload-types.ts` | Auto-generated — regenerate with `pnpm generate:types` |

## Steps

1. Fix ESLint config (Issue A) — verify `pnpm lint` passes
2. Fix TypeScript errors (Issue B) — verify `npx tsc --noEmit --skipLibCheck` passes
3. Remove both `continue-on-error: true` lines from CI workflow
4. Push as PR — CI should now genuinely pass or fail on lint/types
5. Verify the PR's CI run shows lint and TS as green (not skipped/ignored)

## Scope

- Only touch ESLint config, tsconfig exclude, and the CI workflow
- Do NOT change any lint rules or disable type checking broadly
- If a specific type error is unfixable without Payload upstream changes, use a targeted `@ts-expect-error` with a comment — not `continue-on-error`
