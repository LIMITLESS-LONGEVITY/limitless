# NanoClaw Integration & Self-Modification Governance

**Date:** 2026-04-02
**Author:** Architect (Main Instance)
**Classification:** Internal — Division Director
**Status:** APPROVED — Decisions 1-5 accepted by Director (2026-04-02)

---

## 1. Problem Statement

NanoClaw is our agent runtime — the software that runs the Architect and all specialist engineers on the Hetzner VPS. It's a forked open-source project (~9,300 lines of TypeScript) that we've already customized (32 commits ahead of upstream, local modifications to Discord channel code).

Currently NanoClaw lives as an unversioned clone on the VPS. This creates three problems:

1. **No version control for our fork** — changes are made ad-hoc on the server. If the VPS dies, we lose our customizations.
2. **No governance for runtime changes** — the Architect agent can (and needs to) modify NanoClaw code, but there's no review process. A bad change could take down all agents.
3. **No deploy pipeline** — changes are applied by editing files on the VPS and restarting systemd. No CI, no rollback, no verification.

This spec defines how to integrate NanoClaw into our development workflow while addressing the unique challenge of an agent that modifies its own runtime.

---

## 2. NanoClaw Architecture Summary

### What it is

A single Node.js host process that:
- Connects to Discord via bot token
- Routes incoming messages to registered groups (SQLite)
- Spawns Docker containers per group, each running Claude Agent SDK
- Manages IPC between containers (file-based, per-group namespaces)
- Handles scheduled tasks, credential injection (OneCLI), and container lifecycle

### Key components

| Component | Location | Lines | Purpose |
|-----------|----------|-------|---------|
| Host process | `src/index.ts` | 768 | Startup, message loop, shutdown |
| Container runner | `src/container-runner.ts` | 736 | Spawn containers, mount config, security |
| Group queue | `src/group-queue.ts` | 365 | Concurrency (max 5), retry, idle management |
| Discord channel | `src/channels/discord.ts` | 264 | Bot connection, message filtering, routing |
| IPC system | `src/ipc.ts` | 468 | Inter-container messaging, task scheduling |
| Database | `src/db.ts` | 736 | SQLite state: groups, sessions, messages |
| Remote control | `src/remote-control.ts` | 224 | Claude web UI remote access |
| Agent runner | `container/agent-runner/src/` | ~800 | Runs inside each container (Claude Agent SDK) |
| Skills | `container/skills/` | ~4 dirs | Capabilities loaded per group |
| Tests | `*.test.ts` | ~2,400 | vitest unit tests |

### Security model

- Containers are isolated: non-main groups see only their own folder
- `.env` shadowed with `/dev/null` in mounts
- Credentials injected at runtime via OneCLI proxy (never in container env)
- Mount allowlist stored outside project (tamper-proof from containers)
- Per-group IPC namespaces prevent cross-group data leaks

### Critical code path: bot message filtering

`src/channels/discord.ts` line 50:
```typescript
if (message.author.bot) return;
```

This blocks ALL bot messages, including messages from the Architect bot itself. This is the line that prevents instance-to-instance communication — the core blocker for our agentic workflow.

---

## 3. Integration into Monorepo

### 3.1 Repository Location

**Decision: `apps/nanoclaw/` in the Turborepo monorepo**

Rationale:
- NanoClaw is application code we develop and deploy, not infrastructure config
- It has its own build step (`npm run build`), tests (`vitest`), and deploy target (VPS)
- Turborepo can manage its build pipeline alongside other apps
- Git history preserved via `git subtree add` from our fork

Alternative considered: `infra/nanoclaw/` — rejected because it has its own Node.js build pipeline, tests, and runtime. It's more "app" than "infra config."

### 3.2 Fork Management

**Our fork**: `LIMITLESS-LONGEVITY/nanoclaw` (GitHub)

- Track upstream: `qwibitai/nanoclaw` as a remote
- Our customizations live on `main` branch of our fork
- Upstream merges via `git subtree pull` into monorepo (same as other apps)
- Upstream updates should be reviewed for breaking changes before merging

### 3.3 Build & Test Pipeline

```yaml
# turbo.json addition
{
  "tasks": {
    "apps/nanoclaw#build": {
      "dependsOn": [],
      "outputs": ["dist/**"]
    },
    "apps/nanoclaw#test": {
      "dependsOn": ["apps/nanoclaw#build"]
    }
  }
}
```

**CI checks for NanoClaw PRs:**
1. `npm run build` — TypeScript compilation succeeds
2. `npm test` — vitest passes (2,400+ lines of tests)
3. `./container/build.sh` — Docker image builds

### 3.4 Deploy Pipeline

**Current (ad-hoc):** SSH into VPS, edit files, restart systemd.

