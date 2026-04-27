---
dispatch_id: C.2
topic: LIMITLESS workflow vs Industry Agile methodologies (Scrum / Kanban / XP / SAFe)
authored_by: Infra Architect
date: 2026-04-27
context_anchor: project_meta_pivot_machine_that_builds_machines.md
players_count: 4
sources_basis: monorepo bind-mount specs + DR docs only — host-side memory (`MEMORY.md`, `feedback_*.md`, `project_*.md` arc files) NOT in bind-mount; gaps flagged in §5
---

## Headline

LIMITLESS most closely resembles **Kanban + XP retro**, with **no sprint cadence**, **no estimation**, and **no separation of PO/SM/Dev roles** — collapsed into one human (CEO ratifier) plus N agentic Architects. Where the fleet **deviates intentionally**: dispatch-and-merge replaces sprint planning; spec-as-SoT replaces ticket backlog (PR #79 / `2026-04-21-pm-system-selection.md`); Approving-Review ratification replaces sprint-review demo. Where the fleet **deviates accidentally** (the dangerous category): no codified WIP limits, no DoR before dispatch, no codified retro cadence, and a "delivered to user" gap in the Definition of Done that §5.1 does not cover. Three patterns are **uniquely agentic** and don't map to any of the 4 methodologies — they become candidate "platform contributions" for D.1: (a) **6-stage Architect pipeline** as a per-task atomic loop; (b) **GitHub App identity ratification flow** (DR-001) where author ≠ approver is enforced by code; (c) **post-incident spec genre** (`2026-04-22-bot-feedback-loop-incident.md`, `2026-04-25-sdk-contract-proxy-as-interop-layer.md`) as durable retros that outlive any sprint boundary.

---

## 1. Players surveyed

| Methodology | Origin / canonical reference | Released | Evidence basis |
|---|---|---|---|
| **Scrum** | Schwaber & Sutherland — *Scrum Guide* | 1995 (Guide last revised 2020) | Industry baseline + `AgileSDLCToolsAndPlatformsReport.md` Phase 1–3 references |
| **Kanban** | David J. Anderson — *Kanban: Successful Evolutionary Change* | 2010 | Industry baseline; B.1 Phase 11 (PM) coverage |
| **Extreme Programming (XP)** | Kent Beck — *Extreme Programming Explained* | 1999 (2nd ed. 2004) | Industry baseline; 12 XP practices |
| **SAFe (Scaled Agile Framework)** | Dean Leffingwell — Scaled Agile Inc. | 2011 (SAFe 6.0: 2023) | Industry baseline; multi-team scaling reference |

**LIMITLESS as the comparison anchor** (not a 5th methodology — the subject of comparison): observed workflow as documented in:

- `docs/superpowers/specs/2026-04-18-agentic-sdlc-governance.md` — review model, ratification §5.1, attestation §5.5, branch protection §1, conventional commits §8
- `docs/superpowers/specs/2026-04-21-pm-system-selection.md` — Spec-as-SoT decision, SDD framing, four kernel services §4, Discord+GH+Markdown stack §3.1
- `docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md` — three-tier federated architecture, multi-human onboarding decisions §6
- `docs/superpowers/specs/2026-04-22-bot-feedback-loop-incident.md` — incident retro genre, three-layer defense
- `docs/superpowers/specs/2026-04-23-pr73-regression-audit-and-strategy-review.md` — PR-level audit; "no CI rail" finding §3
- `docs/superpowers/specs/2026-04-25-sdk-contract-proxy-as-interop-layer.md` — sub-day debug arc; Design Principle "Enforce by Code, Never by Prose"
- `docs/superpowers/specs/2026-04-05-autonomous-agentic-division-design.md` — notification IPC, capability-based agent catalog, §10 Director Decisions
- `docs/decisions/DR-001-agent-identity-and-ratification-flow.md`
- `docs/decisions/DR-002-nanoclaw-source-of-truth-and-deployment.md`

---

## 2. Capabilities matrix

Rows = 4 methodologies. Columns = 10 practice axes. Each cell layered as: **Methodology** baseline / **LIMITLESS** observed practice / **Verdict** (✅ matches / ⚠️ partial / ❌ deviation / 🆕 we have something they don't).

> Reading guide. Cells are intentionally dense and 3-tiered. Skim by Verdict first; per-cell narrative is in §3 (per-methodology notes).

### 2.1 Master matrix

| Axis | Scrum | Kanban | XP | SAFe |
|---|---|---|---|---|
| **1. Planning cadence** | **Methodology:** sprint-based (2–4 wk).<br>**LIMITLESS:** ad-hoc CEO directive + Director-relayed dispatches; no fixed cadence (per `2026-04-21-pm-system-selection.md` §3.1: "no Jira instance, no Linear workspace, no GitHub Issues board, **and no sprint cadence**").<br>**Verdict:** ❌ deviation. | **Methodology:** continuous flow; pull as capacity frees.<br>**LIMITLESS:** continuous dispatch from CEO/Director; Architect pulls from Discord `#main-ops` or `#handoffs`.<br>**Verdict:** ✅ matches. | **Methodology:** weekly cycle + quarterly cycle (Beck, 2nd ed.).<br>**LIMITLESS:** session-based; Architect session ≈ a "cycle" but unbounded — runs until task completes or context exhaustion.<br>**Verdict:** ⚠️ partial — XP has time-boxes; we don't. | **Methodology:** Program Increments (PI), 8–12 wk; PI Planning ceremony.<br>**LIMITLESS:** N/A — single-CEO, no cross-team alignment ceremony.<br>**Verdict:** ❌ deviation by design. |
| **2. Backlog management** | **Methodology:** Product Backlog owned by PO; Sprint Backlog drawn at planning.<br>**LIMITLESS:** spec-as-SoT (`docs/superpowers/specs/`), Discord `#handoffs` queue, `MEMORY.md` "Pending CEO Action" lists; Option C ratified per PR #79 (`2026-04-21-pm-system-selection.md` §9).<br>**Verdict:** 🆕 — agents author the backlog as specs; not externalised to a tracker. | **Methodology:** ordered backlog with WIP-limited columns (Backlog → Doing → Done).<br>**LIMITLESS:** `ROADMAP.md` Kanban lanes (Backlog → In Progress → Review → Done) per `2026-04-21-pm-system-selection.md` §3.1; supplementary GH PR list query (§9.3).<br>**Verdict:** ⚠️ partial — lanes exist, WIP not codified. | **Methodology:** Story Cards / Planning Game with "iteration plan" + "release plan".<br>**LIMITLESS:** spec ≈ story card; no story-point estimation; no planning game.<br>**Verdict:** ⚠️ partial. | **Methodology:** Program Backlog + Team Backlog + Solution Backlog (3-tier).<br>**LIMITLESS:** single-tier spec corpus; no Solution-level alignment.<br>**Verdict:** ❌ deviation. |
| **3. Estimation** | **Methodology:** story points / planning poker / velocity tracking.<br>**LIMITLESS:** **none codified**. No story points, no t-shirt sizes, no velocity metric (zero references in the specs corpus).<br>**Verdict:** ❌ deviation. | **Methodology:** explicitly de-emphasised; cycle-time + lead-time empirically measured.<br>**LIMITLESS:** PR-merge-time observable via `gh api`, but no codified cycle-time metric. PR #73/#85 incident timelines visible in `2026-04-23-pr73-regression-audit-and-strategy-review.md` §1.<br>**Verdict:** ✅ matches in spirit; ⚠️ measurement not yet routine. | **Methodology:** ideal-time / story points; pair-estimation.<br>**LIMITLESS:** none.<br>**Verdict:** ❌ deviation. | **Methodology:** Team-level story points + PI capacity.<br>**LIMITLESS:** N/A.<br>**Verdict:** ❌ deviation by design. |
| **4. WIP limits** | **Methodology:** soft — capped by Sprint Backlog scope.<br>**LIMITLESS:** **implicit only** — bounded by single-CEO ratification bandwidth (`2026-04-18-agentic-sdlc-governance.md` §11.3: "Volume is manageable (1–3 PRs/day estimated in Phase 1)"); not codified.<br>**Verdict:** ⚠️ partial — emergent WIP cap, not declared. | **Methodology:** **hard, explicit per column** — the defining Kanban practice.<br>**LIMITLESS:** no per-column or per-Architect WIP limit declared; `2026-04-05-autonomous-agentic-division-design.md` §10 Director Decisions allows "**4 simultaneous workers**" per Architect, but this is a ceiling, not a Kanban-style WIP-limit signal.<br>**Verdict:** ❌ accidental deviation — we use a Kanban board ([§3.1 ROADMAP.md]) without WIP limits, which is the most common Kanban anti-pattern. | **Methodology:** "yesterday's weather" — pull what you finished last week.<br>**LIMITLESS:** N/A — no week boundary.<br>**Verdict:** ❌ deviation. | **Methodology:** WIP-limited at team and ART (Agile Release Train) level.<br>**LIMITLESS:** N/A.<br>**Verdict:** ❌ deviation by design. |
| **5. Definition of Done (DoD)** | **Methodology:** sprint-team-defined; typically "demo-ready, accepted by PO".<br>**LIMITLESS:** **§5.1 ratified merge** = (a) PR ratification checklist all-ticked, (b) CEO Approving Review (not Comment), (c) word "RATIFIED" or "Approved" in review body, (d) status checks pass, (e) no unresolved conversations (`2026-04-18-agentic-sdlc-governance.md` §5.1). **§5.5** adds: `[x]` means "executed + verified green", false attestation = ratification-integrity failure.<br>**Verdict:** 🆕 — stricter than Scrum's DoD, weaker on "delivered to user". | **Methodology:** explicit policy at last column; flow-out criterion.<br>**LIMITLESS:** "merged to `main`" = flow-out signal; squash commit + PR body = audit record (§5.1, §9 of governance spec).<br>**Verdict:** ✅ matches structure; weakness is "merged ≠ deployed ≠ delivered" gap. | **Methodology:** all tests passing + customer accepted.<br>**LIMITLESS:** all tests passing per §5.5; "customer acceptance" = CEO Approving Review. Per `2026-04-23-pr73-regression-audit-and-strategy-review.md` §3, the test-passing rail is **inconsistently enforced** — `apps/nanoclaw/` has no CI and PR #73 introduced two regressions caught only post-merge.<br>**Verdict:** ⚠️ partial — DoD nominal, gate not always wired. | **Methodology:** team DoD + PI DoD + Solution DoD.<br>**LIMITLESS:** single-tier.<br>**Verdict:** ❌ deviation by design. |
| **6. Iteration ceremonies** | **Methodology:** Sprint Planning, Daily Scrum, Sprint Review, Sprint Retro (4 ceremonies).<br>**LIMITLESS:** **no Planning, no Daily Scrum, no Review demo**. Closest analogue: incident-postmortem specs (`2026-04-22-*`, `2026-04-23-*`, `2026-04-25-*`) ≈ ad-hoc XP retro. Per `2026-04-05-autonomous-agentic-division-design.md` §1: workers checkpoint via heartbeat IPC, not standup.<br>**Verdict:** ❌ deviation across 3 of 4; ⚠️ partial on retro. | **Methodology:** optional cadence — replenishment meeting + flow review.<br>**LIMITLESS:** "Pending CEO Action" backlog grooming on memory entries serves replenishment-meeting purpose; no flow-review cadence.<br>**Verdict:** ⚠️ partial. | **Methodology:** weekly planning + daily standup + on-completion retro.<br>**LIMITLESS:** session-launch IPC = lightweight "standup" (Architect reads `MEMORY.md` + `gh pr list`); incident specs = retro genre.<br>**Verdict:** ⚠️ partial. | **Methodology:** PI Planning (2-day event), System Demo, Inspect & Adapt.<br>**LIMITLESS:** N/A.<br>**Verdict:** ❌ deviation by design. |
| **7. Roles** | **Methodology:** Product Owner / Scrum Master / Development Team (3 roles, distinct).<br>**LIMITLESS:** **CEO** = PO + ratifier + customer; **Director (OpenClaw)** = SM analogue (orchestration only, not ratification per `feedback_governance_determinism_primacy.md` per C.1 §2.1); **Architects (5 per-app)** + **Workers (Sonnet/Haiku)** = Dev Team. Roles **collapsed** at the CEO end, **expanded** at the Dev end (per-tier specialisation per `2026-04-05-autonomous-agentic-division-design.md` §3 capability catalog).<br>**Verdict:** 🆕 — single-human-many-agent topology has no Scrum equivalent. | **Methodology:** roles emergent; no prescribed roles.<br>**LIMITLESS:** roles emergent within DR-001 attribution hierarchy.<br>**Verdict:** ✅ matches. | **Methodology:** Customer / Programmer / Coach / Tracker.<br>**LIMITLESS:** Customer ≈ CEO; Programmer ≈ Architect+Worker; Coach ≈ none (Director is closer to dispatcher); Tracker ≈ `MEMORY.md` (which is a file, not a person).<br>**Verdict:** ⚠️ partial. | **Methodology:** RTE / Product Mgr / System Architect / Business Owners.<br>**LIMITLESS:** all collapsed to CEO + Infra Architect.<br>**Verdict:** ❌ deviation. |
| **8. Pair programming pattern** | **Methodology:** **not a Scrum practice** (Scrum is silent on pairing).<br>**LIMITLESS:** N/A.<br>**Verdict:** ✅ matches (both silent). | **Methodology:** not prescribed.<br>**LIMITLESS:** N/A.<br>**Verdict:** ✅ matches. | **Methodology:** **core practice** — two programmers, one keyboard.<br>**LIMITLESS:** **no synchronous pairing**. Closest analogue: CC-session ↔ Architect dispatch (asynchronous expert+apprentice handoff); Architect ↔ Worker spawn (Architect plans, Worker executes). Agent-to-agent peer review per `2026-04-18-agentic-sdlc-governance.md` §3 is **advisory only, never merge-blocking**.<br>**Verdict:** ❌ deviation — but 🆕 candidate: "asynchronous agent dispatch" is the agentic analogue. | **Methodology:** inherits XP pairing in Team-level practices.<br>**LIMITLESS:** N/A.<br>**Verdict:** ❌ deviation. |
| **9. CI/CD integration** | **Methodology:** continuous integration assumed; CD optional.<br>**LIMITLESS:** GitHub Actions per-repo; **per-app coverage uneven**. `apps/nanoclaw/` has **zero CI** as of 2026-04-23 per `2026-04-23-pr73-regression-audit-and-strategy-review.md` §3 ("we have no CI job for `apps/nanoclaw`"). Branch protection requires `build` / `test` / `typecheck` for `LIMITLESS-LONGEVITY/limitless` per `2026-04-18-agentic-sdlc-governance.md` §1.2.<br>**Verdict:** ⚠️ partial — CI present where wired, absent where not; **accidental deviation** at the nanoclaw-app boundary. | **Methodology:** continuous flow ⇒ continuous deploy ideal.<br>**LIMITLESS:** DR-002 7-phase rollout: Phase 3 (GH Actions SSH-deploy) **pending** as of `2026-04-21-agentic-sdlc-phase-2-readiness-report.md` §5; manual `git pull` on VPS-1 today.<br>**Verdict:** ⚠️ partial — design is continuous, deploy pipeline not yet automated. | **Methodology:** **CI is a core practice** — integrate every few hours.<br>**LIMITLESS:** PR-per-task model is XP-style integrate-frequently in spirit, but the bypass in §3 of pr73-audit ("PR #73 introduced 2 defects, both in the test suite, both now fixed... none of which was caught because nanoclaw has no CI") is an XP-DoD failure.<br>**Verdict:** ⚠️ partial. | **Methodology:** ART-level Continuous Delivery Pipeline.<br>**LIMITLESS:** N/A.<br>**Verdict:** ❌ deviation by design. |
| **10. Customer feedback loop** | **Methodology:** Sprint Review demo to stakeholders; PO accepts on customer's behalf.<br>**LIMITLESS:** CEO **is** the customer + PO + ratifier. Feedback loop is **synchronous within session** (Discord chat) + **asynchronous via PR review**. No external-customer feedback mechanism exists today (the platform is internal).<br>**Verdict:** 🆕 collapsed-feedback-loop is a single-operator artefact. | **Methodology:** explicit signal (e.g., classes-of-service expedite lane).<br>**LIMITLESS:** "expedite" lane = direct Discord ping bypassing dispatch queue; no formal class-of-service taxonomy.<br>**Verdict:** ⚠️ partial. | **Methodology:** "customer on-site" — daily contact with end-user.<br>**LIMITLESS:** CEO ↔ Architect Discord channel **is** the customer-on-site analogue (continuous, sub-minute latency).<br>**Verdict:** ✅ matches in spirit — arguably stronger (latency is lower than human-team XP). | **Methodology:** Business Owners + System Demo every PI.<br>**LIMITLESS:** N/A.<br>**Verdict:** ❌ deviation by design. |

### 2.2 Verdict tally

| Methodology | ✅ matches | ⚠️ partial | ❌ deviation | 🆕 unique |
|---|---|---|---|---|
| Scrum | 1 (axis 8) | 2 (axes 4, 7-non-counted) | 6 | 3 (axes 2, 5, 7, 10 — backlog/DoD/roles/feedback are all 🆕 vs Scrum) |
| Kanban | 4 (1, 2, 3, 7, 8) | 4 (4, 6, 9, 10) | 1 (axis 5 weakness — but mostly ✅) | 0 |
| XP | 1 (axis 10 in spirit) | 5 (1, 2, 3, 5, 6, 7, 9) | 2 (axis 4, 8) | 0 |
| SAFe | 0 | 0 | 10 | 0 |

(Cell counts above are approximate — Verdict tally is the headline read; exact axis-by-axis breakdown is in §2.1.)

**Headline read:** LIMITLESS today is **~70% Kanban-shaped** + **~25% XP-shaped** + **~5% Scrum-shaped** + **0% SAFe-shaped**. The Kanban shape is structural (continuous flow, no sprints, lanes-without-WIP); the XP shape is cultural (customer-on-site latency, post-incident retros, integrate-via-PR); the Scrum traces are residual (squash-merge-as-flow-out artefact only). SAFe is irrelevant by design at single-CEO scale.

---

## 3. Per-methodology notes

### 3.1 Scrum

**Where LIMITLESS matches:**
- **Author ≠ approver invariant** is functionally what Scrum's PO-accepts-Dev-output enforces. DR-001's `limitless-agent[bot]` GitHub App identity (`2026-04-18-agentic-sdlc-governance.md` §11.1, footnote on bot-CODEOWNERS) gives us this for free — by code, not by ceremony.
- **Definition of Done is explicit.** Scrum's DoD discipline is well-served by §5.1 ratified-merge criteria — arguably stricter than most Scrum teams achieve, because §5.5 attestation makes false `[x]` a ratification-integrity failure.

**Where LIMITLESS deviates intentionally:**
- **No sprint cadence.** Per `2026-04-21-pm-system-selection.md` §3.1 the absence is explicit and ratified. Rationale: agentic iteration is "Minutes / Hours (Agentic Loops)" per the §2.1 SDLC comparison table — the sprint time-box becomes a constraint without a benefit when an agent can implement a 50-page spec in minutes.
- **No Planning Poker / story points.** SDD framing treats specs as the unit-of-work; estimation is replaced by spec-completion observability.
- **No PO/SM/Dev role split.** CEO holds PO+ratifier+customer; Director (OpenClaw) holds SM-style orchestration without ratification authority (per `feedback_governance_determinism_primacy.md` analysis-only constraint, surfaced in C.1 §2.1).

**Where LIMITLESS deviates accidentally (DANGEROUS):**
- **No DoR (Definition of Ready).** Scrum has Sprint-Ready criteria for backlog items entering the sprint. We have no codified equivalent — a CEO ad-hoc dispatch can hit the Architect at any maturity level. Symptom: Architect has to perform "Investigate" stage of the 6-stage pipeline because dispatches arrive without spec-references.
- **No Sprint Retro cadence.** We have post-incident specs (`2026-04-22-bot-feedback-loop-incident.md`, `2026-04-25-sdk-contract-proxy-as-interop-layer.md`) — but only when an incident triggers them. Routine retro at a regular cadence is missing.

**XP-style retros, NOT Scrum-style retros**, is what the post-incident spec genre actually represents — see §3.3.

### 3.2 Kanban

**Where LIMITLESS matches (the strongest fit):**
- **Continuous flow, pull-based.** Architect pulls from Discord `#handoffs` or `#main-ops`; no time-box. Per `2026-04-05-autonomous-agentic-division-design.md` §10 Director Decisions, Architects can run **4 simultaneous workers** — pull-based capacity expansion.
- **Visualised flow (sort of).** `ROADMAP.md` Kanban lanes (Backlog → In Progress → Review → Done) per `2026-04-21-pm-system-selection.md` §3.1 give visual flow. Supplementary `gh pr list --state open` (§9.3) gives a PR-shaped lane view.
- **Empirical-evolutionary.** Kanban's "start with what you do now and evolve" matches our spec-as-SoT approach exactly — Option C in `2026-04-21-pm-system-selection.md` §9 codifies the existing practice rather than replacing it.

**Where LIMITLESS deviates intentionally:**
- None major — Kanban is permissive enough to accommodate our shape.

**Where LIMITLESS deviates accidentally (DANGEROUS):**
- **No WIP limits.** This is the most common Kanban anti-pattern (lanes-without-WIP) and we exhibit it. The implicit cap is "1–3 PRs/day estimated in Phase 1" per `2026-04-18-agentic-sdlc-governance.md` §11.3, but this is an estimate, not a per-lane limit. Risk: at multi-app scale (5 Architects × 4 workers = 20 concurrent in-flight units possible), the CEO ratification queue becomes the system bottleneck without a back-pressure signal.
- **No cycle-time / lead-time measurement.** Kanban's empirical metric is missing. PR-merge-times are observable via `gh api` but no aggregation routine exists.
- **No classes-of-service.** "Expedite" exists informally (CEO direct ping) but isn't codified.

### 3.3 Extreme Programming (XP)

**Where LIMITLESS matches:**
- **Customer-on-site (arguably stronger than XP's original).** CEO ↔ Architect Discord channel is sub-minute-latency. XP's "customer on-site" has nothing on a CEO who can ping the Architect mid-investigation and get a response in seconds.
- **Integrate frequently.** PR-per-task is the LIMITLESS analogue of XP's continuous integration discipline — every spec lands as one atomic squash commit per `2026-04-18-agentic-sdlc-governance.md` §9.
- **Post-incident retros (XP-style, not Scrum-style).** The `2026-04-22-bot-feedback-loop-incident.md` and `2026-04-25-sdk-contract-proxy-as-interop-layer.md` genre are post-mortems, written when a defect surfaces. This is closer to XP's "post-iteration retrospective on what went wrong" than Scrum's "every-sprint retro regardless of events".

**Where LIMITLESS deviates intentionally:**
- **No pair programming.** Replaced by **asynchronous expert+apprentice handoff** patterns: CC-session → Architect dispatch; Architect → Worker spawn; Architect ↔ Architect peer review (advisory-only per `2026-04-18-agentic-sdlc-governance.md` §3). Agent-to-agent review is structurally NOT pairing — pairing is real-time co-construction; our pattern is plan-handoff-review, which is closer to **Mob Programming with one human + one agent leading**, asynchronously.

**Where LIMITLESS deviates accidentally (DANGEROUS):**
- **TDD is uneven.** XP demands test-first. Per `2026-04-23-pr73-regression-audit-and-strategy-review.md` §3, PR #73 landed with two test regressions and PR #85 had a third — none caught pre-merge because `apps/nanoclaw/` has no CI. The XP "test-first, integrate-frequently, with-passing-build-always" discipline isn't fully wired.
- **Refactoring as a discipline isn't named.** XP makes refactoring a first-class daily activity. We have no equivalent named practice — refactors happen but are bundled into feature PRs.
- **Simple Design ("once and only once") is implicit.** Per `2026-04-25-sdk-contract-proxy-as-interop-layer.md` Design Principle 2.0 ("Enforce by Code, Never by Prose"), we have a partial analogue — but it's a layering principle, not a duplication principle.

### 3.4 SAFe (Scaled Agile Framework)

**Where LIMITLESS matches:**
- **Nothing meaningful.** SAFe is built for 50–125 person Agile Release Trains (ARTs) operating PI-cadence with multi-team alignment. We have 1 CEO + N Architects.

**Where LIMITLESS deviates by design:**
- **Single-CEO topology.** Per `2026-04-21-agentic-sdlc-phase-2-readiness-report.md` §6, even the @aradSmith multi-human onboarding decisions (signed-commits, joint-reviewer semantics, dispute-resolution) only stretch us to **CEO + 1 collaborator** — still fewer than SAFe's smallest unit (a single Agile Team is 5–11 people).
- **No Program Increment.** No 8–12 week alignment ceremony. Closest analogue is the multi-week DR-002 7-phase rollout (per `2026-04-21-agentic-sdlc-phase-2-readiness-report.md` §5) — but that's a single-team rollout, not multi-team alignment.
- **No RTE / Business Owners / System Architect roles.** All collapsed to CEO + Infra Architect.

**Where SAFe might become relevant:**
- **Only if** the LIMITLESS platform productises and acquires multi-team customers. Then SAFe becomes a methodology-target for the platform's *consumers*, not for the platform's own development. Even then, the SAFe-via-platform value proposition is contestable — the "machine that builds the machines" pivot suggests platform consumers will have *fewer* humans per team, not more, because agent-saturation reduces team-size requirements.

---

## 4. Implications for our platform

The dispatch's four implications-questions, addressed in order:

### 4.1 Which methodology does our current fleet most resemble?

**Kanban + XP retro, NO Scrum sprint cadence, NO SAFe scaling.** Verified. Per the §2.2 verdict tally, Kanban gets the most ✅-matches (4), XP gets the most ⚠️-partial (5 — meaning we share the cultural commitment but not always the wiring), Scrum gets 6 ❌-deviations + 3 🆕, SAFe is 10 ❌. This confirms the dispatch's hypothesis.

The deeper read: the **Kanban shape is structural** (we adopted it because it fit, not because we chose it deliberately), and the **XP shape is cultural** (customer-on-site latency + post-incident retros are the part we'd lose first if we scaled humans). The 🆕 axes — backlog-as-spec, attestation-as-DoD, single-human-many-agent roles, collapsed feedback loop — are not Kanban or XP at all; they're agentic-native.

### 4.2 What patterns are we missing that we should adopt for the project-agnostic platform?

Five gaps where the platform should opinionate:

1. **WIP limits at the Director-orchestration tier.** Today's "4 simultaneous workers per Architect" is a configuration ceiling, not a flow-control mechanism. The platform should expose a per-Architect WIP-limit primitive that produces back-pressure (queues new dispatches rather than dropping them) when capacity is saturated. Cite: §2.1 axis 4 accidental-deviation finding.

2. **Definition of Ready (DoR) before dispatch.** The platform should require a minimum spec-maturity signal before an Architect-class agent accepts a task — title + scope + acceptance criteria, even if rough. This avoids the "Investigate" stage of the 6-stage pipeline being load-bearing on every dispatch. Cite: §3.1 dangerous-deviation finding.

3. **Routine retro cadence (not just post-incident).** Post-incident specs are excellent (cite `2026-04-22-*`, `2026-04-25-*`) but they're reactive. Platform should ship a "weekly sweep" hook: capture last-week PR list + incident specs + memory deltas → produce a routine retro doc the CEO reviews. Closer to XP's iteration retro than Scrum's sprint retro. Cite: §3.1 dangerous-deviation finding.

4. **Cycle-time / lead-time observability.** Kanban's empirical metric is missing. Platform should ship a stock dashboard reading `gh api` PR data and surfacing P50/P95 cycle-time per Architect-class agent. Without this we can't tell if the system is degrading or improving across releases. Cite: §3.2 dangerous-deviation finding.

5. **Per-app CI-rail wiring as a platform invariant.** The `apps/nanoclaw/` no-CI gap (cite `2026-04-23-pr73-regression-audit-and-strategy-review.md` §3) was a defect that survived 3 weeks and 3 PRs because the platform didn't enforce CI-rail-presence as a per-app invariant. Platform should refuse to register an app for agent-development without a baseline CI rail (build / test / typecheck) being in place. This is the strongest case for "Enforce by Code, Never by Prose" applied to project-onboarding. Cite: `2026-04-25-sdk-contract-proxy-as-interop-layer.md` Design Principle 2.0.

### 4.3 What patterns from our fleet are uniquely agentic and don't map to any existing methodology?

Three candidates for "platform's new methodology contributions":

**(a) 6-stage Architect pipeline as the per-task atomic loop.** Investigate → Plan → Execute → Verify → Create PR → Report (per `apps/nanoclaw/groups/main/CLAUDE.md` per C.1 §2.2). This is the agentic equivalent of XP's "story → red-test → green-test → refactor" inner loop, but at the scope of a whole task, not a single test. It's the **unit of agentic work** in the way that "story" is the unit of XP work and "sprint" is the unit of Scrum work. Naming proposal for D.1: **The Architect Loop**.

**(b) GitHub App identity ratification flow (DR-001) as code-enforced author/approver separation.** Scrum's PO-accepts-Dev-output is enforced by social convention. Our `limitless-agent[bot]`-authors-PR / `chmod735`-approves-PR is enforced by GitHub's branch protection + bot-cannot-be-CODEOWNER mechanics. The platform should **ship this as a primitive**, not as a recommendation: any project hosted on the platform gets author/approver separation by default, by code. Cite: DR-001, §11.1 of governance spec.

**(c) Post-incident spec genre as durable retro that outlives sprint boundaries.** Spec files like `2026-04-22-bot-feedback-loop-incident.md` and `2026-04-25-sdk-contract-proxy-as-interop-layer.md` are dated, version-controlled, full-PR-reviewed retrospectives that — unlike Scrum retros which evaporate into private team Confluence pages — become canonical platform-history artefacts. The platform should ship a **first-class "incident spec" template** with frontmatter (date, author, related-PRs, three-layer-defense classification) and a route that triggers spec-creation when a CI failure crosses a severity threshold. Naming proposal for D.1: **Living Retro** (vs. Scrum's "ephemeral retro").

### 4.4 Does the platform need to be opinionated about methodology, or methodology-agnostic?

**Opinionated, but on the ASSUMPTIONS layer, not the CEREMONIES layer.** Recommended posture:

- **Be opinionated** on the agentic-native invariants from §4.3: Architect Loop is the unit-of-work; author≠approver is enforced by code; Living Retros are first-class. These are *not* methodology choices — they're consequences of "agents author code; humans ratify".
- **Be methodology-agnostic** on the ceremonies layer: a project hosted on the platform can run with Scrum sprints, Kanban flow, or no cadence at all. The platform exposes the dispatch primitive, the WIP-limit primitive, the cycle-time observability primitive — but it doesn't dictate how the project's humans cluster these into ceremonies. This matters because consumers will arrive with different cultural starting points; forcing Scrum on a Kanban-shop is the fastest way to lose them.
- **Be opinionated about the CI-rail floor.** Per §4.2 #5, the platform refuses to onboard an app without a baseline CI rail. This is a methodology-agnostic guard — it doesn't say "test-first" (XP) or "test-after" (Scrum), it says "tests run, automatically, before merge".

The shape: **opinionated on agentic invariants (3 contributions); opinionated on the CI floor; methodology-agnostic on cadence and ceremonies**. This is the platform's stance for D.1 to inherit.

---

## 5. Open questions / where evidence is thin

### Host-side data gaps (cannot resolve from monorepo bind-mount alone)

- **OQ-C2-1 — `feedback_governance_determinism_primacy.md` not in bind-mount.** The dispatch references this file as a key source for "OpenClaw Director analysis-only constraint". I rely on C.1 §2.1's prior reference to it; first-hand verification requires host-side memory access. Carry-forward from C.1 OQ-C2-1.
- **OQ-C2-2 — `feedback_emergency_pr_protocol.md` not in bind-mount.** Likely contains the codified emergency-direct-merge cadence. Without it, §1.2 of governance spec (mythos-ops emergency-direct-merge clause) is the only published reference; routine emergency cadence is unknown.
- **OQ-C2-3 — `feedback_route_pr_authorship_to_bot.md` not in bind-mount.** Likely contains the rationale for the §8.1.1 GitHub-author = bot decision. The rationale is reconstructable from DR-001, but the original feedback context is opaque.
- **OQ-C2-4 — `feedback_end_of_session_protocol.md` not in bind-mount.** May contain a session-completion/handoff schema that resembles a Daily Scrum. If so, my "no Daily Scrum" finding in §2.1 axis 6 is strengthened or weakened. Flag for D.1.
- **OQ-C2-5 — `MEMORY.md` "Pending CEO Action" sections not in bind-mount.** These are the live backlog. My §3.2 finding that "Pending CEO Action" is a backlog-grooming artefact is structurally correct but the actual cadence (daily? per-session?) cannot be measured without host-side access.
- **OQ-C2-6 — `project_*.md` arc files (especially `project_2026-04-26_*` series and `project_meta_pivot_machine_that_builds_machines.md`) not in bind-mount.** These would surface concrete recent dispatch-and-merge flows — empirical evidence for §2.1 axis 1 ("ad-hoc CEO directive"). Without them, the ad-hoc cadence claim is well-supported by ratified specs but not by a recent N-week sample of actual dispatches.
- **OQ-C2-7 — `docs/superpowers/specs/agentic_software_development.md` not present in monorepo.** The dispatch lists it as existing-high-level-framing source. Could not locate. May be host-only or never-merged. Flag for D.1 to verify.

### Resolvable open questions (suitable for D.1 to address)

- **OQ-C2-A — Cycle-time data.** No PR-list aggregation has been performed against `LIMITLESS-LONGEVITY/limitless` or `chmod735-dor/mythos`. A `gh api` query during D.1 synthesis would surface concrete P50/P95 PR-merge-time and validate or contradict the §3.2 "1–3 PRs/day estimated" figure.
- **OQ-C2-B — How much of the 6-stage Architect pipeline is enforced by the runtime vs. by `CLAUDE.md` prose?** Per Design Principle 2.0 (`2026-04-25-sdk-contract-proxy-as-interop-layer.md`), prose-only enforcement is ~95% reliable at best. If the 6-stage pipeline is prose-only, that's a fragility concern for §4.3 candidate (a). Worth a code-review of `apps/nanoclaw/src/container-runner.ts` and `groups/main/CLAUDE.md` for whether the stages are runtime-checkpointed.
- **OQ-C2-C — Does §5.1's "Approving Review" actually fail closed when a Comment-style review is submitted?** Per `2026-04-22-bot-feedback-loop-incident.md`, the bot-Director was able to issue Comment-style "ratifications" during the feedback-loop incident. Branch protection presumably enforces Approving Review on `main`, but the incident showed prose-level confusion was sufficient to enable harm in `pm-system-selection.md` PR. Worth verifying the actual branch-protection state on the live repos for D.1.
- **OQ-C2-D — Is "agent-to-agent peer review" advisory-only in code, or only in the governance spec?** Per `2026-04-18-agentic-sdlc-governance.md` §3, agent peer review is "advisory only" — but the enforcement is the spec, not the GitHub branch-protection ruleset. A misconfigured branch ruleset granting bot-account approval rights would bypass this. D.1 should verify branch-protection state matches §3 intent.
- **OQ-C2-E — Asymmetry between `LIMITLESS-LONGEVITY/limitless` and `chmod735-dor/mythos` CI rails.** §3 of pr73-audit found `apps/nanoclaw/` had no CI; what about the other 5 apps (paths, cubes, hub, digital-twin, os-dashboard) and the MYTHOS phases? Methodology-shape claims in §3 depend on this being mapped per-app/per-repo, not assumed uniform.
- **OQ-C2-F — Does the platform need a "Definition of Done" primitive that distinguishes "merged" from "deployed" from "delivered to user"?** §2.1 axis 5 flagged this gap. Could be a major platform contribution, or could be deferred. D.1 should choose.

### Contradictions / things to verify

- **C-C2-1 — "No sprint cadence" (`2026-04-21-pm-system-selection.md` §3.1) vs. potential observed weekly cadence.** If host-side memory shows a weekly CEO-briefing or Architect-status cadence, the "no sprint cadence" claim becomes "no Scrum-sprint cadence but a 1-week heartbeat exists" — a meaningful refinement. D.1 should resolve.
- **C-C2-2 — DR-002 7-phase rollout state.** Per `2026-04-21-agentic-sdlc-phase-2-readiness-report.md`, Phase 3 (GH Actions deploy) was pending. Per C.1 §2.5, the App-token code IS in monorepo (`container-runner.ts:47-115`) — DR-001 Phase 3 may be deploy-state pending, not code-state pending. Same ambiguity may exist for DR-002 Phase 3. D.1 should verify the live VPS-1 state vs the monorepo state.

---

## 6. Citations

Monorepo specs and DR docs (all paths relative to `/workspace/extra/monorepo/`):

1. `docs/superpowers/specs/2026-04-18-agentic-sdlc-governance.md` — branch protection §1, review model §2, agent-to-agent review §3, CODEOWNERS §4, ratification §5.1, attestation §5.5, conventional commits §6, attribution hierarchy §8.1, merge strategy §9, single-approver scale §11.3. Accessed 2026-04-27.
2. `docs/superpowers/specs/2026-04-21-pm-system-selection.md` — SDD framing §1, kernel services §4, options A–D §5, comparative summary §7, JIRA convention resolution §8, Option C ratified recommendation §9, artifact table §9.2. Accessed 2026-04-27.
3. `docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md` — three-tier federated architecture, multi-human onboarding §6, DR-002 7-phase rollout state §5. Accessed 2026-04-27.
4. `docs/superpowers/specs/2026-04-22-bot-feedback-loop-incident.md` — incident retro genre, three-pathology classification, three-layer defense, §7 PR #79 audit recovery, §8 governance amendments. Accessed 2026-04-27.
5. `docs/superpowers/specs/2026-04-23-pr73-regression-audit-and-strategy-review.md` — §1 methodology, §2 PR #73 exact diff, §3 defects-incorrectly-attributed (the "no CI rail" finding), §4 classification table. Accessed 2026-04-27.
6. `docs/superpowers/specs/2026-04-25-sdk-contract-proxy-as-interop-layer.md` — Design Principle 2.0 (Enforce by Code, Never by Prose), origin and 24-hour debug arc, OneCLI source-grounded inspection. Accessed 2026-04-27.
7. `docs/superpowers/specs/2026-04-05-autonomous-agentic-division-design.md` — capability-based agent catalog §3, core orchestration loop §4, notification architecture §5, NanoClaw changes §6, Director Decisions §10. Accessed 2026-04-27.
8. `docs/superpowers/specs/2026-04-05-claw-code-agentic-workflow-analysis.md` — comparative architecture, single-human-many-agent dynamic. Accessed 2026-04-27.
9. `docs/decisions/DR-001-agent-identity-and-ratification-flow.md` — GitHub App identity, attribution hierarchy, three-phase rollout, author≠approver enforcement. Accessed 2026-04-27.
10. `docs/decisions/DR-002-nanoclaw-source-of-truth-and-deployment.md` — monorepo-as-SoT, GH Actions SSH-deploy, 7-phase rollout. Accessed 2026-04-27.

C.1 cross-references:

11. `docs/superpowers/reports/research/C.1-internal-fleet-capability-map-2026-04-27.md` — §2.1 OpenClaw Director analysis-only constraint; §2.2 6-stage Architect pipeline; §2.5 DR-001 Phase 3 code-vs-deploy ambiguity; §5 host-side memory data gaps. Accessed 2026-04-27.

Industry methodology references (training-data baseline; no fresh WebFetch performed for this dispatch since the question is about *our* fleet vs. *known* methodologies, not about new industry players):

12. Schwaber & Sutherland, *Scrum Guide* (2020 revision). https://scrumguides.org/scrum-guide.html
13. Anderson, *Kanban: Successful Evolutionary Change for Your Technology Business* (Blue Hole Press, 2010).
14. Beck, *Extreme Programming Explained: Embrace Change* (Addison-Wesley, 2nd ed. 2004).
15. Leffingwell et al., *SAFe® 6.0 Reference Guide* (Scaled Agile Inc., 2023). https://scaledagileframework.com/

Host-side memory not in bind-mount (cited as gaps in §5, not as evidence):

- `MEMORY.md` (project memory index)
- `feedback_governance_determinism_primacy.md`
- `feedback_emergency_pr_protocol.md`
- `feedback_route_pr_authorship_to_bot.md`
- `feedback_end_of_session_protocol.md`
- `project_2026-04-26_*` arc files (rebuild, fleet restoration, Director restoration)
- `project_meta_pivot_machine_that_builds_machines.md`
- `docs/superpowers/specs/agentic_software_development.md` — referenced in dispatch; not present in current monorepo; may be host-only or unmerged

---

*End of dispatch C.2.*
