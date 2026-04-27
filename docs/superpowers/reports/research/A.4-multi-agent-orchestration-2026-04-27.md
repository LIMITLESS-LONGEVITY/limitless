---
dispatch_id: A.4
topic: Multi-Agent Orchestration Frameworks for SDLC
authored_by: LIMITLESS Infra Architect
date: 2026-04-27
context_anchor: project_meta_pivot_machine_that_builds_machines.md
players_count: 4
---

## 1. Players surveyed

1. **CrewAI (and CrewAI Enterprise)**
   - Vendor: CrewAI Inc.
   - Version: ongoing GA; CrewAI Enterprise on AWS Marketplace; pricing tiers Free / Professional $25/mo / paid plans up to $99/mo + Ultra ~$120K/yr [3]
   - URL: https://crewai.com / https://docs.crewai.com / https://github.com/crewaiinc/crewai
   - Evidence basis: CrewAI docs (hierarchical/sequential process), CrewAI pricing page, AWS Marketplace listing, 2026 reviews (Lindy, NxCode, IBM Think, 47Billion). No firsthand integration in this codebase.

2. **AutoGen (Microsoft Research → Microsoft Agent Framework)**
   - Vendor: Microsoft (Microsoft Research originally; productization moved into Microsoft Agent Framework)
   - Version: AutoGen v0.4.x in **maintenance mode**; Microsoft recommends Microsoft Agent Framework (MAF) for new projects [5]. **MAF v1.0 GA on 2026-04-03** (combines AutoGen + Semantic Kernel). AutoGen Studio remains a prototyping tool only.
   - URL: https://github.com/microsoft/autogen and https://devblogs.microsoft.com/agent-framework/
   - Evidence basis: AutoGen GitHub README, Microsoft Research project page, Visual Studio Magazine "Semantic Kernel + AutoGen = MAF" coverage, MAF v1.0 launch blog. No firsthand use.

3. **LangGraph (and LangGraph Platform / LangSmith)**
   - Vendor: LangChain Inc.
   - Version: LangGraph v1.0 (production-ready API); LangGraph Platform with Plus / Enterprise tiers; **`langchain-mcp-adapters` released 2026-03-16** [10]; LangSmith MCP endpoint per deployed agent [12]
   - URL: https://www.langchain.com/langgraph and https://github.com/langchain-ai/langgraph
   - Evidence basis: LangChain docs, LangGraph GitHub, LangSmith pricing/observability pages, 2026 deep dives (BetterLink, RapidClaw, dev.to). No firsthand use in this codebase.

4. **Microsoft Semantic Kernel (and Microsoft Agent Framework)**
   - Vendor: Microsoft
   - Version: SK at ~27.7K GitHub stars [13]; **converging into Microsoft Agent Framework v1.0** (GA 2026-04-03) [11]. SK and MAF coexist during migration; new projects are recommended onto MAF.
   - URL: https://github.com/microsoft/semantic-kernel and https://devblogs.microsoft.com/agent-framework/
   - Evidence basis: Microsoft Learn docs, Microsoft Foundry blog, devblogs, is4.ai 2026 stats. No firsthand use.

> **Convergence note**: Per §5 below, AutoGen and Semantic Kernel are formally merging into Microsoft Agent Framework as of 2026. I'm honoring the dispatch's 4-player scope by treating them as separate rows but cross-referencing MAF in both. D.1 may want to consolidate them into one "Microsoft Agent Framework" row.

## 2. Capabilities matrix

`?` = insufficient public evidence. Citation tokens reference §6.

