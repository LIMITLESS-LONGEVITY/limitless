# Claw-Code & oh-my-codex: Agentic Workflow Analysis

**Date:** 2026-04-05
**Author:** Architect (Main Instance)
**Classification:** Internal — Division Director
**Purpose:** Research analysis of the claw-code clean-room rewrite and the oh-my-codex/clawhip orchestration stack, with actionable recommendations for LIMITLESS agentic division

---

## Table of Contents

1. [What Happened](#1-what-happened)
2. [The Players](#2-the-players)
3. [How It Was Done — Technical Breakdown](#3-how-it-was-done)
4. [The Agentic Workflow Stack — Deep Dive](#4-the-agentic-workflow-stack)
5. [Architecture Comparison: OMX vs LIMITLESS](#5-architecture-comparison)
6. [Actionable Lessons for LIMITLESS](#6-actionable-lessons)
7. [Implementation Recommendations](#7-implementation-recommendations)
8. [References](#8-references)

---

## 1. What Happened

### The Precipitating Event

On **March 31, 2026 at 1:23 AM**, security researcher Chaofan Shou discovered that Anthropic had accidentally shipped `@anthropic-ai/claude-code` v2.1.88 with a **59.8 MB JavaScript source map** containing **512,000 lines of unobfuscated TypeScript across 1,906 source files**. The source map was included because of a missing `.npmignore` entry.

Within hours, the code was on GitHub and spawning thousands of forks.

### The Clean-Room Response

At approximately **4:00 AM**, Sigrid Jin (@realsigridjin / @instructkr) — a 25-year-old UBC student and one of the world's most prolific Claude Code users (25 billion tokens consumed in one year, profiled by the Wall Street Journal) — woke up with his "phone blowing up."

Rather than hosting a copy of Anthropic's proprietary code, Jin chose a **clean-room approach**: study the architectural patterns from the leaked source, then independently reimplement them in Python. The key claim is that **the developer never opened a terminal**. He typed instructions into Discord, went to sleep, and by morning a complete Python port was deployed.

### The Results

- **claw-code** reached **50,000 GitHub stars in 2 hours** — the fastest to that milestone in GitHub history
- **100,000 stars in ~1 day** — fastest ever to 100K
- **156,000+ stars and 101,000+ forks** at time of research
- 5,000 Discord members joined within 24 hours
- xAI sent Jin Grok credits with encouragement

### What claw-code Actually Is

Despite the viral marketing narrative, claw-code is **not a fully working drop-in replacement for Claude Code**. The repository contains:

- A **Python metadata scaffold** (`src/`) — a surface-area mirror of the leaked TypeScript, with `tools_snapshot.json` mapping 100+ tool file paths and `commands_snapshot.json` with 207 command entries. This is not a runtime — it's a research/audit layer.
- A **Rust port** (`rust/`) — this is the real implementation, now 92.9% of the codebase. It contains a functional agent loop, 17+ built-in tools, hook pipeline, permission system, MCP support, plugin system, multi-provider abstraction (Anthropic + xAI/Grok), and session compaction.
- An honest **PARITY.md** that explicitly documents gaps vs the original TypeScript.

The value of claw-code is not as a product — it's as a **demonstration that OMX-orchestrated agents can produce a working, architecturally-faithful reimplementation of a complex system in hours**.

---

## 2. The Players

### Sigrid Jin (@realsigridjin / @instructkr)

- 25-year-old student at University of British Columbia (Korean-Canadian)
- WSJ-profiled as one of the world's most prolific Claude Code users
- Uses both Claude Code and OpenAI Codex, switching based on task characteristics
- Created claw-code; maintains the public-facing narrative

### Yeachan Heo (@bellman_ych / Yeachan-Heo)

- Seoul-based developer; quantitative trader by day
- Creator of the entire orchestration stack:
  - **oh-my-codex (OMX)** — workflow layer for OpenAI Codex CLI
  - **oh-my-claudecode (OMC)** — same pattern adapted for Claude Code
  - **clawhip** — event-to-channel notification router (Rust daemon)
- The technical architect behind the "clean-room in 2 hours" achievement

### The Dynamic

Jin is the public face and operator. Heo is the toolsmith. Together they represent a pattern we're building: **one human director operating autonomous agents through tooling**, not by writing code directly.

---

## 3. How It Was Done — Technical Breakdown

### The Process: 2 Humans + 10 Agents

1. **Architectural review** (human): Jin and Heo reviewed the leaked TypeScript source to understand patterns — CLI entry point, query engine, runtime session management, tool execution framework, permission context system, session persistence. They did NOT copy code.

2. **Task decomposition** (human → agent): Jin typed structured instructions into Discord. The oh-my-codex / OpenClaw Discord integration received these as commands.

3. **Planning phase** (`$ralplan` mode): Before any code was written, a **Planner → Architect → Critic** deliberation loop ran. The Critic returns APPROVE/ITERATE/REJECT. The loop repeats until APPROVE (max 5 iterations). This produced a PRD and test specification saved to `.omx/plans/`.

4. **Parallel execution** (`$team` mode): oh-my-codex spawned **10 parallel agent instances**, each in its own:
   - tmux pane (process isolation)
   - Git worktree (file isolation — no merge conflicts)
   - Agent role (architect, executor, verifier, etc.)
   - Task assignment (claimed from a shared task list with lifecycle: claimed → in_progress → completed/failed)

5. **Persistent completion** (`$ralph` mode): For component-level ownership, individual agents ran in Ralph mode — a persistence loop that iterates until an Architect agent verifies completion. "The boulder never stops rolling."

6. **Verification gates**: After each component was written, mandatory verification included:
   - Architect sign-off (STANDARD tier minimum)
   - AI-slop-cleaner pass (scoped to only changed files)
   - Regression re-verification
   - Clean exit only via explicit `$cancel`

7. **Notification loop**: Clawhip routed all agent events (session start, tool use, PR creation, errors) to Discord channels. Jin could monitor progress from his phone without being in the terminal.

8. **Result**: By morning, a working Python scaffold existed. It was subsequently ported to Rust for performance.

### What Made This Possible

The critical insight is not "AI can write code fast." It's that **the orchestration layer eliminated the need for a human to be in the loop during execution**. The human's role was:

1. Provide architectural intent (one-time, via Discord)
2. Monitor notifications (passive, via phone)
3. Review results (after completion)

Everything between steps 1 and 3 was autonomous.

---

## 4. The Agentic Workflow Stack — Deep Dive

### 4.1 oh-my-codex (OMX) — The Orchestration Layer

OMX is a TypeScript + Rust multi-agent workflow layer that wraps OpenAI Codex CLI (and optionally Claude CLI / Gemini CLI). It does NOT replace the underlying AI — Codex/Claude remain the execution engines. OMX adds:

#### Four Canonical Workflow Modes

| Mode | Trigger | What It Does | LIMITLESS Analog |
|------|---------|-------------|------------------|
| `$deep-interview` | Vague request | Socratic requirements clarification; computes ambiguity score; blocks execution until score < threshold | Director briefing / weekly planning |
| `$ralplan` | Before execution | Planner → Architect → Critic deliberation (max 5 rounds); produces PRD + test spec | Architect's planning phase |
| `$ralph` | Component work | Persistent completion loop; agent keeps iterating until Architect verifies done | Stop hook relay / handoff pickup |
| `$team N:role "task"` | Parallel work | Spawns N isolated agents in tmux + worktrees; coordinated via task list + mailbox | Multi-agent specialist fleet |

#### The Ralplan-First Gate

OMX enforces a critical safety mechanism: **vague execution requests are intercepted before reaching agents**. The keyword detector checks for "well-specified signals" — file paths, camelCase identifiers, issue numbers, code blocks, numbered steps. If none are found and the prompt has 15 or fewer effective words, the gate redirects from `$ralph`/`$team` to `$ralplan` (planning mode).

This prevents the most common failure mode in autonomous coding: **agents executing without clear intent**.

**LIMITLESS equivalent:** Our Architect's planning phase partially serves this function, but we don't have an automated gate. The Architect uses judgment, not an algorithm.

#### Agent Catalog (33 Roles)

OMX defines 33 specialized agent roles organized into lanes:

| Lane | Roles | Pattern |
|------|-------|---------|
| **Build** | explorer, planner, architect, executor, debugger, verifier, build-fixer, code-simplifier | End-to-end development |
| **Review** | code-reviewer, security-reviewer, performance-reviewer | Quality gates |
| **Domain** | test-engineer, git-master, dependency-expert, researcher | Specialist expertise |
| **Coordination** | team-executor (supervised) | Multi-agent glue |

Each role has attributes: `reasoningEffort` (low/medium/high), `posture` (frontier-orchestrator/deep-worker/fast-lane), `modelClass` (frontier/standard/fast), `routingRole` (leader/specialist/executor).

**LIMITLESS comparison:** We have 8 agent roles (Architect, 5 engineers, QA, CI) organized by **domain** (which app you work on). OMX has 33 roles organized by **capability** (what type of work you do). This is a fundamental architectural difference — OMX models the software development *process* as a set of general capabilities (explore, plan, execute, debug, verify, review) that can be directed at any codebase. Our domain-specific roles conflate "what you work on" with "how you work." The capability-based approach is more powerful because the process of writing software is the same regardless of domain — domain context comes from the codebase itself (CLAUDE.md files), not the agent's identity. See Section 6, Lesson 8 for the full analysis.

#### Team Mode — How Parallel Agents Work

When `$team 3:executor "implement auth"` is invoked:

1. Parse args, create team config in `.omx/state/team/<name>/`
2. Generate worker-agents.md (injected into each worker's context)
3. Split tmux window into 3 panes
4. Launch each as an independent CLI session with env vars:
   - `OMX_TEAM_WORKER=<team>/worker-<n>`
   - `OMX_TEAM_STATE_ROOT` (shared state directory)
5. For Claude workers: launch with `--dangerously-skip-permissions`, auto-accept trust
6. Write task assignments to `workers/worker-<n>/inbox.md`
7. Workers communicate via mailbox files: `mailbox/leader-fixed.json`, `mailbox/worker-<n>.json`
8. Heartbeat polling detects dead/stale workers
9. Leader monitors, reassigns, and integrates results

**Critical detail:** Workers are NOT subagents within a single session. They are **fully independent CLI processes** that share state through the filesystem. This is fundamentally different from Claude Code's native `Agent` tool (which spawns subprocesses within the same context).

**Worktree isolation:** Each worker gets its own git worktree so parallel file edits don't conflict. Integration strategies: merge (clean), cherry-pick (diverged), or cross-worker rebase (sequential dependencies).

#### Ralph Mode — Persistent Completion

Ralph wraps a Codex session with a persistence contract:

1. Writes session instructions to `.omx/ralph/session-instructions.md`
2. Tracks changed files in `.omx/ralph/changed-files.txt`
3. Persists mode state via MCP across iterations
4. Enforces: verify → architect sign-off → deslop pass → regression → clean exit
5. Max 10 iterations; escalates to user after 3 consecutive same-blocker iterations

**LIMITLESS equivalent:** Our stop hook relay (check #handoffs → execute → check again) serves a similar purpose but is more primitive. Ralph has formal iteration tracking, escalation rules, and verification gates built in.

#### State Persistence

All OMX state lives under `.omx/` in the project directory:

```
.omx/
├── state/           # Mode state (ralph.json, team.json, ralplan.json)
│   └── team/<name>/ # Team config, manifests, worker inboxes, mailboxes
├── plans/           # PRDs and test specs from ralplan
├── specs/           # Deep interview outputs
├── ralph/           # Session instructions + changed file tracking
├── logs/            # Hook event logs (JSONL)
└── notepad.md       # Cross-session memory (7-day auto-prune)
```

Exposed via 5 embedded MCP servers: `omx_state`, `omx_memory`, `omx_code_intel`, `omx_trace`, and a team server.

#### Rust Runtime Core

The low-level infrastructure uses an event-sourced state machine with:

- **AuthorityLease:** Mutex-like ownership grant with lease IDs and expiry timestamps (prevents split-brain in multi-worker scenarios)
- **DispatchLog:** Queued/notified/delivered/failed dispatch lifecycle tracking
- **MailboxLog:** Inter-worker message creation/delivery tracking
- **ReplayState:** Cursor-based event replay for crash recovery

File-system locking (`fs2::FileExt::lock_exclusive`) ensures consistency. The Rust engine writes compatibility view files readable by the TypeScript team consumers.

### 4.2 clawhip — The Notification Router

Clawhip is a Rust daemon (runs at `http://127.0.0.1:25294`) that acts as a middleware between event sources and messaging platforms. It solves a specific problem: **agent sessions should not pollute their context with notification logic**.

#### Processing Pipeline

```
[Event Sources] → [MPSC Queue (cap 256)] → [Dispatcher]
  → normalize_event() (canonical kind mapping)
  → GitHubCiBatcher (batch CI events within 30s window)
  → Router.resolve() (returns 0..N ResolvedDelivery structs)
  → Renderer.render() (compact/alert/inline/raw format)
  → Sink.send() (Discord bot/webhook, Slack webhook)
```

#### Event Sources

| Source | Mechanism |
|--------|-----------|
| Git | Polls local repos for commits/branch changes |
| GitHub | Polls API for issue/PR events |
| tmux | Monitors panes for keyword hits and idle sessions |
| Workspace | Monitors filesystem for session events |
| Cron | Fires events on configured schedules |
| HTTP API | `POST /api/event` for arbitrary events |

#### Route Matching

Routes are defined in `~/.clawhip/config.toml`:

```toml
[[routes]]
event = "session.*"
filter = { tool = "omx", repo_name = "myapp" }
channel = "1234567890"
mention = "<@user-id>"
format = "compact"
```

Multiple routes can match a single event, each producing an independent delivery. This enables fan-out: one PR event can notify both a team channel and a personal DM.

#### Key Design Principle

**Bypass the gateway session for notifications.** Direct API calls inside Claude Code sessions pollute context, create coupling, and waste tokens. Clawhip owns ALL routing and formatting; agents emit structured events (a single HTTP POST) and forget. Agent sessions stay clean.

**LIMITLESS comparison:** Our agents currently use Discord's MCP plugin directly within their sessions. This means every Discord reply consumes context tokens. Clawhip's approach is architecturally cleaner.

### 4.3 claw-code — The Demonstration

The Rust port (`rust/`) contains a functional agent harness with:

| Component | Status | Description |
|-----------|--------|-------------|
| Agent loop | Complete | `ConversationRuntime` — standard tool-use loop with unlimited iterations |
| Tool system | MVP (17 tools) | bash, read_file, write_file, edit_file, glob, grep, WebFetch, WebSearch, Agent (sub-agent), TodoWrite, Skill, etc. |
| Hook pipeline | Complete | PreToolUse/PostToolUse with deny/allow/warn exit codes |
| Permission system | Complete | 5-tier: ReadOnly < WorkspaceWrite < DangerFullAccess < Prompt < Allow |
| Provider abstraction | 2 providers | Anthropic (Claude) + OpenAI-compatible (xAI/Grok) |
| Session compaction | Complete | Token-aware auto-summarization of old messages |
| MCP support | Complete | 5 transport types: Stdio, SSE, HTTP, WebSocket, SDK |
| Plugin system | Scaffold | Manifest/lifecycle structure; marketplace incomplete |
| Config system | Complete | 3-tier merge: User → Project → Local |

The honest `PARITY.md` documents gaps: missing TeamTool, Task*, LSP, RemoteTrigger, ScheduleCron, structured/remote transport, analytics, settings sync, team memory. Slash commands: ~15 vs 200+ in original.

---

## 5. Architecture Comparison: OMX vs LIMITLESS

### Side-by-Side

| Dimension | oh-my-codex (OMX) | LIMITLESS Agentic Division |
|-----------|-------------------|---------------------------|
| **Orchestration** | OMX keyword engine + tmux | Discord + CLAUDE.md + hooks |
| **Agent runtime** | Codex CLI / Claude CLI / Gemini CLI (process-per-agent) | Claude Code (process-per-agent) |
| **Cloud runtime** | Not built-in (tmux on VPS) | NanoClaw on Hetzner VPS (Docker containers) |
| **Agent count** | 33 roles | 8 roles |
| **Parallel execution** | `$team` — tmux panes + git worktrees | Manual launch of multiple terminal instances |
| **Inter-agent comms** | Filesystem mailboxes (`.omx/state/`) | Discord channels (#handoffs, #workbench-ops) |
| **Task lifecycle** | Claimed → in_progress → completed/failed | Handoff posted → reacted with check → completion message |
| **Planning gate** | `$ralplan` — automated Planner/Architect/Critic loop | Architect's judgment (manual) |
| **Verification** | Mandatory: architect sign-off + deslop + regression | Verification-First Principle (manual enforcement) |
| **Notifications** | Clawhip (out-of-band daemon) | Discord MCP (in-band, consumes context) |
| **State persistence** | `.omx/state/` filesystem + MCP servers | Memory files (`~/.claude/projects/.../memory/`) |
| **Human interface** | Discord / CLI / tmux HUD | Discord (#human channel) |
| **CI integration** | Not built-in (relies on GitHub Actions) | GitHub Actions + claude-code-action |
| **Deployment** | VPS + tmux | Hetzner VPS + NanoClaw + Docker |

### Where OMX Is Ahead

1. **Automated planning gate** — the ralplan-first interceptor prevents vague-request disasters. We rely on Architect judgment.
2. **Git worktree isolation for parallel agents** — we don't use worktrees; concurrent agents risk file conflicts.
3. **Out-of-band notifications** — clawhip keeps agent contexts clean. Our agents pollute their context with Discord MCP calls.
4. **Formal iteration tracking** — Ralph's iteration counter, escalation rules, and deslop gates. Our relay is informal.
5. **Model routing by task complexity** — OMX routes simple tasks to cheaper/faster models. We use Opus for everything.
6. **33 vs 8 agent roles** — more granular specialization (though we may not need it at our scale).

### Where LIMITLESS Is Ahead

1. **Cloud-native from design** — NanoClaw provides container isolation, ephemeral lifecycle, and cron scheduling. OMX runs on bare tmux.
2. **Hook-enforced governance** — our 6+ hooks provide hard-block enforcement. OMX relies more on prompt engineering.
3. **Structured handoff schema** — our handoff format is validated by a hook; OMX uses filesystem mailboxes without schema validation.
4. **Terraform IaC** — our infrastructure is fully codified. OMX has no infrastructure management.
5. **Production deployment pipeline** — we have Render auto-deploy + health checks. OMX is development-focused only.
6. **Discord as the human command interface** — Jin used this pattern ad-hoc; we've formalized it with channels, protocols, and hooks.

### Where They're Equivalent

- Both use process-per-agent isolation (not subagent threads)
- Both persist state across sessions via filesystem
- Both enforce verification before proceeding
- Both support mixed-model configurations
- Both use Discord as the primary human interface

---

## 6. Actionable Lessons for LIMITLESS

### Lesson 1: Automated Planning Gates Save Disaster

**What OMX does:** The ralplan-first gate intercepts vague execution requests and forces a planning phase before any code is written. Detection uses regex patterns for "well-specified signals" (file paths, code identifiers, issue numbers).

**What we should do:** Add a pre-execution gate to the Architect's workflow. Before creating a handoff, the Architect should run a self-check: "Does this handoff contain specific file paths, function names, or concrete steps? If not, plan more before dispatching."

**Implementation:** Add this as a section in the Architect's CLAUDE.md or as a validation in `validate-handoff.sh` — check that the Tasks section contains at least one specific file path or code reference.

### Lesson 2: Git Worktree Isolation for Parallel Agents

**What OMX does:** Each `$team` worker gets its own git worktree. Parallel agents can edit the same repo without merge conflicts.

**What we should do:** When launching multiple specialist agents simultaneously, use `git worktree add` to give each agent an isolated working copy. Claude Code already supports this with `--worktree` mode.

**Implementation:** Update agent launch commands to include worktree creation:
```bash
# Create worktree for PATHS engineer
git worktree add /tmp/limitless-paths-work -b work/paths-$(date +%s)
cd /tmp/limitless-paths-work && AGENT_ROLE=paths-engineer claude --dangerously-skip-permissions
```

### Lesson 3: Out-of-Band Notifications

**What OMX does:** Clawhip runs as a separate daemon. Agents emit structured events via HTTP POST; clawhip handles all formatting, routing, and delivery to Discord/Slack. Agent sessions stay clean.

**What we should do:** Consider moving Discord notifications out of agent sessions. Instead of agents calling the Discord MCP plugin directly, agents could write structured events to a file or local HTTP endpoint, and a separate process handles Discord delivery.

**Implementation:** Solved in the autonomous division design spec (Section 5): workers communicate exclusively through NanoClaw IPC. The NanoClaw host process — which already runs a Discord bot connection — reads worker event files and posts to Discord on their behalf. Workers never load the Discord MCP plugin. Only the Architect keeps Discord MCP for bidirectional orchestration. This recovers ~15-20% of worker context budgets (30-40K tokens on a 200K window). See `2026-04-05-autonomous-agentic-division-design.md` Section 5 for full architecture.

### Lesson 4: Formal Iteration Tracking

**What OMX does:** Ralph mode tracks iteration count, detects same-blocker loops (3+ iterations on the same problem → escalate), and enforces a maximum iteration limit (10).

**What we should do:** Add iteration awareness to our specialist agents. When an agent hits the same error twice, it should enter Debug Mode (we already have this rule). But we should formalize the escalation: after N failed attempts, post to #alerts and halt, don't keep trying.

**Implementation:** This is already partially in CLAUDE.md's "Anti-Loop Rule" and "Debug Mode." Formalize it: add a counter to the agent's working memory, and after 2 failures on the same issue, post to #alerts with a structured escalation message.

### Lesson 5: The Human Never Opens a Terminal

**What Jin demonstrated:** The entire development workflow was driven through Discord. Instructions in, notifications out, results reviewed asynchronously.

**What we're building:** This is exactly our target architecture. The Director posts to #human, the Architect picks up via Discord, creates handoffs, specialists execute, results posted back. The monorepo migration we just completed enables this — all services deploy from one repo, triggered by pushes to main.

**Gap:** We haven't yet achieved fully autonomous execution. The Director still launches agents manually. NanoClaw on Hetzner VPS (Phase 1 complete, Phase 2 complete) is the missing piece — once agents can be triggered by Discord messages automatically, we match Jin's workflow.

### Lesson 6: Model Routing by Task Complexity

**What OMX does:** Each agent role has a `modelClass` (frontier/standard/fast) and `reasoningEffort` (low/medium/high). Simple exploration uses fast models; complex architecture uses frontier models.

**What we should do:** Consider using Sonnet for routine tasks (file reads, simple fixes, health checks) and Opus for complex planning, code review, and multi-step implementations. Our CI agent already uses Sonnet. Extending this to other roles would reduce cost and latency.

**Implementation:** Update agent launch commands to specify model:
```bash
# QA Agent — Sonnet for routine smoke tests
AGENT_ROLE=qa-operator claude --model sonnet --dangerously-skip-permissions
# PATHS Engineer — Opus for complex migration work
AGENT_ROLE=paths-engineer claude --model opus --dangerously-skip-permissions
```

### Lesson 7: The Deslop Gate

**What OMX does:** After Ralph completes work, a mandatory "ai-slop-cleaner" pass scopes code-quality cleanup to only the files the agent touched. This prevents style churn from spreading to unrelated code.

**What we should do:** Add a post-implementation quality check to our specialist agents. Before creating a PR, the agent should review its own changes for unnecessary additions (extra comments, unneeded error handling, verbose logging, added abstractions). This aligns with our existing CLAUDE.md rules about not adding features beyond what was asked.

**Implementation:** Add a self-review step to the specialist agent protocol: after implementation, run a focused review of `git diff` against the handoff's Tasks section. If the diff touches files not listed in "Files to Modify," flag them.

### Lesson 8: Capability-Based Roles, Not Domain-Based

**What OMX does:** 33 agent roles organized by *capability* — what type of work you do (explore, plan, execute, debug, verify, review, test, secure). Domain context comes from the codebase, not the agent's identity.

**What we currently do:** 8 roles organized by *domain* — which app you work on (PATHS Engineer, HUB Engineer, etc.). Each engineer does everything (explores, plans, executes, debugs, verifies) but only for one app.

**Why capability-based is superior:** We are building an **agentic software development division** — a general-purpose capability, not a team that maintains specific apps. The process of writing software is the same regardless of domain. An executor needs a clear task, access to code, a build command, and a verification gate. Whether that code is a Payload CMS migration or a Fastify route is just context — provided by `apps/*/CLAUDE.md`, not by the agent's identity.

Capability-based roles enable:
- **Composable teams:** The Architect spawns "2 executors + 1 verifier scoped to apps/paths/" instead of "the PATHS Engineer"
- **Cross-domain debugging:** A debugger can diagnose any app, not just the one it was named for
- **Parallelism within a single app:** An executor and a test-engineer work on the same app simultaneously
- **Zero-cost scaling to new apps:** No new agent definition needed — just point a generic executor at the new directory
- **Separation of concerns:** Boundary enforcement (what files you can edit) stays in hooks; capability (what type of work you do) lives in the role definition

**Implementation:** Restructure from domain-based to capability-based agent definitions:

| Current (Domain) | New (Capability) | Domain Scoping |
|---|---|---|
| PATHS Engineer | Executor | `AGENT_SCOPE=apps/paths` (env var) |
| HUB Engineer | Executor | `AGENT_SCOPE=apps/hub` |
| DT Engineer | Executor | `AGENT_SCOPE=apps/digital-twin` |
| Cubes+ Engineer | Executor | `AGENT_SCOPE=apps/cubes` |
| Infra Engineer | Executor | `AGENT_SCOPE=infra` |
| QA Agent | Verifier | `AGENT_SCOPE=*` (cross-cutting) |
| CI Agent | Code Reviewer | `AGENT_SCOPE=*` (automated) |
| Architect | Architect | `AGENT_SCOPE=*` (read-only) |

New roles to add (not present today):
- **Explorer** — fast, read-only codebase analysis (Sonnet, low cost)
- **Debugger** — diagnosis-first, surgical fixes (Opus, high reasoning)
- **Test Engineer** — writes tests, not features (Sonnet)
- **Security Reviewer** — OWASP, auth, data exposure (Opus)
- **Planner** — task decomposition, dependency ordering (Opus)

The `enforce-repo-boundary.sh` hook continues to enforce file access — it reads `AGENT_SCOPE` instead of `AGENT_ROLE` to determine what files the agent can edit. A Debugger scoped to `apps/paths` can only edit files under `apps/paths/`.

**This is not incremental — it's foundational.** The division we're building should be portable to any codebase. Capability-based roles make that possible.

---

## 7. Implementation Recommendations

### Priority Matrix

| # | Recommendation | Effort | Impact | Priority |
|---|---------------|--------|--------|----------|
| 1 | **Capability-based agent roles** (Lesson 8) — restructure from domain to capability | Medium | **Critical** | **P0 — Foundational** |
| 2 | Git worktree isolation for parallel agents | Low | High | **P1 — Do Now** |
| 3 | Handoff specificity gate in validate-handoff.sh | Low | Medium | **P1 — Do Now** |
| 4 | Model routing (Sonnet for routine, Opus for complex) | Low | Medium | **P1 — Do Now** |
| 5 | Formal iteration tracking + escalation counter | Medium | Medium | **P2 — Next Sprint** |
| 6 | Self-review deslop gate before PR creation | Low | Medium | **P2 — Next Sprint** |
| 7 | Automated planning gate (ralplan equivalent) | High | Medium | **P3 — Later** |
| 8 | Out-of-band notification daemon | High | Low | **P3 — Later** |

### What NOT to Adopt

1. **OMX's keyword detection system** — overengineered for our use case. Our Architect is the routing layer; we don't need regex-based keyword gating.
2. **Filesystem mailboxes for inter-agent comms** — Discord is better for our async, cross-session communication pattern. Filesystem mailboxes require shared mounts.
3. **The Python metadata scaffold approach** — cute for viral marketing, not useful for production.

---

## 8. References

### Primary Sources

| Source | URL | Description |
|--------|-----|-------------|
| claw-code | https://github.com/instructkr/claw-code | The clean-room rewrite repository |
| oh-my-codex | https://github.com/Yeachan-Heo/oh-my-codex | Workflow orchestration layer |
| oh-my-claudecode | https://github.com/Yeachan-Heo/oh-my-claudecode | Same pattern for Claude Code |
| clawhip | https://github.com/Yeachan-Heo/clawhip | Event-to-channel notification router |
| OMX docs | https://yeachan-heo.github.io/oh-my-codex-website/docs.html | Official documentation |

### Secondary Sources

| Source | Description |
|--------|-------------|
| WaveSpeedAI Blog | "What Is claw-code? The Claude Code Rewrite Explained" |
| CyberNews | "Leaked Claude Code source spawns fastest growing repository in GitHub's history" |
| Decrypt | "Anthropic Accidentally Leaked Claude Code's Source — The Internet Is Keeping It Forever" |
| AI Magazine | "Claude Code Leak: What Went Wrong at Anthropic?" |
| Layer5 | "The Claude Code Source Leak: 512,000 Lines, a Missing .npmignore" |
| WSJ Profile | Sigrid Jin profiled as one of the world's most prolific Claude Code users |
| Jaeyun Ha tweet | Thread expanding on Jin's workflow — "the developer never opened a terminal" |

### Our Plans (Cross-Reference)

| Document | Relevance |
|----------|-----------|
| `docs/superpowers/plans/2026-04-02-agentic-division-implementation-plan.md` | Our 5-phase plan for the same goal OMX achieves |
| `docs/superpowers/plans/2026-04-02-agentic-infrastructure-implementation-plan.md` | NanoClaw cloud deployment — our runtime equivalent |
| `docs/superpowers/specs/2026-04-02-nanoclaw-integration-governance.md` | Governance for our agent runtime |

---

## Key Takeaway

Jin and Heo demonstrated that a **single human director** can operate **10+ autonomous AI agents** to produce a complex software system (a 6,000+ line Rust agent harness) in hours, without ever opening a terminal. Their stack — oh-my-codex for orchestration, clawhip for notifications, Discord for human interface — is architecturally similar to what we're building with LIMITLESS (NanoClaw for runtime, Discord for communication, hooks for governance).

The gap between their system and ours is not architectural — it's **abstraction level**. OMX models the software development *process* as a set of general capabilities (explore, plan, execute, debug, verify, review) that can be directed at any codebase. Our current agent catalog models *our specific apps* — PATHS Engineer, HUB Engineer, etc. This conflates domain with capability and limits portability.

The most important takeaway is not any single feature — it's the realization that **we are building a software development division, not a LIMITLESS maintenance team**. The division's capabilities should be general-purpose: explore, plan, execute, debug, verify, review, test, secure. Domain context comes from the codebase (`CLAUDE.md` files), not from agent identity. This makes the division portable to any project.

The path forward: **restructure around capability-based roles**, then adopt OMX's automation patterns (worktree isolation, planning gates, iteration tracking, model routing) within our existing governance framework (hooks, structured handoffs, Terraform IaC, production deployment).
