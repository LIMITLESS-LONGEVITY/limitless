# PR #73 Regression Audit and Strategy Review

**Author:** LIMITLESS INFRA Architect (acting as auditor)
**Date:** 2026-04-23
**Status:** DRAFT — awaiting CEO / Director review
**Priority:** P1 (VPS is stable; this is a correction of record and forward-strategy call)
**Related:** PR #73 (DR-002 Phase 2 upstream sync), PR #85 (DR-001 Phase 3 App token), MVAP Step 1, DR-002 rollout

---

## 0. TL;DR

- **PR #73's in-scope regression surface is tiny: one TypeScript syntax typo plus one incomplete mock stub, both in `container-runner.test.ts`. Both were already fixed by PR #85 Path X (commit `cf110fb`).** Nothing else in the seven-file PR #73 diff contains a regression.
- **The defects that surfaced during MVAP Step 1 and earlier CEO verification were a mixture of (a) the two true PR #73 test regressions, (b) defects introduced long before PR #73 and never noticed because `pnpm test` and `pnpm build` were never part of the merge gate, and (c) PR #85's own imports/lockfile gap.** Conflating these as "cumulative PR #73 failure" obscures the actual failure mode.
- **One real regression still sits on `origin/main` right now: `apps/nanoclaw/package.json` does not declare `discord.js`, even though `src/channels/discord.ts` imports it.** This predates PR #73 by ~three weeks (commit `f828f85`, 2026‑04‑03). It has never been caught because we have no CI job for `apps/nanoclaw`. A one-line fix PR is scoped below.
- **The "absorb upstream into monorepo" strategy (DR‑002) is architecturally sound, but it is being executed without the verification rail that makes absorption safe. The architectural response is not to rearchitect DR‑002 — it is to add a `build-nanoclaw` CI job, and to accept that the worktree source-of-truth convention (DR‑002 §3) is now effectively mandatory for all nanoclaw work.** Recommendations in §6.
- **Worktree recommendation:** keep DR‑002's "monorepo-as-source-of-truth" posture. The LIMITLESS‑LONGEVITY/nanoclaw fork should be treated as an *upstream tracking mirror* (read‑only, points to qwibitai), not as a live development target. A short housekeeping section in the nanoclaw CLAUDE.md should formalise this.

---

## 1. Methodology

I could not run `pnpm install && pnpm test` directly — this is a main‑group session with no monorepo worktree mount. The audit was instead performed by:

1. Fresh shallow clone of `LIMITLESS-LONGEVITY/limitless` into `/tmp/pr73-audit/monorepo` (HEAD `ab90915`, the current `origin/main`).
2. Fresh shallow clone of `LIMITLESS-LONGEVITY/nanoclaw` into `/tmp/pr73-audit/fork` (HEAD `6f93b20`, version 1.2.46).
3. `git show b4be354` to isolate PR #73's exact diff (the authoritative answer to "what did PR #73 change").
4. `git show c70d2e6:apps/nanoclaw/package.json` to recover the pre-PR #73 state of package.json.
5. `diff -rq` tree comparison between the two repositories, then targeted `diff` / `git log` for every differing file.
6. `gh api /repos/qwibitai/nanoclaw/...` to sanity-check that upstream has since diverged (now at v2.0.9), confirming the 1.2.53 reference in PR #73's commit message is a LIMITLESS-internal version label, not an upstream tag.

The four sources of truth used throughout this memo are therefore:
- **PR #73 diff** (`b4be354`): ground truth for "what PR #73 did".
- **Monorepo `origin/main`** (`ab90915`): ground truth for "what is live right now".
- **Monorepo `c70d2e6`**: ground truth for the pre-PR #73 baseline.
- **Fork HEAD** (`6f93b20` / 1.2.46): pure upstream mirror, used only as a reference for "what LIMITLESS-specific code looks like vs. a clean tracking fork".

No VPS state was inspected (no SSH from this session); the audit makes no claim about uncommitted modifications on the VPS working copy. If any exist, that is a separate known gap flagged in §7.

---

## 2. PR #73 Exact Diff

PR #73 (merged as `b4be354`, 2026‑04‑22) touched exactly 7 files (184 insertions, 2 deletions):

