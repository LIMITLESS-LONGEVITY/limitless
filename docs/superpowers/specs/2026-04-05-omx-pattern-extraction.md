# OMX Pattern Extraction — What We Must Learn and Implement

**Date:** 2026-04-05
**Author:** Architect (Main Instance)
**Classification:** Internal — Division Director
**Purpose:** Systematic audit of every proven OMX pattern, mapped to our NanoClaw architecture. Nothing left on the table.
**Feeds into:** `2026-04-05-autonomous-agentic-division-design.md`

---

## Methodology

For each OMX pattern, three questions:
1. **Does our spec already capture this?** (yes/partial/no)
2. **Do we need it?** (yes/no/later)
3. **How do we implement it natively?** (NanoClaw/hooks/CLAUDE.md/IPC)

---

## 1. Pre-Execution Planning Gate ($ralplan)

**What OMX does:** Before any execution keyword ($ralph, $team) fires, a regex-based detector checks if the prompt contains "well-specified signals" — file paths, camelCase identifiers, issue numbers, code blocks, numbered steps. If the prompt is vague (<=15 words, no concrete signals), execution is blocked and redirected to a planning phase: Planner → Architect → Critic, max 5 rounds until APPROVE.

**Our spec status:** Partial. Section 4.1 says the Architect "analyzes task complexity" but doesn't define HOW. There's no formal gate, no specificity detection, no mandatory planning loop for vague requests.

**Do we need it:** YES. This is the #1 cause of wasted agent execution — vague tasks produce vague code. Every handoff that went wrong in our history (the feedback table FK, the broken migration, the multi-PR fix loops) started with an underspecified task.

**NanoClaw implementation:**

The Architect's CLAUDE.md gets a hard rule:

```
## Pre-Execution Gate (MANDATORY)

Before spawning any executor, the Architect MUST verify task specificity.

A task is WELL-SPECIFIED if it contains at least 3 of:
- Specific file path(s) to modify
- Function/component names (camelCase, PascalCase, or snake_case identifiers)
- Expected behavior (input → output, endpoint → response)
- Error to fix (with error text or stack trace)
- Verification steps (how to confirm the fix works)

A task is UNDER-SPECIFIED if it has fewer than 3 of the above.

For UNDER-SPECIFIED tasks:
1. Spawn a Planner (not an Executor)
2. Planner produces: file paths, change description, verification steps
3. Architect reviews the plan — if insufficient, iterate (max 3 rounds)
4. Only after plan is approved: spawn Executor with the enriched task

NEVER spawn an Executor with a task like "fix the auth" or "improve the UI."
ALWAYS spawn an Executor with a task like "In src/routes/profile.ts line 45,
change req.user.id comparison from == to === because string/number mismatch
causes 403. Verify: GET /api/profile with valid JWT returns 200."
```

This is enforced by prompt, not code — but it could also be added to `validate-handoff.sh` as a hard-block if tasks don't contain file paths.

**What we're NOT copying from OMX:** The regex keyword detection system. Our Architect is the routing layer — it doesn't need pattern matching on user input. The specificity check is an Architect behavior rule, not a parser.

---

## 2. Persistent Completion Loop ($ralph)

**What OMX does:** Ralph wraps a coding session with a persistence contract:
- Iteration counter (max 10)
- Same-blocker detection (3+ iterations on same error → escalate)
- Mandatory verification after each change
- Mandatory architect sign-off (STANDARD tier minimum)
- Mandatory ai-slop-cleaner pass on changed files only
- State persisted via MCP across iterations
- Clean exit only via explicit cancel

**Our spec status:** Partial. Section 4.5 has failure handling (retry 2x, escalate). But no formal iteration tracking, no same-blocker detection, no deslop gate, no architect sign-off before PR.

**Do we need it:** YES. Our Anti-Loop Rule says "2 failures → Debug Mode" but it's a prompt guideline, not tracked state. Agents routinely retry the same approach 4-5 times before giving up.

**NanoClaw implementation:**

Workers maintain iteration state in their IPC directory:

```json
// .ipc/worker-1/iteration-state.json
{
  "iteration": 3,
  "max_iterations": 10,
  "last_error": "pnpm build: Cannot find module '@payload-config'",
  "same_error_count": 2,
  "changed_files": [
    "src/app/(frontend)/courses/[slug]/lessons/[lessonSlug]/page.tsx",
    "src/components/LessonNav/index.tsx"
  ],
  "status": "executing"
}
```

The worker's CLAUDE.md (executor.md) includes:

