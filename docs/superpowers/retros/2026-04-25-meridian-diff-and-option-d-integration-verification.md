---
name: Bundled retrospective — Meridian-diff incident + Option D / integration-verification lessons
authored-by: Director (CC session)
ratified-by: pending CEO
covers-incidents: 2026-04-25 fleet breakage + cache_control 400, 2026-04-23 Option D PR-#73-regression rollback
created: 2026-04-25
related-memories: feedback_canonical_docs_first.md, feedback_diff_against_working_reference.md, feedback_no_proxy_header_injection.md, feedback_verification_first.md, feedback_prefer_rigor_over_speed.md
related-specs: 2026-04-25-sdk-contract-proxy-as-interop-layer.md
related-plans: 2026-04-25-v2-streaming-bug-onecli-fallback-patch.md
related-proposals: 2026-04-25-multi-environment-architect-pipeline.md, 2026-04-25-nanoclaw-v2-phase-0-sdk-compliance-handoff.md
---

# Bundled Retrospective — 2026-04-23/25 Integration-Verification Arc

## Why bundled

CEO requested on 2026-04-23 that the Option D / PR-#73-regression
retrospective be deferred until the Infra audit returned. Before that
audit landed, the 2026-04-25 fleet incident happened. Both incidents
share a single root meta-pattern: **single-environment systems where
verification is conflated with PR-passing and where canonical
references aren't consulted before debugging.** Bundling them captures
the meta-pattern with two reinforcing instances.

## Incident #1 — 2026-04-23 PR #73 regression cascade

**Arc summary:**

- PR #73 (NanoClaw 1.2.46→1.2.53 upstream sync) merged 2026-04-22 with
  green CI. Three downstream regressions surfaced over the next 24
  hours:
  1. 4 cascading test-mock integrity defects in
     `container-runner.test.ts`
  2. Missing `pnpm-lock.yaml` regen for `@octokit/auth-app`
  3. `apps/nanoclaw/package.json` missing `discord.js` dep while
     `src/channels/discord.ts` still imported it
- MVAP (Manual Verification Action Plan) Step 1 was attempted on VPS-1
  on 2026-04-23 ~19:35 UTC. Phases 1-4.5 executed cleanly; Phase 5
  (`pnpm run build`) revealed regression #3 above.