| File | Change | Assessment |
|------|--------|------------|
| `apps/nanoclaw/package.json` | Version bump `1.2.46` → `1.2.53`. No dependency changes. | Correct. |
| `apps/nanoclaw/scripts/cleanup-sessions.sh` | New, 150 lines. Verbatim from upstream qwibitai/nanoclaw. | Correct. |
| `apps/nanoclaw/src/config.ts` | +3 lines: adds `ONECLI_API_KEY` to the `readEnvFile` list and exports it. | Correct. |
| `apps/nanoclaw/src/container-runner.ts` | +3/-1 lines: imports `ONECLI_API_KEY`, passes it to `new OneCLI({ url, apiKey })`. | Correct. |
| `apps/nanoclaw/src/index.ts` | +2 lines: import and call `startSessionCleanup()` in `main()`. | Correct. |
| `apps/nanoclaw/src/session-cleanup.ts` | New, 25 lines. Adapted from upstream. | Correct. |
| `apps/nanoclaw/src/container-runner.test.ts` | **+1 line — but the line is malformed.** | **REGRESSION.** |

The one-line test diff literally reads:

```diff
       ONECLI_URL: '', // intentionally empty — exercises the guard branch
+      ONECLI_API_KEY: '','
       TIMEZONE: 'UTC',
```

Note the `'','` at the end. This is not valid TypeScript. It parses as "empty string, comma, then another single-quote starting a string literal that is never closed" — the entire object literal becomes unparseable, and the whole test file fails to compile. The author's clear intent was `ONECLI_API_KEY: '',` (one pair of quotes, one comma). It is a single stray keystroke.

In the same change, the author added `ONECLI_API_KEY` to the *local* mock object inside the `OneCLI guard — ONECLI_URL empty` `describe` block, but did **not** add it to the *top-level* `vi.mock('./config.js', () => ({ ... }))` stub at the top of the file. Any test that does not override that stub — i.e., all the other tests — would fail at import time with `No "ONECLI_API_KEY" export is defined on the "./config.js" mock`. This is a second regression, stemming from the same change.

There are no other regressions within the PR #73 diff. The session‑cleanup additions (`session-cleanup.ts`, `cleanup-sessions.sh`, the `index.ts` wiring, and the `package.json` version bump) are internally consistent and correct. The `ONECLI_API_KEY` plumbing through `config.ts` and `container-runner.ts` is correct.

**Both PR #73 regressions were already fixed in PR #85 Path X commit `cf110fb`**, which (a) corrected the `'','` typo to `'',` and (b) added `ONECLI_API_KEY`, `MONOREPO_PATH`, and `WORKTREE_BASE` to the top-level `vi.mock('./config.js')` stub. Those fixes are in `origin/main` today.

---

## 3. Defects Incorrectly Attributed to PR #73

MVAP Step 1 and CEO pre-verification surfaced three further defects that have been characterised in passing as "PR #73 regressions". The audit finds that **none of them were introduced by PR #73**. Attribution matters here because it determines whether the failure mode is "PR #73 landed sloppy" or "we do not have a CI rail for nanoclaw, and therefore every pre-existing defect stays latent until someone runs a full install on the VPS".

### 3.1 `discord.js` missing from `apps/nanoclaw/package.json` — **pre‑existing since 2026‑04‑03**