```
## Iteration Protocol

You are running inside a persistent completion loop. Track your progress:

1. After each change, write your iteration state to IPC (iteration count, last error, changed files)
2. After each change, VERIFY: run the build command, check the result
3. If verification fails with the SAME error as last iteration: increment same_error_count
4. If same_error_count >= 3: STOP. Write escalation event to IPC. Do not retry.
5. If iteration >= 10: STOP. Write timeout event to IPC. Do not continue.
6. Before creating PR: review ONLY your changed files for unnecessary additions
   (comments you didn't need, error handling for impossible cases, verbose logging).
   Remove anything that wasn't required by the task. This is the deslop gate.
7. After deslop: run build one final time to confirm clean.
```

The Architect reads iteration state from worker IPC and acts on escalations.

---

## 3. Parallel Worker Isolation (git worktrees)

**What OMX does:** Each $team worker gets an isolated git worktree. Workers edit the same repo concurrently without merge conflicts. Integration strategy: merge (clean divergence) or cherry-pick (overlapping changes).

**Our spec status:** Yes — Section 8 Phase H mentions worktree isolation. But no detail on integration strategy or conflict resolution.

**Do we need it:** YES. Without worktrees, two executors editing apps/paths/ simultaneously will corrupt each other's working tree.

**NanoClaw implementation:**

When the Architect spawns a worker, NanoClaw creates a worktree:

```bash
# NanoClaw host process, on spawn request:
BRANCH="work/${ROLE}-${SCOPE//\//-}-$(date +%s)"
git worktree add /tmp/worktree-${WORKER_ID} -b $BRANCH
# Mount /tmp/worktree-${WORKER_ID} into container as /workspace
```

Worker's container sees the worktree as its repo. Changes go on the branch. PR is created from the branch.

**Integration strategy:**
- Default: each worker creates a PR from its branch → Architect or Director merges sequentially
- If two workers edited the same file: Architect detects conflict at merge time, spawns a debugger to resolve
- Workers NEVER merge to main themselves — they create PRs only

**What we're NOT copying from OMX:** Cross-worker rebase (sequential dependency resolution within a team session). Our workers are independent — they don't share in-progress state. Dependencies are handled by the Architect sequencing spawns, not by workers coordinating.

---

## 4. Multi-Round Deliberation (Planner → Architect → Critic)

**What OMX does:** $ralplan runs a three-agent deliberation: Planner proposes, Architect reviews for feasibility, Critic challenges assumptions. Loop continues until Critic returns APPROVE (max 5 rounds). Output: PRD + test spec.

**Our spec status:** Partial. Section 4.1 says "spawn planner first" for medium/complex tasks, but doesn't define the deliberation loop or the Critic role.

**Do we need it:** YES, for complex tasks. Not for simple bug fixes. The Architect should be able to judge when a task needs deliberation vs direct execution.

**NanoClaw implementation:**

For complex tasks (cross-app changes, architectural decisions, new features), the Architect runs a planning sequence:

1. Spawn Planner: produces task decomposition, file list, dependency graph
2. Architect reviews the plan (the Architect IS the reviewer — we don't need a separate Architect agent role in the deliberation, because our Architect is already persistent)
3. Architect challenges: "What about X? Did you consider Y?"
4. If plan needs revision: feed critique back to Planner via IPC inbox
5. Max 3 rounds (we're smaller scale than OMX; 5 rounds is excessive)
6. On approval: Architect enriches plan with verification steps and spawns executors

**Key difference from OMX:** We don't need a separate Critic agent. Our Architect IS the critic. OMX needs one because its leader is a Codex session, not a persistent orchestrator. Our Architect persists across the entire lifecycle and carries full context.

**What we're NOT copying from OMX:** The separate Critic agent role. Unnecessary complexity for our scale.

---

## 5. Heartbeat + Stale Worker Detection

**What OMX does:** Workers write heartbeat files every N seconds. The leader polls for heartbeats and detects dead/stale workers. Dead workers get their tasks reassigned.

**Our spec status:** Yes — Section 6.1 mentions heartbeat monitoring. But no detail on frequency, staleness threshold, or reassignment protocol.

**Do we need it:** YES. Container crashes, OOM kills, and network timeouts are real. Without heartbeats, the Architect won't know a worker is dead until the timeout (30 min in current spec — too long).

**NanoClaw implementation:**

```json
// .ipc/worker-1/heartbeat.json (written by worker every 2 minutes)
{
  "timestamp": "2026-04-05T10:23:00Z",
  "status": "executing",
  "current_action": "editing src/routes/profile.ts",
  "iteration": 2
}
```

Architect checks heartbeats every 5 minutes. Rules:
- No heartbeat for 10 minutes → worker is STALE → terminate container, reassign task
- No heartbeat for 5 minutes + status was "executing" → worker MIGHT be stuck → send IPC nudge
- Heartbeat present + status "blocked" for 3+ checks → worker is STUCK → escalate

NanoClaw host process can also monitor container health (docker inspect) independently of IPC heartbeats — belt and suspenders.

---

## 6. Task Lifecycle State Machine

**What OMX does:** Tasks have a formal lifecycle: `pending → claimed → in_progress → completed/failed`. Claim is atomic (prevents two workers grabbing the same task). Failed tasks can be reassigned.

**Our spec status:** No. Section 4.2 has a worker lifecycle but no task lifecycle. Tasks are injected via inbox but there's no formal state tracking.

**Do we need it:** YES. Without task state tracking, the Architect can't know which tasks are done, which are in progress, and which failed. This is essential for the orchestration loop.

**NanoClaw implementation:**

Task state lives in the Architect's IPC directory (not in worker dirs — the Architect owns the task registry):

```json
// .ipc/architect/tasks.json
{
  "tasks": [
    {
      "id": "task-001",
      "role": "executor",
      "scope": "apps/paths",
      "description": "Fix lesson redirect — add basePath to window.location.href",
      "status": "in_progress",
      "assigned_to": "worker-1",
      "spawned_at": "2026-04-05T10:15:00Z",
      "depends_on": [],
      "verify_steps": ["pnpm build", "navigate to lesson → complete → check redirect URL"],
      "pr_url": null,
      "retries": 0,
      "max_retries": 2
    },
    {
      "id": "task-002",
      "role": "executor",
      "scope": "apps/paths",
      "description": "Fix Discover links — resolve slugs in endpoint",
      "status": "pending",
      "assigned_to": null,
      "depends_on": [],
      "verify_steps": ["pnpm build", "Discover → click result → article loads"],
      "retries": 0,
      "max_retries": 2
    }
  ]
}
```

State transitions:
- `pending` → `in_progress`: Architect assigns to worker, spawns container
- `in_progress` → `completed`: Worker writes completion event with PR URL
- `in_progress` → `failed`: Worker writes failure event with error
- `failed` → `in_progress`: Architect reassigns (increments retries)
- `failed` (retries >= max_retries) → `escalated`: Architect posts to #alerts
- `pending` (depends_on all completed) → ready for assignment

---

## 7. Model Routing by Task Complexity

**What OMX does:** Each role has a modelClass (frontier/standard/fast) and reasoningEffort (low/medium/high). Exploration uses fast models; complex architecture uses frontier.

**Our spec status:** Yes — Section 3.3 has the model routing table.

**Do we need it:** YES. Already captured. No gap.

---

## 8. Deslop Gate (AI Slop Cleaner)

**What OMX does:** After Ralph completes work, a mandatory pass reviews ONLY changed files for: unnecessary comments, over-engineered error handling, verbose logging, unused imports, speculative abstractions. Scoped to changed files only — prevents style churn from spreading.

**Our spec status:** Partial. Mentioned in research analysis (Lesson 7) but not in the autonomous division spec.

**Do we need it:** YES. AI agents consistently over-produce — adding error handling for impossible cases, comments that restate the code, and abstractions for one-time operations. This is already a rule in CLAUDE.md ("Don't add features beyond what was asked") but it's not enforced as a gate.

**NanoClaw implementation:**

Already covered in Pattern 2 (iteration protocol, step 6). The executor's CLAUDE.md mandates a self-review of changed files before creating a PR. The Architect can also spawn a Code Reviewer after the executor completes, specifically tasked with "review these N changed files for unnecessary additions."

---

## 9. Worktree Integration Strategy

**What OMX does:** After team workers complete on separate worktrees, integration uses: merge (clean divergence), cherry-pick (overlapping changes), or cross-worker rebase (sequential dependencies).

**Our spec status:** No. Worktrees mentioned but integration strategy absent.

**Do we need it:** YES. Two PRs from two worktrees will eventually need to merge to main. If they touch different files, it's clean. If they overlap, we need a strategy.

**NanoClaw implementation:**

Since workers create PRs (not direct merges), integration is handled by the normal PR merge process:

1. Worker-1 creates PR #80 from branch `work/executor-paths-1712345678`
2. Worker-2 creates PR #81 from branch `work/executor-paths-1712345679`
3. Architect merges PR #80 first (or Director does)
4. PR #81 now has a merge conflict (if files overlap)
5. Architect spawns a debugger scoped to the conflict: `role=debugger, scope=apps/paths, task="Resolve merge conflict on PR #81 after PR #80 merged"`
6. Debugger resolves conflict, pushes to PR #81 branch
7. PR #81 merges cleanly

**For dependent tasks:** Architect doesn't spawn Worker-2 until Worker-1's task is `completed`. Sequential spawning prevents conflicts by design.

**What we're NOT copying from OMX:** Cross-worker rebase during execution. Our workers are independent and don't coordinate in real-time. The Architect handles sequencing.

---

## 10. Session State Persistence + Crash Recovery

**What OMX does:** Event-sourced state machine (Rust). AuthorityLease (mutex-like ownership), DispatchLog (task delivery tracking), MailboxLog (message delivery). File-system locking. Snapshot + event log for replay after crash.

**Our spec status:** No. No crash recovery design. If the Architect container crashes mid-orchestration, task state is lost.

**Do we need it:** YES. The Architect must be able to resume orchestration after a restart. If it crashes while 3 workers are running, it needs to pick up where it left off — not re-spawn everything.

**NanoClaw implementation:**

The Architect's task registry (Pattern 6) is already filesystem-based (IPC directory). If the Architect container crashes:

1. NanoClaw detects container exit, restarts it (systemd + Docker restart policy)
2. Architect reads `.ipc/architect/tasks.json` on startup
3. Tasks still `in_progress` with live worker heartbeats → resume monitoring
4. Tasks `in_progress` with stale heartbeats → worker died → reassign
5. Tasks `pending` → spawn workers as normal
6. Tasks `completed` → skip, post summary if not already posted

**Key design decision:** We use simple JSON files, not an event-sourced state machine. OMX's Rust runtime is overengineered for our scale (we have 2-4 concurrent workers, not 10+). JSON files with filesystem locking are sufficient and dramatically simpler to debug.

What we DO need: the Architect must write task state to disk after every state transition, not hold it in memory. This is the crash recovery contract.

---

## 11. Cron-Driven Nudge Loop

**What OMX does:** System cron fires clawhip events → Discord → bot wakes up → checks for work. Scheduling is fully outside the agent loop.

**Our spec status:** Yes. NanoClaw scheduled tasks already implement this (daily-briefing at 09:00 UTC, proactive-check every 30 min). Already deployed and working.

**No gap.** This is one area where our implementation is ahead of OMX (we have it running in production on the VPS; OMX documents it as a pattern but doesn't provide cloud deployment).

---

## 12. Mixed-Model Worker Fleet

**What OMX does:** Workers can be Codex, Claude, or Gemini simultaneously. `OMX_TEAM_WORKER_CLI_MAP` allows per-worker CLI selection.

**Our spec status:** No. We use Claude Code exclusively.

**Do we need it:** NOT NOW. Claude Code is our stack. Multi-model support is a future optimization if specific tasks benefit from different models (e.g., Gemini for code search, GPT for certain generation tasks). Not a priority.

---

## 13. HUD (Head-Up Display)

**What OMX does:** A persistent tmux pane showing live mode state, worker status, heartbeats.

**Our spec status:** No.

**Do we need it:** NICE TO HAVE. Discord #main-ops serves a similar function for us — the Architect posts status updates there. A real-time HUD would require a web dashboard or tmux session on the VPS. Low priority.

---

## Summary: Patterns to Implement

| # | Pattern | Our Spec Status | Priority | Implementation |
|---|---------|----------------|----------|----------------|
| 1 | Pre-execution planning gate | **Not captured** | **P0** | Architect CLAUDE.md rule + validate-handoff.sh |
| 2 | Persistent completion loop (iteration tracking) | Partial | **P0** | Worker CLAUDE.md + IPC state file |
| 3 | Git worktree isolation | Captured (Phase H) | **P0** | NanoClaw container mount |
| 4 | Multi-round deliberation (complex tasks) | Partial | **P1** | Planner → Architect review loop via IPC |
| 5 | Heartbeat + stale detection | Captured but underspecified | **P1** | IPC heartbeat file + Architect polling |
| 6 | Task lifecycle state machine | **Not captured** | **P0** | Architect IPC tasks.json |
| 7 | Model routing | Captured | Done | — |
| 8 | Deslop gate | Partial | **P1** | Executor CLAUDE.md self-review step |
| 9 | Worktree integration strategy | **Not captured** | **P1** | PR-based merge + debugger for conflicts |
| 10 | Crash recovery | **Not captured** | **P0** | Filesystem-persisted task state + restart protocol |
| 11 | Cron nudge loop | Captured + deployed | Done | — |
| 12 | Mixed-model fleet | Not needed | Skip | — |
| 13 | HUD | Not needed | Skip | — |

**4 gaps at P0** (must be in the spec before implementation):
1. Pre-execution planning gate
2. Persistent completion loop with iteration tracking
3. Task lifecycle state machine
4. Crash recovery protocol

**4 gaps at P1** (implement during build):
5. Multi-round deliberation for complex tasks
6. Heartbeat frequency + staleness rules
7. Deslop gate as formal executor step
8. Worktree integration strategy (PR-based)

**2 already done, 2 skipped.**
