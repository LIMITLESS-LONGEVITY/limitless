# Dispatch A.2 — Agentic Coding Engines (IDE / CLI)

**Read `00-COMMON-CONTEXT.md` first.** Output file: `docs/superpowers/reports/research/A.2-agentic-coding-engines-2026-04-27.md`

## Players in scope (6)

1. **Cursor** — agent mode (the autonomous-coding mode, not the chat assistant)
2. **Devin** (Cognition) — autonomous software engineer agent
3. **Claude Code** (Anthropic) — CLI + IDE integrations, including agent-sdk usage
4. **Cody** (Sourcegraph) — agentic coding features within Cody Enterprise
5. **JetBrains Junie** — JetBrains agentic coding agent across IDE family
6. **GitHub Copilot Workspace** — agent-mode workspace (the workspace product, not classic Copilot autocomplete)

## Out of scope (don't drift into these)

- Cline, Aider, Continue.dev (not enterprise-grade for this audit)
- Replit Agent (handled in A.3 — workflow-platform scope, not IDE)
- Windsurf / Codeium (smaller enterprise footprint than the 6 above)
- Anything in track A.3 (full-app workflow platforms), A.1 (spec-driven), or A.4 (orchestration)

## Capability axes (your matrix columns)

1. **Autonomy level** — suggest / propose-with-diff / apply-then-await-confirm / auto-execute
2. **Context strategy** — full-repo / RAG / IDE-current-file-and-buffers / hybrid
3. **Tool use** — file ops / shell / web fetch / MCP support / custom tools
4. **Multi-file change support** — single-file / cross-file in single edit / cross-file with verification loop
5. **Long-horizon task support** — minutes / hours / days (with checkpointing/resume)
6. **Subagent / role-specialization** — none / built-in (e.g., reviewer, planner) / user-defined
7. **Permission model** — per-tool / per-action / per-path / pre-approved-policy
8. **Pricing model** — per-seat / per-token / hybrid / enterprise quote
9. **Surface** — IDE / CLI / both / web
10. **Enterprise** — SSO / audit / on-prem / VPC / FedRAMP

## Implications-for-our-platform questions to address in §4

- What's the dominant autonomy-level expectation in 2026 enterprise teams? Where does our Architect sit on this spectrum?
- Long-horizon task support: how do these tools checkpoint? (Devin specifically — what's the state model?)
- MCP support adoption: which players are MCP-first, MCP-supporting, or MCP-absent?
- Permission models: how do they bridge "high autonomy" with "compliance audit"? Anything we should adopt?

## Sizing

6 players × ~10 axes + per-player notes + 4 implications + open questions + citations. Target output file: 800-1500 lines, ~5-10 KB.
