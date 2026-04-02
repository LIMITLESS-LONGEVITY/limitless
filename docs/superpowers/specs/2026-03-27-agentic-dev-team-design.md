# LIMITLESS Agentic Development Team — Plan

## Context

LIMITLESS is growing from 1 active codebase (PATHS) to 5+ repos (PATHS, HUB, Digital Twin, CUBES+, OS Dashboard, Infra). The current two-instance manual workflow (Operator + Engineer coordinating via MEMORY.md) doesn't scale. This plan defines the agentic development architecture for building and operating the full Longevity OS.

**Primary reference:** Anthropic's C compiler project — 16 parallel agents, 100K lines of Rust, ~2,000 sessions, $20K/2 weeks. Key takeaways adapted for our constraints (single developer, sustainable daily cost, multi-repo).

---

## Architecture: Hub-and-Spoke (Not Decentralized Swarm)

The C compiler used 16 autonomous agents picking tasks from one problem domain. LIMITLESS is different: 5+ repos, multiple stacks, one human, daily cost constraints. The right model is **hub-and-spoke with human-in-the-loop**.

```
                        ┌─────────────────────┐
                        │    HUMAN OPERATOR    │
                        │  reviews · approves  │
                        │  routes · overrides  │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │    LEAD: Architect   │
                        │   planning · routing │
                        │   cross-repo coord   │
                        └──────────┬──────────┘
                                   │
           ┌───────────┬───────────┼───────────┬───────────┐
           │           │           │           │           │
     ┌─────▼────┐ ┌────▼────┐ ┌───▼───┐ ┌────▼────┐ ┌────▼────┐
     │  PATHS   │ │   HUB   │ │  DT   │ │  INFRA  │ │ QA/OPS  │
     │ Engineer │ │Engineer │ │ Eng.  │ │ Eng.   │ │Operator │
     └──────────┘ └─────────┘ └───────┘ └─────────┘ └─────────┘
                                                          │
                                                    ┌─────▼─────┐
                                                    │  CI Agent  │
                                                    │ (automated │
                                                    │  via GH    │
                                                    │  Actions)  │
                                                    └───────────┘
```

**Key principle:** Agents are **role definitions**, not permanent processes. At any moment, 1-3 run based on the day's work. Not all run simultaneously.

---

## Agent Roles (6 Roles)

### 1. Architect (Lead) — Cross-Repo Planner
- **Scope:** Planning, task decomposition, design specs, CLAUDE.md maintenance
- **Model:** Sonnet (cost-efficient for planning)
- **Tools:** Read-only across all repos + WebSearch/WebFetch + `gh` CLI
- **Never writes code** — produces plans that other agents execute
- **Runs in:** Umbrella repo (`~/projects/LIMITLESS/`)
- **Definition:** `.claude/agents/architect.md`

### 2. Repo Engineers (one per active repo)
- **Scope:** Feature dev, bug fixes, migrations, tests within ONE repo
- **Model:** Sonnet (Opus only for novel architectural problems)
- **Tools:** Full Edit/Write within their repo, Bash for builds/tests
- **Isolated by:** PreToolUse hook (`enforce-repo-boundary.sh`)
- **Definitions:** `.claude/agents/paths-engineer.md`, `hub-engineer.md`, `dt-engineer.md`

### 3. QA/Ops Operator — Production Verification
- **Scope:** Production QA, browser testing, deploy verification, documentation
- **Model:** Sonnet
- **Tools:** Playwright MCP, Chrome DevTools MCP, Render MCP, Read + Write (docs only)
- **Cannot modify:** `src/`, `tests/`, `package.json`
- **Definition:** `.claude/agents/qa-operator.md`

### 4. Infra Engineer — Terraform & DevOps
- **Scope:** Terraform changes, DNS, Render provisioning, CI/CD pipelines
- **Model:** Sonnet
- **Tools:** Edit within `limitless-infra/`, Bash for terraform
- **Activated only when infra work is needed** (not daily)
- **Definition:** `.claude/agents/infra-engineer.md`

### 5. CI Agent — Automated PR Review (No Human Loop)
- **Scope:** PR code review, automated feedback, @claude mentions
- **Model:** Sonnet (via GitHub Actions)
- **Tools:** Read-only in CI runner
- **Trigger:** PR opened, @claude comment, push to main
- **Never runs locally** — runs in GitHub Actions via `anthropics/claude-code-action@v1`

