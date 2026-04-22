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
3. Human contributor accessibility — `@aradSmith` must be able to see and act on work without learning Discord handoff schema.
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

There is no Jira instance, no Linear workspace, no GitHub Issues board, and no sprint cadence. This has worked at solo/duo scale but is insufficient for multi-team coordination.

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
- Linear's free tier limits may bind as MYTHOS scales.

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

**`@aradSmith` contributor model:**
- Standard GitHub contributor workflow; no Discord schema knowledge required.
- Issues board is a familiar interface.

**Pros:**
- Single platform (GitHub) — no external SaaS.
- Agents natively create and manage Issues via `gh` CLI.
- PR-to-Issue auto-linking via `Closes #NNN` is zero-overhead.
- No additional cost.
- `@aradSmith` sees work on a standard GitHub Issues board.

**Cons:**
- GitHub Projects UI is less feature-rich than Jira (no time tracking, weaker velocity estimation, no epics natively).
- Without strict conventions, Issues can sprawl and duplicate spec content.
- Milestone granularity is coarse; no sub-task nesting without workarounds.
- Requires discipline to keep Issues as status mirrors and not planning documents.

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
- Requires Discord access and familiarity with the handoff schema.
- GitHub PRs remain the contributor interface; spec reading expected.
- Onboarding friction: Discord schema is opaque without documentation.

**Pros:**
- Zero tool overhead — nothing new to configure, pay for, or maintain.
- Fully SDD-compatible — specs ARE the system; no status/truth split possible.
- Agents are first-class PM participants with no new capabilities needed.
- No context split: one place to look for work definition.
- Self-documenting: every handoff is a Discord message with a structured schema.

**Cons:**
- No structured query capability — cannot ask "show me all blocked tasks" without parsing Discord history.
- No velocity metrics or sprint cadence.
- No visual board for human collaborators who don't want to parse Discord + Markdown.
- Hard for `@aradSmith` to onboard without Discord schema documentation.
- `MEMORY.md` is an agent-maintained file — can drift or become stale under concurrent task load.
- Scales poorly beyond two teams; Discord thread history is lossy over time.

---

### Option D — Hybrid (Spec-as-SoT + GitHub Issues as Lightweight Tracker)

**Description:** Specs and plans remain the definitive SoT. GitHub Issues serve as lightweight status trackers — one Issue per spec or plan, with the Issue body linking to the spec file. Issues track status (open/closed/labelled) but contain no planning content.

**Mechanics:**
- Issue title = spec filename stem (e.g., `[SPEC] 2026-04-21-agent-config-governance`).
- Issue body = link to spec + one-paragraph summary + labels.
- Labels: `in-progress`, `blocked`, `review`, `merged`, `spec`, `plan`, `handoff`.
- Agents create Issues at handoff time via `gh issue create`.
- PR body includes `Closes #NNN` — Issue auto-closes on merge.
- `ROADMAP.md` retains the strategic Kanban (epic-level); Issues are the tactical tracker (spec-level).
- Discord #handoffs retains the full handoff schema; the Issue is the GitHub-visible record.

**Agent interaction:**
- `gh issue create` at handoff time — one command, no new tooling.
- `gh issue edit --add-label blocked` when a handoff is blocked.
- `gh issue list --label in-progress` for Architect memory queries.
- Issue body includes `Closes #NNN` in PR — auto-close on merge.

**`@aradSmith` contributor model:**
- Sees a GitHub Issues board with labelled, linkable work items.
- Clicks Issue body link to reach the spec — no Discord schema required.
- PRs auto-close Issues — contributor workflow is standard GitHub.

**JIRA: convention interaction:**
- If MYTHOS uses Jira, they reference `MYTHOS-47` in their PR descriptions.
- Jira's GitHub integration reads those references on Jira's side.
- No LIMITLESS agent changes required.
- The `JIRA:` smart-commit convention in §6.3 remains reserved as an inert plug-in point.

**Pros:**
- SDD-compatible: specs are SoT; Issues are status mirrors only.
- Agent-native: `gh` CLI covers all Issue operations already available in Architect containers.
- Contributor-friendly: `@aradSmith` sees a standard GitHub Issues board.
- No external SaaS cost.
- Structured query: `gh issue list --label blocked` gives instant blocked-task view.
- PR-to-Issue auto-link (`Closes #NNN`) is zero-overhead delivery signal.
- Composable: MYTHOS can run Jira in parallel; Issues and Jira are not mutually exclusive.

**Cons:**
- Two artifacts per task (spec + Issue) must stay in sync — Issue body must not drift from spec scope.
- Agents must be taught (via CLAUDE.md update) to create Issues at handoff time — a small but real process change.
- GitHub Projects board still lacks Jira's reporting depth if velocity metrics are later required.
- Label hygiene requires discipline; stale labels degrade query reliability.

