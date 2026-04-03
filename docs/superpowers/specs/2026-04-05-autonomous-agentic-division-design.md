# Autonomous Agentic Software Development Division — System Design

**Date:** 2026-04-05
**Author:** Architect (Main Instance), with Director input
**Classification:** Internal — Division Director
**Status:** DRAFT — Pending Director Review
**Supersedes:** Sections 3.1-3.4 of `2026-04-02-agentic-division-implementation-plan.md` (agent topology, registry, operational model, division of labour)

---

## 1. The Problem with Our Current Design

Our agentic division plan (April 2, all 5 phases "complete") delivered infrastructure but not autonomy. The Director still manually chains every step:

1. Director opens terminal, launches Architect
2. Architect reads Discord, plans work, creates handoffs
3. Architect posts to Discord, then waits
4. **Director opens another terminal**, launches specialist engineer
5. Engineer picks up handoff, executes, creates PR, posts completion
6. **Director opens another terminal**, launches QA
7. QA verifies, posts results
8. Director reviews everything

Steps 4 and 6 are the bottleneck. No agent can spawn another agent. The Architect can write a handoff but cannot start an executor. The "stop hook relay" was supposed to automate the chain but was removed because it was unreliable.

**What OMX demonstrated:** A human types one instruction into Discord and walks away. Agents plan, decompose, spawn workers, execute in parallel, verify, debug failures, and report completion — hours later, the human reviews finished work. The human monitors; the agents execute.

**What we need:** The same pattern, built on our existing infrastructure (NanoClaw + Discord + monorepo + hooks).

---

## 2. Design Principles

### 2.1 Capability Over Domain

Agents are defined by **what type of work they do** (explore, plan, execute, debug, verify, review), not **which app they work on** (PATHS, HUB, Cubes+). Domain context comes from the codebase (`apps/*/CLAUDE.md`), injected at spawn time based on the task's scope.

**Why:** We are building a software development division — a general-purpose capability that can be directed at any project. Domain-specific agents lock us to our current apps and require new definitions for every new project.

### 2.2 Orchestrator-Spawns-Workers

The Architect is a persistent orchestrator that can programmatically spawn capability agents via NanoClaw. Workers are ephemeral containers that receive a task, execute it, report back, and die.

**Why:** This eliminates the human-in-the-middle bottleneck. The Director defines the goal; the Architect decomposes and dispatches; workers execute.

### 2.3 Shared State, Not Human Relay

Agents communicate through structured mechanisms — NanoClaw IPC, Discord channels, and filesystem state — not by posting messages that a human reads and re-types into another terminal.

**Why:** Human relay is the slowest, most error-prone step. Every handoff that goes through the Director adds hours of latency and loses context.

### 2.4 Director Monitors, Doesn't Operate

The Director's role shifts from **operator** (launching agents, forwarding messages) to **monitor** (watching progress, intervening on escalations). The Director should be able to give a task, close their laptop, and come back to finished work.

**Why:** This is the demonstrated capability of OMX-orchestrated agents. It's also the only model that scales — a human can monitor 10 agents but can't manually operate 10 terminals.

---

## 3. Capability-Based Agent Catalog

### 3.1 Agent Roles

| Role | Capability | Model | Reasoning | Spawned By |
|------|-----------|-------|-----------|------------|
| **Architect** | Orchestration: task decomposition, agent spawning, PR review, cross-cutting coordination | Opus | High | Director (persistent) |
| **Planner** | Task analysis: dependency ordering, risk assessment, spec generation | Opus | High | Architect |
| **Explorer** | Fast read-only codebase analysis, impact assessment, question answering | Sonnet | Medium | Architect |
| **Executor** | Writes code against a spec/handoff — the primary production agent | Opus | High | Architect |
| **Debugger** | Diagnosis-first investigation, surgical fixes, root cause analysis | Opus | High | Architect |
| **Verifier** | Build verification, health checks, acceptance testing, Playwright smoke tests | Sonnet | Medium | Architect |
| **Test Engineer** | Writes tests (unit, integration, e2e) — does NOT write features | Sonnet | Medium | Architect |
| **Code Reviewer** | Quality review: patterns, security (OWASP), performance, style | Opus | High | Architect (or CI automated) |

