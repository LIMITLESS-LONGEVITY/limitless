# Agent Communication & Orchestration Plan

## Context

Two problems with the current agentic dev team setup:
1. **Inter-instance communication requires human relay** — "from workbench to main:" copy-paste pattern doesn't scale
2. **No orchestration layer** — human micromanages every task, routes every problem, acts as messenger

**Goal:** Shift the human from **router** to **approver**. Agents handle routine coordination autonomously, escalating only when a real decision is needed.

**Research basis:** Anthropic ecosystem (Agent Teams, CCR, hooks, MCP), NanoClaw (Claude Code-native orchestrator), OpenClaw (heavy gateway alternative).

---

## Decision: What to Build vs Adopt

| Component | Decision | Rationale |
|-----------|----------|-----------|
| File-based IPC mailbox | **Build** (NanoClaw pattern) | Agents share filesystem; JSON files in polling directory |
| Telegram notification | **Build** (10-line curl script) | Too simple for a dependency |
| CI cross-repo dispatch | **Build** (GitHub Actions native) | `repository_dispatch` is built-in |
| Issue state machine | **Build** (GitHub Actions native) | Label automation is standard |
| Scheduled agents | **Use existing** CCR | Already have daily QA; add more |
| Agent Teams | **Evaluate** | Test on first cross-repo task; don't depend on it |
| OpenClaw | **Do not adopt** | 500K lines, 70 deps — massively over-engineered for 2-3 agents |
| NanoClaw orchestrator | **Do not adopt** | Requires Docker containers; we run on shared filesystem |
| MCP Telegram server | **Consider later** | If agents need to READ Telegram (not just send). Send-only via curl is enough for now |

---

## Phase 1: File-Based IPC + Telegram Notifications (Week 1, $0)

### 1A. Shared Mailbox System

**Directory structure:**
```
~/projects/LIMITLESS/.claude/ipc/
  inbox/
    main/           # Messages TO Main instance
    workbench/      # Messages TO Workbench instance
  outbox/           # Processed messages (moved after reading)
```

**Message format** (one JSON file per message):
```json
{
  "id": "msg-20260328-143022-a1b2c3",
  "from": "workbench",
  "to": "main",
  "timestamp": "2026-03-28T14:30:22Z",
  "type": "status|request|handoff|escalation",
  "subject": "PR #25 ready for QA",
  "body": "Feature branch merged. Needs production smoke test.",
  "priority": "normal|urgent",
  "references": { "pr": "#25", "issue": "#18" }
}
```

**Files to create:**
- `scripts/ipc-send.sh` — helper to write properly formatted messages
- `scripts/ipc-read.sh` — helper to read and move messages from inbox

**Agent protocol** (added to each `.claude/agents/*.md`):
```
On session start:
1. Check IPC inbox: ls ~/projects/LIMITLESS/.claude/ipc/inbox/{self}/
2. Process messages (read, act, move to outbox)
3. Check GitHub Issues: gh issue list --label agent:{self} --label status:ready
4. Pick up highest-priority issue, or ask human
```

### 1B. Telegram Bot for Human Notification

**Setup (one-time, 5 min):**
1. Create Telegram bot via @BotFather
2. Get bot token + your chat ID
3. Store in `~/.config/limitless/telegram.env` (never committed)

**Files to create:**
- `scripts/telegram-notify.sh` — sends message via Telegram Bot API (curl)
- `scripts/escalate.sh` — agents call this when they need human intervention

**Hook integration** (add to `settings.local.json`):
- `Stop` hook → sends Telegram "Agent session ended. N unread IPC messages."
- Agents can also call `escalate.sh` directly mid-session for urgent needs (like the Terraform/sudo case today)

### 1C. Files to modify
- `~/projects/LIMITLESS/.claude/settings.local.json` — add Stop hook for both instances
- `~/projects/LIMITLESS/.claude/agents/*.md` (all 6) — add mailbox check protocol
- `~/projects/LIMITLESS/.claude/hooks/enforce-docs-only.sh` — whitelist `ipc/` directory
- `~/.claude/projects/.../memory/project_agent_communication.md` — update with Phase 1 status