---

## 5. SDD Kernel Services Coverage Matrix

Rating scale: **Strong** = serves this kernel service natively and robustly; **Partial** = serves it with workarounds or incompletely; **Weak** = does not serve it or actively hinders it.

| Kernel Service | Option A (Jira/Linear) | Option B (GH Issues) | Option C (Spec-as-SoT) | Option D (Hybrid) |
|---|---|---|---|---|
| **Planning Layer** (DAG → tasks) | Partial — tickets can represent tasks but spec-to-ticket mapping is manual; agents cannot create tickets autonomously | Partial — Issues can represent tasks; agents create them via `gh`; but DAG structure is flat (no native sub-task hierarchy) | Strong — specs and plans ARE the planning layer; agents write them natively | Strong — specs/plans remain SoT for DAG; Issues are the lightweight task nodes agents can query |
| **Context/Memory Management** (in-flight, blocked, complete) | Partial — Jira board shows status but agents cannot query or update it; MEMORY.md still needed | Strong — `gh issue list --label in-progress` gives instant structured query; agents can update labels; replaces `MEMORY.md` for task state | Weak — no structured query; requires parsing Discord history + `MEMORY.md`; stale under concurrent load | Strong — `gh issue list` gives structured query; labels encode state; agents update labels at each lifecycle event |
| **Constraint Enforcement** (governance, branch protection, scope) | Partial — Jira has no awareness of governance spec tiers or branch rules; enforcement still happens at GitHub layer | Partial — GitHub Issues have no enforcement mechanism; enforcement remains at GitHub branch protection + PR review layer | Strong — specs define constraints directly; governance spec is the enforcement document; agents read it natively | Strong — specs define constraints (same as C); Issues inherit spec scope via body link; no constraint logic in Issues |
| **Self-Healing/Drift Detection** (health checks, VPS drift, NanoClaw drift) | Weak — Jira has no health check integration; alerts would require webhook configuration and a Jira ticket creation step | Partial — `gh issue create` can be used to file drift/health alerts as Issues; requires discipline not to pollute task board | Weak — Discord #alerts is the current channel; no structured query for open alerts; no auto-resolution signal | Partial — health alert Issues can be created and auto-closed via `gh`; labelled `alert` to separate from task Issues; cleaner than C but still not a purpose-built alerting system |

**Summary interpretation:**

- Option A is Partial across all four kernel services because the external system is opaque to agents and requires manual human bridging.
- Option B is Strong on Context/Memory (the biggest current gap) but Partial elsewhere — it lacks the spec-level planning depth and alerting integration.
- Option C is Strong on Planning and Constraint Enforcement (because specs are the system) but Weak on Context/Memory and Self-Healing — exactly the two failure modes observed at scale.
- Option D combines C's strengths (Strong Planning, Strong Constraints) with B's Context/Memory strength (structured `gh` queries), at the cost of a two-artifact discipline requirement.

---

## 6. Comparative Summary

| Criterion | Option A | Option B | Option C | Option D |
|---|---|---|---|---|
| SDD-compatible | No — tickets compete with specs | Partial — Issues must be disciplined | Yes — specs ARE the system | Yes — specs SoT; Issues are mirrors |
| Agent-native | No — no Jira CLI in containers | Yes — `gh` CLI | Yes — agents write all artifacts | Yes — `gh` CLI for Issues |
| Contributor-friendly (`@aradSmith`) | Yes | Yes | No — Discord schema required | Yes — GitHub Issues board |
| Structured status query | Yes | Yes | No | Yes |
| Velocity/sprint metrics | Yes | Partial | No | Partial |
| External SaaS cost | Jira Free / Linear Free | None | None | None |
| New tooling required | Yes — Jira/Linear setup | No | No | No (minor CLAUDE.md update) |
| MYTHOS/Jira composable | N/A (is Jira) | Yes | Yes | Yes |
| Scales to multi-team | Yes | Partial | No | Yes |

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

1. **Activate** would require: a Jira instance (cost + admin overhead), a Jira project key, and configuration of Jira's GitHub app — none of which is justified by the Option D selection.

2. **Retire** would require: editing the governance spec, removing the convention, and potentially confusing MYTHOS if they later adopt Jira. The retirement cost exceeds the clutter cost of keeping the reservation.

3. **Keep reserved** costs nothing. The `JIRA:` text in a commit message is a no-op unless a Jira instance with GitHub integration is configured. MYTHOS (`@aradSmith`) may adopt Jira for their own tracking — if they do, their Jira admin configures the integration on Jira's side, and the convention activates automatically for any commit that uses it. No LIMITLESS agent code change is required at that point either, consistent with PR #54's conclusion.

