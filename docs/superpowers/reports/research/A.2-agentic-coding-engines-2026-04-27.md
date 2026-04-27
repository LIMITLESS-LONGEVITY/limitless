---
dispatch_id: A.2
topic: Agentic Coding Engines (IDE / CLI)
authored_by: LIMITLESS Infra Architect
date: 2026-04-27
context_anchor: project_meta_pivot_machine_that_builds_machines.md
players_count: 6
---

## 1. Players surveyed

1. **Cursor — Agent mode & Cloud agents**
   - Vendor: Anysphere (Cursor)
   - Version: Cursor 2.x (2026); Pro/Pro+/Ultra/Teams/Enterprise plan tiers GA
   - URL: https://cursor.com
   - Evidence basis: 2026 web sources (pricing pages, Cursor Docs, Vantage/NoCode reviews); no firsthand integration in this codebase.

2. **Devin (Cognition)**
   - Vendor: Cognition AI
   - Version: Devin 2.x (Devin 2.0 announced mid-2025; iterated through April 2026 — "take over existing PRs" landed 2026-04-01)
   - URL: https://devin.ai
   - Evidence basis: 2026 Devin Docs (release notes, enterprise deployment, playbooks/knowledge), VentureBeat/SiliconAngle 2026 coverage; no firsthand use.

3. **Claude Code (Anthropic)**
   - Vendor: Anthropic
   - Version: Claude Code CLI + Agent SDK (formerly "Claude Code SDK"); rolling release. April 2026 release notes reference subagent permissionMode, PowerShell auto-approve.
   - URL: https://claude.com/claude-code (docs at https://code.claude.com/docs)
   - Evidence basis: Anthropic platform docs, 2026 release notes, **firsthand: this Architect agent runs on Claude Code with the Agent SDK; subagent and MCP behavior verified in `/workspace/agent/` runtime**.

4. **Sourcegraph Amp (formerly Cody)**
   - Vendor: Sourcegraph
   - Version: Rebrand from "Cody" to "Amp" completed in 2025; Sourcegraph MCP server GA (2026-04-20 changelog); Free/Pro tiers discontinued in 2025, Enterprise-only contract pricing.
   - URL: https://ampcode.com / https://sourcegraph.com
   - Evidence basis: Sourcegraph docs and changelog April 2026, Amp Owner's Manual; no firsthand use.

5. **JetBrains Junie**
   - Vendor: JetBrains
   - Version: Junie GA across IntelliJ IDEA Ultimate / PyCharm Pro / WebStorm / GoLand; **Junie CLI in public beta (March 2026) as LLM-agnostic**.
   - URL: https://www.jetbrains.com/junie/
   - Evidence basis: JetBrains help docs, March 2026 Junie blog (CLI beta), Techzine coverage of MCP support; no firsthand use.

6. **GitHub Copilot — agent mode (and Cloud Agent)**
   - Vendor: GitHub / Microsoft
   - Version: Agent mode GA in VS Code, JetBrains, Eclipse, Xcode; **Copilot Cloud Agent + Enterprise AI Controls GA 2026-02-26**; `actor_is_agent` audit event GA.
   - URL: https://github.com/features/copilot
   - Evidence basis: GitHub Docs + Changelog April 2026, Microsoft DevBlogs.
   - Bucket note: "Copilot Workspace" (the brainstorm→PR product) has been progressively folded into Copilot agent mode + Cloud Agent + custom-agents framework. Treating those as the productized agentic surface; flagged in §5.

## 2. Capabilities matrix

Citation tokens reference §6 by number. `?` = insufficient public evidence.

