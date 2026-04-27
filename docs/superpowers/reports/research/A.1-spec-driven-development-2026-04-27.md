---
dispatch_id: A.1
topic: Spec-Driven Development frameworks
authored_by: LIMITLESS Infra Architect
date: 2026-04-27
context_anchor: project_meta_pivot_machine_that_builds_machines.md
players_count: 4
---

> **Evidence basis caveat (read first):** This report is built on 2026 web sources gathered via WebSearch/WebFetch. The author has no firsthand operating experience with any of the four players. Where canonical documentation pages were uninformative on a given axis (e.g., BMAD's official docs site did not surface spec-format details, Kiro's home page hid pricing behind a separate `/pricing` page, Atlassian's product page omitted multi-agent count), claims are reconstructed from secondary sources (developer blogs, training material, third-party reviews) and explicitly marked with `[2nd]` in the citation token. Where evidence is genuinely insufficient, cells use `?` and §5 surfaces the gap.

## 1. Players surveyed

### 1.1 BMAD method (Breakthrough Method for Agile AI-Driven Development)

| Field | Value |
|---|---|
| Vendor | `bmad-code-org` GitHub org / community-maintained methodology |
| Latest version | v6.5.0 |
| Release date | 2026-04-26 |
| URL | https://github.com/bmad-code-org/BMAD-METHOD · https://docs.bmad-method.org/ · https://bmadcodes.com/ |
| Evidence basis | Web sources only (GitHub README, docs site index, Medium walkthroughs, Reenbit/Mornati blog reviews) |
| Notes | Open methodology (MIT license) plus reference toolchain. The "BMAD-METHOD" repo is the canonical implementation; `bmadcodes.com` and `bmad-builder-docs.bmad-method.org` are companion surfaces. Note: the dispatch glossed BMAD as "Behavior-Driven Modular Agentic Development" — the canonical expansion in 2026 sources is "Breakthrough Method for Agile AI-Driven Development." Worth correcting in any platform-internal references. |

### 1.2 GitHub Spec Kit

| Field | Value |
|---|---|
| Vendor | GitHub (Microsoft) — GitHub Next |
| Latest version | v0.8.1 (per GitHub releases) |
| Release date | 2026-04-24 |
| URL | https://github.com/github/spec-kit · https://github.github.com/spec-kit/ · https://speckit.org/ |
| Evidence basis | Web sources only (canonical repo, GitHub blog announcement, Microsoft Learn module, MS Developer blog, gitconnected practical guide) |
| Notes | MIT-licensed open-source toolkit; agent-agnostic (works with 30+ coding agents per repo README). Productized track via Microsoft Learn implies Microsoft is adopting Spec Kit as the documented enterprise SDD path on top of GitHub Copilot. The `speckit.org` domain appears to be a community/independent site; the canonical project is `github/spec-kit` on GitHub. |

### 1.3 Amazon Kiro

| Field | Value |
|---|---|
| Vendor | Amazon (AWS) |
| Latest known activity | Documentation updated 2026-02-18; pricing announcement 2026-03-19 |
| URL | https://kiro.dev/ · https://kiro.dev/docs/specs/ · https://kiro.dev/enterprise/ |
| Evidence basis | Web sources only (kiro.dev docs/pricing/enterprise pages, AWS Startups prompt library, AWS blog drug-discovery case study, Software Engineering Daily podcast with David Yanacek, InfoQ launch coverage Aug-2025) |
| Notes | Closed-source IDE; powered by Anthropic Claude Sonnet under the hood. Generally available with paid plans live as of March 2026 (announced via "new pricing plans and Auto" blog post). AWS GovCloud variant exists and requires enterprise auth. |

### 1.4 Atlassian Rovo Dev Agents

| Field | Value |
|---|---|
| Vendor | Atlassian |
| Latest known activity | "Generally available for all new and existing customers" per Atlassian product page; SWE-bench full leaderboard top score reported 2026 |
| URL | https://www.atlassian.com/software/rovo-dev · https://www.atlassian.com/blog/developer/spec-driven-development-with-rovo-dev/amp |
| Evidence basis | Web sources only (Atlassian product page, Atlassian blog posts on SDD/CLI/productivity, AtlasBench listing, third-party AgentHub pricing summary) |
| Notes | Commercial product, GA. Delivery surfaces include CLI, VS Code, Jira UI, Bitbucket Cloud, GitHub. Atlassian published a self-claim of 30.8% faster PR throughput using Rovo Dev internally and a 41.98% SWE-bench full resolve rate (2,294 tasks). |

---

## 2. Capabilities matrix

Citation tokens reference §6. `[1st]` = canonical vendor source. `[2nd]` = secondary source (third-party review, dev blog). `?` = genuinely unknown after research.

| Axis | BMAD method (v6.5.0) | GitHub Spec Kit (v0.8.1) | Amazon Kiro | Atlassian Rovo Dev |
|---|---|---|---|---|
| **Spec format** | Markdown PRDs + YAML workflow blueprints (`workflow.yaml`-style); 12+ "agent persona" files in repo structure [1] [2nd, 3] | Markdown — `spec.md`, `plan.md`, `tasks.md` under `.specify/specs/<feature>/`; project-level `constitution.md` under `.specify/memory/` [1st, 6] | Markdown — `requirements.md` (or `bugfix.md`), `design.md`, `tasks.md` per spec [1st, 10] | Markdown — `.agents.md` for guidelines + `.plan/` directory of per-step Markdown files [1st, 18] |
| **Spec → code pipeline** | Iterative — workflows orchestrate handoffs between PM/Architect/Developer/UX agents; explicit "Dev Loop Automation" referenced in v6.5 changelog [2nd, 3] [2nd, 5] | Iterative with optional gates — Constitution → Specification → Clarification → Planning → Tasks → Implementation; Spec Sync extension supports drift reconciliation [1st, 6] | Linear three-phase (Requirements → Design → Tasks → Implementation), with human approval gates between phases; spec edits propagate into code via agent re-runs [1st, 10] [2nd, 16] | Iterative — "plan, review, iterate on the plan, then execute"; `.plan/` files are revisable mid-flow; agents can self-review and address feedback [1st, 18] [1st, 19] |
| **SDLC phase coverage** | Requirements → architecture → implementation → QA; "from brainstorming to deployment" framing [1st, 1] [2nd, 3] | Constitution → Spec → Clarification → Plan → Tasks → Implementation → optional analysis/review/verification gates [1st, 6] | Requirements → design → task plan → implementation → tests → deployment (per podcast and review coverage) [2nd, 16] [2nd, 17] | All-of-SDLC: spec → PR raise → self-review agent → addressing feedback → CI pipeline reading → ticket update [1st, 19] [1st, 21] |
| **Multi-agent support** | Yes — 12+ specialized agent personas (PM, Architect, Developer, UX, QA, etc.); "Party Mode" multi-agent collaboration; "Sub Agent inclusion" in v6.5 [1st, 1] [1st, 2] | Indirect — Spec Kit itself is a methodology/toolkit; multi-agent is achieved by the user pointing it at any of 30+ supported agents (Claude Code, Copilot, Cursor, etc.). No native agent fleet. [1st, 6] | ? — no multi-agent claim found in canonical Kiro docs surveyed; "Auto" agent introduced in 2026-03 pricing announcement implies single primary agent [1st, 13] | Yes — primary Rovo Dev agent + spawned independent agents for self-review per Atlassian's platform-driven-development post [1st, 21] [1st, 22] |
| **Enterprise governance** | None documented (RBAC/SSO/audit trail/compliance attestations not present in surveyed docs) [1st, 1] | "Constitution" doc as soft governance; no RBAC/SSO; "MemoryLint" and "Plan Review Gate" as community extensions; no compliance attestations [1st, 6] | SSO via AWS IAM Identity Center, Okta, Microsoft Entra; org-level subscription/permission/billing management; AWS GovCloud variant (US gov compliance) [1st, 11] [1st, 12] | Permissions inherited from existing Atlassian product perms; SOC 2, SOC 1, ISO 27001 (via Atlassian Trust Center); GDPR; **no HIPAA, no data residency** [1st, 19] |
| **SCM integration** | GitHub-native (Actions, code review, issues per repo signals) [1st, 2] | Native Git — branch automation, PR creation, worktree isolation for parallel work; repo-agnostic (any Git-hosted SCM) [1st, 6] | ? — not surfaced in pages surveyed; community references suggest Git-aware but vendor scope unclear [2nd, 16] | Bitbucket Cloud, GitHub. **GitLab and Azure DevOps not mentioned** in product page surveyed [1st, 19] |
| **Spec drift handling** | Not explicitly documented in surveyed sources [1st, 1] | **Yes — strongest of the four**: Spec Sync (detects/resolves implementation divergence), Reconcile (surgical artifact updates), Retrospective (post-implementation adherence scoring) [1st, 6] | Bidirectional in principle: spec edits propagate to code; code edits drifting from spec trigger re-sync OR spec update — but mechanism not deeply documented [2nd, 16] | Implicit via iterative human review cycles ("multiple opportunities to course correct"); no automated drift detection surfaced [1st, 18] |
| **Pricing model** | Open-source MIT; 100% free [1st, 2] | Open-source MIT [1st, 6] | Free (50 credits) / Pro $20-mo (1k credits) / Pro+ $40-mo (2k credits) / Power $200-mo (10k credits); overage $0.04/credit [1st, 11] [1st, 13] | Atlassian commercial pricing; Standard tier "GA for all new and existing customers" — dollar amounts not surfaced on product page [1st, 19] |
| **Maturity signal** | Active community methodology; v6.5.0 released day-of-research (2026-04-26); 12+ agent personas; broad blog/dev coverage but no enterprise customer logos | v0.8.1; Microsoft Learn productized track exists; broad ecosystem support (30+ agents); GitHub-backed | GA with paid tiers live; Anthropic Claude Sonnet inside; AWS GovCloud variant; published case studies (drug discovery agent in 3 weeks); enterprise auth via Identity Center/Okta/Entra | GA; published internal productivity case studies (30.8% faster PRs); top SWE-bench full score (41.98% / 2,294 tasks); embedded in Atlassian's first-party platform |

---

## 3. Per-player notes (strengths AND weaknesses)

### 3.1 BMAD method

**Strengths:**
- Most comprehensive **multi-agent persona library** of the four: PM, Architect, Developer, UX, QA explicitly modeled with handoff workflows. Closest structural match to LIMITLESS's own division-of-labor pattern (Director / per-app Architects / future test-engineers etc.).
- **Open and extensible** — MIT license + active (v6.5.0 same day as research) + plain Markdown/YAML. Zero vendor lock-in.
- **Workflow-as-code**: YAML blueprints orchestrate agent handoffs declaratively. This is closer to a "DAG of agent tasks" model than the other three.

**Weaknesses:**
- **Enterprise governance is essentially absent** in surveyed materials. No RBAC, no SSO, no compliance attestations. For any production-system that needs an audit trail, BMAD is BYO-governance.
- **Spec drift handling is undocumented.** Long-running projects accumulating spec/code divergence have no native reconciliation primitive.
- **Documentation discovery is uneven** — the canonical docs site (`docs.bmad-method.org/`) was uninformative on basic format/workflow questions; key technical detail lives in third-party Medium posts and the GitHub repo. Adoption friction is real.

### 3.2 GitHub Spec Kit

**Strengths:**
- **Best-in-class spec drift handling** of the four: Spec Sync, Reconcile, Retrospective extensions form a pipeline for detection → reconciliation → adherence scoring. None of the others have this layered.
- **Agent-agnostic** — explicitly supports 30+ coding agents (Claude Code, Copilot, Cursor, Codex, Gemini, Qwen, Mistral, Tabnine, Windsurf, etc.). No coding-agent lock-in.
- **Constitution pattern** as soft governance is genuinely novel — encoding project principles in an agent-readable file that subsequent specs must align against. This generalizes well as a primitive.

**Weaknesses:**
- **Methodology, not platform.** Spec Kit doesn't run code, doesn't host agents, doesn't manage credentials. It's a structured prompt/file convention. Enterprise governance must be bolted on by whatever runtime hosts it.
- **No native multi-agent fleet** — multi-agent is "use any agent you want," not "we orchestrate a team of agents for you." Different value prop than BMAD or Rovo Dev.
- **MemoryLint, Plan Review Gate, Spec Sync, etc. are extensions**, not core. Production adoption requires picking a curated extension set; no opinionated bundle for governance.

### 3.3 Amazon Kiro

**Strengths:**
- **Strongest enterprise authentication story** of the four: SSO via AWS IAM Identity Center, Okta, Microsoft Entra; AWS GovCloud variant for US gov workloads. Ready for regulated environments out-of-box.
- **Spec-as-source-of-truth is the cleanest mental model** — "the spec is a living document; code is a build artifact" inverts the conventional code-first SDLC. Most aligned with the platform vision in the strategic pivot ("machine that builds the machines").
- **GA with concrete paid tiers** ($20 / $40 / $200/mo) and public credit-overage pricing. Real product, not preview.

**Weaknesses:**
- **Multi-agent support not surfaced** in canonical docs surveyed. "Auto" agent (announced 2026-03) implies single primary agent; teams of agents collaborating is not the apparent design.
- **SCM integration scope unclear** — pages surveyed didn't surface GitHub/GitLab/Bitbucket coverage. AWS-aligned scope is plausible but not verifiable from surveyed sources.
- **Closed-source IDE + Anthropic-Claude-Sonnet-only**: vendor lock-in is real. Migrating off Kiro means losing the IDE integration entirely.

### 3.4 Atlassian Rovo Dev Agents

**Strengths:**
- **Broadest SDLC phase coverage** of the four: spec → PR raise → self-review agent → CI pipeline read → ticket update is end-to-end. Native integration with Jira (tickets) and Bitbucket (SCM) is structural, not bolt-on.
- **Strongest production-evidence claims**: 41.98% SWE-bench full resolve rate (highest reported), 30.8% PR-throughput delta from internal Atlassian use. Whether or not the numbers replicate elsewhere, they're the most concrete public claims of the four.
- **Multi-surface delivery** — CLI, VS Code, Jira UI, Bitbucket Cloud, GitHub. Wider surface than any of the other three.

**Weaknesses:**
- **SCM coverage is narrow** — Bitbucket Cloud + GitHub only per surveyed product page. **No GitLab or Azure DevOps.** Disqualifying for orgs on those platforms.
- **Compliance gaps** — SOC 2 / SOC 1 / ISO 27001 yes; **no HIPAA, no data residency**. Disqualifying for healthcare and certain EU sovereign-data scenarios.
- **Vendor-locked to Atlassian ecosystem** — leveraging Rovo Dev fully implies Jira + Bitbucket adoption. Standalone use (no Jira) is less differentiated vs. Spec Kit + any agent.

---

## 4. Implications for our platform

The strategic pivot frames LIMITLESS / Mythos as case studies for the broader **agentic SDLC platform**. Each implication below ties an observation to a platform-design decision.

### 4.1 Don't standardize a spec format; standardize a spec *contract*

All four players converge on **Markdown** as the spec surface (BMAD's PRDs, Spec Kit's `spec.md`/`plan.md`/`tasks.md`, Kiro's `requirements.md`/`design.md`/`tasks.md`, Rovo Dev's `.plan/*.md` + `.agents.md`). The convergence suggests **format is not where the value lives** — the value is in the *contract* (what slots are required: requirements, design, tasks, success criteria) and the *governance hooks* around it.

**Platform implication**: define a minimal spec contract (frontmatter + required sections) but allow projects to bring their own Markdown conventions. Don't invent a proprietary IDL. Make the contract validate-able by a linter the platform ships, similar to Spec Kit's `Plan Review Gate` extension.

### 4.2 Spec drift handling is the underdeveloped axis — and the highest-leverage place for our platform to differentiate

Three of the four players treat drift as either a manual review concern (BMAD, Rovo Dev) or implicit (Kiro). Only Spec Kit ships a layered drift pipeline (Sync → Reconcile → Retrospective). For a platform that explicitly serves long-running, multi-developer, multi-agent codebases (LIMITLESS, Mythos, then arbitrary projects), **automated drift detection is a load-bearing primitive, not a nice-to-have**. The §8.1 motivation appendix in the bot-feedback-loop incident report already gestures at this — uniform audit trail across PR classes only works if drift is reconciled.

**Platform implication**: invest in spec/code drift detection as a first-class feature, not as an extension. Steal Spec Kit's three-phase model (detect → reconcile → score) as the conceptual scaffold.

### 4.3 Our existing dispatch model already encodes a spec — make it explicit

The dispatch the Director sent to me (`/workspace/extra/monorepo/temp/2026-04-26-dr003-spike-followup-dispatch.md`) **is structurally a spec**: it contains a problem statement, prior findings, options, evaluation criteria, and a deliverable contract. Every Director-to-Architect dispatch is implicitly a spec; what's missing is the framing that makes it explicit and the lifecycle that follows it (draft → review → approved → executed → reconciled).

**Platform implication**: the unit of work in the agentic SDLC platform should be a **dispatch-as-spec**, not a free-text Slack/Discord message. This is the closest fit to BMAD's workflow blueprints, but with the round-trip rigor of Spec Kit's Spec Sync. Our existing dispatch templates (under `docs/superpowers/reports/research/dispatch-templates/`) are already 80% of the way there — formalize the contract, version it, and make execution traceable to a specific dispatch revision.

### 4.4 Cross-app coordination — none of the four solve it

The DR-003 §8.1 motivation flagged cross-app coordination as a constraint (LIMITLESS: 5 apps + main + Mythos). None of the four surveyed solve cross-app/cross-repo coordination natively. BMAD's multi-agent personas operate within a single project; Spec Kit's Constitution is project-scoped; Kiro's specs are file-system-scoped; Rovo Dev's agents are Jira-project-scoped.

**Platform implication**: cross-app coordination is **the gap to fill**. The platform should treat dispatches as cross-project primitives (a dispatch can route to multiple apps, multiple Architects, with a single coordinated synthesis step — exactly the D.1 synthesis pattern this research wave is itself executing). This is original platform value that none of the four players ship.

### 4.5 Governance posture: Kiro's auth model is the floor; Atlassian's compliance attestations are the ceiling

Our platform will need to clear enterprise procurement reviews. Kiro's enterprise auth (IAM Identity Center, Okta, Entra) is the floor for B2B viability. Atlassian's SOC 2 / SOC 1 / ISO 27001 / GDPR is the ceiling that signals "actually deployable in regulated F500." DR-001's GitHub App identity model is a compatible foundation: it's compliance-friendly (`[bot]` attribution, scoped tokens, separate audit log category) and aligns with how Kiro/Rovo Dev partition automation from human identity.

**Platform implication**: bake DR-001-style App-token identity into the platform from day one (not as an afterthought, as we're seeing in the v2 NanoClaw port). Position the platform's compliance roadmap explicitly: SSO floor (parity with Kiro), SOC 2 + ISO 27001 ceiling (parity with Rovo Dev). HIPAA and data residency become differentiators since Rovo Dev lacks them.

---

## 5. Open questions / where evidence is thin

- **BMAD spec format detail**: canonical docs site did not surface concrete file format / workflow YAML schema. Claims about YAML workflow blueprints rest on third-party Medium walkthroughs (Mysore, Holt-Nguyen) — `[2nd]` cited. Recommend a follow-up firsthand look at the `BMAD-METHOD` repo's `bmad-builder` subtree for canonical schema before locking platform decisions on this.
- **BMAD enterprise governance**: complete absence in surveyed sources — but absence-of-evidence is not evidence-of-absence. Worth checking `bmadcodes.com` (the commercial-looking site) for an enterprise tier I may have missed.
- **Kiro multi-agent support**: not addressable from surveyed pages. The "Auto" agent and recent pricing-tier-launch blog post imply a single primary agent. Multi-agent could exist as an undocumented or paywalled feature; needs primary-source evidence (a hands-on session in Kiro IDE) to confirm.
- **Kiro SCM integration scope**: not surfaced. Likely defaults to local Git + AWS CodeCommit, but GitHub/GitLab/Bitbucket coverage needs verification.
- **Rovo Dev pricing dollar amounts**: not surfaced on product page; redirected to a separate pricing page that wasn't fetched. Third-party pricing aggregator (`bestagenthub.com`) may have stale data; primary source recommended.
- **Rovo Dev agent count and orchestration model**: "spawns independent agents for self-review" is documented as a behavior but the agent-fleet shape (how many concurrent agents, whether user-configurable, whether the agents have persona specialization à la BMAD) is not surfaced. Likely needs Atlassian developer docs deep-dive.
- **Spec Kit drift extensions stability**: Spec Sync, Reconcile, and Retrospective are described as extensions, not core. Whether they're community-maintained, GitHub-blessed, or production-ready is not clear from surveyed sources. Adoption confidence requires checking individual extension repos.
- **BMAD vs Spec Kit overlap**: both are open-source Markdown-based methodologies. Whether they're competitive, complementary, or convergent (could one be implemented on top of the other?) is an open structural question — relevant if the platform wants to standardize on a single open foundation.
- **All four**: zero firsthand operating evidence. A platform decision of this consequence shouldn't rest on web-source-only research; recommend the D.1 synthesis budget includes at least one hands-on spike for the top-1-or-2 candidates.

---

## 6. Citations

Access date for all entries: 2026-04-26 (research dispatch day) unless noted.

1. *BMad Method documentation home.* https://docs.bmad-method.org/ — accessed 2026-04-26.
2. *BMAD-METHOD GitHub repository.* https://github.com/bmad-code-org/BMAD-METHOD — accessed 2026-04-26.
3. Vishal Mysore. *What is BMAD-METHOD™? A Simple Guide to the Future of AI-Driven Development.* Medium. https://medium.com/@visrow/what-is-bmad-method-a-simple-guide-to-the-future-of-ai-driven-development-412274f91419 — accessed 2026-04-26.
4. *BMad Code: AI Agent Framework.* https://bmadcodes.com/ — accessed 2026-04-26.
5. *What Is BMAD? The Agentic AI Framework for Production-Ready Development.* Reenbit. https://reenbit.com/the-bmad-method-how-structured-ai-agents-turn-vibe-coding-into-production-ready-software/ — accessed 2026-04-26.
6. *Spec Kit GitHub repository.* https://github.com/github/spec-kit — accessed 2026-04-26.
7. *Spec-driven development with AI: Get started with a new open source toolkit.* The GitHub Blog. https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/ — accessed 2026-04-26.
8. *Implement Spec-Driven Development using the GitHub Spec Kit.* Microsoft Learn. https://learn.microsoft.com/en-us/training/modules/spec-driven-development-github-spec-kit-enterprise-developers/ — accessed 2026-04-26.
9. Chris Bao. *Exploring Spec Driven Development (SDD) — A Practical Guide with GitHub SpecKit and Copilot.* Level Up Coding. March 2026. https://levelup.gitconnected.com/exploring-spec-driven-development-sdd-a-practical-guide-with-github-speckit-and-copilot-72fd9a70535a — accessed 2026-04-26.
10. *Specs — Kiro IDE Docs.* https://kiro.dev/docs/specs/ — accessed 2026-04-26.
11. *Kiro Pricing.* https://kiro.dev/pricing/ — pricing data via WebSearch summary 2026-04-26 (page itself returned no extractable detail on direct fetch).
12. *Kiro Enterprise.* https://kiro.dev/enterprise/ — accessed 2026-04-26 via WebSearch summary.
13. *Announcing new pricing plans and Auto, our new agent.* Kiro Blog. 2026-03-19. https://kiro.dev/blog/new-pricing-plans-and-auto/ — accessed 2026-04-26.
14. *Kiro Project Init: Automated Spec-Driven Development Setup.* AWS Startups Prompt Library. https://aws.amazon.com/startups/prompt-library/kiro-project-init — accessed 2026-04-26.
15. *Beyond Vibe Coding: Amazon Introduces Kiro, the Spec-Driven Agentic AI IDE.* InfoQ. August 2025. https://www.infoq.com/news/2025/08/aws-kiro-spec-driven-agent/ — accessed 2026-04-26 (fallback older source — marked due to age).
16. *Kiro Review: Amazon's Spec-Driven IDE Powered by Claude.* OpenAIToolsHub. https://www.openaitoolshub.org/en/blog/kiro-review-amazon-ide — accessed 2026-04-26.
17. *Amazon's IDE for Spec-Driven Development with David Yanacek.* Software Engineering Daily. 2026-02-26. https://softwareengineeringdaily.com/2026/02/26/amazons-ide-for-spec-driven-development-with-david-yanacek/ — accessed 2026-04-26.
18. *Spec Driven Development with Rovo Dev.* Atlassian Work Life Blog. https://www.atlassian.com/blog/developer/spec-driven-development-with-rovo-dev/amp — accessed 2026-04-26.
19. *Rovo Dev — Agentic AI for software teams.* Atlassian product page. https://www.atlassian.com/software/rovo-dev — accessed 2026-04-26.
20. *Rovo Dev agent, now available in the CLI.* Atlassian Work Life Blog. https://www.atlassian.com/blog/development/rovo-dev-command-line-interface — accessed 2026-04-26.
21. *30.8% Faster PRs: How AI-Driven Rovo Dev Code Reviewer Improved the Developer Productivity at Atlassian.* Atlassian. https://www.atlassian.com/blog/artificial-intelligence/developer-productivity-improved-with-rovo-dev — accessed 2026-04-26.
22. *Rovo Dev Driven Development — How we built a platform in 4 weeks.* Atlassian. https://www.atlassian.com/blog/rovo/rovo-dev-platform-driven-development — accessed 2026-04-26.
23. *Rovo Agent — Forge Manifest Reference.* Atlassian Developer Docs. https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-agent/ — accessed 2026-04-26.