| Axis | CrewAI | AutoGen → MAF | LangGraph | Semantic Kernel → MAF |
|---|---|---|---|---|
| **Topology** | sequential / hierarchical (manager-worker) / consensual (vote) [4] | conversational multi-agent + group chat; MAF adds **graph-based workflows** for explicit orchestration [5][11] | **arbitrary graph (StateGraph)**; nested graphs; conditional edges; parallel super-steps [9] | sequential + handoff; MAF adds graph workflows [11][13] |
| **State management** | per-task context passing; outputs flow as inputs [4] | per-conversation; MAF: **session-based state + context providers** [11] | **shared StateGraph + Postgres checkpointing per super-step**; thread-scoped; production-tested [9][14] | session-state + memory plugins; MAF unifies with AutoGen [11][13] |
| **Role specialization** | **role library**: agent has role + goal + backstory; ships SDLC-flavored examples (planner / coder / tester) [6] | peer agents + group chat; MAF: typed agent abstractions [5][11] | user-defined nodes; no built-in role library — you author the specialization [9] | plugin/skill model; agents are kernels with skills attached [13] |
| **Tool integration** | LLM-agnostic; **MCP via gateway pattern** [1][2] | LLM-agnostic; **MAF native MCP + A2A** at v1.0 [11] | LLM-agnostic; **`langchain-mcp-adapters` (Mar 2026)**; LangSmith now exposes per-agent MCP endpoints [10][12] | LLM-agnostic (model-agnostic SDK); **MAF native MCP + A2A** at v1.0 [11][13] |
| **Observability + debug** | crewAI Enterprise has built-in observability + audit logs; OTEL hooks [3] | AutoGen Studio for prototyping; **MAF: OpenTelemetry + Azure Monitor native** [5][11] | **LangSmith** is the dedicated observability platform; per-node OTEL traces; checkpoint replay [9][14] | built-in telemetry, logging, token usage; **MAF: OTEL + Azure Monitor** [11][13] |
| **Production-readiness** | **enterprise mission-critical**: PwC, IBM, Capgemini, NVIDIA, Oracle; "60% of Fortune 500"; 12M daily executions; 2B/yr [7] | AutoGen v0.4 maintenance-mode; **MAF v1.0 GA 2026-04-03** with LTS commitment [11] | production-grade (LangChain ecosystem maturity); >60% of agent prod incidents are state-related per LangChain's 2026 State of Agent Engineering [9] | mature SDK (~27.7K stars); MAF v1.0 GA [11][13] |
| **Multi-tenancy** | CrewAI Enterprise multi-tenant SaaS + dedicated/single-tenant tier [3] | framework — multi-tenancy is host-app's responsibility; Azure AI Foundry Agent Service is multi-tenant [5][11] | LangGraph Platform: managed SaaS (multi-tenant) / hybrid / self-hosted [8] | framework only; multi-tenancy via Azure host [13] |
| **Pricing** | Free OSS / Pro $25 / paid up to $99 / Ultra ~$120K/yr / Enterprise custom [3] | OSS (AutoGen) + MAF OSS; **commercial: Azure AI Foundry Agent Service** (consumption-based via Azure) [5][11] | OSS (LangGraph) + LangSmith Plus $39/seat + Enterprise custom; LangGraph Platform Plus + Enterprise [8] | OSS (SK + MAF); commercial: Azure AI Foundry [11][13] |
| **Enterprise governance** | SOC2, SSO (SAML/LDAP), RBAC, **policy-driven approvals**, **immutable audit logs per execution**, secret manager integration, PII detection/masking [1][3] | via Azure: Entra ID, Azure Monitor, Azure RBAC; CI/CD via GitHub Actions + Azure DevOps [11] | LangGraph Enterprise: SSO, custom retention, BYOC / hybrid / self-hosted; LangSmith for audit trails [8] | via Azure / MAF: Entra ID, OTEL, Azure Monitor [11][13] |
| **SDLC-specific** | docs explicitly cite "software development crews with planning, coding, and testing agents" as a primary use case [6] | general-purpose; SDLC patterns are user-authored | general-purpose; user-authored topologies; LangChain has SDLC tutorials but no built-in SDLC role library [9] | general-purpose; SK has SDLC plugin examples but no built-in SDLC role library [13] |

## 3. Per-player notes

### CrewAI