### 3.2 Domain Scoping (Runtime, Not Identity)

Each agent receives domain context at spawn time via two parameters:

- **`AGENT_SCOPE`** — filesystem boundary (e.g., `apps/paths`, `apps/cubes`, `infra`, `*`)
- **`AGENT_CONTEXT`** — path to the relevant CLAUDE.md (e.g., `apps/paths/CLAUDE.md`)

The same Executor role can work on PATHS, Cubes+, or any future app. The hook system (`enforce-repo-boundary.sh`) reads `AGENT_SCOPE` to enforce file access boundaries.

```
# Architect spawns an executor scoped to PATHS
Architect → NanoClaw: spawn(role=executor, scope=apps/paths, task="Fix lesson redirect")

# Same executor role, different scope
Architect → NanoClaw: spawn(role=executor, scope=apps/cubes, task="Add media upload endpoint")
```

### 3.3 Model Routing

| Reasoning Level | Model | Use For | Cost |
|----------------|-------|---------|------|
| High | Opus | Architect, Planner, Executor, Debugger, Code Reviewer | Full price |
| Medium | Sonnet | Explorer, Verifier, Test Engineer | ~5x cheaper |
| Low | Haiku | Health checks, simple formatting, log parsing | ~20x cheaper |

The Architect selects the model when spawning a worker based on task complexity. Simple exploration or verification doesn't need Opus.

---

## 4. Autonomous Orchestration Model

### 4.1 The Core Loop

```
Director posts task to #human
  │
  ▼
ARCHITECT (persistent on VPS, wakes on Discord message)
  │
  ├─ 1. Analyze task complexity
  │     - Simple (single-file fix): spawn 1 executor directly
  │     - Medium (multi-file feature): spawn planner first, then executors
  │     - Complex (cross-app, architectural): run planner→architect review→executor chain
  │
  ├─ 2. Decompose into subtasks (if medium/complex)
  │     - Each subtask: { role, scope, task_description, depends_on, verify_steps }
  │     - Post plan to #main-ops for Director visibility (NOT approval — monitoring only)
  │
  ├─ 3. Spawn workers via NanoClaw
  │     - Independent subtasks: spawn in parallel
  │     - Dependent subtasks: spawn sequentially (wait for dependency to complete)
  │     - Each worker: ephemeral container with role + scope + task
  │
  ├─ 4. Monitor workers
  │     - NanoClaw IPC: heartbeat, status, completion signals
  │     - Discord: workers post progress to #workbench-ops
  │     - On failure: spawn debugger scoped to the failing worker's scope
  │     - On stuck (3+ iterations same error): escalate to #alerts for Director
  │
  ├─ 5. Verify results
  │     - Spawn verifier for each completed subtask
  │     - Verifier runs: build, health check, acceptance test
  │     - On failure: feed error back to executor for retry (max 2 retries)
  │
  ├─ 6. Integrate
  │     - Review PRs created by executors
  │     - Merge (if Architect has approval authority) or request Director merge
  │     - Trigger deploy, wait for health check
  │
  └─ 7. Report
        - Post completion summary to #main-ops
        - Include: what was done, PRs merged, verification results, any issues
        - Director reviews asynchronously
```

### 4.2 Worker Lifecycle

```
SPAWNED ──[NanoClaw creates container]──> INITIALIZING
  │                                            │
  │                              [reads CLAUDE.md, task, scope]
  │                                            │
  │                                            ▼
  │                                        EXECUTING
  │                                            │
  │                              ┌─────────────┴─────────────┐
  │                              │                           │
  │                         [task done]                [error/blocked]
  │                              │                           │
  │                              ▼                           ▼
  │                         COMPLETING                  REPORTING
  │                              │                      (to Architect)
  │                              │                           │
  │                    [PR created, posted                    │
  │                     to #workbench-ops]                    │
  │                              │                           │
  │                              ▼                           ▼
  └────────────────────── TERMINATED ◄───────────── TERMINATED
                        (container removed)
```

