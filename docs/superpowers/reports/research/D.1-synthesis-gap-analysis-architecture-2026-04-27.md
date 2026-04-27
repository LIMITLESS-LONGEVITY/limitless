---
dispatch_id: D.1
topic: Synthesis — Gap Analysis + Architecture Proposal + Platform Naming
authored_by: Infra Architect (NanoClaw, Claude Opus 4.7)
date: 2026-04-27
context_anchor: project_meta_pivot_machine_that_builds_machines.md
inputs:
  - A.1-spec-driven-development-2026-04-27.md
  - A.2-agentic-coding-engines-2026-04-27.md
  - A.3-agentic-workflow-platforms-2026-04-27.md
  - A.4-multi-agent-orchestration-2026-04-27.md
  - A.5-agentic-iac-devops-2026-04-27.md
  - B.1-industry-baseline-amendments-2026-04-27.md
  - C.1-internal-fleet-capability-map-2026-04-27.md
  - C.2-workflow-vs-industry-methodologies-2026-04-27.md
classification: Internal — Strategic (planning-phase kickoff)
---

# D.1 — Synthesis: Gap Analysis + Architecture Proposal + Platform Naming

> **The machine that builds the machines.**
> Project-agnostic agentic SDLC platform. Synthesis across 8 parallel research dispatches: 24 industry players surveyed, 12 SDLC phases mapped, 4 methodologies compared, 10-component internal fleet inventoried.
> Audience: CEO + planning phase. Output: ratification-ready scope + architecture sketch + name shortlist.

---

## 1. Executive summary (1 page)

**What we found.** Across the 24 surveyed industry players (A.1–A.5), no vendor today ships **the integrated thing we are building** — a project-agnostic, multi-app, multi-agent SDLC platform with code-enforced governance, spec-as-source-of-truth, and a single-human ratifier. The closest architectural reference is **GitHub Agentic Workflows (gh-aw)** (A.3 §3.2): Markdown-spec primitive in `.github/agentic-workflows/`, AI Controls + `actor_is_agent` audit, MCP allowlist registry. But gh-aw is **per-repo, not multi-app**, and has no orchestration tier above the workflow file. **Microsoft Agent Framework v1.0** (A.4 §3.3, GA 2026-04-03) consolidated AutoGen+SK and is the single-vendor frontrunner for orchestration substrate, but is library-shaped and brings no spec/governance opinions. **Pulumi Neo** (A.5 §3.2) is the only player shipping a production-grade three-mode autonomy taxonomy (Review / Balanced / Auto) gated by policy — a pattern we should adopt for DR-003 verbatim. **Spec Kit** (A.1 §3.2) is the only player shipping a layered drift pipeline (Spec Sync → Reconcile → Retrospective). **CrewAI's hierarchical-process topology** (A.4 §3.1) is the closest external mirror of our CEO→Director→Architect→{Builder,Reviewer,Researcher} tree, but ships none of our governance.

The internal fleet (C.1) is **~95% scaffolded, ~50% production-stable**. Strongest at Phase 4 Development / Phase 6 CI-where-wired / Phase 8 Deployment. Uncovered or fragile at Phase 1 Conceptualization, Phase 5 QA-acceptance, Phase 7 Security, Phase 11 PM/Issue Tracking, Phase 12 Knowledge Ops. The bot-feedback-loop incident (C.1 §2.1) is the single most consequential fragility data point — every Discord-touching phase is one config-confluence away from a re-occurrence until DR-003 ratifies.

The methodology read (C.2): **~70% Kanban + ~25% XP + ~5% Scrum + 0% SAFe**. Three uniquely-agentic patterns are **candidate platform contributions** to formalise: (a) the 6-stage Architect Loop as a per-task atomic unit; (b) code-enforced author≠approver via GitHub App identity; (c) the Living Retro genre — dated, version-controlled, full-PR-reviewed incident specs.

**What we recommend.** Build the platform in **three named planes** layered top-down: a **Governance Plane** (identity, ratification, policy — extends DR-001/DR-002/DR-003 to multi-tenant), a **Coordination Plane** (CEO→Director→Architect→Worker topology, MCP-mediated, MAF/LangGraph-backed), and a **Spec Plane** (Markdown-as-SoT with Spec-Kit-style drift handling, ROADMAP.md as Kanban board, monorepo-as-source). The platform is **project-agnostic**: tenants bring their own monorepo, their own CEO, their own Architect roster — the platform supplies governance + coordination + spec primitives. The ranked **P0 gap list** (§4) targets eight items for v1 MVP: WIP limits, CI-rail-as-platform-invariant, autonomy-mode taxonomy, spec drift pipeline, AI-agent observability, single-tenant multi-app coordination layer, the Living Retro convention, and per-tenant MCP allowlist.

**Recommended name (lead candidate, §6): `Atelier`** — workshop where artisans build, the CEO ratifies, the apprentices (agents) execute. Tagline: *"the machine that builds the machines."* Backup: `Forge`, `Anvil`, `Loom`, `Bench`. Decision matrix in §8.

**What it means for next 3 months.** Platform v1 MVP scope (§7) is dominated by lifting the LIMITLESS-specific governance into reusable primitives, plus closing the five accidental-deviation gaps from C.2 §4.2 (WIP limits, DoR, retro cadence, cycle-time observability, CI-rail as invariant). Out-of-scope for v1: multi-tenant SaaS, hosted control plane, customer-billed observability — those are v2. Top risks: (a) MCP-allowlist surface area blow-up; (b) Director-tier coupling debt (C.1 §2 — Director appears in 11 of 12 phases, must be unwound for multi-tenant); (c) bot-feedback-loop class incidents at multi-tenant scale; (d) IaC governance gap (no Pulumi-Neo-equivalent for tenant infra); (e) brand collision risk on the lead naming candidates (clearance still pending).

**Open questions for CEO** (full list §7.4): (i) single-tenant on-prem vs SaaS — both, or one first? (ii) OSS-vs-closed for Governance Plane vs Coordination Plane (recommendation: Governance OSS, Coordination dual-licensed); (iii) what fraction of the 7-month LIMITLESS history is in-scope as the seed corpus vs starting clean? (iv) do we own the Spec Plane DSL (recommend: yes — Markdown + frontmatter, no YAML/JSON dialect); (v) which of the three planes ships first as a beta — recommendation Governance → Spec → Coordination.

---

## 2. Industry-vs-our-platform matrix (12 SDLC phases)

Phases per B.1 §2 (10 from `AgileSDLCToolsAndPlatformsReport.md` + 2 added by B.1: Phase 11 PM/Issue Tracking, Phase 12 Knowledge & Docs Ops).

Columns: **Industry standard tools** (top representative tools from B.1 per phase) · **Agentic competitor coverage** (which A.1–A.5 players engage that phase) · **Our current capability** (from C.1) · **Gap class**: `none` (we match) / `minor` (we're behind on a feature, not a category) / `major` (we have presence but a structural deficiency) / `uncovered` (we don't engage this phase at all).

