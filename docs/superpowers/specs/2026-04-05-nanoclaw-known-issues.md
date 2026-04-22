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

---

## 3. Director Commands Don't Reach Architect via #human Channel

**Severity:** Medium — blocks the intended Director → Architect command flow
**Discovered:** 2026-04-05 (F.4 end-to-end test)

### Problem

The intended flow is: Director posts to #human → Architect receives and orchestrates. But #human (`dc:1487865397045625074`) is registered as a **separate non-main group**. Posting there spawns a generic worker container with the global CLAUDE.md, not the Architect's orchestration CLAUDE.md.

Additionally, the Director's commands posted via the Claude Code Discord plugin (a bot) are **filtered in #main-ops** because the main group blocks bot messages (PR #7, line 57: `if (message.author.bot && group?.isMain) return;`). The Director must type directly in Discord for the Architect to see the message.

### Current Workaround

Director types commands directly in #main-ops from their Discord account (human messages, not bot).

### Planned Fix Options

**Option A: Bot allowlist for main group**
Add a trusted bot ID list to the main group's message filter. The Claude Code plugin bot and any future Director tools get allowlisted. Other bots still blocked.

```typescript
const TRUSTED_BOT_IDS = (process.env.TRUSTED_BOT_IDS || '').split(',').filter(Boolean);
if (message.author.bot && group?.isMain && !TRUSTED_BOT_IDS.includes(message.author.id)) return;
```

**Option B: Route #human to Architect**
Deregister #human as a separate group. Instead, make the Architect's proactive check (30-min cron) also scan #human for new messages. Latency: up to 30 minutes.

**Option C: Merge #human into #main-ops**
Eliminate #human entirely. Director commands go to #main-ops alongside Architect status posts. Simpler, but mixes Director commands with Architect output.

**Recommendation:** Option A — most precise, minimal latency, preserves channel separation.

### Impact on End-to-End Test

The F.4 test requires the Director to type in Discord directly. This works but is inconvenient for a Director who wants to send commands via the Claude Code CLI session (which uses the bot).

---

## 4. Stale CLAUDE.md in Running Containers

**Severity:** Low — one-time issue during deployment
**Discovered:** 2026-04-05 (F.4 end-to-end test)

### Problem

NanoClaw loads the group CLAUDE.md when a container starts and caches it for the container's lifetime. If the CLAUDE.md is updated on the host while a container is running (e.g., during deployment), the running container still uses the old version. The Architect container that was alive during our deployment continued using the old "Andy" instructions instead of the new orchestration protocol.

### Fix

Stop the running container after deployment so the next message triggers a fresh spawn with the updated CLAUDE.md. Add this to the deploy script:

```bash
# After npm run build:
docker stop $(docker ps -q --filter "name=nanoclaw-discord-limitless-ops") 2>/dev/null || true
```

### Prevention

Add a deploy step that kills all running NanoClaw containers after a code/CLAUDE.md update. The next incoming message will spawn fresh containers with the new code.

---

---

## 5. GH_TOKEN Not Reaching Subagent Shell Processes (FIXED)

**Severity:** High — blocked all autonomous PR creation
**Discovered:** 2026-04-05 (F.4 end-to-end test)
**Root cause identified by:** VPS Architect (collaborative debugging session)

### Problem