| Axis | Cursor | Devin | Claude Code | Amp (Cody) | Junie | Copilot agent |
|---|---|---|---|---|---|---|
| **Autonomy level** | propose-with-diff (Agent mode) → auto-execute (Cloud agents, isolated VM) [1] | auto-execute, long-horizon, with checkpoints [7] | per-permission-mode: ask / accept-edits / bypass (per-tool gating) [10] | propose-with-diff + command allowlist gate [13] | plan-approval then execute (transparent action log) [16] | propose-with-diff (agent mode) → auto-execute (Cloud Agent) [19] |
| **Context strategy** | hybrid: IDE buffers + repo indexing + MCP external tools [1] | full-repo + persistent Knowledge base + MCP [8] | hybrid: file ops + repo grep + subagent context partitioning [10][11] | full-repo (Sourcegraph code-graph) + Deep Search contexts [13] | IDE-current + AGENTS.md guidelines + MCP context [16][17] | hybrid: workspace + custom-agents + MCP external [19][20] |
| **Tool use** | file ops, shell, web fetch via MCP marketplace [1] | shell, browser, file, git, MCP, custom playbooks [7][8] | file/edit/grep/bash/web/MCP, user-defined hooks; SDK exposes tool gating [10][11] | file edits, command allowlist, MCP pre-bundled, Sourcegraph MCP server [13][14] | shell + MCP (Context7, GitHub, SQLite, Perplexity, etc.) [17] | shell, file, web, MCP, custom-agents/sub-agents [19][20] |
| **Multi-file change** | cross-file in single edit; Cloud agents do parallel multi-PR [1] | cross-file with verification + can take over existing PRs (Apr 2026) [7] | cross-file with verification (Edit/Write + tests in loop) [10] | cross-file across repos via Sourcegraph index [13] | cross-file in IDE plan, runs tests, fixes breaks [15] | cross-file with custom-agent verification [19] |
| **Long-horizon** | minutes–hours; Cloud agents run in isolated VMs in parallel [1] | **hours–days**; sessions resumable, Knowledge persists, ACU caps recommended [7][8] | hours per session; persistent CLAUDE.md memory; SDK supports resume hooks [10] | hours per session; persistent Sourcegraph repo state [13] | minutes–hours per task in IDE [16] | hours; agent_session.task event tracks start/finish/fail [19] |
| **Subagent / role** | Cloud agents can be parallelized; "modes" (Ask/Edit/Agent) [1] | **"Managed Devins" orchestrated in parallel** (Enterprise tier) [9] | **first-class subagents**: named, isolated context, own tool list, own permission mode, user-defined via Markdown frontmatter [11] | role-specialization via prompt; no formal subagent framework documented [13] | single agent + Junie CLI variant; no formal subagent framework yet [16] | **custom-agents, sub-agents, plan-agent** GA across IDEs [20] |
| **Permission model** | per-tool toggles in client; Enterprise admin policies [3] | per-session ACU caps; admin-set scopes [9] | **per-tool + per-action + per-path; permissionMode at agent definition; hooks for pre/post-tool gates** [10][11] | command allowlist stored in repo; OAuth scope per MCP; repo perms inherited from Sourcegraph [13][14] | plan-approval gate; per-tool MCP gates [16][17] | enterprise policy: AI Controls, per-org cloud-agent enable, custom-roles fine-grained [21] |
| **Pricing** | Hobby free, Pro $20, Pro+ $60, Ultra $200, Teams $40/seat, Enterprise custom [2] | $20 entry / $2.25 per ACU; Team $500/250 ACUs ($2/ACU); Enterprise custom [4][5] | Bundled with Anthropic API consumption (token-billed) or Claude Pro/Max/Team/Enterprise seat [10] | **Enterprise contract only** (free/pro discontinued); per-seat negotiated [13] | $100/yr AI Pro, $300/yr AI Ultimate; BYOK available [18] | $10 Pro / $19 Business / $39 Enterprise per seat (Copilot tiers) [19] |
| **Surface** | IDE (electron fork of VSCode) + Cloud agents (web) [1] | Web app + Slack + IDE plugin + CLI (`devin run`) [7] | **CLI primary**, IDE plugins (VSCode, JetBrains), SDK for embedding [10] | CLI (`amp`) + VS Code + JetBrains [13] | **IDE primary** (JetBrains) + CLI beta [16] | IDE (VS Code, JetBrains, Eclipse, Xcode, VS) + Cloud Agent (web/PR) [19] |
| **Enterprise** | SOC2 Type II, SAML SSO, SCIM, audit; **no on-prem/VPC** [3] | SAML SSO, audit, **VPC deployment via AWS PrivateLink**, dedicated SaaS; **no FedRAMP listed** [9] | SSO, audit; runs in customer's AWS Bedrock / GCP Vertex / Azure (data-stays-in-cloud); no FedRAMP listed [10] | SSO (SAML/OIDC/OAuth), SCIM, RBAC, audit, **on-prem self-hosted**; SOC2 Type II + ISO27001 [13] | JetBrains AI plans; SSO via JB Account; on-prem `?` [18] | SSO, audit (`actor_is_agent`), enterprise AI Controls control plane, FedRAMP via GitHub Enterprise Cloud (per GitHub trust center) [21] |

