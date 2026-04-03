# Telegram Group Communication Design

## Context

The original inter-instance communication used file-based IPC (JSON files in inbox/outbox directories). While functional, this had key limitations:
- Couldn't wake the other instance
- Human still had to relay messages ("from workbench: ...")
- File-based polling added overhead and confusion

## Key Insight

The communication events between instances are **well-defined and finite**:
- Instance finishes task → notify group
- Instance hits a blocker → escalate to group
- Instance needs the other instance's attention → post to group
- Human writes a directive → post to group

Instead of building complex IPC, use a **Telegram group as the shared message bus**. All participants (main instance, workbench instance, human) read and write to the same group.

## Architecture

```
┌─────────────┐                                    ┌───────────────────┐
│    Main      │──@limitless_os_bot──────┐          │    Workbench      │
│  Instance    │                         ▼          │    Instance       │
│             ◀──── local mirror ◀── tg-mirror/ ──▶ │                   │
└─────────────┘                         ▲          └───────────────────┘
                    ┌────────────────────┘                   │
                    │   LIMITLESS Ops                        │
                    │   Telegram Group     ◀──@limitless_workbench_bot
                    │                                        │
                    │   Human sees all    ◀── local mirror ──┘
                    └────────────────────┘
```

### Dual-Bot + Local Mirror

**Problem:** Telegram bots cannot see other bots' messages via `getUpdates`, even with privacy mode off and admin rights. This means main's bot can't read workbench's bot messages, and vice versa.

**Solution:** Each instance uses its own bot to send to the Telegram group (so the human sees everything). On send, a local mirror file is written to `~/.claude/ipc/tg-mirror/`. On read, the script merges:
1. **Telegram API** (`getUpdates`) — human messages
2. **Local mirror files** — other instance's bot messages

This gives complete visibility: each instance sees messages from the other instance + the human.

### Bots

| Bot | Username | Used by | Purpose |
|-----|----------|---------|---------|
| LIMITLESS Dev Ops | `@limitless_os_bot` | Main instance | Send as `[main]`, read human messages |
| LIMITLESS Workbench | `@limitless_workbench_bot` | Workbench instance | Send as `[workbench]`, read human messages |

Both bots are **admins** in the group with **privacy mode OFF** (via @BotFather).

### Message Format

Messages are prefixed with the sender role: `[main] PR merged, ready for QA.`

Local mirror files (`~/.claude/ipc/tg-mirror/<timestamp>-<role>.json`):
```json
{"from":"main","date":1774720800,"text":"[main] PR merged, ready for QA."}
```

## Scripts

| Script | Purpose |
|--------|---------|
| `tg-send.sh <role> <msg>` | Post to group with `[role]` prefix via role's bot + write local mirror |
| `tg-read.sh [--since N] [--for role]` | Read group messages (Telegram API + local mirror), filter by time and role |
| `tg-check.sh <role>` | PreToolUse hook — checks group once per 5 min, surfaces messages from others |
| `on-stop.sh <role>` | Stop hook — posts halt summary + reports unread messages |

## Hooks

| Hook | Event | Script | Instance |
|------|-------|--------|----------|
| `Stop` | Instance halts | `on-stop.sh main` | Main |
| `Stop` | Instance halts | `on-stop.sh workbench` | Workbench |
| `PreToolUse` (matcher: `""`) | Every tool call | `tg-check.sh main` | Main |
| `PreToolUse` (matcher: `""`) | Every tool call | `tg-check.sh workbench` | Workbench |

## Flow

1. Instance works, posts status to group via `tg-send.sh` (human sees in Telegram, mirror file written)
2. Instance halts → `on-stop.sh` posts `[role] Session ended.` + any unread messages
3. Human sees everything in Telegram, launches the other instance
4. Other instance starts → first tool call triggers `tg-check.sh` → reads Telegram API (human msgs) + local mirror (bot msgs)
5. Human can also post in group — both instances see it via their bot's `getUpdates`

## What This Replaces

The file-based IPC system is superseded:
- ~~`ipc-send.sh`~~ → `tg-send.sh`
- ~~`ipc-read.sh`~~ → `tg-read.sh`
- ~~`ipc-check.sh`~~ → `tg-check.sh`
- ~~`inbox/outbox directories`~~ → Telegram group + `tg-mirror/`

## Limitations

- `getUpdates` auto-purges after 24h — fine for our cadence
- Bots can't see each other's messages in Telegram — solved by local mirror
- Local mirror requires shared filesystem — both instances run on same machine (WSL), so this works
- Telegram API rate limits: 30 messages/second per group (not a concern)

## Configuration

- Main bot: `@limitless_os_bot` — token in `TELEGRAM_BOT_TOKEN`
- Workbench bot: `@limitless_workbench_bot` — token in `TELEGRAM_WORKBENCH_BOT_TOKEN`
- Group: "LIMITLESS Ops" — chat ID in `TELEGRAM_GROUP_ID`
- All secrets in `~/.config/limitless/secrets.env`
- Both bots: admin in group, privacy OFF

## Future: Topic-Based Groups

Once base communication is stable, migrate to Telegram Forum topics (or multiple groups) to separate concerns:
- `#ops` — deploy notifications, health checks, CI status
- `#handoffs` — task handoffs between instances
- `#escalations` — blockers needing human attention
- `#qa` — QA reports and results

This avoids loading irrelevant messages and keeps each conversation in context.
