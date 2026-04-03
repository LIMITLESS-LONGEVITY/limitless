# Agentic Division — Organizational Hierarchy & Communication Architecture

**Date:** 2026-04-05
**Author:** Architect + Director
**Classification:** Internal — Division Director
**Status:** DRAFT — Pending Director Review
**Amends:** `2026-04-05-autonomous-agentic-division-design.md` (Sections 2, 4, 6)

---

## 1. Problem Statement

The division has working infrastructure (NanoClaw, IPC, containers, credentials, CI) but operates with a flat hierarchy where the Director does the Architect's job. Three structural gaps prevent the division from functioning like a real software development organization:

### Gap 1: Director operates at the wrong level of abstraction

The Director provides implementation details (file paths, line numbers, code diffs) to the Architect, who relays them to executors. This is a CEO writing Jira tickets with code snippets for junior engineers. The Architect should independently investigate, analyze, plan, and produce implementation details from high-level goals.

**Evidence:** Every task posted to #main-ops in the F.4 test included specific file paths, exact code changes, and verification commands — all produced by the local Architect (the Director's Claude Code session), not by the VPS Architect.

### Gap 2: Workers cannot communicate peer-to-peer

All communication flows through the Architect (hub-and-spoke). Worker A cannot tell Worker B "I changed the API response format" or "don't modify auth.ts, I'm refactoring it." This forces serial execution or risks conflicts in parallel work.

**Root cause:** NanoClaw IPC authorization restricts non-main groups to sending messages only to their own JID. No shared workspace exists between workers on the same task.

### Gap 3: NanoClaw maps one channel to one container

