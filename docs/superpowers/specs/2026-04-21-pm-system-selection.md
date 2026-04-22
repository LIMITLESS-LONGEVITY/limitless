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

## 1. Purpose

This spec formalises the project management (PM) system selection for the LIMITLESS Software Development Division as it transitions into Phase 2: onboarding the MYTHOS collaborating team (`@aradSmith`) and operating two parallel development tracks. The decision must account for:

1. The division's Spec-Driven Development (SDD) philosophy — specs ARE the source of truth, not tickets.
2. Autonomous AI agents as first-class PM participants.
3. Human contributor orientation — `@aradSmith` must be able to understand the division's ways of working without requiring a dedicated PM tool layer.
4. The four internal SDD Kernel Services that underpin the autonomous pipeline.
5. Cost and tooling overhead constraints.

---

## 2. Background

### 2.1 Current PM State

The division currently operates without a formal ticket system. Work is tracked through:

- **Discord #handoffs** — structured handoff messages (schema-enforced) where the Architect delegates work to specialist engineers.
- **Discord #main-ops / #workbench-ops** — status updates and daily briefings.
- **GitHub PRs** — the atomic unit of deliverable work; PR description contains context, tasks, and verification steps.
- **`ROADMAP.md` Kanban board** — strategic lanes (Backlog → In Progress → Review → Done) in the monorepo root.
- **`docs/plans/`** — per-feature planning documents.
- **`docs/superpowers/specs/`** — authoritative specs written before code; the SDD source of truth.

There is no Jira instance, no Linear workspace, no GitHub Issues board, and no sprint cadence. This has worked at solo/duo scale and — with proper onboarding documentation — is the correct model for Phase 2 as well.

### 2.2 Governance Spec §6.3 — JIRA: Smart-Commit Convention

The governance spec (`2026-04-18-agentic-sdlc-governance.md`) §6.3 reserves the following smart-commit convention:

```
JIRA: PROJ-123
```

The spec explicitly states: _"No tooling change required today — the convention is reserved."_ This was a forward-looking placeholder, not an active integration. As of the date of this spec, zero commits in the monorepo use this convention and no Jira instance is configured.

### 2.3 PR #54 Findings

PR #54 (`2026-04-18-gitlab-jira-adoption-analysis.md`, merged 2026-04-20) reached the following conclusions relevant to this decision:

1. Jira is orthogonal to the GitHub/GitLab hosting decision.
2. Smart-ID references (`JIRA: MYTHOS-47`) work without any Architect container changes — they are inert text strings that Jira's GitHub integration reads on Jira's side.
3. Collaborating teams (MYTHOS) can use Jira for their own PM tracking without affecting LIMITLESS agent tooling.

These findings constrain Options A (Jira) and shape the §6.3 resolution in §7.

### 2.4 SDD Framing (CEO Mandate)

The CEO's SDD mandate governs all tooling decisions:

> _Specs are written before code. Specs ARE the source of truth. Any PM system must complement SDD, not compete with it. The spec file is the definitive description of work — the PM system's job is to track status, not to replace the spec._

Any option that causes ticket content to diverge from or duplicate spec content is non-compliant with SDD. The PM system is a status mirror, not a planning tool.

---

## 3. SDD Kernel Services

The division's autonomous pipeline depends on four internal Kernel Services. Every PM option must be evaluated against its ability to serve each:

| # | Kernel Service | Description | Current Implementation |
|---|---|---|---|
| 1 | **Planning Layer** | DAG decomposition of strategic goals into app-level tasks | Director writes specs + plans; Architect decomposes into handoffs |
| 2 | **Context/Memory Management** | Which tasks are in flight, blocked, complete | `MEMORY.md` + Discord thread history + PR open/merged state |
| 3 | **Constraint Enforcement** | Governance tier compliance, branch protection, scope boundary checks | Governance spec + GitHub branch protection rules + PR review gates |
| 4 | **Self-Healing/Drift Detection** | Health check failures, VPS config drift, NanoClaw version drift | Cron health checks (every 30 min) + DR-002 pipeline |

These services are not replaced by a PM tool — they are _served_ by one. The evaluation asks: does this PM option make each Kernel Service more robust, the same, or harder to operate?

---

## 4. Options

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

## 5. SDD Kernel Services Coverage Matrix

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

## 6. Comparative Summary

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

## 7. §6.3 JIRA: Smart-Commit Convention Resolution

### Current State

Governance spec §6.3 reserves the convention `JIRA: MYTHOS-47` as a smart-commit plug-in point. It is:
- Inert — no commits use it.
- Harmless — it is a text string; Jira's GitHub app reads it server-side.
- Forward-looking — reserved for a future Jira integration that was never prioritised.