**Action:** No change to governance spec §6.3. Convention remains reserved. MYTHOS is informed (via this spec) that if they configure a Jira instance, the `JIRA: PROJ-ID` convention in commit messages will auto-link without any LIMITLESS-side action.

---

## 8. Recommendation: Option D — Hybrid

### 8.1 Decision

**Adopt Option D: Spec-as-SoT + GitHub Issues as lightweight status tracker.**

This is the only option that satisfies all four non-negotiable constraints simultaneously:
1. SDD compliance (specs are SoT; Issues are status mirrors only).
2. Agent-native (no new tooling; `gh` CLI covers all required operations).
3. Contributor-friendly (`@aradSmith` works from a standard GitHub Issues board).
4. No external SaaS cost or dependency.

### 8.2 Implementation Convention (Normative)

The following conventions are binding from the date of CEO ratification.

#### 8.2.1 Issue Creation — At Handoff Time

When the Architect creates a handoff in Discord #handoffs, it simultaneously creates a GitHub Issue:

```bash
gh issue create \
  --title "[SPEC] 2026-04-21-agent-config-governance" \
  --body "Tracks: docs/superpowers/specs/2026-04-21-agent-config-governance.md

See spec for full scope, tasks, and verification steps.

**Handoff channel:** #handoffs
**Priority:** P1
**Assignee:** @specialist-engineer" \
  --label "in-progress" \
  --repo LIMITLESS-LONGEVITY/limitless
```

Rules:
- Issue title format: `[SPEC] {spec-filename-stem}` or `[PLAN] {plan-filename-stem}`.
- Issue body: link to spec/plan file + one-paragraph summary + handoff metadata (priority, assignee). No planning content in the body.
- Initial label: `in-progress` (assigned at creation).
- One Issue per spec or plan. Not one Issue per task within a spec.

#### 8.2.2 Label Lifecycle

| Stage | Label | Trigger |
|---|---|---|
| Handoff created | `in-progress` | Architect creates Issue at handoff time |
| Blocked | `blocked` | Architect edits label when handoff is blocked (`gh issue edit NNN --add-label blocked --remove-label in-progress`) |
| PR open for review | `review` | Engineer posts PR; Architect updates label |
| PR merged | *(Issue auto-closes)* | `Closes #NNN` in PR body triggers GitHub auto-close |
| Alert (health/drift) | `alert` | Cron health check posts Issue; separate from task Issues |

#### 8.2.3 PR Body Convention

Every PR body must include the Issue close reference:

```
Closes #NNN
```

Where `NNN` is the GitHub Issue number created at handoff time. This is a required field in the existing handoff schema's PR Naming section — enforced via PR template or Architect review.

#### 8.2.4 ROADMAP.md — Strategic Kanban

`ROADMAP.md` retains the epic/milestone-level Kanban. It is NOT updated per spec — only per epic milestone. The relationship is:

- `ROADMAP.md` lane → GitHub Milestone (optional, for sprint grouping).
- GitHub Issue → one spec or plan (tactical tracker).
- Discord #handoffs → full handoff schema (operational record).

#### 8.2.5 Structured Queries (Architect Memory)

The Architect uses the following `gh` queries as substitutes for `MEMORY.md` task state:

```bash
# All in-progress work
gh issue list --label in-progress --repo LIMITLESS-LONGEVITY/limitless

# All blocked work (requires escalation)
gh issue list --label blocked --repo LIMITLESS-LONGEVITY/limitless

# All open alerts
gh issue list --label alert --repo LIMITLESS-LONGEVITY/limitless

# Work awaiting review
gh issue list --label review --repo LIMITLESS-LONGEVITY/limitless
```

These replace the ad-hoc Discord scroll + `MEMORY.md` scan that is currently the Architect's only memory mechanism.

#### 8.2.6 `@aradSmith` Onboarding

`@aradSmith` contributors interact with the PM system as follows:

1. View work: GitHub Issues board at `LIMITLESS-LONGEVITY/limitless/issues`.
2. Understand scope: click Issue body link → spec file in `docs/superpowers/specs/`.
3. Claim work: comment on Issue or be assigned by Architect.
4. Deliver: open PR with `Closes #NNN` in body.
5. Merge: PR merge auto-closes Issue.

No Discord access required for basic contributor workflow. Discord is for Architect-level operational coordination.

#### 8.2.7 CLAUDE.md Update (Required)

The Architect's `CLAUDE.md` (or equivalent system prompt) must be updated to include:

> **At handoff time:** Create a GitHub Issue via `gh issue create` with title `[SPEC] {spec-stem}`, body linking to the spec, and label `in-progress`. Record the Issue number in the Discord handoff message.
> **At PR creation:** Confirm PR body includes `Closes #NNN`.
> **At PR merge:** Verify Issue is auto-closed; if not, close manually via `gh issue close NNN`.
> **At blockage:** Update Issue label to `blocked` via `gh issue edit NNN --add-label blocked --remove-label in-progress`.

