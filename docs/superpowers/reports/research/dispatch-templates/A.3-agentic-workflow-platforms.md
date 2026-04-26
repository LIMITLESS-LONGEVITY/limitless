# Dispatch A.3 — Agentic SDLC Workflow Platforms

**Read `00-COMMON-CONTEXT.md` first.** Output file: `docs/superpowers/reports/research/A.3-agentic-workflow-platforms-2026-04-27.md`

## Players in scope (6)

1. **GitHub Next ACE** (Agentic Coding Environment) — research/preview, GitHub-backed
2. **GitHub Agentic Workflows** — productized agentic-workflow capabilities in GitHub
3. **Bolt.new** (StackBlitz) — agentic full-app generation, enterprise tier
4. **v0** (Vercel) — agentic UI + app workflow, enterprise tier
5. **overcut.ai** — research this player carefully; if it doesn't fit the A.3 enterprise-agentic-workflow definition, flag in §5 and propose better bucket. Don't force-fit.
6. **Replit Agent** — agentic workflow that builds + deploys whole apps in Replit, enterprise tier

## Out of scope (don't drift into these)

- Lovable, Magic Patterns (not enterprise-grade)
- Cursor, Devin, Copilot Workspace (handled in A.2 — IDE-level not workflow-platform-level)
- Spec-driven frameworks (handled in A.1)
- Multi-agent orchestration libraries (handled in A.4)

## Capability axes (your matrix columns)

1. **Scope of single user prompt** — feature / module / full-app
2. **Stack flexibility** — framework-locked (e.g., Next.js only) / framework-family / framework-agnostic
3. **Hosting model** — their cloud only / self-host option / your-cloud connector
4. **Iteration model** — one-shot / conversational refinement / spec-driven re-gen
5. **Output destination** — their hosting / ZIP-export / your-Git-repo / multi-target
6. **Team collaboration** — single-user / team / org-tier
7. **Enterprise governance** — RBAC / audit / SSO / on-prem / data residency
8. **Pricing model** — per-seat / per-build / per-deployment / enterprise quote
9. **Maturity signal** — research / beta / GA / production-mission-critical adoption
10. **Architecture transparency** — black-box / partial-visibility / full-instrumentation

## Implications-for-our-platform questions to address in §4

- Are these competing with us (project-agnostic SDLC platforms) or complementary (point-solutions we orchestrate)?
- For each player, does their "full-app from prompt" pattern support iteration + maintenance, or is it generate-and-fork?
- Where do they fail at multi-app coordination (which is what our 5-Architect fleet enables)?
- What can we learn from their approach to enterprise governance (RBAC / audit / data-residency)?

## Sizing

6 players × ~10 axes + per-player notes + 4 implications + open questions + citations. Target output file: 800-1500 lines, ~5-10 KB.

## Special note on overcut.ai

CEO specifically requested overcut.ai be included in this bucket as a replacement for Lovable. If your research finds it's actually a video-editing AI or otherwise miscategorized, document the finding in §5 and propose where (if anywhere) it belongs. We'd rather an honest "this doesn't belong here" than a forced fit.