### 4.3 Inter-Agent Communication

| Channel | Mechanism | Direction | Content |
|---------|-----------|-----------|---------|
| Task assignment | NanoClaw IPC (container inbox) | Architect → Worker | Task spec, scope, verify steps |
| Progress updates | Discord #workbench-ops | Worker → All | Status, blockers, PR links |
| Completion signal | NanoClaw IPC (mailbox) | Worker → Architect | Success/failure, PR URL, artifacts |
| Escalation | Discord #alerts | Any → Director | Stuck, failed, needs human decision |
| Monitoring | Discord #main-ops | Architect → Director | Plan, progress summary, completion |
| Director commands | Discord #human | Director → Architect | New tasks, approvals, overrides |

### 4.4 What the Architect Can Do Autonomously

| Action | Autonomous? | Rationale |
|--------|-------------|-----------|
| Decompose task into subtasks | Yes | Core orchestration capability |
| Spawn executor/debugger/verifier containers | Yes | Operational necessity |
| Create and post handoffs | Yes | Already approved in current CLAUDE.md |
| Review PRs (non-architectural) | Yes | Routine quality gate |
| Merge PRs to main | **Director approval required** | Deploys to production |
| Retry failed workers (up to 2x) | Yes | Self-healing |
| Escalate stuck workers to #alerts | Yes | Defined escalation path |
| Modify NanoClaw code | **PR + Director review** | Self-modification governance (existing spec) |
| Create new agent roles | **Director approval required** | Structural change |

### 4.5 Failure Handling

| Failure | Response | Escalation |
|---------|----------|------------|
| Worker build fails | Architect spawns debugger with error context | After 2 debugger attempts: escalate to Director |
| Worker stuck (same error 3x) | Architect halts worker, posts to #alerts | Director intervention required |
| Worker timeout (no heartbeat 30min) | Architect terminates container, reassigns task | Log incident, retry once |
| Architect itself crashes | NanoClaw restarts container (systemd) | Director launches local Architect as fallback |
| All workers fail on same task | Architect posts diagnosis to #alerts, halts | Director reviews and re-scopes task |
| Cross-app dependency conflict | Architect sequences work (dependent tasks wait) | If deadlock detected: escalate |

---

## 5. Notification Architecture: Out-of-Band Communication

### 5.1 The Problem: Discord Pollutes Agent Context

Every Discord MCP call (reply, fetch_messages, react) consumes context tokens inside the agent's session. An executor that posts 5 progress updates to #workbench-ops burns context on communication overhead instead of coding. Over a long task, this compounds — the agent's effective working memory shrinks because it's full of Discord API receipts.

This is the same problem clawhip solves in the OMX stack: agent sessions should not carry the weight of notification logic.

### 5.2 The Solution: Workers Never Touch Discord

**Principle:** Workers communicate exclusively through NanoClaw IPC. The NanoClaw host process — which already runs a Discord bot connection — handles all Discord posting on workers' behalf. Workers never see Discord; their context stays 100% focused on code.

**Architecture:**

```
┌─────────────────┐     IPC filesystem      ┌─────────────────────────┐
│  EXECUTOR        │ ──── writes events ───> │  NanoClaw Host Process  │
│  (container)     │                         │                         │
│  No Discord MCP  │                         │  - Reads IPC events     │
│  Context = code  │                         │  - Formats messages     │
│                  │ <─── reads inbox ────── │  - Posts to Discord     │
└─────────────────┘                          │  - Routes responses     │
                                             │    back to IPC inbox    │
                                             └────────────┬────────────┘
                                                          │
                                                     Discord API
                                                          │
                                              ┌───────────▼──────────┐
                                              │  #workbench-ops      │
                                              │  #main-ops           │
                                              │  #alerts             │
                                              └──────────────────────┘
```

**Worker event format** (written to IPC):

```json
{
  "type": "notification",
  "channel": "workbench-ops",
  "message": "[EXECUTOR] PR #80 created — lesson redirect fix. Build passing.",
  "priority": "normal"
}
```

```json
{
  "type": "notification",
  "channel": "alerts",
  "message": "[EXECUTOR] Build failed after 2 attempts. Error: missing dependency @payload-config. Escalating.",
  "priority": "urgent"
}
```