This update is a pre-condition for Option D to be operational. It should be applied in the same PR that ratifies this spec.

### 8.3 What Option D Does NOT Do

To prevent scope creep, the following are explicitly out of scope for Option D:

- **Velocity metrics / burndown charts** — not required. If required in Phase 3, GitHub Projects (v2) custom fields can be added without changing this spec.
- **Sprint ceremonies** — not required. Milestones are optional grouping constructs, not sprint gates.
- **Jira integration** — not in scope for LIMITLESS. MYTHOS may configure their own Jira instance; the `JIRA:` convention in §6.3 accommodates this without any LIMITLESS action.
- **GitHub Projects (v2) board** — optional. The Issues list with labels is sufficient. A Projects board can be added later without changing this spec's conventions.
- **Sub-tasks / issue hierarchies** — not in scope. One spec = one Issue. Tasks within a spec are tracked in the spec document itself.

---

## 9. Migration Plan

### Phase 1 — Ratification (Day 0)

- [ ] CEO ratifies this spec (status changes to Accepted).
- [ ] Architect updates `CLAUDE.md` to include Issue creation convention (§8.2.7).
- [ ] GitHub label set created: `in-progress`, `blocked`, `review`, `alert`, `spec`, `plan`.
- [ ] PR template updated to include `Closes #NNN` reminder.

### Phase 2 — Retroactive Issue Creation (Days 1–3)

- [ ] Architect creates Issues for all currently in-flight specs and plans (those with open PRs or active handoffs).
- [ ] Each Issue body links to the relevant spec/plan file.
- [ ] Open PRs updated to include `Closes #NNN` where applicable.
- [ ] `MEMORY.md` reviewed; stale entries replaced by Issue labels.

### Phase 3 — `@aradSmith` Onboarding (Day 3+)

- [ ] `@aradSmith` invited as collaborator to `LIMITLESS-LONGEVITY/limitless`.
- [ ] Onboarding document links to GitHub Issues board as primary work-discovery interface.
- [ ] First MYTHOS-facing Issue created per §8.2.1 convention.

### Phase 4 — Steady State

- [ ] Architect creates Issues at every handoff (norm, not exception).
- [ ] 30-minute proactive checks include `gh issue list --label blocked` scan.
- [ ] Daily briefing (#main-ops) includes Issue count summary: in-progress / blocked / review.

---

## 10. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Issues drift from spec content (body grows into planning doc) | Medium | Medium | Convention §8.2.1 is explicit: body = link + summary only. Architect reviews Issues at creation. |
| Agent forgets to create Issue at handoff time | Medium | Low | `CLAUDE.md` update (§8.2.7) makes it a required step. Architect proactive check includes Issue audit. |
| `Closes #NNN` missing from PR body | Low | Low | PR template reminder. Architect verifies before merge. |
| Label hygiene degrades | Low | Medium | Architect 30-min check includes `--label blocked` scan. Stale `in-progress` labels flagged at daily briefing. |
| MYTHOS configures Jira; `JIRA:` convention activates unexpectedly | Very Low | Low | PR #54: activation requires Jira admin action on MYTHOS's side. No LIMITLESS impact. Noted in §7. |
| GitHub Issues board overwhelmed by alert Issues | Low | Medium | `alert` label segregates alerts from task Issues. `gh issue list --label alert` is a separate query. |

---

## 11. Acceptance Criteria

This spec is considered successfully implemented when:

1. GitHub label set (`in-progress`, `blocked`, `review`, `alert`, `spec`, `plan`) is created on `LIMITLESS-LONGEVITY/limitless`.
2. `CLAUDE.md` (Architect system prompt) includes the Issue creation convention from §8.2.7.
3. PR template includes `Closes #NNN` reminder.
4. At least one handoff-to-Issue-to-PR-to-close cycle is executed end-to-end (smoke test).
5. `@aradSmith` can navigate from the Issues board to a spec file without Discord access.
6. Governance spec §6.3 is unchanged (no activation, no retirement of `JIRA:` convention).

---

## 12. Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-20 | PR #54 merged | Confirmed Jira is orthogonal to hosting; smart-commit convention inert without Jira instance |
| 2026-04-21 | Option D selected | Only option satisfying SDD + agent-native + contributor-friendly + zero SaaS cost simultaneously |
| 2026-04-21 | §6.3 kept reserved | Retirement cost > clutter cost; MYTHOS Jira composability preserved at zero LIMITLESS cost |
| 2026-04-21 | `MEMORY.md` partially superseded | `gh issue list` queries replace task-state tracking; `MEMORY.md` retained for Architect session context not captured by Issues |

---

*Proposed by Architect, 2026-04-21. Awaiting CEO ratification.*