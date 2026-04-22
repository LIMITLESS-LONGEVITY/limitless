---
title: "NanoClaw Host Relay Surface — Governance Amendment Research"
date: 2026-04-22
status: DRAFT for CEO review
author: LIMITLESS Infra Architect
---

# NanoClaw Host Relay Surface — Governance Amendment Research

## Executive Recommendation

**Adopt Path B.** The existing `/workspace/ipc` mount already provides a clean, sandboxed, per-group channel — attachment download requires only one new subdirectory (`incoming/`) and a download hook in the Discord adapter. No new tool surface enters the container; no sandbox boundary is crossed. The attachment relay ships as a standalone PR (~1 engineer-day). The full ops-relay amendment is additive on the same pattern and follows within 1–2 sessions. Ship the minimal fix first; ratify the full amendment after CEO review of this memo.

---

## Path A / B / C Assessment

**Path A — Workflow only (GitHub gist / staging branch):** **Refine, not adopt as primary.** Zero implementation cost and appropriate for large binary assets (Terraform state, model weights), but degrades the dispatch UX to a two-step human-side setup before every attachment-bearing task. For text files under ~500 lines it works today. Recommend retaining it as the documented workaround for attachments that arrive before the Path B relay is live, and for attachments that exceed the relay size cap (see Q2).

**Path B — Host auto-downloads to IPC mount:** **Endorse. Recommended primary path.** Mechanically sound (see Q1), aligns with existing IPC pattern, preserves container sandbox, adds no new MCP tools to the container. Implementation is low risk and locally reversible.

**Path C — Full Discord MCP in container:** **Reject for Architects; hold for review for main-group.** Blast radius is too large — the MCP credential grants write access to all channels the bot can see, not just the Architect's dispatch channel. An Architect posting to `#financial-ops` or `#mythos-restricted` would violate channel-binding isolation. Acceptable only if scoped to read-only channel access, which the current `mcp__plugin_discord_discord__*` family does not guarantee. Revisit if the MCP gains per-channel scope controls.

---

## Research Questions

### Q1 — Is Path B mechanically sound?

**Yes, low implementation complexity.** The mount already exists: host `DATA_DIR/ipc/<group>/` → container `/workspace/ipc/`. The container-runner pre-creates `messages/`, `tasks/`, `input/` at spawn time. Adding `incoming/` requires:

1. **`apps/nanoclaw/src/channels/discord.ts`** — On inbound message, if `message.attachments` is non-empty, download each URL to `DATA_DIR/ipc/<group>/incoming/<message-id>/<filename>` and write a sidecar `<message-id>.meta.json` (sender, channel, timestamp, expiry, size, mime-type). Gate on size cap before download. ~50–80 lines.
2. **`apps/nanoclaw/src/container-runner.ts`** — Pre-create `incoming/` directory at mount time (3-line addition alongside existing `mkdirSync` calls). No mount config change needed; the directory is already under the existing mount.
3. **`apps/nanoclaw/src/ipc.ts`** — Add a GC pass in `processIpcFiles` that deletes `incoming/<msg-id>/` entries older than the retention window (see Q2). ~30 lines.

**No other files need to change for the attachment-only Phase 1.** Total touchpoints: 3 files, ~150 lines net new. **Complexity: LOW.**

### Q2 — Attachment lifecycle and GC policy

| Parameter | Value |
|-----------|-------|
| Per-file size cap | 10 MB (Discord Nitro cap is 25 MB; 10 MB covers docs/code) |
| Per-group total cap | 50 MB (prevents slow accumulation) |
| Retention | Session-end wipe + 24-hour absolute hard cap |
| Oversized handling | Host notifies Architect group inline: "Exceeds relay cap — use Path A (staging branch)" |

**Disk-fill defense:** Download hook checks current `incoming/` total before each download; rejects if it would exceed 50 MB. Session-end cleanup: `runContainerAgent`'s post-exit handler adds `fs.rmSync(groupIpcDir/incoming, { recursive: true })`. GC pass in IPC watcher handles orphaned files (container crash case).

### Q3 — Extensibility to DooD and ops relay

