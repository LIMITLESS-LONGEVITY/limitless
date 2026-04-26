# Dispatch C.2 — LIMITLESS workflow vs Industry Agile methodologies

**Read `00-COMMON-CONTEXT.md` first.** Output file: `docs/superpowers/reports/research/C.2-workflow-vs-industry-methodologies-2026-04-27.md`

## Your task

Map our actual workflow patterns against industry agile methodologies. Surface where we accidentally follow industry patterns, where we deviate intentionally, and where we deviate accidentally (the dangerous category).

## Methodologies to map against (4)

1. **Scrum** — sprints, ceremonies (planning, retro, daily, review), roles (PO/SM/Dev), artifacts (backlog, increment), DoD/DoR
2. **Kanban** — WIP limits, flow metrics, pull-system, cycle time, lead time, classes of service
3. **Extreme Programming (XP)** — pair programming, TDD, CI, refactoring, simple design, customer on-site, planning game
4. **SAFe (Scaled Agile Framework)** — relevant only for the multi-team scaling angle if we ever go from "single CEO + N architects" to "N humans + M architects"

## Our patterns to map (read the memory + specs to identify them)

You'll find evidence in:
- `feedback_*.md` files (especially `feedback_governance_determinism_primacy.md`, `feedback_emergency_pr_protocol.md`, `feedback_route_pr_authorship_to_bot.md`, `feedback_end_of_session_protocol.md`)
- `docs/decisions/DR-001-*.md`, `DR-002-*.md`
- `docs/superpowers/specs/agentic_software_development.md` (existing high-level framing)
- Recent `project_*.md` arc files (concrete examples of how dispatch-and-merge actually flows)
- `MEMORY.md` Pending CEO Action sections (current backlog handling)

Patterns I expect you to find (verify or correct):
- **Dispatch model:** ad-hoc CEO directive (vs sprint-planned), Director-relayed for some work
- **Backlog management:** memory-file-based (`MEMORY.md` Pending CEO Action lists, `feedback_*.md` for recurring constraints) — not Jira/Linear
- **Ratification ceremony:** §5.1 formal Approving Review (squash-merge with bot author preserved) — closer to gate review than scrum review
- **Iteration:** session-based (each Claude Code session is a unit) — not sprint-based
- **WIP limits:** implicit (one CEO can only review N PRs at once) — not codified
- **Definition of Done:** governance-spec-defined (§5.1 Approving Review + bot author preserved + squash merge) — strong on "merged" weak on "delivered to user"
- **Incident response:** retro docs in `docs/superpowers/specs/2026-04-22-*.md` and `2026-04-25-*.md` (Meridian-diff arc, bot-loop incident) — closer to XP "post-mortem" than Scrum "retro"
- **Pair programming:** N/A — we have CC-session ↔ Architect dispatches, which is closer to "expert + apprentice asynchronous handoff"

## Capability axes (your matrix)

Rows = 4 methodologies. Columns = practice axes:
1. Planning cadence (sprint / continuous / on-demand)
2. Backlog management (Jira/Linear vs other vs in-band)
3. Estimation (story points / hours / none)
4. WIP limits
5. Definition of Done
6. Iteration ceremonies (planning, retro, demo, review)
7. Roles (PO/SM/Dev/etc.)
8. Pair programming pattern
9. CI/CD integration
10. Customer feedback loop

For each cell: short factual claim about how that methodology handles that axis + how OUR fleet handles it + similarity verdict (✅ matches / ⚠️ partial / ❌ deviation / 🆕 we have something they don't).

## Implications-for-our-platform questions to address in §4

- Which methodology does our current fleet most resemble? (My hypothesis: Kanban + XP retro, with NO sprint cadence.)
- What patterns are we missing that we should adopt for the project-agnostic platform?
- What patterns from our fleet are uniquely agentic and don't map to any existing methodology — these become the platform's "new methodology contributions"?
- For the platform to support "any software project" being built by agents, does it need to be opinionated about methodology, or methodology-agnostic?

## Sizing

Smaller than C.1. Target: 800-1500 lines, ~5-10 KB.
