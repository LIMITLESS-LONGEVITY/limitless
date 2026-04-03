# Agent Communication Research: Claude Code Channels + Agent Teams + Discord

## Context

Our current inter-instance communication uses a patchwork system: Telegram group (dual-bot + local mirror files), file-based IPC (superseded), and manual message relay. This works but has reliability issues (stale mirrors, "go" protocol not enforced, bash hooks can't call MCP tools).

Claude Code has shipped two official features that solve this problem natively:
1. **Channels** (research preview, v2.1.80+) — push events into a running session via Discord/Telegram/iMessage
2. **Agent Teams** (experimental, v2.1.32+) — multiple instances coordinate via shared task list + direct messaging

## Option 1: Claude Code Channels with Discord

### What It Is
A Channel is an MCP server that pushes events into a running Claude Code session. Discord is a supported channel — messages sent to a Discord bot arrive in the Claude Code session in real-time. Claude can reply back through the same channel.

### How It Works
1. Create a Discord bot + server (one-time setup)
2. Install the Discord channel plugin: `/plugin install discord@claude-plugins-official`
3. Launch Claude Code with: `claude --channels plugin:discord@claude-plugins-official`
4. Pair your Discord account with the bot
5. Messages sent in Discord arrive in the Claude Code session as `<channel source="discord">` events
6. Claude replies appear in Discord

### What This Solves
- **Human → Instance:** message from Discord arrives in the running session (no "go" needed)
- **Instance → Human:** Claude replies back through Discord
- **Instance → Instance:** Both instances connect to the same Discord server. Main posts in `#main-ops`, workbench posts in `#workbench-ops`. Each reads the other's channel.
- **Permission relay:** if Claude hits a permission prompt while you're away, it can forward the prompt to Discord for remote approval

### Setup Requirements
- Discord server with bot (free)
- Bun runtime installed
- Claude Code v2.1.80+
- Launch with `--channels` flag

### Limitations
- **Research preview** — syntax and protocol may change
- **Events only arrive while session is open** — no offline queuing
- **One session per channel instance** — each Claude Code session needs its own `--channels` launch
- **No cross-session messaging** — Channels push INTO a session, not BETWEEN sessions directly

### Discord Server Structure for LIMITLESS
```
LIMITLESS Ops (Discord Server)
├── #main-ops        — main instance posts status, reads workbench messages
├── #workbench-ops   — workbench posts status, reads main messages
├── #handoffs        — structured handoff documents
├── #alerts          — CI failures, deploy notifications, health checks
└── #human           — your commands and approvals
```

## Option 2: Claude Code Agent Teams

### What It Is
Multiple Claude Code instances coordinating as a managed team. One session is the "lead" that spawns and coordinates "teammates." They share a task list, claim work, and message each other directly.

### How It Works
1. Enable: set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
2. Tell the lead: "Create a team with a PATHS engineer and a HUB engineer"
3. Lead spawns teammates, each with its own context window
4. Shared task list: lead creates tasks, teammates self-claim
5. Direct messaging between teammates (not just lead↔teammate)
6. Teammates load CLAUDE.md + MCP servers automatically

### Architecture
- **Team lead:** main Claude Code session (creates team, coordinates, synthesizes)
- **Teammates:** separate Claude Code instances (own context, own tools)
- **Task list:** shared, with dependencies and status tracking (pending/in-progress/completed)
- **Mailbox:** built-in messaging system for inter-agent communication
- **Hooks:** TeammateIdle, TaskCreated, TaskCompleted — enforce quality gates

### What This Solves
- **No manual relay:** teammates message each other directly
- **Task coordination:** shared task list with dependency tracking + self-claiming
- **Quality gates:** hooks enforce rules (e.g., require tests before marking complete)
- **Plan approval:** lead can require teammates to plan in read-only mode before implementing
- **Display modes:** in-process (Shift+Down to cycle) or split panes (tmux/iTerm2)

### Limitations
- **Experimental** — disabled by default
- **No session resumption** — `/resume` doesn't restore in-process teammates
- **One team per session** — can't run multiple teams
- **No nested teams** — teammates can't spawn sub-teams
- **Lead is fixed** — can't transfer leadership
- **Higher token cost** — each teammate is a separate Claude instance
- **File conflicts** — two teammates editing the same file causes overwrites
- **WSL compatibility unknown** — split panes require tmux (may not work well in WSL)

## Option 3: Hybrid — Channels + Agent Teams

### The Best of Both
- **Agent Teams** for coordinated development work (shared tasks, direct messaging, quality hooks)
- **Discord Channel** for human oversight and async communication (when you're away from terminal)
- **Telegram** kept for mobile push notifications only (Stop hook still uses bash)

### Flow
```
Human (Discord app on phone)
  ↓ posts in #human channel
Discord Channel plugin
  ↓ pushes event into lead session
Agent Team Lead (main instance)
  ↓ creates tasks, assigns to teammates
Teammates (workbench, etc.)
  ↓ work independently, message each other via mailbox
  ↓ complete tasks, report via team task list
Lead synthesizes results
  ↓ posts summary to Discord via channel reply
Human sees result on phone
```

## Recommendation

### Phase 1 (Immediate): Discord Channel
- Set up Discord server + bot
- Install Discord channel plugin on main instance
- Launch with `--channels` flag
- Replace Telegram group for human↔instance communication
- Keep bash Stop hook for Telegram mobile notifications

### Phase 2 (This Sprint): Agent Teams Evaluation
- Enable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
- Test with a real cross-repo task (e.g., HUB clinician portal)
- Evaluate: reliability, token cost, WSL compatibility
- If stable: adopt as primary coordination mechanism
- If not: continue with Discord Channels + manual coordination

### Phase 3 (After Evaluation): Full Adoption
- Agent Teams for all multi-instance development work
- Discord Channel for human oversight + async messaging
- Telegram for mobile-only push notifications
- Remove: file-based IPC, local mirror files, tg-check.sh hook, tg-send.sh scripts

## What Changes Architecturally

### Remove (eventually)
- `scripts/tg-send.sh`, `tg-read.sh`, `tg-check.sh` — replaced by Channels
- `scripts/ipc-send.sh`, `ipc-read.sh`, `ipc-check.sh` — already superseded
- `.claude/ipc/` directory — local mirror files no longer needed
- PreToolUse hook for message checking — Channels push automatically
- CLAUDE.md Telegram protocol sections — replaced by team coordination

### Keep
- `scripts/on-stop.sh` — Telegram mobile push (bash-compatible)
- `scripts/telegram-notify.sh` — CI/deploy notifications from GitHub Actions

### Add
- Discord server + bot configuration
- `--channels` flag in launch commands
- Agent team configuration in settings.json
- Updated CLAUDE.md with team coordination protocols

## Prerequisites
- [ ] Update Claude Code to v2.1.80+ (check with `claude --version`)
- [ ] Install Bun runtime (`curl -fsSL https://bun.sh/install | bash`)
- [ ] Create Discord server + bot (free)
- [ ] Test Agent Teams flag on WSL

## Sources
- [Claude Code Channels Documentation](https://code.claude.com/docs/en/channels)
- [Claude Code Agent Teams Documentation](https://code.claude.com/docs/en/agent-teams)
- [Claude Code Channels: Anthropic Agent Setup](https://www.blockchain-council.org/claude-ai/claude-code-channels-anthropic-openclaw-style-ai-agent-setups/)
- [VentureBeat: Anthropic ships Channels](https://venturebeat.com/orchestration/anthropic-just-shipped-an-openclaw-killer-called-claude-code-channels)