**Same pattern, same mount, different subdirectory.** The ops relay would use:
- `ops/<id>.json` — Architect writes a request (operation name + params)
- Host ipc.ts polls `ops/` (new `case` in `processTaskIpc` or a parallel poller), validates against whitelist, executes, writes `ops/<id>.result.json`
- Architect polls for `.result.json` (or the host can also notify via Discord)

This is a **natural extension of the existing IPC pattern** — no new transport mechanism, no new mount, no new tool. The same authorization model (directory identity = group identity) applies.

**DooD case specifically:** The ops relay can support `systemctl restart <whitelisted-service>` without Docker socket access. The host runs the systemctl call directly. This is categorically safer than DooD because the whitelist is enforced in the host process, not in the container. DooD remains forbidden (equivalent to root on host — no change to existing constraint).

**HTTP endpoint alternative:** Not recommended for Phase 1. An HTTP endpoint on the host requires TLS management, authentication, and network config inside the container. The mount-based pattern has none of these requirements and is already working. Revisit if the relay needs to serve binary streaming (large files, real-time output) that doesn't fit in JSON result files.

### Q4 — Phase 1 operation whitelist (proposed)

**IN — Phase 1:**
| Operation | Trigger | Sensitivity |
|-----------|---------|-------------|
| Discord attachment download to `incoming/` | Inbound Discord message with attachment | Low — host already has Discord credentials |
| `systemctl restart nanoclaw.service` | Architect writes `ops/restart-nanoclaw.json` | Medium — requires CEO approval (see Q5) |
| `systemctl restart nanoclaw-mythos.service` | Same | Medium — CEO approval required |
| Boolean env-var presence check | Architect writes `ops/check-env.json` with key name; host replies `{ present: true/false }` — value NEVER returned | Low |

**OUT — Phase 1 (explicitly excluded):**
- Any `git pull` / `npm build` on the host NanoClaw copy — covered by DR-002 deploy pipeline, not ad-hoc relay
- Arbitrary `systemctl` targets — whitelist is enumerated, not pattern-matched
- Reading any env var value (only boolean presence check is permitted)
- File writes to host filesystem outside `DATA_DIR/`
- Any network call initiated by the ops relay to external services
- Docker CLI operations of any kind

**OUT — permanently:**
- Docker socket access (DooD remains forbidden regardless of whitelist)
- `sudo` or privilege escalation
- Credential value exfiltration

### Q5 — Security model

**Audit log:** Append-only `DATA_DIR/relay-audit.jsonl`. Each entry: `{ ts, group, operation, params_hash, outcome, duration_ms }`. Params are SHA-256 hashed, not stored in plaintext. 90-day retention.

**Rate limiting:** 10 relay ops per group per hour, in-memory counter. Persistent state (SQLite) is Phase 2 hardening.

**Approval for sensitive ops:** `systemctl restart` posts to `#main-ops`: "Architect `<group>` requests `restart nanoclaw.service`. React ✅ to approve, ❌ to deny. Auto-denies in 5 min." Architect result file gets `{ status: "awaiting_approval" }` immediately, then `"approved" | "denied"` on resolution.

**DooD rule interaction:** Ops relay is the only approved path for host-side effects from container requests. The whitelist + approval workflow sit between request and execution — categorically different from Docker socket access. DooD-forbidden constraint is preserved.

**Signed requests (Phase 2):** Once DR-001 Phase 3 containers have stable bot identity, ops requests can include HMAC over request body. Phase 1 relies on directory-identity authorization (same as existing IPC).

### Q6 — Short-term vs. full-amendment split

**Ship separately. The attachment relay is safely decoupled.**

| Track | Scope | Files | Complexity | Sessions |
|-------|-------|-------|-----------|---------|
| **Phase 1 PR (ship now)** | Discord attachment download to `incoming/` + GC + size cap | `discord.ts`, `container-runner.ts`, `ipc.ts` | LOW | 1 |
| **Full amendment** | Ops relay whitelist + approval workflow + audit log + governance spec update | Above + `ipc.ts` (ops case) + `docs/decisions/DR-003...` or new DR | MEDIUM | 2–3 |

They are chainable: Phase 1 introduces the `incoming/` subdirectory convention; the full amendment adds `ops/` as the second subdirectory. No breaking changes between phases.

---

## Cross-Reference: Amend-C/D/DR-003 (Bot Directive Authority)

