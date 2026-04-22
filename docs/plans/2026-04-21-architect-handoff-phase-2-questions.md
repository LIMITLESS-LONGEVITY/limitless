# Architect Handoff — CEO Questions on Phase 2 Readiness Report

**Date filed:** 2026-04-21
**Filed by:** Director (on CEO directive)
**Target agent:** LIMITLESS main-ops Architect (#main-ops)
**Status:** DRAFT — awaiting CEO approval before Discord dispatch
**Expected deliverable:** single ratifiable PR against `LIMITLESS-LONGEVITY/limitless` with governance/plan docs that answer all four topics
**Do NOT implement code changes.** This handoff is research + analysis + proposal only.

---

## Context the Architect needs

On 2026-04-21 the Director produced `docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md` — a comprehensive framework status report ahead of onboarding the MYTHOS collaborator `@aradSmith`. The CEO reviewed the report and wrote a response in `docs/superpowers/specs/SDLC phase 2 readiness report questions.md` raising four categories of concerns that the readiness report did NOT address (or addressed only superficially).

Before the CEO greenlights Phase 2 (active co-development with a second human), these four gaps must be closed. Each one is a request for **research → gap analysis → proposal**, not implementation. Every deliverable below is a document that the CEO ratifies by squash-merging a PR.

**Framework reminders:**
- Governance spec v1.2 is on main: `docs/superpowers/specs/2026-04-18-agentic-sdlc-governance.md`
- DR-001 (agent identity) and DR-002 (NanoClaw SoT) ratified — see `docs/decisions/`
- DR-001 Phase 3 is the only unresolved audit gap; interim workaround (Comment-review + `RATIFIED`) still active
- All 3 repos have CODEOWNERS + PR templates. Branch protection not yet applied by design.
- Per-app Architect scope model: each Architect owns ONE app deeply (see `2026-04-05-division-v2-federated-architecture.md`)

**Relevant project memory (summarised for the Architect):**
- Director-vs-Architect comparison experiment was run on 2026-04-04 for MYTHOS docs: Architect produced implementation-ready 1,260 lines (scored 8.5/10); Director produced 507-line overview (scored 7/10). Factor this prior result into Topic 2's methodology — don't rerun it, build on it.
- OpenClaw Director currently runs `openai-codex/gpt-5.4` via ChatGPT Plus subscription OAuth JWT (switched 2026-04-18 from `openai/gpt-4o` API key). This model choice affects Topic 2's assessment.
- GitLab+Jira adoption impact assessment already landed as PR #54 on 2026-04-21 — start from that document; don't duplicate the research.

---

## Output contract (what "done" looks like)

Deliver ONE PR that includes the following files. Each file answers one topic end-to-end. Do not split into multiple PRs — the CEO wants to ratify this as a single review pass.

| Topic | File to author | Approximate length |
|---|---|---|
| 1 — Agent setup + config process | `docs/superpowers/specs/2026-04-XX-agent-config-governance.md` | Medium (spec with process + file inventory + versioning proposal) |
| 2 — OpenClaw Director validation | `docs/plans/2026-04-XX-director-validation-plan.md` | Long (structured stress-test plan + gate criteria) |
| 3 — PM system for the agentic SDLC | `docs/superpowers/specs/2026-04-XX-pm-system-selection.md` | Long (options analysis + recommendation) |
| 5 — Human-friendly onboarding documentation roadmap | `docs/plans/2026-04-XX-human-onboarding-docs-roadmap.md` | Short-to-medium (roadmap of future PRs, not the docs themselves) |

Substitute the real date when filing. Use the PR template already on main.

PR title (proposed): `docs: Phase 2 readiness — agent config governance + Director validation + PM system + onboarding docs roadmap`

Include a combined ratification checklist at the bottom of the PR body — CEO wants to approve the whole set atomically.

Do NOT make any changes outside `docs/`. Do NOT touch `apps/nanoclaw/`, `infra/`, or CI workflows in this PR.

---

## Topic 1 — Agent Setup and Config: Process, Inventory, Versioning

### What the CEO asked

> How were the different settings for the Architects arrived at? What process led to our method of setting up an agent like the Architect? What have we based our different md files for each agent on? Was it specific to Anthropic models? Was it model-agnostic? Did we put in comparison metrics to figure out what works best? Did we make sure this process is ongoing since agents' setup and config is an evolving process that is also tied to new model releases (as well as changes made to coding harnesses and other relevant tech)? Did we codify this process so it too is versioned and auditable and is constantly updated and evolved? Do we have a system to track all the files determining the settings of each agent (e.g. Architect, workers, sub-agents, etc.)? Which files in our documentation document all the above topics?

### What the deliverable must contain

1. **Current-state audit (evidence-based; cite files):**
   - Inventory every file that influences Architect/agent behavior. At minimum investigate: `apps/nanoclaw/groups/discord_{app}-eng/CLAUDE.md` (all 5), `apps/nanoclaw/src/config.ts`, `apps/nanoclaw/src/container-runner.ts` (env injection), the system prompts baked into Claude Code itself, `settings.json` per agent, OpenClaw `SOUL.md` / `IDENTITY.md` / `USER.md` / `TOOLS.md` / `HEARTBEAT.md` / `MEMORY.md`, and any `.env` values that affect agent capabilities (ANTHROPIC_MODEL, MAX_THINKING_TOKENS, TRUSTED_BOT_IDS, etc.). The Architect has read access to the monorepo — read them.
   - For each file: what does it control, who authored the current contents, what (if any) rationale is documented for specific settings choices.
   - Describe the actual historical process that produced each file — was it iterative ad-hoc tuning, was it benchmark-driven, was it copied from a reference, was it CEO-dictated?
   - Explicitly answer: model-specific vs model-agnostic. Cite evidence.
   - Explicitly answer: were comparison metrics used? Where are those metric records? If none exist, say so clearly.

2. **Gap analysis:**
   - What's missing for a system that can evolve with each model release (Claude 4.7 → 4.8 → 5.0; Opus → Sonnet → Haiku rebalancing; thinking-tokens defaults; prompt-caching behavior; Agent SDK version bumps; Claude Code harness updates).
   - What's missing for harness-side evolution (e.g., Claude Code feature releases, new skills, hook-system changes).
   - What's missing for reproducibility — if someone has to recreate an Architect from scratch tomorrow, what doesn't exist?

3. **Proposed ongoing governance process:**
   - A versioned, auditable workflow for reviewing/updating agent configuration on a cadence (e.g., quarterly and on every major model release).
   - A proposed **Agent Configuration Registry** — structured file inventory (machine-readable where possible; YAML/JSON manifest listing every agent, the files that define it, the model, thinking budget, tools, mounts, and last-reviewed date) living in `docs/` or `apps/nanoclaw/agents/`.
   - A proposed **Decision Record pattern** for config changes (parallel to DR-001/DR-002 — e.g., "DR-CFG-NNN: change Architect X from model Y to model Z, rationale, benchmark evidence").
   - A proposed **benchmarking protocol** — concrete task suite the Architect runs on every model/harness upgrade to catch regressions. Start with 3–5 representative tasks per Architect; ratchet up later.
   - Integration with the existing governance spec — does this become §13 of the spec, or a standalone DR, or its own spec document? Recommend one and justify.

4. **Documentation index:**
   - Explicit map of which existing docs touch this topic today (likely: governance spec §8 attribution, `project_agentic_infrastructure.md` memory file, individual CLAUDE.md files) and which ones need to be created.

### Non-goals for Topic 1

- Do not change any agent configuration in this PR. This is a meta-governance deliverable.
- Do not benchmark models right now. Propose the protocol; the benchmarks run as a follow-up handoff.

---

## Topic 2 — OpenClaw Director Validation Before Workflow Integration

### What the CEO asked

> The Director is currently not integrated into our workflow. While we have set it up in practice, the current workflow is Human CEO → NanoClaw Architect. This is a pre-governance-spec habit. Before we start using the Director as per our new specs we need to make sure it is indeed up to the task. The NanoClaw Architect has a proven track record (tested multiple times by comparing its work to Claude Code Opus 4.6 / 4.7 running on the local dev machine). The same has NOT been done for the Director. Before integration we must (a) answer the same questions from Topic 1 applied to the Director, and (b) stress-test and peer-review its performance using the same methodology.

### What the deliverable must contain

1. **Current Director state audit (parallel to Topic 1):**
   - All OpenClaw Director configuration files: `SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`, `MEMORY.md` on VPS-1 at `/home/limitless/.openclaw/workspace/`. Ask the CEO to paste the current contents via Discord if the Architect cannot read them directly through its mounts.
   - Gateway config: agent bindings (`agents add`, `agents bind`), channel allowlist, `allowBots: true`, `requireMention: false`, `models.providers.openai-codex` setup, `controlUi.dangerouslyAllowHostHeaderOriginFallback: true`.
   - Current LLM: `openai-codex/gpt-5.4` via ChatGPT Plus subscription OAuth JWT (auth source: `~/.codex/auth.json`). NOT an API-key flow — specifically a Codex Responses API flow that requires JWT with `chatgpt_account_id`.
   - Document the same process-origin question: how were these settings arrived at, and by whom.

2. **Stress-test + peer-review plan:**
   - A concrete list of representative tasks the Director should be asked to perform end-to-end, matching how we tested the Architect. Suggested categories:
     - Decomposition: given a vague CEO goal ("ship Garmin integration by June"), break into app-level tasks and dispatch to the correct Architect channels.
     - Cross-app coordination: given a merged PR with an API-contract change, identify downstream affected apps and post follow-up dispatches.
     - Memory discipline: over multiple days, does MEMORY.md remain coherent and not self-contradict?
     - Escalation behavior: when an Architect reports failure, does the Director escalate appropriately (retry with more context, route to different Architect, page the CEO)?
     - Cron-driven maintenance: daily briefing, health check, PR triage — does it actually fire and produce useful output, or cause alert fatigue?
   - For each task: a success criterion the Architect can judge objectively, plus a side-by-side comparison with how a Claude Code local Opus 4.7 session would have handled the same prompt.
   - Explicit reference to the 2026-04-04 MYTHOS docs experiment (Architect 8.5/10 vs Director 7/10) — factor that prior result into the new protocol; don't repeat it verbatim.

3. **Model choice re-examination:**
   - Given the current `openai-codex/gpt-5.4` configuration, is that the right model for the Director role? Compare characteristics: persistence, cost (ChatGPT Plus subscription is flat-rate), reasoning depth on decomposition tasks, multi-channel orchestration quality. Would a Claude Opus 4.7 or Sonnet 4.6 configuration perform better? Would it be cheaper to use different models for different Director sub-tasks (decomposition vs routine cron work)? Propose a recommendation.
   - If a model change is proposed, call out the Codex-CLI-subprocess gotcha: setting `OPENAI_API_KEY` in the gateway env causes Codex CLI to auto-revert `auth.json` to apikey mode, disabling subscription billing. Any reconfiguration must preserve the OAuth-JWT path.

4. **Gate criteria for integration:**
   - A crisp checklist the CEO can evaluate before flipping from "Human CEO → NanoClaw Architect (current)" to "Human CEO → Director → NanoClaw Architect (new spec)".
   - Must include: which behaviors are must-pass (no regressions on representative decomposition tasks) and which are nice-to-have (auto cross-app coordination per §5 of v2 spec).
   - Must specify rollback procedure if Director performs worse than direct CEO → Architect dispatch.

### Non-goals for Topic 2

- Do not execute the stress tests in this PR. Propose them; the CEO decides when to run them.
- Do not change OpenClaw config. Propose changes as separate follow-up DRs.

---

## Topic 3 — Project Management System for the Agentic SDLC

### What the CEO asked

> Are we using Jira? If so how? Are humans (Director, Architect-human-in-loop) opening Jira tickets for agents and do agents use Jira themselves? If we're not using Jira what are we using instead? Is the human only using Discord + GitHub to replace the whole Jira workflow? Will this be enough for complex development projects?
>
> Context: Agentic SDD treats specs as executable artifacts and "version control for your thinking." Spec is the code; velocity negates rigidity; recursive iteration on architecture not source. We're moving from Vibe Coding to Architectural Determinism where the developer role shifts from line-by-line implementer to high-level system orchestrator. The question is how our agentic SDLC integrates the components of the pre-agentic SDLC into it.

### What the deliverable must contain

1. **Current state audit:**
   - Are we using Jira right now? Answer: likely NO beyond the `JIRA: MYTHOS-47` convention reserved in governance spec §6.3 — confirm this.
   - Read PR #54 (`docs(specs): GitLab + Jira adoption impact assessment for MYTHOS`) merged 2026-04-21 — this is directly relevant. Summarize its findings and build on them (don't duplicate).
   - Inventory what we actually use today as a PM surface: Discord channels (#main-ops, #handoffs, #workers, #humans, #paths-eng, #cubes-eng, #hub-eng, #dt-eng, #infra-eng, #mythos-eng), GitHub Issues (if any), GitHub Projects, `docs/plans/`, `docs/superpowers/specs/`. Identify which artifact types we use for which PM function (task intake, prioritization, sprint planning, retro, dependency tracking, cross-team visibility).

2. **Framing — integrate, don't transplant:**
   - The CEO's framing is correct: the pre-agentic SDLC had phases (requirements → design → implementation → test → deploy) each mapped to Jira ticket types + workflows. In an agentic SDLC, the implementation phase is a runtime execution (minutes). The bottleneck is architecture and intent.
   - Produce a table mapping each traditional PM function to: (a) what the agentic flow actually needs, (b) what artifact carries it in our stack today, (c) where the gap is.

3. **Options analysis:**
   - **Option A — Jira (or Linear equivalent):** full Agile stack, human-first UI, requires agents to have Jira API access + convention enforcement. Pro: familiar to incoming human collaborators. Con: agents doing ticket hygiene is operationally expensive and can drift from the PR reality.
   - **Option B — GitHub-native (Issues + Projects + Milestones):** use GitHub's built-in surface. Pro: single-pane-of-glass with code + PRs + CI; no extra auth; MiFID II audit already lives here. Con: weaker on cross-repo dependency graphs and sprint mechanics.
   - **Option C — Spec-as-source-of-truth (Spec-Driven Development):** specs in `docs/superpowers/specs/` + DRs are the primary artifact; PRs implement them; tickets don't exist. Pro: matches the CEO's SDD framing; spec is the code. Con: weaker visibility for humans who think in ticket queues; needs something to surface what's "active" vs "done".
   - **Option D — Hybrid:** GitHub Issues/Projects as a lightweight ticket surface + specs-as-SoT for *content* + Discord as dispatch bus. Each surface has a narrow role.
   - Evaluate all four against: human-collaborator ergonomics (Arad must be able to open/track tickets), agent-ergonomics (cheap for Architect to read/write), MiFID II audit impact, scale to multi-project + cross-team dependencies, cost.

4. **Recommendation + roadmap:**
   - Propose ONE option (or a staged adoption path if Option D splits across phases).
   - Define concrete agent ↔ PM-system integration points: does the Architect open tickets? Does the Director close them when PRs merge? How do failures escalate?
   - Propose governance-spec amendment if needed (likely a new §13 or a v1.3 amendment covering PM system choice).

5. **SDD implications to address explicitly:**
   - Planning Layer — does our stack have DAG-of-tasks decomposition today, and who owns it (Director? Architect?)?
   - Context/Memory Management — how the chosen PM system interacts with MEMORY.md / project memory / per-Architect notepads.
   - Constraint Enforcement — how the PM system surfaces governance violations.
   - Self-Healing / Drift Detection — is spec-to-code drift observable in the chosen PM system?

### Non-goals for Topic 3

- Do not provision any PM tooling. Don't create Jira workspaces or GitHub Projects. Recommend; CEO ratifies; then a separate handoff implements.

---

## Topic 5 — Human-Friendly Onboarding Guide Roadmap

*(CEO's numbering skipped 4; preserve "Topic 5" in deliverable filenames to match their document.)*

### What the CEO asked

> Now that we are about to onboard a new dev team, they will need human-friendly guides/manuals to our framework explaining for example our Governance spec (branch protection, review model, CODEOWNERS, MiFID II retention, PR templates, merge strategy, onboarding, etc.), step-by-step explanations for our Ratification mechanism and flow, and any other workflow. Only do this AFTER we've finished preparing the framework and are ready to fully onboard. But this should be planned and inserted into the PR roadmap right now.

### What the deliverable must contain

This is the lightest of the four deliverables — it is a **roadmap**, not the docs themselves.

1. **Inventory of workflows that need human-readable documentation:**
   - Read the governance spec and list every workflow a new human will encounter in their first 30 days: CODEOWNERS semantics, PR template fields (especially the ratification checklist), commit message conventions, branch naming, squash-merge rules, signed-commits setup (MYTHOS), emergency-direct-merge protocol (mythos-ops), how to open a Decision Record, how to dispute a design call, Discord channel etiquette, agent dispatch conventions, safety-critical path restrictions, CI status-check interpretation, secret-scanning rules.
   - Cross-reference with the 5 multi-human workflow decisions (Q1–Q5) from the Phase 2 Readiness Report §6.1 — several of those have answers that must land in the onboarding docs.

2. **Proposed doc structure:**
   - Recommend a location (e.g., `docs/handbook/` or `docs/onboarding/` in the LIMITLESS monorepo; or per-repo `CONTRIBUTING.md` + a central handbook).
   - Recommend a reading order — what does a new collaborator read on day 1, day 7, day 30.
   - Recommend tone and length guidelines (these are for humans, not specs — prefer step-by-step + screenshots over formal prose).

3. **Roadmap of PRs (the actual deliverable):**
   - For each doc, specify: title, target path, rough outline (bullet-level), dependencies on which framework-work-in-progress items must complete first (e.g., "CONTRIBUTING.md for MYTHOS cannot land until Q1–Q5 are answered by CEO"), estimated length.
   - Order them by readiness: earliest candidates are docs that only reference already-ratified material; later candidates depend on DR-001 Phase 3 landing, branch protection being applied, etc.
   - Deliver as a checklist the CEO can tick off as PRs land.

4. **Explicit timing statement:**
   - Confirm the CEO's framing: no onboarding-guide PR merges until the framework is Phase-2 ready. But the roadmap itself lands now so that the docs get written in parallel with the remaining technical-readiness work.

### Non-goals for Topic 5

- Do not write the guides themselves in this PR. This handoff is roadmap-only.
- Do not duplicate the governance spec. The guides are human translations, not re-specs.

---

## Constraints, process, and reporting

### Constraints

1. **Research + propose only.** Every deliverable is a document. No code, no config changes, no new PRs outside this single deliverable PR.
2. **Cite evidence.** When making claims about current state, cite the file path and line range. Use `origin/main` via `gh api` — not local working trees (per `feedback_origin_main_over_local_tree.md`).
3. **Flag unknowns explicitly.** Any claim the Architect cannot verify goes under an "Open Questions" section with a specific owner (CEO / Director / future handoff) and a concrete closing action. Per `feedback_flag_unknowns.md`.
4. **Match depth to document type.** These are strategic documents the CEO will use to make greenlight decisions — be thorough, don't skim. Per `feedback_depth_matching.md`.
5. **Integrate with existing framework.** Any proposal must name whether it's a new spec, a governance-spec amendment (v1.3?), a new DR, or a plan. Don't invent a parallel track.
6. **Cross-reference.** The four topics have overlaps (e.g., Topic 1's benchmark protocol is consumed by Topic 2's Director validation; Topic 3's PM system choice may touch Topic 5's onboarding docs). Call out dependencies explicitly.

### Process

1. Investigate in order: Topic 1 → Topic 2 → Topic 3 → Topic 5 (they have forward dependencies in that order).
2. Before writing the proposal sections, post a short (≤ 150-word) plan to `#main-ops` confirming scope and any constraint clarifications the Architect needs. Wait for Director/CEO confirmation before drafting the PR.
3. Produce all four documents in a single branch. Draft PR first (marked "DRAFT" in title) with all four files. Director reviews; iteration happens in PR comments.
4. When Architect considers the PR ready for CEO ratification, un-draft it. The Director announces in #handoffs.

### Reporting

Post end-of-task report to `#main-ops` with:
- Branch + PR link
- One-sentence summary per topic ("Topic 1 = proposed new Agent Configuration Registry under `apps/nanoclaw/agents/manifest.yaml` + quarterly review DR pattern; see spec-XX.md §3")
- Open Questions list consolidated across all 4 topics
- Estimated CEO review time (calibration: the Phase 2 Readiness Report was ~690 lines; this deliverable will likely be longer)

### Attribution reminders

Every commit in this PR body ends with:

```
Authored-by-agent: LIMITLESS main-ops Architect
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

PR template ratification checklist must be fully ticked or N/A-marked. No skipped items.

---

## Priority + escalation

**Priority:** high but not urgent. Phase 2 greenlight is pending this work AND the remaining DR-001/DR-002 technical readiness. Both tracks run in parallel — don't rush this at the cost of quality.

**Escalation triggers:**
- If any topic requires changes to OpenClaw Director config that can't be made safely by the Architect, escalate to Director (me) via #handoffs before proposing.
- If any topic reveals a gap in a **ratified** governance document (spec v1.2, DR-001, DR-002), do not silently fix it — call it out as an Open Question and propose a DR.
- If the Architect's research finds that one of the Phase 2 Readiness Report's claims is wrong, call it out explicitly. The readiness report is not canonical — the governance spec is.

---

## Source documents the Architect should start with

| Document | Location | Why it matters |
|---|---|---|
| CEO's questions | `docs/superpowers/specs/SDLC phase 2 readiness report questions.md` | The ground truth for this task |
| Phase 2 readiness report | `docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md` | Context the CEO is responding to |
| Governance spec v1.2 | `docs/superpowers/specs/2026-04-18-agentic-sdlc-governance.md` | The framework being governed |
| DR-001 | `docs/decisions/DR-001-agent-identity-and-ratification-flow.md` | Agent identity model |
| DR-002 | `docs/decisions/DR-002-nanoclaw-source-of-truth-and-deployment.md` | NanoClaw SoT |
| Division v2 | `docs/superpowers/specs/2026-04-05-division-v2-federated-architecture.md` | Three-tier architecture |
| GitLab+Jira assessment | PR #54 merged 2026-04-21 | Prior work on Topic 3 |
| MYTHOS Charter + PRD | `chmod735-dor/mythos` PRs #25, #26, #27 | Context for MYTHOS onboarding path |
| Per-app Architect CLAUDE.mds | `apps/nanoclaw/groups/discord_{paths,cubes,hub,dt,infra}-eng/CLAUDE.md` | Evidence for Topic 1 |

---

*End of handoff brief. Awaiting CEO approval to dispatch to #main-ops.*
