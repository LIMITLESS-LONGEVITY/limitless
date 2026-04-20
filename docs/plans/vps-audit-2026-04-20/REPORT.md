# LIMITLESS VPS NanoClaw Drift Audit — Phase 1 of DR-002 Rollout

**Date**: 2026-04-20
**Executor**: Director (CLI session)
**DR**: DR-002 (Source of truth: monorepo vendored copy; see `docs/decisions/DR-002-nanoclaw-source-of-truth-and-deployment.md`)

## Scope

Catalogue the uncommitted modifications on `/home/limitless/nanoclaw/` (deployed LIMITLESS VPS) and classify each as:

- **(a)** Absorb into monorepo
- **(b)** Superseded (monorepo already has newer or equivalent)
- **(c)** Upstream-PR candidate (generic improvement belongs in `qwibitai/nanoclaw`)

## Baseline

- VPS deployed version: `1.2.45` (`package.json`)
- VPS git state: `main` ahead 32 commits of `qwibitai/nanoclaw` (stale upstream reference)
- Monorepo `apps/nanoclaw/` at origin/main: `1.2.46`
- Upstream HEAD per DR-002 research: `1.2.53` (7 versions ahead; separately tracked in rollout plan Phase 2)

## Files with `M` status on deployed VPS

Comparison: deployed `/home/limitless/nanoclaw/<file>` vs `apps/nanoclaw/<file>` at `LIMITLESS-LONGEVITY/limitless` origin/main

| File | Diff vs origin/main | Class | Notes |
|---|---|---|---|
| `src/config.ts` | **identical** | (b) | PR #53 `|| ''` fallback landed cleanly in monorepo |
| `src/channels/discord.ts` | **identical** | (b) | |
| `src/db.ts` | **identical** | (b) | |
| `src/ipc.ts` | **identical** | (b) | |
| `src/types.ts` | **identical** | (b) | `teamId` field consistent |
| `src/container-runner.ts` | 15+/1- | mostly (b), one (a) | `.git` passthrough mount block at line ~235 present on VPS, missing from monorepo — critical for git worktree operations inside agent containers |
| `container/Dockerfile` | 4+/2- | (a) | 1. `pnpm` added to global npm installs 2. Entrypoint switched from inline `printf` heredoc to `COPY entrypoint.sh` pattern |

## Files present on deployed VPS but missing from origin/main

| Path | Class | Notes |
|---|---|---|
| `src/channels/discord.test.ts` (777 lines) | (a) | Vitest unit tests for Discord channel adapter; needed for CI |
| `container/entrypoint.sh` (32 lines) | (a) | Production entrypoint script; more capable than origin/main's inline version (adds git worktree reverse-reference fixup) |

## Files to leave alone

- `groups/{global,main}/CLAUDE.md` — per-tenant agent brief, operational config rather than app source; belongs in `{tenant}-ops` repo not monorepo
- `keys/limitless-agent.pem` — private key from DR-001 Phase 2; correctly placed per that plan, correctly gitignored

## Cleanup on VPS (not in this PR — operator action)

- `/home/limitless/nanoclaw/.env.bak-20260411-153923` — stale backup, safe to delete
- `/home/limitless/nanoclaw/.env.bak-mythos-removal-20260411-162632` — stale backup, safe to delete

## Deferred to DR-002 Rollout Phase 2 (upstream sync)

- `ONECLI_API_KEY` in `config.ts` + `container-runner.ts` — added in `qwibitai/nanoclaw@1.2.53` (2026-04-15)
- `src/session-cleanup.ts` — upstream only, not in monorepo or VPS

These are upstream deltas, not VPS-specific mods. They belong in rollout Phase 2.

## Raw artifacts

See directory for per-file captures: `monorepo.*`, `deployed.*`, `diff.*.patch`, `origin-main.*`. Kept for audit trail; can be removed after DR-002 rollout completes.