**Target (automated):**

```
PR merged to main (apps/nanoclaw/)
  → GitHub Actions detects nanoclaw change
  → Runs build + test
  → SSH to VPS:
    1. git pull in /home/limitless/nanoclaw
    2. npm install && npm run build
    3. ./container/build.sh (rebuild agent image)
    4. sudo systemctl restart nanoclaw
    5. Health check: verify Architect posts "Online" to #main-ops within 60s
  → If health check fails: rollback to previous commit, restart, alert to #alerts
```

**Rollback mechanism:**
- Git-based: `git checkout <previous-commit> && npm run build && systemctl restart nanoclaw`
- Architect fallback: Director launches local Architect if VPS is down

---

## 4. Self-Modification Governance

### 4.1 The Core Tension

The Architect agent needs to modify NanoClaw to:
- Add bot-message routing (the immediate fix)
- Register new groups, skills, or IPC handlers
- Customize agent-runner behavior per group
- Fix bugs in its own runtime

But the Architect modifying its own runtime creates risks:
- **Constraint weakening** — agent removes its own safety checks
- **Circular failure** — bug in NanoClaw takes down the Architect, which can't then fix it
- **Review gap** — who reviews the Architect's changes to itself?

### 4.2 Governance Model: Tiered Authority

**Tier 1: Configuration changes (Architect can do autonomously)**
- Registering new groups in SQLite
- Updating mount allowlist
- Adding/modifying group CLAUDE.md files
- Registering OneCLI agents
- Modifying skills in `container/skills/`

These don't change NanoClaw's runtime behavior. They're data/config, not code.

**Tier 2: Non-behavioral code changes (Architect proposes via PR, Director reviews)**
- Agent-runner customizations per group
- New skill development
- Test additions
- Documentation updates
- Logging or formatting changes

These change code but don't affect security, routing, or container lifecycle.

**Tier 3: Behavioral code changes (Architect proposes via PR, Director reviews, QA verifies)**
- Message routing logic (e.g., the bot-message fix)
- Container spawning / mount configuration
- IPC authorization
- Security model changes (allowlists, credential injection)
- Shutdown / lifecycle management

These affect core runtime behavior. Require:
1. Architect creates PR with clear explanation of WHY
2. Director reviews the diff
3. QA smoke test after deploy: all 5 services healthy, Architect responds to Discord, engineer container spawns on test message

**Tier 4: Self-preservation changes (Director only)**
- Changes to the governance model itself
- Changes to boundary enforcement hooks
- Removal of safety checks
- systemd service configuration

The Architect should NEVER propose removing its own constraints. If it does, that's a red flag.

### 4.3 The "Surgeon Operating on Themselves" Safeguard

**Rule: The Architect can propose changes to NanoClaw, but never deploys them to the VPS autonomously.**

Deploy flow:
1. Architect creates PR to `apps/nanoclaw/`
2. CI runs build + test
3. Director reviews and merges
4. Deploy pipeline runs (automated or Director-triggered)
5. Architect verifies it's still functional post-deploy

**Fallback chain if Architect is down:**
1. Director launches local Architect: `cd ~/projects/limitless && claude --dangerously-skip-permissions --channels plugin:discord@claude-plugins-official`
2. Local Architect diagnoses VPS issue via SSH
3. Local Architect creates fix PR
4. Director deploys fix to VPS

### 4.4 What the Architect Must Never Do

- Modify NanoClaw code directly on the VPS (all changes via PR)
- Remove or weaken bot-message filtering without Director approval
- Modify mount-allowlist.json to grant broader access than needed
- Change OneCLI credential injection to expose secrets to containers
- Alter systemd service configuration
- Disable or modify its own CLAUDE.md constraints

---

## 5. The Bot-Message Fix (First PR)

### Problem
`src/channels/discord.ts` line 50 filters all bot messages. The Architect bot posts to engineer channels to assign work, but NanoClaw ignores these messages because they come from a bot.

### Proposed Fix

Replace the blanket `if (message.author.bot) return;` with group-aware filtering:

```typescript
// Always ignore own messages (prevent self-response loops)
if (message.author.id === this.client?.user?.id) return;

// For non-main groups: allow bot messages (Architect routes work via bot)
// For main group: block bot messages (prevent bot-to-bot loops)
const group = registeredGroups[chatJid];
if (message.author.bot && group?.isMain) return;
```