**Timeline:** 2-4 hours. **Cost:** $0.

---

## Phase 2: CI-Reactive Orchestration (Week 2-3, $0)

### 2A. Cross-Repo Dispatch

When a PR merges on `limitless-paths` with label `affects:hub`, GitHub Actions auto-creates a follow-up issue on `limitless-hub`.

**Files to create:**
- `limitless-paths/.github/workflows/cross-repo-dispatch.yml`

**New labels** (add to all repos): `affects:hub`, `affects:dt`, `affects:paths`, `affects:infra`, `cross-repo`

**Requires:** Fine-grained PAT with `issues:write` on target repos, stored as `CROSS_REPO_TOKEN` secret.

### 2B. Post-Deploy Notification

After push to main → wait for Render deploy → curl health check → Telegram notification with result.

**Files to create:**
- `limitless-paths/.github/workflows/post-deploy-notify.yml`

**Requires:** `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as GitHub secrets.

### 2C. Scheduled Agent: CI Health Monitor

Second CCR agent, runs every 6 hours:
- Checks recent CI runs across all repos
- If failures: creates GitHub Issue with `priority:urgent` + sends Telegram alert
- Writes human brief: "3 things need your decision, 5 things are running fine"

**Created via:** `Skill(schedule)` — same mechanism as daily QA agent.

### 2D. Issue State Machine

Auto-transition GitHub Issue labels based on PR lifecycle:

```
status:ready → status:in-progress → status:pr-open → status:awaiting-review → status:awaiting-qa → status:done
```

**Files to create:**
- `limitless-paths/.github/workflows/issue-state-machine.yml`

Listens to PR events, updates issue labels automatically. Sends Telegram when review needed.

**Timeline:** 1 week. **Cost:** $0 (public repo CI + Max subscription CCR).

---

## Phase 3: Agent Auto-Pickup + Agent Teams Evaluation (Week 4-6, $0)

### 3A. Agent Auto-Pickup Protocol

Agents autonomously pick up the next task from their GitHub Issues queue on session start. Human pre-loads work by creating issues with the right labels; launching an agent is all that's needed.

### 3B. Agent Teams Evaluation

Test on first real cross-repo task (e.g., shared JWT type between PATHS and HUB):
```bash
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude
```
- Architect as lead, spawns PATHS + HUB engineers as teammates
- Evaluate: mailbox system, context sharing, reliability
- **Fallback:** Sequential workflow (already proven)

**Timeline:** 2-3 weeks. **Cost:** $0.

---

## How the Human's Day Changes

**Before (today):**
1. Open Main, manually check QA report
2. Decide tasks, tell Main what to do
3. Copy-paste context between instances
4. Tell Workbench what to implement
5. Remember to check deploy after merge
6. Tell Main to QA

**After (all 3 phases):**
1. Check Telegram — overnight QA + CI failures auto-reported
2. Create GitHub Issues (or they exist from auto-dispatch)
3. Launch Workbench — it reads IPC inbox + picks up highest-priority issue automatically
4. Workbench implements, pushes PR, writes IPC to Main
5. CI auto-reviews, human approves PR (Telegram ping)
6. Deploy auto-triggers, smoke test runs, Telegram confirms health
7. Launch Main for QA only if smoke test flagged an issue

**Human touches 3 points:** create issues, approve PRs, handle escalations. Everything else is automated.

---

## Verification

- **Phase 1:** Workbench writes IPC message → Main reads it on next launch. Agent calls `escalate.sh` → Telegram notification arrives on phone.
- **Phase 2:** PR merged with `affects:hub` label → auto-creates HUB issue + Telegram ping. CI fails → auto-creates issue + Telegram alert.
- **Phase 3:** Issue created with `agent:paths` + `status:ready` → launched agent picks it up without being told. Full loop: Issue → PR → CI → Merge → QA → Done with minimal human touch.
