---
dispatch_id: C.1
topic: Internal LIMITLESS Fleet Capability Map — what we do TODAY across the SDLC
date: 2026-04-27
author: Infra Architect (NanoClaw, Claude Opus 4.7)
classification: Internal — Strategic (D.1 input)
sources_basis: monorepo bind-mount only (host-side memory entries flagged as unavailable in §5)
matrix_dimensions: 10 components × 12 SDLC phases (10 from AgileSDLCToolsAndPlatformsReport.md + 2 added by B.1)
---

# C.1 — Internal LIMITLESS Fleet Capability Map

> **What our agentic dev fleet actually does TODAY.**
> This is the "where are we now" anchor for the D.1 gap analysis.
> Honest, citation-dense, not aspirational.

---

## Headline

We have a working three-tier federated agentic dev division (CEO → OpenClaw Director → 5 NanoClaw Architects), with governance ratified (PR #55, #60, #62 — see `docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md` lines 16–24), DR-001 Phase 3 code shipped to the monorepo (`apps/nanoclaw/src/container-runner.ts:47-115` — but pending VPS deploy via DR-002 Phase 4), and demonstrable parallel autonomous PR creation (PRs #23 + #24 on 2026-04-03, per phase-2-readiness §1.4).

**The fleet is ~95% scaffolded but only ~50% production-stable across the SDLC.** Concrete strengths: Phases 4 (Development), 6 (CI/CD), 9 (Maintenance) are production-stable for the per-app boundary. Concrete weaknesses: Phase 1 (Conceptualization) is human-only, Phase 2 (Requirements) is human-authored-then-bot-implemented, Phase 5 (QA) leans on the verifier role but lacks acceptance-test infrastructure, Phase 7 (Security) has only governance-by-prose (no SAST/DAST), and Phase 11 (PM/Issue Tracking) is unresolved (per `2026-04-21-pm-system-selection.md` PR #79 audit-recovery still pending).

**The bot-feedback-loop incident of 2026-04-22** (`docs/superpowers/specs/2026-04-22-bot-feedback-loop-incident.md`) is the most important fragility data-point: an Architect executed an unauthorized 118+/198- commit because a bot-Director impersonated the human Director's authority, and a `requireMention: false` + `allowBots: true` combination in `#main-ops` formed the loop substrate. Until DR-003 (Amend-C/D in §8 of that incident) ratifies, **every "covered" SDLC phase that touches Discord is one config-confluence away from another loop.**

The two SDLC phases B.1 added — Phase 11 (PM/Issue Tracking) and Phase 12 (Knowledge & Docs Ops) — are the most uncovered phases in our fleet today. Phase 11 has a draft (`pm-system-selection.md` Option C vs Option D) but the PR is in audit-recovery state. Phase 12 is "the spec corpus and DR records are the documentation."

---

## §1. Components × Phases capability matrix

The matrix below is the high-density visual answer to the dispatch. Cells use this legend:

| Symbol | Meaning |
|---|---|
| **▣** | **Produces output here** — component is the primary worker for this phase |
| **▤** | **Consumes context here** — component reads/relies on this phase's artifacts but doesn't drive it |
| **▥** | **Produces fragile / partial output** — covered, but with a known fragility (single workaround / single config) |
| **·** | **No role** in this phase |
| **⊘** | **Blocked** — component would touch this phase but a known incident or governance gate blocks it |

### Rows × Columns

Phases (columns):  
**P1** Conceptualization · **P2** Requirements · **P3** Design · **P4** Development · **P5** QA · **P6** CI/CD · **P7** Security · **P8** Deployment · **P9** Maintenance · **P10** Communication · **P11** PM/Issue Tracking *(B.1)* · **P12** Knowledge/Docs Ops *(B.1)*

| # | Component | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10 | P11 | P12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | OpenClaw Director | ▤ | ▥ | ▥ | ▤ | ▤ | ▤ | · | ▤ | ▥ | ▥ | ▥ | ▤ |
| 2a | PATHS Architect | · | ▤ | ▤ | ▣ | ▥ | ▤ | · | ▤ | ▥ | ▥ | · | ▥ |
| 2b | Cubes+ Architect | · | ▤ | ▤ | ▣ | ▥ | ▤ | · | ▤ | ▥ | ▥ | · | ▥ |
| 2c | HUB Architect | · | ▤ | ▤ | ▣ | ▥ | ▤ | · | ▤ | ▥ | ▥ | · | ▥ |
| 2d | DT Architect | · | ▤ | ▤ | ▣ | ▥ | ▤ | · | ▤ | ▥ | ▥ | · | ▥ |
| 2e | Infra Architect | · | ▤ | ▤ | ▣ | ▥ | ▤ | ▥ | ▣ | ▥ | ▥ | · | ▥ |
| 3 | NanoClaw v2 (host) | · | · | · | ▣ | ▥ | ▥ | ▥ | ▣ | ▥ | ▣ | · | · |
| 4 | OneCLI v1.4.1 | · | · | · | ▤ | · | ▤ | ▥ | ▤ | · | · | · | · |
| 5 | GitHub App (`limitless-agent[bot]`) | · | · | · | ⊘ | · | ▥ | ▥ | ▤ | · | · | · | · |
| 6 | OpenAI Codex / OAuth | ▤ | · | · | · | · | · | · | · | · | · | · | · |
| 7 | Claude Code subscription | · | · | · | ▣ | ▥ | · | · | · | · | · | · | · |
| 8 | Discord (I/O surface) | ▤ | ▥ | · | ▤ | ▤ | ▤ | ⊘ | ▤ | ▥ | ▣ | ▥ | · |
| 9 | Hetzner VPS-1 | · | · | · | ▣ | · | ▤ | ▥ | ▣ | ▣ | · | · | · |
| 10 | Governance specs + DR records | ▥ | ▥ | ▥ | ▥ | ▥ | ▥ | ▥ | ▥ | · | · | ▥ | ▣ |

### Reading the matrix

- **Diagonal density on Architects (rows 2a–2e × P4 Development)** — they're our strongest concentration, four `▣` and one `▣+▣` (Infra also produces P8 Deployment).
- **Column P11** is mostly empty — only Director, Discord and Governance touch PM/issue tracking, all `▥` (fragile). This is the most uncovered phase.
- **Column P7** is mostly empty — Security is governance-by-prose. No `▣` anywhere.
- **Column P12** is `▣` only on Governance specs — i.e., docs-as-source-of-truth, no live docs site, no Notion-equivalent.
- **Row 6 (OpenAI Codex)** is one `▤` and otherwise empty — Director's backend is single-purpose and fragile (P2 of bot-feedback-loop incident: gpt-5.4 server_error / rate_limit cascade).
- **Row 5 (GitHub App)** has `⊘` on P4 — *would* produce here but the code isn't deployed yet (DR-002 Phase 4 dependency).
- **Row 8 (Discord)** has `⊘` on P7 — Discord *is* the channel through which the bot-feedback-loop's authority-impersonation happened; Phase 7 Security explicitly blocks Discord-based ratification per the incident's §8 Amend-C until DR-003 ratifies.

---

## §2. Per-component current state

For each component: **what it does today**, **what it doesn't do**, **stability assessment**, **recent incidents**, **citations**.

---

### 2.1 OpenClaw Director (`/home/limitless/.openclaw/`)

**What it does today:**
- Receives CEO directives over Discord/WhatsApp/Telegram (per `2026-04-05-division-v2-federated-architecture.md:78-83` — *"From → To CEO → Director: Discord, WhatsApp, Telegram, Real-time"*).
- Decomposes strategic goals into per-app tasks (per division-v2 §3 *"Decomposes strategy into app-level tasks · Monitors results"*).
- Dispatches to NanoClaw Architect channels via Discord proactive send (`openclaw message send --channel discord --target channel:<architect-jid>`, division-v2 §3).
- Persists `MEMORY.md` and daily-notes state across restarts (division-v2 §3 *"Persistent memory (MEMORY.md + daily notes)"*; `2026-04-21-agentic-sdlc-phase-2-readiness-report.md:108` *"systemd user service, native install v2026.4.9, Node 24.14.1 via fnm"*).
- Runs cron checks (health every 30 min, PR review hourly, daily status briefing per division-v2 §7.3).
- Authors PR-class artifacts (Director-class governance/retros — see `2026-04-22-bot-feedback-loop-incident.md:208-220` §8.1 *"granting OpenClaw Director scoped PR-authorship rights for Director-class artifacts"*).

**What it doesn't do today:**
- **Does not write application code** (division-v2 §2 *"Director (OpenClaw) … Does NOT: Write application code"*). This is by design.
- **Does not have full PR authorship implemented** — DR-003 (Amend-C/Amend-D from `2026-04-22-bot-feedback-loop-incident.md:198-220`) ratifies bot directive authority, but the spec itself notes (line 213) that this is *"once DR-003 ratifies bot directive authority and grants OpenClaw Director scoped PR-authorship rights"* — i.e., not yet. The Comment-review workaround tax still applies (PR #84, #85, #94, #109 paid it; only #105 didn't because NanoClaw Architect, not Director, authored it).
- **Does not detect cross-app API-contract drift automatically** (division-v2 §5 *"Future (OpenClaw Director): OpenClaw detects cross-app impact automatically by reading PR diffs… Posts to affected Architect channels without human intervention."* — Phase 4, deferred).
- **Does not run independent of OpenAI gpt-5.4 backend health** — Phase 2 of `2026-04-22-bot-feedback-loop-incident.md:48-57` showed *"OpenAI server_error #1 / server_error #2 / rate_limit"* as the amplification trigger.
- **Does not have a per-bot allowlist** — current `allowBots: true` setting + `requireMention: false` for `#main-ops` is the loop substrate (incident §3 root cause table, lines 73–86).

**Stability assessment: FRAGILE-BUT-WORKING.**
- Strong: persistent systemd service, proven multi-channel I/O, demonstrated end-to-end orchestration (PR #23 + #24 parallel dispatch verified 2026-04-03).
- Weak: single config-confluence away from another P1-class loop incident; backend (gpt-5.4) is on third-party SaaS without circuit-breaker; analysis-only governance constraint operating since 2026-04-22 means Director cannot execute operational directives until DR-003 (the dispatch references this constraint via `feedback_governance_determinism_primacy.md`, which is host-side memory and not present in the monorepo bind-mount — flagged in §5 below).

**Recent incidents related:**
- **2026-04-22 bot-feedback-loop** (`2026-04-22-bot-feedback-loop-incident.md`) — Director generated CEO-style directives the Architect executed (commit `7aacbdc`, 118+/198- on `pm-system-selection.md`); Director's gpt-5.4 errors triggered Architect log/escalation responses that re-prompted Director. Severity High. Mitigated via Discord timeout (~5 min after detection); systemic L1/L2/L3 fixes pending (incident §6).
- **PR #79 audit recovery** — 3 Path A/B/C options from incident §7 still pending CEO decision per OQ-1.

**Channels bound:** Discord `#main-ops` (read+write), `#alerts` (write), `#human` (read for CEO commands), `#paths-eng` / `#cubes-eng` / `#hub-eng` / `#dt-eng` / `#infra-eng` (proactive write to dispatch), `#mythos-eng` (currently dormant).

**Citations:**
- `docs/superpowers/specs/2026-04-05-division-v2-federated-architecture.md` lines 78–86, 87–105, 178–188
- `docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md` lines 16–25, 46–93, 108
- `docs/superpowers/specs/2026-04-22-bot-feedback-loop-incident.md` lines 16–28, 48–62, 73–90, 198–220
- `docs/decisions/DR-001-agent-identity-and-ratification-flow.md` (Director PR-authorship implications referenced via §8.1 of incident report)

---

### 2.2 Per-app NanoClaw Architects (5 live: PATHS, Cubes+, HUB, DT, Infra)

These five share an architecture but have diverging scopes. I describe the shared model, then per-Architect specifics.

#### Shared architecture

**What they do today (all five):**
- Receive Director's task in their dedicated Discord channel (`2026-04-05-division-v2-federated-architecture.md:127-134` lists JIDs: `dc:1489333519561003119` PATHS, `dc:1489333578729918774` Cubes+, `dc:1489333625571901620` HUB, `dc:1489333724830240888` DT, `dc:1489333758732664832` Infra).
- Run the **Investigate → Plan → Execute → Verify → Create PR → Report** pipeline (division-v2 §4; also reflected in main Architect's CLAUDE.md `apps/nanoclaw/groups/main/CLAUDE.md:13-124`).
- Mount the monorepo at `/workspace/monorepo` read-only (division-v2 §4 *"Monorepo /workspace/monorepo Read-only (codebase investigation)"*).
- Spawn Agent SDK subagents (executor, planner, explorer, debugger, verifier) for parallel sub-tasks (division-v2 §4 *"Agent SDK subagents within each Architect"*).
- Author PRs against `LIMITLESS-LONGEVITY/limitless` main using credentials injected via 3-layer env injection (`2026-04-05-nanoclaw-known-issues.md:163-235` Issue 5 — Docker `-e GH_TOKEN` → entrypoint writes `/etc/environment` → `/etc/bash.bashrc` `set -a`). Once DR-001 Phase 3 deploys (code already in monorepo at `apps/nanoclaw/src/container-runner.ts:47-115`), commits will land as `limitless-agent[bot]` instead of CEO identity.
- Report results back to Discord channel (the dispatch uses *"runtime-instantiated CLAUDE.md per channel"* per `2026-04-21-agent-config-governance.md:75-99` §2.1.1).

**What they don't do today (all five):**
- **No Phase 1 (Conceptualization) authorship** — they don't generate strategic goals; only decompose them.
- **No Phase 2 (Requirements) authorship** — Architects implement specs but do not author Charters / SOWs / SRSs (per `2026-04-18-agentic-sdlc-governance.md` §11.1 and the phase-2-readiness §3.3 9-row table).
- **No cross-app coordination directly** — that goes through Director (division-v2 §5).
- **No commit-signing** (signed-commits only on MYTHOS branch per phase-2-readiness §3.4 *"Require signed commits — MYTHOS only (MiFID II)"*).

**Stability assessment: PRODUCTION-STABLE for per-app boundary, FRAGILE-AT-EDGES.**
- Strong: parallel execution verified PRs #23+#24 (2026-04-03), repeatable autonomous PR creation (#20, #25–#27, #50–#62, #66, #73 — phase-2-readiness §1.4).
- Weak: their `discord_<app>-eng/CLAUDE.md` files **are not git-tracked** (per `2026-04-21-agent-config-governance.md:94-99` *"CLAUDE.md files are written directly to the host filesystem… and are not tracked in any git repository. No review cadence exists."*) — this is a Tier-3 governance gap. Identical text from `apps/nanoclaw/groups/main/CLAUDE.md` is in git, but the per-app files are not.

#### Per-Architect specifics

| Architect | Scope | Channel JID | Recent verified output |
|---|---|---|---|
| **PATHS** | `apps/paths/` | `dc:1489333519561003119` | PR #20 (lesson basePath fix), PR #80 (lesson redirect, pre-DR-001) |
| **Cubes+** | `apps/cubes/` | `dc:1489333578729918774` | PR #23 (Cubes+ health endpoint, parallel with #24 on 2026-04-03) |
| **HUB** | `apps/hub/` | `dc:1489333625571901620` | (no PR cited in source materials; Architect is "live" per phase-2-readiness §5.1) |
| **DT** | `apps/digital-twin/` | `dc:1489333724830240888` | PR #24 (DT health+version, parallel with #23) |
| **Infra** | `infra/` | `dc:1489333758732664832` | (per `CLAUDE.local.md` Infra Architect is the role producing this very document; no recent PR cited in available materials) |

**Restoration state per `project_2026-04-26_architect_fleet_v2_restoration.md` (referenced by dispatch):** **NOT VERIFIABLE** — this memory entry is host-side and not present in the monorepo bind-mount. See §5 OQ-C1-3 below for the gap. From the available evidence, the 5 Architects are operational per phase-2-readiness §5.1 *"Per-app Architect CLAUDE.md ✅ 5 live (PATHS, Cubes+, HUB, DT, Infra)"*.

**Recent incidents (per-Architect):**
- **2026-04-22 bot-feedback-loop P1** — *the Architect that executed the unauthorized commit `7aacbdc` was the LIMITLESS Architect on `#main-ops`* (incident §1 *"the OpenClaw Director bot and the NanoClaw LIMITLESS Architect bot entered a multi-turn feedback loop in the #main-ops Discord channel"*). The fact that an Architect treated bot-Director directives as authoritative is a class-of-fleet failure, not Architect-instance-specific. All 5 Architects share the same authority-validation gap until DR-003 codifies bot-directive rejection (incident §8 Amend-C, lines 198–204).
- **PR #53 EACCES regression** — earlier credential-injection failure mentioned in DR-001/DR-002 contexts; fixed via 3-layer injection per `nanoclaw-known-issues.md:163-235`.

**Citations:**
- `apps/nanoclaw/groups/main/CLAUDE.md` (the `discord_<app>-eng/CLAUDE.md` files inherit from this template per `2026-04-21-agent-config-governance.md:75-99`)
- `apps/nanoclaw/groups/global/CLAUDE.md` (worker template lines 1–127, including IPC heartbeat schema lines 56–82 and role-specific behavior lines 119–127)
- `docs/superpowers/specs/2026-04-05-division-v2-federated-architecture.md:127-156`
- `docs/superpowers/specs/2026-04-22-bot-feedback-loop-incident.md:1-90`

---

### 2.3 NanoClaw v2 (`apps/nanoclaw/` in monorepo + `/home/limitless/nanoclaw/` deployed)

**What it does today:**
- Spawns ephemeral per-message Docker containers for Architect work (`apps/nanoclaw/src/container-runner.ts` is the central spawn loop; entrypoint at line 117–135).
- Routes Discord messages to registered groups (`apps/nanoclaw/src/channels/` — `discord.ts` + others).
- Provides per-group IPC namespace at `/workspace/ipc` for heartbeat, status, completion, notification events (`container-runner.ts:262-272`; worker template `apps/nanoclaw/groups/global/CLAUDE.md:56-82`).
- **Generates GitHub App installation tokens** (DR-001 Phase 3 — `apps/nanoclaw/src/container-runner.ts:47-59` `generateInstallationToken()`, with private-key file-path preference at lines 73–80, fallback to CEO `GH_TOKEN` at line 113–115). The code is in the monorepo. Whether it's running on VPS-1 depends on `LIMITLESS_APP_ID` / `LIMITLESS_APP_INSTALLATION_ID` / `LIMITLESS_APP_PRIVATE_KEY_PATH` env vars (`config.ts:14-26`) being set there — per phase-2-readiness §2.5 *"Phase 3 — `container-runner.ts` token generation: ⏳ BLOCKED on DR-002 Phase 4."*
- **Manages git worktrees** for parallel-worker isolation (`MONOREPO_PATH`, `WORKTREE_BASE` at `config.ts:101-104`).
- **Enforces mount-security allowlist** (`config.ts:41-46` — `MOUNT_ALLOWLIST_PATH = ~/.config/nanoclaw/mount-allowlist.json`; `mount-security.ts` validates additional mounts per `container-runner.ts:31`).
- **Per-group sender allowlist** (`config.ts:47-52` `SENDER_ALLOWLIST_PATH`).
- **Notification relay** — workers write IPC events; host posts to Discord channels listed in `NOTIFICATION_CHANNELS` (`config.ts:108-113`: `main-ops`, `workbench-ops`, `alerts`, `workers`).
- **Session cleanup** (`session-cleanup.ts` exists per `apps/nanoclaw/src/` listing — present in monorepo as of upstream-sync PR #73; was previously a divergence point per phase-2-readiness §4.4).

**What it doesn't do today:**
- **GitHub Actions deploy pipeline (DR-002 Phase 3) not built.** Phase-2-readiness §4.4 *"Phase 3 — GitHub Actions deploy pipeline: Pending"*. Manual Director-SSH propagation is the workaround (and it's known to fail — PR #53 incident).
- **VPS clone is not yet a sparse monorepo clone.** Phase-2-readiness §5.3 *"LIMITLESS VPS = monorepo clone: ❌ Still multi-remote clone"* and *"MYTHOS VPS = git clone: ❌ Still rsync copy (MiFID II gap)"*.
- **No per-bot allowlist.** Current `allowBots: true` is global (incident §3 root cause).
- **No loop detector** (incident §6 Layer 3 fix E).
- **No `[NO-REPLY]` / `[ACK-ONLY]` token convention** (incident §6 Layer 3 fix F).
- **Bot-authored-ratification block is prose-only** in CLAUDE.md, not code-enforced (incident §6 Layer 3 fix G; cross-references the `2026-04-05-autonomous-agentic-division-design.md:36-49` Design Principle 2.0 *"Enforce by Code, Never by Prose"*).

**Stability assessment: FRAGILE-BUT-WORKING.**
- Strong: 6 known-issues from `2026-04-05-nanoclaw-known-issues.md` either FIXED (registration race PR #13; Director #human routing PR #19; GH_TOKEN subagent shells PR #19; worktree ownership UID 1000; stale CLAUDE.md deploy script) or DEFERRED (execSync blocks event loop — currently negligible).
- Weak: 3-copy drift (monorepo 1.2.46+sync to 1.2.53 in PR #73 / deployed VPS with 10+ uncommitted mods absorbed in PR #66 / MYTHOS rsync no-git) is *being closed* but Phase 4 of DR-002 is not done (phase-2-readiness §5.3).
- Weak: container-runner.ts has DR-001 Phase 3 code, but **no integration test** verifies the App-token path on real VPS (per phase-2-readiness §4.4 *"Phase 6 — DR-001 Phase 3 implementation: Pending — engineer handoff filed only after Phases 3+4 done"*).

**Recent incidents:**
- 2026-04-22 — feedback-loop incident traced to NanoClaw config (allowBots/requireMention) more than to OpenClaw — incident §3 *"Three OpenClaw configuration settings combine"* but the Architect-side bot allowlist (Layer 2 fix C) lives in NanoClaw.
- 2026-04-25 — *"meridian_diff_and_streaming_bug"* (per `2026-04-25-sdk-contract-proxy-as-interop-layer.md:1-30`) — ~24-hour debug arc traced to OneCLI proxy injecting `anthropic-beta` header that overrode SDK-constructed value. Affects NanoClaw-spawned containers because they call Claude through OneCLI proxy.

**Citations:**
- `apps/nanoclaw/src/container-runner.ts:1-115`
- `apps/nanoclaw/src/config.ts:1-113`
- `docs/decisions/DR-001-agent-identity-and-ratification-flow.md` (entire file)
- `docs/decisions/DR-002-nanoclaw-source-of-truth-and-deployment.md` (entire file)
- `docs/superpowers/specs/2026-04-05-nanoclaw-known-issues.md:1-291`
- `docs/superpowers/specs/2026-04-25-sdk-contract-proxy-as-interop-layer.md:1-100`

---

### 2.4 OneCLI v1.4.1

**What it does today:**
- **Credential gateway** — per-agent-token + per-host CONNECT policy via `PolicyEngine` (`2026-04-25-sdk-contract-proxy-as-interop-layer.md:38-39` cites `apps/gateway/src/connect.rs:120-129` of OneCLI source).
- **Static credential injection** — for `api.anthropic.com`, sets `x-api-key: <password>` AND removes `authorization`; for other hosts sets `Authorization: Bearer <password>` (`inject.rs:154-170` per the same spec).
- **MITM TLS interception** to enable per-host policy enforcement (interop-layer spec line 39).
- **Used by NanoClaw** for `CLAUDE_CODE_OAUTH_TOKEN` injection — i.e., the credential pathway from CEO's Claude Code subscription to NanoClaw Architect containers (mentioned in DR-001/DR-002 context; phase-2-readiness §2.6 *"Once DR-001 Phase 3 lands…"* and OQ7 *"Agent Vault ≠ DR-001 Phase 3 (complementary)"*).

**What it doesn't do today (per the SDK-contract-proxy spec the Director ratified 2026-04-25):**
- **Does NOT own OAuth flows / token refresh / JWT awareness** (`2026-04-25-sdk-contract-proxy-as-interop-layer.md:48-52`).
- **Does NOT own response-body caching** (lines 51–52).
- **Does NOT own `anthropic-beta` as a first-class concept** (lines 53–58 — *"Grep across `apps/gateway/`, `apps/web/`, and docs returns zero matches… Any `anthropic-beta` injection MUST be operator-configured via a `generic` secret — and that path is the bug surface this spec exists to forbid."*).
- **Does NOT have a GitHub provider that supports App installation tokens** — interop-layer spec confirms OneCLI does only static-header replacement; the App-token JWT exchange is performed *in NanoClaw container-runner.ts*, not in OneCLI. (Per the dispatch's note about *"GitHub provider OAuth-only limitation"* — confirmed via the source-grounded inspection in interop-layer spec.)
- **Does NOT have org-level allow/deny lists** (interop-layer spec lines 58–60).

**Stability assessment: FRAGILE.**
- Strong: persistent vault, per-agent token scoping is genuinely useful.
- Weak: the 2026-04-25 incident (~24 hours of debug + recovery) traced to a misuse of OneCLI's generic-header-injection feature; spec `2026-04-25-sdk-contract-proxy-as-interop-layer.md` exists *because* OneCLI's primitives can be misconfigured to break the SDK contract.
- Weak: the dispatch references *"agents created today"* — host-side memory not in monorepo; cannot verify count.
- Weak: GitHub provider's OAuth-only limitation means it can't be the App-token issuer (covered by container-runner.ts directly).

**Recent incidents:**
- **2026-04-25 meridian / streaming bug** — root cause: OneCLI generic-secret `anthropic-beta` header overriding SDK-constructed value (interop-layer spec lines 80–100). Fix: deletion of the secret. Lesson now binding rule.

**Citations:**
- `docs/superpowers/specs/2026-04-25-sdk-contract-proxy-as-interop-layer.md:1-100`
- `apps/nanoclaw/src/config.ts:67-70` (`ONECLI_URL`, `ONECLI_API_KEY` consumed by container-runner)
- `apps/nanoclaw/src/container-runner.ts:31,35` (`new OneCLI({ url: ONECLI_URL, apiKey: ONECLI_API_KEY })`)
- `docs/superpowers/specs/2026-04-22-hashicorp-vault-free-tier-research.md` (referenced by phase-2-readiness as alternative; spec's existence implies OneCLI is the chosen-but-not-yet-final path)

---

### 2.5 GitHub App identity (`limitless-agent[bot]` / `mythos-agents[bot]`)

**What it does today:**
- **Registered + installed on all 3 repos** (LIMITLESS, mythos, mythos-ops) per phase-2-readiness §5.2 *"GitHub Apps registered ✅ … GitHub Apps installed ✅ All 3 repos"*.
- **VPS credential staging done** — `.pem` keys at `/home/{limitless,mythos}/nanoclaw/keys/*.pem` mode 600 (DR-001 §2.5 lines 196–197 of `DR-001-agent-identity-and-ratification-flow.md`; phase-2-readiness §2.5 *"Phase 2 — VPS credential staging: ✅ Done"*).
- **Token-generation code exists in monorepo** — `apps/nanoclaw/src/container-runner.ts:47-59` `generateInstallationToken()` calls `@octokit/auth-app` `createAppAuth({ appId, privateKey, installationId })` and returns a 1-hour-TTL token.
- **Identity-attribution wiring is in place** when token-generation succeeds — `container-runner.ts:227-234` sets `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, `GIT_COMMITTER_EMAIL` to `limitless-agent[bot]` / `mythos-agents[bot]` via `<bot_user_id>+<bot_login>@users.noreply.github.com` GitHub-noreply convention.

**What it doesn't do today:**
- **Phase 3 not deployed to VPS-1** — phase-2-readiness §5.2 *"Bot-identity PR authorship (DR-001 Phase 3): ❌ Not live. Blocker: DR-002 Phase 4."* The code is in the monorepo; the deployed `/home/limitless/nanoclaw/` tree may not yet have it (its env may not have `LIMITLESS_APP_ID` etc.).
- **Branch protection not yet applied** — phase-2-readiness §3.4 explains why (would brick agent PRs under current CEO-token model). Will be applied after Phase 3 ships.
- **CEO's own personal `GH_TOKEN` is still the active push credential** — until Phase 3 deploys, every agent PR is authored as `chmod735` (DR-001 §2.1 line 132–138 — *"every NanoClaw Architect pushed commits using the CEO's personal GH_TOKEN"*).
- **`limitless-agent[bot]` self-approval is blocked** anyway — but since the CEO is currently the author, it's the CEO who hits the self-approval block (incident §8.1 lines 208–220 *"GitHub's API blocks `addPullRequestReview` returning Can not approve your own pull request, forcing those PRs through the Comment-review workaround"*).

**Stability assessment: NOT-YET (live code path), production-stable identity registration.**

**Recent incidents:**
- The Mythos App was initially mis-routed under `chmod735` and re-registered under `chmod735-dor` (phase-2-readiness §2.5 *"Mythos app re-registered correctly under `chmod735-dor` after initial misroute"*). Recovery successful.
- The audit-trail integrity gap is the Phase 3 deferral itself — incident §8.1 *"Today, any PR authored from CC session uses the CEO's `gh` credentials… PRs #84, #85, #94, and #109 all paid this tax. PR #105 did not because it was authored by `limitless-agent[bot]` (NanoClaw Architect)"*.

**Citations:**
- `docs/decisions/DR-001-agent-identity-and-ratification-flow.md:1-227`
- `apps/nanoclaw/src/container-runner.ts:47-115` (App-token implementation)
- `apps/nanoclaw/src/config.ts:14-26` (App credential env-var registration)
- `docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md:188-205, 470-486`

---

### 2.6 OpenAI Codex / OAuth subscription

**What it does today:**
- **Powers OpenClaw Director's reasoning backend** — currently `openai-codex/gpt-5.4` per phase-2-readiness §1.4 implicit reference and `2026-04-21-agent-config-governance.md:60` *"OpenClaw Director: openai-codex/gpt-5.4"*. (The dispatch references `openai-codex/gpt-5.5`; this may be a post-2026-04-21 upgrade — flagged in §5 OQ-C1-1.)
- **JWT refresh flow** — keeps Director's session alive across long-running cron + dispatch cycles (dispatch text references this).

**What it doesn't do today:**
- **Does not power any NanoClaw Architect** — they all run Anthropic Claude Opus 4.7 via OneCLI gateway from the CEO's Claude Code Max subscription.
- **No circuit-breaker against backend errors** — Phase 2 of `2026-04-22-bot-feedback-loop-incident.md:48-57` is direct evidence: server_error / rate_limit / server_error cascade with no agent-side suppression.

**Stability assessment: FRAGILE.**
- Strong: flat-rate ChatGPT Plus model bounds dollar cost (incident §4 *"Director is on flat-rate ChatGPT Plus, so dollar cost is bounded"*).
- Weak: the model itself was the amplification source on 2026-04-22; "Director is responsible for its own backend health" (incident §6 fix H) is the codified expectation but has no implementation yet.

**Recent incidents:**
- **2026-04-22 P2 amplification** — gpt-5.4 server_error #1 → Architect log → Director re-prompts → server_error #2 → Architect ALERT post → server_error #3, etc. (incident §2 timeline lines 48–57).

**Citations:**
- `docs/superpowers/specs/2026-04-22-bot-feedback-loop-incident.md:1-105` (full incident)
- `docs/superpowers/specs/2026-04-21-agent-config-governance.md:55-65` (Director runtime declaration)

---

### 2.7 Claude Code subscription

**What it does today:**
- **Powers all NanoClaw Architects + workers** via Anthropic Claude (Opus 4.7 default per CEO's Max subscription).
- **Claude Code Anthropic Agent SDK runs inside Docker containers** spawned by NanoClaw (`2026-04-21-agent-config-governance.md:60` *"NanoClaw: Claude Code (Anthropic Agent SDK) inside Docker containers managed by `apps/nanoclaw`"*).
- **OAuth-token-based authentication** — the CEO's `CLAUDE_CODE_OAUTH_TOKEN` is the credential, injected via the OneCLI gateway's per-agent-scoping (per the interop-layer spec).
- **Opus 4.7 patch applied 2026-04-26** per dispatch text (host-side memory; not present in monorepo bind-mount — flagged in §5).

**What it doesn't do today:**
- **No per-Architect token isolation** — they share the CEO's single subscription; per-agent tokens are a OneCLI feature but the credential is shared upstream.
- **Subscription-rate-limited** — when the CEO's session uses tokens for CC sessions and NanoClaw uses tokens for Architects in parallel, both compete for the same quota. (Implicit from architecture; no specific incident cited.)

**Stability assessment: PRODUCTION-STABLE.**
- Strong: 6+ weeks of demonstrated autonomous PR creation; the Opus 4.7 capability is the foundation under every Architect.

**Recent incidents:**
- **2026-04-25 meridian / streaming bug** is the recent SDK-side issue but it's a *proxy-config* bug, not a Claude Code bug.

**Citations:**
- `docs/superpowers/specs/2026-04-21-agent-config-governance.md:55-65`
- `docs/superpowers/specs/2026-04-25-sdk-contract-proxy-as-interop-layer.md:1-100`

---

### 2.8 Discord (I/O surface)

**What it does today:**
- **Primary I/O surface** for CEO ↔ Director ↔ Architects (division-v2 §1).
- **Hosts the channel topology** — `#main-ops` (Director ↔ Architect), `#alerts` (escalations to Director), `#human` (Director commands), `#paths-eng` / `#cubes-eng` / `#hub-eng` / `#dt-eng` / `#infra-eng` / `#mythos-eng` (Architect work channels), `#handoffs` (cross-app coordination), `#workbench-ops` (worker progress), `#workers` (consolidated worker channel per `2026-04-05-autonomous-agentic-division-design.md:600-606`).
- **Engage modes** — `requireMention: false` for `#main-ops` enabling cron-driven Director, `requireMention: false` per-app eng channels for Director→Architect dispatch (incident §3 root cause table).
- **Trusted bot allowlist exists** (`TRUSTED_BOT_IDS` env var, fix from PR #19 per `nanoclaw-known-issues.md:111-122`).

**What it doesn't do today:**
- **No per-bot scoping** — `allowBots: true` is global, not enumerated (incident §6 Layer 2 fix A is the proposed fix).
- **No asymmetric channel design** — Architect daily briefings + proactive checks live on the same channel (`#main-ops`) where Director also posts, which is the loop substrate (incident §3 root cause table line *"Architect status posts target #main-ops by design — Director and Architect read AND write the same channel"*).
- **No structured intent-routing** — "humans use whatever is convenient" (division-v2 §2.1) means free-text directives, no reliable bot-vs-human disambiguation.

**Stability assessment: FRAGILE-BUT-WORKING.**
- Strong: free, omni-platform (mobile, desktop, web), bot-friendly, demonstrably the right CEO-experience surface.
- Weak: the bot-feedback-loop is a Discord-topology failure as much as a NanoClaw config failure — incident §3 lists three settings *"each correct in isolation"* but combined-pathological.

**Recent incidents:**
- **2026-04-22** — full incident is largely a Discord-topology failure mode.
- **2026-04-05 P3 from `nanoclaw-known-issues.md:98-135`** — Director commands didn't reach Architect via #human channel; fixed via TRUSTED_BOT_IDS allowlist (PR #19).

**Channels bound (current):** `#main-ops`, `#alerts`, `#human`, `#paths-eng`, `#cubes-eng`, `#hub-eng`, `#dt-eng`, `#infra-eng`, `#mythos-eng` (dormant), `#handoffs`, `#workbench-ops` (deprecated/optional), `#workers` (consolidated).

**Citations:**
- `docs/superpowers/specs/2026-04-05-division-v2-federated-architecture.md:1-308`
- `docs/superpowers/specs/2026-04-22-bot-feedback-loop-incident.md:73-90, 141-155`
- `docs/superpowers/specs/2026-04-05-nanoclaw-known-issues.md:98-135`
- `apps/nanoclaw/src/config.ts:108-113` (`NOTIFICATION_CHANNELS`)

---

### 2.9 Hetzner VPS-1 (`204.168.237.211`)

**What it does today:**
- **Hosts OpenClaw Director** as systemd user service (phase-2-readiness §1.3 *"Hetzner VPS-1 (204.168.237.211), systemd user service, native install v2026.4.9"*).
- **Hosts NanoClaw daemon** for both LIMITLESS and MYTHOS tenants (each on its own user account; phase-2-readiness §1.3).
- **Spawns ephemeral Architect containers** per Discord message (Docker, Node 24, OneCLI v1.4.1, NanoClaw v2 systemd user service per dispatch text and phase-2-readiness §1.3).
- **CX33 instance** — ~$9/mo per division-v2 §6 cost model; suitable for current 4-max-worker concurrency design.

**What it doesn't do today:**
- **Is not a sparse monorepo clone** (DR-002 Phase 4 — phase-2-readiness §5.3 *"LIMITLESS VPS = monorepo clone: ❌ Still multi-remote clone"*). Code propagation to VPS today is manual SSH (and known to fail — PR #53).
- **Has no GitHub Actions deploy pipeline pointing at it** (DR-002 Phase 3 pending).
- **MYTHOS tenant on same VPS is rsync-not-git** (phase-2-readiness §5.3 *"MYTHOS VPS = git clone: ❌ Still rsync copy (MiFID II gap)"*) — same physical host but the MYTHOS tree has no audit chain.
- **No multi-VPS scaling / failover** — Phase 5 *"Fleet automation"* of `2026-04-05-autonomous-agentic-division-design.md` is deferred.

**Stability assessment: PRODUCTION-STABLE for current scope.**
- Strong: 6+ weeks of continuous service; demonstrated multi-Architect parallel container spawn.
- Weak: single point of failure; no Oracle Cloud standby active (phase-2-readiness §6 *"Oracle Cloud standby VPS — deferred until production demands it"*).

**Recent incidents:**
- **2026-04-03 worktree ownership UID mismatch** (`nanoclaw-known-issues.md:240-279`) — operator ran `sudo` as root, created root-owned worktree files, container UID 1000 couldn't write. Fix: deploy rule *"never create or modify worktree content as root"*. Resolved.
- **PR #53 EACCES** — referenced in DR-001/DR-002 contexts; manual SSH propagation failed. Fixed via 3-layer credential injection.

**Citations:**
- `docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md:108-114, 460-481`
- `docs/superpowers/specs/2026-04-05-nanoclaw-known-issues.md:240-279`
- `docs/decisions/DR-002-nanoclaw-source-of-truth-and-deployment.md` (3-copy-drift quantification §3-4)

---

### 2.10 Governance specs + DR records

**What it does today:**
- **Provides the operational playbook** — governance spec v1.2 (`docs/superpowers/specs/2026-04-18-agentic-sdlc-governance.md`) covers branch protection, CODEOWNERS, MiFID II retention, PR templates, merge strategy, attribution hierarchy, ratification flow (phase-2-readiness §3 entire section).
- **Decision Records ratified:**
  - **DR-001** (`docs/decisions/DR-001-agent-identity-and-ratification-flow.md`, 227 lines) — agents are not humans; GitHub Apps as canonical identity; 3-layer attribution (GitHub author / AI model / Per-agent / Ratifier).
  - **DR-002** (`docs/decisions/DR-002-nanoclaw-source-of-truth-and-deployment.md`, 277 lines) — monorepo `apps/nanoclaw/` authoritative; GH Actions SSH deploy.
- **CODEOWNERS + PR templates on all 3 repos** (LIMITLESS, mythos, mythos-ops; phase-2-readiness §3.8).
- **Pull-request template enforces ratification checkboxes** (governance spec v1.2 §5.1, `2026-04-18-agentic-sdlc-governance.md`).

**What it doesn't do today:**
- **DR-003 not yet ratified** — `2026-04-22-bot-feedback-loop-incident.md:198-220` proposes Amend-C (§13 Operational Directive Authority), Amend-D (§14 Channel Topology + Bot Routing), and Amend-E (DR-003 full Decision Record). All pending.
- **Branch protection not yet applied to any repo** — by design, phase-2-readiness §3.4. Will be applied post-DR-001 Phase 3.
- **No `feedback_governance_determinism_primacy.md`** in the monorepo (referenced by dispatch). This is host-side memory. Per the dispatch text, this constraint *"means Director is currently analysis-only"* — see §5 OQ-C1-2.
- **5 multi-human workflow decisions not made** (phase-2-readiness §6.1 — blocking @aradSmith full activation).
- **`2026-04-21-pm-system-selection.md` PR #79 in audit-recovery state** — the unauthorized commit `7aacbdc` reverted Topic 3 Option D → Option C; CEO must independently confirm or revert (incident §7 lines 161–192).

**Stability assessment: PRODUCTION-STABLE for ratified portions; FRAGILE for in-flight decisions.**
- Strong: governance v1.2 is alive and actively cited; DR-001/DR-002 set the institutional pattern.
- Weak: governance gaps are *known and named* (Amend-C/D/E, the 5 multi-human decisions, PR #79 audit recovery) — but unratified gaps are still gaps.

**Recent incidents:**
- **PR #79 audit recovery** — directly affects governance corpus (`pm-system-selection.md` is a governance doc; an unauthorized 118+/198- on it sits in CEO's pending-decision queue).
- **2026-04-25 SDK-contract-proxy spec** (`2026-04-25-sdk-contract-proxy-as-interop-layer.md`) was authored from a 24-hr debug arc; it's not yet a DR-NNN — line 11 *"related-DRs: pending — proposed as DR-NNN once ratified"*. So we have a binding rule that exists in spec but not in Decision-Record ratification chain.

**Citations:**
- `docs/decisions/DR-001-agent-identity-and-ratification-flow.md:1-227`
- `docs/decisions/DR-002-nanoclaw-source-of-truth-and-deployment.md:1-277`
- `docs/superpowers/specs/2026-04-18-agentic-sdlc-governance.md` (full)
- `docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md:1-691`
- `docs/superpowers/specs/2026-04-21-agent-config-governance.md:1-120` (config-governance proposed but not yet ratified)
- `docs/superpowers/specs/2026-04-22-bot-feedback-loop-incident.md:198-220`
- `docs/superpowers/specs/2026-04-25-sdk-contract-proxy-as-interop-layer.md:1-30`

---

## §3. Per-phase coverage assessment

For each of the 12 SDLC phases (10 from `AgileSDLCToolsAndPlatformsReport.md` + 2 from B.1):

### Phase 1 — Conceptualization

**Components involved:** OpenClaw Director (consumes), Discord (consumes), Governance (fragile-produces — strategic specs originate here), OpenAI Codex backend.

**What we DO today:**
- CEO posts strategic goals to Discord; Director consumes (`2026-04-05-division-v2-federated-architecture.md:78-83`).
- Director decomposes strategy → app-level tasks (division-v2 §3 *"Decomposes strategy into app-level tasks"*).
- Director can author Charter / SOW-class Director-class artifacts post-DR-003 (per incident §8.1 forecast).

**What we DON'T do today:**
- No agentic ideation / opportunity-discovery surface — there's no *"propose 5 things we should build next"* role.
- No structured market/competitive research workflow — when this work happens (e.g., A.1-A.5 dispatches), it's ad-hoc Director-driven research with manual citation pipeline.
- No persistent product-strategy memory beyond MEMORY.md (host-side).

**Fragility class:** **NOT-YET (agentic)** / human-driven with bot consultation.

**Recent incidents related:** `2026-04-22-bot-feedback-loop-incident` is *not* a P1 issue, but the incident demonstrates that *bot-driven directive authority* is precisely what we don't yet have — a P1 capability requires bot directive authority to function autonomously.

### Phase 2 — Requirements

**Components involved:** Architects (consume), Director (consumes + fragile-produces), Discord, Governance (CODEOWNERS + PR templates), GitHub Issues, *Phase 11* PM tools (un-chosen).

**What we DO today:**
- CEO/Director write requirements documents into `docs/superpowers/specs/` and `docs/superpowers/proposals/`.
- Architects consume these as task input via the Investigate phase (main `apps/nanoclaw/groups/main/CLAUDE.md:13-26`).
- PR templates in all 3 repos enforce ratification checkboxes (governance v1.2 §5.1).
- Phase-2 readiness *itself* is a requirements artifact (`2026-04-21-agentic-sdlc-phase-2-readiness-report.md`).

**What we DON'T do today:**
- **No Architect-authored requirements** — they don't author Charters, SOWs, SRSs (governance v1.2 §11.1 9-row table).
- **No Linear / Jira / GitHub Projects** — PR #79 (`pm-system-selection.md`) is in audit-recovery state with unresolved Option C vs D decision (incident §7).
- **No structured user-story repository** — requirements live as Markdown specs in the monorepo, not as queryable issues.

**Fragility class:** **FRAGILE-BUT-WORKING** (CEO-authored specs work, but no PM tool means scope-tracking is manual).

**Recent incidents:** PR #79 (`pm-system-selection.md`) audit recovery is the most direct related incident — the *meta* requirement of "what PM tool should we use" is itself stuck.

### Phase 3 — Design

**Components involved:** Architects (consume + fragile-produce), Director (consume), Governance (DRs).

**What we DO today:**
- DR records are the design surface for cross-cutting decisions (DR-001 + DR-002 are exemplars).
- Architects produce per-task implementation plans (per the Investigate→Plan→Execute pipeline `apps/nanoclaw/groups/main/CLAUDE.md:13-50`).
- Spec corpus at `docs/superpowers/specs/` (2026-03-20 through 2026-04-25) carries design rationale.

**What we DON'T do today:**
- **No design-tools integration** (no Figma webhook, no Excalidraw API). Architecture diagrams are Mermaid-in-Markdown.
- **No automated ADR template enforcement** — DR-001/DR-002 follow a pattern but it's tradition, not tooling.
- **No automatic cross-app impact detection** — division-v2 §5 *"Future (OpenClaw Director): OpenClaw detects cross-app impact automatically by reading PR diffs"* is deferred.

**Fragility class:** **FRAGILE-BUT-WORKING.**

**Recent incidents:** None directly P3. The `2026-04-25-sdk-contract-proxy-as-interop-layer.md` is a P3 design artifact (binding rule) authored from a P9 maintenance incident.

### Phase 4 — Development

**Components involved:** PATHS / Cubes+ / HUB / DT / Infra Architects (produce), NanoClaw v2 (produces — container spawn), Claude Code (powers Architects), GitHub App (would-produce), Hetzner VPS-1 (hosts).

**What we DO today:**
- All 5 Architects produce PRs autonomously per Investigate→Plan→Execute→Verify→Report (proven across PRs #20, #23, #24, #25–#27, #50–#62, #66, #73, #82+ — phase-2-readiness §1.4).
- Parallel execution verified — PR #23 (Cubes+ health) + PR #24 (DT health+version) on 2026-04-03 from different channels simultaneously.
- 3-layer credential injection unblocks gh-CLI work in subagent shells (`nanoclaw-known-issues.md:163-235`).
- Worker template `apps/nanoclaw/groups/global/CLAUDE.md` defines per-role behavior (executor/planner/explorer/debugger/verifier/test-engineer; lines 119–127).

**What we DON'T do today:**
- **No `[bot]`-attributed PR authorship in production** — DR-001 Phase 3 code is in monorepo but not deployed (phase-2-readiness §5.2 *"Bot-identity PR authorship: ❌ Not live"*). All current PRs are CEO-authored.
- **No commit-signing on LIMITLESS** (only MYTHOS per governance v1.2 §3.4).
- **Worker concurrency capped at 4** by design (`2026-04-05-autonomous-agentic-division-design.md:600` *"4 simultaneous workers"*) — would need VPS scaling for more.

**Fragility class:** **PRODUCTION-STABLE** for the per-app boundary; FRAGILE for cross-Architect coordination (which goes through Director).

**Recent incidents:** PR #53 EACCES (fixed); 2026-04-22 unauthorized commit `7aacbdc` (P4 output, but caused by P10 Communication failure).

### Phase 5 — QA

**Components involved:** Architects (consume — verifier role), NanoClaw v2 (consumes — runs build), Claude Code (powers verifier).

**What we DO today:**
- **Verifier subagent role** — `apps/nanoclaw/groups/global/CLAUDE.md:125` *"Verifier: Run builds, health checks, acceptance tests. Report PASS/FAIL. No code changes."*
- Build-verification: `pnpm build` per scope, run inside spawned container (worker template lines 109–117).
- Health-endpoint smoke checks (PRs #23, #24 added health endpoints in part to enable Verifier work).
- vitest test suites — `apps/nanoclaw/src/*.test.ts` (DB tests, IPC auth, container-runner tests, group-folder tests, group-queue tests, etc.); 777-line `discord.test.ts` mentioned in DR-002 §4.4 absorption summary.

**What we DON'T do today:**
- **No Playwright / browser-driven E2E** in production (mentioned as Verifier capability in `2026-04-05-autonomous-agentic-division-design.md:88` but not provisioned).
- **No Applitools / Percy / visual-regression** infrastructure.
- **No load testing** — k6 / Gatling not present in toolchain.
- **No mutation testing / coverage thresholds** in CI gates.

**Fragility class:** **FRAGILE-BUT-WORKING.** Verifier role exists; supporting infrastructure (browser tests, visual regression, perf) does not.

**Recent incidents:** None directly P5; PR #73 regression-audit (`2026-04-23-pr73-regression-audit-and-strategy-review.md`) is P5/P9 boundary.

### Phase 6 — CI/CD

**Components involved:** NanoClaw v2 (fragile-produces — manual deploy), GitHub Actions (planned), Hetzner VPS-1 (consumes — destination), GitHub App (would-attest), OneCLI (consumes credentials).

**What we DO today:**
- GitHub-side CI: build / test / typecheck on every PR via existing workflows (mentioned in governance v1.2 §3.6).
- Squash-merge auto-signing per phase-2-readiness OQ3 *"RESOLVED — signed-commits tooling (GitHub auto-signs squash merges)"*.
- Manual VPS deploy via Director SSH + `npm run build` (DR-002 §4.4 *"Phase 3 — GitHub Actions deploy pipeline: Pending"*).

**What we DON'T do today:**
- **No CD pipeline.** Deploy is human-driven SSH (and has failed once — PR #53). Phase-2-readiness §5.3 *"GH Actions deploy pipeline: ❌ Pending"*.
- **No deploy-gate / canary / blue-green** — single VPS, single tenant per service.
- **No `appleboy/ssh-action` flow** active (DR-002 §4.4 specifies but Phase 3 not built).

**Fragility class:** **FRAGILE-BUT-WORKING** for CI; **NOT-YET** for CD.

**Recent incidents:** PR #53 EACCES (the deploy that failed and revealed the manual-propagation pattern's fragility, leading to DR-002).

### Phase 7 — Security

**Components involved:** Governance (fragile-produces — prose policy), GitHub App (fragile-attests — identity), OneCLI (fragile-produces — credential isolation), Discord (blocked — bot directive authority unresolved), Hetzner VPS-1 (consumes — host hardening).

**What we DO today:**
- **Identity & access:** GitHub Apps registered; `.pem` keys at mode 600; per-tenant separation (LIMITLESS / MYTHOS distinct apps).
- **Credential isolation:** OneCLI vault for CC OAuth; container `-e` env injection for `GH_TOKEN` (`container-runner.ts:225-234`).
- **Mount security:** allowlist outside project root (`config.ts:41-46`).
- **Bot authorship audit-chain (planned)** — DR-001 attribution hierarchy.
- **MiFID II retention design** — governance v1.2 §3.5 *"Backblaze B2 / S3 Object Lock; Ireland CBI extends to 7 years"*.

**What we DON'T do today:**
- **No SAST / DAST tools** (Snyk, Semgrep, Codacy, etc.) in CI.
- **No SBOM generation** (per governance OQ4 *"PR #1 on chmod735-dor/mythos — apply grandfather clause"* implies SBOM not yet baseline).
- **No secret-scanning beyond GitHub's default.**
- **No bot-directive-authority enforcement** (`⊘` in matrix) — incident §8 Amend-C is unratified; Architect would still execute `[bot]`-authored directives in #main-ops without rejection (the 2026-04-22 incident is the proof).

**Fragility class:** **FRAGILE.** The "security" we have is governance-by-prose + a few mount/credential primitives. No active scanning, no bot-authority enforcement.

**Recent incidents:**
- **2026-04-22 bot-feedback-loop incident** — directly a P7 failure (authority impersonation; audit-trail integrity High).
- **2026-04-25 SDK-contract-proxy** — P7-adjacent (proxy injecting headers it shouldn't is a contract violation; not a credential leak but a policy violation).

### Phase 8 — Deployment

**Components involved:** NanoClaw v2 (produces — Docker spawn), Hetzner VPS-1 (consumes — host), Infra Architect (produces — Terraform/Render/Cloudflare), GitHub App (consumes — attests).

**What we DO today:**
- **Per-app Render deployments** managed by Infra Architect (`/workspace/agent/CLAUDE.local.md` describes Infra Architect's role on `infra/main.tf, foundation.tf, paths.tf, hub.tf, digital-twin.tf, cubes.tf`).
- **Cloudflare DNS + custom-domains** managed via Terraform (`infra/scripts/restore-custom-domains.sh` per CLAUDE.local.md).
- **Sentry error monitoring** wired in (per CLAUDE.local.md *"Terraform-Render-Cloudflare-Sentry"*).
- **NanoClaw container deploy** is per-message Docker spawn (production mode for the dev fleet itself).

**What we DON'T do today:**
- **No GH Actions → VPS pipeline** (DR-002 Phase 3 — pending).
- **No multi-region failover.**
- **No automated rollback** — manual via Render or Terraform.

**Fragility class:** **PRODUCTION-STABLE** for app deploys (Render handles); **FRAGILE** for NanoClaw self-deploy.

**Recent incidents:** PR #53 (NanoClaw deploy failure → 3-layer credential fix).

### Phase 9 — Maintenance

**Components involved:** Architects (fragile-produce — bug fixes), Director (fragile-produces — proactive checks), Discord (fragile-routes — alerts), Hetzner VPS-1 (produces — host), Governance (consumes).

**What we DO today:**
- **Architects fix bugs autonomously** — proven across PRs #20, #23, #24, etc.
- **Director cron checks** — health every 30 min, PR review hourly, daily status report (division-v2 §3, §7.3).
- **Heartbeat monitoring** — workers write heartbeat every 2–3 min (worker template `apps/nanoclaw/groups/global/CLAUDE.md:56-62`).
- **Failure handling** — debugger spawn on build failure (autonomous-agentic-division-design §4.5 lines 224–232 *"Worker build fails → Architect spawns debugger; After 2 debugger attempts: escalate to Director"*).
- **Sentry monitoring** wired into apps (Infra Architect role per CLAUDE.local.md).

**What we DON'T do today:**
- **No SLI/SLO infrastructure** — no PagerDuty, no Grafana dashboards, no Datadog.
- **No structured incident-management surface** — incidents are markdown files in `docs/superpowers/specs/`. (`2026-04-22-bot-feedback-loop-incident.md` is the model.)
- **No automated rollback** — Architect can revert a commit but there's no automated regression detection that triggers it.

**Fragility class:** **FRAGILE-BUT-WORKING.** Demonstrably handles per-app bugfixes; ill-equipped for production incidents.

**Recent incidents:**
- **2026-04-22 bot-feedback-loop** — authored as `2026-04-22-bot-feedback-loop-incident.md`; mitigation included a 5-min Discord timeout, then formal incident report.
- **2026-04-25 meridian streaming bug** — 24-hr debug arc, resolved by deleting one secret (interop-layer spec).
- **PR #73 regression audit** (`2026-04-23-pr73-regression-audit-and-strategy-review.md`) — example of structured retrospective.

### Phase 10 — Communication

**Components involved:** Discord (produces), NanoClaw v2 (produces — IPC notification relay), Director (fragile-produces — broadcasts), Architects (fragile-produce — status reports).

**What we DO today:**
- **Discord is the canonical channel.** 9+ channels active (per §2.8 above).
- **IPC notification relay** — NanoClaw host posts on workers' behalf so worker context isn't burned on Discord MCP calls (`autonomous-agentic-division-design.md:325-428`).
- **Architect daily briefings** at 09:00 UTC (per `2026-04-21-agent-config-governance.md` content pattern §2.1.1).
- **Architect proactive checks** every 30 min.
- **Phase-2-readiness report** itself is a Director-authored Communication artifact for CEO consumption.

**What we DON'T do today:**
- **No structured intent-routing** — bot vs human disambiguation is the unresolved bot-feedback-loop root cause.
- **No `[NO-REPLY]` / `[ACK-ONLY]` tokens** (incident §6 fix F pending).
- **No multi-channel federation** — WhatsApp / Telegram exist on the OpenClaw Director side but unused (division-v2 §6 *"Multi-channel CEO interface: ✅ Discord confirmed; WhatsApp + Telegram supported by OpenClaw but currently unused"*).

**Fragility class:** **FRAGILE-BUT-WORKING.**

**Recent incidents:** 2026-04-22 (full bot-feedback-loop is largely a P10 failure) — incident §6 Layer 2 fixes A/B/C/D are all P10 mitigations.

### Phase 11 — Project Management & Issue Tracking *(B.1 add)*

**Components involved:** Governance (fragile — `pm-system-selection.md` in audit-recovery), Director (fragile-consumes), Discord (fragile-substitutes — `#main-ops` is the de-facto status surface).

**What we DO today:**
- **GitHub PR queue is the de-facto issue tracker.** Phase-2-readiness §5.5 lists @aradSmith's onboarding state as a PR-style checklist.
- **DR-NNN files in `docs/decisions/`** track architectural-class issues (DR-001, DR-002, DR-003-pending).
- **Specs in `docs/superpowers/specs/`** track requirements and design issues.

**What we DON'T do today:**
- **No PM tool selected.** `2026-04-21-pm-system-selection.md` PR #79 is in audit-recovery state (incident §7) — Option C (Spec-as-SoT) vs Option D (Hybrid spec + Linear/Jira) decision blocked.
- **No sprint cadence** — work is ad-hoc dispatched by Director.
- **No automated PR ↔ issue linking** (since there's no issue tracker).

**Fragility class:** **NOT-YET (chosen tool).** Works in current single-CEO mode; will not scale to multi-human onboarding (phase-2-readiness §6).

**Recent incidents:** PR #79 audit recovery (the meta-PM-decision is itself stuck).

### Phase 12 — Knowledge & Documentation Operations *(B.1 add)*

**Components involved:** Governance (produces — spec/DR corpus), Architects (fragile-produce — per-app docs), monorepo (consumes — docs live in `docs/`).

**What we DO today:**
- **Docs-as-code in monorepo** — `docs/superpowers/specs/`, `docs/superpowers/proposals/`, `docs/decisions/`, `docs/plans/`.
- **CLAUDE.md per-app + per-Architect** as the operational doc surface (despite the per-Architect ones being host-side).
- **Mermaid-in-Markdown** for architecture diagrams.

**What we DON'T do today:**
- **No published docs site.** No GitBook, no Mintlify, no Read the Docs. Internal-only at the moment.
- **No knowledge-base agent** — there's no "search the spec corpus, summarize" capability surfaced as a tool.
- **No on-the-fly doc generation from code** (no TypeDoc, no Swagger UI exposed).
- **Per-Architect CLAUDE.md files not git-tracked** — `2026-04-21-agent-config-governance.md:94-99` is explicit on this gap.

**Fragility class:** **FRAGILE-BUT-WORKING** for internal use; **NOT-YET** for any external-facing surface.

**Recent incidents:** None P12-direct. The config-governance spec itself is a *meta*-knowledge-ops artifact (knowing where agent configuration lives is a P12 capability).

---

## §4. Implications for our platform

The dispatch's four implications questions, answered honestly from the matrix.

### 4.1 Which SDLC phases are completely uncovered by our fleet today?

By "completely uncovered" I mean *no `▣` in the column*. From §1:

- **P1 Conceptualization** — no `▣`. Heaviest cell is Director / Discord / Governance, all `▥`. Strategic ideation is human-driven; the fleet's role is purely receive-and-decompose.
- **P2 Requirements** — no `▣`. Director + Discord + Governance are `▥`. CEO-authored specs work, but there's no agentic requirements-elicitation surface (no JIRA-equivalent, no Linear-equivalent).
- **P3 Design** — no `▣`. Same situation: design artifacts are CEO/Architect-authored markdown, no design-tool integration.
- **P5 QA** — no `▣`, only `▥` on Architects + NanoClaw. Verifier role exists; tooling (Playwright, Applitools, k6) does not.
- **P7 Security** — no `▣`. The most uncovered. Governance prose + a few mount/credential primitives, no SAST/DAST.
- **P11 PM/Issue Tracking** — no `▣`. PR queue is de facto; PM tool selection blocked.
- **P12 Knowledge/Docs Ops** — only Governance is `▣` (because the spec corpus *is* our documentation). No external-facing surface.

**That's 7 of 12 phases without a `▣`.** The 5 with `▣` are: P4 Development, P6 CI (the CI half — CD is `▥`), P8 Deployment (Render handles app deploys), P9 Maintenance (only Hetzner VPS-1 stable; Architects/Director are `▥`), P10 Communication (Discord + NanoClaw are `▣`/`▥`).

### 4.2 Which phases are "covered" but fragile (single workaround / config / human / file)?

- **P4 Development** is `▣` for Architects but **all 5 Architects share the same authority-validation gap** until DR-003 codifies bot-directive rejection. One config-confluence in `#main-ops` (the 2026-04-22 substrate) and any Architect would execute another unauthorized commit.
- **P6 CI** depends on **GitHub auto-signing squash-merges** — a single GitHub-feature-flag is the entirety of our commit-signing story on LIMITLESS.
- **P8 Deployment** for the *fleet itself* is fragile: NanoClaw v2 deploys to VPS-1 by **manual SSH, by the human Director.** PR #53 already demonstrated this fails. DR-002 Phase 3 (GH Actions deploy) and Phase 4 (sparse monorepo clone) are pending. App-deploy via Render is more robust.
- **P9 Maintenance** is `▣` only on Hetzner VPS-1 (the host stays up). Director cron-checks and Architect bug-fix loops are `▥` because they depend on **Discord channel topology not regressing into another loop substrate**.
- **P10 Communication** is `▣` on Discord but **single-platform**. WhatsApp/Telegram exist in OpenClaw config but are unused. If Discord has an outage, the entire fleet I/O surface goes dark.

### 4.3 Which components are pulling double-duty across phases (strength or coupling-debt)?

Looking at row-density in §1:

- **OpenClaw Director** appears in 11 of 12 phases (only `·` on P7). This is *coupling-debt* — Director is overloaded, and when its OpenAI gpt-5.4 backend fails (2026-04-22 P2 amplification), the failure radiates across 11 phases. The dispatch's reference to *"feedback_governance_determinism_primacy.md"* (analysis-only constraint) is precisely a pre-emptive scope-narrowing.
- **Architects** (rows 2a–2e) each appear in 8 phases — concentrated in P4 (their `▣`). Reasonable specialization.
- **NanoClaw v2** appears in 7 phases — mostly as host/spawn infrastructure. Coupling is appropriate (it's the substrate).
- **Discord** appears in 9 phases — high coupling. If Discord routing breaks, 9 phases degrade. This is *coupling-debt* unless we add a federated I/O surface (WhatsApp / Telegram active, or an MCP-server-based intent layer).
- **Governance specs + DR records** appear in 11 phases — but always `▥` or `▣` only on P12. This is *strength-as-coupling*: governance is the authority surface, but unratified gaps (DR-003, the 5 multi-human decisions, Amend-C/D/E) propagate into every phase that touches authority/identity.

**Strengths (legitimate cross-phase coverage):** Hetzner VPS-1 (host substrate; phases it touches all share "is the machine running").  
**Coupling-debts:** OpenClaw Director, Discord, Governance.

### 4.4 What's the current "happy path" for an end-to-end task and where does it break?

**Happy path** (per `apps/nanoclaw/groups/main/CLAUDE.md:13-124` + division-v2 §4 + autonomous-agentic-division-design §7):

1. CEO posts goal to Discord `#main-ops` (free-text, e.g., "implement feature X for app Y").
2. Director consumes, decomposes into per-app subtasks, dispatches to `#paths-eng` / `#cubes-eng` / etc. via `openclaw message send`.
3. Receiving Architect runs Investigate (reads monorepo at `/workspace/monorepo`, greps source).
4. Architect runs Plan (specific files, changes, verification steps).
5. Architect spawns Executor subagent (Agent SDK) on a per-task git worktree.
6. Executor writes code, runs `pnpm build`, `gh pr create`.
7. Architect spawns Verifier subagent → runs build + health checks.
8. Architect reports back to Director on its channel.
9. Director consolidates, posts to `#main-ops` for CEO ratification.
10. CEO submits Approving Review (or Comment-review + `RATIFIED` interim) and squash-merges.

**Where it breaks today:**

| Step | Failure mode | Workaround | Permanent fix |
|---|---|---|---|
| 1–2 | Bot-Director impersonates CEO authority (incident P1) | Director timed out on Discord | DR-003 + Amend-C |
| 1–2 | OpenAI gpt-5.4 backend errors trigger amplification (incident P2) | Manual mitigation | self-originated-error suppression (incident §6 fix H) |
| 5–6 | EACCES on subagent shell (PR #53) | 3-layer credential injection | Already fixed (PR #19) |
| 5–6 | Worktree owned by root (2026-04-03) | `chown -R limitless:limitless` | Deploy rule — never operate as root |
| 6 | Author = CEO (DR-001 not in production) | Comment-review + `RATIFIED` workaround | DR-001 Phase 3 deploy (blocked on DR-002 Phase 4) |
| 9–10 | CEO self-approval block on CC-session-authored PRs | Comment-review workaround | DR-001 Phase 3 OR DR-003 (Director PR-authorship) |
| Any | NanoClaw config drift (3-copy) | Manual SSH propagation (failed once) | DR-002 Phase 3 (GH Actions deploy) + Phase 4 (sparse monorepo clone) |
| Any | Per-Architect CLAUDE.md drift (not git-tracked) | Manual host edits | `2026-04-21-agent-config-governance.md` ratification + commit to `docs/agent-personas/` (proposed §2.1.1 remediation) |

**The "happy path" works** end-to-end for low-stakes per-app PRs (PR #20, #23, #24, etc.) but **breaks reproducibly** at the seams: identity attribution (Step 6), deploy pipeline (NanoClaw self-deploy), and authority validation (Steps 1-2 in shared channels).

---

## §5. Open questions and data gaps

This C.1 deliverable was authored from the monorepo bind-mount only. Several source materials the dispatch references are host-side memory (under `/home/limitless/.claude/projects/.../memory/`) and not present in the bind-mount. D.1 should be aware that C.1's coverage is bounded by available evidence.

### Data gaps (host-side memory not present in monorepo bind-mount)

| Gap ID | Referenced file | What we'd need it for |
|---|---|---|
| **OQ-C1-1** | `MEMORY.md` (project memory index) | Would let us cite specific named project entries the dispatch flags |
| **OQ-C1-2** | `feedback_governance_determinism_primacy.md` | Dispatch cites this as the source of OpenClaw's analysis-only operational constraint |
| **OQ-C1-3** | `project_2026-04-26_*` arc files (rebuild, fleet restoration, Director restoration) | Would let us state restoration state of the 5 Architects with confidence rather than infer from phase-2-readiness §5.1 |
| **OQ-C1-4** | `project_meta_pivot_machine_that_builds_machines.md` | The strategic context for this whole research arc; would sharpen the implications |
| **OQ-C1-5** | `feedback_route_pr_authorship_to_bot.md` | Cross-referenced by incident §8.1 line 220; missing here |
| **OQ-C1-6** | Per-app `discord_<app>-eng/CLAUDE.md` (5 files) | Per `2026-04-21-agent-config-governance.md:94-99` these live on the VPS host filesystem at `/workspace/project/groups/`, not in git. The main template `apps/nanoclaw/groups/main/CLAUDE.md` is in git; per-app variants are runtime-instantiated copies. |
| **OQ-C1-7** | The fork's `apps/nanoclaw/src/container-runner.ts` (v1.2.53 reference) | Dispatch asks to compare against the deployed VPS state; we have only the monorepo's current `container-runner.ts` (which already includes DR-001 Phase 3 code, lines 47–115). Per phase-2-readiness §4.4, monorepo is at v1.2.46 with PR #73 syncing to v1.2.53. The fork at `LIMITLESS-LONGEVITY/nanoclaw` is the upstream-staging buffer (DR-002 §4.2). |

### Resolvable open questions (D.1 should address)

| OQ-ID | Question |
|---|---|
| **OQ-C1-A** | Has DR-001 Phase 3 been deployed to VPS-1 since the phase-2-readiness report (2026-04-21)? Code is in monorepo; deploy state requires an SSH check. (Dispatch says "Phase 3 not yet ported to v2" — this seems to refer to *"NanoClaw v2 in production"* not *"the monorepo's container-runner.ts"*.) |
| **OQ-C1-B** | Has DR-003 (Amend-C / Amend-D / Amend-E) been ratified between 2026-04-22 (incident report) and 2026-04-27 (today)? If yes, the bot-directive-authority `⊘` cells in §1 would shift toward `▥` or better. |
| **OQ-C1-C** | What's the current OpenClaw model — `gpt-5.4` (per phase-2-readiness 2026-04-21 + agent-config-governance 2026-04-21) or `gpt-5.5` (per the dispatch text)? If 5.5 is live, the dispatch is more current than the spec corpus by 6 days. |
| **OQ-C1-D** | What's the actual Phase 3 deploy timeline now that the dispatch references "Opus 4.7 patch applied 2026-04-26"? Suggests the fleet is more recently active than the latest spec corpus. |
| **OQ-C1-E** | What's the current state of PR #79 audit recovery? Path A (Option C kept), B (revert to Option D), or C (re-evaluate)? Affects the entire Phase 11 column of §1 since `pm-system-selection.md` is the only Phase 11 artifact. |
| **OQ-C1-F** | Has @aradSmith's CODEOWNERS PRs (mythos #3, mythos-ops #2) been ratified, and have the 5 multi-human workflow decisions (phase-2-readiness §6.1) been answered? Affects multi-tenant readiness. |

### Contradictions / 2026-evidence shifts (D.1 should reconcile)

- **Dispatch claims** OneCLI's GitHub provider is OAuth-only. **Source-grounded inspection** in `2026-04-25-sdk-contract-proxy-as-interop-layer.md:48-52` confirms OneCLI does only static-header replacement, no OAuth flow. The dispatch's claim is *consistent* with the source-spec; "OAuth-only limitation" means it can't do JWT/App-token exchange, which container-runner.ts handles directly. ✅ Consistent.
- **Dispatch references `openai-codex/gpt-5.5`**; agent-config-governance 2026-04-21 documents `gpt-5.4`. ⚠️ Possibly a recent Director-side upgrade. Flag for D.1.
- **Phase-2-readiness §2.5 status** (2026-04-21) says "Phase 3 — `container-runner.ts` token generation: ⏳ BLOCKED on DR-002 Phase 4." But the **monorepo `container-runner.ts:47-115` (today, 2026-04-27) has the App-token code**. Either the code landed *after* phase-2-readiness (likely — it's exactly the kind of work that follows from DR-002 absorption) or phase-2-readiness's status refers to *deployed VPS state* not *monorepo state*. Phase-2-readiness §2.5 phrasing — *"engineer handoff not filed yet"* — suggests they meant deploy-not-yet, not code-not-yet. ⚠️ Worth confirming for D.1.
- **The dispatch references "10 (soon 12 — see B.1) SDLC phases"** — B.1 has now ratified phases 11 and 12 (per `B.1-industry-baseline-amendments-2026-04-27.md` §3 of this research arc). C.1 uses 12 columns accordingly.

---

## §6. Citations

Cited in-line throughout. Consolidated list:

### From the monorepo (`/workspace/extra/monorepo/`)

| Source | Lines / scope |
|---|---|
| `apps/nanoclaw/src/container-runner.ts` | 1-115 (App-token generation + ghCredentials resolver), 117-272 (volume mounts + container env) |
| `apps/nanoclaw/src/config.ts` | 1-113 (env config, mount paths, monorepo/worktree paths, NOTIFICATION_CHANNELS) |
| `apps/nanoclaw/groups/main/CLAUDE.md` | 1-175 (Architect persona) |
| `apps/nanoclaw/groups/global/CLAUDE.md` | 1-127 (worker template, IPC schema, role-specific behavior) |
| `docs/decisions/DR-001-agent-identity-and-ratification-flow.md` | 1-227 (full DR-001) |
| `docs/decisions/DR-002-nanoclaw-source-of-truth-and-deployment.md` | 1-277 (full DR-002) |
| `docs/superpowers/specs/2026-04-18-agentic-sdlc-governance.md` | full (governance v1.2) |
| `docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md` | 1-691 |
| `docs/superpowers/specs/2026-04-21-agent-config-governance.md` | 1-120 (config-governance proposal) |
| `docs/superpowers/specs/2026-04-22-bot-feedback-loop-incident.md` | 1-261 (full incident) |
| `docs/superpowers/specs/2026-04-25-sdk-contract-proxy-as-interop-layer.md` | 1-100 (SDK contract binding rule) |
| `docs/superpowers/specs/2026-04-05-autonomous-agentic-division-design.md` | 1-606 (system design — 4-tier capability + autonomous orchestration) |
| `docs/superpowers/specs/2026-04-05-division-v2-federated-architecture.md` | 1-308 (federated architecture spec) |
| `docs/superpowers/specs/2026-04-05-nanoclaw-known-issues.md` | 1-291 (6 known issues + tracking matrix) |
| `docs/superpowers/specs/2026-04-21-pm-system-selection.md` | (PR #79 — Topic 3 in audit-recovery state per incident §7) |
| `docs/superpowers/reports/AgileSDLCToolsAndPlatformsReport.md` | 1-257 (10 SDLC phases × top 5 platforms — dispatch source) |
| `docs/superpowers/reports/research/B.1-industry-baseline-amendments-2026-04-27.md` | this research arc — adds Phase 11 + 12 |

### From the agent workspace (`/workspace/agent/`)

| Source | Note |
|---|---|
| `CLAUDE.local.md` | Defines this Infra Architect's role for `infra/` (Terraform-Render-Cloudflare-Sentry stack) |

### Host-side memory (referenced but not present in bind-mount — see §5)

- `MEMORY.md` (project memory index)
- `feedback_governance_determinism_primacy.md`
- `feedback_route_pr_authorship_to_bot.md`
- `project_2026-04-26_*` arc files (rebuild, fleet restoration, Director restoration)
- `project_meta_pivot_machine_that_builds_machines.md`
- `apps/nanoclaw/groups/discord_<app>-eng/CLAUDE.md` × 5 (per-app Architect CLAUDE.md, runtime-instantiated on VPS-1 per `2026-04-21-agent-config-governance.md:94-99`)

---

*End of C.1. Authored 2026-04-27 by Infra Architect (NanoClaw, Claude Opus 4.7). Bounded by monorepo bind-mount evidence; host-side memory entries flagged in §5. For D.1 synthesis input only — not a ratifiable artifact.*