- **Strength**: **Strongest enterprise traction in the player set** — PwC, IBM, Capgemini, NVIDIA, Oracle as named references; 60% Fortune 500 reach; ~2B annual agent executions [7]. None of the others match this enterprise-deployment density.
- **Strength**: **Closest fit to our role-based topology**. CEO→Director→Architect→{Builder, Researcher, Reviewer} maps almost directly to CrewAI's `role + goal + backstory` agent definition + hierarchical-process manager-worker pattern. Less invention required.
- **Strength**: Enterprise governance posture is the strongest of the four — policy-driven approvals + immutable audit logs per execution + PII detection/masking are exactly what DR-003 framing wants.
- **Weakness**: Topology is constrained to three named processes (sequential / hierarchical / consensual). Arbitrary graph topology (LangGraph's strength) is not directly supported — workarounds require nesting crews or custom flow control.
- **Weakness**: Observability is solid in Enterprise tier but the OSS tier requires bring-your-own-OTEL. Step-replay/checkpoint-rewind is weaker than LangGraph's checkpointer story.

### AutoGen → Microsoft Agent Framework

- **Strength (MAF)**: **MAF v1.0 GA on 2026-04-03 is the consolidation event of the year for the Microsoft track.** Combines AutoGen's flexible multi-agent patterns with Semantic Kernel's enterprise primitives (session state, type safety, middleware, telemetry) and adds graph-based workflows. Native MCP + A2A interoperability at 1.0 means the Microsoft track is now MCP-first, not bolt-on.
- **Strength (MAF)**: Long-term-support commitment + .NET and Python first-class + Azure AI Foundry Agent Service as the commercial endpoint = strongest Microsoft-shop adoption story.
- **Weakness (AutoGen)**: AutoGen v0.4 is in **maintenance mode** [5]. Adopting AutoGen-the-codebase today is a stranded-investment risk; you should adopt MAF or wait for the migration to settle.
- **Weakness (AutoGen Studio)**: Explicitly **not production-ready** — Microsoft positions it as prototyping-only. Any "AutoGen Studio in prod" claim should be discounted.
- **Weakness (MAF)**: Brand-new GA (3 weeks before this dispatch). API surface is stable (per Microsoft) but enterprise-deployment references are still emerging. Less proven than CrewAI on production volume.

### LangGraph

- **Strength**: **Most expressive topology**: arbitrary StateGraph with conditional edges, nested graphs, parallel super-steps, and incremental state-merging make it the framework with the smallest "I can't model this workflow" gap [9].
- **Strength**: **Best state management story by margin.** LangChain's own 2026 State of Agent Engineering report notes 60%+ of agent production incidents are state-related — and LangGraph has the most mature answer (Postgres checkpointer, threads, super-step replay, schema migrations safe-by-default for non-interrupted threads) [9][14]. Strongly recommended pattern even if we don't adopt LangGraph wholesale.
- **Strength**: Observability is the differentiator at the platform tier — LangSmith provides per-node OTEL traces, replay-from-checkpoint, evaluation runs, and (new in 2026) per-deployed-agent MCP endpoints [12]. The "every agent is also a tool via MCP" symmetry is structurally elegant.
- **Strength**: MCP integration via `langchain-mcp-adapters` (March 2026) + per-agent MCP endpoint on LangSmith means LangGraph is now firmly MCP-first.
- **Weakness**: **No built-in SDLC role library**. You hand-roll role-specialization via node definitions and prompts. Higher build cost than CrewAI.
- **Weakness**: Tight coupling to LangChain ecosystem. Adoption brings the whole stack (LangChain primitives, LangSmith for observability, often LangGraph Platform for runtime). Vendor entanglement is real, even though the OSS core is permissively licensed.
- **Weakness**: 60%+ of production incidents being state-related is partly an indictment of LangGraph's flexibility — it gives you the tools to build correctly but does not prevent incorrect schemas from compiling.

### Semantic Kernel → Microsoft Agent Framework

- **Strength**: Strong .NET-side adoption; the SDK has the most mature plugin/skill primitive of the player set if you live in Azure / .NET.
- **Strength**: Built-in telemetry + Azure Monitor wiring is enterprise-ready out of the box — this is what AutoGen lacked and SK contributed to MAF.
- **Strength (MAF)**: As above for AutoGen — MAF is the canonical productization of SK's primitives plus AutoGen's multi-agent patterns. Adopting SK today positions you on a clear MAF migration path.
- **Weakness**: Same as AutoGen — SK as a standalone product is being absorbed. New work should target MAF [11].
- **Weakness**: Azure-shop bias is strong. Outside .NET / Azure ecosystems, SK feels heavier than CrewAI or LangGraph for the same task.
- **Weakness**: No built-in SDLC role library — same gap as LangGraph.

## 4. Implications for our platform

1. **Our hand-rolled CEO→Director→Architect→{Researcher, Builder, Reviewer} topology is structurally CrewAI's hierarchical process — and we should know that.** We're not inventing a novel topology. The interesting differentiation is *governance posture* (DR-001/002/003 layered ratification, audit-trail-as-first-class), not orchestration. Recommendation: **don't adopt CrewAI wholesale, but explicitly model our topology in CrewAI's vocabulary** so we can interop later (export a CrewAI-shaped manifest from our platform). This makes us legible to a market that already knows that vocabulary.

2. **State management is the production-incident hotspot — adopt LangGraph's pattern even if not LangGraph itself.** LangChain's 2026 report (60%+ of agent prod incidents are state-related) is the load-bearing data point of this whole research wave for our platform's reliability story. **Adopt the pattern**: typed StateGraph schema (we'd write it as a TypeScript type), Postgres-backed checkpoint per super-step (our `outbound.db` is sqlite-based today; recommend evaluating Postgres for the dispatch-state spine), thread-scoped state, super-step replay for debugging, schema-migration-safety for non-interrupted threads. This is a concrete v3 architecture input.