---

## Implementation Phases

### Phase 0: Stabilize & Clean (Week 1) — No new tools

Before adding agent infrastructure, fix what's broken.

1. **Migrate MEMORY.md task queues to GitHub Issues**
   - Create labels: `agent:paths`, `agent:hub`, `agent:dt`, `agent:infra`, `agent:qa`, `priority:urgent`, `status:in-progress`, `status:awaiting-qa`
   - Keep MEMORY.md for status summary + lessons only (not task routing)
   - Reduces stale-read risk, adds locking, removes single-file contention

2. **Resolve URGENT items** before adding complexity
   - Daily protocol 500 (needs `AI_PROVIDER_DEFAULT_API_KEY` on Render)
   - Content chunks not indexed (re-save articles to trigger `indexContentChunks`)

3. **Fix CI pipeline** — remove `continue-on-error: true` from lint/TS steps

**Cost:** $0 new tooling. Normal Claude Code usage.

### Phase 1: Custom Subagents + CLAUDE.md Restructure (Week 2)

Make agent launching a one-command operation instead of a mental model.

1. **Create `.claude/agents/` in umbrella repo** with 6 agent definition files:
   - `architect.md` — read-only planner
   - `paths-engineer.md` — PATHS code work
   - `hub-engineer.md` — HUB code work
   - `dt-engineer.md` — Digital Twin code work
   - `infra-engineer.md` — Terraform/DevOps
   - `qa-operator.md` — QA/docs/production ops

