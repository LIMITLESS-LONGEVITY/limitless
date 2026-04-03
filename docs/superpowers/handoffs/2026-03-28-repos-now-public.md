# Notification: Repos Are Now Public

**Date:** 2026-03-28
**From:** Main instance
**To:** Workbench instance

## What changed

`limitless-paths` and `limitless-hub` are now **public** repositories on GitHub.

- `LIMITLESS-LONGEVITY/limitless-paths` — PUBLIC
- `LIMITLESS-LONGEVITY/limitless-hub` — PUBLIC
- `LIMITLESS-LONGEVITY/limitless-infra` — remains PRIVATE

## Why

GitHub Actions gives unlimited CI minutes for public repos. We were approaching the 3,000 monthly minute limit.

## What this means for you

1. **CI minutes are unlimited** — no need to optimize for runner time
2. **Workflow logs are publicly visible** — NEVER echo, log, or encode secrets in CI steps. GitHub auto-masks `${{ secrets.* }}` but avoid workarounds like base64 encoding
3. **GitHub Actions secrets are still secure** — verified they're not echoed in any workflow
4. **Branch protection rules are unchanged** — PRs + review + CI still required

## CLAUDE.md updated

- `CLAUDE.md` line 200: repo marked as `(public)` instead of `(private)`
- `CLAUDE.md` Hard Constraints: added rule about not echoing secrets in CI