| # | Phase | Industry standard | Agentic competitor coverage | Our current capability (C.1) | Gap class |
|---|---|---|---|---|---|
| **P1** | **Conceptualization** | Miro, Notion AI, Figma FigJam, Mural, Whimsical (B.1 Phase 1) | Bolt.new / v0 / Replit Agent 3 produce app-shells from a prompt (A.3 §2 row 3–4); Cursor's agent mode for greenfield prototyping (A.2). | Codex/CEO chat in Discord; OpenAI gpt-5.4 backend serves Director (C.1 §2.1). No structured ideation tool. | **major** — we have CEO+Codex chat but no facilitated ideation surface; no diagram generation; no "from-blank" agent. Industry leaders ship visual ideation; we ship none. |
| **P2** | **Requirements** | Jira Product Discovery, Productboard, Aha!, ProdPad, Confluence (B.1 Phase 2) | Spec Kit's `/specify` (A.1 §3.2), BMAD's PRD agent (A.1 §3.1), Kiro's PRD-driven agent (A.1 §3.3), Rovo Dev (A.1 §3.4). | Specs corpus in `docs/superpowers/specs/` authored by CEO+Architect (C.1 §2.10 governance row). No discovery tool. | **major** — we have spec authorship discipline but no discovery / prioritisation / stakeholder-input layer. Spec Kit is the closest to what we should be. |
| **P3** | **Design** | Figma, Sketch, Adobe XD, Penpot, Storybook (B.1 Phase 3) | v0 / Bolt.new component generation (A.3); Cursor multi-file edits with design context (A.2). | Architects produce design-of-implementation in spec body (C.1 §2.2 — `▤` design column for Architects). No design system, no component library tooling. | **major** — design is an inline prose activity; not a phase with its own tooling. Industry has rich design surfaces; we have specs. |
| **P4** | **Development** | VS Code, JetBrains, Cursor, GitHub Copilot, Claude Code (B.1 Phase 4 + agentic-coding subcategory added) | Cursor Cloud agents 10–20 parallel (A.2 §3.1); Devin long-horizon (A.2 §3.2); Claude Code subagents-as-MD-frontmatter (A.2 §3.3); Junie plan-then-execute (A.2 §3.5); Sourcegraph Amp enterprise (A.2 §3.4); Copilot AI Controls (A.2 §3.6). | **Strongest phase.** Architects + Workers produce code, PR-per-task model (C.1 §1 matrix shows `▣` on all 5 Architect rows × P4). Stable. | **none / minor** — we are competitive at the per-app boundary; minor gap on parallel session count (we run 1–4 per Architect; Cursor offers 10–20). |
| **P5** | **QA** | Playwright, Cypress, Selenium, Jest, Vitest (B.1 Phase 5) | Devin runs tests autonomously (A.2 §3.2); Cursor agents loop on test failure (A.2 §3.1); Sourcegraph Amp's enterprise test infra (A.2 §3.4). | Verifier role per `2026-04-18-agentic-sdlc-governance.md` §3 — advisory, never merge-blocking. CI tests where wired; **zero CI on `apps/nanoclaw/`** per C.1 §2.3 + `2026-04-23-pr73-regression-audit-and-strategy-review.md` §3. | **major** — DoD nominal but not enforced as platform invariant. Two regressions slipped through PR #73 (`pr73-regression-audit` §1). Acceptance-test infra absent. |
| **P6** | **CI/CD** | GitHub Actions, GitLab CI, CircleCI, Jenkins, Buildkite (B.1 Phase 6) | gh-aw is GitHub Actions native (A.3 §3.2); Spacelift Stacks AI as agentic CI for IaC (A.5 §3.3). | GH Actions per-repo for `LIMITLESS-LONGEVITY/limitless`; **uneven coverage across apps** (C.1 §2.10 row "Hetzner VPS-1" `▤` only). DR-002 Phase 3 SSH-deploy pending. | **minor → major** — minor where wired, major where not. CI-rail-as-platform-invariant is a P0 gap. |
| **P7** | **Security** | Snyk, GitHub Advanced Security, Dependabot, Veracode, Semgrep (B.1 Phase 7) | Copilot AI Controls (A.2 §3.6); Sourcegraph Amp enterprise security (A.2 §3.4); MAF policy hooks (A.4 §3.3); Spacelift OPA/Rego (A.5 §3.3). | **Governance-by-prose only.** No SAST, no DAST, no SCA per C.1 §1 column P7 (no `▣` anywhere). Branch protection + DR-001 + bot-feedback-loop incident's three-layer defense are governance not tooling. | **major / uncovered** — we have ratification governance, no security scanning, no secrets management, no supply-chain integrity. |
| **P8** | **Deployment** | Vercel, AWS, GCP, Render, Fly.io (B.1 Phase 8) | Pulumi Neo three-mode autonomy (A.5 §3.2); Terraform AI / Project Infragraph (A.5 §3.1); AWS Q Developer + Agent Plugins (A.5 §3.4); Spacelift (A.5 §3.3). | Hetzner VPS-1 manual `git pull` today; DR-002 Phase 3+ pipeline pending. Infra Architect produces P8 (`▣` per C.1 §1). Single-host, single-tenant. | **major** — deployment works for our scale; doesn't yet have multi-environment / blue-green / progressive-rollout / IaC-as-PR. |
| **P9** | **Maintenance** | Datadog, New Relic, Sentry, Grafana, PagerDuty (B.1 Phase 9 + AI-agent observability subcategory added — Galileo, Langfuse, LangSmith, Arize Phoenix) | LangSmith for LangGraph (A.4 §3.3); Galileo (B.1 §Phase 9 — Cisco intent-to-acquire 2026-04-09); Datadog AI integrations. | Hetzner monitoring (`▣` per C.1 §1); systemd journals; no AI-agent-specific observability; no cost telemetry; no eval pipeline. | **major** — we don't observe the agents at all; Galileo/Langfuse/LangSmith are the category we're missing. |
| **P10** | **Communication** | Slack, Discord, Microsoft Teams, Zulip, Mattermost (B.1 Phase 10) | gh-aw routes back to GH PR comments (A.3 §3.2); MAF supports multiple sinks (A.4 §3.3); CrewAI per-process logging (A.4 §3.1). | Discord is primary surface; multi-channel I/O (C.1 §2.1 channels list). NanoClaw is the IPC server (`▣` per C.1 §1 row 3). | **none / minor** — we are competitive here; Discord-as-surface is opinionated but works. Multi-platform (Slack/Teams) is v2 scope. |
| **P11** | **PM / Issue Tracking** | Jira, Linear, GitHub Projects v2, Azure Boards, ClickUp (B.1 §Phase 11) | Atlassian Rovo Dev integrates with Jira (A.1 §3.4); GitHub Spec Kit threads through GH Issues (A.1 §3.2); none of the orchestration frameworks (A.4) own a PM surface. | **Spec-as-SoT (Option C)** ratified per `2026-04-21-pm-system-selection.md`; ROADMAP.md Kanban lanes; "Pending CEO Action" lists in `MEMORY.md`. **No external PM tool.** | **major / by-design** — we explicitly chose to not have a PM tool. Industry expects Jira/Linear; we ship Markdown. **This is a candidate platform contribution, not a deficiency** (per C.2 §2.1 axis 2). |
| **P12** | **Knowledge / Docs Ops** | GitBook, Notion, Confluence, Mintlify, Read the Docs (B.1 §Phase 12) | Spec Kit threads spec corpus (A.1 §3.2); Rovo Dev Atlassian integration (A.1 §3.4). | Specs corpus + DR records + CLAUDE.md cascade (`▣` per C.1 §1 row 10 column P12). No live docs site. | **major** — we treat the spec corpus *as* the docs, but there's no rendered site, no search, no versioning beyond git, no API reference generation. |

### 2.1 Cross-phase observations

1. **Six of 12 phases are `major` gaps** (P1, P2, P3, P5, P7, P9, P11, P12 = 8 actually). Our depth is concentrated in P4/P6/P8/P10. The ~95%/~50% headline from C.1 §Headline reads correctly on this matrix.
2. **No phase is fully `uncovered`** — even P7 has governance presence, even P11 has spec-as-SoT. We have *something* everywhere; we have *enough* in only a third of phases.
3. **No competitor covers all 12 phases either.** GitHub via Spec Kit + Copilot + Actions + Projects covers ~9/12 (gaps in P3 design, P9 observability for AI, P12 docs ops). Atlassian via Rovo Dev + Jira + Confluence + Bitbucket Pipelines covers ~10/12. **Nobody integrates governance across all 12 with code-enforced author≠approver.** That's the white space.
4. **The two B.1-added phases (P11, P12) are the most-uncovered industry-wide for agents** — none of A.1–A.5 invest meaningfully in Phase 11 PM, and only Spec Kit + Rovo Dev touch Phase 12 docs ops. Coverage there is a differentiator.
5. **Phase 4 Development is the most crowded** — six surveyed in A.2 plus Spec Kit + BMAD + gh-aw bleed into it. The path to differentiation is *not* "build a better Cursor" but "build the orchestration that makes any of these slot in."

---

## 3. Competitive positioning (24 surveyed players)

For each competitor: **their pitch** (1 line) · **our differentiation** (real or aspirational) · **our weakness vs them**. Players grouped by the dispatch bucket they were surveyed under.

### 3.1 Spec-Driven Development (A.1)