```json
{
  "type": "completion",
  "status": "success",
  "pr_url": "https://github.com/LIMITLESS-LONGEVITY/limitless/pull/80",
  "summary": "Fixed lesson redirect: added basePath to window.location.href in 2 files"
}
```

NanoClaw host reads these from the worker's IPC directory, formats them, and posts to the specified Discord channel. The worker's context window never sees a Discord tool call.

### 5.3 The Architect Keeps Discord MCP

The Architect is the exception. It needs bidirectional Discord communication:

- **Read** #human for Director commands
- **Read** #handoffs for pending work
- **Read** #workbench-ops for worker status (though IPC is primary)
- **Write** to #main-ops for briefings and reports
- **Write** to #alerts for escalations

This context cost is acceptable because **orchestration IS the Architect's job**. Those tokens aren't wasted — they're the Architect's primary function. The Architect is also a persistent, long-running process that benefits from full Discord awareness.

### 5.4 What This Means for Context Budgets

| Agent | Discord MCP | Context Overhead | Effective Working Memory |
|-------|-------------|-----------------|------------------------|
| Architect | Yes (bidirectional) | ~10-15% on Discord | 85-90% for orchestration |
| Executor | **No** (IPC only) | ~0% on Discord | **~100% for coding** |
| Debugger | **No** (IPC only) | ~0% on Discord | **~100% for diagnosis** |
| Verifier | **No** (IPC only) | ~0% on Discord | **~100% for verification** |
| Planner | **No** (IPC only) | ~0% on Discord | **~100% for planning** |
| Explorer | **No** (IPC only) | ~0% on Discord | **~100% for analysis** |

Workers that previously lost 15-20% of their context to Discord communication now have that budget available for actual work. On a 200K context window, that's 30-40K tokens recovered — equivalent to reading several more source files or maintaining longer chain-of-thought reasoning.

### 5.5 NanoClaw Implementation

This requires a new IPC event type in NanoClaw:

| IPC Message Type | Direction | Purpose |
|-----------------|-----------|---------|
| `notification` | Worker → Host | Post a message to a Discord channel |
| `completion` | Worker → Host → Architect | Signal task done, with results |
| `heartbeat` | Worker → Host | Liveness signal |
| `spawn` | Architect → Host | Request new container (Section 6.1) |
| `inbox` | Host → Worker | Task assignment, Architect messages |

The host process polls each container's IPC directory for new event files, processes them, and deletes after delivery. This is the same pattern NanoClaw already uses for IPC — we're adding new message types, not a new mechanism.

---

## 6. Implementation: What Needs to Change

### 6.1 NanoClaw Changes Required

| Change | Tier | Description |
|--------|------|-------------|
| **Bot-message routing** | 3 (PR + review) | Allow Architect bot to trigger engineer containers (existing spec, Section 5) |
| **Programmatic container spawn** | 3 (PR + review) | Architect container can request NanoClaw to spawn a new container with specified role/scope/task via IPC |
| **Notification relay** | 2 (PR) | Host process reads `notification` events from worker IPC dirs, posts to Discord on their behalf (Section 5) |
| **Worker mailbox** | 2 (PR) | Completion/failure signal from worker back to Architect via IPC filesystem |
| **Heartbeat monitoring** | 2 (PR) | Workers write heartbeat file every 5 min; Architect reads to detect stale workers |
| **Role + scope injection** | 1 (autonomous) | Pass `AGENT_ROLE` and `AGENT_SCOPE` as env vars to spawned containers |

The **programmatic container spawn** is the critical new capability. Currently, NanoClaw only spawns containers in response to Discord messages. We need the Architect container to trigger spawns via the IPC system:

```
Architect writes to IPC: { "action": "spawn", "group": "executor-1", "role": "executor", "scope": "apps/paths", "task": "..." }
NanoClaw host process reads IPC, creates container for group "executor-1"
Container starts with AGENT_ROLE=executor, AGENT_SCOPE=apps/paths, task injected via inbox
```

### 6.2 Agent Definition Changes

