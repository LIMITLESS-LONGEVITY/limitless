# Dispatch B.1 — Industry SDLC Baseline ratification + amendment

**Read `00-COMMON-CONTEXT.md` first.** Output file: `docs/superpowers/reports/research/B.1-industry-baseline-amendments-2026-04-27.md` (NOTE: amendment file, not a replacement)

## Source document

`docs/superpowers/reports/AgileSDLCToolsAndPlatformsReport.md` — 257 lines, 2026-04-27, comprehensive industry SDLC survey across 10 phases × top 5 platforms each. Read it in full first.

## Your task

This dispatch is different from A.1-A.5. You are **ratifying and amending** an existing report, not surveying new players from scratch. Two-part job:

### Part 1 — Ratification (audit)
For each of the report's 10 phases (Conceptualization, Requirements, Design, Development, QA, CI/CD, Security, Deployment, Maintenance, Communication):
- **Spot-check 5-10 specific factual claims** by following the report's citations or doing fresh WebFetch lookups.
- **Mark each claim:** ✅ verified, ⚠️ needs caveat, ❌ contradicted by current 2026 evidence.
- **Look for missing major players** the report omitted (e.g., is JetBrains Junie missing from Phase 4? Is Project IDX or Google Jules missing? Is GitHub Copilot Workspace missing as separate from Copilot?).

### Part 2 — Amendment
Produce these specific deltas:
- **New entries** for phases that need additional players (especially in Development, QA, CI/CD, Security where the agentic-tool category has exploded since 2026-Q1).
- **Expanded agentic-tool coverage** — the existing report mentions agentic capabilities in passing within each phase. Pull these out into a dedicated subsection per phase: "Agentic capabilities in [phase] in 2026" with 3-5 paragraphs.
- **Phase 11 — Project Management & Issue Tracking** as a NEW section — the report covers PM tools tangentially (Jira/Linear/Azure Boards in Phase 2 Inception) but never gives them a dedicated phase. Add it. Top 5: Jira, Linear, GitHub Projects, Azure Boards, ClickUp. Capability comparison.
- **Phase 12 — Knowledge & Documentation Operations** — also currently scattered. Consolidate. Top 5: GitBook, Notion, Confluence, Mintlify, Read the Docs.

### Part 3 — Open Questions for D.1 synthesis
Specifically flag any 2026 evidence shifts that would change the report's conclusions if incorporated.

## Deliverable structure (deviates slightly from common-context template — this is an amendment, not a survey)

```markdown
---
dispatch_id: B.1
topic: Industry SDLC Baseline — Ratification + Amendment
date: 2026-04-27
---

## 1. Ratification audit
For each of 10 phases: list of claims spot-checked, verdict per claim, citations.

## 2. Missing players
Per phase: name, vendor, why it should be added, 2-3 sentence summary.

## 3. New phases (11 + 12)
Full mini-sections matching the source report's structure.

## 4. Agentic-capability subsections
For each of 10 original phases + 2 new phases: paragraph(s) on agentic-tool coverage in that phase as of 2026.

## 5. Open questions / contradictions
What 2026 evidence shifts could invalidate the source report's conclusions?

## 6. Citations
URL + access date + title.
```

## Sizing

Larger than the A.x dispatches because it's a 12-phase audit. Target: 1500-3000 lines, ~10-20 KB. Take your time.
