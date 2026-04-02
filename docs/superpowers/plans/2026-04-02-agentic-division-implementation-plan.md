# LIMITLESS Software Development Division — Agentic Implementation Plan

**Date:** 2026-04-02
**Author:** Main Instance (Architect)
**Classification:** Internal — Division Director
**Status:** APPROVED — All 8 decisions finalized by Director (2026-04-02)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Gap Analysis: Current State vs Target State](#2-gap-analysis)
3. [Target Architecture](#3-target-architecture)
4. [Phase 1: Monorepo Migration + Agent Identity](#4-phase-1-monorepo-migration--agent-identity)
5. [Phase 2: Communication & Orchestration](#5-phase-2-communication--orchestration)
6. [Phase 3: CI/CD Pipeline Automation](#6-phase-3-cicd-pipeline-automation)
7. [Phase 4: Observability & Self-Healing](#7-phase-4-observability--self-healing)
8. [Phase 5: Operational Maturity](#8-phase-5-operational-maturity)
9. [Monorepo Migration — Reference Details](#9-monorepo-migration--reference-details)
10. [Technology Recommendations](#10-technology-recommendations)
11. [Risk Register](#11-risk-register)

---

## 1. Executive Summary

### The Problem

LIMITLESS operates a 5-application platform (PATHS, HUB, Digital Twin, Cubes+, OS Dashboard) plus infrastructure, coordinated by two Claude Code instances (Main + Workbench) communicating via Discord. This setup has delivered impressive results — 39+ API routes on Cubes+, 77+ merged PRs on PATHS, and 5 live production services — but has accumulated systemic failures that documentation alone cannot prevent:

- **4 production outages in 7 days** from schema drift / migration failures
- **Workbench bottleneck**: one instance handles ALL code across 5 repos, creating context overload and serialized execution
- **Free-form handoffs**: Discord messages with prose instructions lead to incomplete context transfer and misinterpretation
- **No automated QA**: browser errors are guessed at, not diagnosed — leading to multi-PR fix loops
- **No CI-level code review**: PRs merge with hook validation only, no AI-powered review
- **Session continuity fragility**: memory files get stale, context lost between conversations
- **Cross-repo coordination gaps**: changes spanning repos require manual sequencing with no dependency tracking

### The Solution

Adapt the LIMITLESS Software Development Division guides to our existing infrastructure (Render + Cloudflare, Discord) by:

1. **Consolidating multi-repo into a Turborepo monorepo** — eliminating cross-repo coordination pain, enabling atomic cross-service changes
2. **Splitting the monolithic Workbench into per-repo specialist engineers** — enabling parallel execution and deep context per app
3. **Elevating the Main instance to a true Architect/Orchestrator** — planning, routing, review, and coordination only
4. **Adding a CI Agent** (GitHub Actions) for automated PR review and quality gates
5. **Adding a QA Agent** with real browser testing capabilities (Playwright)
6. **Structuring handoffs** into machine-readable, hard-block-enforced formats
7. **Introducing dual-layer health monitoring** — GitHub Actions heartbeat (15min) + RemoteTrigger intelligent monitor (4-6h)
8. **Enforcing all of the above through hooks, CI gates, and agent system prompts** — not documentation

### Roadmap At a Glance

| Phase | Name | Duration | Key Deliverables |
|-------|------|----------|-----------------|
| **1** | Monorepo Migration + Agent Identity | 4–6 sessions | Stabilize hooks, clean memory, Turborepo monorepo consolidation, Render reconfig, agent definitions, AGENT_ROLE enforcement |
| **2** | Communication & Orchestration | 1–2 sessions | Structured handoff schema (hard-block enforced), daily briefing automation |
| **3** | CI/CD Pipeline Automation | 2–3 sessions | GitHub Actions CI agent (Sonnet), automated PR review, unified monorepo CI |
| **4** | Observability & Self-Healing | 2–3 sessions | Dual-layer health monitoring (cron + RemoteTrigger), Playwright smoke tests, drift detection |
| **5** | Operational Maturity | Ongoing | Sprint ceremonies as agent protocols, DORA metrics, retrospective automation |

**Each phase is independently valuable.** No phase requires completion of later phases to deliver benefits. The plan can be paused at any phase boundary without regression.

---

## 2. Gap Analysis

### 2.1 What Works Today (Preserve)

| Capability | Implementation | Status |
|-----------|---------------|--------|
| Division of labour | `enforce-division-of-labour.sh` hook | LIVE, tested |
| Branch protection | `enforce-branch-strategy.sh` hook + GitHub branch protection | LIVE, 3 layers |
| Migration enforcement | `enforce-migrations.sh` hook + CI validation | LIVE, prevented 3 incidents |
| QA Operator code isolation | `enforce-docs-only.sh` hook | LIVE |
| Auto-handoff pickup | `check-handoffs-on-stop.sh` stop hook | LIVE |
| Discord communication | 5 channels (main-ops, workbench-ops, handoffs, alerts, human) | LIVE |
| Session protocols | Start (fetch + execute), End (memory + push + Discord) | LIVE |
| Per-repo CLAUDE.md | Each sub-project has detailed instructions | LIVE |
| Memory system | Topic files + MEMORY.md index | LIVE |
| Infrastructure as Code | Terraform Cloud + Render provider + Cloudflare | LIVE |

### 2.2 What's Broken or Missing (Fix)

| Gap | Impact | Root Cause | Proposed Fix | Phase |
|-----|--------|-----------|-------------|-------|
| **Workbench bottleneck** | Serialized execution across 5 repos; context switching causes errors | Single instance handles all code | Split into per-repo specialist agents | 1 |
| **No repo boundary enforcement** | `enforce-repo-boundary.sh` exists but is NOT registered | Hook written but never wired into `settings.local.json` | Register the hook, parameterize by agent identity | 1 |
| **No Cubes+ agent definition** | Cubes+ work uses generic workbench, missing deep context | Agent definitions only exist for PATHS, HUB, DT, Infra, QA | Create `.claude/agents/cubes-engineer.md` | 1 |
| **Free-form handoffs** | Incomplete context transfer; recipient misinterprets intent | Discord messages are prose, not structured | Define machine-readable handoff schema with required fields | 2 |
| **No automated PR review** | PRs merge based on hook checks only; no logic/design review | No CI agent exists | Add `claude-code-action` to GitHub Actions workflows | 3 |
| **No browser-based QA** | Client-side errors diagnosed by code reading, not observation | QA agent lacks Playwright integration protocol | Define QA verification protocol with Playwright steps | 2 |
| **No scheduled health checks** | Post-deploy issues discovered by users, not agents | No cron/scheduled agent infrastructure | Add scheduled RemoteTrigger or Render cron for health monitoring | 4 |
| **No cross-repo dependency tracking** | Multi-repo changes deployed out of order → runtime failures | No system tracks "repo A change requires repo B change" | Cross-repo dependency field in handoff schema + CI check | 3 |
| **Stale memory files** | Decisions recorded 5+ days ago may no longer reflect reality | Memory updated only during sessions; no expiry/refresh protocol | Memory freshness protocol: read-before-trust, TTL tags | 2 |
| **No post-deploy verification** | `pnpm build` success ≠ production works (proven by 3 incidents) | No agent systematically tests production after deploy | Automated post-deploy smoke test agent | 4 |
| **No sprint/planning structure** | Work is reactive to user requests; no backlog, no velocity tracking | Ad-hoc task management | Introduce lightweight sprint ceremonies as agent protocols | 5 |
| **Context loss on new sessions** | New conversations start cold; must re-read everything | Conversation context doesn't persist between sessions | Improved session-start protocol + pre-loaded context packages | 2 |
| **Multi-repo coordination pain** | Auth changes in PATHS break Cubes+; gateway changes affect all apps | No visibility into cross-repo impact before deploy | Cross-repo impact analysis step in Architect workflow | 3 |

### 2.3 Incident Archaeology — Why These Gaps Matter

Every production incident in our history traces back to one or more of the gaps above:

| Date | Incident | Duration | Gap(s) Exploited |
|------|----------|----------|-----------------|
| 2026-03-26 | AI tutor broken (`ai_config` columns missing) | **5 days** | No migration enforcement, no post-deploy verification |
| 2026-03-27 | Both instances push directly to main | Hours | No branch protection, hooks not registered |
| 2026-03-30 | ALL PATHS writes return 500 (feedback FK missing) | ~1 day | No migration enforcement for new collections |
| 2026-03-31 | PATHS homepage down (no-op SELECT 1 migration) | ~1 day | No CI validation of migration content |
| 2026-04-01 | 3-deploy failure loop (FK to non-existent table) | ~1 day | No cross-repo dependency tracking, migration authored without DB state verification |
| 2026-04-01 | Render deploy failures (pipeline minutes exhausted) | Hours | No scheduled health monitoring |
| Multiple | Multi-PR fix loops for client-side errors | Cumulative days | No browser-based QA |

**Pattern:** Every incident involved a gap where enforcement was soft (documentation/memory) rather than hard (hooks/CI/automation). The theme of this plan is: **if a rule matters, it must be enforced by code, not prose.**

---

## 3. Target Architecture

### 3.1 Agent Topology

```
                     ┌──────────────────────────┐
                     │     DIVISION DIRECTOR     │
                     │   (Human-in-the-Loop)     │
                     │   Reviews · Approves ·    │
                     │   Routes · Overrides      │
                     └────────────┬─────────────┘
                                  │
                     ┌────────────▼─────────────┐
                     │   ARCHITECT (Tier 1)      │
                     │   Planning · Routing ·    │
                     │   Cross-repo coord ·      │
                     │   Code review · Specs     │
                     └────────────┬─────────────┘
                                  │
        ┌──────────┬──────────┬───┴────┬──────────┬──────────┐
        │          │          │        │          │          │
   ┌────▼───┐ ┌───▼───┐ ┌───▼──┐ ┌───▼───┐ ┌───▼───┐ ┌───▼────┐
   │ PATHS  │ │  HUB  │ │  DT  │ │CUBES+ │ │ INFRA │ │   QA   │
   │  Eng.  │ │ Eng.  │ │ Eng. │ │ Eng.  │ │ Eng.  │ │ Agent  │
   │(Tier 2)│ │(Tier 2│ │(T.2) │ │(Tier 2│ │(Tier 2│ │(Tier 2)│
   └────────┘ └───────┘ └──────┘ └───────┘ └───────┘ └────────┘
        │          │         │        │          │          │
        └──────────┴─────────┴────┬───┴──────────┴──────────┘
                                  │
                     ┌────────────▼─────────────┐
                     │   CI AGENT (Automated)    │
                     │   GitHub Actions ·        │
                     │   PR Review · Gates       │
                     └──────────────────────────┘
```

### 3.2 Agent Registry

| Agent ID | Role | Tier | Model | Runs In | Concurrency |
|----------|------|------|-------|---------|-------------|
| `architect` | Cross-repo planner, reviewer, coordinator | 1 (Persistent) | Opus | Umbrella repo | Always active when Director is working |
| `paths-engineer` | PATHS (Payload CMS) feature dev, migrations | 2 (On-demand) | Opus | `limitless-paths/` | Spawned per task |
| `hub-engineer` | HUB (Prisma) feature dev, migrations | 2 (On-demand) | Opus | `limitless-hub/` | Spawned per task |
| `dt-engineer` | Digital Twin (Drizzle) feature dev | 2 (On-demand) | Opus | `limitless-digital-twin/` | Spawned per task |
| `cubes-engineer` | Cubes+ (Prisma 7) feature dev | 2 (On-demand) | Opus | `limitless-cubes/` | Spawned per task |
| `infra-engineer` | Terraform, DNS, Render, CI/CD | 2 (On-demand) | Opus | `limitless-infra/` | As needed |
| `qa-operator` | Browser QA, deploy verification, docs | 2 (On-demand) | Opus | Umbrella repo | Post-deploy, on request |
| `ci-agent` | Automated PR review, quality gates | 3 (Automated) | Sonnet | GitHub Actions | Every PR (no human loop) |

**Key principle preserved from the existing agentic design spec:** Agents are role definitions, not permanent processes. At any given moment, 1–4 are active based on the day's work. The Director launches the Architect; the Architect routes work to specialists via handoffs; specialists execute and return results.

### 3.3 Operational Model — How a Typical Session Flows

**Director says "go":**

1. **Architect** comes online → fetches Discord #main-ops + #handoffs → reads MEMORY.md
2. Architect assesses pending work, proposes plan to Director
3. Director approves/modifies
4. **Architect posts structured handoffs** to #handoffs for each specialist needed
5. Director launches relevant specialist(s) — e.g., PATHS Engineer + Cubes+ Engineer in parallel
6. Each specialist picks up its handoff, executes in its repo, creates PR
7. **CI Agent** (GitHub Actions) automatically reviews each PR
8. Architect reviews PRs that need human-level architectural judgment
9. PRs merge → Render auto-deploys
10. **QA Agent** runs post-deploy browser verification
11. Architect compiles session summary → posts to #main-ops
12. Director reviews, approves end-of-session

**What's different from today:**
- Steps 5-6: **Parallel execution** — multiple repos worked on simultaneously (today: serialized)
- Step 7: **Automated CI review** — catches issues before human sees the PR (today: hooks only)
- Step 10: **Browser QA** — real Playwright tests, not curl checks (today: guesswork)
- Throughout: **Structured handoffs** — machine-readable, validated (today: prose)

### 3.4 Division of Labour Matrix (Updated)

| Task Type | Agent | Rationale |
|-----------|-------|-----------|
| Architecture, planning, cross-repo design | Architect | Read-only analysis, never writes app code |
| Code review (architectural) | Architect | Cross-repo knowledge, pattern consistency |
| PATHS feature dev, migrations, bug fixes | PATHS Engineer | Deep Payload CMS + migration context |
| HUB feature dev, migrations | HUB Engineer | Prisma + clinical booking context |
| Digital Twin feature dev | DT Engineer | Fastify + Drizzle + TimescaleDB context |
| Cubes+ feature dev | Cubes+ Engineer | Prisma 7 + Next.js 15 builder context |
| Terraform, DNS, Render provisioning | Infra Engineer | IaC isolation, destructive operations |
| Browser QA, deploy verification, docs | QA Agent | Playwright MCP, Chrome DevTools |
| PR code review (automated) | CI Agent | Every PR, no human loop, fast feedback |
| Specs, plans, CLAUDE.md, memory | Architect | Umbrella repo, cross-cutting concerns |
| Handoff creation and routing | Architect | Central coordination point |
| Session briefings | Architect | Aggregates status from all specialists |

### 3.5 What Does NOT Change

The following elements of our current setup are preserved exactly:

- **Discord as communication bus** (5 existing channels)
- **Render + Cloudflare** as hosting/infrastructure platform
- **GitHub branch protection** (PR required, 1 approval, CI must pass)
- **Existing hooks** (branch strategy, division of labour, migrations, docs-only) — paths updated for monorepo
- **Stop hook** for auto-handoff pickup
- **Session start/end protocols**
- **CLAUDE.md authority hierarchy**
- **Memory system** (topic files + index)
- **Terraform Cloud** for infrastructure state
- **Cookie-based JWT auth** across services

### 3.6 What Changes

- **Multi-repo → Monorepo** (Turborepo) — all 5 apps consolidated under `apps/`, shared code in `packages/`
- **Per-repo GitHub repos → Single monorepo** with per-app Render root directories
- **Handoff enforcement → Hard-block** on missing required fields (no warn-only phase)
- **Health monitoring → Dual-layer** (GitHub Actions heartbeat + RemoteTrigger intelligent monitor)

---

## 4. Phase 1: Monorepo Migration + Agent Identity

**Goal:** Stabilize the foundation (hooks, memory, launch commands), then consolidate all repos into a Turborepo monorepo and define specialist agents with per-app isolation.

**Duration:** 4–6 sessions
**Dependencies:** None — this is the starting point
**Risk:** HIGH — structural change to entire codebase. Requires careful Render reconfiguration. Feature development pauses during migration. Foundation work (hooks, memory cleanup) is done first to ensure enforcement is solid before the big move.

> **Director Decision (2026-04-02):** Monorepo migration begins NOW, not Q3. Phase 0 (stabilize) merged into Phase 1 for a holistic approach — hook paths are written once for the monorepo structure rather than written for multi-repo and then rewritten.

### 4.1.0 Foundation — Stabilize Before Migration

These steps are completed FIRST, before touching repo structure. They ensure enforcement hooks work, memory is clean, and launch commands are standardized.

#### 4.1.0a Audit and Optimize Existing Hooks

**Problem:** With 4 PreToolUse hooks on Bash, every shell command runs through all 4 hooks. Hooks have timeouts (5–10s). If any hook is slow, agent responsiveness degrades.

**Actions:**
1. Benchmark each hook: `time echo '{"tool_name":"Bash","tool_input":{"command":"git status"}}' | bash enforce-*.sh`
2. Ensure all hooks exit fast (<100ms) for non-matching commands
3. Add early-exit short-circuits: if the command doesn't contain `git commit`, `git push`, etc., exit 0 immediately
4. Verify hooks don't conflict (e.g., `enforce-division-of-labour.sh` and `enforce-repo-boundary.sh` covering overlapping ground)
5. Consolidate overlapping hooks where possible — after monorepo migration, `enforce-division-of-labour.sh` and `enforce-repo-boundary.sh` may merge into one hook

#### 4.1.0b Clean Memory Debt

**Problem:** MEMORY.md is at 209 lines (limit: 200). Several topic files reference stale states.

**Actions:**
1. Audit all topic files for staleness — remove or update entries that no longer reflect reality
2. Consolidate the "Stabilization Triage" table (11 entries) into a lessons-learned summary — the details are in git history
3. Move Cubes+ v2 implementation details from MEMORY.md into the topic file (it's the largest entry)
4. Archive completed handoff references (0401-J through 0401-R are all done)
5. Target: MEMORY.md under 150 lines with all entries current

#### 4.1.0c Standardize Agent Launch Commands

**Problem:** Launch commands are documented in MEMORY.md but not standardized. Adding per-app agents requires a clear, consistent launch protocol.

**Actions:**
1. Document the launch command template:
   ```bash
   # Template
   AGENT_ROLE=<role> DISCORD_STATE_DIR=<path-if-not-main> claude \
     --dangerously-skip-permissions \
     --channels plugin:discord@claude-plugins-official
   ```
2. Create a launch reference table (paths reflect monorepo — all agents run from monorepo root):

   | Agent | AGENT_ROLE | DISCORD_STATE_DIR | Working Directory |
   |-------|-----------|-------------------|-------------------|
   | Architect | `architect` | (none — main) | `~/projects/limitless/` |
   | PATHS Engineer | `paths-engineer` | `~/.claude/channels/discord-workbench` | `~/projects/limitless/` |
   | HUB Engineer | `hub-engineer` | `~/.claude/channels/discord-workbench` | `~/projects/limitless/` |
   | DT Engineer | `dt-engineer` | `~/.claude/channels/discord-workbench` | `~/projects/limitless/` |
   | Cubes+ Engineer | `cubes-engineer` | `~/.claude/channels/discord-workbench` | `~/projects/limitless/` |
   | Infra Engineer | `infra-engineer` | `~/.claude/channels/discord-workbench` | `~/projects/limitless/` |
   | QA Agent | `qa-operator` | `~/.claude/channels/discord-workbench` | `~/projects/limitless/` |

   Note: All specialists share `discord-workbench` state (Decision #2). `AGENT_ROLE` env var distinguishes them for hook enforcement.

3. Create Discord `access.json` for workbench state directory if not already present

### 4.1.1 Turborepo Monorepo Migration

**Problem:** Multi-repo causes cross-repo API contract breakage (weekly), deployment ordering headaches (every cross-repo change), inconsistent CI, duplicated shared code (JWT parsing, API utilities, types), and agent context switching overhead.

**Target Structure:**

```
limitless/                          # Root (was LIMITLESS umbrella)
├── turbo.json                      # Turborepo configuration
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml             # pnpm workspace definition
├── CLAUDE.md                       # Umbrella instructions (updated for monorepo)
├── .claude/
│   ├── agents/                     # Agent definitions
│   ├── hooks/                      # Enforcement hooks (updated paths)
│   └── settings.local.json         # Hook registration
├── apps/
│   ├── paths/                      # Was limitless-paths/
│   │   ├── CLAUDE.md               # PATHS-specific instructions
│   │   ├── package.json
│   │   └── src/
│   ├── hub/                        # Was limitless-hub/
│   ├── digital-twin/               # Was limitless-digital-twin/
│   ├── cubes/                      # Was limitless-cubes/
│   ├── os-dashboard/               # Was limitless-os-dashboard/
│   └── website/                    # Corporate site (index.html)
├── packages/
│   ├── shared-types/               # Shared TypeScript types across apps
│   ├── auth/                       # Shared JWT/cookie auth utilities
│   └── api-client/                 # Shared API client for cross-service calls
├── infra/                          # Was limitless-infra/
│   ├── terraform/
│   └── gateway-worker.js
├── docs/                           # Specs, plans, guides
│   └── superpowers/
└── tests/
    └── smoke/                      # Playwright smoke tests (Phase 4)
```

**Migration Steps (ordered, each is a discrete commit):**

**Step 1: Create monorepo skeleton (1 session)**
1. Initialize Turborepo in the umbrella repo: `npx create-turbo@latest`
2. Configure `pnpm-workspace.yaml` with `apps/*` and `packages/*`
3. Configure `turbo.json` with build/dev/lint pipelines
4. Create `apps/` and `packages/` directories
5. Commit skeleton — umbrella repo is now the monorepo root

**Step 2: Move each app repo into `apps/` (1–2 sessions)**

For each repo (PATHS, HUB, DT, Cubes+, OS Dashboard):
1. `git subtree add --prefix=apps/<name> <remote-url> main --squash`
   - Preserves commit history in a squashed form
   - Alternative: `git read-tree` for cleaner history (loses individual commits)
2. Update `package.json` name field: `@limitless/<name>`
3. Update all relative imports if any reference `../` outside the app
4. Update `.env` / `.env.example` paths
5. Verify `pnpm build` works from the app directory
6. Verify `turbo run build --filter=@limitless/<name>` works

**Order matters:** PATHS first (most complex, most dependencies), then Cubes+ (depends on PATHS auth), then HUB, DT, OS Dashboard.

**Step 3: Move infrastructure into `infra/` (same session as Step 2)**
1. Move `limitless-infra/` contents to `infra/`
2. Update Terraform Cloud workspace to point to new path
3. Update `gateway-worker.js` path references

**Step 4: Extract shared packages (1 session)**
1. **`packages/shared-types/`** — Extract TypeScript interfaces shared across apps:
   - User type (used by PATHS, HUB, Cubes+ for auth)
   - API response types consumed across services
2. **`packages/auth/`** — Extract JWT cookie parsing and validation:
   - Cookie name (`payload-token`), domain (`.limitless-longevity.health`)
   - `verifyAuth()` utility that calls PATHS `/api/users/me`
   - Currently duplicated in Cubes+, HUB, and DT
3. **`packages/api-client/`** — Extract cross-service API calls:
   - Health check URLs
   - PATHS API URL construction (with basePath `/learn`)

**Step 5: Reconfigure Render deployments (1 session — HIGH RISK)**

Each Render service needs its `Root Directory` updated:

| Service | Current Root | New Root | Build Command |
|---------|-------------|----------|---------------|
| PATHS | `/` (own repo) | `apps/paths` | `cd ../.. && npx turbo run build --filter=@limitless/paths` |
| HUB | `/` (own repo) | `apps/hub` | `cd ../.. && npx turbo run build --filter=@limitless/hub` |
| DT | `/` (own repo) | `apps/digital-twin` | `cd ../.. && npx turbo run build --filter=@limitless/digital-twin` |
| Cubes+ | `/` (own repo) | `apps/cubes` | `cd ../.. && npx turbo run build --filter=@limitless/cubes` |
| OS Dashboard | Cloudflare Pages | Cloudflare Pages (update build path) | N/A |

**Critical:** Render supports monorepo builds via the `Root Directory` setting. Each service watches only its own directory for auto-deploy triggers. Turborepo's `--filter` flag ensures only the affected app builds.

**Rollback plan:** Keep the original repos as read-only archives for 2 weeks. If monorepo deploy fails, revert Render to original repos. Original repos are NOT deleted until monorepo is stable for 2 weeks.

**Step 6: Update GitHub configuration (same session as Step 5)**
1. Update branch protection rules on the monorepo
2. Move GitHub Actions workflows from individual repos to monorepo `.github/workflows/`
3. Use Turborepo's `--filter` with `[HEAD^1]` to run CI only for affected apps
4. Archive original repos (set to read-only, add README pointing to monorepo)

**Step 7: Update all hooks and agent definitions (1 session)**
1. Update `enforce-repo-boundary.sh` — paths change from `limitless-paths/` to `apps/paths/`
2. Update `enforce-division-of-labour.sh` — same path updates
3. Update `enforce-migrations.sh` — still only triggers in `apps/paths/`
4. Update all agent definitions in `.claude/agents/` — repo paths, build commands
5. Update umbrella `CLAUDE.md` — monorepo structure, new paths
6. Update all sub-project `CLAUDE.md` files — adjusted for monorepo context

### 4.1.2 Create Cubes+ Engineer Agent Definition

**Action:** Create `.claude/agents/cubes-engineer.md` with:
- **Stack context:** Next.js 15, Prisma 7 (with `@prisma/adapter-pg`), PostgreSQL, Zustand, TanStack Query
- **Entity naming rules:** Exercise (not Cube), Session (not Routine), Program (not Super-Routine) — NON-NEGOTIABLE
- **Auth pattern:** Delegates JWT validation to PATHS `/api/users/me` — cannot verify tokens locally
- **Prisma 7 gotchas:** Connection URL in `prisma.config.ts` for CLI; runtime needs adapter with explicit `connectionString`; seed needs SSL for external DB
- **Monorepo path:** `apps/cubes/`
- **Verification gate:** `turbo run build --filter=@limitless/cubes` succeeds

### 4.1.3 Restructure Agent System Prompts — Layered Architecture

```
Layer 1: Umbrella CLAUDE.md (loaded automatically)
  ├── Discord protocol, session start/end, hard constraints
  ├── Monorepo structure overview
  ├── Applies to ALL agents
  └── Single source of truth for operational rules

Layer 2: Agent Definition (.claude/agents/<agent>.md)
  ├── Domain expertise, stack knowledge, app-specific gotchas
  ├── Verification gates specific to this app
  ├── Autonomous scope + escalation boundaries
  └── NO duplication of Layer 1 content

Layer 3: App-level CLAUDE.md (apps/<name>/CLAUDE.md)
  ├── Build commands, environment setup, dependencies
  ├── Schema/migration rules (PATHS)
  ├── Code conventions
  └── Loaded when agent works in the app directory
```

**Concrete changes to each agent definition:**
- Remove Discord channel IDs (already in umbrella CLAUDE.md)
- Remove session protocols (already in umbrella CLAUDE.md)
- Update all paths to monorepo structure (`apps/<name>/`)
- Add explicit `AUTONOMOUS_SCOPE` section: what the agent can do without Architect approval
- Add explicit `ESCALATION_BOUNDARY` section: what requires Architect/Director sign-off
- Add `CROSS_APP_DEPENDENCIES` section: which other apps this agent's changes might affect

### 4.1.4 Enforce App Boundaries via Hook + AGENT_ROLE

**Action:** Update `enforce-repo-boundary.sh` to read `AGENT_ROLE` and enforce monorepo paths:

| AGENT_ROLE | Allowed Paths (write) | Blocked Paths |
|-----------|----------------------|---------------|
| `architect` | Root (`CLAUDE.md`, `docs/`, `.claude/`), `infra/` (docs only) | `apps/`, `packages/` |
| `paths-engineer` | `apps/paths/`, `packages/` (shared types/auth) | All other `apps/` |
| `hub-engineer` | `apps/hub/`, `packages/` | All other `apps/` |
| `dt-engineer` | `apps/digital-twin/`, `packages/` | All other `apps/` |
| `cubes-engineer` | `apps/cubes/`, `packages/` | All other `apps/` |
| `infra-engineer` | `infra/` | `apps/`, `packages/` |
| `qa-operator` | `docs/`, `tests/smoke/` | `apps/*/src/`, `packages/*/src/` |

**Note:** Specialist engineers CAN write to `packages/` (shared code) since they may need to update shared types or auth utilities. The Architect reviews these changes via PR.

### 4.1.5 Define Autonomous Scope and Escalation Boundaries

Each agent needs clear answers to: "What can I do without asking?" and "What must I escalate?"

**PATHS Engineer — Autonomous Scope:**
- Create feature branches, implement features, write tests within `apps/paths/`
- Run `pnpm payload migrate:create` and commit migrations
- Create PRs to main
- Fix build errors in their own PR
- Update `packages/shared-types/` if adding new shared types

**PATHS Engineer — Must Escalate:**
- Changes to `payload.config.ts` that add/remove collections
- Changes to the auth system or JWT handling
- Changes to `packages/auth/` (affects all consumers)
- Any change to environment variables or Render configuration

**Pattern for all engineers:** Same structure, different specifics. Each agent definition file includes these sections explicitly.

### 4.1.6 Discord Channel Configuration

**Approved (Decision #2):** All specialist engineers share `#workbench-ops` with role prefixes (e.g., "[PATHS-ENG] Online"). The `AGENT_ROLE` env var provides hook enforcement. No new Discord channels needed.

### Phase 1 Verification Gate

**Foundation:**
- [ ] All hooks execute in <100ms for non-matching commands
- [ ] MEMORY.md is under 150 lines and all entries are current
- [ ] Launch command table documented with AGENT_ROLE and tested for at least 2 agents

**Monorepo:**
- [ ] Turborepo monorepo builds all 5 apps successfully via `turbo run build`
- [ ] Each Render service deploys from its monorepo `apps/<name>/` root directory
- [ ] Auto-deploy triggers only for the affected app (not all apps on every push)
- [ ] `packages/shared-types/`, `packages/auth/`, `packages/api-client/` exist and are consumed by at least 2 apps
- [ ] Original repos archived as read-only with README pointing to monorepo

**Agent identity:**
- [ ] Cubes+ engineer agent definition exists with all Prisma 7 gotchas
- [ ] All agent definitions follow the 3-layer prompt architecture (no duplication, monorepo paths)
- [ ] Each agent definition has explicit AUTONOMOUS_SCOPE and ESCALATION_BOUNDARY sections
- [ ] `enforce-repo-boundary.sh` registered and blocks cross-app edits using monorepo paths + AGENT_ROLE
- [ ] Two specialist agents can be launched simultaneously without conflicts
- [ ] All existing hooks updated for monorepo paths and verified working

---

## 5. Phase 2: Communication & Orchestration

**Goal:** Replace free-form Discord handoffs with structured, validated, machine-readable messages. Establish session briefing automation and memory freshness protocols.

**Duration:** 1–2 sessions
**Dependencies:** Phase 1 (agent identity established)
**Risk:** Medium — changes the core coordination protocol; requires discipline during transition

### 5.2.1 Structured Handoff Schema

**Problem:** Current handoffs are multi-message Discord prose. They've been effective but suffer from:
- Missing required fields (verification steps forgotten, DO NOT MODIFY sections omitted)
- No machine-parseable format (agents must interpret natural language)
- No acknowledgment/completion tracking
- No dependency links between handoffs

**Action — Define the Standard Handoff Format:**

Every handoff posted to `#handoffs` must follow this template:

```
**HANDOFF-<YYYYMMDD>-<SEQ>: <Title>**
- **From:** <agent-role>
- **To:** <target-agent-role>
- **Priority:** P0|P1|P2|P3
- **Repo:** <github-org/repo-name>
- **Branch:** Create from `main` | Use existing `<branch-name>`
- **Depends-On:** <handoff-id> | None
- **Blocks:** <handoff-id> | None

**Context:**
<1-3 sentences explaining WHY this work is needed>

**Tasks:**
1. <Specific, actionable step>
2. <Specific, actionable step>
...

**Files to Modify:**
- `path/to/file.ts` — <what to change>

**DO NOT MODIFY:**
- <list of files/directories the receiving agent must not touch>

**Verify:**
1. `pnpm build` passes
2. <specific endpoint/page to test>
3. <expected result>

**Cross-Repo Impact:**
- <other repos affected by this change, if any>
- <what those repos need to do after this lands>

**PR Naming:** `<conventional commit style title>`
```

**Enforcement:** Create a new hook `validate-handoff.sh` (Stop hook) that checks whether outgoing Discord messages to `#handoffs` match required fields. If any required field is missing, the hook **hard-blocks** (exit code 2) and lists the missing fields. The agent must add the missing fields before the handoff posts.

> **Director Decision (2026-04-02):** Hard-block from day one. No warn-only phase. Past incidents where soft enforcement failed (2026-03-27 direct pushes, free-form handoffs causing context gaps) prove that gradual adoption doesn't work. In a multi-agent setup, loose handoffs would cause exponentially more bugs.

### 5.2.2 Handoff Lifecycle Tracking

**Problem:** Currently no way to know which handoffs are pending, in-progress, or completed without reading Discord history.

**Action — Handoff State Protocol:**

1. **Architect posts handoff** → message posted to `#handoffs`
2. **Specialist picks up** → reacts with ✅ emoji on the handoff message → posts "[AGENT_ROLE] Picked up HANDOFF-XXXX-X" to `#workbench-ops`
3. **Specialist completes** → posts "HANDOFF-XXXX-X COMPLETE — PR #<num>" to `#workbench-ops` → reacts with 🏁 emoji on original handoff
4. **QA verifies** (if applicable) → reacts with ✔️ on the completion message

**Why emojis:** Discord reactions are visible without reading message history. The Architect can scan `#handoffs` for messages without ✅ (unpicked) or without 🏁 (incomplete).

### 5.2.3 Cross-Repo Dependency Protocol

**Problem:** A Cubes+ change that depends on a PATHS API update must deploy in the correct order. Currently this is communicated in prose and easy to miss.

**Action — Dependency Chain in Handoffs:**

When the Architect creates handoffs that span repos, the `Depends-On` and `Blocks` fields create an explicit DAG:

```
HANDOFF-0402-A (PATHS): Add /api/health/profile endpoint
  Blocks: HANDOFF-0402-B

HANDOFF-0402-B (Cubes+): Consume PATHS /api/health/profile in workout builder
  Depends-On: HANDOFF-0402-A
```

**Enforcement rule:** A specialist encountering a `Depends-On` field must verify the dependency is merged before starting work. If not merged, the specialist posts to `#workbench-ops`: "BLOCKED on HANDOFF-XXXX-X" and moves to other work.

### 5.2.4 Daily Briefing Protocol

**Problem:** The Director has no aggregated view of platform status without manually checking each channel.

**Action — Architect produces a Daily Briefing:**

At session start, the Architect compiles and posts to `#main-ops`:

```
**Daily Briefing — YYYY-MM-DD**

**Services Status:**
| Service | Status | Last Deploy | Health |
|---------|--------|-------------|--------|
| PATHS   | ✅ UP  | 2h ago      | /learn/api/health → 200 |
| HUB     | ✅ UP  | 1d ago      | /book/api/health → 200 |
| DT      | ✅ UP  | 3h ago      | /api/twin/health → 200 |
| Cubes+  | ✅ UP  | 5h ago      | /train/api/v1/domains → 401 |
| OS Dash | ✅ UP  | auto        | / → 200 |

**Pending Handoffs:** 2 (HANDOFF-0402-A: PATHS, HANDOFF-0402-B: Cubes+)
**Open PRs:** 3 (#14 OS-Dashboard, #11 DT, #13 HUB)
**Blockers:** None
**Yesterday's Completions:** <summary>
**Today's Priorities:** <proposed>
```

**Implementation:** The Architect uses `curl` to health-check each endpoint, `gh pr list` to check open PRs, and Discord `fetch_messages` to scan for unresolved handoffs.

### 5.2.5 Memory Freshness Protocol

**Problem:** Memory files are point-in-time snapshots. A memory saying "PR #70 is pending" is stale once it's merged.

**Action — Rules for Memory Hygiene:**

1. **TTL awareness:** When reading a memory file, check its `description` field date. If >3 days old and references specific PRs, branches, or deploy states, verify before acting.
2. **Session-start cleanup:** Architect scans MEMORY.md for entries referencing completed work and archives them.
3. **No PR/branch state in memory:** Instead of "PR #70 is pending", store "PATHS catch-up migration pattern: neuter v1 → create v2". The lesson persists; the status doesn't.
4. **Topic files for decisions, not status:** Topic files should record WHY something was decided, not WHAT the current state is. Current state comes from git/Render/Discord.

### Phase 2 Verification Gate

- [ ] Structured handoff template is documented in umbrella CLAUDE.md
- [ ] At least one real handoff uses the new format successfully
- [ ] Handoff lifecycle (post → pick up → complete) works with emoji reactions
- [ ] Daily briefing format is documented and Architect can produce it
- [ ] MEMORY.md is refactored to follow the freshness protocol (no stale status entries)
- [ ] Cross-repo dependency chain has been tested with a real 2-handoff sequence

---

## 6. Phase 3: CI/CD Pipeline Automation

**Goal:** Add automated PR review via CI Agent (GitHub Actions), enforce cross-repo dependency checks, and standardize CI pipelines across all repos.

**Duration:** 2–3 sessions
**Dependencies:** Phase 1 (agent identity), Phase 2 (structured handoffs with cross-repo dependencies)
**Risk:** Medium — introduces new CI workflows; failure could block merges

### 6.3.1 CI Agent — Automated PR Review via GitHub Actions

**Problem:** PRs currently merge with only hook-level checks (linting, migration enforcement). No AI reviews the logic, design, or potential regressions.

**Action — Add `claude-code-action` to each app repo:**

```yaml
# .github/workflows/claude-review.yml
name: Claude Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]
  issue_comment:
    types: [created]

jobs:
  claude-review:
    if: >
      github.event_name == 'pull_request' ||
      (github.event_name == 'issue_comment' &&
       contains(github.event.comment.body, '@claude'))
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
    steps:
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          model: claude-sonnet-4-6
          review_comment_prefix: "🤖 CI Review:"
          direct_prompt: |
            Review this PR for:
            1. Correctness: Does the code do what the PR title/description says?
            2. Safety: Any SQL injection, XSS, or auth bypass risks?
            3. Cross-repo impact: Does this change an API contract consumed by other services?
            4. Migration safety (PATHS only): Does schema change have proper migration?
            5. Build risk: Could this break the production build?

            Be concise. Flag only real issues, not style preferences.
            If you find a cross-repo impact, comment: "⚠️ CROSS-REPO: This change affects [repo] because [reason]"
```

**Rollout order:** PATHS first (highest incident rate), then Cubes+, then HUB/DT/OS-Dashboard.

**Cost consideration:** Sonnet is used (not Opus) for CI review to keep costs manageable. Each PR review is ~10-50K tokens. At $3/MTok input + $15/MTok output for Sonnet, a typical review costs ~$0.01-0.05. Even at 20 PRs/day, this is <$1/day.

### 6.3.2 Standardize CI Pipelines Across Repos

**Problem:** Each repo has a different CI setup. Some have comprehensive validation (PATHS), others have minimal checks (Cubes+, HUB).

**Action — Standard CI Template:**

Every app repo CI should include these stages (adapted per stack):

| Stage | PATHS | HUB | DT | Cubes+ | OS Dashboard |
|-------|-------|-----|-----|--------|--------------|
| 1. Install + Type Check | `pnpm build` | `pnpm build` | `pnpm build` | `pnpm build` | N/A (static) |
| 2. Lint | ESLint | ESLint | ESLint | ESLint | N/A |
| 3. Schema Validation | `validate-payload-schema` | Prisma generate | Drizzle generate | Prisma generate | N/A |
| 4. Migration Check | `enforce-migrations` CI job | Migration file check | Migration file check | Migration file check | N/A |
| 5. Unit Tests | `pnpm test` (if exists) | `pnpm test` | `pnpm test` | `pnpm test` | N/A |
| 6. Claude Review | claude-code-action | claude-code-action | claude-code-action | claude-code-action | claude-code-action |

**Priority:** Start with ensuring every repo has at minimum stages 1 (build check) and 6 (Claude review). Add stages 2-5 incrementally.

### 6.3.3 Cross-Repo Impact Detection in CI

**Problem:** A PATHS API change can break Cubes+ (which calls PATHS for auth) or HUB (which reads PATHS JWT cookies). No automated check catches this.

**Action — API Contract Manifests:**

1. Each repo maintains an `api-contracts.json` file listing its public API endpoints and the repos that consume them:

```json
{
  "repo": "limitless-paths",
  "provides": [
    {
      "endpoint": "/api/users/me",
      "method": "GET",
      "consumers": ["limitless-cubes", "limitless-hub", "limitless-digital-twin"],
      "breaking_change_fields": ["id", "email", "role"]
    }
  ],
  "consumes": []
}
```

2. A CI step on PATHS checks: "Did this PR modify any file that implements a `provides` endpoint? If yes, comment with the consumer list."

3. The Architect, seeing this comment, creates follow-up handoffs for affected repos if needed.

**This is NOT a runtime check** — it's a documentation-as-code approach that surfaces impact during review. Lightweight, no new infrastructure.

### 6.3.4 Post-Merge Deploy Verification (Automated)

**Problem:** CI pass ≠ Render deploy pass (proven by 3 incidents). After merge, nobody systematically checks if Render built and deployed successfully.

**Action — GitHub Actions post-merge workflow:**

```yaml
# .github/workflows/post-deploy-check.yml
name: Post-Deploy Verification
on:
  push:
    branches: [main]

jobs:
  verify-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for Render deploy
        run: sleep 180  # Render typically deploys in 2-3 min

      - name: Check health endpoint
        run: |
          # Each repo defines its health URL in a repo-level variable
          HEALTH_URL="${{ vars.HEALTH_CHECK_URL }}"
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")
          if [ "$STATUS" != "200" ]; then
            echo "::error::Deploy may have failed. $HEALTH_URL returned $STATUS"
            exit 1
          fi
```

**On failure:** GitHub Actions posts a comment on the merge commit. The Architect (or any agent checking) sees this as a deploy failure signal.

### Phase 3 Verification Gate

- [ ] `claude-code-action` is installed and runs on PRs in at least PATHS + Cubes+
- [ ] CI review catches at least one real issue in a test PR
- [ ] `api-contracts.json` exists in PATHS with correct consumer list
- [ ] CI flags cross-repo impact when a `provides` endpoint file is modified
- [ ] Post-deploy health check runs on merge to main and correctly detects failures
- [ ] All app repos have at minimum: build check + Claude review in CI

---

## 7. Phase 4: Observability & Self-Healing

**Goal:** Shift from reactive incident response to proactive monitoring. Detect issues before users report them.

**Duration:** 2–3 sessions
**Dependencies:** Phase 3 (CI pipeline foundation)
**Risk:** Low-Medium — adds monitoring, doesn't change application code

### 7.4.1 Dual-Layer Health Monitoring

**Problem:** Render deploys can fail silently (DNS issues, env var misconfiguration, memory limits). We discover this when a user reports an error, not proactively.

> **Director Decision (2026-04-02):** Combo approach — both layers. Claude plan covers RemoteTrigger token costs; GitHub Actions cron is free. No reason not to have both.

**Layer 1: Heartbeat — GitHub Actions Cron (every 15 minutes)**

Simple HTTP status checks. The smoke detector — fast, free, independent of Claude API.

```yaml
name: Platform Health Check
on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check all services
        run: |
          SERVICES=(
            "PATHS|https://app.limitless-longevity.health/learn/api/health|200"
            "HUB|https://app.limitless-longevity.health/book/api/health|200"
            "DT|https://app.limitless-longevity.health/api/twin/health|200"
            "Cubes+|https://app.limitless-longevity.health/train/api/v1/domains|401"
            "OS Dashboard|https://app.limitless-longevity.health/|200"
          )
          FAILED=""
          for svc in "${SERVICES[@]}"; do
            IFS='|' read -r NAME URL EXPECTED <<< "$svc"
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL")
            if [ "$STATUS" != "$EXPECTED" ]; then
              FAILED="$FAILED\n$NAME: expected $EXPECTED, got $STATUS"
            fi
          done
          if [ -n "$FAILED" ]; then
            echo -e "UNHEALTHY SERVICES:$FAILED"
            # Alert Discord via webhook
            curl -H "Content-Type: application/json" \
              -d "{\"content\":\"🚨 **HEALTH CHECK FAILED**\n$FAILED\"}" \
              "${{ secrets.DISCORD_ALERTS_WEBHOOK }}"
            exit 1
          fi
```

**Why this layer matters:** Runs even if Claude API is down. Different infrastructure, different failure mode. This is the dead man's switch.

**Layer 2: Intelligent Monitor — RemoteTrigger (every 4-6 hours)**

Full Claude Code agent that performs deep health analysis. The doctor — diagnoses root causes, checks data integrity, produces briefings.

**RemoteTrigger capabilities:**
- Check Render deploy status via MCP (`list_deploys` for each service)
- Verify endpoint data integrity (not just HTTP 200, but actual data in responses)
- Run Playwright smoke tests (login, navigate, check for JS errors)
- Analyze Render logs for error patterns
- Post detailed health report to `#main-ops`
- If issues found: post diagnosis + recommended fix to `#alerts`
- Generate the Daily Briefing (service status, open PRs, pending handoffs)

**Schedule:** Every 4 hours during business hours, every 6 hours overnight. Configurable via RemoteTrigger cron expression.

| Layer | Mechanism | Frequency | What it Checks | Alert Channel | Cost |
|-------|-----------|-----------|----------------|---------------|------|
| **1: Heartbeat** | GitHub Actions cron | Every 15 min | HTTP status codes | `#alerts` (webhook) | Free |
| **2: Doctor** | RemoteTrigger | Every 4-6 hours | Deep health: deploys, data, browser, logs | `#main-ops` + `#alerts` | Covered by plan |

### 7.4.2 Post-Deploy Browser Smoke Tests

**Problem:** A 200 on `/api/health` doesn't mean the app works. JavaScript must execute, pages must render, interactive features must function. Our incident history proves this — multiple 200-status pages had broken UIs.

**Action — Playwright smoke test suite:**

Create a minimal Playwright test suite in the umbrella repo (`tests/smoke/`) that:
1. Loads the OS Dashboard login page → verifies it renders
2. Logs in with test credentials → verifies redirect to dashboard
3. Navigates to PATHS `/learn` → verifies course listing renders
4. Navigates to Cubes+ `/train` → verifies it loads (redirects to login if not authed)
5. Checks for console errors → flags any TypeError/ReferenceError

**Trigger:** QA Agent runs this suite after any deploy. Can also run on schedule (nightly).

**This directly addresses the "never guess at client-side errors" feedback** — instead of guessing, we observe.

### 7.4.3 Schema Drift Detection

**Problem:** Payload CMS schema drift has caused 4 of our 5 production incidents. Even with migration hooks, drift can accumulate if migrations run but don't fully apply.

**Action — Nightly schema comparison:**

A scheduled job that:
1. Connects to the production PATHS database
2. Runs `\dt` and `\d <table>` to get the actual schema
3. Compares against the expected schema (derived from Payload collections)
4. Reports any drift to `#alerts`

**Implementation:** A simple Node.js script in `limitless-infra/scripts/check-schema-drift.js` that connects via `DATABASE_URL` and compares column lists. Run via GitHub Actions cron or Render cron job.

### 7.4.4 Render Deploy Status Integration

**Problem:** We have the Render MCP server configured but don't systematically use it for deploy monitoring.

**Action:** Add to the Architect's session-start protocol:
1. Use Render MCP `list_deploys` for each service
2. Check if the latest deploy succeeded
3. If any deploy is failed/in-progress, include in daily briefing
4. If any service has been in "failed" state for >1 hour, post to `#alerts`

### Phase 4 Verification Gate

- [ ] GitHub Actions cron health check runs every 30 minutes and correctly detects outages
- [ ] Discord `#alerts` receives notifications when health check fails
- [ ] Playwright smoke test suite exists with at least 5 tests (login, dashboard, PATHS, Cubes+, console errors)
- [ ] QA Agent can run the smoke suite and report results
- [ ] Schema drift detection runs nightly for PATHS
- [ ] Architect session-start includes Render deploy status check

---

## 8. Phase 5: Operational Maturity

**Goal:** Introduce lightweight sprint structure, DORA metrics tracking, and retrospective automation to drive continuous improvement.

**Duration:** Ongoing
**Dependencies:** Phases 0–4 provide the foundation
**Risk:** Low — process improvements, not technical changes

### 8.5.1 Lightweight Sprint Ceremonies (Agent Protocols)

We don't need full Scrum. We need enough structure to prevent purely reactive work. Adapted from the agentic guide's ceremony translations:

**Weekly Planning (Replaces Sprint Planning):**
- **When:** Start of each week (Monday session)
- **Who:** Director + Architect
- **Process:**
  1. Architect reviews: open PRs, pending handoffs, deployed-but-unverified changes, MEMORY.md
  2. Architect proposes weekly priorities (3-5 items max)
  3. Director approves/modifies
  4. Architect creates handoffs for each priority item
- **Output:** Priority list posted to `#main-ops`, handoffs created for specialists

**Daily Briefing (Replaces Daily Standup):**
- **When:** Session start
- **Who:** Architect (automated)
- **Process:** Architect produces the Daily Briefing (defined in Phase 2)
- **Output:** Posted to `#main-ops`

**Weekly Review (Replaces Sprint Review):**
- **When:** End of week (Friday session)
- **Who:** Director + Architect
- **Process:**
  1. Architect compiles: PRs merged this week, features deployed, incidents, blockers
  2. Director reviews deployed features in browser
  3. Architect documents what shipped and what carried over
- **Output:** Weekly summary posted to `#main-ops`

**Retrospective (Replaces Sprint Retro):**
- **When:** End of week, after review
- **Who:** Architect
- **Process:**
  1. Architect reviews: incidents this week, hook failures, handoff quality, deploy success rate
  2. Identifies patterns: "3 of 4 PRs needed revision due to missing tests"
  3. Proposes process improvements (hook changes, CLAUDE.md updates, new CI checks)
  4. Director approves changes
- **Output:** Retro summary in `docs/superpowers/retros/YYYY-WW.md`, approved changes applied

### 8.5.2 DORA Metrics Tracking (Simplified)

We don't need a dashboard. We need the Architect to compute these at weekly review:

| Metric | How to Measure | Target |
|--------|---------------|--------|
| **Deployment Frequency** | Count of merges to main per repo per week (via `gh pr list --state merged`) | Multiple per day |
| **Change Lead Time** | Average time from PR open to merge (via `gh pr list` with timestamps) | < 4 hours |
| **Change Failure Rate** | PRs that required follow-up fix PRs / total PRs | < 10% |
| **Failed Deploy Recovery Time** | Time from failed Render deploy to successful deploy (via Render MCP) | < 1 hour |

**Tracking method:** Architect computes these weekly and includes in the weekly summary. Trends are more important than absolute numbers. If change failure rate spikes, the retro investigates why.

### 8.5.3 Retrospective-Driven Hook Evolution

**Core insight from our history:** Every production incident eventually became a hook or CI check. The retrospective should systematize this:

1. **Incident occurs** → immediate fix
2. **Retro identifies the gap** → "We had no check for X"
3. **Director approves enforcement** → "Add a hook/CI check for X"
4. **Architect creates the enforcement** → hook or CI workflow
5. **Test the enforcement** → verify it catches the scenario
6. **Document in CLAUDE.md** → why the rule exists (incident reference)

This is the flywheel that converts incidents into prevention.

### Phase 5 Verification Gate

- [ ] Weekly planning produces a priority list and handoffs at the start of each week
- [ ] Daily briefing is produced at session start
- [ ] Weekly review captures what shipped and what carried over
- [ ] DORA metrics are computed at weekly review
- [ ] At least one retrospective has identified a gap and produced a new hook/CI check

---

## 9. Monorepo Migration — Reference Details

> **Director Decision (2026-04-02):** Monorepo migration begins NOW in Phase 1. Rationale: switching to a monorepo now will block development short-term, but deferring makes migration exponentially harder as services and complexity grow. We are modeling after Google — monorepo is the way to go.

### 9.1 Pain Points Being Solved (Immediate)

| Pain Point | Description | Frequency | Eliminated By |
|-----------|-------------|-----------|---------------|
| Cross-repo API contract breakage | PATHS API change breaks Cubes+ auth delegation | ~Weekly | Atomic cross-app PRs |
| Deployment ordering | PATHS must deploy before Cubes+ for API changes | Every cross-repo change | Single PR, coordinated deploy |
| Inconsistent CI | Each repo has different CI setup, different quality gates | Persistent | Unified Turborepo pipeline |
| Shared code duplication | JWT parsing, API utilities, types duplicated across repos | Persistent | `packages/` shared libraries |
| Context switching overhead | Agents must re-read different CLAUDE.md, different stack docs per repo | Every handoff | Single repo context |

### 9.2 Turborepo — Why This Tool

- **Built for Next.js** — same team (Vercel), first-class support
- **Minimal config** — single `turbo.json` defines the build graph
- **Incremental builds** — only rebuilds affected apps on change
- **Render compatible** — Render supports monorepo root directory setting natively
- **Free** — open source. Remote cache ($50/month from Vercel) is optional and not needed initially.
- **Proven at scale** — used by Vercel, Netflix, Adobe for similar Next.js monorepo setups

### 9.3 Migration Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Deploy outage during Render reconfig | Keep original repos as read-only fallback for 2 weeks |
| Lost git history | Use `git subtree add --squash` to preserve squashed history |
| Build failures in monorepo context | Migrate one app at a time, verify build between each |
| Render auto-deploy triggers for all apps | Configure root directory per service so only affected app triggers |
| Environment variable misconfiguration | Document all env vars per app before migration; verify each after |

### 9.4 Post-Migration Benefits for Agentic Workflow

- **Single `CLAUDE.md`** — one source of truth instead of 6
- **Atomic handoffs** — Architect creates one handoff for a cross-app change instead of two dependent handoffs
- **Simplified CI Agent** — one `claude-review.yml` instead of one per repo
- **Shared packages** — `packages/auth/` eliminates the JWT verification duplication that caused the Cubes+ auth debugging
- **Agent context** — all agents work in the same repo, can see all code, understand all dependencies

Full migration steps are in Phase 1 (Section 5.1.1).

---

## 10. Technology Recommendations

These are changes to our tech stack that the guides suggest and that would deliver real value for our specific problems. Grouped by recommendation strength.

### 10.1 Adopt (High confidence, solves existing problems)

#### GitHub Actions `claude-code-action` — CI Agent

- **What:** Anthropic's official GitHub Action for automated PR review
- **Why:** Directly addresses our "no AI-powered PR review" gap. Every incident involved a PR that would have been caught by review.
- **Cost:** ~$0.01-0.05 per review (Sonnet). At 100 PRs/month: ~$5/month.
- **Complexity:** Add one YAML file per repo. Requires `ANTHROPIC_API_KEY` in GitHub Secrets.
- **Risk:** Almost none. It comments on PRs; it doesn't block them. Can be disabled per-repo instantly.

#### GitHub Actions Scheduled Workflows — Health Monitoring

- **What:** Cron-triggered Actions for platform health checks
- **Why:** Solves our "discover outages reactively" problem. Free tier includes 2,000 minutes/month.
- **Cost:** Free (within GitHub Actions free tier for public repos).
- **Complexity:** One YAML file in the umbrella repo.
- **Risk:** None. Read-only health checks.

#### Playwright — Browser QA

- **What:** We already have Playwright MCP configured but underuse it
- **Why:** Directly addresses the "never guess at client-side errors" feedback. Our most time-consuming incidents were client-side.
- **Cost:** Free (open source). Already configured as MCP server.
- **Complexity:** Writing test scripts — but the QA Agent can be prompted to do this.
- **Risk:** None. Tests are read-only observations.

#### Turborepo — Monorepo Build System (Phase 1)

- **What:** Monorepo build system optimized for Next.js/TypeScript
- **Why:** Director approved monorepo migration NOW. Turborepo is the right tool for our stack.
- **Cost:** Free (open source). Vercel remote caching ($50/month) optional — skip initially.
- **Complexity:** Migration is Phase 1 (3-5 sessions). Significant but one-time effort.
- **Risk:** Managed by keeping original repos as read-only fallback for 2 weeks.

### 10.2 Recommend (Good value, moderate effort)

#### Linear — Project Management (Replace ad-hoc tracking)

- **What:** Modern issue tracker with first-class API and CLI
- **Why:** The guides recommend Jira, but Linear is lighter, cheaper, and has excellent API for agentic workflows. Would replace our "handoffs as the only tracking" model with actual issue/sprint tracking.
- **Cost:** $8/user/month. For 1 human user: $8/month. (Agents don't need seats — they'd use the API.)
- **Complexity:** Low — import nothing, start fresh. Architect creates issues, specialists update them.
- **Risk:** Low. But adds another tool to monitor. Our Discord handoff system works acceptably.
- **Verdict:** Consider after Phase 5 (sprint ceremonies) is running. If Discord handoffs + weekly planning is sufficient, skip this.

### 10.3 Skip (Not worth the complexity for our scale)

| Tool from Guides | Why Skip |
|-----------------|----------|
| **AWS/GCP/Kubernetes** | Render + Cloudflare serves our scale. K8s is massive operational overhead for 5 services. |
| **Istio service mesh** | We have 5 services, not 50. TLS is handled by Render/Cloudflare. |
| **HashiCorp Vault** | Render environment variables + Terraform Cloud secrets are sufficient. |
| **Apache Kafka** | No event streaming use case yet. PostgreSQL LISTEN/NOTIFY if needed. |
| **LaunchDarkly/feature flags** | At our scale, feature branches + fast deploys are sufficient. |
| **Prometheus + Grafana** | Render provides basic metrics. GitHub Actions cron covers health monitoring. |
| **Jira + Confluence** | Too heavy for a 1-person team with AI agents. Discord + GitHub + markdown docs work. |
| **Okta SSO** | Single user. Cookie-based JWT across services is sufficient. |
| **SonarQube** | Claude CI review + ESLint covers code quality for our scale. |
| **MLflow/Kubeflow** | No ML models in production. AI features use OpenRouter API (hosted inference). |
| **SIEM (Splunk)** | Render logs + GitHub audit log are sufficient for our compliance needs. |

### 10.4 Cost Summary

| Item | Monthly Cost | Status |
|------|-------------|--------|
| Render Professional | ~$19/service × 5 = ~$95 | Already paying |
| Render PostgreSQL (3 DBs) | ~$7/db × 3 = ~$21 | Already paying |
| Claude API (CI reviews, ~100 PRs) | ~$5 | New |
| Claude API (RemoteTrigger health monitor, ~6/day) | Covered by plan | New |
| GitHub Actions (heartbeat health checks) | Free (public repos) | New |
| Turborepo | Free (open source) | New |
| Playwright | Free (open source) | Already configured |
| Anthropic API (agent sessions) | Varies with usage | Already paying (via Claude Code subscription) |
| **New incremental cost** | **~$5/month** (CI reviews only — all else free or covered by plan) | |

---

## 11. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| **Hook proliferation slows agents** | Medium | Medium | Phase 1 foundation step benchmarks all hooks; early-exit patterns; combine overlapping hooks |
| **Structured handoffs add friction** | Medium | Low | Template is a superset of what we already write; enforcement is warn-only initially |
| **CI Agent produces noisy/false-positive reviews** | Medium | Low | Start with warn-only; tune prompt based on first 20 PRs; Director adjusts sensitivity |
| **Per-repo agents diverge in quality** | Low | Medium | Architect reviews all PRs; shared verification gates in umbrella CLAUDE.md |
| **Discord message volume overwhelms Director** | Medium | Medium | Daily briefing aggregates; channel discipline (ops = agents only, human = Director); notification tuning |
| **AGENT_ROLE env var not set at launch** | Medium | High | Hook falls back to `DISCORD_STATE_DIR` logic; launch reference table in CLAUDE.md |
| **Multiple agents edit same file** | Low | High | Repo boundary hooks prevent this; handoff DO-NOT-MODIFY sections |
| **Memory system exceeds 200-line limit again** | High | Low | Phase 2 freshness protocol; aggressive archival; smaller topic files |
| **GitHub Actions free tier minutes exhausted** | Low | Low | Public repos get unlimited minutes; only private repos have limits |
| **Render deploy race condition (two repos deploy simultaneously)** | Low | Medium | Gateway routes are static; each service deploys independently; no shared state at deploy time |

---

## Appendix A: Implementation Checklist (All Phases)

This is the complete, ordered checklist. Each item is independently testable.

### Phase 1 — Monorepo Migration + Agent Identity

**Foundation (do first):**
- [ ] 1.1: Benchmark all hooks; add early-exit short-circuits (<100ms for non-matching commands)
- [ ] 1.2: Clean MEMORY.md to <150 lines; archive stale entries
- [ ] 1.3: Document launch command table with AGENT_ROLE env var

**Monorepo migration:**
- [ ] 1.4: Initialize Turborepo monorepo skeleton (`turbo.json`, `pnpm-workspace.yaml`)
- [ ] 1.5: Move PATHS into `apps/paths/` via `git subtree add` — verify build
- [ ] 1.6: Move Cubes+ into `apps/cubes/` — verify build
- [ ] 1.7: Move HUB into `apps/hub/` — verify build
- [ ] 1.8: Move Digital Twin into `apps/digital-twin/` — verify build
- [ ] 1.9: Move OS Dashboard into `apps/os-dashboard/` — verify build
- [ ] 1.10: Move infrastructure into `infra/`
- [ ] 1.11: Extract `packages/shared-types/`, `packages/auth/`, `packages/api-client/`
- [ ] 1.12: Reconfigure all Render services (root directory, build commands)
- [ ] 1.13: Verify all 5 services deploy successfully from monorepo
- [ ] 1.14: Update GitHub Actions CI workflows for monorepo (Turborepo --filter)
- [ ] 1.15: Archive original repos as read-only
- [ ] 1.16: `turbo run build` succeeds for all apps from monorepo root

**Agent identity (do after monorepo is stable):**
- [ ] 1.17: Create `.claude/agents/cubes-engineer.md`
- [ ] 1.18: Restructure all agent definitions (3-layer architecture, monorepo paths)
- [ ] 1.19: Add AUTONOMOUS_SCOPE and ESCALATION_BOUNDARY to each agent definition
- [ ] 1.20: Update all hooks for monorepo paths (write once, not rewrite)
- [ ] 1.21: Register `enforce-repo-boundary.sh` in `settings.local.json` — reads AGENT_ROLE with monorepo paths
- [ ] 1.22: Test: Architect cannot edit app code; specialist cannot edit outside their app
- [ ] 1.23: Test: Two specialists launched simultaneously without conflict

### Phase 2 — Communication & Orchestration
- [ ] 2.1: Add structured handoff template to umbrella CLAUDE.md
- [ ] 2.2: Create `validate-handoff.sh` stop hook (hard-block on missing fields)
- [ ] 2.3: Document handoff lifecycle (post → ✅ → 🏁 → ✔️)
- [ ] 2.4: Document cross-repo dependency protocol
- [ ] 2.5: Create daily briefing template; test with real data
- [ ] 2.6: Refactor MEMORY.md: remove status entries, keep decisions/lessons
- [ ] 2.7: Define memory freshness rules in umbrella CLAUDE.md

### Phase 3 — CI/CD Pipeline Automation
- [ ] 3.1: Add `ANTHROPIC_API_KEY` to GitHub Secrets for all app repos
- [ ] 3.2: Add `claude-review.yml` workflow to PATHS
- [ ] 3.3: Add `claude-review.yml` workflow to Cubes+
- [ ] 3.4: Add `claude-review.yml` workflow to HUB, DT, OS-Dashboard
- [ ] 3.5: Create `api-contracts.json` for PATHS (defines provided endpoints + consumers)
- [ ] 3.6: Create `api-contracts.json` for Cubes+ (defines consumed endpoints)
- [ ] 3.7: Add cross-repo impact detection CI step to PATHS
- [ ] 3.8: Add `post-deploy-check.yml` to each app repo
- [ ] 3.9: Standardize CI: ensure every repo has build check + Claude review minimum
- [ ] 3.10: Test: CI review catches a real issue in a test PR

### Phase 4 — Observability & Self-Healing
- [ ] 4.1: Create `health-check.yml` cron workflow (Layer 1: heartbeat every 15min)
- [ ] 4.2: Configure Discord webhook for `#alerts` channel (for GitHub Actions notifications)
- [ ] 4.3: Configure RemoteTrigger (Layer 2: intelligent monitor every 4-6h)
- [ ] 4.4: Create Playwright smoke test suite (`tests/smoke/`)
- [ ] 4.5: Define QA Agent post-deploy verification protocol
- [ ] 4.6: Create PATHS schema drift detection script
- [ ] 4.7: Add Render deploy status to Architect session-start protocol
- [ ] 4.8: Test: Layer 1 heartbeat detects simulated outage and alerts Discord
- [ ] 4.9: Test: Layer 2 RemoteTrigger runs Playwright tests and posts health report

### Phase 5 — Operational Maturity
- [ ] 5.1: Document weekly planning protocol in CLAUDE.md
- [ ] 5.2: Document daily briefing protocol in CLAUDE.md
- [ ] 5.3: Document weekly review protocol in CLAUDE.md
- [ ] 5.4: Create retrospective template (`docs/superpowers/retros/template.md`)
- [ ] 5.5: Run first weekly planning cycle
- [ ] 5.6: Compute first set of DORA metrics
- [ ] 5.7: Run first retrospective; produce at least one process improvement

---

## Appendix B: Director Decisions (Finalized 2026-04-02)

All 8 decisions resolved. Implementation proceeds with these as binding constraints.

| # | Decision | Verdict | Final Choice |
|---|----------|---------|-------------|
| 1 | Agent identity mechanism | **APPROVED** | `AGENT_ROLE` env var at launch |
| 2 | Discord channel strategy | **APPROVED** | All specialists share `#workbench-ops` |
| 3 | CI Agent model | **APPROVED** | Sonnet (claude-sonnet-4-6) |
| 4 | Health check mechanism | **MODIFIED** | Combo: GitHub Actions cron (15min heartbeat) + RemoteTrigger (4-6h intelligent monitor) |
| 5 | Structured handoff enforcement | **MODIFIED** | Hard-block from day one (no warn-only phase) |
| 6 | Monorepo migration | **MODIFIED** | Begin NOW in Phase 1 (not deferred to Q3) — Turborepo |
| 7 | Issue tracking tool | **APPROVED** | Skip initially; evaluate after Phase 5 |
| 8 | Post-deploy browser smoke tests | **APPROVED** | Playwright suite in monorepo `tests/smoke/` |

---

*This plan is a living document. It will be updated as each phase completes and lessons are learned. All 8 decisions approved by Director on 2026-04-02. Phase 1 implementation begins next session.*