3. **MCP-first is now the default across all four.** As of April 2026: CrewAI has the gateway pattern; MAF v1.0 ships native MCP + A2A; LangGraph has `langchain-mcp-adapters` + per-agent LangSmith MCP endpoints; SK→MAF inherits. **Decision: our platform should be MCP-first too, with the per-role MCP allowlist registry pattern (from A.3 — gh-aw enterprise) as the governance overlay.** Combined adoption of MCP-as-tool-protocol + per-role-allowlist-registry-as-policy is the strongest pattern available in the 2026 landscape.

4. **Production-readiness gap**: Only CrewAI has named-Fortune-500 references at scale on the orchestration-framework axis. MAF is brand-new (3 weeks GA), LangGraph is mature but doesn't publish equivalent enterprise-customer rosters publicly, SK is widely starred but production-deployment density is harder to quantify. **For our case-study credibility**: when we describe LIMITLESS/Mythos as case studies for the platform, we should benchmark against CrewAI's enterprise-traction story (we won't match the volume, but we should match the depth — i.e., "production-deployed for real teams with real audit trails," not "demo-quality").

5. **A2A protocol convergence is the next dispatch this research should provoke.** All four players now reference Agent-to-Agent (A2A) protocol alongside MCP. MCP is "agent ↔ tool"; A2A is "agent ↔ agent". MAF v1.0 ships both natively. CrewAI has agent-to-agent communication via its hierarchical-process delegation. LangGraph treats every deployed agent as an MCP-exposed tool, which is one path to A2A. **Recommendation: D.1 should consider adding an A.6 dispatch on A2A protocol** — if we're building cross-app coordination (the multi-app gap from A.3 implication 2), A2A is the wire-format question we'll have to answer.

## 5. Open questions / where evidence is thin

- **AutoGen + Semantic Kernel = Microsoft Agent Framework convergence**: the dispatch listed AutoGen and SK as separate players, but as of 2026-04-03 they are formally one product (MAF v1.0). Treated as separate rows here per dispatch scope, but **D.1 may want to consolidate into one Microsoft track**. This is the biggest structural finding of the dispatch — flagging strongly.
- **CrewAI Enterprise governance details**: SOC2, SSO, RBAC, audit are confirmed [1][3] but specific certifications (ISO 27001? HIPAA? FedRAMP?) and audit-event schema (does it match GitHub's `actor_is_agent` granularity?) are not documented in public sources. Open question for procurement.
- **LangGraph self-host SLA / data-residency depth**: Enterprise tier offers BYOC/hybrid/self-host, but specific compliance certifications for the LangChain-managed control plane (when used in hybrid mode) are unclear. Important for regulated tenants.
- **MAF production references**: too new for credible Fortune-500 deployment claims. Re-poll mid-2026.
- **A2A protocol maturity**: surfaced repeatedly but I didn't go deep — possible follow-up dispatch (see Implication 5).
- **Did I miss a player?** Out-of-scope per dispatch: Smolagents, OpenHands, Devika, Bedrock Agents, Vertex Agent Builder. Worth flagging for D.1: Bedrock Agents has substantial enterprise adoption and is "general-purpose, not SDLC-focused" by dispatch definition — but our platform's plumbing is general-purpose, so re-bucketing may be worth considering.

## 6. Citations

1. "Solving Scalability and Management Woes: Integrating CrewAI with an MCP Server" 2026-02 — https://dasroot.net/posts/2026/02/solving-scalability-management-woes-crewai-mcp-server/
2. "Is MCP the Future of AI Integration? Roadmap, What Shipped, and What's Next (2026)" — https://www.getknit.dev/blog/the-future-of-mcp-roadmap-enhancements-and-whats-next
3. CrewAI Pricing — https://crewai.com/pricing ; AWS Marketplace CrewAI Enterprise — https://aws.amazon.com/marketplace/pp/prodview-e6oyhm2ed6l3c ; "CrewAI Pricing Guide" ZenML — https://www.zenml.io/blog/crewai-pricing ; "CrewAI Pricing 2026" Lindy — https://www.lindy.ai/blog/crew-ai-pricing
4. CrewAI Hierarchical Process — https://docs.crewai.com/en/learn/hierarchical-process ; "Key Differences Between Hierarchical and Sequential Processes in CrewAI" — https://help.crewai.com/ware-are-the-key-differences-between-hierarchical-and-sequential-processes-in-crewai
5. AutoGen GitHub — https://github.com/microsoft/autogen ; AutoGen Microsoft Research — https://www.microsoft.com/en-us/research/project/autogen/ ; "Semantic Kernel + AutoGen = Open-Source Microsoft Agent Framework" Visual Studio Magazine — https://visualstudiomagazine.com/articles/2025/10/01/semantic-kernel-autogen--open-source-microsoft-agent-framework.aspx
6. CrewAI tutorial — IBM Think "What is crewAI?" — https://www.ibm.com/think/topics/crew-ai ; DigitalOcean "CrewAI: A Practical Guide to Role-Based Agent Orchestration" — https://www.digitalocean.com/community/tutorials/crewai-crash-course-role-based-agent-orchestration
7. "CrewAI Gains Enterprise Tech 30 Recognition" TipRanks — https://www.tipranks.com/news/private-companies/crewai-gains-enterprise-tech-30-recognition-amid-rising-ai-agent-adoption ; "How CrewAI is orchestrating the next generation of AI Agents" Insight Partners — https://www.insightpartners.com/ideas/crewai-scaleup-ai-story/ ; "100% of Enterprises to Expand Agentic AI in 2026 – CrewAI" — https://techintelpro.com/news/ai/enterprise-ai/100-of-enterprises-to-expand-agentic-ai-in-2026-crewai
8. LangSmith Pricing — https://www.langchain.com/pricing ; LangGraph Platform plans — https://docs.langchain.com/langgraph-platform/plans ; "LangGraph Pricing Guide" ZenML — https://www.zenml.io/blog/langgraph-pricing
9. LangGraph Graph API overview — https://docs.langchain.com/oss/python/langgraph/graph-api ; "LangGraph State Management in Practice: 2026 Agent Architecture Best Practices" BetterLink Blog — https://eastondev.com/blog/en/posts/ai/20260424-langgraph-agent-architecture/ ; "LangGraph State Machines: Managing Complex Agent Task Flows in Production" — https://dev.to/jamesli/langgraph-state-machines-managing-complex-agent-task-flows-in-production-36f4
10. langchain-mcp-adapters (PyPI, released 2026-03-16) — https://pypi.org/project/langchain-mcp-adapters/ ; LangChain MCP adapters changelog — https://changelog.langchain.com/announcements/mcp-adapters-for-langchain-and-langgraph
11. "Microsoft Agent Framework Version 1.0" devblog 2026-04-03 — https://devblogs.microsoft.com/agent-framework/microsoft-agent-framework-version-1-0/ ; Microsoft Agent Framework Overview — https://learn.microsoft.com/en-us/agent-framework/overview/ ; "MAF GA: AutoGen + Semantic Kernel Unified" — https://jangwook.net/en/blog/en/microsoft-agent-framework-ga-production-strategy/ ; Using MCP Tools in MAF — https://learn.microsoft.com/en-us/agent-framework/agents/tools/local-mcp-tools
12. LangSmith MCP endpoint changelog — https://changelog.langchain.com/announcements/langgraph-platform-now-supports-mcp ; MCP endpoint in Agent Server docs — https://docs.langchain.com/langsmith/server-mcp
13. Semantic Kernel GitHub — https://github.com/microsoft/semantic-kernel ; "Semantic Kernel: Microsoft's AI Framework Hits 27,770 Stars in 2026" — https://www.is4.ai/blog/our-blog-1/semantic-kernel-microsoft-ai-framework-2026-384 ; "Semantic Kernel and Microsoft Agent Framework" devblog — https://devblogs.microsoft.com/agent-framework/semantic-kernel-and-microsoft-agent-framework/
14. "[Deep Dive] LangGraph Checkpointing with Postgres (2026)" Rapid Claw — https://rapidclaw.dev/blog/deploy-langgraph-production-tutorial-2026
15. "MCP, A2A & CrewAI: AI Agent Frameworks for Production 2026" 47Billion — https://47billion.com/blog/ai-agents-in-production-frameworks-protocols-and-what-actually-works-in-2026/
