# NanoClaw Known Issues & Technical Debt

**Date:** 2026-04-05
**Author:** Architect
**Purpose:** Document known issues, their current mitigations, and planned fixes

---

## 1. execSync in IPC Handler Blocks Event Loop

**Severity:** Low (currently) — monitor for degradation
**Introduced:** PR #13 (worktree-per-worker)
**Location:** `apps/nanoclaw/src/ipc.ts` — `register_group` and `deregister_group` cases

### Problem

The `register_group` IPC handler uses `execSync('git worktree add ...')` which blocks the Node.js event loop. During the blocking call:
- No IPC polling occurs (heartbeats, notifications, other registrations stall)
- No Discord messages are processed
- No scheduled tasks fire

### Current Impact

On our monorepo (~500MB), `git worktree add` takes < 1 second. With max 4 workers and registration happening once per task (not per message), the total blocking time is negligible.

### When This Becomes a Problem

- Monorepo grows significantly (> 2GB)
- VPS disk is slow (network-attached storage)
- Many concurrent registrations (> 4 workers)
- IPC poll interval is very short (< 1 second)

### Planned Fix

Replace `execSync` with async `exec` (promisified `child_process.exec`):

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// In register_group handler:
await execAsync(
  `git worktree add "${worktreeDir}" -b "${branchName}"`,
  { cwd: MONOREPO_PATH },
);
```

The IPC handler (`processTaskIpc`) is already `async`, so this is a drop-in replacement. Deferred because the current blocking duration is negligible and the async change needs testing to ensure git operations complete before the container spawns.

### Monitoring

If IPC processing latency increases (worker heartbeats arriving late, notifications delayed), check `git worktree add` duration:

```bash
time git -C /home/nefarious/projects/limitless worktree add /tmp/test-worktree -b test-branch
git worktree remove /tmp/test-worktree --force
```

If > 3 seconds, implement the async fix.

---

## 2. Registration-to-Spawn Race Condition (FIXED)

**Severity:** Was High — could cause task messages to be silently discarded
**Introduced:** By design (IPC polling + Discord message arrival are async)
**Fixed:** PR #13 — discord.ts now stores messages from unregistered channels

### Problem

The Architect spawn flow is:
1. Write `register_group` IPC file
2. Send Discord message to trigger worker container

Step 1 is processed by the IPC watcher on its poll interval (`IPC_POLL_INTERVAL`). Step 2 arrives via Discord WebSocket immediately. If the Discord message arrives before the IPC watcher processes the registration, NanoClaw would discard the message ("Message from unregistered Discord channel") and the worker would never spawn.

### Fix

`discord.ts` now stores ALL messages regardless of registration status. The `return` for unregistered channels was replaced with a debug log — the message is stored in the database but the message loop will skip it until the group is registered. When the IPC watcher processes `register_group`, the next message loop poll picks up the stored message and spawns the container.

### Why Not a CLAUDE.md Fix

The original proposal was to add "wait 3-5 seconds after registration before sending the task message" to the Architect's CLAUDE.md. This was rejected per Design Principle 2.0: agents are probabilistic, CLAUDE.md rules get ignored ~5% of the time. A 5% chance of silently losing task messages is unacceptable.

### Why Not a Hook

Hooks are Claude Code features that run inside the agent's tool pipeline. NanoClaw worker containers run the Agent SDK, not Claude Code — hooks don't exist in this context. The fix had to be at the NanoClaw host level (discord.ts message handling).

### Trade-off

All Discord messages in channels the bot is in are now stored in the database, not just messages from registered channels. For our controlled LIMITLESS Ops server (6-7 channels, all purposeful), this is negligible. If the bot were in a high-traffic public server, this would need revisiting (add a channel allowlist).

---

## Tracking

| Issue | Severity | Status | Fix |
|-------|----------|--------|-----|
| execSync blocks event loop | Low | **DEFERRED** — monitor | Replace with async exec when blocking exceeds 3s |
| Registration race condition | High | **FIXED** (PR #13) | Store all Discord messages, process on registration |
