# Human Onboarding Documentation Roadmap

| Field | Value |
|-------|-------|
| **Date** | 2026-04-21 |
| **Author** | Architect |
| **Status** | Proposed — awaiting CEO ratification |
| **Applies to** | `@aradSmith` and all future human contributors to LIMITLESS |
| **References** | DR-001, DR-002, governance spec, Q1–Q5 (`@aradSmith` activation decisions — see §CEO Decisions Required below) |

---

## Purpose

This document is not the onboarding documentation itself. It is the **plan for which PRs to file, in what order, covering what content**, so that `@aradSmith` (and every future human contributor) can be onboarded to LIMITLESS within a single working day without needing to ask basic questions.

The deliverable of each PR listed here is a human-readable document. Together they form a complete orientation corpus covering the division's way of working, platform architecture, governance model, and how to collaborate with AI agents.

---

## Cross-Reference: @aradSmith Activation Decisions (Q1–Q5)

The Phase 2 Readiness Report (`docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md` §6.1) identifies **five CEO decisions blocking `@aradSmith`'s full activation**. These are distinct from the Phase 2 readiness topics covered by the current PR (see §Phase 2 Readiness Topics / PR #79 Coverage below).

The recommended answers below are from the Director's readiness report (§6.2) — they are **proposals, not yet CEO-ratified decisions**. The CONTRIBUTING.md (PR-ONB-002) and WAYS-OF-WORKING guide (PR-ONB-003) **cannot be finalised** until the CEO confirms or revises these answers.

| ID | Topic | Decision Needed | Recommended Answer (§6.2 — proposal only) |
|----|-------|-----------------|-------------------------------------------|
| **Q1** | Signed-commits capability | Does Arad have GPG/SSH commit signing? Spec §1.2 requires it on MYTHOS | Require GPG or SSH signing before activation. Have Arad configure it as part of CONTRIBUTING.md. |
| **Q2** | Review/merge flow with 2 humans | Arad → Write (not Admin)? Both as CODEOWNERS → require both or one? Formal Approving Review now that author ≠ approver? | Q2a: Move Admin → Write once CODEOWNERS PRs merge. Q2b: One-of-both on most paths; both-required on safety-critical. Q2c: Human-to-human Approving Review works today (self-approval block only affects agents). |
| **Q3** | Architectural-dispute resolution | §11.1 says escalate to CEO. Via Discord #handoffs? Decision Record? | Decision Record in `docs/decisions/DR-NNN-...` authored by whichever side opens dispute; CEO ratifies. Discussion surface = PR comments on the DR PR. |
| **Q4** | Safety-critical path gate | `engine/gates/`, `engine/ibkr/`, `db/migrations/` are CEO-only. What if Arad touches adjacent code? | Explicit doc contract in `engine/gates/README.md` listing upstream inputs + invariants. Any PR changing those inputs must cite the contract in its body. |
| **Q5** | Emergency-direct-merge exception | §1.2 mythos-ops 24h ops patch authority. Arad gets this, or CEO-only? | CEO-only. Arad can open the follow-up PR but direct-merge authority requires operator accountability. |

> **Source:** `docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md` §6.1 (decisions) and §6.2 (recommended answers).

---

## Phase 2 Readiness Topics (PR #79 Coverage)

