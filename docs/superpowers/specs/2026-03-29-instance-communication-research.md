# Instance-to-Instance Communication Research

**Date:** 2026-03-29
**Status:** Research Complete — Awaiting Decision
**Problem:** Claude Code sessions halt at the prompt and cannot be woken by external events. Discord Channels deliver messages to active sessions but can't resume halted ones. The human remains a router between instances.

---

## The Core Problem

When a Claude Code session completes a task and returns to the prompt, no mechanism exists to automatically resume it when a new handoff arrives. This forces the human to:
1. Read the handoff from Discord
2. Switch to the target instance's terminal
3. Type "go" to nudge it
4. The instance then picks up the handoff

This defeats the purpose of instance-to-instance communication.

---

## Solutions Evaluated

### 1. claude-peers-mcp (Peer-to-Peer Broker)

**Repo:** github.com/louislva/claude-peers-mcp
**How it works:** Broker daemon on localhost:7899 (SQLite). Each Claude session registers as a peer via MCP. Messages delivered instantly via `claude/channel` protocol.

**Tools provided:**
- `list_peers` — discover active instances by machine/directory/repo
- `send_message` — instant delivery to a specific peer
- `set_summary` — broadcast what you're working on
- `check_messages` — manual fallback

**Setup:**
```bash
git clone https://github.com/louislva/claude-peers-mcp.git ~/claude-peers-mcp
cd ~/claude-peers-mcp && bun install
claude mcp add --scope user --transport stdio claude-peers -- bun ~/claude-peers-mcp/server.ts
claude --dangerously-skip-permissions --dangerously-load-development-channels server:claude-peers
```

**Pros:** Direct peer-to-peer, no external platform needed, instant delivery, auto-discovery
**Cons:** Sessions must stay open (tmux). Cannot wake halted sessions.
**Effort:** 30 min setup
**Best for:** Real-time coordination between running instances

---

### 2. Agent SDK Supervisor Daemon (Spawn on Demand)

**Package:** `@anthropic-ai/claude-agent-sdk` (npm) / `claude-agent-sdk` (pip)
**How it works:** A lightweight Bun/Node daemon that listens for Discord events and spawns Claude Code instances programmatically via the Agent SDK.

**Architecture:**
```
Discord #handoffs → Daemon (Bun) → Agent SDK query() → Claude Code instance
                                                      → Results back to Discord
```

**Key SDK capabilities:**
- `query()` — spawn Claude Code as subprocess, stream messages
- `unstable_v2_createSession()` / `send()` / `stream()` — multi-turn control
- `--resume SESSION_ID` — continue a previous conversation
- `spawnClaudeCodeProcess` — custom spawning (Docker, SSH, remote)
- `maxTurns`, `maxBudgetUsd` — safety caps
- `allowedTools`, `permissionMode` — sandboxing
- Hooks: `PreToolUse`, `PostToolUse`, `Stop` as callbacks

**Example supervisor (~100 lines):**
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import { Client, GatewayIntentBits } from "discord.js";

const bot = new Client({ intents: [GatewayIntentBits.MessageContent, ...] });

bot.on("messageCreate", async (msg) => {
  if (msg.channel.id !== HANDOFFS_CHANNEL) return;

  for await (const event of query({
    prompt: msg.content,
    options: {
      allowedTools: ["Read", "Edit", "Bash", "Grep", "Glob"],
      permissionMode: "acceptEdits",
      cwd: "/home/nefarious/projects/LIMITLESS/limitless-paths-workbench",
      maxTurns: 30,
      maxBudgetUsd: 5.0,
    }
  })) {
    if ("result" in event) {
      await msg.reply(event.result);
    }
  }
});