### Resolution: Keep Reserved

**Recommendation: Keep §6.3 as-is. Do not activate. Do not retire.**

Rationale:

1. **Activate** would require: a Jira instance (cost + admin overhead), a Jira project key, and configuration of Jira's GitHub app — none of which is justified by the Option C selection.

2. **Retire** would require editing the governance spec and potentially confusing MYTHOS if they later adopt Jira. The retirement cost exceeds the clutter cost of keeping the reservation.

3. **Keep reserved** costs nothing. The `JIRA:` text in a commit message is a no-op unless a Jira instance with GitHub integration is configured. MYTHOS (`@aradSmith`) may adopt Jira for their own tracking — if they do, their Jira admin configures the integration on Jira's side, and the convention activates automatically for any commit that uses it. No LIMITLESS agent code change is required.

**Action:** No change to governance spec §6.3. Convention remains reserved.

---

## 8. Recommendation: Option C — Spec-as-SoT

### 8.1 Decision

**Retain and formalise the current Spec-as-SoT model as the canonical PM approach for LIMITLESS Phase 2.**

Rationale:

1. **SDD fidelity is non-negotiable.** Option C is the only option where specs are not just the truth but the entire PM system. No other option can claim this without qualification.
2. **Contributor orientation is a documentation problem, not a tooling problem.** The onboarding friction of `@aradSmith` not understanding Discord handoff schema is addressed by PR-ONB-001–003 (Ways of Working guide, CONTRIBUTING.md refresh, README overhaul). Solving it with a new PM tool layer introduces new complexity before Phase 2 is even declared stable.
3. **No new habits before Phase 2 baseline.** The division is at a transition point — adding a second planning artifact type (Issues) before the 4-document readiness bundle is ratified and `@aradSmith` is onboarded would obscure whether problems stem from process, tooling, or people. Option C preserves a clean baseline.
4. **Agent-native with zero process change.** Agents already produce every Option C artifact. No CLAUDE.md changes are required by this decision.

### 8.2 What Option C Formalises

The following are now normative conventions under Option C:

#### 8.2.1 Spec-as-SoT Conventions (Binding)

| Artifact | Purpose | Author | Location |
|---|---|---|---|
| `docs/superpowers/specs/YYYY-MM-DD-*.md` | Authoritative work definition (what to build, why, constraints) | Director or Architect | `docs/superpowers/specs/` |
| `docs/plans/YYYY-MM-DD-*.md` | Execution plan (how to build, rollout phases, rollback) | Architect | `docs/plans/` |
| Discord #handoffs message | Handoff schema record (From, To, Priority, Repo, Context, Tasks, Verify, PR Naming) | Architect | Discord |
| `ROADMAP.md` | Strategic Kanban (Backlog → In Progress → Review → Done), epic-level | Director or Architect | Repo root |
| GitHub PR | Atomic delivery unit; PR description references spec + plan | Agent or human | GitHub |
| `MEMORY.md` | Architect session context — in-flight task state, cross-session carry-over | Architect | `/workspace/group/` (Architect-side) |

#### 8.2.2 Status Queries Under Option C

The Architect uses the following as primary status queries (no Issues board required):

```bash
# All open PRs — what is in review
gh pr list --repo LIMITLESS-LONGEVITY/limitless --state open

# All open PRs by label (if PR labels are used)
gh pr list --repo LIMITLESS-LONGEVITY/limitless --label "in-progress"

# Handoff queue — review Discord #handoffs for unexecuted handoffs (proactive 30-min check)
# MEMORY.md — Architect reads at session start for in-flight task context
```

#### 8.2.3 `@aradSmith` Contributor Workflow Under Option C

1. Read onboarding docs (PR-ONB-001–003) — Day 1 reading list.
2. Discover active work: `ROADMAP.md` for strategic priorities; open PRs for tactical work in flight.
3. Claim work: coordinate via #handoffs or direct Discord message to Director.
4. Deliver: open PR referencing the relevant spec/plan in the PR body.
5. Merge: CEO ratifies via Approving Review per governance spec §5.1.

No GitHub Issues board required. If `@aradSmith` wants a board view as a personal aid, see §8.3.

#### 8.2.4 ROADMAP.md as the Strategic Kanban

`ROADMAP.md` is the canonical top-level view of work. The Architect updates it at:
- New epic/milestone entering In Progress.
- Epic/milestone completing (PR merged, spec ratified).
- Blocker declared (epic moves back to Backlog with a note).

It is NOT updated per PR — only per epic-level milestone.

### 8.3 Optional Implementation Aid — GitHub Issues

