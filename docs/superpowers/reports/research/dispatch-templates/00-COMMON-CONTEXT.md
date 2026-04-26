# Common context for all research dispatches (read first)

> **Strategic pivot, 2026-04-27:** This project has pivoted from "build LIMITLESS / Mythos" to "**build the project-agnostic agentic SDLC platform — the machine that builds the machines**." LIMITLESS and Mythos are now case studies. Every dispatch's deliverable feeds the **D.1 synthesis** that becomes the planning-phase kickoff doc for this platform. Memory anchor: `project_meta_pivot_machine_that_builds_machines.md`.

## What you (Architect) are part of

Eight parallel research dispatches (A.1–A.5, B.1, C.1, C.2) feeding one synthesis (D.1). Yours is one of them. Each produces a markdown file with a strict structure so D.1 can recompose them mechanically.

## Strict deliverable structure (DO NOT deviate — recomposability depends on it)

Output: ONE markdown file at `docs/superpowers/reports/research/<dispatch-id>-<topic-slug>-2026-04-27.md` (full path inside `/workspace/extra/monorepo/`). Required frontmatter + sections:

```markdown
---
dispatch_id: <e.g., A.2>
topic: <short title>
authored_by: <Architect role, e.g., Infra Architect>
date: 2026-04-27
context_anchor: project_meta_pivot_machine_that_builds_machines.md
players_count: <int>
---

## 1. Players surveyed
For each: name, vendor, version/release date, URL, evidence basis (web sources / firsthand experience / N/A).

## 2. Capabilities matrix
Markdown table. Rows = players. Columns = capability axes specified in your dispatch.
Cell values: short factual claim + 1-line evidence/citation token. Use `?` for unknowns.

## 3. Per-player notes (1-3 bullets each, strengths AND weaknesses)
Subsections per player.

## 4. Implications for our platform
3-5 bullets. Each ties an observation to "what this means for the platform we're building."

## 5. Open questions / where evidence is thin
Bullets. Mark uncertainty honestly.

## 6. Citations
Numbered list. URL + access date + title.
```

## Research approach (mandatory)

- **Use WebFetch / WebSearch tools** for current 2026 evidence. Don't paraphrase from training data.
- **Prefer 2026 sources.** When forced to fall back on older, mark in citations.
- **If a player doesn't fit your bucket, surface it** in §5 and propose a better bucket — DON'T force-fit.
- **Cite file:line** for any claim about our codebase (e.g., `apps/nanoclaw/src/container-runner.ts:88-100`).
- **Honest uncertainty.** "Insufficient public evidence to assess X" is better than guessing.
- **Multi-message Discord OK.** Final delivery is the file; Discord message is just an announcement + path. The bind-mount-as-mailbox pattern means the file is canonical; Discord is just the notification.

## Constraints (verbatim per `feedback_governance_determinism_primacy.md`)

- **Analysis-only.** Do not modify code, do not open PRs, do not run write operations.
- Per the bot-feedback-loop incident report (PR #82), all Architect-class agents respect this constraint until DR-003 ratifies. **This dispatch respects that constraint.**
- The output file is a research artifact, not a governance act — writing it is permitted and expected.

## Reference materials

- `docs/superpowers/reports/AgileSDLCToolsAndPlatformsReport.md` — existing 2026 industry SDLC baseline (10 phases × top 5 platforms each)
- `docs/superpowers/specs/2026-04-22-bot-feedback-loop-incident.md` — context for governance constraints
- `docs/decisions/DR-001-agent-identity-and-ratification-flow.md` and `DR-002-nanoclaw-source-of-truth-and-deployment.md` — current platform governance template

No deadline; depth over speed. ~5-15 min architect runtime is fine; 30+ min is fine if depth requires.