Docker `-e GH_TOKEN` injects the token into the container's process environment table. The main agent process (Node.js) sees it via `process.env.GH_TOKEN`. But when the Agent SDK spawns a **subagent** that runs bash commands (`git push`, `gh pr create`), the subagent's shell is a **non-login, non-interactive shell** that:
- Has the token in `env` output (reads from process table)
- Does NOT have `$GH_TOKEN` as a shell variable (shell doesn't auto-export inherited env)

`env | grep GH_TOKEN` → present. `echo $GH_TOKEN` → empty. This is a shell initialization behavior, not a Docker or Agent SDK bug.

### Root Cause Chain

```
Docker -e GH_TOKEN=xxx     → container process environment table ✅
  → Node.js process.env    → sees GH_TOKEN ✅
  → Agent SDK bash tool     → spawns non-login shell
    → process env table     → GH_TOKEN present (env shows it) ✅
    → shell variable space  → $GH_TOKEN empty ❌ (not auto-exported by non-login shell)
```

### Fix: 3-Layer Credential Injection

1. **Docker -e flag** (`container-runner.ts`): Injects `GH_TOKEN` and `GITHUB_TOKEN` into container process env
2. **Entrypoint writes /etc/environment** (`Dockerfile`): Entrypoint script writes token to `/etc/environment` at startup
3. **/etc/bash.bashrc sources /etc/environment** (`Dockerfile`): Every bash invocation (including non-interactive) sources `/etc/environment` with `set -a` (auto-export)

```dockerfile
# In Dockerfile:
RUN echo 'set -a; [ -f /etc/environment ] && . /etc/environment; set +a' >> /etc/bash.bashrc
```

```bash
# In entrypoint.sh:
if [ -n "$GH_TOKEN" ]; then
  echo "GH_TOKEN=$GH_TOKEN" >> /etc/environment
  echo "GITHUB_TOKEN=$GH_TOKEN" >> /etc/environment
  export GH_TOKEN GITHUB_TOKEN="$GH_TOKEN"
fi
```

### What Failed (Attempted Fixes Before Root Cause Was Found)

| Attempt | Why It Failed |
|---------|--------------|
| Docker `-e` alone | Subagent shell doesn't export inherited env |
| `export` in entrypoint.sh | Node inherits it but Agent SDK subagent spawns fresh shell |
| `/etc/environment` alone | Only read by PAM for login shells; subagent uses non-login shell |
| `.agent-credentials.env` workaround | Works but requires agent to explicitly `source` it — CLAUDE.md rule, probabilistic |

### VPS Deployment Requirements

For this fix to work on a fresh VPS setup:
1. `GH_TOKEN` must be in NanoClaw's `.env` file
2. systemd service must have `EnvironmentFile=/home/limitless/nanoclaw/.env`
3. Container image must be built with the `/etc/bash.bashrc` + `/etc/environment` + entrypoint changes
4. `npm run build` must be clean (delete `dist/` first — TypeScript incremental compilation misses some changes)

### IaC Requirements

All changes are in the monorepo at `apps/nanoclaw/`:
- `container/Dockerfile` — gh CLI install, /etc/bash.bashrc sourcing, /etc/environment permissions
- `src/container-runner.ts` — Docker `-e GH_TOKEN` + `GITHUB_TOKEN` flags
- `src/channels/discord.ts` — bot allowlist (TRUSTED_BOT_IDS)
- `src/config.ts` — MONOREPO_PATH, WORKTREE_BASE, NOTIFICATION_CHANNELS

VPS-specific config (not in repo):
- `.env` — contains actual token values (gitignored)
- `/etc/systemd/system/nanoclaw.service` — EnvironmentFile directive

---

---

## 6. Git Worktree Ownership Mismatch in Containers (FIXED)

**Severity:** High — blocked container task execution for all Architects
**Discovered:** 2026-04-03 (post-Phase-0 deploy verification)
**Fixed:** Immediate `chown` + deploy rule, no code change required

### Problem

After the Phase 0 monorepo sync, NanoClaw worker containers were failing with git permission errors when attempting to operate on the worktree mounted at `/workspace/extra/monorepo`. The git working tree was owned by `root` (UID 0) while the container process runs as `limitless` (UID 1000). Git refuses to operate on directories it does not own.

```
fatal: detected dubious ownership in repository at '/workspace/extra/monorepo'
To add an exception for this directory, call:
  git config --global --add safe.directory /workspace/extra/monorepo
```

Even with `safe.directory` workarounds in CLAUDE.md, write operations (`git add`, `git commit`, `git worktree add`) failed because the UID mismatch is enforced at the filesystem level, not just git's safety check.

### Root Cause

Manual SSH operations during Phase 0 setup were run as `root` (direct `sudo su` session), which created worktree directories and git index files owned by UID 0. NanoClaw's systemd service runs as `limitless` (UID 1000) and spawns containers with the same UID. The mismatch was invisible until containers actually attempted write operations.

### Fix

**Immediate:** `chown -R limitless:limitless /home/limitless/projects/limitless` and `/tmp/nanoclaw-worktrees/` to realign all ownership to UID 1000.

**Ongoing deploy rule:** All VPS operations that touch the monorepo or worktree directories must be run as the `limitless` user:

```bash
# Correct
sudo -u limitless git -C /home/limitless/projects/limitless pull
sudo -u limitless npm run build

# Wrong — creates root-owned files in the git index
sudo git -C /home/limitless/projects/limitless pull
```

### Why Not a Code Fix

The container-runner could defensively `chown` worktrees after creation, but this would require the NanoClaw process to have `sudo` or `CAP_CHOWN` capability — expanding the attack surface unnecessarily. The correct fix is a process guardrail: never create or modify worktree content as root. This is a deploy-time discipline issue, not a software bug.

## Tracking

| Issue | Severity | Status | Fix |
|-------|----------|--------|-----|
| execSync blocks event loop | Low | **DEFERRED** — monitor | Replace with async exec when blocking exceeds 3s |
| Registration race condition | High | **FIXED** (PR #13) | Store all Discord messages, process on registration |
| Director commands don't reach Architect | Medium | **FIXED** | Bot allowlist: TRUSTED_BOT_IDS env var (PR #19) |
| Stale CLAUDE.md after deploy | Low | **FIXED** | Deploy script now: `rm -rf dist/ && npm run build` + container kill |
| GH_TOKEN not reaching subagent shells | High | **FIXED** | 3-layer injection: Docker -e → /etc/environment → /etc/bash.bashrc (PR #19) |
| Git worktree ownership mismatch | High | **FIXED** | UID 1000 alignment confirmed. Deploy rule: never create worktrees as root |
