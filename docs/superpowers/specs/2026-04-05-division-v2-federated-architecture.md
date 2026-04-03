# Agentic Division v2 — Federated Architecture with OpenClaw Director

**Date:** 2026-04-05
**Author:** Architect + Director
**Classification:** Internal — Division Director
**Status:** DRAFT — Pending Director Review
**Supersedes:** `2026-04-05-autonomous-agentic-division-design.md` (centralized Architect model)
**Supersedes:** `2026-04-05-division-hierarchy-and-communication.md` (hierarchy spec)

---

## 1. Why v2

The v1 architecture placed a single Architect at the center, managing all apps through Agent SDK subagents. This works but is functionally equivalent to running Claude Code locally with the Agent tool — we built an elaborate remote wrapper without achieving the key differentiator: true multi-agent parallel execution.

v2 introduces a **federated model** with three tiers:

```
┌─────────────────────────────────────────────────────────────┐
│                     HUMAN CEO                                │
│              (any channel: Discord, WhatsApp, Telegram)      │
│                                                              │
│  Strategic direction · Approves architecture · Sets budget   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│            OPENCLAW DIRECTOR (AWS VPS — always-on)           │
│                                                              │
│  Persistent Gateway daemon · Multi-channel communication     │
│  Decomposes strategy into app-level tasks · Monitors results │
│  Cron: periodic health/PR/status checks · Fleet management   │
│  Persistent memory (MEMORY.md + daily notes)                 │
│  Future: Terraform + Ansible for VPS fleet automation        │
└──────────────────────────┬──────────────────────────────────┘
                           │  Discord messages to Architect channels
                           │  (proactive send: openclaw message send)
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼───────┐  ┌───────▼───────┐  ┌──────▼───────┐
│ PATHS          │  │ CUBES+        │  │ DT           │  ... (HUB, INFRA)
│ Architect      │  │ Architect     │  │ Architect    │
│ (NanoClaw      │  │ (NanoClaw     │  │ (NanoClaw    │
│  container)    │  │  container)   │  │  container)  │
│                │  │               │  │              │
│ Agent SDK      │  │ Agent SDK     │  │ Agent SDK    │
│ subagents:     │  │ subagents:    │  │ subagents:   │
│ ├─ explorer    │  │ ├─ executor   │  │ ├─ debugger  │
│ ├─ planner     │  │ ├─ verifier   │  │ └─ executor  │
│ ├─ executor    │  │ └─ executor   │  │              │
│ └─ verifier    │  │               │  │              │
└───────────────┘  └───────────────┘  └──────────────┘
    #paths-eng        #cubes-eng         #dt-eng
```

---

## 2. Why This Architecture

### Each tier uses proven tools for its level of complexity