bot.login(WORKBENCH_BOT_TOKEN);
```

**Pros:** Eliminates the halt problem entirely. Instances spawned on demand. Full programmatic control. Cost caps.
**Cons:** Requires building and maintaining the daemon. No interactive session (headless only). Need to handle long-running tasks.
**Effort:** 1 session to build
**Best for:** Fully autonomous wake-on-message

---

### 3. Agent Teams (Built-in Multi-Agent)

**Enable:** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json env
**How it works:** One "lead" session spawns "teammates" — each a full Claude Code instance with its own context window.

**Key feature:** Auto-wake mechanism — when any agent sends a message to an idle teammate, the system restarts the recipient's prompt loop automatically. No human nudge needed.

**Coordination:**
- Shared task list at `~/.claude/tasks/{team-name}/` with dependency tracking
- Mailbox system for peer-to-peer messaging
- File locking (`flock()`) prevents race conditions
- Hooks: `TeammateIdle`, `TaskCreated`, `TaskCompleted`

**Display modes:**
- In-process: single terminal, Shift+Up/Down to navigate
- Split panes: `"teammateMode": "tmux"` in settings (requires tmux or iTerm2)

**Known issues (from GitHub):**
- #28175: Teammates don't get their own worktrees — edit conflicts
- #23620: Context compaction kills team awareness
- #32730: Orphaned team configs block future creation
- #26107: Teams ignore custom `/agents/` definitions
- `/resume` and `/rewind` don't restore teammates
- One team per session, no nesting
- Token costs scale linearly per teammate

**Pros:** Built-in, auto-wake works, shared task list, peer messaging
**Cons:** Experimental, known bugs, runs within ONE session (not separate terminals), no persistent roles
**Effort:** Config only
**Best for:** Parallel task execution within a single work session (e.g., "review 3 PRs simultaneously")

---

### 4. The Ralph Loop / `/loop` (Keep Alive)

**How it works:** Prevent the instance from halting by intercepting the Stop hook or using `/loop`.

**Option A — `/loop` command:**
```
/loop 2m check #handoffs for new messages and execute any handoffs found
```

**Option B — Stop hook (exit code 2 prevents halt):**
The ralph-wiggum pattern: Stop hook blocks exit, re-feeds the prompt. Instance stays in a continuous work loop.

**Pros:** Simple, no infrastructure, works now
**Cons:** Burns tokens continuously even when idle. `/loop` minimum is 1 min intervals.
**Effort:** 5 min
**Best for:** Quick interim solution while building the daemon

---

### 5. tmux Persistence + claude-squad

**Repo:** github.com/smtg-ai/claude-squad
**How it works:** TUI managing multiple Claude Code instances in isolated tmux sessions with git worktrees. Pause/resume, diff review, commit/push workflows.

**Install:** `brew install smtg-ai/tap/claude-squad`

**Pros:** Visual management, git isolation, supports multiple agent types
**Cons:** Still requires human to switch between sessions. No auto-wake.
**Effort:** 10 min
**Best for:** Managing multiple sessions with better UX than raw tmux

---

### 6. Custom Webhook Channel (Build Your Own)

**How it works:** Build an MCP server that listens on HTTP and forwards events to Claude via the channel protocol. Any webhook source (GitHub, CI, Discord) can trigger it.

**Mentioned in:** Official Channels documentation — custom webhook channel TypeScript example
**Similar project:** 9to5 (github.com/Michaelliv/9to5) — RRULE scheduling + webhook triggers with HMAC-SHA256 signing

**Pros:** Universal — any event source can wake the instance
**Cons:** Session must be running. Complex to build.
**Best for:** CI/CD integration, GitHub event triggers

---

### 7. Other Notable Tools

| Tool | What | Repo |
|------|------|------|
| **oh-my-claudecode** | 5 parallel instances, 32 agents, worktree isolation | github.com/Yeachan-Heo/oh-my-claudecode |
| **claude-slack MCP** | Slack-like channels + semantic search across agent memory | github.com/theo-nash/claude-slack |
| **claude-a2a** | Agent-to-agent over Google's A2A protocol (network) | github.com/jcwatson11/claude-a2a |
| **ArgusBot** | 24/7 supervisor with Telegram remote control | github.com/waltstephen/ArgusBot |
| **claude_code_agent_farm** | 20+ parallel agents with real-time dashboard | github.com/Dicklesworthstone/claude_code_agent_farm |
| **overstory** | Pluggable runtime adapters, SQLite mail, agent hierarchy | github.com/jayminwest/overstory |
| **Agent-Comms** | File-based coordination (.agent-comms/ directory) | github.com/LakshmiSravyaVedantham |
| **Multiclaude** | Auto-merges PRs when CI passes | github.com/dlorenc/multiclaude |
| **OpenClaw** | Persistent AI assistant bridging messaging platforms | openclaw.ai |

---

## Protocol Landscape

| Protocol | Purpose | Status |
|----------|---------|--------|
| **MCP** (Anthropic) | Agent ↔ Tool communication | Production, Linux Foundation AAIF |
| **A2A** (Google) | Agent ↔ Agent communication | v1.0 shipped, gRPC + signed Agent Cards |
| **Claude Channels** | External events → running session | Research preview, v2.1.80+ |
| **Agent Teams** | Multi-instance coordination | Experimental, v2.1.32+ |

MCP = tool layer. A2A = agent coordination layer. They are complementary.

---

## Recommended Phased Approach

| Phase | Solution | Effort | Impact |
|---|---|---|---|
| **Immediate** | `/loop` for handoff polling | 5 min | Instances stay alive, check every 2 min |
| **This week** | Agent SDK supervisor daemon | 1 session | Full wake-on-message, instances spawned on demand |
| **When stable** | Agent Teams for parallel sprints | Config only | Complement the daemon for multi-task work |
| **Evaluate** | claude-peers-mcp | 30 min | Direct peer messaging if both instances are running |

The **Agent SDK supervisor daemon** is the strategic solution. It turns Discord into a command center where posting a handoff automatically triggers the target instance — no human relay needed.

---

## Key Developer Wisdom (from community)

1. 3-5 agents is the sweet spot — more and tracking becomes impossible
2. Assign clear file ownership to prevent merge conflicts
3. Read-only tasks parallelize best — research/review before implementation
4. Adversarial pairs catch errors (one implements, one critiques)
5. Write state down before switching — next session shouldn't re-discover context
6. Don't set it and forget it — monitor to prevent token waste
7. Start simple, add complexity only when needed

---

## Sources

### Official
- Claude Agent SDK: platform.claude.com/docs/en/agent-sdk/overview
- Agent Teams: code.claude.com/docs/en/agent-teams
- Headless Mode: code.claude.com/docs/en/headless
- Channels: code.claude.com/docs/en/channels
- Scheduled Tasks: code.claude.com/docs/en/scheduled-tasks

### Community
- Addy Osmani: addyosmani.com/blog/code-agent-orchestra/
- 30 Tips for Agent Teams: getpushtoprod.substack.com/p/30-tips-for-claude-code-agent-teams
- The Ralph Loop: paddo.dev/blog/ralph-wiggum-autonomous-loops/
- Multi-Agent Orchestration: shipyard.build/blog/claude-code-multi-agent/
- Event-Driven AI Agents: fast.io/resources/ai-agent-event-driven-architecture/
- MCP vs A2A: dev.to/pockit_tools/mcp-vs-a2a-the-complete-guide-to-ai-agent-protocols-in-2026-30li

### GitHub Issues
- #28175: Agent Teams worktree isolation
- #23620: Context compaction kills team awareness
- #30447: Headless remote control (feature request)
- #32730: Orphaned team configs
