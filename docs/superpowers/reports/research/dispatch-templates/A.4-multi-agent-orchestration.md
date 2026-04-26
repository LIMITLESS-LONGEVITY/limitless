# Dispatch A.4 — Multi-Agent Orchestration Frameworks for SDLC

**Read `00-COMMON-CONTEXT.md` first.** Output file: `docs/superpowers/reports/research/A.4-multi-agent-orchestration-2026-04-27.md`

## Players in scope (4)

1. **CrewAI** — including CrewAI Enterprise tier
2. **AutoGen** (Microsoft Research → MS productization momentum) — current state of enterprise productization
3. **LangGraph** (LangChain enterprise) — including LangGraph Cloud
4. **Microsoft Semantic Kernel** — including its agent framework + enterprise integration story

## Out of scope (don't drift into these)

- Smolagents, OpenHands, Devika (not enterprise-grade)
- Cloud-vendor agent platforms (Bedrock Agents, Vertex Agent Builder) — those are general-purpose, not SDLC-focused
- Agent IDEs (Cursor/Devin in A.2)

## Capability axes (your matrix columns)

1. **Topology support** — sequential / parallel / hierarchical / arbitrary graph
2. **State management** — shared blackboard / per-agent isolated / event-sourced / hybrid
3. **Role specialization** — manager-worker / peer / role library / user-defined
4. **Tool integration** — LLM-agnostic / locked to one provider / MCP-supporting
5. **Observability + debugging** — built-in / external integration / minimal
6. **Production-readiness signal** — toy/demo / production-references / enterprise mission-critical
7. **Multi-tenancy** — single-tenant / multi-tenant / N/A
8. **Pricing model** — open-source / per-seat / cloud-managed pricing / enterprise quote
9. **Enterprise governance** — RBAC / audit / SSO / on-prem
10. **SDLC-specific patterns** — does it ship with SDLC role templates (planner/coder/reviewer/etc.) or is it general-purpose?

## Implications-for-our-platform questions to address in §4

- Where does our Director/Architect topology sit in the orchestration-framework landscape? Are we hand-rolling something one of these solves better?
- What's the production-readiness gap: do any of these have real enterprise references shipping software with them?
- State management: are any using a pattern (event-sourced, shared blackboard) we should adopt for our v3 architecture?
- MCP support: which frameworks are MCP-first vs MCP-skeptical? This shapes our integration strategy.

## Sizing

4 players × ~10 axes + per-player notes + 4 implications + open questions + citations. Target output file: 600-1200 lines, ~4-8 KB.