**Why this is safe:**
- Self-messages still blocked (no infinite loops)
- Main group still ignores other bots (Architect doesn't process bot messages)
- Engineer channels accept bot messages from the Architect (enables handoff routing)
- Non-main groups that `requiresTrigger` still need the trigger pattern (additional filter)

### Verification
1. Architect posts to `#paths-eng` → PATHS Engineer container spawns
2. Random bot message in `#main-ops` → still ignored
3. Architect message in `#main-ops` → still ignored (self-message filter)
4. Human message in `#paths-eng` → still works (unchanged)

### Risk: Other bots posting to engineer channels
- Mitigated by Discord channel permissions — only Architect bot and Director have write access
- Future: add sender allowlist per group if needed

---

## 6. Documentation Updates

### CLAUDE.md additions

Add to the main CLAUDE.md under Apps:

```markdown
### NanoClaw (`apps/nanoclaw/`)
- **Stack:** Node.js 22 + TypeScript + SQLite + Docker
- **Purpose:** Agent runtime — runs Architect and engineer containers on VPS
- **Deploy target:** Hetzner VPS (`limitless-agents-1`)
- **Governance:** Tiered authority — see `docs/superpowers/specs/2026-04-02-nanoclaw-integration-governance.md`
- **Hard constraint:** NEVER deploy NanoClaw changes directly to VPS — always via PR
```

### Memory file updates

Update `project_agentic_infrastructure.md` with:
- NanoClaw is now a tracked app in the monorepo
- Governance tiers for self-modification
- Deploy pipeline details

---

## 7. Implementation Sequence

| Step | What | Who | Blocked By |
|------|------|-----|------------|
| 1 | Create `LIMITLESS-LONGEVITY/nanoclaw` fork on GitHub | Director | — |
| 2 | `git subtree add` into monorepo at `apps/nanoclaw/` | Architect | Step 1 |
| 3 | Add Turborepo build config for nanoclaw | Architect | Step 2 |
| 4 | Add CI job: build + test for nanoclaw changes | Architect | Step 3 |
| 5 | Implement bot-message fix as first PR | Architect | Step 4 |
| 6 | Set up deploy pipeline (GH Actions → VPS) | Architect | Step 5 verified |
| 7 | Update CLAUDE.md and memory files | Architect | Step 5 |

Steps 1-4 establish the governance pipeline. Step 5 is the first change through it. Step 6 automates deployment.

---

## 8. Decisions (Director-Approved)

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Fork ownership | `LIMITLESS-LONGEVITY/nanoclaw` | All LIMITLESS assets under the org. `chmod735-dor` is personal, never used for LIMITLESS. |
| 2 | Deploy automation | Implement automated pipeline now | No shortcuts — we built these workflows for a reason. |
| 3 | Tier 1 autonomy | Group registration + CLAUDE.md + OneCLI = autonomous. Mount allowlist = Director approval. All code = PR. | Keeps Architect productive for operations while protecting security boundaries. |
| 4 | Upstream tracking | Weekly sync on Mondays | NanoClaw releases almost daily (50+ commits/week). Falling >2 weeks behind risks missing security fixes. Review CHANGELOG.md before each merge. |
| 5 | Agent-runner customization | No per-group customization (Option C) | No use case yet. All engineers need the same tools. Revisit if specific need arises. |

---

## 9. Architecture Correction: Container Lifecycle

**Important:** All NanoClaw containers are ephemeral — including the Architect. There is NO "always-on daemon" mode. The `isMain` flag only affects mount permissions, task visibility, and IPC scope — NOT container lifecycle.

**Actual lifecycle (same for all groups):**
1. Message arrives in Discord channel → NanoClaw spawns container
2. Agent processes message, responds
3. Container idles (30 min timeout)
4. If no new messages arrive → `_close` sentinel → container stops and is auto-removed

**Proactive behavior via scheduled tasks (not persistence):**

The Architect's "proactive" behavior is achieved through NanoClaw's task scheduler, not container persistence:

| Task ID | Schedule | Mode | Purpose |
|---------|----------|------|---------|
| `daily-briefing` | `0 9 * * *` (09:00 UTC daily) | `group` (preserves session) | Post daily briefing to #main-ops: health checks, open PRs, pending handoffs |
| `proactive-check` | `*/30 * * * *` (every 30 min) | `isolated` (fresh each time) | Script checks health + open PRs. Only wakes agent if issues found. |

The proactive-check uses a **pre-execution script** — a bash script that runs before the agent wakes. If all services are healthy and no PRs are open, the script returns `{"wakeAgent": false}` and no API credits are consumed. The agent only wakes when there's something actionable.

**This diverges from the original infrastructure plan** which described the Architect as a "24/7 daemon with proactive wake-ups." The actual implementation is event-driven + cron-scheduled, which is more cost-efficient and architecturally consistent with NanoClaw's ephemeral container design.

---

*This spec establishes NanoClaw as a first-class LIMITLESS application with governance controls that balance agent autonomy against runtime safety. The tiered authority model allows the Architect to be productive while ensuring behavioral changes go through human review.*
