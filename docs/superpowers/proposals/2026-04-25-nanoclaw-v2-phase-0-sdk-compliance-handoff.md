---
status: OPEN — awaiting execution
intended-recipient: NanoClaw Infra Architect (fleet bot — has intimate codebase + infra knowledge)
authorization: CEO (2026-04-25, in #main-ops dialogue with OpenClaw Director gpt-5.5 + Director)
created: 2026-04-25
priority: P1 (gates v2 migration; gates Architect fleet recovery)
authority: ACTIONS ALLOWED (this is execution-grade, not analysis-only). Follows normal governance: PR + CEO ratification per phase.
---

# NanoClaw v2 Phase 0 — SDK Compliance & Clean-Room Bootstrap

## CEO framing (verbatim, 2026-04-25T07:54Z)

> "this is actually an opportunity for us to do things properly with a fresh nanoclaw v2 version which does not yet have our customizations. After we have it up and running properly we can cherry pick what customizations to introduce from our older v1 version. It seems obvious that the first place to start will be a comprehensive analysis of the new SDK requirements so we are in compliance and can get our nanoclaw v2 fully operational before adding customization."

This handoff codifies that framing into an executable plan. **Phase 0 = SDK compliance first; v1 customization port is later, gated, and selective.**

## Background — what's broken today

We've spent ~24 hours of CEO+Director time discovering:

1. **Prod 1.2.53 fleet** is partially working (short tasks succeed, long-streaming tasks die at code 137 ~7-10 sec into Anthropic SSE response). Root cause = OneCLI MITM proxy + agent-runner stream-handling mismatch with current OneCLI/SDK.
2. **Shadow v2 on VPS-1** (`/home/limitless/nanoclaw-v2/`) is bootstrapped and runs cleanly, OneCLI-integrated, CLI-socket-bound — but every chat request fails 400 from Anthropic with `system.2.cache_control.ephemeral.scope: Extra inputs are not permitted`.
3. **Adding the missing `prompt-caching-scope-2026-01-05` beta header** moves the error to `context_management: Extra inputs are not permitted` — i.e., `claude-agent-sdk` 0.2.116+ emits MULTIPLE forward-compat fields that require multiple beta headers, none of which our OneCLI-injected set currently includes.
4. **Pinning SDK to 0.2.76** (matching prod) doesn't fully fix shadow v2 either — v2's `container/agent-runner/src/providers/claude.ts:275` uses `systemPrompt: { type: 'preset', preset: 'claude_code', append: instructions }`, and the `claude_code` preset itself emits the scoped cache fields regardless of SDK version.

## Three Architect convergence on root cause

- **Visual Tutor** (CEO's external) — primary: add beta header; fallback: pin SDK 0.2.76
- **OpenClaw Director (gpt-5.5)** — primary: pin SDK 0.2.76; fallback: add beta header
- **Director (CC session)** — both confirmed empirically; both have gaps; the CORE issue is v2's USE OF the SDK preset, not just SDK version

OpenClaw's deeper synthesis (Discord, 2026-04-25T07:48Z) is the operational thesis Phase 0 builds on:

> "Old SDK tolerated our prompt shape. New SDK added semantics (`SYSTEM_PROMPT_DYNAMIC_BOUNDARY` distinguishes stable/cacheable system prompt from dynamic per-run content). Our beta-header path is incomplete. Pinning is the safe short-term unblock. Prompt/beta alignment is the durable fix."

## Phase 0 goal

**Get a clean, vanilla NanoClaw v2 install fully operational against the latest claude-agent-sdk + Anthropic API, with NO LIMITLESS customizations and FULL SDK compliance.** Document exactly what compliance means in our environment. Establish a baseline that every future customization PR will be measured against.

Not a goal of Phase 0: porting any v1 customization. Not a goal: fixing prod 1.2.53. Not a goal: changing OAuth token to API key. Not a goal: re-installing channel adapters beyond CLI.

## Phase 0 deliverables (in order)

### Deliverable 0.1 — SDK Compliance Brief

**Output:** `docs/superpowers/specs/2026-04-25-nanoclaw-v2-sdk-compliance-brief.md` (~1500-3000 words). Author = you (Infra Architect). Reviewer = main-ops Architect (when available) OR Director.

**Contents:**

1. **SDK request anatomy** — exhaustive enumeration of every field `@anthropic-ai/claude-agent-sdk@latest`'s `query()` emits in the outbound `/v1/messages?beta=true` request body. Group by: stable (always-accepted), beta-gated (require specific `anthropic-beta` header), and version-specific (introduced/removed in specific SDK versions).
2. **`SYSTEM_PROMPT_DYNAMIC_BOUNDARY` semantics** — what it is, when the SDK uses it, what marker it inserts, what gets cached vs not, what `scope: "global"` means. Reference SDK source `/home/limitless/nanoclaw-v2/container/agent-runner/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs` if needed.
3. **Beta-header matrix** — for each beta-gated field, what `anthropic-beta` value enables it. Include known: `prompt-caching-2024-07-31`, `extended-cache-ttl-2025-04-11`, `oauth-2025-04-20`, `prompt-caching-scope-2026-01-05`, `context_management-???`. Find any others by inspecting SDK source + Anthropic docs + community signals.
4. **Auth-mode gating** — what's enabled for `sk-ant-oat01-` consumer OAuth vs `sk-ant-api-` org API key. Specifically: does `prompt-caching-scope-2026-01-05` work with our consumer OAuth? Test empirically with a single direct curl through the OneCLI gateway.
5. **Streaming contract** — how the SDK consumes SSE responses; what timeouts apply; how OneCLI's MITM proxy interacts with long streams.
6. **`systemPrompt` API** — preset modes (`'claude_code'` vs others vs raw) — what each does, what fields each emits, how to construct a custom system prompt that AVOIDS the beta-gated fields if compliance can't be achieved through headers alone.

**Definition of done:** the brief is exhaustive enough that a new operator could read it and configure a working v2 deployment from scratch.

### Deliverable 0.2 — Compatibility Matrix Test

**Output:** `docs/superpowers/specs/2026-04-25-nanoclaw-v2-compatibility-matrix.md` + a test script (`/home/limitless/nanoclaw-v2/scripts/sdk-compat-probe.ts` or similar) that empirically verifies each cell.

**Matrix cells (SDK version × beta header set × auth mode × prompt complexity):**

| SDK version | Beta headers | Auth | Prompt | Expected |
|---|---|---|---|---|
| 0.2.76 (prod) | current 3 | OAuth | simple | ✅ 200 |
| 0.2.76 | current 3 | OAuth | claude_code preset | ❌ 400 (already confirmed today) |
| 0.2.119 (latest) | current 3 | OAuth | claude_code preset | ❌ 400 cache_control.scope |
| 0.2.119 | + `prompt-caching-scope-2026-01-05` | OAuth | claude_code preset | ❌ 400 context_management (confirmed today) |
| 0.2.119 | + scope + context_management beta (TBD) | OAuth | claude_code preset | ? |
| 0.2.119 | full identified beta set | OAuth | NO preset, raw system | ? — if works, we have a path |
| 0.2.119 | full identified beta set | API key | claude_code preset | ? — control for OAuth gating |

**Definition of done:** every cell has an empirical result + a documented explanation. Identifies the COMPLIANT configuration for our environment.

### Deliverable 0.3 — Working Shadow v2 (verification)

Apply the compliant configuration from 0.2 to `/home/limitless/nanoclaw-v2/`. Demonstrate:

1. Short prompt round-trip success
2. Long prompt (~3000 chars system + ~2000 chars user) round-trip success
3. Streaming response completes cleanly
4. Tool use (Read, Bash, WebFetch) works
5. Multi-turn conversation works
6. Container exits cleanly with code 0 (not 137) after task completion

If any test fails: extend the SDK Compliance Brief with the new finding + iterate.

### Deliverable 0.4 — NanoClaw v2 Prompt Contract

**Output:** `docs/superpowers/specs/2026-04-25-nanoclaw-v2-prompt-contract.md` (~800-1500 words).

Per OpenClaw's recommendation:
- **Static section** (before `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` if used, or as cacheable-marked blocks): Architect identity, stable operating rules, app scope, tool definitions
- **Dynamic section** (after boundary, no cache_control): Discord message, channel metadata, task context, volatile session state, time-sensitive data
- **Explicit anti-rules**: no secrets in cacheable blocks, no per-run state in static, no large mutable contexts in cacheable blocks

This contract becomes the canonical structure that all future Architect CLAUDE.md content will be authored against.

### Deliverable 0.5 — v1 Customization Inventory (NOT YET PORTED)

**Output:** `docs/superpowers/specs/2026-04-25-v1-customizations-to-evaluate.md` (~1000-2000 words).

Exhaustive list of LIMITLESS-specific changes in our 1.2.53 fork that diverge from upstream v2. For each:
- What it does
- Why we added it (link to PR, DR, or memory)
- Whether v2 still needs it (vs upstream-equivalent feature)
- Port priority: must-have / nice-to-have / drop
- Estimated port effort

Categories to cover:
- DR-001 Phase 3 (limitless-agent[bot] App identity + token minting)
- DR-002 (monorepo-as-source-of-truth)
- Per-app Architect topology (5 Architects + main-ops)
- Discord channel topology + bot setup (TRUSTED_BOT_IDS, allowBots, requireMention)
- Custom CLAUDE.md fragments per Architect
- Governance integration (CODEOWNERS ratification, §5.5 attestation, ruleset 15502000)
- Node 24 + better-sqlite3 12.3.0 (just landed via PR #105)
- Host Relay Surface (PR #89 DRAFT)
- Any custom container-runner.ts modifications
- Any custom agent-runner-src per group

**Phase 1+ work** (NOT PART OF PHASE 0): port these one-by-one against the green Phase 0 baseline, with PR + ratification per port.

## Streaming-bug awareness — work in small chunks

You (Infra Architect) experienced today that long-output tasks die mid-stream when run through prod 1.2.53. Phase 0's deliverables are LARGE specs. To avoid losing work to streaming death:

- **Stash work-in-progress to `/workspace/group/drafts/` AS YOU GO** (per `feedback_persistent_storage_for_work_products.md`)
- **Break large deliverables into smaller PRs** — one PR per deliverable section if needed
- **Verify each PR is mergeable before continuing to the next** — don't accumulate weeks of unmerged work

If a session dies mid-deliverable: resume in a fresh container, read the stash, continue. The work is preserved.

## Working environment

**Don't touch prod 1.2.53.** It's degraded but operational. Phase 0 work happens in:
- `/home/limitless/nanoclaw-v2/` on VPS-1 — already cloned, deps installed, image built, OneCLI integrated, service running. Use this for compatibility-matrix testing + arriving at the green configuration.
- Read-only inspection of `/home/limitless/nanoclaw/` (prod) is fine for comparing against the v2 baseline.

**OneCLI gateway**: shared between prod and shadow. Both are routed cleanly via separate agents (`Default Agent` for prod, `cli-with-director` for shadow). Don't reconfigure shared OneCLI without coordinating with Director.

**Anthropic credentials**: `sk-ant-oat01-` OAuth token is what's currently in OneCLI's vault. Do NOT swap to API key without CEO ratification — that's a Phase 1+ decision.

## Authority + governance

This handoff authorizes execution: you can write code, modify v2 install, run tests, push PRs, restart shadow v2 service. You may NOT touch prod 1.2.53 without Director coordination.

Each deliverable PR follows normal governance:
- §5.5 attestation in PR body
- CODEOWNER review (CEO via formal Approving Review per ruleset id 15502000)
- Squash-merge

If you hit a blocker requiring CEO decision: surface to #main-ops with the BLOCKER message format from `feedback_blocker_surface_latency.md`.

## Related artifacts (for context)

- Multi-environment Architect pipeline proposal: `docs/superpowers/proposals/2026-04-25-multi-environment-architect-pipeline.md` — Phase 0 is implicitly using shadow v2 as the Test environment for v2 work
- Cache control investigation handoff: `docs/superpowers/proposals/2026-04-25-cache-control-scope-investigation-handoff.md` — research origin of today's 400 errors (Visual Tutor + OpenClaw Director responses on file)
- DR-001 Phase 3: `project_agent_identity_dr001.md` (memory) — the App-token minting we'll need to port in Phase 1
- DR-002: `project_nanoclaw_source_of_truth_dr002.md` (memory) — monorepo deploy posture
- v2 upstream CHANGELOG entry: https://github.com/qwibitai/nanoclaw/blob/main/CHANGELOG.md (v2.0.0 section)
- `@anthropic-ai/claude-agent-sdk` on npm: https://registry.npmjs.org/@anthropic-ai/claude-agent-sdk

## Definition of Phase 0 success

When ALL of the following are true:
1. ✅ SDK Compliance Brief published as a spec
2. ✅ Compatibility matrix has empirical results for every cell + a clearly identified COMPLIANT configuration
3. ✅ Shadow v2 demonstrates working short, long, streaming, tool-use, and multi-turn flows under the compliant config
4. ✅ Prompt Contract spec defines the static/dynamic structure all future Architects will follow
5. ✅ v1 Customization Inventory exists as a planning artifact for Phase 1

THEN Phase 1 (selective customization port) can begin.

---

*Director-drafted. Picked up by NanoClaw Infra Architect at CEO's direction (2026-04-25T10:41Z, #main-ops). OpenClaw Director (gpt-5.5) is available as a parallel analysis resource — feel free to dispatch sub-questions to them via Director if useful, but you are the executor.*