The current PR (#79) addresses four Phase 2 readiness topics. The table below maps each topic to its resolution document. These are **not** the same as Q1–Q5 above.

| # | Topic | Status | Resolved by |
|---|-------|--------|-------------|
| **Topic 1** | Are agents correctly configured, versioned, and auditable? | Resolved (this PR) | `docs/superpowers/specs/2026-04-21-agent-config-governance.md` |
| **Topic 2** | Is the AI Director proven and ready to operate autonomously? | Resolved (this PR) | `docs/plans/2026-04-21-director-validation-plan.md` |
| **Topic 3** | Do we have a PM system that scales to two dev teams? | Resolved (this PR) | `docs/superpowers/specs/2026-04-21-pm-system-selection.md` |
| **Topic 5** | Do we have documentation for `@aradSmith` to get productive? | **This document** — roadmap for producing that documentation | `docs/plans/2026-04-21-human-onboarding-docs-roadmap.md` |

> **Note on numbering:** The CEO's numbering skipped 4; "Topic 5" is preserved here to match the deliverable filename.

### Topic 5 — Partial Gap Note (DR-001/DR-002)

**Resolved so far:**
- DR-001 (merged PR #60): GitHub Apps identity model defined. Specifies that `limitless-agent[bot]` is the canonical agent author identity and that agent commits must be distinguishable from human commits.
- DR-002 (merged PR #62): NanoClaw source-of-truth and deployment pipeline defined. Specifies versioning, config promotion, and deploy workflow.

**Remaining gap:**
- DR-001 Phase 3 (GitHub App installation tokens replacing CEO PAT) is planned but not yet implemented. Until this is live, agents still push using the CEO PAT, which could confuse `@aradSmith` about commit authorship.
- DR-002 Phases 3–7 (GitHub Actions deploy pipeline, VPS migration) are planned but not yet implemented.

**Implication for onboarding gating:** `@aradSmith` may be granted reviewer access (read-only PR review) immediately after this PR merges. Write access is gated on PR-ONB-001 + PR-ONB-002 + PR-ONB-003 merging **and** DR-001 Phase 3 being deployed. See §Gating @aradSmith Access below.

---

## CEO Decisions Required Before PR-ONB-002/003 Can Be Filed

PR-ONB-002 (CONTRIBUTING.md) and PR-ONB-003 (Ways of Working guide) cover signed-commits setup, permission model, architectural-dispute resolution, safety-critical path gate, and emergency-merge rules. **These documents cannot be written without knowing the CEO's confirmed answers to Q1–Q5.**

The recommended answers below are Director proposals from the Phase 2 Readiness Report §6.2. Each requires formal CEO affirmation or revision before the relevant onboarding doc can be filed.

| Decision | Recommended Answer (Director proposal) | Status |
|----------|-----------------------------------------|--------|
| **Q1 — Signed-commits:** Require GPG or SSH commit signing before `@aradSmith` activation? | Yes — require GPG or SSH signing. Have Arad configure it as part of CONTRIBUTING.md. | Pending CEO confirmation |
| **Q2a — Permissions:** Move `@aradSmith` from Admin → Write once CODEOWNERS PRs merge? | Yes — Write, not Admin. | Pending CEO confirmation |
| **Q2b — CODEOWNERS approval:** One-of-both reviewers sufficient on most paths; both-required on safety-critical paths? | Yes — one-of-both generally; both-required for safety-critical. | Pending CEO confirmation |
| **Q2c — Approving Review:** Human-to-human Approving Review works today (self-approval block affects agents only)? | Yes — no change needed today. | Pending CEO confirmation |
| **Q3 — Dispute resolution:** Architectural disputes escalated via Decision Record in `docs/decisions/DR-NNN-...`; CEO ratifies; discussion surface = PR comments on the DR PR? | Yes — Decision Record workflow. | Pending CEO confirmation |
| **Q4 — Safety-critical gate:** Explicit doc contract in `engine/gates/README.md`; any PR changing upstream inputs must cite the contract? | Yes — doc contract required. | Pending CEO confirmation |
| **Q5 — Emergency direct-merge:** CEO-only; `@aradSmith` can open follow-up PR but not direct-merge? | Yes — CEO-only direct-merge authority. | Pending CEO confirmation |

---

## Recommended Document Location

Before defining the PR sequence, a note on where onboarding docs should live:

| Priority | Location | Rationale |
|----------|----------|-----------|
| P0 docs | Repo root (`README.md`, `CONTRIBUTING.md`) and `docs/` root | GitHub renders `README.md` automatically on the repo landing page. Contributors see it without any navigation. |
| P1/P2 docs | `docs/` root | Visible in the GitHub "Code" tab under `docs/`. Does not require knowing about internal tooling paths. |
| Internal specs | `docs/superpowers/specs/` | Correct home for division-internal tooling specs and design decisions. Not a first stop for new contributors. |

**Rationale — avoid burying orientation docs in `docs/superpowers/`:** The `docs/superpowers/specs/` tree is the right place for internal design decisions, readiness assessments, and agentic SDLC governance. It is not discoverable by a new contributor landing on the repo for the first time. P0 and P1 onboarding docs must live at the repo root or `docs/` root so contributors can find them without a guide to the guide.

---

## Reading Order for New Contributors

### Day 1 — Must-Read Before First PR (~60 min total)

These five documents give a new contributor everything they need to open a correct PR on day one.

| # | Document | Why it matters |
|---|----------|----------------|
| 1 | `README.md` | Repo overview, tech stack, how to run locally, how to contribute. The first thing GitHub shows. |
| 2 | `CONTRIBUTING.md` | PR workflow, commit conventions, branch naming, how to work alongside agent PRs. Required reading before opening any PR. |
| 3 | `docs/superpowers/specs/2026-04-18-agentic-sdlc-governance.md` | The governance spec: tiers, review cadence, §5 ratification flow, §6 conventions. Explains why the repo works the way it does. |
| 4 | `docs/decisions/DR-001-agent-identity-and-ratification-flow.md` | Who commits code (agents vs. humans), why `limitless-agent[bot]` appears as commit author, and the ratification flow for agent PRs. Prevents confusion about authorship. |
| 5 | `docs/plans/2026-04-21-human-onboarding-docs-roadmap.md` *(this document)* | Understand the division's ways of working, where to find what, and how the PM system and agent collaboration model fit together. |

### Week 1 — Read as Needed

These documents provide the architectural and operational context for productive contribution in the first week.

| # | Document | Why it matters |
|---|----------|----------------|
| 6 | `docs/superpowers/specs/2026-04-05-division-v2-federated-architecture.md` | The three-tier Architect model: how Director, NanoClaw, and CEO relate. Explains the chain of command and decision-making structure. |
| 7 | `docs/superpowers/specs/2026-04-02-nanoclaw-architect-readiness-assessment.md` | How NanoClaw Architects are assessed and configured. Useful context for understanding agent capability and limitations. |
| 8 | `docs/decisions/DR-002-nanoclaw-source-of-truth-and-deployment.md` | NanoClaw versioning and deploy pipeline. Relevant when touching agent config or infra. |
| 9 | `docs/superpowers/specs/2026-04-21-agent-config-governance.md` | How agent configurations are versioned, promoted, and changed. Required reading before requesting any agent config change. |

### Month 1 — Background Reading for Deep Contributors

| # | Document | Why it matters |
|---|----------|----------------|
| 10 | All specs in `docs/superpowers/specs/2026-04-*` | Design decisions and research behind the platform architecture and agentic SDLC. |
| 11 | `docs/plans/` (all documents) | Rollout plans and implementation timelines for current and upcoming work. |
| 12 | `ROADMAP.md` | Strategic Kanban board and current priorities. Understand what the division is building toward. |

---

## PR Sequence Roadmap

This is the core of the document. PRs are ordered by dependency and priority. All P0 PRs must be filed and merged before `@aradSmith` is granted write access.

---

### PR-ONB-001 (P0) — Division README Overhaul

| Field | Value |
|-------|-------|
| **PR Title** | `docs: division README — human contributor orientation` |
| **Target Path(s)** | `README.md` (update existing); `docs/DIVISION.md` (new, optional overflow) |
| **Priority** | P0 — blocks day-1 onboarding |
| **Owner** | Director (human) drafts; Architect reviews |
| **Effort** | M |
| **Dependencies** | None — can be filed immediately after this PR merges |

**Content summary:**

The current `README.md` is assumed to be minimal or developer-focused. This PR rewrites it as a human contributor orientation document covering:

- What is LIMITLESS Longevity OS — the product vision in two paragraphs
- What this monorepo contains — apps/, packages/, infra/, docs/ explained
- Per-app overview table: PATHS, Cubes+, HUB, DT, OS Dashboard — one-line description, tech stack, local port
- How to run locally — prerequisites (Node, pnpm, Docker), workspace bootstrap command, per-app dev commands
- How to contribute — three-sentence summary linking to `CONTRIBUTING.md` and `docs/WAYS-OF-WORKING.md`
- Health endpoints — all five, for quick smoke-testing
- Links to Day 1 reading list (this roadmap)

If `README.md` becomes too long, overflow architectural detail into `docs/DIVISION.md` and link from the README.

---

### PR-ONB-002 (P0) — CONTRIBUTING.md Refresh

| Field | Value |
|-------|-------|
| **PR Title** | `docs: refresh CONTRIBUTING.md for agentic division` |
| **Target Path(s)** | `CONTRIBUTING.md` |
| **Priority** | P0 — blocks day-1 onboarding |
| **Owner** | Director (human) drafts; Architect reviews |
| **Effort** | S |
| **Dependencies** | DR-001 merged (done — PR #60); governance spec merged (done); **CEO answers to Q1–Q5 required** (signed-commits policy, permission model, safety-critical gate, emergency-merge rules — see §CEO Decisions Required above) |

**Content summary:**

The existing `CONTRIBUTING.md` may predate the agentic SDLC. This PR refreshes it to reflect current practice:

- **Branch naming conventions**: `feat/`, `fix/`, `chore/`, `docs/` prefixes; kebab-case slugs; include ticket/DR number where applicable
- **Commit conventions**: Conventional Commits format (`type(scope): description`); when to use `!` for breaking changes; co-authorship attribution for agent-assisted work
- **Signed-commits setup** (Q1): GPG or SSH signing configuration for `@aradSmith` — content depends on CEO confirmation of Q1
- **PR workflow**: DRAFT → ready-for-review → ratification → merge; what each stage means; who can move a PR between stages
- **Working alongside agent PRs**: Agents push to their own branches; humans review agent PRs on the same bar as human PRs — no rubber-stamping; how to leave review comments on agent PRs
- **Governance tiers quick-reference**: Tier 0 (CEO only), Tier 1 (Director + CEO), Tier 2 (Architect-proposed, Director-ratified), Tier 3 (routine agent work)
- **CODEOWNERS approval model** (Q2): One-of-both vs. both-required — content depends on CEO confirmation of Q2
- **Safety-critical path gate** (Q4): Which paths require the doc-contract citation — content depends on CEO confirmation of Q4
- **What `limitless-agent[bot]` commits mean**: The bot identity, when it appears, what it implies about authorship and review responsibility
- **Squash merge policy**: All PRs squash-merged to main; commit message = PR title

> **Filing gate:** This PR cannot be filed until the CEO has formally confirmed or revised answers to Q1, Q2, and Q4. See §CEO Decisions Required above.

---

### PR-ONB-003 (P0) — Ways of Working Guide

| Field | Value |
|-------|-------|
| **PR Title** | `docs: ways-of-working guide for human collaborators` |
| **Target Path(s)** | `docs/WAYS-OF-WORKING.md` (new) |
| **Priority** | P0 — blocks day-1 onboarding |
| **Owner** | Architect drafts |
| **Effort** | M |
| **Dependencies** | Governance spec merged (done); DR-001 merged (done — PR #60); **CEO answers to Q1–Q5 required** (dispute resolution workflow, emergency-merge authority, permission model — see §CEO Decisions Required above) |

**Content summary:**

This is the operational field guide for human contributors. It answers: "How does work actually happen here?"

- **How decisions are made**: The spec → DR → PR flow. When a decision needs a DR. When a spec suffices. Who ratifies each tier.
- **Architectural-dispute resolution** (Q3): Decision Record workflow — content depends on CEO confirmation of Q3
- **Discord channel guide**:
  - `#main-ops` — Architect status updates, daily briefings, session summaries. Read to stay informed; post only if you are the Architect.
  - `#workbench-ops` — Specialist engineer (NanoClaw) updates. Read to track in-flight work.
  - `#handoffs` — Structured task handoffs. How to read a handoff. What the required fields mean.
  - `#alerts` — Urgent escalations and health check failures. If you see an unresolved alert, escalate to `#human`.
  - `#human` — Director commands and CEO approvals. Human-to-AI commands go here. This is where you submit feature requests and escalate blockers.
- **How to read a handoff**: Handoff schema fields explained (From, To, Priority, Repo, Context, Tasks, Verify, PR Naming). How to tell if a handoff is blocked.
- **How to submit a feature request**: Post to `#human` with: what you want, why, which app/service it affects, urgency. Director will decompose into tasks and file handoffs.
- **How to escalate a blocker**: Post to `#alerts` if it is a service health issue. Post to `#human` if it requires Director or CEO decision. Do not let blockers sit silently.
- **Emergency direct-merge authority** (Q5): Who holds ops-patch authority — content depends on CEO confirmation of Q5
- **How agent PRs get ratified (§5 flow)**: Architect proposes → Director reviews → CEO ratifies and merges. Human contributors review on the same bar as any other PR.
- **MiFID II audit trail note**: Why the division maintains structured commit history, decision records, and Discord logs. Regulatory context for financial services AI tooling.

> **Filing gate:** This PR cannot be filed until the CEO has formally confirmed or revised answers to Q3 and Q5 (dispute resolution and emergency-merge authority). See §CEO Decisions Required above.

---

### PR-ONB-004 (P1) — App Architecture Overview

| Field | Value |
|-------|-------|
| **PR Title** | `docs: app architecture overview — all five services` |
| **Target Path(s)** | `docs/ARCHITECTURE.md` (new) |
| **Priority** | P1 — week 1 reading |
| **Owner** | Architect (can be generated from existing design specs) |
| **Effort** | L |
| **Dependencies** | None — can be filed in parallel with P0 PRs; must be merged before end of week 1 |

**Content summary:**

A single-document architectural reference for all five services and shared infrastructure:

- **PATHS** (`apps/paths/`): Payload CMS + Next.js. Purpose: learning content delivery. Database: Postgres via Payload. Key packages: `packages/auth`, `packages/api-client`. Health endpoint: `https://app.limitless-longevity.health/learn/api/health`.
- **Cubes+** (`apps/cubes/`): Next.js + Prisma 7. Purpose: training programming and workout scheduling. Health endpoint: `https://app.limitless-longevity.health/train/api/v1/domains` (returns 401 — auth required).
- **HUB** (`apps/hub/`): Next.js + Prisma. Purpose: booking and scheduling hub. Health endpoint: `https://app.limitless-longevity.health/book/api/health`.
- **Digital Twin (DT)** (`apps/digital-twin/`): Fastify + Drizzle. Purpose: longitudinal health data and biomarker tracking. Health endpoint: `https://limitless-digital-twin.onrender.com/api/health`.
- **OS Dashboard** (`apps/os-dashboard/`): Cloudflare Pages. Purpose: executive dashboard and platform overview. Health endpoint: `https://app.limitless-longevity.health/`.
- **Shared packages** (`packages/`): shared types, auth, api-client — what each exports and which apps consume it.
- **Service communication**: How apps call each other (if at all); gateway worker role (`infra/`); Cloudflare as edge layer.
- **Local dev setup per app**: Prerequisites, env vars, dev command, expected output.
- **Turborepo workspace**: How `turbo run dev` works across the monorepo; filter flags for running a single app.

---

### PR-ONB-005 (P1) — Agent Interaction Guide

| Field | Value |
|-------|-------|
| **PR Title** | `docs: how to work with AI agents — contributor guide` |
| **Target Path(s)** | `docs/AGENT-INTERACTION.md` (new) |
| **Priority** | P1 — week 1 reading |
| **Owner** | Director (human) drafts — requires human perspective on agent collaboration |
| **Effort** | M |
| **Dependencies** | DR-001 merged (done — PR #60); governance spec merged (done); `docs/superpowers/specs/2026-04-21-agent-config-governance.md` merged (this PR) |

**Content summary:**

This guide answers the question new contributors most often get wrong: "How is working with AI agents different from working with human teammates?"

- **What agents can do**: Generate code, draft PRs, write specs, run health checks, post briefings, decompose tasks, review PRs analytically.
- **What agents cannot do**: Make product decisions unilaterally, merge to main, override CEO/Director, access production data directly, act outside their configured scope.
- **How to read an agent-authored PR**: Look at the PR description (Architect always includes context, tasks, verify steps). Read the diff the same way you would for any PR. Check that the verify steps pass. Do not approve based on description alone.
- **Reviewing agent code — same bar, no exceptions**: The governance spec is explicit — agent PRs get the same review standard as human PRs. No rubber-stamping. If the code is wrong, leave a review comment. Agents respond to review feedback.
- **How to request agent work**: Post to `#human` with a clear task description. The Director will decompose and file a handoff to the appropriate Architect. Do not @ the Architect directly in Discord — work through the Director.
- **What `Co-Authored-By: Claude` means**: Present when a human used Claude Code interactively to generate a commit. Distinct from `limitless-agent[bot]` (autonomous agent commit). Both are valid; context differs.
- **When to override an agent decision**: If an agent proposes something that conflicts with product direction, governance, or security posture, post to `#human` with the specific concern. Do not silently revert agent work — create a DR or spec if the disagreement is architectural.
- **Agent error patterns to watch for**: Hallucinated file paths; stale context (agent references a spec that has since been superseded); scope creep (agent does more than the handoff asked); over-confidence in health check results.

---

### PR-ONB-006 (P2) — Glossary and Acronym Guide

| Field | Value |
|-------|-------|
| **PR Title** | `docs: division glossary — terms and acronyms` |
| **Target Path(s)** | `docs/GLOSSARY.md` (new) |
| **Priority** | P2 — month 1 background reading |
| **Owner** | Architect |
| **Effort** | S |
| **Dependencies** | None — can be filed at any time; no blockers |

**Content summary:**

A single alphabetically-ordered glossary of division-specific terms, acronyms, and concepts. Entries include:

- **Architect**: The top-tier AI agent (NanoClaw instance) responsible for cross-repo planning and task decomposition. Currently: the agent authoring this document.
- **CEO**: The human principal at the top of the governance hierarchy. Sole merge authority for `main`.
- **Co-Authored-By: Claude**: Git trailer indicating a human used Claude Code interactively to produce a commit. Distinct from autonomous agent commits.
- **Cubes+**: The training programming and workout scheduling app (`apps/cubes/`).
- **Director**: Human engineering lead. Reviews Architect-proposed specs and DRs; escalates to CEO.
- **DR (Decision Record)**: A formal architectural decision document in `docs/decisions/`. Numbered sequentially (DR-001, DR-002, …). Requires CEO ratification to take effect.
- **DR-CFG**: Decision Record sub-type for configuration governance decisions.
- **DT (Digital Twin)**: The longitudinal health data service (`apps/digital-twin/`).
- **Handoff**: A structured task assignment posted to `#handoffs`. Required fields: From, To, Priority, Repo, Context, Tasks, Verify, PR Naming.
- **HUB**: The booking and scheduling hub app (`apps/hub/`).
- **IPC**: Inter-process communication. Used in NanoClaw agent-to-agent messaging context.
- **JID**: Job ID. Identifier for a NanoClaw scheduled or queued task.
- **limitless-agent[bot]**: The GitHub identity used by autonomous agents when committing code. Distinct from human committers.
- **MiFID II**: EU financial regulation. Relevant because LIMITLESS serves a regulated financial services context; audit trails and decision records are partly driven by compliance requirements.
- **NanoClaw**: The Architect-tier AI agent framework. NanoClaw instances are configured, versioned, and deployed per DR-002.
- **OneCLI**: The unified CLI tooling for the LIMITLESS platform.
- **OpenClaw**: The open-source agent framework underlying NanoClaw.
- **OS Dashboard**: The executive dashboard Cloudflare Pages app (`apps/os-dashboard/`).
- **PATHS**: The learning content delivery app (`apps/paths/`), built on Payload CMS + Next.js.
- **Ratification**: The CEO's formal approval of a DR or Tier 0/1 governance decision. Required before the decision takes effect.
- **SDD**: Software Design Document. A design artifact less formal than a DR; does not require CEO ratification.
- **Squash merge**: The merge strategy used for all PRs into `main`. The squash commit message equals the PR title.
- **TRUSTED_BOT_IDS**: The allowlist of GitHub App/bot identities permitted to commit to the monorepo as agents.

---

## Gating @aradSmith Access

### Reviewer Access (Read-Only PR Review)

**Available immediately** after this PR merges. `@aradSmith` can:
- Review open PRs and leave comments
- Read all documentation
- Join Discord channels (#main-ops, #workbench-ops as read-only; #handoffs read-only; #alerts read-only; #human with Director invite)

No prerequisites beyond this PR merging.

### Write Access (Ability to Open and Push PRs)

**Gate conditions — all must be satisfied:**

| # | Gate | Status |
|---|------|--------|
| 1 | PR-ONB-001 merged (`README.md` overhaul) | Not yet — pending this roadmap ratification |
| 2 | PR-ONB-002 merged (`CONTRIBUTING.md` refresh) | Not yet — pending CEO Q1/Q2/Q4 confirmation and this roadmap ratification |
| 3 | PR-ONB-003 merged (`docs/WAYS-OF-WORKING.md`) | Not yet — pending CEO Q3/Q5 confirmation and this roadmap ratification |
| 4 | DR-001 Phase 3 deployed (GitHub App installation tokens replacing CEO PAT) | Not yet — planned, not implemented |

**Why Gate 4 matters:** Until DR-001 Phase 3 is live, agents commit using the CEO PAT. This means `@aradSmith` cannot easily distinguish agent commits from CEO commits by GitHub identity alone. Granting write access before this is resolved creates authorship confusion and potential for mis-attribution. Once GitHub App tokens are live, `limitless-agent[bot]` appears unambiguously as the agent identity, and `@aradSmith`'s commits are cleanly attributable to their GitHub account.

### Merge Authority

`@aradSmith` has **no merge authority to `main`** at any access level. Per the governance spec:
- Merging to `main` is CEO-only.
- PRs are squash-merged by the CEO after ratification.
- This applies equally to human and agent PRs.

`@aradSmith` may be granted merge authority on non-`main` branches (e.g., feature branches, release branches) at the Director's discretion.

---

## Summary Table

| PR | Title | Path | Priority | Owner | Effort | Dependencies | Topic-Ref |
|----|-------|------|----------|-------|--------|--------------|-----------|
| PR-ONB-001 | Division README overhaul | `README.md` | P0 | Director/Architect | M | None | Topic 5 |
| PR-ONB-002 | CONTRIBUTING.md refresh | `CONTRIBUTING.md` | P0 | Director/Architect | S | DR-001 (done); **CEO Q1, Q2, Q4** | Topic 5, Q1, Q2, Q4 |
| PR-ONB-003 | Ways of Working guide | `docs/WAYS-OF-WORKING.md` | P0 | Architect | M | Governance spec (done), DR-001 (done); **CEO Q3, Q5** | Topic 5, Q3, Q5 |
| PR-ONB-004 | App architecture overview | `docs/ARCHITECTURE.md` | P1 | Architect | L | None | Topic 5 |
| PR-ONB-005 | Agent interaction guide | `docs/AGENT-INTERACTION.md` | P1 | Director | M | DR-001 (done), agent config spec (this PR) | Topic 5, Q1 |
| PR-ONB-006 | Glossary and acronym guide | `docs/GLOSSARY.md` | P2 | Architect | S | None | Topic 5 |

---

## Next Steps

1. **This PR merges** → `@aradSmith` reviewer access granted immediately.
2. **CEO confirms or revises Q1–Q5** → Unblocks PR-ONB-002 and PR-ONB-003 (see §CEO Decisions Required above).
3. **Director files PR-ONB-001** → Target: within 5 business days of this PR merging (no CEO decisions required).
4. **Director files PR-ONB-002, PR-ONB-003** → Target: within 5 business days of CEO Q1–Q5 confirmation.
5. **Architect files PR-ONB-004, PR-ONB-006** → Target: within 10 business days (no CEO decisions required).
6. **Director files PR-ONB-005** → Target: within 10 business days (requires human perspective).
7. **DR-001 Phase 3 deployed** → Write access granted to `@aradSmith`.
8. **All P0 PRs merged** → Onboarding session scheduled with `@aradSmith`.

---

*This document is part of the Phase 2 Readiness PR addressing Topics 1, 2, 3, and 5. It was authored by the Architect and is proposed for CEO ratification. Note: the CEO's numbering skipped 4; "Topic 5" is preserved in this deliverable filename to match that numbering.*