Each Discord channel JID maps to exactly one registered group. Parallel workers need separate channels. The "consolidate to #workers" decision (Decision #4) conflicts with NanoClaw's architecture.

**Evidence:** IPC spawn test revealed that registering a new group on the #workers JID replaced the existing registration (SQLite `INSERT OR REPLACE` on primary key).

---

## 2. Organizational Model

The division models a real software development company hierarchy:

```
┌─────────────────────────────────────────────────────────────┐
│                    DIVISION DIRECTOR                         │
│                    (Human — CEO)                             │
│                                                              │
│  Sets strategy · Reviews outcomes · Approves architecture    │
│  Intervenes on escalations · Does NOT provide impl details   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │  Strategic goals + priorities
                           │  "Fix the timeout issue"
                           │  "Ship wearable integration by June"
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    ARCHITECT                                  │
│                    (VPS — CTO/VP Engineering)                 │
│                                                              │
│  Investigates codebase · Produces plans · Spawns workers     │
│  Monitors progress · Handles failures · Merges PRs           │
│  Reports outcomes to Director (not implementation details)   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │  Detailed tasks with file paths,
                           │  code context, verification steps
                           │
        ┌──────────┬───────┴───────┬──────────┐
        │          │               │          │
   ┌────▼───┐ ┌───▼───┐     ┌────▼───┐ ┌───▼────┐
   │Worker 1│ │Worker 2│     │Worker 3│ │Worker 4│
   │Executor│ │Executor│ ... │Debugger│ │Verifier│
   │paths   │ │cubes   │     │paths   │ │  *     │
   └───┬────┘ └───┬────┘     └───┬────┘ └────────┘
       │          │               │
       └────peer──┴───────peer────┘
       Shared team workspace
       (coordination, file locks, messages)
```

### Communication Boundaries

| From → To | Channel | Content | What is NOT communicated |
|-----------|---------|---------|--------------------------|
| Director → Architect | Discord #main-ops, #human | Strategic goals, priorities, approvals | File paths, code, implementation details |
| Architect → Director | Discord #main-ops | Outcomes, PR summaries, escalations | Worker-level heartbeats, per-file changes |
| Architect → Workers | IPC task assignment | Detailed tasks with file paths, verification steps | Strategy, business context |
| Workers → Architect | IPC status (heartbeat, completion, failure) | Build results, PR URLs, errors | Peer coordination messages |
| Worker ↔ Worker | Shared team workspace filesystem | Changed files, locks, coordination | Status reports (those go to Architect) |
| Director → Workers | **NEVER** — Director doesn't interact with workers directly | — | — |
| Workers → Director | **NEVER** — workers escalate to Architect, who escalates to Director | — | — |

---

## 3. Architect Autonomy — Explore→Plan→Execute Pipeline

### The Problem with the Current Core Loop

The current Architect CLAUDE.md says:
> "1. Analyze complexity... 2. Specificity check... 3. Spawn workers"

But "analyze" currently means: read the Director's detailed instructions and decide if they're specific enough. The Architect doesn't independently investigate the codebase.

### The New Core Loop

When the Director gives a high-level goal:

```
Director: "The AI tutor is too slow — users are timing out"

ARCHITECT (autonomous from here):

1. INVESTIGATE
   - Read relevant CLAUDE.md for the affected app (apps/paths/CLAUDE.md)
   - Search the codebase for AI/tutor-related code
   - Read the model configuration, endpoint handlers, timeout settings
   - Identify the root cause (slow model, missing timeout, no loading UX)

2. PLAN
   - Produce specific changes: which files, what to change, why
   - Determine dependencies: can changes be parallelized?
   - Define verification steps for each change
   - Assess risk: does this touch auth, migrations, or cross-app contracts?

3. SPAWN
   - Create detailed task per worker with file paths and code context
   - Assign to worker slots (one per parallel task)
   - Workers receive the Architect's analysis, not the Director's words

4. MONITOR
   - Read worker status from team workspace
   - Handle failures: spawn debugger, retry, escalate
   - Track iteration count and same-error detection

5. VERIFY
   - Spawn verifier for each completed task
   - Run builds, health checks, acceptance tests

6. INTEGRATE
   - Review PRs for correctness and scope
   - Merge if CI passes (notify Director)
   - Trigger deploy, verify health endpoints

7. REPORT
   - Post to #main-ops: what was accomplished, PRs merged, deploy status
   - High-level only: "Fixed AI tutor timeout — switched model, added loading UX"
   - NOT: "Changed line 45 in models.ts from X to Y"
```

### What the Architect Needs to Investigate Autonomously

The Architect's container has `/workspace/project` (NanoClaw root, read-only). But for codebase investigation it needs the **monorepo**. Two approaches:

**Option A:** Mount the monorepo read-only into the Architect container via additionalMounts. The Architect can read all app code, CLAUDE.md files, and documentation.

**Option B:** The Architect spawns an Explorer first (fast, Sonnet, read-only) to gather information, then plans based on Explorer's findings.

**Recommendation:** Option A for the Architect (persistent, needs broad context) + Option B for complex tasks (Explorer provides deep analysis). The Architect does quick investigation itself; for complex issues it delegates deep analysis to an Explorer.

---

## 4. Worker Peer Communication — Shared Team Workspace

### Architecture

For each task group (set of workers on related work), the Architect creates a shared team directory:

```
data/teams/{task-id}/
├── plan.md                    ← Architect writes: full plan, all subtasks
├── coordination/
│   ├── {worker-folder}.json   ← Each worker writes: status, changed files, current action
│   └── locks/
│       └── {file-path-hash}.json  ← File locks to prevent edit conflicts
└── messages/
    ├── {sender}-to-{target}.json  ← Direct peer messages
    └── broadcast.json             ← Messages to all workers in team
```

### Worker Coordination Protocol

**On start:** Worker reads `plan.md` and all files in `coordination/` to understand the full context and what peers are doing.

**Before editing a file:** Worker checks `locks/` for the file. If locked by another worker, either wait or work on a different file. If unlocked, create a lock:
```json
{
  "lockedBy": "worker-a-folder",
  "file": "src/routes/health.ts",
  "lockedAt": "2026-04-05T10:15:00Z",
  "reason": "Adding version field"
}
```

**After editing:** Worker updates `coordination/{worker-folder}.json`:
```json
{
  "status": "executing",
  "iteration": 2,
  "changedFiles": ["src/routes/health.ts"],
  "currentAction": "Running build verification",
  "lastUpdate": "2026-04-05T10:20:00Z"
}
```

**To message a peer:** Write to `messages/{me}-to-{them}.json`:
```json
{
  "from": "worker-a-folder",
  "to": "worker-b-folder",
  "message": "I changed the health endpoint response format — added version field. If you're consuming /api/health, expect the new field.",
  "timestamp": "2026-04-05T10:22:00Z"
}
```

**On start of each iteration:** Read `messages/` for any peer messages addressed to you. Acknowledge by deleting after reading.

### NanoClaw Implementation

**Container mount:** When spawning a worker with a `teamId` in `containerConfig`, mount the team directory:

```typescript
// In container-runner.ts buildVolumeMounts():
if (!isMain && group.containerConfig?.teamId) {
  const teamDir = path.join(DATA_DIR, 'teams', group.containerConfig.teamId);
  fs.mkdirSync(teamDir, { recursive: true });
  fs.mkdirSync(path.join(teamDir, 'coordination'), { recursive: true });
  fs.mkdirSync(path.join(teamDir, 'coordination', 'locks'), { recursive: true });
  fs.mkdirSync(path.join(teamDir, 'messages'), { recursive: true });
  mounts.push({
    hostPath: teamDir,
    containerPath: '/workspace/team',
    readonly: false,
  });
}
```

**Architect access:** The Architect also reads team directories (it has `/workspace/project` which includes `data/teams/`). No additional mount needed for the main group.

**Cleanup:** When all tasks in a team are completed, the Architect writes a deregister for each worker. Team directory is retained for debugging (pruned by the 24h orphan cleanup cron).

### What This Enables

- Worker A changes an API endpoint → writes to coordination → Worker B reads it before making frontend changes
- Worker A is editing `auth.ts` → creates lock → Worker B sees lock, works on a different file
- Debugger reads all coordination files to understand what workers did before the failure occurred
- Verifier reads all changed files lists to know what to test

---

## 5. Worker Slots — Repurposing Domain Channels

### Reversal of Decision #4

Decision #4 ("consolidate domain channels to #workers") is reverted. The 5 existing domain Discord channels are repurposed as numbered worker slots:

| Slot | Channel | JID | Available |
|------|---------|-----|-----------|
| 1 | #paths-eng | `dc:1489333519561003119` | Yes |
| 2 | #cubes-eng | `dc:1489333578729918774` | Yes |
| 3 | #hub-eng | `dc:1489333625571901620` | Yes |
| 4 | #dt-eng | `dc:1489333724830240888` | Yes |
| 5 | #infra-eng | `dc:1489333758732664832` | Overflow |

### How Slots Work

1. Architect selects an available slot (not currently registered to an active worker)
2. Registers the slot JID with `containerConfig` for the current task (role, scope, teamId)
3. Sends task message to the slot's Discord channel
4. NanoClaw spawns container for that slot
5. On completion: Architect deregisters the slot → available for next task

### Slot Availability Tracking

The Architect maintains slot state in `tasks.json`:

```json
{
  "slots": {
    "dc:1489333519561003119": { "status": "available" },
    "dc:1489333578729918774": { "status": "occupied", "taskId": "task-001", "worker": "executor-paths" },
    "dc:1489333625571901620": { "status": "available" },
    "dc:1489333724830240888": { "status": "available" },
    "dc:1489333758732664832": { "status": "available" }
  }
}
```

### Why Not Create New Channels

Creating Discord channels requires bot permissions we don't have (Manage Channels). The 5 existing channels are already registered, have bot access, and provide sufficient parallelism (4 concurrent workers + 1 overflow).

If we need more than 5 parallel workers in the future, the Director creates additional channels manually (30 seconds each).

---

## 6. Director Interface

### What the Director Says

| Type | Example |
|------|---------|
| Bug report | "The AI tutor times out after 30 seconds — users see nothing" |
| Feature request | "Add a feedback widget to the course completion page" |
| Priority | "Fix the timeout before working on the feedback widget" |
| Strategic | "Ship Garmin integration by end of June" |
| Approval | "Yes, merge it" / "No, the approach is wrong because..." |

### What the Director Does NOT Say

| Type | Example (DO NOT DO THIS) |
|------|--------------------------|
| Implementation detail | "In src/ai/models.ts, change the model to gpt-4o-mini" |
| Orchestration | "Spawn an executor scoped to apps/paths" |
| File paths | "The bug is in page.tsx line 72" |
| Code snippets | "Add `const base = process.env.NEXT_PUBLIC_BASE_PATH`" |

### What the Director Receives

| Type | Example |
|------|---------|
| Completion report | "AI tutor timeout fixed — switched to faster model, added loading indicator, 30s client timeout. PR #21 merged, deployed, health check green." |
| Escalation | "Worker stuck on migration — feedback table doesn't exist in DB. Need direction: create the table or defer the feature?" |
| Weekly report | "5 PRs merged, 2 bugs fixed, 1 feature shipped. No incidents." |

### Enforcement

The Director interface simplification is behavioral — it's how the Director chooses to communicate. It cannot be enforced by hooks (the Director is human, not an agent). But the Architect's CLAUDE.md should explicitly state:

> When the Director provides a high-level goal, DO NOT ask for file paths or implementation details. Investigate the codebase yourself. You have read access to the full monorepo. Use your tools to find the relevant code, understand the problem, and produce a plan.

---

## 7. Implementation Plan

| Phase | Change | Files | Effort | Depends On |
|-------|--------|-------|--------|------------|
| H.1 | Mount monorepo read-only into Architect container | `container-runner.ts` | Low | — |
| H.2 | Rewrite Architect CLAUDE.md with investigate→plan→execute loop | `groups/main/CLAUDE.md` | Medium | H.1 |
| H.3 | Add `teamId` to ContainerConfig + team directory mount | `types.ts`, `container-runner.ts` | Low | — |
| H.4 | Update worker CLAUDE.md with peer communication protocol | `groups/global/CLAUDE.md` | Low | H.3 |
| H.5 | Update Architect CLAUDE.md with slot management | `groups/main/CLAUDE.md` | Low | H.2 |
| H.6 | Revert Decision #4 — document worker slots | Spec docs | Low | — |
| H.7 | Deploy to VPS + end-to-end test with high-level goal | VPS | Medium | All above |

### End-to-End Test (H.7)

Director posts to #main-ops:
> "The health check monitoring script is broken — it reports all services down when they're actually healthy. Fix it."

Success criteria:
- Architect investigates the codebase to find the monitoring script
- Architect produces a plan without asking the Director for file paths
- Architect spawns executor(s) to implement the fix
- Workers coordinate via team workspace if parallel
- PR created, merged, deployed
- Director receives: "Health check script fixed. PR #XX merged."

---

## 8. What This Spec Does NOT Cover

- Middle management layer (Tech Leads, Team Leads) — not needed at current scale (5 apps, 1 Director)
- Cross-team communication (e.g., frontend team ↔ backend team) — all workers are in one flat team under the Architect
- Budget/cost management for agent invocations — deferred until Max subscription limits are hit
- Multi-VPS worker distribution — deferred until 5 slots are insufficient
- Automated testing of the division itself (meta-testing) — deferred

These become relevant when the division scales beyond 1 Architect + 5 worker slots. The current model supports up to ~20 tasks/day with 4 parallel workers, which covers LIMITLESS's current development velocity.
