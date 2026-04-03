# Claude Code Agent Teams — Deep Research Report

**Date:** 2026-03-29
**Status:** Research complete
**Feature status:** Experimental (disabled by default)
**Minimum version:** Claude Code v2.1.32+
**Launched:** February 6, 2026, with Claude Opus 4.6

---

## Table of Contents

1. [What Agent Teams Are](#1-what-agent-teams-are)
2. [Architecture and Internals](#2-architecture-and-internals)
3. [Enabling and Configuration](#3-enabling-and-configuration)
4. [Tools and Primitives](#4-tools-and-primitives)
5. [Task System](#5-task-system)
6. [Communication and Messaging](#6-communication-and-messaging)
7. [Auto-Wake Mechanism](#7-auto-wake-mechanism)
8. [Display Modes and Navigation](#8-display-modes-and-navigation)
9. [Quality Gates and Hooks](#9-quality-gates-and-hooks)
10. [Best Practices](#10-best-practices)
11. [Known Limitations](#11-known-limitations)
12. [Known Bugs (GitHub Issues)](#12-known-bugs-github-issues)
13. [Token Costs](#13-token-costs)
14. [Real-World Case Studies](#14-real-world-case-studies)
15. [Comparison with Alternatives](#15-comparison-with-alternatives)
16. [Relevance to LIMITLESS](#16-relevance-to-limitless)

---

## 1. What Agent Teams Are

Agent Teams coordinate multiple Claude Code instances working together as a team. One session acts as the **team lead** (orchestrator), and it spawns **teammates** — each a full, independent Claude Code instance with its own context window (up to 1M tokens).

**Key distinction from subagents:** Subagents report results back to the parent only and never talk to each other. In agent teams, teammates share a task list, claim work, and communicate directly with each other via peer-to-peer messaging.

**Best use cases:**
- Research and review (multiple perspectives simultaneously)
- New modules or features (each teammate owns separate files)
- Debugging with competing hypotheses (parallel theory testing)
- Cross-layer coordination (frontend, backend, tests owned by different teammates)

---

## 2. Architecture and Internals

### Components

| Component | Role |
|-----------|------|
| **Team Lead** | Main Claude Code session. Creates team, spawns teammates, coordinates work, synthesizes results |
| **Teammates** | Separate Claude Code CLI processes, each with independent context window |
| **Task List** | Shared file-backed work items with dependency tracking and auto-unblocking |
| **Mailbox** | Per-agent inbox files enabling direct messaging between any agents |

### File Structure

```
~/.claude/
├── teams/{team-name}/
│   ├── config.json              # Team metadata + members array
│   └── inboxes/{agent-name}.json  # Per-agent message inbox
└── tasks/{team-name}/
    ├── .lock                     # flock() mutex for concurrent task claiming
    ├── .highwatermark            # Auto-increment counter for task IDs
    └── {task-id}.json            # Individual task files
```

### Environment Variables Set on Teammates

- `CLAUDE_CODE_TEAM_NAME` — identifies the team
- `CLAUDE_CODE_AGENT_ID` — agent identifier
- `CLAUDE_CODE_AGENT_TYPE` — role type
- `CLAUDE_CODE_PLAN_MODE_REQUIRED` — boolean for plan approval workflow

### Internal Implementation

Binary analysis reveals `AsyncLocalStorage` context with fields: `agentId`, `agentName`, `teamName`, `parentSessionId`, `color`, `planModeRequired`.

Key internal functions: `isTeammate()`, `isTeamLead()`, `waitForTeammatesToBecomeIdle()`, `getTeammateContext()`, `setDynamicTeamContext()`.

---

## 3. Enabling and Configuration

### Enable via settings.json (recommended)

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Enable via shell environment

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

### Display mode configuration (~/.claude.json)

```json
{
  "teammateMode": "in-process"   // or "tmux" or "auto"
}
```

### CLI flag override

```bash
claude --teammate-mode in-process
```

---

## 4. Tools and Primitives

Enabling Agent Teams unlocks these tools:

| Tool | Purpose |
|------|---------|
| **TeamCreate** | Initialize team infrastructure (config + task directory) |
| **TaskCreate** | Create task JSON files with subject, description, dependencies |
| **TaskUpdate** | Claim tasks (set in_progress) or mark completed |
| **TaskList** | Query available tasks for self-claiming |
| **Task** (with team_name) | Spawn a teammate as full Claude Code session |
| **SendMessage** | Direct agent-to-agent communication |
| **TeamDelete** | Remove team config and task files after shutdown |

### SendMessage Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `task_assignment` | lead -> teammate | Work delegation |
| `message` | any -> any | Direct peer messaging |
| `broadcast` | lead -> all | Team-wide announcement (expensive) |
| `shutdown_request` | lead -> teammate | Graceful termination request |
| `shutdown_response` | teammate -> lead | Approval or rejection |
| `plan_approval_request` | teammate -> lead | Plan for review |
| `plan_approval_response` | lead -> teammate | Approve or reject plan |
| `idle_notification` | teammate -> lead | Turn completion signal |

---

## 5. Task System

### Task Schema (per JSON file)

- `id` — auto-incremented numeric ID
- `subject` — imperative title
- `description` — requirements and acceptance criteria
- `activeForm` — present-continuous spinner text
- `status` — `pending` | `in_progress` | `completed` | `deleted`
- `blocks` / `blockedBy` — dependency arrays

### Task Lifecycle

```
PENDING → IN_PROGRESS → COMPLETED
```

### Concurrency Control

- **File locking**: `.lock` file with `flock()` prevents race conditions when multiple teammates try to claim the same task
- **Lowest-ID-first ordering**: teammates prefer claiming the oldest available task
- **Dependency enforcement**: tasks with non-empty `blockedBy` arrays cannot be claimed until all blocking tasks reach terminal state
- **Auto-unblocking**: completing a task automatically unblocks dependent tasks

### Task Assignment Modes

- **Lead assigns**: explicitly tell the lead which task goes to which teammate
- **Self-claim**: teammates pick up next unassigned, unblocked task after finishing current work

---

## 6. Communication and Messaging

### Delivery Mechanism

1. Sender appends a new entry to recipient's inbox JSON array file
2. Message is injected into the recipient's session as a **synthetic user message** (so the LLM actually sees it)
3. If recipient is idle, **auto-wake** restarts their prompt loop

### Message Fields

Each inbox entry: `from`, `text` (JSON-serialized payload), `timestamp` (ISO 8601), `read` (boolean flag)

### Communication Patterns

- **Automatic message delivery** — no polling by lead needed
- **Idle notifications** — teammates notify lead after every LLM turn
- **Direct messaging** — any teammate to any teammate
- **Broadcasts** — lead to all (costs scale linearly with team size)
- **Peer DM visibility** — when a teammate DMs another teammate, a brief summary is included in the lead's idle notification

### Delivery Receipts

Recipients' `markRead` operations trigger delivery receipts as regular team messages. Batched by sender, fired once per prompt loop completion. Best-effort — crashes between `markRead()` and receipt injection lose the notification.

---

## 7. Auto-Wake Mechanism

**This is the critical design pattern for the "can teammates wake each other up" question.**

### How It Works

1. After every LLM turn, a teammate automatically goes idle and sends an `idle_notification` to the lead
2. Being idle is the **normal resting state**, not an error
3. When a message is sent to an idle agent, the system **restarts the recipient's prompt loop automatically**
4. The next poll cycle picks up the inbox message

### The Design Problem It Solved

The original challenge: teammate spawning needed to be fire-and-forget (non-blocking) so the lead could spawn multiple teammates in parallel. But non-blocking spawn meant the lead would exit after spawning. Blocking spawn prevented parallel coordination.

**The solution was auto-wake**: spawning stays fire-and-forget, but the messaging layer can restart idle sessions. When a teammate sends a message to an idle lead (or vice versa), the system restarts the recipient's prompt loop automatically.

### Practical Implications

- YES, teammates can wake each other up via messaging
- YES, teammates can wake the lead
- YES, the lead can wake idle teammates
- The wake mechanism is through the inbox polling + synthetic message injection
- This enables fully asynchronous coordination without blocking operations

---

## 8. Display Modes and Navigation

### In-Process Mode (default — works in any terminal)

All teammates run inside the main terminal. Navigation:
- **Shift+Down** — cycle through teammates
- **Shift+Up** — cycle back
- **Enter** — view a teammate's session
- **Escape** — interrupt a teammate's current turn
- **Ctrl+T** — toggle task list view
- **Shift+Tab** — toggle delegate mode (lead = coordination only, no code)

### Split Pane Mode (requires tmux or iTerm2)

Each teammate gets its own terminal pane. Click into a pane to interact directly.

**NOT supported in:** VS Code integrated terminal, Windows Terminal, Ghostty.

### Configuration

```json
// ~/.claude.json
{ "teammateMode": "auto" }  // "auto" | "in-process" | "tmux"
```

`"auto"` (default) uses split panes if already in tmux, in-process otherwise.

---

## 9. Quality Gates and Hooks

### TeammateIdle Hook

Fires when a teammate is about to go idle. Exit code 2 sends feedback and keeps the teammate working. Use for automatic follow-up task distribution.

### TaskCreated Hook

Fires when a task is being created. Exit code 2 prevents creation and sends feedback.

### TaskCompleted Hook

Fires when marking a task complete. Exit code 2 prevents completion and sends feedback. Useful for enforcing "tests must pass before task closure."

### Hook Handler Types

- `command` — shell scripts
- `prompt` — single-turn LLM evaluation
- `agent` — multi-turn subagent with up to 50 turns

---

## 10. Best Practices

### Team Size

- **Start with 3-5 teammates** for most workflows
- **5-6 tasks per teammate** keeps everyone productive
- Beyond ~5 teammates, coordination overhead increases faster than throughput
- "Three focused teammates often outperform five scattered ones"

### Context

- Teammates get CLAUDE.md, MCP servers, and skills automatically
- Teammates do NOT inherit the lead's conversation history
- Include task-specific details in the spawn prompt
- Well-structured CLAUDE.md with module boundaries reduces per-teammate exploration costs

### File Conflicts

- **Never let two teammates edit the same file** — this causes overwrites
- Break work so each teammate owns different files/directories
- "Frontend agent stays in the frontend directory. Backend agent stays in the backend directory."

### Task Sizing

- Too small = coordination overhead dominates
- Too large = teammates work too long without check-ins
- Sweet spot: self-contained units producing clear deliverables

### Delegation

- The lead sometimes starts implementing instead of delegating — tell it "delegate this to your teammates" or use **Delegate Mode** (Shift+Tab)
- Delegate Mode restricts lead to coordination-only tools

### Plan Approval

For risky work, require plans before implementation:
```
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

### Monitoring

- Check in on teammates' progress regularly
- Don't let teams run unattended too long — token waste accumulates
- "Don't set it and forget it"

### Startup Pattern

- Start with read-only tasks first (research, review, code analysis)
- Graduate to parallel implementation after establishing patterns
- "80% planning and review, 20% execution"

### Model Selection

- Specify models per teammate: "Use Sonnet for each teammate"
- Opus for lead reasoning, Sonnet for focused implementation = cost-effective

### Permissions

- Pre-approve common operations before spawning to reduce permission prompt floods
- All teammates inherit lead's permission settings at spawn
- Use `--dangerously-skip-permissions` on lead if appropriate (all teammates inherit it)

---

## 11. Known Limitations

### Session Resumption

**No session resumption with in-process teammates.** `/resume` and `/rewind` do not restore in-process teammates. After resuming, the lead may try to message teammates that no longer exist. Solution: tell the lead to spawn new teammates.

### Task Status Lag

Teammates sometimes fail to mark tasks as completed, blocking dependent tasks. Check actual completion status manually and nudge teammates.

### Shutdown

- Teammates finish their current request/tool call before shutting down (can take time)
- Always clean up through the lead, not by manually killing processes
- Manual termination "can get into a really weird state, potentially with memory leaks"

### Team Constraints

- **One team per session** — clean up before starting a new one
- **No nested teams** — teammates cannot spawn their own teams
- **Lead is fixed** — cannot promote a teammate or transfer leadership
- **Permissions set at spawn** — can adjust post-spawn but not at creation time

### Backpressure

No bounded queue mechanics. A fast sender can flood a slow receiver. 10KB per-message limit exists but no flow control.

### No Cross-Agent Cost Aggregation

Token tracking exists per-session but no team-wide cost visibility.

---

## 12. Known Bugs (GitHub Issues)

These are open/reported bugs on the `anthropics/claude-code` repository as of March 2026:

| Issue | Description |
|-------|-------------|
| **#23676** | Agent Teams do not respect `CLAUDE_CONFIG_DIR` when spawning — fail to share task list |
| **#23506** | Custom agents (`--agent`) cannot spawn subagents into teams — Task tool unavailable |
| **#25254** | VS Code extension: teammate messages not delivered to lead; permission prompts invisible, causing deadlock |
| **#28048** | VS Code extension: Agent Teams tools not available despite env var set |
| **#26511** | Shift+Up/Down pane switching auto-sends pre-filled suggestion to wrong agent |
| **#29293** | Teammates fail to spawn with stdin error when using `--print` mode |
| **#29567** | No graceful degradation on session interruption — repository conflicts and incomplete work |
| **#32730** | Subagent-created teams persist on disk after session ends, blocking future team creation |
| **#24246** | Idle status is delayed — lead thinks active teammates are idle |

**Stability assessment:** The feature works but has rough edges. Terminal CLI is more stable than VS Code extension. The core file-based coordination is solid but edge cases around cleanup, session interruption, and VS Code integration are problematic.

---

## 13. Token Costs

| Configuration | Approximate Token Usage |
|---------------|------------------------|
| Solo session | ~200k tokens |
| 3 subagents | ~440k tokens |
| 3-person agent team | ~800k tokens |
| Agent teams in plan mode | ~7x standard sessions |
| 3-teammate team for 30 min | ~3-4x sequential single session |

Token usage scales linearly with number of active teammates. Each teammate maintains its own full context window.

**Cost optimization strategies:**
- Use Sonnet for focused teammate work, Opus only for lead
- Prefer direct messages over broadcasts
- Limit team size to actual needs
- Reserve subagents for routine tasks
- Start with plan mode (cheap ~10k tokens) before spawning expensive teams

---

## 14. Real-World Case Studies

### The C Compiler (Anthropic Internal)

Nicholas Carlini (Anthropic Safeguards team) used 16 agents to build a Rust-based C compiler:
- **2,000 Claude Code sessions** over ~2 weeks
- **2 billion input tokens**, 140 million output tokens
- **~$20,000 API cost**
- **Result:** 100,000 lines of Rust code, boots Linux 6.9 on x86/ARM/RISC-V
- Compiles QEMU, FFmpeg, SQLite, PostgreSQL, Redis, Doom
- 99% pass rate on GCC torture tests

Key architecture: Each agent ran in its own Docker container. Git-based synchronization with lock files in `current_tasks/` directory. No explicit communication channels — coordination via shared git repo.

Key insights:
- "The task verifier is nearly perfect, otherwise Claude will solve the wrong problem"
- Test output must avoid flooding context window
- Deterministic `--fast` flag sampling 1-10% of tests for efficiency
- The compiler represents "the frontier of Opus 4.6 capabilities"

### QA Swarm (Community)

5 agents testing a production site:
- qa-pages: 16 URLs for HTTP 200 + valid HTML
- qa-posts: 83 blog posts validation
- qa-links: 146 internal URL checks
- qa-seo: RSS, sitemap, og: tags, JSON-LD
- qa-a11y: heading hierarchy, ARIA, theme toggle

Entire lifecycle: ~3 minutes.

### Nine-Agent Development System (Community)

Manager (Opus 4.5) coordinating: event loops agent, Architect, Developer pair (TDD), CAB agent for quality assurance.

---

## 15. Comparison with Alternatives

### Agent Teams vs Subagents

| Aspect | Subagents | Agent Teams |
|--------|-----------|-------------|
| Context | Own window; results to caller | Own window; fully independent |
| Communication | Report to parent only | Direct peer messaging |
| Coordination | Parent manages all | Shared task list + self-coordination |
| Best for | Focused tasks (result only) | Complex collaborative work |
| Token cost | Lower | Higher (3-4x) |

### Agent Teams vs Gas Town (Steve Yegge)

- Gas Town: "Kubernetes for AI agents" — more structured, opinionated
- "Mayor" agent decomposes tasks and spawns designated agents
- Better for solo developers, supports more parallel agents
- Higher setup friction

### Agent Teams vs Multiclaude (Dan Lorenc)

- "Brownian ratchet" approach — CI passing triggers automatic PR merges
- Singleplayer and Multiplayer modes
- Better for team workflows and sustained execution
- Medium setup friction

### Agent Teams vs Claude Code Channels (Discord/Telegram)

Channels solve cross-session communication for **separate persistent instances**. Agent Teams solve **within-session parallelism** for a single coordinated task. They are complementary:
- Channels = long-lived inter-instance messaging (main/workbench communication)
- Agent Teams = short-lived parallel task execution within one session

---

## 16. Relevance to LIMITLESS

### Current Setup

Our dual-instance governance (main + workbench) uses Telegram/Discord channels for cross-instance communication. This is a different use case from Agent Teams.

### Where Agent Teams Could Help

1. **Cross-layer features**: When we need frontend (OS Dashboard) + backend (Digital Twin API) + gateway changes simultaneously — each owned by a different teammate
2. **Parallel code review**: Security + performance + test coverage review of PRs across multiple repos
3. **Research tasks**: Multiple teammates investigating different wearable integrations simultaneously
4. **Multi-repo coordination**: When a change spans PATHS + HUB + Digital Twin + Gateway

### Where Agent Teams Would NOT Help

1. **Main/workbench governance model**: Agent Teams are within-session, short-lived. Our governance model needs persistent, independent instances. Discord Channels remain the right solution.
2. **Sequential deployment**: Our deploy pipeline is inherently sequential (build -> verify -> push)
3. **Same-file edits**: Most of our work is focused on single files at a time

### Recommendation

Agent Teams is a **complementary tool**, not a replacement for our Discord Channels setup. Use it for:
- Large refactoring tasks that span multiple services
- Parallel investigation / research sprints
- Multi-perspective code review before merges

Keep Discord Channels for:
- Persistent main/workbench communication
- Handoffs between sessions
- Long-lived operational coordination

---

## Sources

### Official Documentation
- [Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams) — Official docs
- [Anthropic: Building a C Compiler](https://www.anthropic.com/engineering/building-c-compiler) — Case study

### Technical Deep Dives
- [Reverse-Engineering Claude Code Agent Teams](https://nwyin.com/blogs/claude-code-agent-teams-reverse-engineered) — Protocol and file format details
- [Claude Code's Hidden Multi-Agent System](https://paddo.dev/blog/claude-code-hidden-swarm/) — Pre-release discovery
- [From Tasks to Swarms: Agent Teams in Claude Code](https://alexop.dev/posts/from-tasks-to-swarms-agent-teams-in-claude-code/) — Seven core primitives
- [Building Agent Teams in OpenCode](https://dev.to/uenyioha/porting-claude-codes-agent-teams-to-opencode-4hol) — Auto-wake architecture

### Guides and Tutorials
- [Claude Code Agent Teams: Setup & Usage Guide 2026](https://claudefa.st/blog/guide/agents/agent-teams) — Comprehensive setup guide
- [Agent Teams Controls: Delegate Mode, Hooks & More](https://claudefa.st/blog/guide/agents/agent-teams-controls) — Controls reference
- [30 Tips for Claude Code Agent Teams](https://getpushtoprod.substack.com/p/30-tips-for-claude-code-agent-teams) — Practical tips
- [Claude Code Swarms](https://addyosmani.com/blog/claude-code-agent-teams/) — Addy Osmani overview

### Community Experiences
- [How to Set Up and Use Claude Code Agent Teams](https://darasoba.medium.com/how-to-set-up-and-use-claude-code-agent-teams-and-actually-get-great-results-9a34f8648f6d)
- [Multi-agent orchestration for Claude Code](https://shipyard.build/blog/claude-code-multi-agent/) — Comparison with Gas Town and Multiclaude
- [Agent Teams in Claude Code](https://cobusgreyling.medium.com/claude-code-agent-teams-ca3ec5f2d26a)

### GitHub Issues (Bugs)
- [#24246 — Idle status delayed](https://github.com/anthropics/claude-code/issues/24246)
- [#25254 — VS Code message delivery failure](https://github.com/anthropics/claude-code/issues/25254)
- [#28048 — VS Code tools not available](https://github.com/anthropics/claude-code/issues/28048)
- [#29567 — No graceful degradation on interruption](https://github.com/anthropics/claude-code/issues/29567)
- [#32730 — Orphaned team configs block future creation](https://github.com/anthropics/claude-code/issues/32730)