| Player | Their pitch | Our differentiation | Our weakness |
|---|---|---|---|
| **BMAD method v6.5.0** | OSS, MIT, 12+ specialised agent personas (Analyst, PM, Architect, Dev, QA, etc.) | Code-enforced governance via DR-001 GitHub App identity; ratification flow; multi-app coordination | No persona library; no per-stage agent specialisation as deep as BMAD's; we conflate Architect and Worker |
| **GitHub Spec Kit v0.8.1** | Agent-agnostic, MIT, layered drift handling (Spec Sync → Reconcile → Retro) | Multi-app monorepo coordination layer; integrated incident-retro genre; CEO ratification gate | We have **zero drift handling pipeline**; spec drift is detected ad-hoc; Spec Kit is far ahead here. **This is a P0 gap.** |
| **Amazon Kiro** | Claude Sonnet inside, AWS GovCloud variant, $20–$200/mo tiers | Vendor-neutral; not AWS-locked; OSS Governance Plane; runs on any monorepo | No managed offering; no compliance certifications; no GovCloud-equivalent |
| **Atlassian Rovo Dev** | GA, 41.98% SWE-bench, deep Jira/Confluence/Bitbucket integration | Project-agnostic, no Atlassian lock-in; works with GitHub-native + Markdown-native shops | No GitLab/Azure DevOps support (Rovo doesn't either, FWIW); no HIPAA; no Atlassian-tier sales motion |

**Direct competitor flag:** **Spec Kit is the most direct overlap** with our Spec Plane; we should plan to **interoperate with Spec Kit's Markdown format** rather than fork it. Adopt their drift pipeline as our P0 gap closer.

### 3.2 Agentic Coding Engines (A.2)

| Player | Their pitch | Our differentiation | Our weakness |
|---|---|---|---|
| **Cursor + Cloud agents** | Best IDE; 10–20 parallel cloud agents; pull-and-iterate dev loop | Multi-Architect coordination; cross-app dispatch; CEO ratification gate above the per-PR loop | We can't run 20 parallel sessions per Architect; our per-Architect concurrency cap is 4 (per `2026-04-05-autonomous-agentic-division-design.md` §10) |
| **Devin (Cognition)** | Long-horizon autonomous engineer; ACU pricing; can run for hours | Mid-horizon orchestration with single-CEO ratifier; cheaper per task; no opaque ACU billing | No production-grade long-horizon (>30-min) autonomous capability; Devin owns this |
| **Claude Code** | Most expressive permission model; first-class subagents (frontmatter-declared) | Multi-app, multi-Architect; cross-task coordination; ratification + retro layer above CC | We are **built on top of CC** — not a competitor, a substrate. Our differentiation **is** the layer above. |
| **Sourcegraph Amp / Cody** | Best enterprise governance; SOC 2; on-prem; Cody-with-Amp dual surface | OSS Governance Plane; project-agnostic; no Sourcegraph license required | No enterprise sales motion; no SOC 2 today; no on-prem self-host product |
| **JetBrains Junie** | Plan-approval-then-execute UX; deep IDE integration | Spec-as-SoT replaces plan-approval-per-task with spec-as-pre-approved-plan | No JetBrains IDE-native presence; we live in `.md` files + Discord, not IntelliJ |
| **GitHub Copilot + AI Controls** | Best enterprise control plane (`actor_is_agent` audit, MCP allowlist registry, AI Controls dashboard) | Multi-app coordination layer above Copilot's per-repo focus; CEO ratification not just "policy approval" | Copilot's enterprise control plane is **best-in-class**. We are clearly behind on that surface. |

**Direct competitor flag:** **Copilot's AI Controls + GitHub Spec Kit + GitHub Agentic Workflows together = "GitHub's answer"** to the platform we're building. They have the substrate; we have the integrating opinion. **The risk is GitHub eating the integrating-opinion layer themselves.**

### 3.3 Agentic Workflow Platforms (A.3)

| Player | Their pitch | Our differentiation | Our weakness |
|---|---|---|---|
| **GitHub Next ACE** | Research preview; agent control & evaluation | Production-grade governance; not research-preview; multi-app | ACE is research; not a product yet. Watch carefully — they may ship past us. |
| **GitHub Agentic Workflows (gh-aw)** | Markdown specs in `.github/agentic-workflows/`; AI Controls + `actor_is_agent`; MCP allowlist | Multi-app monorepo coordination; cross-repo dispatch; Spec Plane above the workflow file | gh-aw owns single-repo agent runs natively; we'd integrate, not replace |
| **Bolt.new** | App-from-prompt generator; sandbox-in-browser | Brownfield existing-codebase work; not greenfield-only | We have no greenfield-from-prompt capability today |
| **v0 (Vercel)** | UI-from-prompt generator; React/Tailwind native | Full-stack + governance, not UI-only | We have no UI generator |
| **Overcut.ai** | Multi-SCM (GitHub/GitLab/Azure DevOps); on-prem/VPC | OSS reference implementation; not closed | They have sales-channel reach; we have none |
| **Replit Agent 3** | 200+ min Max-mode autonomy in browser | Mid-horizon spec-bound autonomy; not browser-locked; CEO-ratified outputs | Replit Agent 3's long-horizon autonomy + browser-native UX is a differentiator we don't have |

**Direct competitor flag:** **gh-aw is the architectural reference closest to where we're going** (per A.3 implication 2). We should explicitly position as **"multi-app gh-aw"** — same MD-spec primitive, same governance posture, but with a coordination layer above per-repo workflows.

### 3.4 Multi-Agent Orchestration (A.4)

| Player | Their pitch | Our differentiation | Our weakness |
|---|---|---|---|
| **CrewAI** | Sequential / Hierarchical / Consensual processes; Fortune-500 traction | Code-enforced governance; ratification gate; per-tenant isolation | CrewAI's hierarchical-process closely mirrors our topology; they have years of process-as-config maturity we don't |
| **AutoGen → MAF v1.0** | Microsoft Agent Framework, GA 2026-04-03; AutoGen + SK convergence | Spec-driven topology; not just framework — full SDLC opinion | MAF is Microsoft-backed, enterprise-distributed, and free. As a framework it can subsume CrewAI patterns. **Risk: MAF is the substrate we should be built on** — adopt rather than compete. |
| **LangGraph** | Best state management; Postgres checkpointer per super-step | We borrow this pattern wholesale (P0 in §4); we layer governance on top | LangGraph 2026 State of Agent Engineering: **60%+ of agent prod incidents are state-related** — we have *zero* checkpointing today |
| **SK → MAF** | Subsumed by MAF April 2026 | n/a (MAF is the through-line) | n/a |

**Direct competitor flag:** **None of these compete with us — they are substrate candidates.** Choose between MAF (vendor-backed, single-org adoption risk) and LangGraph (OSS, vendor-neutral). Recommendation in §5.5.

### 3.5 Agentic IaC / DevOps (A.5)

| Player | Their pitch | Our differentiation | Our weakness |
|---|---|---|---|
| **HashiCorp Terraform AI / Project Infragraph + watsonx** | IBM-backed; enterprise IaC; cross-cloud graph | App-level + IaC-level unified governance; no IBM lock-in | Terraform-native ecosystem; we have no IaC offering today |
| **Pulumi Neo** | Three-mode autonomy (Review/Balanced/Auto); CrossGuard policy gate | Apply same three-mode taxonomy to **all agent operations**, not just IaC | Pulumi Neo ships HITRUST 30K-violations-found / 20%-auto-resolved scale data we don't have |
| **Spacelift Stacks AI/Intent** | Codeless agentic IaC; OPA/Rego policy | Markdown-spec primitive (not codeless); broader-than-IaC scope | We have no codeless interface |
| **AWS Q Developer + Agent Plugins for AWS (Feb 2026)** | MCP-as-deploy-substrate; native AWS coverage | Multi-cloud; vendor-neutral | No AWS-tier integration depth; Q is AWS-best-in-class |

**Direct competitor flag:** **Pulumi Neo's three-mode autonomy taxonomy is a pattern to copy verbatim** for our DR-003 / autonomy-levels work. They have validated the user-facing model. (See §4 P0-3, §5.3.)

### 3.6 The five most direct competitors (positioning recommendations)

Of the 24, the five most direct strategic competitors and our positioning against each:

1. **GitHub (gh-aw + Spec Kit + Copilot + AI Controls + Projects v2)** — **the existential competitor**. Their stack is integrated, vendor-deep, has the auth substrate (GitHub App identity, which we already use). **Position:** be the coordination layer above their substrate; integrate, don't replace; OSS the Governance Plane to make it portable across SCMs. **If GitHub ships their own coordination layer, our window closes** (~12 months).

2. **Atlassian (Rovo Dev + Jira + Confluence + Bitbucket Pipelines)** — the enterprise incumbent. Position: be the Markdown-native, GitHub-native shop's answer; explicitly call out that we don't require Jira/Confluence licenses.

3. **Cursor (IDE + Cloud agents)** — owns the per-developer surface. Position: we are the layer *above* Cursor; Cursor is our P4 Development substrate, not our competitor.

4. **Cognition (Devin)** — owns long-horizon autonomous coding. Position: spec-bound mid-horizon orchestration with code-enforced ratification beats opaque long-horizon autonomy on auditability and cost-predictability.

5. **Pulumi (Neo)** — owns agentic IaC. Position: borrow their autonomy-mode taxonomy; integrate Pulumi Neo as the IaC plug-in for our P8 phase rather than rebuild it. Pulumi is more partner than competitor.

### 3.7 White-space summary

The integrating opinion across **(governance + spec + coordination + retro genre)** is unclaimed. Every competitor owns a slice; nobody owns the integrated thing. **Our window is ~12 months** before GitHub or Microsoft ships their own integrated answer.

---

## 4. Gap list (ranked)

Methodology: each gap is `<priority>` / `<effort class>` / `<prerequisites>` / `<evidence basis>`. Priority: **P0** = must-have for platform MVP; **P1** = must-have for v1 ship; **P2** = should-have v1; **P3** = nice-to-have. Effort: days / weeks / months. Prereqs cite other gap IDs.

### 4.1 P0 — must-have for platform MVP

**P0-1 · Spec drift handling pipeline** (Spec Sync → Reconcile → Retro)
- **Description:** No layered drift detection between spec corpus and code. Spec Kit ships this; we don't.
- **Evidence:** A.1 §3.2 (Spec Kit best-in-class drift handling); C.1 §5 OQ-C1-2 (spec drift is host-side gap); C.2 §5 OQ-C2-3 (no codified drift cadence).
- **Effort:** weeks (ship MVP); months (production-grade)
- **Prerequisites:** none — can start immediately
- **Why P0:** Spec-as-SoT only works if drift is detected. Without this, we silently lie about state.

**P0-2 · CI-rail-as-platform-invariant**
- **Description:** Every app in tenant monorepo MUST have CI (lint/test/typecheck) wired by platform default. `apps/nanoclaw/` has zero CI today (C.1 §2.3, `pr73-regression-audit` §3) — that's the data point.
- **Evidence:** C.1 §2 row "GitHub App" `▥` on P6; `2026-04-23-pr73-regression-audit-and-strategy-review.md` §3; C.2 §2.1 axis 9.
- **Effort:** weeks
- **Prerequisites:** none
- **Why P0:** XP-style DoD only works if the gate is wired. Two regressions slipped on PR #73 because of this.

**P0-3 · Autonomy-mode taxonomy (Review / Balanced / Auto + per-mode policy gate)**
- **Description:** Borrow Pulumi Neo's three-mode taxonomy; apply to all agent operations (not just IaC). Each mode has a policy hook that gates execution.
- **Evidence:** A.5 §3.2 (Pulumi Neo); C.1 §2.1 (Director governance constraint); C.2 §4.3 (ratification flow).
- **Effort:** weeks (taxonomy + UI); months (policy DSL)
- **Prerequisites:** none — but interacts with DR-003
- **Why P0:** the bot-feedback-loop incident showed implicit autonomy gates fail. Explicit modes are the fix.

**P0-4 · GitHub App identity as governance primitive (multi-tenant)**
- **Description:** Lift DR-001's `limitless-agent[bot]` pattern into a per-tenant primitive. Each tenant org installs a `<platform-name>-agent[bot]` GitHub App; identity-as-code-enforced author≠approver.
- **Evidence:** DR-001; C.2 §4.3 candidate platform contribution (b); A.2 §3.6 (Copilot's `actor_is_agent` is the closest external pattern).
- **Effort:** months
- **Prerequisites:** none
- **Why P0:** the entire Governance Plane sits on this. Without it, ratification is honor-system.

**P0-5 · WIP limits + Definition of Ready at Director tier**
- **Description:** Codify per-Architect WIP cap (currently implicit at 4 per `autonomous-agentic-division-design` §10, but not enforced); define DoR before dispatch (spec exists + acceptance criteria + risk class).
- **Evidence:** C.2 §2.1 axis 4 (WIP not codified — accidental Kanban deviation); §4.2 (5-gap accidental-deviation cluster).
- **Effort:** days (codify); weeks (enforce)
- **Prerequisites:** P0-4 (identity to attribute the WIP slot to)
- **Why P0:** without WIP limits, parallel dispatch will starve the ratifier.

**P0-6 · Single-tenant multi-app coordination layer**
- **Description:** The coordination tier above per-app Architects. Today this is OpenClaw Director — but Director is coupled to LIMITLESS-specific concerns (C.1 §2.1 — appears in 11 of 12 phases). Lift into a project-agnostic coordinator.
- **Evidence:** C.1 §1 row 1 (Director ubiquity); A.3 §3.2 (gh-aw is per-repo; we extend); A.4 §3.1 (CrewAI hierarchical process is the topology pattern).
- **Effort:** months
- **Prerequisites:** P0-4 (identity), P0-5 (WIP), P0-1 (spec drift)
- **Why P0:** this is the platform's reason for being.

**P0-7 · AI-agent observability (eval pipeline + cost telemetry + trace UI)**
- **Description:** Pick one of LangSmith / Langfuse / Galileo as the substrate; wire trace-emit at every Architect/Worker boundary; add cost-per-task + latency dashboards.
- **Evidence:** B.1 §Phase 9 (subcategory added — Galileo Cisco-acquisition 2026-04-09); A.4 §3.3 (LangGraph 60%+ state-related incidents); C.1 §5 (no observability today).
- **Effort:** weeks (integrate one vendor); months (multi-vendor abstraction)
- **Prerequisites:** P0-6 (need coordination tier to wire trace emission)
- **Why P0:** debugging the bot-feedback-loop incident took hours of post-hoc log archaeology. Real-time observability is the prevention.

**P0-8 · Per-tenant MCP allowlist registry**
- **Description:** Each tenant declares which MCP servers their agents can call. Registry is the policy artefact. Pattern is identical to gh-aw (A.3 §3.2) and Copilot AI Controls (A.2 §3.6).
- **Evidence:** A.3 §3.2 (gh-aw allowlist); A.2 §3.6 (Copilot pattern); A.5 §3.4 (AWS Q Agent Plugins).
- **Effort:** weeks
- **Prerequisites:** P0-4 (identity to attribute allowlist to)
- **Why P0:** without allowlist, multi-tenant security is impossible.

### 4.2 P1 — must-have for v1 ship

**P1-1 · Living Retro convention codified as platform primitive**
- **Description:** Lift our incident-spec genre (`2026-04-22-bot-feedback-loop-incident.md`, `2026-04-25-sdk-contract-proxy-as-interop-layer.md`) into a versioned, schema'd retro template that every tenant inherits.
- **Evidence:** C.2 §4.3 candidate (c); §5 OQ-C2-4.
- **Effort:** weeks
- **Prerequisites:** P0-1 (drift pipeline), P0-7 (observability)

**P1-2 · Cycle-time / lead-time observability (built-in dashboards)**
- **Description:** PR-merge-time, dispatch-to-merge-time, ratify-time per Architect. C.2 §2.1 axis 3 flagged this as observable but not routinely measured.
- **Evidence:** C.2 §2.1 axis 3; B.1 §Phase 9.
- **Effort:** weeks
- **Prerequisites:** P0-7 (observability substrate)

**P1-3 · Plan-approval-before-execute UI**
- **Description:** Junie-style (A.2 §3.5) plan-approval surface: agent proposes plan → human approves → execute. Optional per autonomy mode (P0-3). Cursor's "Auto" mode is the contrast.
- **Evidence:** A.2 §3.5; A.5 §3.2 (Pulumi Neo Review mode).
- **Effort:** months
- **Prerequisites:** P0-3 (autonomy modes)

**P1-4 · Multi-Architect parallel session count → 10+**
- **Description:** Today our cap is 4 per Architect. Cursor offers 10–20 cloud agents per developer. Lift our cap.
- **Evidence:** A.2 §3.1 (Cursor); `autonomous-agentic-division-design` §10.
- **Effort:** weeks (lift cap + concurrency safeguards)
- **Prerequisites:** P0-5 (WIP limits to prevent starvation)

**P1-5 · State management: per-task Postgres checkpointer**
- **Description:** Adopt LangGraph's checkpointer pattern (A.4 §3.3) — per-Architect-task atomic state in Postgres. Survives crashes, enables resume.
- **Evidence:** A.4 §3.3 (60%+ state-related incidents).
- **Effort:** weeks
- **Prerequisites:** P0-6 (coordination layer to checkpoint)

**P1-6 · Spec Plane DSL formalised (Markdown + frontmatter schema)**
- **Description:** Today spec format is informal Markdown. Formalise the schema: required sections (Status, Decision, Rationale, Implementation, Risks), required frontmatter fields, lint-checkable.
- **Evidence:** A.1 §3.2 (Spec Kit's MD format); C.1 §2.10 (governance specs row); C.2 §2.1 axis 2.
- **Effort:** weeks
- **Prerequisites:** none (can run parallel)

**P1-7 · IaC plug-in (Pulumi Neo or Terraform AI)**
- **Description:** Plug Pulumi Neo into Phase 8 Deployment as the platform-blessed IaC option. Don't rebuild.
- **Evidence:** A.5 §3.2; A.5 implication.
- **Effort:** weeks (integration); months (UX polish)
- **Prerequisites:** P0-3 (autonomy modes); P0-4 (identity)

### 4.3 P2 — should-have for v1

**P2-1 · Live docs site (Mintlify or GitBook) auto-generated from spec corpus** (Phase 12 gap — B.1 added, C.1 §1 column P12 mostly empty)

**P2-2 · Discovery / Conceptualization layer (Phase 1)** — chat-driven idea-to-spec wizard. Closest pattern: Bolt/v0 prompt-to-app, but for spec drafting.

**P2-3 · Design-system / component-library generation** (Phase 3) — bridge to v0 / Bolt for tenants who want UI scaffolding.

**P2-4 · Acceptance-test infrastructure** (Phase 5) — beyond unit/integration, define "acceptance test" as a spec-attached artifact.

**P2-5 · Routine retro cadence at Director tier** — even if low-touch, weekly digest of completed PRs + open gaps. C.2 §4.2 gap (e).

**P2-6 · Cross-app API-contract drift detection** — the Future bullet from `2026-04-05-division-v2-federated-architecture.md` §5.

**P2-7 · Per-tenant cost budget + alerts** — once observability lands, surface cost-per-spec.

**P2-8 · Multi-SCM support (GitLab, Azure DevOps, Bitbucket)** — currently GitHub-only. Overcut.ai (A.3) is the differentiator pattern.

### 4.4 P3 — nice-to-have

**P3-1 · Hosted SaaS control plane** (multi-tenant SaaS rather than per-tenant on-prem)

**P3-2 · Multi-channel Communication (Slack, Teams)** — beyond Discord

**P3-3 · Diagram generation for specs** — Mermaid auto-generation, etc.

**P3-4 · LLM-vendor abstraction** — Claude/GPT/Gemini interchange

**P3-5 · Governance certifications** (SOC 2, HIPAA, FedRAMP) — needed for enterprise sales motion

**P3-6 · BMAD-style persona library** — pre-built Architect personas per domain

### 4.5 Gap dependency graph (P0 only)

```
        P0-4 (identity) ──┬─→ P0-5 (WIP) ──→ P0-6 (coordination) ──→ P0-7 (observability)
                          ├─→ P0-8 (MCP allowlist)
                          └─→ P0-3 (autonomy modes) ── (interacts with DR-003)
        P0-1 (drift pipeline) ──→ (independent)
        P0-2 (CI rail) ──→ (independent)
```

**Critical path: P0-4 → P0-6 → P0-7.** That's the spine. Everything else can parallel.

---

## 5. Architecture proposal (initial — basis for system design phase)

### 5.0 The Three Planes

The platform decomposes into three layered planes, each ship-able independently:

```
┌──────────────────────────────────────────────────────────────┐
│ SPEC PLANE                                                   │
│  · Markdown spec corpus (schema'd)                            │
│  · Drift pipeline (Spec Sync → Reconcile → Retro)             │
│  · ROADMAP.md Kanban with WIP limits                          │
│  · Spec-as-SoT — replaces Jira/Linear/etc.                    │
├──────────────────────────────────────────────────────────────┤
│ COORDINATION PLANE                                           │
│  · CEO → Director → Architect → Worker topology               │
│  · MCP-mediated tool calls; per-tenant allowlist              │
│  · Postgres checkpointer (LangGraph-pattern)                  │
│  · MAF / LangGraph as substrate (vendor choice §5.5)          │
│  · Discord/Slack/Teams as I/O surface                         │
├──────────────────────────────────────────────────────────────┤
│ GOVERNANCE PLANE                                             │
│  · GitHub App per-tenant identity                             │
│  · DR-001 author≠approver enforcement                         │
│  · DR-002 monorepo-as-SoT                                     │
│  · Autonomy mode taxonomy (Pulumi-Neo-style 3-mode)           │
│  · Branch protection + ratification model (§5.1 lifted)       │
│  · Living Retro genre as schema'd template                    │
└──────────────────────────────────────────────────────────────┘
```

Why three planes, not one product: each plane is ship-able alone, has its own competitor set, has its own pricing model. Governance Plane is the OSS reference (per recommendation §5.8); Coordination Plane is dual-licensed; Spec Plane is OSS.

### 5.1 Topology

**Tier hierarchy** (per-tenant default — multi-tenant is N copies of this tree):

```
                    ┌──────────────┐
                    │     CEO      │  human; ratifier
                    │  (1 per      │  spec author
                    │   tenant)    │
                    └──────┬───────┘
                           │ Discord/Slack/Teams + GitHub PR review
                    ┌──────▼───────┐
                    │   Director   │  agent; orchestrator; never ratifies
                    │  (1 per      │  spec decomposer; cross-app coordinator
                    │   tenant)    │  cron + heartbeat
                    └──────┬───────┘
                           │ Discord channel + spec dispatch
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
   │Architect│  ...   │Architect│  ...   │Architect│  agents; per-app domain owners
   │  (app1) │        │  (appN) │        │  (infra)│  PR-authors; spec-implementers
   └────┬────┘        └────┬────┘        └────┬────┘
        │                  │                  │
   ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
   │Worker(s)│        │Worker(s)│        │Worker(s)│  agents; ephemeral; sub-task executors
   │ Builder │        │ Builder │        │ Builder │
   │Reviewer │        │Reviewer │        │Reviewer │
   │Research │        │Research │        │Research │
   └─────────┘        └─────────┘        └─────────┘
```

**Mapped to A.4 frameworks:** this is **CrewAI's hierarchical-process topology** (A.4 §3.1) — almost 1:1. Manager-LLM = Director; agents = Architects; sub-tasks = Worker spawns.

**Project-agnostic shape:** the 5-Architect roster (PATHS, Cubes+, HUB, DT, Infra) in C.1 §1 is **LIMITLESS-specific**. The platform exposes the *roster as configuration* — tenant declares Architects in `<platform>.config.md` (Markdown, naturally).

**Open question:** does Director need to exist for single-app tenants? Probably no — collapse Director↔Architect when N=1. Default to "Director optional, Architect required."

### 5.2 Communication substrate

**Primary I/O:** Discord (default), Slack, Teams (v2). All three are well-supported by NanoClaw IPC layer (C.1 §2.3 row "NanoClaw v2 (host)" `▣` on P10).

**Inter-agent:** **MCP (Model Context Protocol)** as the universal substrate (per A.2/A.3/A.4/A.5 — MCP is unanimous 2026 integration plumbing). A2A (Agent-to-Agent) protocol monitored but not ratified into v1 (per A.4 implication 5).

**Director ↔ Architect:** Discord channel (preserves the auditability + multi-human onboarding from `phase-2-readiness-report.md` §6).

**Architect ↔ Worker:** in-process MCP (lower-latency than Discord; Worker is ephemeral).

**Decision: NanoClaw IPC stays as the host-side process substrate.** It's working; no industry equivalent for Discord-as-IPC; rebuilding would be wasted motion (per C.1 §2.3 stability).

**B.1 communication-platform analysis (Phase 10):** Slack 25M DAU; Discord 200M MAU but consumer-skewed; Teams 320M MAU but enterprise-locked. Recommendation: ship Discord first (we use it; LIMITLESS proves it), Slack next, Teams later — driven by tenant demand.

### 5.3 Identity + governance (lifting DR-001 to multi-tenant)

**Per-tenant GitHub App.** Each tenant org installs `<platform-slug>-agent[bot]`. The App's identity is the bot account that authors PRs; humans (CEO + collaborators) approve.

**DR-001's three-rule enforcement scales naturally:**
1. Bot identity is GitHub App, not personal token (already true in DR-001; multi-tenant just means N apps).
2. Bot author ≠ ratifier — branch protection enforces (per `2026-04-18-agentic-sdlc-governance.md` §1).
3. False attestation = ratification-integrity failure (CEO Directive 1, §5.5).

**Autonomy-mode taxonomy (P0-3, lifted from Pulumi Neo A.5 §3.2):**
- **Review mode:** agent proposes diff → human approves → agent applies. Default for new tenants.
- **Balanced mode:** agent applies low-risk classes (lint, comment edits, doc fixes) automatically; high-risk classes (schema, security, infra) require Review.
- **Auto mode:** agent applies all classes that pass policy; human is notified, not gating.

**Mode-per-Architect, mode-per-spec, mode-per-tenant:** all three layers configurable. Default cascade: tenant > spec > Architect. CrossGuard-style policy DSL gates each transition. Spacelift OPA/Rego (A.5 §3.3) is a strong reference.

**The bot-feedback-loop incident lesson is encoded here:** Director is *always* in Review mode for ratification-class artefacts (DR-003 once ratified). No auto-mode for Director directives. Ever.

### 5.4 Spec + workflow (project-agnostic LIMITLESS dispatch model)

**Spec format:** Markdown + frontmatter, schema-validated (P1-6). Required frontmatter: `id`, `title`, `status` (draft/dispatched/in-progress/ratified/landed), `dispatched_to` (Architect name), `acceptance_criteria` (bullet list), `risk_class` (low/med/high — drives autonomy mode).

**Dispatch flow** (the project-agnostic LIMITLESS dispatch):

```
1. CEO authors spec in docs/specs/<date>-<slug>.md (status: draft)
2. CEO marks status: dispatched, dispatched_to: <Architect>
3. Director (cron-driven) detects new dispatch, posts to <Architect>'s Discord channel
4. Architect session opens, reads spec, plans, executes via Workers
5. Architect opens PR; PR title references spec id
6. Spec drift pipeline (P0-1) verifies PR diff matches spec acceptance_criteria
7. CEO reviews PR; Approving Review with "RATIFIED" + status: ratified in spec
8. PR merges; squash commit references spec id; spec status: landed
9. Living Retro (P1-1) auto-stub created on first incident touching this spec
```

**Six-stage Architect Loop** (the per-task atomic unit, lifted from C.2 §4.3 candidate (a)):

```
Stage 1: READ — spec + MEMORY.md + relevant code
Stage 2: PLAN — internal plan (optionally surface as plan-approval, P1-3)
Stage 3: EXECUTE — Workers spawn; code/test/doc edits
Stage 4: VERIFY — local tests pass; ratification checklist self-check
Stage 5: AUTHOR — PR opened, body schema-conforming
Stage 6: ATTEST — `[x]` checkboxes attest "executed + verified green" per §5.5
```

This is the platform-defined atomic unit. Any tenant Architect MUST conform.

**Drift pipeline** (P0-1, lifted from Spec Kit A.1 §3.2):
- **Spec Sync:** post-PR-merge, regenerate spec-from-code summary; diff against ratified spec; flag drift > threshold.
- **Reconcile:** Director surfaces drift; CEO either updates spec (intent changed) or re-dispatches code fix (drift was bug).
- **Retro:** Living Retro spec auto-stubbed for drift events with severity > medium.

### 5.5 State management

**Per-Architect-task Postgres checkpointer** (P1-5, LangGraph pattern from A.4 §3.3).

Schema sketch (Postgres):

```sql
CREATE TABLE architect_sessions (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  architect_name TEXT NOT NULL,
  spec_id TEXT REFERENCES specs(id),
  status TEXT NOT NULL,  -- planning|executing|verifying|authored|ratified|landed
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  pr_url TEXT,
  trace_id TEXT  -- ties to observability (LangSmith/Langfuse/Galileo)
);

CREATE TABLE architect_checkpoints (
  session_id UUID REFERENCES architect_sessions(id),
  step_index INT NOT NULL,
  state_blob JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (session_id, step_index)
);
```

**Why Postgres, not S3 / Kafka / Redis:** atomicity per step; queryable; standard DBA story; LangGraph reference impl is Postgres. Avoid the 60% state-related-incidents class (A.4 §3.3).

**Audit trail:** ratified PRs are the immutable audit record; spec corpus is the intent record; Postgres checkpoints are the operational record. Three-layer separation matches DR-002 monorepo-as-SoT.

**Substrate choice:** **MAF (Microsoft Agent Framework v1.0, GA 2026-04-03)** for orchestration if vendor-lock acceptable; **LangGraph** otherwise. Recommendation: **LangGraph** for Coordination Plane internals (vendor-neutral, OSS, mature checkpointer), **MAF interop** as a v2 connector for tenants who want it.

### 5.6 Integration points (which industry tools we integrate vs replace)

| Industry capability | Integrate or Replace? | Rationale |
|---|---|---|
| GitHub (SCM, PRs, Actions, App identity) | **Integrate** | Already our identity substrate; rebuilding is wasted |
| Cursor / Claude Code / Copilot (IDE coding) | **Integrate** | They are the P4 substrate; we are the layer above |
| Spec Kit (drift pipeline) | **Integrate (interop with MD format)** | Best-in-class drift; don't fork |
| Jira / Linear (PM) | **Replace** | Spec-as-SoT is the opinionated answer; tenants who want Jira can keep it but platform doesn't depend |
| Confluence / GitBook (Docs) | **Replace (light)** | Spec corpus is the docs; live docs site auto-generates from corpus (P2-1) |
| Datadog / NewRelic (APM) | **Integrate** | Tenant-supplied; our observability is AI-agent-specific |
| Galileo / Langfuse / LangSmith (AI agent observability) | **Integrate (one chosen, multi-vendor in v2)** | This is the missing layer per B.1 §Phase 9 |
| Pulumi Neo / Terraform AI / Spacelift (IaC) | **Integrate (one default, multi in v2)** | Don't rebuild; plug-in model |
| Discord / Slack / Teams (Comms) | **Integrate (Discord first)** | Already our substrate |
| Snyk / GHAS / Dependabot (Security) | **Integrate** | We add the governance layer; they add the scanning |
| BMAD personas | **Optional plug-in** | Pre-built persona library is a v2 ergonomic |
| MCP servers (general) | **Integrate (with allowlist)** | Universal 2026 substrate |

**Net:** we replace ~2 categories (PM, light docs), integrate ~10. **The integrating opinion is the product.**

### 5.7 Multi-tenancy model

**v1: Single-tenant per org, self-hosted on tenant infra.** Tenant runs the platform on their own VPS / k8s; brings their own monorepo, their own GitHub App, their own LLM API keys. Platform is install-and-run.

**Why single-tenant first:** governance plane is much simpler; no cross-tenant isolation; matches our LIMITLESS reality; ships in 3–6 months.

**v2: Multi-tenant SaaS** — hosted control plane managing N tenant orgs. Per-tenant isolation: separate Postgres schemas, separate MCP allowlists, separate identity (GitHub App per tenant). Ships in 6–12 months after v1.

**v2 risk:** the bot-feedback-loop class incident **multiplies** at multi-tenant scale (N tenants × M agents × K Discord channels = NM K loop substrate possibilities). Need per-tenant policy engine before SaaS.

**Recommendation:** v1 single-tenant on-prem; v2 SaaS multi-tenant. **Both, not one or the other** — but sequenced.

### 5.8 Open-source vs closed (recommendation)

**Recommendation:**

- **Governance Plane: OSS (Apache-2.0).** Maximum portability, maximum trust, maximum ecosystem-leverage. The DR-001 / DR-002 / DR-003 patterns become *the* reference for code-enforced agent governance. Compete with Copilot AI Controls on trust, not depth.
- **Spec Plane: OSS (Apache-2.0).** Schema + drift pipeline + ROADMAP-Kanban tooling. Interop with Spec Kit. We benefit from ecosystem; competitors benefit from ours.
- **Coordination Plane: Dual-licensed.** OSS core (Apache-2.0) — Director, Architect, Worker abstractions; checkpointer; MCP allowlist. Commercial extensions — multi-tenant SaaS, hosted observability, premium connectors (Pulumi Neo, Galileo enterprise, etc.).

**Reasoning:** OSS Governance Plane is the trojan horse — it makes us the *standard* for agent governance even at competitors. Closed Coordination Plane is the monetisation lever once tenants are running on our governance.

**Brand pattern:** Hashicorp's Terraform OSS + Terraform Cloud commercial. Postgres OSS + RDS commercial. Linux OSS + Red Hat commercial.

---

## 6. Naming proposals

Selection criteria:
- Short (≤2 syllables ideal, ≤3 acceptable).
- Evokes craftsmanship + workshop + machinery (not hype + AI + futurism).
- `.com` / `.ai` / `.dev` availability.
- Trademark / brand-collision risk acceptably low.
- Rolls off the tongue in Discord ("ratified by Atelier"), GitHub PR comments ("Atelier-agent[bot]"), CLI (`atelier dispatch`).

### 6.1 Candidate 1 — **Atelier** (lead recommendation)

- **Rationale:** French for "workshop / studio." A space where artisans work; the master ratifies; apprentices learn-by-doing. Maps perfectly to CEO + Architect + Worker.
- **Vibe:** craftsmanship, deliberate, considered, European, not AI-buzzy. Quiet authority.
- **Domain check:** `atelier.dev` likely available; `.com` possibly taken (check); `atelier.ai` possibly squatted. Brand: many small businesses use "atelier" — generic enough that none own it. **Trademark risk: low for the software/SDLC category.**
- **Recommended scope:** platform name. CLI: `atelier`. GitHub App: `atelier-agent[bot]`. Tagline candidate: *"the machine that builds the machines."* (Carry-over from CEO's framing.)
- **Risk:** word is widely recognised but not widely-used in tech. Slight pronunciation friction for non-French speakers (`/ˌæ.təˈljeɪ/`).

### 6.2 Candidate 2 — **Forge**

- **Rationale:** the place where raw material is shaped. Heat, pressure, intent. Forging code, forging specs, forging consensus.
- **Vibe:** muscular, industrial, opinionated, Anglo. Less considered than Atelier; more direct.
- **Domain check:** `forge.dev`, `forge.ai` heavily contested. `getforge.com`, `forgehq.com` candidates. Brand collision: Laravel Forge, GitForge, OpenForge, Drupal Forge, etc. — **trademark risk: high in dev-tools.**
- **Recommended scope:** strong second; use only if Atelier blocked.
- **Risk:** name is over-fished in dev tools; brand differentiation work would be heavy.

### 6.3 Candidate 3 — **Anvil**

- **Rationale:** the fixed surface upon which the smith hammers. Stability + intent + the ratification surface itself. Maps to Spec Plane + Governance Plane as the platform's anvil.
- **Vibe:** weighty, stable, tactile. Less active than Forge; more-permanent.
- **Domain check:** `anvil.works` taken (low-code tool), `anvil.dev` may be available, `anvil.ai` likely squatted. **Brand collision:** Anvil low-code Python platform exists — could create category confusion. **Trademark risk: medium-high.**
- **Recommended scope:** good name but blocked by existing Anvil. Don't pick.
- **Risk:** existing Anvil platform is in adjacent space (low-code app builder); confusion likely.

### 6.4 Candidate 4 — **Loom**

- **Rationale:** the device that interleaves threads into cloth. Maps to "interleaving multiple agents' work into a coherent codebase." Threading metaphor is rich (threads = sessions, weaving = coordination, fabric = monorepo).
- **Vibe:** quiet, organic, considered. Closer to Atelier than Forge.
- **Domain check:** `loom.com` taken (Loom video — major brand collision). `loom.dev` taken? `loomhq.com` possibly. **Trademark risk: very high — Loom video is a $1.5B+ company in adjacent productivity space.**
- **Recommended scope:** **DO NOT USE.** Brand collision is fatal.
- **Risk:** existing Loom dominates SERP; users will assume video.

### 6.5 Candidate 5 — **Bench**

- **Rationale:** workbench. The literal flat surface where a craftsperson works. Also "benchmark" — the platform measures itself. Also "the bench" (engineering bench) — the team.
- **Vibe:** plain, English, no pretense. Refreshing simplicity vs the AI-buzzword field.
- **Domain check:** `bench.dev` likely contested. `bench.com` taken (accounting). Brand collision: Bench accounting (US small business bookkeeping); Benchling (life sciences). **Trademark risk: medium.**
- **Recommended scope:** dark-horse candidate. If Atelier feels too European, Bench is the Anglo alternative.
- **Risk:** name is short and great but brand-collision SERP is messy.

### 6.6 Recommendation summary

| Rank | Name | Recommendation |
|---|---|---|
| 1 | **Atelier** | **Lead candidate.** Begin domain + trademark clearance immediately. |
| 2 | Forge | Strong fallback if Atelier blocked. |
| 3 | Bench | Dark-horse Anglo alternative. |
| 4 | Anvil | Blocked by existing Anvil. |
| 5 | Loom | Blocked by Loom video. |

**Tagline candidates** (rank-ordered):
1. *"the machine that builds the machines."* (carry-over from CEO framing — strongest)
2. *"specs in. ships out."*
3. *"governance for autonomous engineering."*
4. *"agentic SDLC, ratified by code."*
5. *"the workshop that runs itself."*

**Action items before naming-lock:**
- Clear `atelier.dev` and `atelier.com` (or alt `getatelier.com` / `atelierhq.com`).
- US trademark search (USPTO TESS) for "Atelier" in software class 9 + 42.
- GitHub Org availability check.
- Twitter/X handle availability.
- Pitch-test: 5 engineers, "what does Atelier mean to you?"

---

## 7. Recommended scope for planning phase

### 7.1 In-scope for v1 MVP (target: ship in 3–6 months)

The MVP is the **single-tenant on-prem deployment** of all three planes, sufficient for one external pilot tenant + LIMITLESS itself running on it (dogfood). Specifically:

**Governance Plane v1:**
1. GitHub App per-tenant identity (P0-4)
2. DR-001 author≠approver enforcement scaled to N apps (P0-4)
3. Three-mode autonomy taxonomy (P0-3) with per-spec/per-Architect/per-tenant cascade
4. Branch protection auto-config helper (lifts §1.2 of `governance.md`)
5. Per-tenant MCP allowlist registry (P0-8)
6. Living Retro template + auto-stub (P1-1)

**Spec Plane v1:**
1. Markdown + frontmatter schema (P1-6) — lint + validate
2. Spec drift pipeline (Spec Sync → Reconcile → Retro) (P0-1)
3. ROADMAP.md Kanban with WIP limits (P0-5)
4. Definition of Ready check before dispatch (P0-5)
5. Live docs site auto-gen from spec corpus (P2-1)

**Coordination Plane v1:**
1. CEO → Director → Architect → Worker topology (P0-6)
2. Postgres checkpointer for Architect sessions (P1-5)
3. Discord I/O surface (lifted from NanoClaw)
4. MCP-mediated inter-agent comms
5. AI-agent observability via one vendor (P0-7) — recommendation: **Langfuse** (OSS, self-host friendly)
6. Cycle-time / lead-time dashboards (P1-2)
7. Plan-approval-before-execute UI (P1-3) — gated by autonomy mode

**Cross-cutting v1 invariants:**
1. CI-rail-as-platform-invariant — every tenant app has lint/test/typecheck wired (P0-2)
2. 6-stage Architect Loop as documented contract
3. Section §5.1 + §5.5 ratification + attestation lifted as platform requirements

### 7.2 Explicitly out-of-scope for v1

- **Multi-tenant SaaS.** v1 is on-prem; SaaS is v2 (P3-1).
- **Multi-SCM** (GitLab, Azure DevOps, Bitbucket). GitHub-only for v1 (P2-8).
- **Multi-channel comms** (Slack, Teams). Discord-only for v1 (P3-2).
- **Greenfield-from-prompt** (Bolt/v0/Replit pattern). v1 is brownfield-only.
- **UI / design generation** (P2-3).
- **Compliance certifications** (SOC 2, HIPAA, FedRAMP) (P3-5).
- **Hosted control plane** (any kind). On-prem only.
- **Persona library** (P3-6) — defer to v2.
- **Cross-app API contract drift detection** (P2-6) — defer to v1.5 or v2.
- **LLM-vendor abstraction** (P3-4). Claude-first; GPT/Gemini in v2 if demanded.
- **A2A protocol** (A.4 implication 5) — monitor; ratify into v2 only if it gains traction.

### 7.3 Risk register (top 5)

**R-1 · GitHub ships an integrated coordination layer first.**
- **Probability:** medium-high (12-month window).
- **Impact:** existential.
- **Evidence:** A.3 §3.2 (gh-aw); A.2 §3.6 (Copilot AI Controls); B.1 GitHub at 87.91%-was-wrong-but-still-dominant.
- **Mitigation:** ship v1 fast (3–6 months); position as "multi-app coordinator above gh-aw" so we are *complementary* not *competitive* until we have moat. OSS Governance Plane is the moat.

**R-2 · MCP allowlist surface area blow-up.**
- **Probability:** medium.
- **Impact:** high (security + UX).
- **Evidence:** A.3 §3.2 (gh-aw allowlist registry pattern); A.2 §3.6 (Copilot allowlist).
- **Mitigation:** P0-8 with strict default-deny; per-tenant policy DSL borrowed from Spacelift OPA/Rego (A.5 §3.3); audit log for every allowlist mutation.

**R-3 · Director-tier coupling debt blocks multi-tenant.**
- **Probability:** high.
- **Impact:** medium-high.
- **Evidence:** C.1 §1 — Director appears in 11 of 12 phases. Lots of LIMITLESS-specific accretion.
- **Mitigation:** **dedicated refactor cycle** at start of v1 to extract project-agnostic Coordinator from OpenClaw Director. Don't try to make OpenClaw multi-tenant; build a new coordinator and keep OpenClaw as the LIMITLESS-tenant instance.

**R-4 · Bot-feedback-loop class incidents at multi-tenant scale.**
- **Probability:** medium (single-tenant); high (multi-tenant if not mitigated).
- **Impact:** high — credibility-killing.
- **Evidence:** `2026-04-22-bot-feedback-loop-incident.md`; C.1 §2 row 8 `⊘` on P7.
- **Mitigation:** DR-003 ratifies BEFORE multi-tenant SaaS; per-tenant Discord-server isolation (each tenant has own Discord, no cross-tenant channels); Director always Review-mode for ratification artefacts; observability (P0-7) catches loops early.

**R-5 · IaC governance gap (no Pulumi-Neo-equivalent for tenant infra).**
- **Probability:** high (we have nothing today).
- **Impact:** medium (P8 Deployment incomplete without it).
- **Evidence:** A.5 §3.2 (Pulumi Neo); C.1 §2.5 Infra Architect (only one with `▣` on P8).
- **Mitigation:** integrate Pulumi Neo as P1-7 partner integration; don't rebuild. v1 supports one IaC vendor; v2 multi.

**Honourable mention risks** (rank 6–10):
- R-6 · Naming clearance (trademark / domain) for Atelier blocks brand launch.
- R-7 · LLM vendor pricing shock (Anthropic / OpenAI raises rates 2–5×) breaks tenant cost models.
- R-8 · Spec drift pipeline false-positive rate too high → tenants ignore drift signals → silent rot.
- R-9 · MAF subsumes LangGraph patterns and pulls ecosystem mass — we've bet on the wrong substrate.
- R-10 · Per-tenant on-prem is too high-touch to scale; pilots stall on install friction.

### 7.4 Open questions for CEO (before scoping commits)

**OQ-D1-1 · Single-tenant on-prem vs SaaS — both, or one first?**
- **Recommendation:** both, sequenced. v1 single-tenant on-prem; v2 SaaS multi-tenant.
- **Why ask:** scope discipline. SaaS adds 6+ months, multi-tenant risk class, observability/billing surface.

**OQ-D1-2 · OSS-vs-closed for each plane.**
- **Recommendation:** Governance OSS, Spec OSS, Coordination dual-licensed (per §5.8).
- **Why ask:** monetisation strategy diverges sharply by plane choice.

**OQ-D1-3 · How much of LIMITLESS history is in-scope as seed corpus?**
- **Recommendation:** import the full 7-month spec corpus + DR records as the *reference tenant* — useful for dogfood and as an example tenant for prospects. Don't import the host-side memory (unstable, LIMITLESS-personal).
- **Why ask:** governance question — is LIMITLESS a tenant-of-platform or co-equal seed?

**OQ-D1-4 · Do we own the Spec Plane DSL?**
- **Recommendation:** yes — Markdown + frontmatter, no YAML/JSON spec dialect. Interop with Spec Kit's Markdown but our schema diverges in the frontmatter.
- **Why ask:** owning the DSL is platform power; co-opting Spec Kit's is humbler/faster.

**OQ-D1-5 · Which plane ships first as beta?**
- **Recommendation:** Governance → Spec → Coordination. Governance Plane is the smallest, the most reusable, the most credibility-building. Spec Plane is next (drift pipeline lands). Coordination Plane is largest and last.
- **Why ask:** sequencing affects revenue path, dogfood depth, marketing narrative.

**OQ-D1-6 · MAF or LangGraph as Coordination Plane substrate?**
- **Recommendation:** **LangGraph** (OSS, vendor-neutral, mature checkpointer, no-vendor-lock).
- **Why ask:** MAF is tempting (Microsoft-distributed, one phone call away from enterprise sales) but vendor-lock + roadmap-capture risk.

**OQ-D1-7 · Naming — Atelier?**
- **Recommendation:** yes; begin clearance.
- **Why ask:** naming-lock unblocks brand work, GitHub Org, domains.

**OQ-D1-8 · Pricing model for v1 on-prem.**
- **Recommendation:** v1 is OSS-default; commercial license tier for tenants who want hosted observability + premium connectors. Per-Architect-per-month metering; tenant-scale floor pricing.
- **Why ask:** pricing is downstream of OSS-vs-closed but worth ratifying early.

**OQ-D1-9 · Reference tenant strategy — LIMITLESS only, or LIMITLESS + 1 external pilot?**
- **Recommendation:** LIMITLESS + 1 external pilot. Pilot finds the project-agnostic gaps LIMITLESS-only would miss.
- **Why ask:** affects scoping (multi-tenant earlier than v2 if pilot demands it).

**OQ-D1-10 · DR-003 ratification timing — before or during v1?**
- **Recommendation:** BEFORE v1. The bot-feedback-loop incident is unmitigated until DR-003. Building v1 on unmitigated substrate inherits the risk into every tenant.
- **Why ask:** schedule blocker; CEO sign-off needed.

---

## 8. Decision matrix for CEO

A single table summarising the major recommendations + alternatives. Each row: a decision; the recommendation; the alternatives; the cost of choosing differently.

| # | Decision | Recommendation | Alternatives | Cost of alternative |
|---|---|---|---|---|
| 1 | **Platform name** | Atelier | Forge / Bench | Forge: brand collision in dev tools; rebrand cost. Bench: SERP messiness. |
| 2 | **Tagline** | "the machine that builds the machines" | "specs in. ships out." / "agentic SDLC, ratified by code." | Lose CEO-framing carry-over; reduce internal cohesion. |
| 3 | **Three-plane decomposition** | Governance + Spec + Coordination, ship-able independently | Single monolithic platform | Slower TTM; harder to OSS subset; harder partner story. |
| 4 | **Multi-tenancy model** | v1 single-tenant on-prem; v2 SaaS | v1 SaaS straight away | +6 months TTM; multi-tenant risk multiplier (§7.3 R-4). |
| 5 | **OSS strategy** | Governance OSS, Spec OSS, Coordination dual-licensed | Full closed / full OSS | Closed: lose ecosystem leverage. OSS: lose monetisation lever. |
| 6 | **Coordination substrate** | LangGraph | MAF / CrewAI / build-our-own | MAF: vendor lock + roadmap capture. CrewAI: less mature checkpointer. Build-own: 6+ extra months. |
| 7 | **Spec format** | Markdown + frontmatter, our schema; interop Spec Kit | Adopt Spec Kit verbatim / YAML DSL / JSON DSL | Spec Kit: lose differentiation. YAML/JSON: fight Markdown ergonomic mass. |
| 8 | **Identity primitive** | GitHub App per-tenant (DR-001 lifted) | Personal access token / OAuth User / SAML | PAT: not author-attributable. OAuth User: not bot. SAML: enterprise-only. |
| 9 | **Autonomy modes** | Three-mode (Review/Balanced/Auto) per Pulumi Neo | Two-mode (manual/auto) / N-mode | Two-mode: too coarse. N-mode: cognitive overhead, paralysis. |
| 10 | **Observability vendor (v1)** | Langfuse (OSS, self-host) | LangSmith (LangChain) / Galileo (Cisco) / build-our-own | LangSmith: vendor-lock to LangChain stack. Galileo: post-Cisco roadmap unknown. Own: 3+ months of yak-shaving. |
| 11 | **IaC plug-in (v1)** | Pulumi Neo (default) | Terraform AI / Spacelift / build-our-own | Terraform: post-IBM roadmap risk. Spacelift: codeless mismatch. Own: out of scope. |
| 12 | **AI coding substrate** | Multi (Claude Code, Cursor, Copilot — tenant choice) | Single (Claude Code only) | Single: alienates Cursor/Copilot shops; lose pilot prospects. |
| 13 | **Communication surface (v1)** | Discord-first | Slack-first / Teams-first / multi from day 1 | Slack/Teams-first: rebuild NanoClaw IPC. Multi day 1: 2–3× scope. |
| 14 | **DR-003 timing** | Ratify BEFORE v1 work begins | Ratify during v1 | Inherit bot-feedback-loop risk into every tenant. |
| 15 | **First plane to ship beta** | Governance | Spec / Coordination | Spec: less credibility-building alone. Coordination: too large to ship first. |
| 16 | **Reference tenants** | LIMITLESS + 1 external pilot | LIMITLESS only / 3+ pilots | LIMITLESS-only: miss project-agnostic gaps. 3+: scaling stress before ready. |
| 17 | **Pricing model** | OSS default + commercial tier (hosted observability + premium connectors) | Pure OSS / pure commercial | Pure OSS: no monetisation. Pure commercial: lose ecosystem trojan-horse. |
| 18 | **Multi-SCM (v1)** | GitHub-only | Multi-SCM v1 | +3–4 months for GitLab/Bitbucket parity; identity primitive shifts. |
| 19 | **Spec drift pipeline** | Build (P0-1, lift Spec Kit pattern) | Adopt Spec Kit verbatim / skip for v1 | Skip: silent spec rot. Verbatim: lose schema differentiation. |
| 20 | **Director-tier refactor** | Dedicated extraction cycle at v1 start | Make OpenClaw multi-tenant in place | In-place: 11/12 phases of accretion to unwind incrementally — high regression risk. |

---

## 9. Citations

### 9.1 Internal (monorepo bind-mount)

- `docs/superpowers/reports/research/A.1-spec-driven-development-2026-04-27.md`
- `docs/superpowers/reports/research/A.2-agentic-coding-engines-2026-04-27.md`
- `docs/superpowers/reports/research/A.3-agentic-workflow-platforms-2026-04-27.md`
- `docs/superpowers/reports/research/A.4-multi-agent-orchestration-2026-04-27.md`
- `docs/superpowers/reports/research/A.5-agentic-iac-devops-2026-04-27.md`
- `docs/superpowers/reports/research/B.1-industry-baseline-amendments-2026-04-27.md`
- `docs/superpowers/reports/research/C.1-internal-fleet-capability-map-2026-04-27.md`
- `docs/superpowers/reports/research/C.2-workflow-vs-industry-methodologies-2026-04-27.md`
- `docs/superpowers/reports/AgileSDLCToolsAndPlatformsReport.md` (industry baseline)
- `docs/superpowers/specs/2026-04-05-autonomous-agentic-division-design.md`
- `docs/superpowers/specs/2026-04-05-division-v2-federated-architecture.md`
- `docs/superpowers/specs/2026-04-18-agentic-sdlc-governance.md`
- `docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md`
- `docs/superpowers/specs/2026-04-21-pm-system-selection.md`
- `docs/superpowers/specs/2026-04-22-bot-feedback-loop-incident.md`
- `docs/superpowers/specs/2026-04-23-pr73-regression-audit-and-strategy-review.md`
- `docs/superpowers/specs/2026-04-25-sdk-contract-proxy-as-interop-layer.md`
- `docs/decisions/DR-001-agent-identity-and-ratification-flow.md`
- `docs/decisions/DR-002-nanoclaw-source-of-truth-and-deployment.md`

### 9.2 External (aggregated from inputs A.1–A.5 + B.1)

External citations are aggregated by-reference from each input's §6 Citations section; consult the input files for full URLs + access dates. Key 2026 sources surfaced across inputs:

- BMAD method v6.5.0 GitHub repository (A.1)
- GitHub Spec Kit v0.8.1 — github.com/github/spec-kit (A.1)
- Amazon Kiro launch blog — aws.amazon.com (A.1)
- Atlassian Rovo Dev GA announcement (A.1)
- Cursor Cloud agents documentation — cursor.sh (A.2)
- Cognition Devin documentation — cognition.ai (A.2)
- Anthropic Claude Code subagents documentation — docs.anthropic.com (A.2)
- Sourcegraph Amp / Cody documentation — sourcegraph.com (A.2)
- JetBrains Junie launch blog — blog.jetbrains.com (A.2)
- GitHub Copilot AI Controls + `actor_is_agent` — docs.github.com (A.2)
- GitHub Next ACE preview — githubnext.com (A.3)
- GitHub Agentic Workflows (gh-aw) technical preview — github.com/githubnext/gh-aw (A.3)
- Bolt.new — bolt.new (A.3)
- v0.dev Vercel — v0.dev (A.3)
- Overcut.ai documentation (A.3)
- Replit Agent 3 launch — blog.replit.com (A.3)
- CrewAI documentation — docs.crewai.com (A.4)
- Microsoft Agent Framework v1.0 GA announcement (2026-04-03) — microsoft.com (A.4)
- LangGraph documentation — langchain-ai.github.io/langgraph (A.4)
- LangChain 2026 State of Agent Engineering report (A.4)
- Semantic Kernel → MAF migration guide (A.4)
- HashiCorp Terraform AI / Project Infragraph — hashicorp.com (A.5)
- Pulumi Neo — pulumi.com/neo (A.5)
- Spacelift Stacks AI / Intent — spacelift.io (A.5)
- AWS Q Developer + Agent Plugins for AWS — aws.amazon.com (A.5)
- IBM-HashiCorp acquisition close (2026-02-27) — ibm.com news (A.5)
- OpenAI-Statsig acquisition (Sept 2025) — openai.com (B.1)
- Cisco-Galileo intent-to-acquire (2026-04-09) — cisco.com news (B.1)
- Harness-Split.io acquisition (May 2024) — harness.io (B.1)
- Scrum Guide 2020 — scrumguides.org (C.2)
- Kanban (Anderson 2010) — book reference (C.2)
- Extreme Programming Explained 2nd ed. (Beck 2004) — book reference (C.2)
- SAFe 6.0 — scaledagile.com (C.2)
- Model Context Protocol (MCP) specification — modelcontextprotocol.io (multi-input)
- A2A protocol working group references (A.4)

### 9.3 Citation hygiene note

Per the common-context constraint (00-COMMON-CONTEXT.md §Citations), each input file owns its own §6 Citations with full URL + access date + title; this synthesis aggregates **by-reference**. To reconstitute a flat-file citation list, concatenate the §6 sections of the 8 inputs.

---

## Appendix A — synthesis methodology

This synthesis was produced in a single pass across all 8 inputs (A.1, A.2, A.3, A.4, A.5, B.1, C.1, C.2 — total 2236 lines, ~210 KB of source material) on 2026-04-27 by the Infra Architect role (Claude Opus 4.7) running in the NanoClaw container. Inputs were read in parallel; synthesis was structured per the D.1 dispatch template's 9 required sections; cross-references between inputs were tracked inline (e.g., "per A.3 §3.2, ..."). Contradictions between inputs (per dispatch §"Approach" instruction) were limited; the most notable was A.4's view of orchestration substrate (LangGraph-favoured) vs B.1's view of phase 9 observability (Galileo+Langfuse+LangSmith plurality) — resolved in §5.5 by recommending LangGraph for substrate + Langfuse for observability (different layers, no actual conflict).

## Appendix B — what's NOT in this synthesis

Per the analysis-only constraint (`feedback_governance_determinism_primacy.md` per common-context §Constraints), this dispatch:
- Does not modify code in the monorepo.
- Does not open PRs.
- Does not run write operations against any external system.
- Does not produce a name-clearance verdict (domain + USPTO check is an operational follow-up — see §6.6 action items).
- Does not produce a precise effort estimate for v1 MVP — effort classes (days/weeks/months) only, per gap-list convention §4.

## Appendix C — synthesis-time honest gaps

- **Host-side memory not in bind-mount.** `MEMORY.md`, `feedback_*.md` series, `project_*.md` arc files were not present in the monorepo; reasoning relied on the inputs that themselves cite host-side memory (especially C.1 §5 OQ-C1-1 through OQ-C1-7 and C.2 §5 OQ-C2-1 through OQ-C2-7).
- **No firsthand testing of any A.1–A.5 player.** All claims about external players are sourced from the input files' web research; we have not directly tested BMAD, Spec Kit, Kiro, Rovo Dev, Cursor cloud agents, Devin, Junie, Amp, Copilot AI Controls, gh-aw, Bolt, v0, Overcut, Replit Agent 3, CrewAI, MAF, LangGraph, Terraform AI, Pulumi Neo, Spacelift, or Q Developer.
- **Pricing assumptions.** Tier pricing for §7 / decision row 17 is recommendation-only; market validation pending.
- **Naming clearance not performed.** §6 candidates are unclear on USPTO + domain status; action items listed §6.6.
- **No CEO / external-tenant interview data.** OQ-D1-3 (LIMITLESS-as-tenant), OQ-D1-9 (pilot strategy), and the v2 multi-tenant timing all hinge on inputs we don't have.

These gaps are tractable — each is closable by a follow-up dispatch + one or two operational tasks. None block the planning-phase kickoff.

---

*End of D.1.*
