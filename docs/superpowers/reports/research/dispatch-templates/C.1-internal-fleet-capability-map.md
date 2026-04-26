# Dispatch C.1 — Internal LIMITLESS Fleet Capability Map

**Read `00-COMMON-CONTEXT.md` first.** Output file: `docs/superpowers/reports/research/C.1-internal-fleet-capability-map-2026-04-27.md`

## Your task

Honestly map what our LIMITLESS agentic dev fleet actually does TODAY across the 10 (soon 12 — see B.1) SDLC phases. This is the "where are we now" anchor for the gap analysis in D.1.

This is not a research-the-internet task. This is a read-our-own-codebase-and-memory task. Cite file paths, line numbers, and memory entry titles.

## Components to audit

For each component, document: **what it does today**, **what it doesn't do**, **stability assessment** (production-stable / fragile / experimental).

1. **OpenClaw Director** (`/home/limitless/.openclaw/`) — role, channels bound, current operational constraint (analysis-only per `feedback_governance_determinism_primacy.md`)
2. **5 per-app Architects** (Infra, PATHS, Cubes+, HUB, DT) — channels, scope per `apps/nanoclaw/groups/discord_<app>-eng/CLAUDE.md`, restoration state per `project_2026-04-26_architect_fleet_v2_restoration.md`
3. **NanoClaw v2** (`/home/limitless/nanoclaw-v2/`) — what it does (container spawn, message routing, session management); fork vs upstream divergence
4. **OneCLI v1.4.1** — credential gateway role, agents created today, GitHub provider OAuth-only limitation
5. **GitHub App identity** (`limitless-agent[bot]`) — DR-001 status, Phase 3 not-yet-ported-to-v2 state
6. **OpenAI Codex / OAuth subscription** — current model (`openai-codex/gpt-5.5`), JWT refresh flow
7. **Claude Code subscription** — model defaults, Opus 4.7 patch applied 2026-04-26
8. **Discord** as the I/O surface — engage_mode, group policy, known bugs (per the post-DR-003 backlog in MEMORY.md)
9. **Hetzner VPS-1** — current stack (CX33, Node 24, Docker, OneCLI, NanoClaw v2 systemd user service, OpenClaw systemd user service)
10. **Governance specs + DR records** — what's ratified (DR-001, DR-002), what's pending (DR-003 + Amend-C, Amend-D)

## Map to SDLC phases

For each of the 10 SDLC phases (per `AgileSDLCToolsAndPlatformsReport.md`), produce:
- **Phase name**
- **Components involved** — which of the above 10 components touch this phase
- **What we DO today** — concrete capability statement(s) with code/file citations
- **What we DON'T do today** — honest gaps
- **Fragility class** — production-stable / fragile-but-working / experimental / not-yet
- **Recent incidents related** — any from `project_*.md` memory entries that surface real-world friction

## Capability axes (your matrix, components × phases)

Rows = 10 components above. Columns = 10 SDLC phases. Cells = "produces output here" / "consumes context here" / "no role" / specific micro-capability.

## Implications-for-our-platform questions to address in §4

- Which SDLC phases are completely uncovered by our fleet today?
- Which phases are "covered" but fragile (dependent on a single workaround, single human, single config file)?
- Which components are pulling double-duty across phases — strength or coupling-debt?
- What's the current "happy path" for an end-to-end task (e.g., "implement feature X for app Y") and where does it break?

## Sizing

Substantial. 10 components × 10 phases is a real matrix. Cite generously. Target: 1500-3000 lines, ~10-15 KB.

## Source materials (your reading list)

- `MEMORY.md` (project memory index)
- `project_2026-04-26_*` arc files (rebuild, fleet restoration, Director restoration)
- `project_meta_pivot_machine_that_builds_machines.md` (the strategic context)
- `feedback_*.md` files (operational constraints + workarounds)
- `apps/nanoclaw/groups/discord_<app>-eng/CLAUDE.md` (5 files)
- `docs/decisions/DR-001-*.md` and `DR-002-*.md`
- `docs/superpowers/specs/2026-04-22-bot-feedback-loop-incident.md`
- The fork's `apps/nanoclaw/src/container-runner.ts` for v1.2.53 reference
