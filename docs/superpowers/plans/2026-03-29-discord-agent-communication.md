# Discord Agent Communication Setup

**Date:** 2026-03-29
**Status:** In Progress
**Replaces:** Telegram group comms (`2026-03-28-telegram-group-comms-design.md`)

## Overview

Migrate all agent-to-agent and agent-to-human communication from Telegram (polling + local mirror + scripts) to Discord Channels (push-based, native history, dedicated channels).

## Discord Infrastructure

**Server:** LIMITLESS Ops
**Bots:** LIMITLESS Main, LIMITLESS Workbench

| Channel | ID | Purpose | Who posts | Who reads |
|---|---|---|---|---|
| `#main-ops` | 1487865125095477299 | Main instance status & commands | Main bot + human | Main instance |
| `#workbench-ops` | 1487865199489974433 | Workbench status & commands | Workbench bot + human | Workbench instance |
| `#handoffs` | 1487865262786216126 | Structured task handoffs | Both bots | Both instances |
| `#alerts` | 1487865323045785700 | Urgent escalations, CI failures | Both bots | Human (mobile push) |
| `#human` | 1487865397045625074 | Human commands, approvals | Human | Both instances |

## Bot Configuration

**Main bot** (`~/.claude/channels/discord/`):
- Listens: `#main-ops`, `#handoffs`, `#alerts`, `#human`
- Launch: `claude --dangerously-skip-permissions --channels plugin:discord@claude-plugins-official`

**Workbench bot** (`~/.claude/channels/discord-workbench/`):
- Listens: `#workbench-ops`, `#handoffs`, `#alerts`, `#human`
- Launch: `DISCORD_STATE_DIR=~/.claude/channels/discord-workbench claude --dangerously-skip-permissions --channels plugin:discord@claude-plugins-official`

## Communication Protocol

### Session Start
1. `fetch_messages` from own ops channel + `#handoffs` (recent history)
2. If handoff messages found → execute immediately without asking
3. Post "online" status to own ops channel

### During Work
- Messages arrive as push events — no polling needed
- React with ack emoji on receipt
- Reply in the channel the message came from
- Use `edit_message` for progress updates (no push notification)
- Send new `reply` when task completes (triggers push notification)

### Before Stopping
- Post completion status to own ops channel
- If handoff needed → post structured handoff to `#handoffs`
- If blocked/escalation → post to `#alerts`
- **Never stop without posting status**

### Cross-Instance Handoffs
Post to `#handoffs` with structured format:
```
**Handoff: [Title]**
- **From:** [role]
- **Action needed:** [what the other instance should do]
- **Context:** [relevant details, PR numbers, file paths]
- **Priority:** [normal/urgent]
```

### Escalations
Post to `#alerts` with priority prefix:
```
🔴 URGENT: [description]
🟡 Attention needed: [description]
```

## What This Replaces

### Deleted Scripts
- `scripts/tg-read.sh` — replaced by `fetch_messages` tool
- `scripts/tg-send.sh` — replaced by `reply` tool
- `scripts/tg-check.sh` — eliminated (push-based, no polling)
- `scripts/on-stop.sh` — replaced by `reply` tool in protocol
- `scripts/telegram-notify.sh` — replaced by `reply` to `#alerts`
- `scripts/escalate.sh` — replaced by `reply` to `#alerts`
- `scripts/ipc-send.sh` — eliminated (channels are the bus)
- `scripts/ipc-read.sh` — eliminated
- `scripts/ipc-check.sh` — eliminated

### Deleted Directories
- `.claude/ipc/` — entire IPC directory (mirror, inbox, outbox, state)

### Removed Hooks
- `PreToolUse` hook for `tg-check.sh` — push replaces polling
- `Stop` hook for `on-stop.sh` — protocol replaces hook

### Updated Files
- `CLAUDE.md` (root) — Telegram protocol → Discord protocol
- `limitless-paths/CLAUDE.md` — same
- `.claude/agents/*.md` (all 6) — Telegram → Discord in session protocols
- `.claude/settings.local.json` — remove Telegram-related hooks and permissions

## Key Advantages Over Telegram

| Capability | Telegram | Discord |
|---|---|---|
| Message delivery | Polling (5min cooldown) | Push (instant) |
| Cross-instance visibility | Local mirror files | Native channel history |
| Message persistence | 24h expiry | Permanent |
| Organization | Single flat group | 5 dedicated channels |
| Threading | None | Reply threading |
| Processing indicator | None | ackReaction + typing |
| File sharing | Separate uploads | Inline attachments |
| Progress updates | Not supported | edit_message |
| Infrastructure | 6 scripts + hooks + mirror | Zero scripts, zero hooks |