- CEO invoked Option D ("stability and predictability are core
  principles, worth time+resources"). Rollback was clean — service up
  on fork code, zero data loss, no config drift.
- Root cause: PR #73 merged with CI passing because CI didn't exercise
  the production build path. The `tsc` step that would have caught the
  missing dep wasn't in CI.

**Lesson surface:**
- "PR passes CI" ≠ "code is integration-verified". CI exercises a
  subset; integration with the prod build/runtime path is a different
  contract.
- A single environment (prod) has no place to discover this gap before
  it bleeds into prod recovery time.

## Incident #2 — 2026-04-25 cache_control 400 + fleet streaming death

**Arc summary:**

- PR #105 (Week 1 Node 24 migration) deployed 2026-04-24 07:59 UTC
  with green CI and a clean systemd service start.
- Symptom started immediately: NanoClaw fleet's Architect containers
  died at code 137 within 7-13 sec of spawn. Surface stayed silent for
  ~8 hours because proactive checks fail-silently and Director didn't
  notice until 2026-04-25 morning Discord traffic.
- ~24 hours of CEO + Director debug surfaced TWO distinct root causes:
  - **Cause A**: OneCLI proxy was injecting a static `anthropic-beta`
    header that overrode the coherent header constructed by
    `claude-agent-sdk` 0.2.116+. The body fields the SDK emitted
    (`cache_control.ephemeral.scope`, `context_management`) were
    rejected by Anthropic API because the proxy-injected header didn't
    enable them.
  - **Cause B**: OneCLI's MITM proxy disconnects ~3 sec into streaming
    SSE responses from `api.anthropic.com`. Independent of Cause A.
- **Cause A fixed** by deletion of the `Anthropic Beta Header` OneCLI
  secret. Verified working: shadow v2 returned a coherent ~700 char
  response in 9 sec.
- **Cause B remains** — affects long-streaming responses on both prod
  1.2.53 and shadow v2. Fix planned in
  `2026-04-25-v2-streaming-bug-onecli-fallback-patch.md`.

**Lesson surface:**
- Whac-a-mole field-by-field debugging is a sign that the working
  hypothesis is wrong. Each fix moving the error to the next field
  means the fix doesn't address the root.
- A working reference implementation (Meridian) was a 15-minute read
  away. Reaching for it earlier would have collapsed ~10 hours of
  hypothesis-testing into ~30 minutes of diff-and-verify.
- Single-environment systems concentrate ALL failure modes onto the
  CEO-facing prod surface. The 8-hour blast-radius surfacing latency
  is a structural property of single-env, not a Director attention bug.

## Common meta-pattern across both incidents

| Dimension | Incident #1 | Incident #2 |
|---|---|---|
| Where the gap lived | CI ≠ integration-verification | OneCLI ≠ SDK contract surface |
| Why it surfaced in prod | No Test environment | No Test environment |
| Why debug took long | No reference comparison | No reference comparison |
| What the fix proved | Rollback strategy works | Header deletion works |
| What couldn't be fixed without Test env | The class of regression | The class of drift |

**Both incidents are instances of the same meta-pattern**: missing
defense-in-depth between PR-merge and prod-impact, plus debug-by-
hypothesis instead of debug-by-reference-comparison.

## What worked (keep doing)

1. **Option D ("rigor over speed")** during incident #1. Rolling back
   cleanly preserved the system's stability/predictability invariants
   even at cost of additional cycle time. CEO's framing ("worth time +
   resources") was correct.

2. **CEO insight as escalation path**. In incident #2, CEO surfacing
   Meridian as a reference was the breakthrough. Director hadn't
   reached for an external reference; CEO did. The CEO-as-final-
   reasoner pattern works.

3. **Multi-agent corroboration**. Visual Tutor + OpenClaw Director +
   in-session Director triangulating root causes converged correctly.
   Director synthesizing into the SDK Compliance handoff captured the
   shared diagnosis.

4. **Three-layer artifact discipline**. Each incident produced a
   topic-file memory + handoff document + (now) spec/retro. Future
   sessions inherit the full trail.

5. **Persistent storage of WIP** (per
   `feedback_persistent_storage_for_work_products.md`). Shadow v2
   bootstrapped + state-preserved across multiple Director session
   resumes despite OneCLI streaming death killing one mid-task.

## What failed (stop doing)

1. **PR-passing-CI conflated with integration-verified**. PR #73 merged
   green; PR #105 merged green. Both shipped real prod defects
   immediately.

2. **Hypothesis-first debugging on integration class issues**. Spent
   ~10 hours testing field-by-field theories on cache_control before
   reaching for Meridian. The 80/20 was reversed.

3. **Manual proxy header injection at OneCLI**. The static
   `anthropic-beta` secret was a structural bug — would have failed
   eventually no matter what version-pin we picked.

4. **Single-environment posture for a software product (NanoClaw fleet
   itself)**. Same posture is unacceptable for any other dev project
   in the org. Pipeline gap was already visible in retrospect.

## What to try (new ideas)

1. **Multi-environment Architect pipeline (P0)** — proposal at
   `2026-04-25-multi-environment-architect-pipeline.md`. Dev → Test →
   Staging → Prod for the agentic-team-as-software-product. Defends
   against both incident classes structurally.

2. **Reference-implementation-first debug protocol** — when stuck on
   integration X for >2 hypotheses, find a known-working reference
   implementation and DIFF first. Memory:
   `feedback_canonical_docs_first.md` and
   `feedback_diff_against_working_reference.md`.

3. **SDK-contract-as-spec discipline** — proxy/gateway code that
   touches an SDK-API wire format must be governed by a binding spec
   (now: `2026-04-25-sdk-contract-proxy-as-interop-layer.md`). New
   such code is not mergeable without spec compliance.

4. **Build-step in CI** for any monorepo PR that touches a service.
   `pnpm run build` + `pnpm run typecheck` in CI before merge would
   have caught PR #73's three regressions on green-CI machine.
   (Already on the existing governance amendments queue per
   2026-04-23 session memory.)

5. **End-to-end smoke test post-deploy**. The 8-hour latency on
   incident #2 surface was because nothing pinged a fresh Architect
   spawn after the Node 24 deploy. A 60-second smoke test (spawn an
   Architect; have it return "ok"; tear down) catches Cause-A-class
   regressions immediately. Already partially aligned with
   `feedback_verification_first.md` 2026-04-24 amendment; extend.

## Action items

| # | Action | Owner | Deadline | Status |
|---|---|---|---|---|
| 1 | Ratify spec `2026-04-25-sdk-contract-proxy-as-interop-layer.md` (CEO formal Approving Review) | CEO | 2026-04-26 | Pending |
| 2 | Execute v2 streaming-bug patch per plan `2026-04-25-v2-streaming-bug-onecli-fallback-patch.md` | Infra Architect (or Director hand-applied) | 2026-04-27 | Pending |
| 3 | Refactor v2 `claude.ts` to Meridian's conditional `resolveSystemPrompt` shape (Phase 0 follow-up) | Infra Architect | next dispatch | Pending |
| 4 | Refine multi-environment pipeline proposal into formal spec | Infra Architect | when fleet operational | Pending |
| 5 | Add `pnpm run build` + `pnpm run typecheck` to CI for any PR touching `apps/*` (covers PR #73 class) | Infra Architect | next CI PR cycle | Pending |
| 6 | Add post-deploy E2E smoke test (Architect spawn + roundtrip) — extends `feedback_verification_first.md` 2026-04-24 amendment | Infra Architect | when env-pipeline lands | Pending |
| 7 | Update SOUL.md / IDENTITY.md / TOOLS.md on OpenClaw with reference-first debug protocol | Director | 2026-04-26 | Pending |
| 8 | Promote spec to DR-NNN at next governance ratification cycle | CEO | next DR cycle | Pending |

## Director notes

The two incidents bundled here cover a 48-hour arc where the team's
rigor temperament held under pressure. CEO's "stability and
predictability are core principles" framing on 2026-04-23 became the
operational temperament for 2026-04-25's longer debug. Each delay paid
back in correct root-cause identification and clean recovery.

The specific gaps that remain after this retrospective land as
governance amendments and pipeline work. They are not Director-level
fixes; they are platform-level investments. Ratifying spec #1 + executing
plan #2 are the immediate unblocks for shadow v2 testing.

Open thread for next CEO discussion: should this retrospective land as a
DR (governance-binding) or as a normal retro (operational record)?
Recommendation: split — the SDK contract spec is DR-class (binding); the
retrospective itself is operational (this file). DR ratification covers
the rule; the retro records the learning.