`apps/nanoclaw/src/channels/discord.ts` exists only on the monorepo side (it is not in the upstream fork) and its first line is `import { Client, Events, GatewayIntentBits, Message, TextChannel } from 'discord.js';`. This file was introduced by commit `f828f85` on 2026‑04‑03 ("Add Discord channel with group-aware bot message filtering"). That commit did **not** add `discord.js` to `apps/nanoclaw/package.json`, and no subsequent commit has added it either. I verified this by inspecting `c70d2e6:apps/nanoclaw/package.json` (the immediate parent of PR #73) — `discord.js` was already absent. I also verified `pnpm-lock.yaml` on `origin/main` contains zero references to `discord.js`.

The defect has survived for roughly three weeks because nothing in our merge pipeline runs `pnpm --filter nanoclaw install && pnpm --filter nanoclaw build` before allowing a merge, and because the VPS has been running an old compiled `dist/` that happens to have been built in a working-tree state where `discord.js` was either hoisted from the workspace root or manually installed by a human operator.

### 3.2 `pnpm-lock.yaml` out of sync with `package.json` — **PR #85's defect, not PR #73's**

The lockfile gap that blocked PR #85 local verification came from PR #85's own addition of `@octokit/auth-app`. That was fixed in commit `99b465d` as part of PR #85 Path X, and `origin/main` is now consistent.

### 3.3 `beforeAll` / `afterAll` missing from vitest imports in `container-runner.test.ts` — **PR #85's defect**

Before PR #85, the test file only needed `beforeEach`/`afterEach` — the PR #73 addition did not require `beforeAll`/`afterAll`. PR #85's new "GitHub App token injection" describe block (in commit that pre-dated Path X) used `beforeAll`/`afterAll` to snapshot and restore process env vars without importing them. This was caught and fixed in Path X (`cf110fb`).

### 3.4 Top-level mock missing `MONOREPO_PATH` and `WORKTREE_BASE` — **latent defect, activated by PR #85**

These config exports were added to `config.ts` in earlier LIMITLESS work, but the top-level `vi.mock('./config.js')` stub in the test file was never updated. Pre-PR #85, no test actually reached code paths that read them, so the omission was invisible. PR #85's new tests pulled those code paths into the test surface, turning a latent defect into a hard failure. Fixed in Path X.

### Implication

Counting strictly, **PR #73 introduced 2 defects, both in one file, both in the test suite, both now fixed on `origin/main`**. The pattern of "three rolling regressions" is an artefact of mixing pre-existing defects (from `f828f85`) with PR #73 defects and PR #85 defects in a single narrative. The right mental model is: *three merges in a row landed at least one defect each, for three different reasons, none of which was caught because nanoclaw has no CI.*

---

## 4. Classification Table (Monorepo `apps/nanoclaw/*` vs Fork)

For completeness, here is every differing file between the monorepo (`origin/main` = `ab90915`) and the fork (`6f93b20` = 1.2.46), classified per the Director's framework.

| File | Class | Commentary |
|------|-------|------------|
| `package.json` | Version bump = Legitimate sync. `@octokit/auth-app` = Intentional divergence (PR #85). `discord.js` absence = **Regression** (pre-PR #73). | See §3.1. |
| `pnpm-lock.yaml` (workspace root) | Legitimate drift — monorepo has a workspace lockfile; fork has per-package `package-lock.json`. | Not comparable. |
| `container/Dockerfile` | Intentional divergence. Adds `gh`, `pnpm`, custom entrypoint copy, `chmod 666 /etc/environment`. | Correct per LIMITLESS deployment needs. |
| `container/entrypoint.sh` (monorepo-only) | Intentional divergence. OS-level credential injection + git worktree reverse-ref fixup. | Correct. |
| `groups/global/CLAUDE.md` | Intentional divergence. Full LIMITLESS Worker Agent identity. | Correct. |
| `groups/main/CLAUDE.md` | Intentional divergence. Full LIMITLESS Architect identity. | Correct. |
| `scripts/cleanup-sessions.sh` (monorepo-only) | Legitimate sync (PR #73). | Correct. |
| `src/channels/discord.ts` (monorepo-only) | Intentional divergence. LIMITLESS group-aware bot filter. | Correct but see §3.1 re: package.json. |
| `src/channels/discord.test.ts` (monorepo-only) | Intentional divergence. Tests for the above. | Correct. |
| `src/channels/index.ts` | Intentional divergence. `import './discord.js';`. | Correct. |
| `src/config.ts` | Mixed. ONECLI_API_KEY = sync (PR #73). LIMITLESS_APP_*, MYTHOS_APP_*, MONOREPO_PATH, WORKTREE_BASE, NOTIFICATION_CHANNELS = intentional divergence. | All correct. |
| `src/container-runner.ts` | Mixed. ONECLI_API_KEY in `new OneCLI(...)` = sync (PR #73). Token generation, bot identity, monorepo mount, worktree mount, team workspace mount = intentional divergence. | All correct. |
| `src/container-runner.test.ts` | Mixed. PR #73 introduced 2 regressions; PR #85 Path X fixed them and added 5 new tests. | Fixed on main. |
| `src/db.ts` | Intentional divergence. Adds `deleteRegisteredGroup()`. | Correct. |
| `src/index.ts` | Legitimate sync (PR #73 wiring of `startSessionCleanup`). | Correct. |
| `src/ipc.ts` | Intentional divergence. Notification channels, status relay, stale-heartbeat detection. | Correct. |
| `src/session-cleanup.ts` (monorepo-only) | Legitimate sync (PR #73). | Correct. |
| `src/types.ts` | Intentional divergence. Adds `envVars?` and `teamId?` to `ContainerConfig`. | Correct. |

No file in the above table is "Ambiguous" in the Director's sense. The intentional divergences are all consistent with documented LIMITLESS customizations (bot orchestration, worker worktrees, IPC notifications, App-token identity, team workspaces). The regressions are fully isolated to two items: PR #73's two test-mock defects (already fixed) and the standing `discord.js` package.json gap (fix PR scoped below).

---

## 5. Architectural Review — "Absorb Upstream into Monorepo" (DR‑002)

The question the Director has put is whether PR #73's failure mode reveals a deeper problem with the DR‑002 "absorb upstream into the monorepo" approach, and whether we should rearchitect.

**My read: no, and we should not rearchitect. But we are running DR‑002 without one of the rails it assumes, and that rail — a nanoclaw CI build — is overdue.**

### 5.1 Why the DR‑002 posture is right

The LIMITLESS monorepo needs a single source of truth for the orchestrator code because:

1. The orchestrator is tightly coupled to monorepo state: it reads `MONOREPO_PATH`, mounts worktrees into containers, reads `apps/*/CLAUDE.md`, and honours `infra/`-driven deploy settings. Splitting it out into a satellite repo creates a two-way dependency that must be kept in step manually.
2. LIMITLESS-specific features — group-aware discord bot, notification channels, team workspaces, App-token identity, worker worktrees — are a significant and growing fraction of nanoclaw code. If we leave those in a satellite and try to land upstream changes there first, every upstream sync becomes a three-way merge.
3. The governance gradient favours centralisation. PRs touching nanoclaw share reviewers and conventions with PRs touching `apps/paths`, `apps/cubes`, etc. Splitting would fork the governance surface.

In short: the *code shape* is right. The orchestrator belongs in the monorepo.

### 5.2 What PR #73 revealed

What PR #73 revealed is not that absorption is wrong. It is that **we landed a PR whose verification surface (test syntax, mock completeness) was never executed on anyone's machine before merge**. That is a CI gap, not an architecture gap. Specifically:

- No `build-nanoclaw` CI job exists. `.github/workflows/ci-build.yml` covers other apps but not nanoclaw.
- No required-status-check in branch protection.
- Reviewers are human-only and reading diffs; they caught the *intent* of PR #73 but not the typo.
- The VPS was running an old `dist/` that happened to work, so no production signal escalated.

These are ordinary engineering oversights, not signals that "absorb upstream" is wrong. The fix is equally ordinary: add the CI job.

### 5.3 Upstream drift risk

A secondary concern is that upstream qwibitai/nanoclaw has now moved from ~1.2.53 to 2.0.9 with a substantially different dependency set (new `@clack/*`, removed `@onecli-sh/sdk` version churn, different setup tooling). The bigger the upstream delta grows, the harder future absorptions become. Two practical responses:

1. **Accept that absorption is cumulative work.** We should budget a small recurring sync effort — perhaps one "nanoclaw upstream drift review" per quarter — and keep the delta bounded.
2. **Record LIMITLESS-specific files explicitly.** A `NANOCLAW_DIVERGENCE.md` inside `apps/nanoclaw/` listing every file and section that intentionally diverges (discord.ts, ipc.ts notification handler, container-runner mount block, types.ts teamId, etc.) makes future absorption PRs auditable in minutes rather than hours. I am not proposing to write this now; I am flagging it as the lowest-cost improvement to make.

### 5.4 Worktree / source-of-truth recommendation

The Director asked specifically whether the `LIMITLESS-LONGEVITY/nanoclaw` fork should stay live. My recommendation:

- **Keep the fork, but treat it as a read-only upstream-tracking mirror.** It should periodically `git pull` from `qwibitai/nanoclaw` and nothing else. No LIMITLESS-specific code should ever land there.
- **All active development is in `LIMITLESS-LONGEVITY/limitless` under `apps/nanoclaw/`.** This is already effectively the case; formalise it in one line of `apps/nanoclaw/CLAUDE.md`.
- The fork's value going forward is (a) an obvious `git diff` target for upstream drift, (b) a clean reference when a reviewer asks "is this file LIMITLESS-specific or upstream?".

---

## 6. Recommendations

In priority order:

1. **[P1 / this week] Land the one-line `discord.js` fix.** Adding `"discord.js": "^14.x"` to `apps/nanoclaw/package.json` dependencies and regenerating `pnpm-lock.yaml`. Scoped in §7. This is the only regression still sitting on `origin/main`.
2. **[P1 / this week] Add a `build-nanoclaw` CI job** (`.github/workflows/ci-build.yml`). Minimum contract: `pnpm install --frozen-lockfile && pnpm --filter nanoclaw build && pnpm --filter nanoclaw test`. Wire it into branch protection as a required check. This is the rail PR #73 needed. This was previously deferred; deferring it further is now the expensive option.
3. **[P2 / next two weeks] Codify the attestation convention** that PR #85 Path X started using: `[x]` in a PR body means "I ran this and observed the green/pass result"; `[ ]` means "not verified". Director's §5.5 spec captures this in principle; inline it into the nanoclaw PR template so it is unavoidable.
4. **[P3 / next month] Write `apps/nanoclaw/NANOCLAW_DIVERGENCE.md`** listing intentional divergences from upstream. Single source of truth for future absorption PRs.
5. **[P3 / next month] Demote `LIMITLESS-LONGEVITY/nanoclaw` to read-only upstream mirror.** Update `apps/nanoclaw/CLAUDE.md` to name `apps/nanoclaw/` under `LIMITLESS-LONGEVITY/limitless` as the sole source of truth; the fork is a mirror.

I am **not** recommending that we roll back PR #73 or rearchitect DR‑002. The surface area of the actual defect (one typo + one mock stub) does not justify either.

---

## 7. Fix PR Scope (separate from this memo PR)

**PR: `fix(nanoclaw): declare discord.js dependency missing since f828f85`**

- Branch: `fix/nanoclaw-discord-dep`
- Change: `apps/nanoclaw/package.json` — add `"discord.js": "^14.16.0"` (or whichever version is currently being resolved in practice on the VPS, checked against `ls node_modules/discord.js/package.json` if the Director can SSH; otherwise the latest 14.x at the time of the fix).
- Also: regenerate `pnpm-lock.yaml` with `pnpm install` from the monorepo root.
- Verification attestation (to be included in PR body):
  - [ ] `pnpm install --frozen-lockfile` clean from repo root.
  - [ ] `pnpm --filter nanoclaw build` succeeds.
  - [ ] `pnpm --filter nanoclaw test` — all green.
  - [ ] Verified in temp-clone at `/tmp/...` (main-group session, no worktree mount) — path documented in PR body.
  - Each box is marked `[x]` only after I personally observe the command completing successfully. Boxes I cannot verify in this environment stay `[ ]` with a note.

**Known gap requiring Director assistance:** I cannot SSH to the VPS from this session. If the VPS's running `node_modules/discord.js` has a specific pinned version that happens to work and a newer major would break, the Director needs to either (a) share the installed version, or (b) run the fix PR's install in a staging environment before merging. I will flag this explicitly in the fix PR body rather than guess.

A separate follow-on "Path 2" change — extending `readEnvFile` to recognise both `LIMITLESS_APP_PRIVATE_KEY` and `LIMITLESS_APP_PRIVATE_KEY_PATH` — was discussed in the MVAP Step 1 prep and is **not** in scope for this audit's fix PR. It should be its own PR once MVAP Step 1 completes.

---

## 8. Confidence and Known Gaps

- **High confidence:** PR #73 diff analysis (I have the exact `git show`), pre-PR #73 package.json state, current `origin/main` state, fork HEAD state.
- **Medium confidence:** Architectural review — informed by the diff evidence plus DR‑002 prior memos, but the "absorption is the right shape" conclusion is a design judgement the Director may weigh differently.
- **Low confidence / known gaps:**
  - I cannot read the VPS working copy from this session. If there are uncommitted local modifications under `/home/limitless/nanoclaw/`, they are not reflected here.
  - I cannot run `pnpm install && pnpm test` in a verified environment from this session. The fix PR must be verified in a temp-clone or by the verifier role before merging.
  - Upstream v1.2.53 is a LIMITLESS-internal version label; I could not retrieve the exact upstream tree state from that moment in time. The PR #73 commit message and diff are treated as the authoritative record of what was absorbed.

---

## 9. Close

PR #73's actual failure mode is small and recoverable, and the corrections are already in `origin/main`. The real systemic finding is the CI gap. Once that rail is in place, absorption PRs become safe to land even when their author makes a one-keystroke mistake. I recommend that path rather than a rearchitecture.

— LIMITLESS INFRA Architect, 2026‑04‑23