GitHub Issues are **not** part of the recommended PM model but are available as an **optional lightweight aid** that does not conflict with Option C if used with discipline.

**When issues may be useful:**
- `@aradSmith` requests a board view as a personal orientation tool.
- A sprint-style grouping of in-flight work is needed for external stakeholder communication.
- The Architect wants a structured `gh issue list --label blocked` query without parsing Discord.

**If used, the following constraints apply (prevents SDD violation):**
- Issue body = link to spec/plan only + one-line summary. No planning content in Issues.
- Issues are created manually or on request — they are not a required step in the handoff flow.
- Issues do not gate handoffs, PRs, or ratification. They are informational only.
- If an Issue contradicts a spec, the spec wins — the Issue is closed or corrected.

**This is not a Phase 2 adoption decision.** If Issues prove useful and the sync discipline holds, a future DR-CFG or governance amendment can formalise them. For now, they are an optional tool, not a normative practice.

---

## 9. Migration Plan

### Phase 1 — Ratification (Day 0)

- [ ] CEO ratifies this spec (status changes to Accepted).
- [ ] No tooling changes required.
- [ ] Confirm `ROADMAP.md` is current (Architect updates if stale).
- [ ] Onboarding PR-ONB-001–003 queue confirmed (from `docs/plans/2026-04-21-human-onboarding-docs-roadmap.md`).

### Phase 2 — Contributor Onboarding (Day 3+)

- [ ] PR-ONB-001 (README overhaul) filed and merged.
- [ ] PR-ONB-002 (CONTRIBUTING.md refresh) filed and merged.
- [ ] PR-ONB-003 (Ways of Working guide) filed and merged.
- [ ] `@aradSmith` invited as collaborator; directed to Day-1 reading list.
- [ ] First handoff to `@aradSmith` issued via Discord #handoffs in standard schema format.

### Phase 3 — Steady State

- [ ] Architect's 30-minute proactive checks include: `gh pr list --state open` scan for stale PRs.
- [ ] Daily briefing (#main-ops) includes: open PR count, unexecuted handoffs in #handoffs, `ROADMAP.md` lane summary.
- [ ] If structured query gap becomes painful at scale (5+ concurrent handoffs), revisit Option D via a DR-CFG process — do not adopt ad-hoc.

---

## 10. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `@aradSmith` finds Option C opaque without onboarding docs | High | Medium | PR-ONB-001–003 are P0 prerequisites for write access (see onboarding roadmap). |
| `MEMORY.md` drifts under concurrent task load | Medium | Medium | Architect proactive check includes `MEMORY.md` review at session start; stale entries flagged at daily briefing. |
| ROADMAP.md falls out of date | Medium | Low | Architect updates ROADMAP.md at every epic-level state change (norm, not exception). |
| Option D adopted informally without governance amendment | Low | Medium | Any Issues board usage is optional and non-normative until a DR-CFG formalises it. Director enforces. |
| MYTHOS configures Jira; `JIRA:` convention activates unexpectedly | Very Low | Low | Activation requires Jira admin action on MYTHOS's side. No LIMITLESS impact. §6.3 remains reserved. |

---

## 11. Acceptance Criteria

This spec is considered successfully implemented when:

1. CEO ratification received (status → Accepted).
2. No new PM tooling introduced without a follow-on DR-CFG or governance amendment.
3. PR-ONB-001–003 (contributor onboarding docs) are filed (gated: write access for `@aradSmith`).
4. `ROADMAP.md` is current and reflects active Phase 2 work.
5. Governance spec §6.3 is unchanged (no activation, no retirement of `JIRA:` convention).
6. `@aradSmith` is able to understand active work from `ROADMAP.md` + open PRs + onboarding docs without requiring Discord access for basic orientation.

---

## 12. Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-20 | PR #54 merged | Confirmed Jira is orthogonal to hosting; smart-commit convention inert without Jira instance |
| 2026-04-21 | Option C selected | SDD fidelity, zero tool overhead, agent-native, no new habits before Phase 2 baseline |
| 2026-04-21 | Option D considered, not adopted | Contributor orientation benefit is real but solved by onboarding docs (PR-ONB-001–003), not PM tooling; sync discipline risk outweighs gain at current scale |
| 2026-04-21 | §6.3 kept reserved | Retirement cost > clutter cost; MYTHOS Jira composability preserved at zero LIMITLESS cost |
| 2026-04-22 | Director confirmed Option C | Prior spec-centered direction held; GitHub Issues noted as optional implementation aid only |

---

*Proposed by Architect, 2026-04-21. Revised 2026-04-22 per Director review (Option C confirmed). Awaiting CEO ratification.*