## 3. Per-player notes

### Cursor — Agent mode & Cloud agents

- **Strength**: Cloud agents (10-20 parallel, isolated VMs, each producing a PR) is the most aggressive horizontally-scaled autonomy in the set. Pairs naturally with our dispatch-fan-out pattern — one task → many candidate solutions.
- **Strength**: MCP marketplace (Amplitude, AWS, Figma, Linear, Stripe, Cloudflare, Vercel) is one-click; lowest friction integration of any player.
- **Weakness**: **No on-prem/VPC** and no documented data-residency path. Acceptable for greenfield SaaS, blocking for regulated tenants. Pricing is opaque inside the credit-pool model — Pro $20 covers a "$20 monthly credit pool" not unlimited usage [2].

### Devin (Cognition)

- **Strength**: **Long-horizon work is the differentiator**. Knowledge base + playbooks + session-resume + take-over-existing-PRs (April 2026) make Devin the only player explicitly designed for multi-day autonomous arcs. Managed Devins orchestration (Enterprise) is real subagent fan-out.
- **Strength**: VPC deployment with code-never-leaves-boundary is meaningful for compliance posture. Single-tenant SaaS via AWS PrivateLink covers a middle band.
- **Weakness**: **ACU pricing is unbounded by design**. Devin's own docs warn that without ACU caps Devin can spend "hours or days pursuing impossible solutions" [7] — which is also the failure mode our governance work is built to prevent. The cure (ACU caps + checkpoints) is operator discipline, not platform default.
- **Weakness**: Costliest of the set on a per-task basis; $20 minimum is misleading (it's 8-9 ACUs, ~2 hours of work).

### Claude Code (Anthropic)

- **Strength**: **Most expressive permission model** of the six. Permission modes (`ask`/`acceptEdits`/`bypassPermissions`) compose with per-tool allowlists, per-path patterns, hook gates, and **per-subagent permission mode** [10][11]. This is the closest match to the layered governance model DR-001/002/003 are pushing toward.
- **Strength**: Subagents are first-class — frontmatter declares name, tools, model, permissionMode, system prompt as Markdown body. **This is the structural primitive our platform's "Architect / Director / Researcher" roles map to**.
- **Strength**: SDK is project-agnostic by design — same engine used in our own `apps/nanoclaw/` runtime. Strong "machine that builds the machines" alignment.
- **Weakness**: CLI-first ergonomics; IDE plugins are thinner than Cursor/Junie. Not a great fit for users who live in a pure IDE.
- **Weakness**: Enterprise governance surface (SSO, audit, FedRAMP) is via the cloud platform you bring (Bedrock/Vertex/Azure); Anthropic-direct enterprise tier is less mature than GitHub/Sourcegraph offerings.

### Sourcegraph Amp (Cody)

- **Strength**: **Best enterprise governance posture** of the six on paper — SSO/SCIM/RBAC/audit/on-prem-self-host/SOC2+ISO27001/repo-perms-inherited-by-MCP-OAuth-scope. The repo-permission inheritance through MCP is structurally sound and uncommon.
- **Strength**: Command allowlisting stored as project settings in the repo — a concrete, version-controlled permission artifact, not a UI toggle.
- **Strength**: Sourcegraph code-graph is the strongest cross-repo context model. Direct fit if our platform expands beyond one monorepo.
- **Weakness**: **Enterprise-only contract pricing** (free/pro discontinued in 2025) raises adoption floor. Self-serve evaluation path is gone.
- **Weakness**: Subagent / role-specialization framework is not yet documented at the depth of Claude Code or Copilot custom-agents. Multi-agent coordination via Amp is bespoke today.

### JetBrains Junie

- **Strength**: Plan-approval-then-execute model with transparent action log [16] is the most user-trusted autonomy posture — closest to "show your work, get sign-off, then act." Aligns naturally with DR-003 ratification framing.
- **Strength**: AGENTS.md guidelines file at `.junie/AGENTS.md` — persistent, repo-scoped context; conceptually equivalent to our `CLAUDE.md` family.
- **Weakness**: **IDE-bound** (until Junie CLI exits beta and matures). Doesn't yet fit headless-CI or fan-out spawn patterns.
- **Weakness**: Subagent framework absent; no orchestrated multi-role flow today.
- **Weakness**: BYOK-only path to model neutrality; default coupling to JetBrains AI plan model routing.

### GitHub Copilot — agent mode & Cloud Agent

- **Strength**: **Best-in-class enterprise control plane**. AI Controls + custom enterprise roles + per-org cloud-agent enable + `actor_is_agent` audit identifier + `agent_session.task` event [21][19] is exactly what a Fortune-500 audit-compliance team needs. None of the others match this control granularity at the org level.
- **Strength**: Custom agents + sub-agents + plan-agent GA in JetBrains [20] — Copilot has caught up to Claude Code on subagent framework and exceeds it on enterprise-side management.
- **Strength**: Surface breadth (VS Code, JetBrains, Eclipse, Xcode, Visual Studio, web Cloud Agent) is widest.
- **Weakness**: Tightly bound to GitHub for SCM and identity. Bitbucket / GitLab integrations are second-class; not a fit for orgs centered there.
- **Weakness**: "Copilot Workspace" (the brainstorm→PR product) has been progressively folded into agent-mode-on-PR + Cloud Agent; the standalone product line as originally announced is now ambiguous. See §5.

## 4. Implications for our platform

1. **The Architect's autonomy level should sit at "propose-with-diff + plan-approval gate," NOT auto-execute.** Junie's plan-approval model and Claude Code's `acceptEdits` permission mode are the closest matches. Devin's auto-execute-with-ACU-caps is the failure mode our governance work (DR-003, bot-feedback-loop incident) is explicitly designed to prevent. The market is bifurcating into "trust-the-agent-fully" (Devin, Cursor Cloud) and "show-your-work-then-act" (Junie, Claude Code, Copilot agent) — we should plant our flag firmly in the second camp and brand it as such.

2. **MCP is now table stakes. The differentiator is _how MCP composes with the permission model_.** All six players now support MCP (Junie was the latest, mid-2026). The interesting design space is the perimeter: Amp restricts MCP via OAuth scope and inherits repo permissions; Claude Code gates per-tool with hooks; Copilot uses enterprise AI Controls. Our platform should make **the dispatch itself a permission-and-scope artifact** that an MCP-aware agent reads — i.e., the dispatch declares which tools/repos/paths the agent may touch, and the runtime enforces.

3. **Subagent framework is the structural primitive — and only Claude Code and Copilot ship it as first-class.** Devin has Managed Devins (orchestration, not framework). Cursor has parallel cloud agents (fan-out, not specialization). Amp and Junie have nothing comparable. Our CEO→Director→Architect→{Researcher,Builder,Reviewer} topology is already a subagent system; we should formalize it as one. **Strong recommendation: model our agent topology on Claude Code's frontmatter-declared subagent definition (name, tools, model, permissionMode, system prompt as MD body)** — it's the cleanest, file-versionable, project-agnostic primitive available, and our runtime is already on Claude Code.

4. **Long-horizon support is Devin's moat — and we don't need to compete there.** Devin's Knowledge base + Playbooks + session-resume + take-over-existing-PRs is a multi-day autonomy story. Our platform's value is in coordinated short-arc dispatches with strong governance — not in chasing day-long sessions. **Position long-horizon work as something we delegate to a Devin-class engine via MCP, not something we replicate.** This sharpens scope and avoids feature-dilution.

5. **Enterprise governance posture is a four-way tier**:
   - **Tier 1 (best)**: Copilot agent (AI Controls + audit events) and Amp (SSO/SCIM/RBAC/on-prem/SOC2+ISO27001).
   - **Tier 2**: Devin (VPC + SAML).
   - **Tier 3**: Cursor (SaaS-only, SOC2, no on-prem).
   - **Tier 4 (depends on bring-your-own-cloud)**: Claude Code, Junie.
   Our platform should target **Tier 1-equivalent on the audit/governance axis** because it's the gating factor for the regulated-tenant case studies (LIMITLESS legal/governance, Mythos product). Adopt patterns from Copilot's `actor_is_agent` audit identifier and Amp's repo-permission inheritance — both are concrete, replicable design choices.

## 5. Open questions / where evidence is thin

- **Copilot Workspace standalone status**: The dispatch named "Copilot Workspace" specifically. Public evidence is ambiguous on whether the original brainstorm→PR product line still exists as a distinct surface or has fully merged into agent-mode-on-PR + Cloud Agent + custom-agents. I treated the productized agentic surface as the unit; if Workspace-the-brainstorm-product is the intended scope, evidence quality drops sharply for that specific framing.
- **Junie autonomy on long-horizon**: JetBrains marketing positions Junie for "complex multi-step tasks" but I didn't find concrete duration/checkpoint claims comparable to Devin's hours-to-days. Likely minutes-to-hours per task in practice; not definitive.
- **Claude Code enterprise governance**: Anthropic's enterprise tier (audit, FedRAMP, on-prem-equivalent) is documented less precisely than GitHub or Sourcegraph. The "data stays in your cloud via Bedrock/Vertex" pattern is real but the audit-event surface is thinner than Copilot's `actor_is_agent`.
- **Cursor on-prem trajectory**: Vendor explicitly says no on-prem today; whether 2026 H2 brings VPC parity (matching Devin) is unknown.
- **Subagent framework comparison depth**: Copilot custom-agents vs. Claude Code subagents — both shipped in 2026; head-to-head feature comparison (declaration schema, permissionMode equivalents, MCP-tool-gating granularity) deserves a follow-up depth dive before we adopt one as our reference primitive.
- **Did I miss a player?** Amazon Q Developer Pro (agentic mode added 2026) was not in scope but has comparable enterprise+agent positioning, especially in AWS-shop accounts. Flag for D.1 — may be worth a re-bucket.

## 6. Citations

1. Cursor product page — https://cursor.com (accessed 2026-04-27); "Cursor Pricing in 2026" — https://dev.to/rahulxsingh/cursor-pricing-in-2026-hobby-pro-pro-ultra-teams-and-enterprise-plans-explained-4b89 (2026)
2. Cursor Pricing — https://cursor.com/pricing (accessed 2026-04-27)
3. Cursor Enterprise Docs — https://cursor.com/docs/enterprise and Compliance and Monitoring — https://cursor.com/docs/enterprise/compliance-and-monitoring (accessed 2026-04-27)
4. "Devin 2.0 is here: Cognition slashes price… to $20/month" — https://venturebeat.com/programming-development/devin-2-0-is-here-cognition-slashes-price-of-ai-software-engineer-to-20-per-month-from-500
5. Devin Pricing — https://devin.ai/pricing (accessed 2026-04-27)
6. "Devin Pricing 2026: Real Costs, ACUs & Alternatives" — https://brainroad.com/devin-pricing-in-2026-real-cost-hidden-spend-and-alternatives/
7. Devin Docs — Recent Updates — https://docs.devin.ai/release-notes/overview and 2026 release notes — https://docs.devin.ai/release-notes/2026 (accessed 2026-04-27)
8. Devin Docs — Playbooks (https://docs.devin.ai/product-guides/using-playbooks and creating-playbooks) and Session Insights (https://docs.devin.ai/product-guides/session-insights)
9. Devin Enterprise Deployment — https://docs.devin.ai/enterprise/deployment/overview (accessed 2026-04-27)
10. Claude Agent SDK overview — https://platform.claude.com/docs/en/agent-sdk/overview ; Claude Code release notes April 2026 — https://releasebot.io/updates/anthropic/claude-code
11. Subagents in the SDK — https://platform.claude.com/docs/en/agent-sdk/subagents ; "Claude Code Subagents: The Complete Guide" Medium April 2026 — https://medium.com/@sathishkraju/claude-code-subagents-the-complete-guide-to-ai-agent-delegation-d0a9aba419d0
12. "Claude Code CLI Guide 2026" — https://blakecrosley.com/guides/claude-code
13. Sourcegraph Cody Enterprise features — https://sourcegraph.com/docs/cody/enterprise/features ; Amp Owner's Manual — https://ampcode.com/manual ; "Enterprise AI Coding: GitHub Copilot vs Sourcegraph Amp (Cody) vs Tabnine" Feb 2026 — https://authorityaitools.com/blog/enterprise-ai-ides-comparison
14. Sourcegraph MCP server GA changelog 2026-04-20 — https://sourcegraph.com/changelog/mcp-ga and Sourcegraph MCP docs — https://sourcegraph.com/docs/api/mcp
15. Junie product page — https://www.jetbrains.com/junie/ ; "JetBrains debuts free AI tier and Junie coding agent in IDEs" — https://www.developer-tech.com/news/jetbrains-debuts-free-ai-tier-junie-coding-agent-in-ide/
16. Junie by JetBrains | AI Assistant Documentation — https://www.jetbrains.com/help/ai-assistant/junie-agent.html
17. JetBrains Junie MCP docs — https://www.jetbrains.com/help/junie/model-context-protocol-mcp.html ; "JetBrains speeds up Junie agent by 30%, adds MCP support" — https://www.techzine.eu/news/devops/133169/jetbrains-speeds-up-junie-agent-by-30-adds-mcp-support/ ; Junie CLI beta blog — https://blog.jetbrains.com/junie/2026/03/junie-cli-the-llm-agnostic-coding-agent-is-now-in-beta/
18. JetBrains AI Plans & Pricing — https://www.jetbrains.com/ai-ides/buy/
19. GitHub Copilot features — https://docs.github.com/en/copilot/get-started/features ; "Vibe coding with GitHub Copilot: Agent mode and MCP support rolling out" — https://github.blog/news-insights/product-news/github-copilot-agent-mode-activated/ ; Copilot in Visual Studio April 2026 update — https://github.blog/changelog/2026-04-02-github-copilot-in-visual-studio-march-update/
20. "Major agentic capabilities improvements in GitHub Copilot for JetBrains IDEs" 2026-03-11 — https://github.blog/changelog/2026-03-11-major-agentic-capabilities-improvements-in-github-copilot-for-jetbrains-ides/ ; Visual Studio agent mode GA blog — https://devblogs.microsoft.com/visualstudio/agent-mode-is-now-generally-available-with-mcp-support/
21. "Enterprise AI Controls & agent control plane now generally available" 2026-02-26 — https://github.blog/changelog/2026-02-26-enterprise-ai-controls-agent-control-plane-now-generally-available/ ; "Enable Copilot cloud agent via custom properties" 2026-04-15 — https://github.blog/changelog/2026-04-15-enable-copilot-cloud-agent-via-custom-properties/ ; Managing access to GitHub Copilot cloud agent — https://docs.github.com/en/copilot/concepts/agents/cloud-agent/access-management
22. GitHub Copilot Cloud Agent press release — https://github.com/newsroom/press-releases/agent-mode