2. **Restructure CLAUDE.md hierarchy:**
   - **Umbrella `CLAUDE.md`** → trim to ~150 lines: platform overview, doc authority, global discipline, global gates, hard constraints, git conventions, sub-project reference table
   - **`limitless-paths/CLAUDE.md`** → PATHS-specific: stack, build commands, gotchas (#1-#49), collections/endpoints, verification gates
   - **`limitless-hub/CLAUDE.md`** → Created when repo scaffolded (Phase 3)
   - **`limitless-digital-twin/CLAUDE.md`** → Created when repo scaffolded (Phase 4)
   - **`limitless-infra/CLAUDE.md`** → Terraform-specific rules, gotchas, workflow

3. **Create generalized repo-boundary hook:**
   - `.claude/hooks/enforce-repo-boundary.sh` — parameterized version of existing `enforce-worktree.sh`
   - Takes allowed repo name as argument, validates all Edit/Write paths
   - Whitelists: umbrella docs, CLAUDE.md, `.claude/`, user memory

4. **Configure per-agent permissions** in `.claude/settings.local.json`

**Cost:** ~$10-15 in Claude usage for setup/testing.

### Phase 2: CI Agent + GitHub Actions (Week 3)

Add automated PR review across all repos.

1. **Add `anthropics/claude-code-action@v1`** to `limitless-paths/.github/workflows/`
   - Triggers: PR opened, `@claude` in comments
   - Allowed tools: Read, Grep, Glob, Bash (read-only) — NO Edit
   - Uses repo's `CLAUDE.md` for context
   - Max turns: 5 (cost control)

2. **Create reusable workflow template** (`.github/workflows/claude-review.yml`) for all repos

3. **Add PR template** with verification checklist the CI agent can reference

**Cost:** ~$0.60-2/PR with Sonnet. High ROI — catches issues before human review.

### Phase 3: HUB Repo Bootstrap (Week 4-5)

Agent-ready from day one.

1. Scaffold `limitless-hub/` with: Next.js 15, Prisma, Tailwind, brand tokens
2. Include: `CLAUDE.md`, `.claude/settings.local.json`, CI workflow, PR template
3. Add Terraform resources to `limitless-infra/` (postgres, web service, DNS)
4. HUB Engineer agent defined and tested

### Phase 4: Digital Twin Repo Bootstrap (Week 6-7)

Same agent-ready pattern.

1. Scaffold `limitless-digital-twin/` with: Fastify, Drizzle, TimescaleDB
2. Include: `CLAUDE.md`, CI workflow, agent settings
3. Add Terraform resources
4. DT Engineer agent defined and tested

### Phase 5: Cross-Repo Coordination (Week 8+)

When repos need to talk to each other.

1. **Create `limitless-shared` package** — shared TypeScript types (JWT payload, user profile, API contracts)
2. **Evaluate Agent Teams** (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) for cross-repo changes
   - If stable: use lead + teammates for coordinated API contract changes
   - If not: continue with sequential Architect → Engineer A → Engineer B workflow
3. **Evaluate Scheduled Tasks** for recurring QA automation (daily smoke tests, weekly reports)
4. **Add MCP integrations** as needed:
   - GitHub MCP → automate PR/issue management
   - Linear MCP → if migrating task management beyond GitHub Issues

---

## Key Lessons from the C Compiler Project (Applied to LIMITLESS)

| C Compiler Lesson | LIMITLESS Application |
|---|---|
| **Decentralized task selection** — agents pick "next most obvious problem" | Adapted: Architect assigns tasks explicitly (we have 5+ repos, not 1). Engineers don't self-direct across repos. |
| **Git is the coordination backbone** — progress in commits, not chat | **Adopted as-is.** All persistent state in git. GitHub Issues for task queue. |
| **Test quality is critical** — "verifier must be nearly perfect" | **Adopted.** CI must pass before merge. Local `pnpm build` before push. No `continue-on-error`. |
| **Specialize agents** — dedup agent, perf agent, docs agent | **Adopted.** Architect, Repo Engineers, QA Operator, Infra Engineer, CI Agent. |
| **Design for fresh context** — each session starts clean | **Adopted.** Per-repo CLAUDE.md provides context. Memory files for lessons. Progress in git history. |
| **Infinite loop spawning** — `while true; do claude -p ...; done` | **NOT adopted.** Burns tokens 24/7. We use human-launched sessions. |
| **16 parallel agents** | **NOT adopted.** 1-3 agents max. Sequential > parallel for cost control. |
| **$20K/2 weeks** | Target: **$10-20/day** (~$300-600/month). Sonnet-by-default. |

---

## Cost Model

### Daily Estimates (Sonnet-by-default)
| Activity | Input Tokens | Output Tokens | Cost |
|---|---|---|---|
| Feature dev session (2h) | ~500K | ~100K | ~$3 |
| Bug fix (1h) | ~200K | ~50K | ~$1.20 |
| QA verification (30m) | ~150K | ~30K | ~$0.90 |
| Architect planning (1h) | ~300K | ~80K | ~$2 |
| CI PR review (auto) | ~100K | ~20K | ~$0.60 |
| **Typical day** | **~1.5M** | **~300K** | **~$8-12** |

### Cost Controls
1. **Sonnet for all agents by default.** Opus only when Sonnet demonstrably fails on architectural reasoning.
2. **Sequential, not parallel.** 1-2 agents at a time except during time-boxed sprints.
3. **CLAUDE.md under 300 lines per repo.** Progressive disclosure via subdirectory files.
4. **Anti-Loop Rule enforced** — 2 failures then Debug Mode, no runaway token burn.
5. **Monthly ceiling: $500.** Audit if consistently hitting this.

---

## Workflow Definitions

### Feature Dev (Single Repo)
```
Human creates GitHub Issue (label: agent:paths)
  → Human launches PATHS Engineer
  → Engineer: reads Issue + CLAUDE.md + spec → implements on feature branch
  → Engineer: local build passes → pushes → creates PR
  → CI Agent: auto-reviews PR
  → CI pipeline: lint + tests + build
  → Human: reviews + merges
  → Human launches QA Operator → deploy verification → closes Issue
```

### Cross-Repo Feature (e.g., HUB reads Digital Twin API)
```
Human describes feature
  → Human launches Architect
  → Architect: reads both specs → produces plan with API contract
  → Architect: creates 2 GitHub Issues (one per repo) with shared contract
  → Human launches DT Engineer first (API provider)
  → DT Engineer: implements endpoint → PR → CI → merge → deploy
  → Human launches HUB Engineer (API consumer)
  → HUB Engineer: implements client using contract → PR → CI → merge → deploy
  → QA Operator: verifies integration end-to-end
```

Sequential by design. Cost-controlled. API contract prevents integration drift.

### Bug Fix
```
QA Operator or human discovers bug
  → QA Operator investigates (read-only) → writes diagnosis to GitHub Issue
  → Human launches repo Engineer → fix → PR → CI → merge
  → QA Operator re-verifies → closes Issue
```

### Daily Operations
```
Morning: QA Operator
  - Check Render deploy status (all services)
  - curl /api/health on each
  - Browser-test critical paths
  - Update QA report, flag issues as GitHub Issues

Workday: 1-2 Engineers
  - Pick up highest-priority Issues
  - Implement → PR → CI → merge

Evening: Human reviews
  - QA Operator verifies deploys
  - Close completed Issues
```

---

## CLAUDE.md Architecture (Target State)

```
LIMITLESS/CLAUDE.md                    (~150 lines — platform overview, global rules)
├── limitless-paths/CLAUDE.md          (~200 lines — PATHS stack, gotchas, commands)
├── limitless-hub/CLAUDE.md            (~100 lines — HUB stack, Prisma, auth)
├── limitless-digital-twin/CLAUDE.md   (~100 lines — Fastify, Drizzle, TimescaleDB)
├── limitless-infra/CLAUDE.md          (~80 lines — Terraform rules, gotchas)
└── .claude/agents/
    ├── architect.md
    ├── paths-engineer.md
    ├── hub-engineer.md
    ├── dt-engineer.md
    ├── infra-engineer.md
    └── qa-operator.md
```

---

## Risk Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Agent writes to wrong repo | Medium | PreToolUse hooks enforce repo boundaries (proven pattern) |
| Cross-repo API contract drift | High (once HUB+DT active) | `limitless-shared` types package + Architect-defined contracts |
| Cost overrun from runaway sessions | Medium | Anti-Loop Rule + Sonnet-by-default + $500/mo ceiling |
| Agent Teams instability | Medium | Not depended on until Phase 5; sequential workflow is the fallback |
| Breaking PATHS production | Low | Existing PR/CI/merge pipeline unchanged; new repos are independent services |
| Single developer bottleneck | Certain | CI Agent automates reviews; QA Operator scripts daily checks; Architect produces self-contained plans |

---

## Verification

After each phase, verify:
- **Phase 0:** GitHub Issues created and labeled. MEMORY.md trimmed. URGENT items resolved.
- **Phase 1:** Can launch `@architect`, `@paths-engineer`, `@qa-operator` by name. Repo boundary hooks block cross-repo edits. Per-repo CLAUDE.md files exist and are loaded.
- **Phase 2:** PR on limitless-paths triggers CI Agent review comment. `@claude` mention in PR gets a response.
- **Phase 3-4:** New repo builds locally. CLAUDE.md loaded. Agent definition tested. CI pipeline runs.
- **Phase 5:** Cross-repo change succeeds with Architect plan → sequential engineers → QA verification.

---

## Critical Files to Modify/Create

### Modify
- `~/projects/LIMITLESS/CLAUDE.md` — trim to ~150 lines
- `~/projects/LIMITLESS/.claude/settings.local.json` — agent permissions + hooks
- `/home/nefarious/.claude/projects/-home-nefarious-projects-LIMITLESS/memory/MEMORY.md` — remove task queues, add pointer to GitHub Issues

### Create
- `~/projects/LIMITLESS/.claude/agents/architect.md`
- `~/projects/LIMITLESS/.claude/agents/paths-engineer.md`
- `~/projects/LIMITLESS/.claude/agents/hub-engineer.md`
- `~/projects/LIMITLESS/.claude/agents/dt-engineer.md`
- `~/projects/LIMITLESS/.claude/agents/infra-engineer.md`
- `~/projects/LIMITLESS/.claude/agents/qa-operator.md`
- `~/projects/LIMITLESS/.claude/hooks/enforce-repo-boundary.sh`
- `~/projects/LIMITLESS/.claude/hooks/enforce-docs-only.sh`
- `~/projects/LIMITLESS/limitless-paths/CLAUDE.md` (extracted from umbrella)
- `.github/workflows/claude-review.yml` (CI Agent template)

### Reuse
- `~/projects/LIMITLESS/limitless-paths-workbench/.claude/hooks/enforce-worktree.sh` — pattern for `enforce-repo-boundary.sh`
- `~/projects/LIMITLESS/docs/superpowers/specs/2026-03-26-claude-code-guardrails.md` — enforcement mechanism reference
