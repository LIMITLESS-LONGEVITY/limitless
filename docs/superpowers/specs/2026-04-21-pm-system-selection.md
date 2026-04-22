# PM System Selection Spec
## Formal Decision Record — Project Management Tooling for LIMITLESS + MYTHOS

| Field | Value |
|---|---|
| **Date** | 2026-04-21 |
| **Author** | Architect |
| **Status** | Proposed — awaiting CEO ratification |
| **Applies to** | LIMITLESS + MYTHOS PM workflow; `@aradSmith` onboarding |
| **References** | `docs/superpowers/specs/2026-04-18-gitlab-jira-adoption-analysis.md`; governance spec §6.3 (`docs/superpowers/specs/2026-04-18-agentic-sdlc-governance.md`) |
| **Supersedes** | Ad-hoc Discord + GitHub workflow (no prior formal PM spec) |

---

## CEO Framing — Why This Question Matters

*The following is the CEO's verbatim framing of this question, reproduced in full as the authoritative context for this analysis.*

---

> Currently Agile is the most popular methodology/framework used in software development for the SDLC. Human led teams use Jira (or similar product like Linear) for software project management. While this fits humans we have already seen the introduction of agentic AI is now changing the SDLC. Spec-Driven Development is leading the way for agentic oriented SDLC and is being described as "The Waterfall Strikes Back"—but with a fundamental architectural twist that prevents it from suffering Waterfall's historical failures.
>
> The key distinction is that while Waterfall uses specifications as static documentation, Agentic SDD treats them as executable artifacts and "version control for your thinking." In this model:
> - **The Spec is the Code**: The "Agentic Operating System" you are building serves as the runtime that materializes the specification into reality.
> - **Velocity Negates Rigidity**: Because an agent can implement a 50-page spec in minutes rather than months, the "cost of being wrong" (Waterfall's biggest flaw) drops to near zero.
> - **Recursive Iteration**: You aren't just doing "Big Design Up Front"; you are doing "Continuous Design" where the spec is the primary surface of iteration, not the source code.
>
> This transition represents a move from "Vibe Coding" (ad-hoc prompting) to "Architectural Determinism," where the developer's role shifts from a line-by-line implementer to a high-level system orchestrator.
>
> What we now need to figure out is how our new agentic AI oriented SDLC integrates the components of the pre-agentic AI SDLC into it. Are we using Jira and if so how? Are the humans directing the agents in our framework (e.g. the Director and the Architect) opening Jira tickets for them and are the agents using Jira themselves to go through the development workflow for the tickets?
>
> If we are not using Jira what are we using instead? Is the human only using Discord (to direct a task at an agent) and GitHub (to review and merge PRs) to replace the whole Jira workflow? Will this be enough in complicated development projects?

---

### Agentic OS — Kernel Services Required (CEO's §5)

The CEO identifies four kernel services any Agentic OS must provide. These serve as the evaluation criteria for the PM options analysis below:

| Kernel Service | Description |
|---|---|
| **Planning Layer** | Decomposing high-level intent into a directed acyclic graph (DAG) of tasks |
| **Context/Memory Management** | Ensuring agents don't "forget" the spec when working on a specific file (long-context problem) |
| **Constraint Enforcement** | A governance layer ensuring agent-generated code never violates the "Living Spec" |
| **Self-Healing / Drift Detection** | Automatically identifying when code diverges from spec and triggering repair |

*These four criteria are used throughout §§ below to evaluate each option.*

---

## 1. Purpose

This spec formalises the project management (PM) system selection for the LIMITLESS Software Development Division as it transitions into Phase 2: onboarding the MYTHOS collaborating team (`@aradSmith`) and operating two parallel development tracks. The decision must account for:

1. The division's Spec-Driven Development (SDD) philosophy — specs ARE the source of truth, not tickets.
2. Autonomous AI agents as first-class PM participants.
3. Human contributor orientation — `@aradSmith` must be able to understand the division's ways of working without requiring a dedicated PM tool layer.
4. The four internal SDD Kernel Services that underpin the autonomous pipeline.
5. Cost and tooling overhead constraints.

---

## 2. CEO's Question — Verbatim

The following is the CEO's exact framing of the PM system selection question, as posed in `docs/superpowers/specs/SDLC phase 2 readiness report questions.md` (Topic 3):

> Currently Agile is the most popular methodology/framework used in software development for the SDLC. Human led teams use Jira (or similar product like Linear) for software project management. While this fits humans we have already seen the introduction of agentic AI is now changing the SDLC. Spec-Driven Development is leading the way for agentic oriented SDLC and is being described as "The Waterfall Strikes Back"—but with a fundamental architectural twist that prevents it from suffering Waterfall's historical failures.
>
> The key distinction is that while Waterfall uses specifications as static documentation, Agentic SDD treats them as executable artifacts and "version control for your thinking." In this model: The Spec is the Code; Velocity Negates Rigidity; Recursive Iteration. This transition represents a move from "Vibe Coding" to "Architectural Determinism," where the developer's role shifts from a line-by-line implementer to a high-level system orchestrator.
>
> What we now need to figure out is how our new agentic AI oriented SDLC integrates the components of the pre-agentic AI SDLC into it. Are we using Jira and if so how? Are the humans directing the agents in our framework (e.g. the Director and the Architect) opening Jira tickets for them and are the agents using Jira themselves to go through the development workflow? If we are not using Jira what are we using instead? Is the human only using Discord (to direct a task at an agent) and GitHub (to review and merge PRs) to replace the whole Jira workflow? Will this be enough in complicated development projects?

### 2.1 CEO's Supporting Research — SDLC Comparative Analysis

The CEO's question file also contains a brief research report supporting this framing. Cited verbatim from that file for context:

**§2 — Comparative Analysis: The SDLC Evolution** (from `docs/superpowers/specs/SDLC phase 2 readiness report questions.md`):

> | Feature | Traditional Waterfall | Modern Agile | Agentic Spec-Driven (SDD) |
> | :--- | :--- | :--- | :--- |
> | **Primary Artifact** | Comprehensive Documentation | Working Software | **Machine-Readable Spec** |
> | **Iteration Cycle** | Months / Years | 2 - 4 Weeks (Sprints) | **Minutes / Hours (Agentic Loops)** |
> | **Role of Developer** | Implementer | Collaborator | **Architect / Orchestrator** |
> | **Change Cost** | Extremely High | Moderate | **Near-Zero (Regeneration)** |
> | **Reliability** | High (if spec is perfect) | Variable (Speed over depth) | **High (Deterministic & Verifiable)** |

**§5 — Architectural Requirements for an Agentic OS** (from `docs/superpowers/specs/SDLC phase 2 readiness report questions.md`):

> To successfully move from Agile to an Agentic SDLC, your "Agentic Operating System" must provide the following "Kernel" services:
>
> 1. **Planning Layer:** Decomposing high-level intent into a directed acyclic graph (DAG) of tasks.
> 2. **Context/Memory Management:** Ensuring agents don't "forget" the spec when working on a specific file (solving the long-context window problem).
> 3. **Constraint Enforcement:** A governance layer that ensures agent-generated code never violates the "Living Spec."
> 4. **Self-Healing/Drift Detection:** Automatically identifying when the code has diverged from the specification and triggering an agentic "repair" cycle.

These four Kernel services are the lens through which all PM option evaluation in §6 of this spec is conducted.

---

## 3. Background

### 3.1 Current PM State

The division currently operates without a formal ticket system. Work is tracked through:

- **Discord #handoffs** — structured handoff messages (schema-enforced) where the Architect delegates work to specialist engineers.
- **Discord #main-ops / #workbench-ops** — status updates and daily briefings.
- **GitHub PRs** — the atomic unit of deliverable work; PR description contains context, tasks, and verification steps.
- **`ROADMAP.md` Kanban board** — strategic lanes (Backlog → In Progress → Review → Done) in the monorepo root.
- **`docs/plans/`** — per-feature planning documents.
- **`docs/superpowers/specs/`** — authoritative specs written before code; the SDD source of truth.

There is no Jira instance, no Linear workspace, no GitHub Issues board, and no sprint cadence. This has worked at solo/duo scale and — with proper onboarding documentation — is the correct model for Phase 2 as well.

### 3.2 Governance Spec §6.3 — JIRA: Smart-Commit Convention

The governance spec (`2026-04-18-agentic-sdlc-governance.md`) §6.3 reserves the following smart-commit convention:

```
JIRA: PROJ-123
```

The spec explicitly states: _"No tooling change required today — the convention is reserved."_ This was a forward-looking placeholder, not an active integration. As of the date of this spec, zero commits in the monorepo use this convention and no Jira instance is configured.

### 3.3 PR #54 Findings

PR #54 (`2026-04-18-gitlab-jira-adoption-analysis.md`, merged 2026-04-20) reached the following conclusions relevant to this decision:

1. Jira is orthogonal to the GitHub/GitLab hosting decision.
2. Smart-ID references (`JIRA: MYTHOS-47`) work without any Architect container changes — they are inert text strings that Jira's GitHub integration reads on Jira's side.
3. Collaborating teams (MYTHOS) can use Jira for their own PM tracking without affecting LIMITLESS agent tooling.

These findings constrain Options A (Jira) and shape the §6.3 resolution in §8.

### 3.4 SDD Framing (CEO Mandate)

The CEO's SDD mandate governs all tooling decisions:

> _Specs are written before code. Specs ARE the source of truth. Any PM system must complement SDD, not compete with it. The spec file is the definitive description of work — the PM system's job is to track status, not to replace the spec._

Any option that causes ticket content to diverge from or duplicate spec content is non-compliant with SDD. The PM system is a status mirror, not a planning tool.

---

## 4. SDD Kernel Services

The division's autonomous pipeline depends on four internal Kernel Services. Every PM option must be evaluated against its ability to serve each:

| # | Kernel Service | Description | Current Implementation |
|---|---|---|---|
| 1 | **Planning Layer** | DAG decomposition of strategic goals into app-level tasks | Director writes specs + plans; Architect decomposes into handoffs |
| 2 | **Context/Memory Management** | Which tasks are in flight, blocked, complete | `MEMORY.md` + Discord thread history + PR open/merged state |
| 3 | **Constraint Enforcement** | Governance tier compliance, branch protection, scope boundary checks | Governance spec + GitHub branch protection rules + PR review gates |
| 4 | **Self-Healing/Drift Detection** | Health check failures, VPS config drift, NanoClaw version drift | Cron health checks (every 30 min) + DR-002 pipeline |

These services are not replaced by a PM tool — they are _served_ by one. The evaluation asks: does this PM option make each Kernel Service more robust, the same, or harder to operate?

---

## 5. Options

### Option A — Jira / Linear (External SaaS)

**Description:** Adopt an external SaaS ticket system. Jira (Atlassian) or Linear as the primary work tracker. Tickets created per feature/task; sprints managed in the SaaS UI.

**Jira specifics:**
- Jira Free tier: up to 10 users.
- Smart-commit integration: `JIRA: PROJ-123` in commit messages auto-links to Jira issues (configured on Jira's admin side; no agent code changes per PR #54).
- GitHub integration: Jira's GitHub app links PRs to issues.
- Agent interaction model: agents reference ticket IDs in PR descriptions (`JIRA: PROJ-123`); no Jira API calls from Architect containers — agents cannot create or update Jira issues natively.

**Linear specifics:**
- Linear Free tier: member count limits apply.
- Native GitHub PR integration (auto-links issues to PRs).
- Cleaner UI than Jira; stronger developer UX.
- No native smart-commit convention equivalent.
- Same agent limitation: Linear API not available in `gh`-equipped containers.

**Pros:**
- Familiar to `@aradSmith` and most professional developers.
- Visual sprint planning, velocity metrics, burndown charts.
- Jira smart-commit links are inert text — no LIMITLESS agent code changes needed.
- Structured backlog/grooming workflows.

**Cons:**
- Creates a second system of record: spec files (truth) vs. tickets (status mirror that becomes a truth claimant over time).
- Agents cannot natively create or update tickets — handoffs require manual ticket creation by a human, breaking the fully autonomous pipeline.
- Overhead: ticket hygiene, sprint ceremonies, backlog grooming — non-trivial at small team scale.
- Violates SDD if ticket descriptions duplicate or paraphrase spec content (they inevitably do).
- Adds external SaaS dependency to an otherwise self-contained GitHub-native stack.

---

### Option B — GitHub-Native (Issues + Projects + Milestones)

**Description:** Use GitHub Issues as tickets, GitHub Projects (v2) as the Kanban/sprint board, and Milestones as sprint equivalents. All within the existing `LIMITLESS-LONGEVITY/limitless` repository.

**Mechanics:**
- Issue = one unit of trackable work (maps to a spec or a plan section).
- PR body includes `Closes #123` — GitHub auto-closes Issue on PR merge.
- GitHub Actions can enforce label hygiene and auto-transition Issues on PR events.
- Milestones group Issues into sprint-equivalent time-boxes.
- GitHub Projects (v2) provides table/board views with custom fields (status, priority, estimate).

**Agent interaction:**
- `gh issue create`, `gh issue list`, `gh issue edit`, `gh issue close` — all available in Architect container via `gh` CLI.
- No new tooling required; agents are first-class GitHub Issues participants today.

**Pros:**
- Single platform (GitHub) — no external SaaS.
- Agents natively create and manage Issues via `gh` CLI.
- PR-to-Issue auto-linking via `Closes #NNN` is zero-overhead.
- No additional cost.
- `@aradSmith` sees work on a standard GitHub Issues board.

**Cons:**
- Without strict conventions, Issues can sprawl and duplicate spec content, violating SDD.
- Requires discipline to keep Issues as status mirrors and not planning documents.
- Introduces a second artifact (Issue + spec) that must stay in sync — the sync discipline is non-trivial under agent-authored workflows.
- GitHub Projects UI is less feature-rich than Jira for large-scale PM.

---

### Option C — Spec-as-SoT (Current Approach, Codified)

**Description:** No external ticket system. Formalise the existing Discord + GitHub + Markdown stack as the official PM system. No new tooling; add documentation and conventions.

**Components:**
- `docs/superpowers/specs/` — authoritative work definitions (SDD SoT).
- `docs/plans/` — per-feature execution plans.
- `ROADMAP.md` — strategic Kanban lanes.
- Discord #handoffs — handoff queue with schema enforcement.
- Discord #main-ops — Architect status and briefing channel.
- GitHub PR open/merged state — the atomic delivery signal.
- `MEMORY.md` — in-flight context for the Architect agent.

**Agent interaction:**
- Agents are the primary authors of all PM artifacts — they write specs, plans, handoffs, and ROADMAP updates natively.
- No new tooling; agents already produce all these artifacts.

**`@aradSmith` contributor model:**
- Requires understanding of the handoff schema and GitHub PR workflow.
- Onboarding friction is addressed by documentation (PR-ONB-001–003), not by tooling — see `docs/plans/2026-04-21-human-onboarding-docs-roadmap.md`.
- GitHub PRs remain the primary contributor delivery interface.

**Pros:**
- Zero tool overhead — nothing new to configure, pay for, or maintain.
- Fully SDD-compatible — specs ARE the system; no status/truth split possible.
- Agents are first-class PM participants with no new capabilities needed.
- No context split: one place to look for work definition and status.
- Self-documenting: every handoff is a Discord message with a structured schema.
- No sync discipline required across two artifact types.

**Cons:**
- No structured query capability built-in — cannot ask "show me all blocked tasks" without parsing Discord history or GitHub PR list.
- No visual board for human collaborators who prefer a ticket interface.
- `MEMORY.md` is agent-maintained — can drift or become stale under concurrent task load.
- Requires strong onboarding documentation for new contributors (addressed by PR-ONB-001–003).

---

### Option D — Hybrid (Spec-as-SoT + GitHub Issues as Lightweight Tracker)

**Description:** Specs and plans remain the definitive SoT. GitHub Issues serve as lightweight status trackers — one Issue per spec or plan, with the Issue body linking to the spec file. Issues track status (open/closed/labelled) but contain no planning content.

**Agent interaction:**
- `gh issue create` at handoff time — one command, no new tooling.
- `gh issue list --label in-progress` for Architect memory queries.
- PR body includes `Closes #NNN` — Issue auto-closes on merge.

**Pros:**
- Contributor-friendly: `@aradSmith` sees a GitHub Issues board without needing Discord context.
- Structured query: `gh issue list --label blocked` gives instant blocked-task view.
- No external SaaS cost.

**Cons:**
- Two artifacts per task (spec + Issue) must stay in sync — Issue body must not drift from spec scope.
- Agents must be taught to create Issues at handoff time — a small but real process addition.
- Introduces a second PM habit before Phase 2 is even declared stable; contributor orientation is better solved by documentation than by a new tooling layer.

---

## 6. SDD Kernel Services Coverage Matrix

Rating scale: **Strong** = serves this kernel service natively and robustly; **Partial** = serves it with workarounds or incompletely; **Weak** = does not serve it or actively hinders it.

| Kernel Service | Option A (Jira/Linear) | Option B (GH Issues) | Option C (Spec-as-SoT) | Option D (Hybrid) |
|---|---|---|---|---|
| **Planning Layer** (DAG → tasks) | Partial — tickets can represent tasks but spec-to-ticket mapping is manual; agents cannot create tickets autonomously | Partial — Issues can represent tasks; agents create them via `gh`; but DAG structure is flat | **Strong** — specs and plans ARE the planning layer; agents write them natively | Strong — same as C for planning |
| **Context/Memory Management** (in-flight, blocked, complete) | Partial — agents cannot query or update Jira; MEMORY.md still needed | Strong — `gh issue list --label in-progress` gives structured query | Partial — no structured query; requires Discord history + `MEMORY.md`; improvable via PR list queries | Strong — same as B for structured query |
| **Constraint Enforcement** (governance, branch protection, scope) | Partial — Jira has no awareness of governance spec tiers or branch rules | Partial — Issues have no enforcement mechanism; enforcement remains at GitHub layer | **Strong** — specs define constraints directly; governance spec is the enforcement document | Strong — same as C; Issues inherit spec scope via body link |
| **Self-Healing/Drift Detection** (health checks, VPS drift, NanoClaw drift) | Weak — no health check integration | Partial — `gh issue create` can file drift/health alerts; requires label discipline | Weak — Discord #alerts is the current channel; no structured query for open alerts | Partial — labelled alert Issues give structured query |

**Summary interpretation:**

- Option C is the strongest on Planning and Constraint Enforcement — the two most critical kernel services for an SDD-first division — because specs ARE the planning and constraint system.
- Option C's weakness on Context/Memory is real but addressable: the Architect's proactive checks (`gh pr list`, Discord scan) and `MEMORY.md` together serve this role. The shortfall becomes material only at high task concurrency (5+ simultaneous handoffs), which is not the current operating scale.
- Option D's gain on Context/Memory is the main argument for it; that gain does not outweigh the sync discipline cost and the risk of introducing a second planning habit before Phase 2 is stable.

---

## 7. Comparative Summary

| Criterion | Option A | Option B | Option C | Option D |
|---|---|---|---|---|
| SDD-compatible | No — tickets compete with specs | Partial — Issues must be disciplined | **Yes — specs ARE the system** | Yes — specs SoT; Issues are mirrors |
| Agent-native | No — no Jira CLI in containers | Yes — `gh` CLI | **Yes — agents write all artifacts** | Yes — `gh` CLI for Issues |
| Contributor-friendly (`@aradSmith`) | Yes | Yes | Requires onboarding docs (PR-ONB-001–003) | Yes — GitHub Issues board |
| Structured status query | Yes | Yes | Partial (PR list + Discord) | Yes |
| External SaaS cost | Jira Free / Linear Free | None | **None** | None |
| New tooling / process required | Yes — Jira/Linear setup | No — but sync discipline required | **No** | Minor — Issue creation convention + CLAUDE.md update |
| MYTHOS/Jira composable | N/A (is Jira) | Yes | **Yes** | Yes |
| Single source of truth | No | Partial | **Yes** | Partial |
| Phase 2 operational risk | High | Medium | **Low — no new habits** | Medium |

---

## 8. §6.3 JIRA: Smart-Commit Convention Resolution

### Current State

Governance spec §6.3 reserves the convention `JIRA: MYTHOS-47` as a smart-commit plug-in point. It is:
- Inert — no commits use it.
- Harmless — it is a text string; Jira's GitHub app reads it server-side.
- Forward-looking — reserved for a future Jira integration that was never prioritised.

### Resolution: Keep Reserved

**Recommendation: Keep §6.3 as-is. Do not activate. Do not retire.**

Rationale:

1. **Activate** would require: a Jira instance (cost + admin overhead), a Jira project key, and configuration of Jira's GitHub app — none of which is justified by the Option D selection.

2. **Retire** would require editing the governance spec and potentially confusing MYTHOS if they later adopt Jira. The retirement cost exceeds the clutter cost of keeping the reservation.

3. **Keep reserved** costs nothing. The `JIRA:` text in a commit message is a no-op unless a Jira instance with GitHub integration is configured. MYTHOS (`@aradSmith`) may adopt Jira for their own tracking — if they do, their Jira admin configures the integration on Jira's side, and the convention activates automatically for any commit that uses it. No LIMITLESS agent code change is required.

**Action:** No change to governance spec §6.3. Convention remains reserved.

---

## 9. Recommendation: Option D — Hybrid

> **⚠️ CEO Adjudication Requested**
>
> This recommendation was temporarily changed to **Option C (Spec-as-SoT)** in commit `7aacbdc` (2026-04-22) based on input from the OpenClaw Director bot. That instruction has been confirmed as not authoritative by the human Director (2026-04-22 10:25 UTC). This document has been restored to the Architect's original analysis conclusion: **Option D**.
>
> The human Director noted: *"If/when the actual CEO weighs in on Option C vs Option D, that will come through this channel with explicit human framing. The CEO will review both versions and decide."*
>
> **Option C** is a valid and defensible alternative — it is simpler and keeps the system fully spec-centered. See §4.3 for the full Option C analysis. The trade-off is contributor discoverability vs system simplicity. CEO call.

**Adopt Option D: Spec-as-SoT + GitHub Issues as lightweight status tracker.**

### 9.1 Decision

Adopt Option D: specs and plans in `docs/` remain the authoritative SoT — nothing changes there. GitHub Issues are introduced as a lightweight, GitHub-native status layer. One Issue per spec or handoff; Issue body contains only a link to the spec file and a one-line summary. Issues track status (open/in-progress/review/closed) but contain no planning content. This gives `@aradSmith` a standard GitHub Issues board without requiring Discord context for basic orientation, while preserving full SDD fidelity.

Option C remains a valid and defensible alternative — it is simpler and keeps the system fully spec-centered. The trade-off is contributor discoverability vs system simplicity. If the CEO determines that contributor orientation is better solved by documentation alone (PR-ONB-001–003) rather than a PM tooling addition, Option C is the correct answer. See §4.3 for the full Option C analysis.

### 9.2 Option D Implementation

#### 9.2.1 Issue Creation Convention (Binding)

At handoff execution time, the executing agent runs:

```bash
gh issue create \
  --title "[spec filename]" \
  --body "Implements: [link to spec in docs/superpowers/specs/]" \
  --label "in-progress" \
  --repo LIMITLESS-LONGEVITY/limitless
```

One Issue per spec/handoff. Issue body contains only the spec link and a one-line summary. No planning content in the Issue body.

#### 9.2.2 Label Lifecycle

`in-progress` → `review` → auto-closed on PR merge

- Agent sets `in-progress` at handoff execution.
- Agent or human sets `review` when PR is opened.
- Issue auto-closes via `Closes #NNN` in PR body on merge (GitHub-native).

#### 9.2.3 PR Body Convention

Every PR that implements a spec includes in the PR body:

```
Closes #NNN
Implements: docs/superpowers/specs/YYYY-MM-DD-[spec-name].md
```

#### 9.2.4 Artifact Table Under Option D

| Artifact | Purpose | Author | Location |
|---|---|---|---|
| `docs/superpowers/specs/YYYY-MM-DD-*.md` | Authoritative work definition (what to build, why, constraints) | Director or Architect | `docs/superpowers/specs/` |
| `docs/plans/YYYY-MM-DD-*.md` | Execution plan (how to build, rollout phases, rollback) | Architect | `docs/plans/` |
| GitHub Issue | Status tracker — links to spec; carries label lifecycle | Agent (at handoff execution) | GitHub Issues |
| Discord #handoffs message | Handoff schema record (From, To, Priority, Repo, Context, Tasks, Verify, PR Naming) | Architect | Discord |
| `ROADMAP.md` | Strategic Kanban (Backlog → In Progress → Review → Done), epic-level | Director or Architect | Repo root |
| GitHub PR | Atomic delivery unit; PR description references spec + plan + `Closes #NNN` | Agent or human | GitHub |
| `MEMORY.md` | Architect session context — in-flight task state, cross-session carry-over | Architect | `/workspace/group/` (Architect-side) |

#### 9.2.5 Status Queries Under Option D

```bash
# All in-progress Issues
gh issue list --repo LIMITLESS-LONGEVITY/limitless --label "in-progress"

# All blocked Issues
gh issue list --repo LIMITLESS-LONGEVITY/limitless --label "blocked"

# All open PRs — what is in review
gh pr list --repo LIMITLESS-LONGEVITY/limitless --state open

# Handoff queue — review Discord #handoffs for unexecuted handoffs (proactive 30-min check)
# MEMORY.md — Architect reads at session start for in-flight task context
```

#### 9.2.6 `@aradSmith` Contributor Workflow Under Option D

1. Read onboarding docs (PR-ONB-001–003) — Day 1 reading list.
2. Discover active work: GitHub Issues board (`--label in-progress`) for tactical work in flight; `ROADMAP.md` for strategic priorities.
3. Claim work: coordinate via #handoffs or direct Discord message to Director.
4. Deliver: open PR referencing the relevant spec/plan and `Closes #NNN` in the PR body.
5. Merge: CEO ratifies via Approving Review per governance spec §5.1. Issue auto-closes.

No external SaaS required. Standard GitHub Issues board is the contributor-facing view.

#### 9.2.7 CLAUDE.md Update Required

The Architect's `CLAUDE.md` (or equivalent agent instruction document) must be updated to include the Issue creation step in the handoff execution flow. This is the only process addition Option D requires.

### 9.3 §6.3 JIRA: Convention Under Option D

The `JIRA:` smart-commit convention in the governance spec remains reserved as-is. No change. See §8 of this spec. GitHub Issues (Option D) and JIRA smart-commit conventions are orthogonal — MYTHOS can adopt Jira for their own tracking without affecting the LIMITLESS Issues board.

---

## 10. Migration Plan

### Phase 1 — Ratification (Day 0)

- [ ] CEO ratifies this spec (status changes to Accepted).
- [ ] CLAUDE.md updated to include `gh issue create` step at handoff execution time.
- [ ] Confirm `ROADMAP.md` is current (Architect updates if stale).
- [ ] Onboarding PR-ONB-001–003 queue confirmed (from `docs/plans/2026-04-21-human-onboarding-docs-roadmap.md`).

### Phase 2 — Contributor Onboarding (Day 3+)

- [ ] PR-ONB-001 (README overhaul) filed and merged — includes reference to GitHub Issues board as work discovery surface.
- [ ] PR-ONB-002 (CONTRIBUTING.md refresh) filed and merged — includes `Closes #NNN` PR body convention.
- [ ] PR-ONB-003 (Ways of Working guide) filed and merged — includes Issue lifecycle (label flow).
- [ ] `@aradSmith` invited as collaborator; directed to Day-1 reading list.
- [ ] First handoff to `@aradSmith` issued via Discord #handoffs in standard schema format; corresponding Issue created at handoff execution.

### Phase 3 — Steady State

- [ ] Architect's 30-minute proactive checks include: `gh issue list --label in-progress` scan for stale Issues; `gh pr list --state open` scan for stale PRs.
- [ ] Daily briefing (#main-ops) includes: open Issue count by label, open PR count, unexecuted handoffs in #handoffs, `ROADMAP.md` lane summary.
- [ ] If sync discipline between Issues and specs becomes a recurring problem at scale, revisit Option C via a DR-CFG process — do not revert ad-hoc.

---

## 11. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Issue body drifts from spec scope (spec-vs-Issue sync discipline failure) | Medium | Medium | Issue body convention is strictly: spec link + one-line summary only. No planning content in Issues. Enforced by CLAUDE.md convention. |
| `@aradSmith` finds Option D Issues board insufficient without onboarding docs | Medium | Medium | PR-ONB-001–003 are P0 prerequisites for write access (see onboarding roadmap). Issues board is the discovery surface; docs explain the workflow. |
| `MEMORY.md` drifts under concurrent task load | Medium | Medium | Architect proactive check includes `MEMORY.md` review at session start; stale entries flagged at daily briefing. `gh issue list` now supplements MEMORY.md as structured query. |
| ROADMAP.md falls out of date | Medium | Low | Architect updates ROADMAP.md at every epic-level state change (norm, not exception). |
| Option C adopted informally (Issues board abandoned) | Low | Medium | Any reversion to pure Option C is non-normative until a DR-CFG formalises it. Director enforces. |
| MYTHOS configures Jira; `JIRA:` convention activates unexpectedly | Very Low | Low | Activation requires Jira admin action on MYTHOS's side. No LIMITLESS impact. §6.3 remains reserved. |

---

## 12. Acceptance Criteria

This spec is considered successfully implemented when:

1. CEO ratification received (status → Accepted).
2. CLAUDE.md updated to include `gh issue create` at handoff execution time (one-line addition).
3. PR-ONB-001–003 (contributor onboarding docs) are filed (gated: write access for `@aradSmith`); onboarding docs reference the GitHub Issues board as work discovery surface.
4. `ROADMAP.md` is current and reflects active Phase 2 work.
5. Governance spec §6.3 is unchanged (no activation, no retirement of `JIRA:` convention).
6. `@aradSmith` is able to discover active work from the GitHub Issues board (`--label in-progress`) + `ROADMAP.md` + onboarding docs without requiring Discord access for basic orientation.
7. At least one Issue created per the Option D convention (verifiable via `gh issue list --repo LIMITLESS-LONGEVITY/limitless`).

---

## 13. Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-20 | PR #54 merged | Confirmed Jira is orthogonal to hosting; smart-commit convention inert without Jira instance |
| 2026-04-21 | Option D selected as Architect's recommendation | Contributor discoverability via GitHub Issues board; structured query via `gh issue list`; no external SaaS; SDD-compatible when Issue body is strictly a spec link |
| 2026-04-21 | Option C considered, not adopted | Option C is simpler and fully SDD-compatible; deferred pending CEO adjudication on contributor orientation trade-off |
| 2026-04-21 | §6.3 kept reserved | Retirement cost > clutter cost; MYTHOS Jira composability preserved at zero LIMITLESS cost |
| 2026-04-22 | Recommendation temporarily changed to Option C | Bot-directed (not authoritative) — restored to Option D per human Director confirmation |

---

*Proposed by Architect, 2026-04-21. Restored to Option D recommendation 2026-04-22 per human Director confirmation (bot-directed revert to Option C in commit 7aacbdc confirmed not authoritative). CEO verbatim SDD framing added as foundational context. Awaiting CEO ratification on Option C vs Option D — see §9 adjudication note.*