Replace domain-specific agent definitions (`.claude/agents/*.md`) with capability-based definitions:

| Current File | New File | Change |
|---|---|---|
| `paths-engineer.md` | **DELETE** | Replaced by generic `executor.md` + scope |
| `hub-engineer.md` | **DELETE** | Same |
| `dt-engineer.md` | **DELETE** | Same |
| `cubes-engineer.md` | **DELETE** | Same |
| `infra-engineer.md` | **DELETE** | Same |
| `qa-operator.md` | `verifier.md` | Rename + generalize |
| (new) | `executor.md` | Generic code execution agent |
| (new) | `planner.md` | Task decomposition agent |
| (new) | `explorer.md` | Read-only analysis agent |
| (new) | `debugger.md` | Diagnosis + fix agent |
| (new) | `test-engineer.md` | Test writing agent |
| (new) | `code-reviewer.md` | Quality review agent |
| `architect.md` | `architect.md` | Update: add orchestration, spawning, monitoring capabilities |

### 6.3 Hook Changes

| Hook | Change |
|------|--------|
| `enforce-repo-boundary.sh` | Read `AGENT_SCOPE` env var (not `AGENT_ROLE`) for file access |
| `enforce-division-of-labour.sh` | Update: Architect still can't write app code; executors can't write docs/specs |
| `validate-handoff.sh` | Add: check that Tasks section contains specific file paths or code references (specificity gate) |

### 6.4 Discord Channel Changes

| Current | Change | Rationale |
|---------|--------|-----------|
| #main-ops | Keep | Architect reports to Director |
| #workbench-ops | Keep | All workers report progress |
| #handoffs | **Repurpose** | Architect-to-worker task assignment (structured, not free-form) |
| #alerts | Keep | Escalations to Director |
| #human | Keep | Director commands to Architect |
| #paths-eng, #cubes-eng, etc. | **Consolidate to #workers** | Workers are capability-based, not domain-based; one channel suffices |

### 6.5 CLAUDE.md Changes

Add to main CLAUDE.md:

```markdown
## Autonomous Orchestration Protocol

When the Director posts a task to #human:
1. Architect analyzes complexity and decomposes into subtasks
2. Architect spawns capability agents (executor, debugger, verifier) via NanoClaw IPC
3. Workers execute autonomously, posting progress to #workbench-ops
4. Architect monitors, handles failures, spawns verifiers
5. On completion: Architect posts summary to #main-ops
6. Director reviews asynchronously — intervenes only on escalations (#alerts)

The Director does NOT need to:
- Launch individual agents
- Forward messages between agents
- Approve each subtask (only PR merges to main)
- Be online during execution
```

---

## 7. How a Task Flows (End-to-End Example)

**Director posts to #human:**
> Fix the lesson completion 404 redirect and the Discover page slug links. Both are in PATHS.

**Architect (autonomous from here):**

1. **Analyzes:** Two bugs in PATHS, both frontend. Medium complexity — clear fix paths exist in the handoffs (O/Q/R).

2. **Plans:** Two independent subtasks. Can parallelize.
   - Posts to #main-ops: "Executing 2 PATHS fixes in parallel. ETA: ~20 min per fix."

3. **Spawns workers:**
   - Executor-1: `role=executor, scope=apps/paths, task="Fix lesson redirect — add basePath to window.location.href"`, worktree branch `fix/lesson-redirect`
   - Executor-2: `role=executor, scope=apps/paths, task="Fix Discover links — resolve slugs in endpoint"`, worktree branch `fix/discover-slugs`

4. **Workers execute in parallel:**
   - Executor-1: reads PATHS CLAUDE.md, makes changes, runs `pnpm build`, creates PR #80
   - Executor-2: reads PATHS CLAUDE.md, makes changes, runs `pnpm build`, creates PR #81
   - Both post progress to #workbench-ops

5. **Architect monitors:**
   - Receives completion signals via IPC
   - Spawns Verifier-1: `role=verifier, scope=apps/paths, task="Verify PR #80 — lesson redirect works"`
   - Spawns Verifier-2: `role=verifier, scope=apps/paths, task="Verify PR #81 — Discover links resolve"`