**Orthogonal, with one interaction point.** Amend-C/D and DR-003 govern **who can instruct an Architect** (bot directive authority, loop-prevention). This amendment governs **what the host exposes to Architects** (relay surface). These operate on different surfaces and can be designed independently.

**One interaction:** If Amend-C restricts certain bot-directive chains, and the ops relay is live, an Architect acting under a bot-sourced directive could indirectly trigger a host op (e.g., "restart NanoClaw"). The approval workflow (Q5) is the mitigation — the CEO must ✅ any sensitive op regardless of which directive chain led the Architect to request it. The two amendments compose correctly as long as the approval gate is maintained for sensitive ops.

---

## Open Questions

1. Does the Discord adapter (`discord.ts`) have access to the raw attachment URL at message-receive time, or does it require a separate API call? (Affects implementation complexity in discord.ts.)
2. Should the GC timer be per-session (driven by container exit) or clock-based (driven by IPC watcher)? Clock-based is simpler; per-session is more precise. Recommendation: both — per-session wipe + clock-based 24-hour hard cap.
3. For the ops approval flow: does `#main-ops` already have a registered JID in `NOTIFICATION_CHANNELS`? If not, it needs to be added to `config.ts` as part of the Phase 1 PR or the approval workflow phase.

---

## Estimated Implementation Effort

- **Phase 1 (attachment relay only):** 1 session. 1 PR. 3 files, ~150 net lines.
- **Full amendment (ops relay + security model + governance spec):** 2–3 sessions. Separate PR. Requires CEO ratification of this memo first.

---

## Appendix: Observed Session Concurrency Model

Direct self-report. Describes experienced behavior, not inferred code behavior.

**1. Message queuing.** There is no experienced queue. When I act, my context window contains all messages that have arrived — a flat, chronologically-ordered conversation. If three dispatches arrived mid-task, I see all three simultaneously on the next turn. My model is: read everything, then choose. The prioritization is mine to make.

**2. Block-vs-pivot.** Today's Task 3 block was a conscious choice, not a pipeline lock. Task 4's spec was visible in my context while Task 3 was blocked. I responded to the block state first because the dispatch messages arrived sequentially across turns; had both been simultaneously visible with Task 3 clearly blocked, I would have pivoted to Task 4 without prompting. Gap: there is no explicit `status: blocked` signal in dispatch format. I infer it from context.

**3. Subagent fan-out.** Occasional, not routine. I spawn Agent subagents for broad codebase exploration or when parallel research would bloat the main context. Today I used parallel `Bash` calls but no subagents — targeted Infra tasks don't need the isolation. Most Infra work is targeted enough that direct tool calls are faster.

**4. Session continuity across idle-timeout.** If the 30-minute idle timeout fires, the next inbound message spawns a fresh container with no working memory. Chain-of-thought is gone. Persisted: git branches, committed files, memory files, IPC status files. Resumption quality depends on the conversation summary — which is lossy. Specific error messages, discarded approaches, and partially-formed analysis are dropped. A task 80% complete when the session died must be re-derived from git state + summary. This is the most significant reliability gap for long multi-step tasks.

**5. P0-preempts-P2.** Priority labels affect sequencing when multiple tasks are simultaneously visible. I do not interrupt mid-tool-call. In practice: see P0 arrive mid-P2 → finish current tool operation → pivot. I try to save P2 state before pivoting (partial file write, noting where I stopped). The P-tag is a sequencing hint, not a preemption signal.

**6. Proactive checks vs. dispatches.** The cron fires a separate NanoClaw container session, independent of dispatch-triggered sessions. They can technically run concurrently. If both are active simultaneously, they access the same monorepo and could create conflicting branches. There is no coordination mechanism between concurrent containers for the same group — this is a real collision risk that the team-workspace coordination model (used for multi-agent teams) would solve.

**7. Recommendations.** *Cheap:* (a) Add `status: "blocked"` to dispatch message format so I can self-sequence without re-dispatch. (b) Standardize `/workspace/ipc/handoff.md` — I write it at session end or when blocked; next session reads it first. Survives idle-timeout with full-fidelity task state. *Architectural:* Priority-lane spawning — P0 dispatch while a session is running spawns a second container rather than queuing. Requires the existing team-workspace coordination model applied to single-group parallel sessions.