| Tier | Tool | Why |
|------|------|-----|
| **CEO → Director** | Any messaging channel | Human uses whatever is convenient |
| **Director (OpenClaw)** | Persistent Gateway + Discord proactive send + cron + memory | Always-on orchestrator that survives session boundaries, tracks state, monitors fleet |
| **Architects (NanoClaw)** | Agent SDK subagents + agent teams | Proven internal orchestration (PRs #14, #20, #21). No custom distributed systems code. |

### What each tier does NOT do

| Tier | Does NOT |
|------|----------|
| CEO | Provide file paths, code, implementation details. Interact with Architects directly. |
| Director (OpenClaw) | Write application code. Manage subagent lifecycle within Architect containers. |
| Architects (NanoClaw) | Coordinate with other Architects in real-time. Manage fleet infrastructure. |

### How the tiers communicate

| From → To | Medium | Latency | Content |
|-----------|--------|---------|---------|
| CEO → Director | Discord, WhatsApp, Telegram | Real-time | "Ship Garmin integration by June" |
| Director → CEO | Same channel | Real-time | "Garmin integration shipped. PR #45 merged." |
| Director → Architect | Discord (proactive send to #app-eng) | Seconds | "Investigate why DT health endpoint returns 500. Fix and create PR." |
| Architect → Director | Discord (post to #app-eng) | Seconds-minutes | "Fixed. PR #46. Build passed. Changed routes/health.ts." |
| Architect ↔ Architect | Discord (via Director relay or direct channel post) | Minutes | "PATHS API /users/me response format changed. Update your auth delegation." |

---

## 3. OpenClaw Director — Architecture

### What it is

The existing OpenClaw instance on AWS VPS (`chmod735-dor/infra-docs` infrastructure). Persistent Gateway daemon, always-on, multi-channel. Already running and proven (composed the infra-docs and infra-code repositories autonomously).

### Capabilities we use

| Capability | How we use it |
|------------|---------------|
| **Discord proactive send** | `openclaw message send --channel discord --target channel:<architect-jid> --message "task description"` |
| **Cron scheduling** | Periodic: check Architect channel for results, check GitHub for open PRs, health check all services |
| **Persistent memory** | MEMORY.md tracks: active tasks, which Architect is working on what, cross-app dependencies |
| **Sub-agents** | Internal decomposition: break CEO's strategic goal into app-level tasks before dispatching |
| **HTTP hooks** | External systems (GitHub Actions, Render deploy webhooks) can trigger the Director |
| **Multi-channel** | CEO communicates via Discord, WhatsApp, or Telegram — Director listens on all |

### What it replaces

The human Director's manual work:
- Posting detailed handoffs to #main-ops → OpenClaw posts to app-specific channels
- Monitoring Discord for Architect responses → OpenClaw cron polls channels
- Tracking which tasks are pending → OpenClaw MEMORY.md
- Cross-app coordination → OpenClaw detects dependencies and posts to affected channels

### Day 1 compatibility

The system works identically whether the Director is human or OpenClaw:
- Director posts task to an Architect's Discord channel
- Architect processes autonomously, posts result
- Director reads result

The only change when switching from human to OpenClaw Director is who types the Discord messages and who reads the responses. The NanoClaw infrastructure doesn't change at all.

---

## 4. NanoClaw Architects — One Per App

### Channel mapping

| App | Discord Channel | JID | Scope |
|-----|----------------|-----|-------|
| PATHS | #paths-eng | dc:1489333519561003119 | apps/paths/ |
| Cubes+ | #cubes-eng | dc:1489333578729918774 | apps/cubes/ |
| HUB | #hub-eng | dc:1489333625571901620 | apps/hub/ |
| DT | #dt-eng | dc:1489333724830240888 | apps/digital-twin/ |
| Infra | #infra-eng | dc:1489333758732664832 | infra/ |

### What each Architect does

When a message arrives on its channel:

1. **Investigate** — read the monorepo (mounted at /workspace/monorepo/) to understand the problem
2. **Plan** — produce specific file changes, verification steps
3. **Execute** — spawn Agent SDK subagents (explorer, planner, executor, debugger, verifier)
4. **Verify** — build passes, health checks green
5. **Report** — post result to Discord channel (Director reads it)

### What each Architect has access to

| Mount | Path | Access |
|-------|------|--------|
| NanoClaw project | /workspace/project | Read-only |
| Group folder | /workspace/group | Read-write (CLAUDE.md, logs, state) |
| Monorepo | /workspace/monorepo | Read-only (codebase investigation) |
| IPC | /workspace/ipc | Read-write (notifications, status) |
| Git worktree | /workspace/extra/monorepo | Read-write (code changes, created per task) |

### Architect CLAUDE.md per app

Each Architect channel gets its own CLAUDE.md in its group folder. It contains:
- The investigate→plan→execute pipeline
- App-specific context (which CLAUDE.md to read, build commands, gotchas)
- The Agent SDK subagent protocol (how to spawn and manage workers)
- Reporting format (how to post results to Discord)

### Why per-app Architects, not per-capability

| Per-app (chosen) | Per-capability (rejected) |
|---|---|
| Each Architect knows ONE app deeply | Each agent knows one skill broadly |
| Matches NanoClaw's one-JID-one-container model | Requires multiple containers for one task |
| Parallel execution automatic (different channels) | Parallel execution requires custom orchestration |
| Cross-app coordination handled by Director (async) | Cross-app needs Architect-level coordination (complex) |
| Maps to real org: "PATHS team", "Cubes+ team" | Maps to abstract: "execution team", "review team" |

---

## 5. Cross-App Coordination

When a change in PATHS affects Cubes+ (e.g., API contract change):

1. PATHS Architect finishes its PR, posts to #paths-eng: "Changed /api/users/me response — added `tier` field"
2. Director (human or OpenClaw) reads the report, recognizes cross-app impact
3. Director posts to #cubes-eng: "PATHS changed /api/users/me response — added `tier` field. Update your auth delegation to handle the new field."
4. Cubes+ Architect investigates, implements, creates PR
5. Director merges both PRs in order

This is async, latency-tolerant, and maps to how real engineering teams coordinate — the VP tells Team B about Team A's change, Team B adapts.

**Future (OpenClaw Director):** OpenClaw detects cross-app impact automatically by reading PR diffs and identifying affected API contracts. Posts to affected Architect channels without human intervention.

---

## 6. Cost Model

| Component | Cost | Justification |
|-----------|------|---------------|
| NanoClaw Architects | $100/mo (Max subscription) | All containers share one subscription via OneCLI |
| OpenClaw Director | $0 (already running on AWS) | Existing infrastructure |
| Hetzner VPS | ~$9/mo (CX33) | NanoClaw + Docker |
| AWS VPS | Existing (Oracle free tier as standby) | OpenClaw Gateway |
| Discord | Free | Communication bus |
| GitHub | Free (public repos) | Code hosting + CI |
| Render | Professional plan (existing) | App hosting |

**Total incremental cost for the division: ~$109/mo** (Max subscription + Hetzner VPS).

Compare: OMX-style API token usage at LIMITLESS's scale (~50 tasks/day × 4 apps × ~$2/task) = **~$400/day = $12,000/mo**. Our architecture is 100x cheaper.

---

## 7. Implementation Plan

### Phase 1: Per-app Architect CLAUDE.md files (immediate)

Create group CLAUDE.md for each Architect channel on the VPS. Each includes:
- App-specific scope and build commands
- Investigate→plan→execute pipeline
- Agent SDK subagent protocol
- Reporting format

**Effort:** Write 5 CLAUDE.md files, deploy to VPS. 1 session.

### Phase 2: Test parallel execution (immediate)

Director posts tasks to two Architect channels simultaneously. Both process in parallel (separate NanoClaw containers). Verify both create PRs independently.

**Effort:** Post tasks, monitor. 30 minutes.

### Phase 3: OpenClaw Director configuration (next)

Configure the existing OpenClaw instance on AWS:
- Add Discord channel (`LIMITLESS Ops` server) to OpenClaw channels
- Create agent profile for CTO role
- Write MEMORY.md with division context
- Set up cron jobs: health check (30min), PR review (1hr), status report (daily)
- Test: CEO posts goal via WhatsApp → OpenClaw decomposes → posts to NanoClaw channels → Architects execute → OpenClaw reports back

**Effort:** 2-3 sessions.

### Phase 4: Cross-app coordination (future)

OpenClaw Director detects cross-app impact from PR diffs:
- Reads merged PR diffs via GitHub API
- Identifies API contract changes (endpoint signatures, response types)
- Automatically posts to affected Architect channels
- Tracks dependency chain in MEMORY.md

**Effort:** 2-3 sessions. Can be deferred until needed.

### Phase 5: Fleet automation (future)

OpenClaw manages VPS fleet via Terraform + Ansible (infra-docs pattern):
- Provisions new Hetzner VPS nodes for scaling
- Deploys NanoClaw + Docker via Ansible playbook
- Registers new Architect channels
- Scales worker capacity dynamically

**Effort:** Multiple sessions. Deferred until scale demands it.

---

## 8. What We Keep from v1

| Infrastructure | Status | Used By |
|---|---|---|
| NanoClaw on Hetzner VPS | Keep | All Architects |
| Docker containers (ephemeral) | Keep | Architect containers |
| Discord channels (5 existing) | Keep — now per-app Architect channels | One per app |
| Bot-message routing (PR #7) | Keep | Director → Architect messages |
| TRUSTED_BOT_IDS (PR #19) | Keep | OpenClaw bot allowed in all channels |
| Credential injection (3-layer) | Keep | GH_TOKEN in all containers |
| Monorepo mount (PR #22) | Keep | Architect codebase investigation |
| IPC notification relay (PR #10) | Keep | Architect → Discord reports |
| Agent SDK subagents | Keep — this is now the ONLY orchestration model | Within each Architect |
| Enforcement hooks (AGENT_SCOPE) | Keep | File access boundaries |

### What we deprecate from v1

| Infrastructure | Why |
|---|---|
| IPC spawn_container operation | Not needed — NanoClaw handles container spawn via Discord messages |
| Worker slots in Architect CLAUDE.md | Each Architect IS a slot — no slot management needed |
| Team workspace / peer communication | Subagents share memory within Agent SDK — no filesystem coordination |
| Custom heartbeat monitoring | Agent SDK tracks subagent state |
| Task lifecycle state machine (tasks.json) | Agent SDK manages task lifecycle |
| The "worker" abstraction entirely | Replaced by Agent SDK subagents within each Architect |

---

## 9. What This Spec Does NOT Cover

- OpenClaw internal configuration (agent profile, SOUL.md, TOOLS.md) — separate spec
- Ansible playbook for Hetzner VPS provisioning — separate task
- Oracle Cloud standby VPS — deferred until production demands it
- Architect-to-Architect direct communication without Director relay — not needed at current scale
- Budget/cost alerts for Max subscription usage — deferred

---

## 10. Validation Criteria

The architecture is validated when:

1. **Parallel execution:** Director posts to #paths-eng and #cubes-eng simultaneously → both create PRs independently
2. **Autonomous investigation:** Director says "fix X" without file paths → Architect finds the code and fixes it (already verified)
3. **OpenClaw compatibility:** Replacing human Director messages with `openclaw message send` produces identical results
4. **Cross-app coordination:** PATHS change → Director posts to Cubes+ → Cubes+ adapts
5. **Day-long autonomy:** Director posts morning goals, comes back EOD to merged PRs and status report
