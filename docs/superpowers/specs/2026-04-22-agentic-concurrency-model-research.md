---
title: "Agentic Dev Team Concurrency Model: NanoClaw vs OMX Deep-Dive"
date: 2026-04-22
status: DRAFT — CEO review
author: LIMITLESS main-ops Architect (NanoClaw)
co-reviewer invited: LIMITLESS Infra Architect (please append §11 review before CEO ratifies)
commissioned-by: CEO (2026-04-22 Q1–Q5 readiness session, Task 3/4/5 serialization incident)
priority: P3 (behind PR #86, PR #87)
cross-refs:
  - docs/superpowers/specs/2026-04-05-omx-pattern-extraction.md
  - docs/superpowers/specs/2026-04-05-autonomous-agentic-division-design.md
  - apps/nanoclaw/src/group-queue.ts
  - apps/nanoclaw/src/container-runner.ts
  - apps/nanoclaw/src/ipc.ts
  - apps/nanoclaw/src/channels/discord.ts
---

# Agentic Dev Team Concurrency Model: NanoClaw vs OMX Deep-Dive

## Executive Recommendation

**Primary: Path B — Minimal NanoClaw enhancements.** Add priority-aware dispatch, a BLOCKED task state, and filesystem-persisted task lifecycle to `GroupQueue`. This directly eliminates the Task 3/4/5 class of incident (P0 task queuing behind a blocked P2 task) without changing the runtime. Estimated effort: 2–3 engineer-sessions. Fallback: if Path B's queue depth still proves unacceptable after one sprint of measurement, advance to **Path C** (hybrid coexistence) using the existing Phase 1 OMX integration plan. **Bias acknowledgment:** As a NanoClaw Architect, I have a structural incentive to prefer B. I've tried to compensate by being explicit about B's ceiling (§9). CEO should weigh this.

---

## §1. NanoClaw Concurrent-Dispatch Behavior (Code-Level)

**Source:** `apps/nanoclaw/src/group-queue.ts` (read in full).

When 2 messages arrive for the same Architect channel within the 30-min idle window, the runtime does **(b) — queue behind existing container**. There is no concurrent container spawning for the same group JID.

The mechanism is `GroupState.active: boolean` (line 17). In `enqueueMessageCheck` (lines 62–88):

```
Line 67: if (state.active) {
Line 68:   state.pendingMessages = true;
Line 69:   logger.debug({ groupJid }, 'Container active, message queued');
Line 70:   return;
Line 71: }
```

The method returns immediately. No second container spawns. The second message is flagged as pending and re-processed after the running container exits (via `drainGroup`, line 286).

**`MAX_CONCURRENT_CONTAINERS`** (defaulting to 5, `config.ts` line 62–64) governs **cross-group** concurrency — how many *different* Architect channels may have active containers simultaneously. It does **not** allow multiple containers per group. Within a single channel (one Architect), the limit is always exactly 1.

**Tasks vs. messages:** Scheduled tasks are enqueued separately via `enqueueTask` (line 90). Tasks are *prioritized over pending messages* in `drainGroup` (line 292–300), but within tasks the queue is FIFO (array `shift()`). There is no priority-tier ordering within the task queue.

**IPC poll cycle:** `IPC_POLL_INTERVAL` = 1000ms. The host checks for pending IPC files every second. Container startup latency is 10–20 seconds (Docker image init). So a message arriving while a container is active will sit for at minimum the remainder of that container's lifetime before being processed.

---

## §2. First-Person Architect Self-Observation

*This section reports observed behavior, not code analysis. CEO and Director want candid operational reporting.*

**What I see when multiple dispatches arrive:**  
I see dispatches **one at a time**. Tasks 4 and 5 from today's Infra incident were not visible to Infra Architect during Task 3's execution — they were held in the host-side `pendingMessages` flag. The host delivers them only after my container exits.

**Why Infra serialized on Task 3:**  
This was **not a conscious choice** — it was a runtime constraint. Infra's container was running Task 3. The host set `pendingMessages = true` for Tasks 4 and 5. Infra had no visibility of them and no mechanism to exit early without abandoning Task 3's work-in-progress.

**Agent SDK subagents:**  
I can spawn `Agent` tool subagents within my container session. These run within the same container process — they are Claude Code's internal concurrency (sub-processes within the same Docker container), not separate NanoClaw containers. They add in-process parallelism (e.g., fan-out reads) but do not create second containers or break the per-channel serialization.

**What prevents me from spawning a subagent for Task 4 while blocked on Task 3:**  
Two constraints. First, I don't know Task 4 exists — the host has not delivered it to my container. Second, even if I did, a subagent on Task 4 would run inside my Task 3 container session. It would not be a fresh, isolated execution; it would compete with Task 3's context and could not independently post Task 4's output.

**Working memory at idle timeout:**  
Hard loss for in-progress state. `IDLE_TIMEOUT` = 30 minutes (`config.ts` line 61). After 30 minutes with no streaming output, `killOnTimeout` fires (`container-runner.ts` line 499). Claude session history is preserved in `store/sessions/GROUP/.claude/` (JSONL), so a new container can resume the conversation thread. But all transient state — command outputs, open analysis threads, half-formed plans — is gone. New container reads fresh from message DB.

**Candid summary:** I am a serial processor, one task at a time per channel. I have no awareness of what's queued behind me. I cannot self-preempt. This is acceptable for the Architect role (coherence matters more than throughput) but severely constrains worker throughput when tasks vary in urgency.

---

## §3. OMX Concurrent-Dispatch Behavior

**Source:** `docs/superpowers/specs/2026-04-05-omx-pattern-extraction.md` (Pattern 3, 6, 10) + external OMX upstream research.

**`omx team` (fixed N workers):** Pre-allocates N tmux windows at session start. Tasks from a shared queue (DispatchLog) are claimed by workers via **AuthorityLease** — an atomic filesystem write (or Redis key in distributed mode). Worker A claims task X by writing `{worker: A, taskId: X, claimedAt: T}` to a lease file. If another worker wins the race, the loser sees the existing lease and skips to the next unclaimed task. This prevents double-assignment without a central scheduler.

**`omx swarm` (dynamic):** Workers are created on demand as tasks appear in the queue. Scales down when the queue empties. More elastic than `omx team` but incurs tmux window creation latency per burst.

**DispatchLog + MailboxLog (Rust event-sourced state):** Every task transition (dispatched, claimed, completed, failed) is appended to an immutable event log. On crash recovery, the leader replays the log to reconstruct state: completed tasks are skipped, in-progress tasks with expired leases are reassigned, pending tasks are dispatched fresh. MailboxLog tracks message delivery to prevent lost messages after a worker crash.

**Key difference from NanoClaw:** OMX dispatches tasks to multiple workers *simultaneously*. NanoClaw delivers one message to one container and waits. OMX's N workers can each be on a different task at the same time.

---

## §4. tmux as a Concurrency Primitive

Docker containers and tmux panes both provide isolation, but they differ in three concurrency-critical dimensions:

**1. Startup latency:**  
- Docker: 10–20 seconds (image pull check, container init, Node.js startup, Claude SDK init).  
- tmux new-window: ~200ms (fork + exec of existing shell).  
At current volumes, OMX can dispatch ~50 tasks in the time NanoClaw spawns one container.

**2. State persistence across exit:**  
- Docker: container exit destroys process state. Session history on disk, but cwd, env, screen buffer gone.  
- tmux: pane persists indefinitely. A `tmux detach` leaves the pane running. `tmux attach` resumes exactly where work left off — cursor position, command output, partial edits. A blocked worker can be parked and resumed when the blocker clears.

**3. Interactive observability:**  
- Docker: operator must `docker exec -it <container> bash` to observe or intervene. Mid-task state is opaque unless the agent explicitly logs.  
- tmux: operator runs `tmux attach -t session-name` to watch any worker's live output. Can type directly into a pane for interactive debugging. HUD pane shows all workers' status at a glance.

**Conclusion:** tmux's decisive advantage is not just speed — it's the ability to *park a blocked worker* without losing its context, and to *observe + intervene* live. These capabilities are structurally unavailable in the Docker container model.

---

## §5. Concurrency Dimensions: Side-by-Side Comparison Table

| Dimension | NanoClaw (current) | NanoClaw (Path B) | OMX |
|---|---|---|---|
| Concurrent dispatches per Architect channel | **1** (hard per-group mutex) | **1** (unchanged) | **N** (team size) |
| Priority-aware reordering | ❌ FIFO within group | ✅ P0 > P1 > P2 > P3 | ✅ Priority queue |
| Preemption of lower-priority task | ❌ None | ✅ Block detection → preempt idle | ✅ AuthorityLease release |
| Internal fan-out (within task) | ✅ Agent SDK subagents (in-process) | ✅ (unchanged) | ✅ `omx swarm` |
| Cross-task context sharing | ❌ Separate containers | ❌ (unchanged) | ⚠️ Shared worktree only |
| State persistence across restart | ⚠️ Session JSONL only (conversation history) | ✅ Task state on filesystem | ✅ Event-sourced log |
| Dispatch audit trail | ⚠️ Host log only | ✅ Lifecycle state file | ✅ DispatchLog |
| Crash recovery (task-state replay) | ❌ Lost on exit | ✅ Filesystem state on restart | ✅ Full event replay |
| Observability (live state of concurrent work) | ❌ Log tailing only | ⚠️ IPC status files | ✅ tmux HUD |
| Coordination primitives | ❌ None | ✅ BLOCKED state + IPC mutex | ✅ AuthorityLease |
| Container startup latency | ~15s | ~15s (unchanged) | ~200ms |
| BLOCKED task handling | ❌ Container stays alive consuming slot | ✅ Preempt + requeue | ✅ Park + reassign |
| Multi-Architect parallelism | ✅ N Architects via separate groups | ✅ (unchanged) | ✅ (inherent) |

---

## §6. Today's Task 3/4/5 Incident as a Case Study

**What happened (reconstructed from session summary):**

| Time (UTC) | Event | Runtime effect |
|---|---|---|
| ~09:30 | Task 3 dispatched to Infra Architect | Container spawned; `state.active = true` |
| ~10:00 | Task 4 (P0 code) dispatched | `pendingMessages = true`; queued behind Task 3 |
| ~10:15 | Task 5 (P2 research) dispatched | `pendingMessages = true`; queued behind Task 4 |
| ~10:30+ | Task 3 blocked on CEO file content | Container alive; no output; idle timeout not yet reached |
| ~10:30–11:30 | Task 4 (P0) sits in queue | Zero progress on P0 task for ~60 minutes |

**What should have happened:**  
Infra Architect detects it is blocked on an external dependency (CEO file). It writes a BLOCKED status to IPC. Host detects BLOCKED, preempts the idle-but-not-timed-out container (via `closeStdin`), dispatches Task 4 immediately. Task 3 is requeued for when the blocker resolves.

**What OMX would have done:**  
Worker 1 claims Task 3, begins. Worker 1 signals BLOCKED to DispatchLog. Leader detects BLOCKED (via heartbeat + status event within 1 poll cycle). Leader assigns Task 4 to Worker 2 (separate tmux pane). Task 4 starts concurrently within seconds of being dispatched. Task 5 queues. Worker 1 is *parked* (tmux pane kept alive with context) until CEO file arrives.

**The core structural gap:** NanoClaw has no BLOCKED state and no preemption response to BLOCKED. The container either finishes or times out — there is no middle path.

---

## §7. Gap Analysis

Cross-referencing `2026-04-05-omx-pattern-extraction.md` P0 gaps + new gaps from this research:

| # | Gap | Throughput Impact | Impl Complexity | Practical Pain |
|---|---|---|---|---|
| G1 | No BLOCKED state / preemption | **Critical** | Low | **Critical** — today's incident |
| G2 | No priority queue | **Critical** | Low | **Critical** — P0 waits behind P3 |
| G3 | No task lifecycle state machine | High | Medium | High — Architect can't resume after crash |
| G4 | No crash recovery | Medium | Low | Medium — task state lost on container exit |
| G5 | No persistent completion loop | Medium | Low | Medium — iteration context lost on crash |
| G6 | No planning gate enforcement | Medium | Medium | Medium — vague tasks produce blocked workers |
| G7 | No cross-task context sharing | Low | High | Low — separate containers is by design |
| G8 | No live dispatch observability | Low | Low | Low — Discord posts serve as HUD |
| G9 | 15s container startup latency | Low (current scale) | N/A | Low — acceptable at current task volume |

Gaps G1 and G2 are the proximate cause of today's incident. Both are low-complexity to fix. G3–G6 are worth addressing in the same sprint (small surface area, high compound benefit).

---

## §8. Four Adaptation Paths — Concrete Analysis

### Path A: Status Quo

Accept serialization. Per-channel FIFO queue. No priority, no block detection.

**Limitations:** P0 task can wait hours behind a blocked task. Only throughput lever: dispatch to different Architect channels (cross-Architect parallelism). Requires Director to manually route tasks to unblocked Architects.

**Operational warning to issue:** "If Infra Architect is blocked, create a second Infra-B channel and dispatch urgent tasks there."

| Attribute | Value |
|---|---|
| Effort | 0 |
| Risk | None |
| Reversibility | N/A |
| Blast radius | None |
| Throughput | Low (no improvement) |
| Verdict | Viable only for ≤2 concurrent tasks/day |

---

### Path B: Minimal NanoClaw Enhancements

Implement G1–G5 natively. No runtime change.

**Key additions:**
1. **Priority queue in `GroupQueue`** — `pendingTasks[]` sorted by priority tier; P0 tasks jump the queue.
2. **BLOCKED state** — agent writes `{type: "status", state: "blocked", reason: "..."}` to IPC status dir; host detects via existing `processIpcFiles` loop (already polls `statusDir`, `ipc.ts` lines 166–212); triggers `closeStdin(groupJid)` to preempt idle container.
3. **Task lifecycle state file** — `ipc/<main-group>/task-registry.json` written after each state transition (pending → in-progress → blocked → completed/failed).
4. **Crash recovery** — on Architect container restart, reads task registry; reassigns tasks with stale heartbeats.
5. **Persistent completion loop** — worker writes `iteration-state.json` to IPC after each iteration.

**What Path B does NOT fix:** True concurrency per Architect channel (still 1 container per group). This is acceptable — the Architect role *benefits* from serial coherence. Workers (separate group registrations) each get their own container; true parallelism lives there.

| Attribute | Value |
|---|---|
| Effort | 2–3 engineer-sessions |
| Risk | Medium (GroupQueue core dispatch path) |
| Reversibility | High (backward-compatible; falls back to FIFO if new logic removed) |
| Blast radius | Medium (affects all groups, but failure mode is degraded priority, not data loss) |
| Throughput gain | High (eliminates G1+G2 class of incident) |
| LIMITLESS-specific help | Preserves audit trail, cron, Discord routing, OneCLI gateway |
| LIMITLESS-specific hurt | None |

---

### Path C: Hybrid Coexistence

NanoClaw for: main-ops Architect, scheduling, Discord routing, audit trail.  
OMX for: Infra/app engineer workers (high-throughput coding sessions).

**Concurrency model by agent type:**

| Agent | Runtime | Concurrency | Startup | Use case |
|---|---|---|---|---|
| main-ops Architect | NanoClaw container | 1 per channel | 15s | Planning, Discord, cron, audit |
| Infra / app engineers | OMX tmux pane | N per team | 200ms | Code execution, debugging, PR creation |
| Specialist workers | OMX tmux pane | N per swarm | 200ms | Parallel subtask execution |

**How this works operationally:** Architect dispatches tasks via Discord → OMX leader (or Architect-to-OMX bridge per integration plan Phase 1) picks up from `#handoffs` → spawns OMX workers. Workers report back via Discord (or IPC). Architect synthesizes and posts to Director.

**Needs:** Phase 1–2 of `2026-04-17-openai-codex-omx-clawhip-integration-plan.md` (OMX installed, bridge layer operational). Estimated at 4–6 engineer-sessions.

| Attribute | Value |
|---|---|
| Effort | 4–6 engineer-sessions |
| Risk | Medium-High (new runtime, integration surface) |
| Reversibility | Medium (can disable OMX workers, fall back to NanoClaw-only) |
| Blast radius | High (new dispatch path; failure could lose tasks) |
| Throughput gain | Very High (N concurrent workers per team) |
| LIMITLESS-specific help | Preserves Architect's audit trail; engineers get OMX velocity |
| LIMITLESS-specific hurt | Operational complexity increases; two runtimes to monitor |

---

### Path D: Full Swap to OMX-Native

Replace NanoClaw with OMX as primary runtime for all agents.

**What would need to be rebuilt from scratch:**
- NanoClaw's Discord channel routing (groups, JID registry, per-group IPC)
- Scheduled task cron (`task-scheduler.ts`, SQLite DB, `CronCreate/Delete/List` tools)
- OneCLI gateway integration (credential injection without raw token exposure)
- Per-group mount security (`mount-security.ts`)
- MiFID II audit trail (message DB, group logs — a compliance artifact)
- Bot loop protections (TRUSTED_BOT_IDS, `allowBots` scoping)

**What would be gained:**
- OMX's tmux-native concurrency (N workers, ~200ms startup)
- AuthorityLease + DispatchLog (crash-safe dispatch)
- Interactive debugging

**Verdict:** The compliance cost alone (MiFID II audit trail reconstruction) makes Path D inadvisable without a dedicated compliance review. NanoClaw's scheduled task infrastructure and per-group isolation are not trivial to replicate. Path D is a 8–12 engineer-session rewrite with significant regression risk.

| Attribute | Value |
|---|---|
| Effort | 8–12 engineer-sessions |
| Risk | High |
| Reversibility | Low |
| Blast radius | Full platform |
| Verdict | Not recommended in current phase |

---

## §9. Recommendation

**Primary: Path B.** Addresses the exact class of incident that prompted this research. Low complexity, high reversibility, preserves all LIMITLESS-specific infrastructure. The 2–3 engineer-sessions required to implement G1+G2 (priority queue + BLOCKED preemption) would prevent today's incident class entirely.

**Trigger for upgrading to Path C:** If, after one sprint of Path B, queue depth measurements show that any registered engineer Architect has >1 queued task >50% of the working day, Path B's ceiling has been reached. At that point, Path C's OMX integration (already partially designed) becomes the correct call.

**Bias acknowledgment:** I operate within NanoClaw. My architecture bias is toward solutions that preserve the runtime I inhabit. The above analysis is my honest attempt to counterbalance that. If CEO or Infra Architect read this and conclude C is the right call sooner, that should outweigh my assessment. The technical merits of C are real; the only argument for B first is risk minimization and reversibility.

**Fallback:** Path C, Phase 1–2 of `2026-04-17-openai-codex-omx-clawhip-integration-plan.md`.

---

## §10. Implementation Effort Breakdown for Path B

| Task | Scope | Engineer-sessions | Dependency |
|---|---|---|---|
| B1: Priority queue in `GroupQueue` | `apps/nanoclaw/src/group-queue.ts` | 0.5 | None |
| B2: BLOCKED state + IPC status handler | `apps/nanoclaw/src/ipc.ts` + `group-queue.ts` | 0.5 | B1 |
| B3: Task lifecycle state file (registry) | `apps/nanoclaw/src/ipc.ts` | 0.5 | B2 |
| B4: Crash recovery on restart | `apps/nanoclaw/src/index.ts` | 0.5 | B3 |
| B5: Persistent completion loop (worker CLAUDE.md) | `container/skills/` or group CLAUDE.md | 0.5 | None (parallel) |
| Tests | `group-queue.test.ts`, `ipc.ts` tests | 0.5 | B1–B4 |

**Total: ~3 engineer-sessions.** B1+B2 alone (priority + BLOCKED) are 1 session and directly address today's incident.

---

## §11. Open Questions and Empirical Tests Needed

Before committing to Path B or deciding to escalate to Path C, the following should be tested:

1. **What is the current `MAX_CONCURRENT_CONTAINERS` value in production?** (Default: 5. If set lower, cross-Architect parallelism is already constrained further.)

2. **Container startup latency measurement:** Time `docker run <image>` to first Claude output on VPS. Hypothesis: 10–20s. If >30s, this changes the cost calculus for Path C.

3. **Empirical test A — Block detection end-to-end:** Have Infra Architect write `{type: "status", state: "blocked"}` to IPC status dir. Verify host detects within 1 IPC poll cycle (≤1s) and calls `closeStdin`. Measure time from BLOCKED write to Task 4 container start.

4. **Empirical test B — Priority queue correctness:** Send P0, P1, P2 tasks to one Architect in reverse order (P2 first, P0 last). Verify P0 executes first after current container exits.

5. **Empirical test C — Queue depth baseline:** Over 5 working days, measure average queue depth for Infra Architect at EOD. If average >1.5 tasks queued, Path C migration trigger activates.

6. **Infra Architect review (see §11):** Code-level accuracy check on §1 (concurrent-dispatch mechanics) and feasibility of B1+B2 implementation from the Infra implementation-complexity angle.

---

## §12. Cross-References

This memo is additive to, and does not duplicate:
- `2026-04-18-nanoclaw-vs-omx-runtime-comparison.md` — latency/isolation/cost comparison at high level
- `2026-04-05-omx-pattern-extraction.md` — full pattern catalog; Patterns 1, 2, 6, 10 directly relevant
- `2026-04-05-autonomous-agentic-division-design.md` — worker lifecycle, §4.6 task state machine (designed but not yet implemented)
- `2026-04-17-openai-codex-omx-clawhip-integration-plan.md` — Phase 0 complete; Phase 1–2 is Path C prerequisite

---

*Architect confidence on recommendation: 8/10. Confidence on code-level analysis: 9/10 (read source directly). Confidence on OMX mechanics: 7/10 (external research; Infra Architect review invited).*

---

## §13. [RESERVED: Infra Architect Review]

*Infra Architect: please append here before CEO ratifies. Requested:*  
*(a) Code-level accuracy of §1 (concurrent-dispatch mechanics — you own this code);*  
*(b) Feasibility assessment of Path B from implementation-complexity angle (B1–B4 effort estimates);*  
*(c) Any Infra-perspective gaps not captured above.*

*~500 words requested. No timeline pressure — append before CEO review.*