6. **Verifiers check:**
   - Build passes, health check 200, Playwright test confirms navigation works
   - Post results to #workbench-ops

7. **Architect reports:**
   - Posts to #main-ops: "2 PATHS fixes complete. PRs #80 and #81 ready for merge. Verified: builds pass, navigation works, slugs resolve."

8. **Director (async):** Reviews PRs, merges, moves on with their day.

**Total Director involvement:** One Discord message + two PR merge clicks. Everything else was autonomous.

---

## 8. Implementation Phases

| Phase | What | Depends On | Duration |
|-------|------|-----------|----------|
| **A** | Capability-based agent definitions (executor.md, planner.md, etc.) | Nothing | 1 session |
| **B** | NanoClaw bot-message fix (existing spec, Section 5) | Fork created | 1 session |
| **C** | NanoClaw programmatic spawn via IPC | Phase B | 1-2 sessions |
| **D** | NanoClaw notification relay (worker IPC → Discord) | Phase B | 1 session |
| **E** | Worker mailbox + heartbeat monitoring | Phase C | 1 session |
| **F** | Architect orchestration loop (plan → spawn → monitor → verify → report) | Phase C + E | 2 sessions |
| **G** | Hook updates (AGENT_SCOPE, specificity gate) | Phase A | 1 session |
| **H** | Git worktree isolation for parallel workers | Phase C | 1 session |
| **I** | End-to-end test: Director posts task → autonomous execution → completion | All above | 1 session |

**Phases A and G can run in parallel with B-E** (agent definitions + hooks don't require NanoClaw changes).

**Phase D (notification relay) can run in parallel with C** (both extend NanoClaw IPC, independent features).

**Critical path:** B → C → E → F → I (NanoClaw must support programmatic spawn + mailbox before the orchestration loop can work).

**Blocker:** Phase B requires the Director to create `LIMITLESS-LONGEVITY/nanoclaw` fork on GitHub (Step 1 from governance spec).

---

## 9. What This Enables

Once implemented, the LIMITLESS agentic division becomes:

1. **Autonomous:** Director defines goals, agents execute. Human involvement drops from every step to monitoring + PR merges.

2. **Portable:** Capability-based roles work on any codebase. Point the division at a new project by adding a CLAUDE.md — no new agent definitions needed.

3. **Parallel:** Multiple executors work simultaneously in isolated worktrees. A feature and a bug fix happen at the same time.

4. **Self-healing:** Failed workers trigger debuggers automatically. Stuck workers escalate. The Architect retries before bothering the Director.

5. **Cost-efficient:** Model routing sends exploration to Sonnet and debugging to Opus. Only complex tasks consume premium tokens.

6. **Observable:** Every step posts to Discord. The Director can follow progress from their phone without being in a terminal.

This is the same operational model that Sigrid Jin and Yeachan Heo demonstrated with claw-code: **one human, many autonomous agents, Discord as the interface, results by morning.**

---

## 10. Open Questions for Director

| # | Question | Options |
|---|----------|---------|
| 1 | **PR merge authority** — should the Architect be able to merge PRs autonomously (with CI passing), or require Director approval for every merge? | A: Architect merges autonomously if CI passes + verifier approves. B: Director merges all. C: Architect merges P2/P3, Director merges P0/P1. |
| 2 | **Worker concurrency limit** — how many simultaneous workers on the CX33 VPS? | A: 2 (conservative, ~3GB RAM each). B: 3 (moderate). C: 4 (aggressive, may need CX42 upgrade). |
| 3 | **NanoClaw fork timing** — create the fork now to unblock Phase B? | A: Yes, create now. B: After reviewing this spec. |
| 4 | **Domain-specific engineer channels** — consolidate #paths-eng/#cubes-eng/etc. into #workers, or keep them? | A: Consolidate (simpler, capability-based). B: Keep (familiar, domain context in channel history). |
| 5 | **Scope of Phase A** — rewrite all agent definitions now, or create new ones alongside existing? | A: Clean break — delete domain agents, create capability agents. B: Parallel — keep both during transition. |
