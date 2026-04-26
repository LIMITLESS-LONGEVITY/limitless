---
status: DRAFT
author: Director (drafted on behalf of CEO insight 2026-04-25)
intended-reviewer: Infra Architect (primary) + main-ops Architect (cross-cutting governance review)
created: 2026-04-25
priority: P0 (strategic — gates safe execution of v2 migration and all future structural changes)
---

# Multi-Environment Architect Pipeline (Dev → Test → Staging → Prod)

## Origin

CEO insight, 2026-04-25, immediately after the ~10-hour fleet-breakage incident triggered by the Week 1 Node 24 deploy:

> "We should've had a structured pipeline (Dev → Test → Staging → Prod) to ensure stability. The Architects are themselves a development project and we were in the process of migrating the very agentic AI dev team into a de-facto dev project (just like codex+omx+clawhip are a dev project living on github), we should've thought about setting corresponding environments before doing these changes."

This proposal codifies that insight into a formal environment model + setup plan.

## The structural bug we're fixing

The agentic AI Architect fleet **is itself a software product** — built from NanoClaw + custom container-runner code + per-Architect CLAUDE.md fragments + OneCLI integration + GitHub App identity layer + Discord-bound channels. It's actively under development, with a steady cadence of upstream syncs, custom features, and dependency upgrades. It deserves the same engineering discipline as any other software product in the org.

Until now, that product has been treated as production-only infrastructure. There has been one running NanoClaw fleet (VPS-1), and every change has gone directly to it. This is the structural bug.

The asymmetry is jarring once named:
- **Codex/OMX/Clawhip integration**: treated as a project — proper repos, branches, environments (dev → CI → staging → prod), governance, peer review.
- **Architects themselves (the team that does the integration work)**: treated as production-only infrastructure — every change to them is a direct prod change.

## Why this matters: every class of incident today maps to a missing environment

| Today's failure | Caught at | How |
|---|---|---|
| Week 1 Node 24 deploy activated dormant OneCLI-proxy code path (multi-PR cascade compiled at once into dist/index.js) | **Test** | Full container lifecycle exercised against Test OneCLI; failure visible before touching prod |
| OneCLI version drift (1.1.0 → 1.4.1, 3 majors stale) | **Dev → Test** | Periodic upgrade rehearsals as part of dependency-freshness checks |
| Missing `ONECLI_API_KEY` env var (latent for entire deployment lifetime) | **Dev** | First proper `/init-onecli` skill execution would have populated it; Test would re-validate from scratch each rehearsal |
| Anthropic OAuth handling change requiring `anthropic-beta: oauth-2025-04-20` header | **Staging** | E2E smoke test against real Anthropic in Staging detects external-dependency contract drift |
| OneCLI MITM streaming bug on long requests | **Test/Staging** | First long-output Architect dispatch (any non-trivial doc) exercises this; surfaces well before reaching CEO |
| 11 minutes of Architect work lost to ephemeral container idle-timeout | **Dev** | Iterative dev loop has no idle-timeout-cull because dev sessions are interactive |
| Code 137 silent failures every 4 hours on proactive checks (not surfaced for ~8 hours) | **Test/Staging** | Smoke-test-on-deploy + alerting on prod failure rate would have surfaced within minutes |

**Every incident class today maps to a missing environment.** This is not coincidence. Single-environment systems concentrate all failure modes onto live users.

## Proposed environment model

| Env | Where | Discord namespace | Purpose | Promotion gate |
|---|---|---|---|---|
| **Dev** | Local CEO laptop or dedicated dev-VPS | DM-only or no live channels | Write & iterate code, test individual containers, exercise dependency upgrades, validate config changes | Self-test by author |
| **Test** | Separate Hetzner CX32 VPS (call it VPS-3 or `nanoclaw-test`) | Separate Discord guild OR `#test-*-eng` channels under a separate test bot | Integration tests, version rehearsals, dormant-code-path activation, full container lifecycle, dependency-freshness checks, "rebuild from scratch" rehearsals | Automated test suite + Director smoke-test |
| **Staging** | Mirror of VPS-1 architecturally (same versions, same config shape, separate VPS — call it VPS-4 or `nanoclaw-staging`) | Separate staging Discord guild + staging bot identity OR `#staging-*-eng` channels | Pre-prod validation with prod-like data shapes; manual CEO acceptance | CEO ratification |
| **Prod** | VPS-1 (current state — `nanoclaw-prod`) | Live LIMITLESS Architect bot in real channels | Real CEO-facing work | Strict — only what passed all earlier envs |

### Environment isolation requirements

Each env needs its OWN:
- **VPS** (or at minimum: separate Docker namespace + ports if shared host — strongly prefer separate VPS for true isolation)
- **NanoClaw service** (systemd unit + clone of monorepo + dist build)
- **OneCLI gateway + DB** (separate docker-compose + secrets)
- **Discord bot identity + guild allowlist** (separate bot tokens; separate guild for true isolation, OR namespaced channels in shared guild)
- **GitHub App** (separate `limitless-agent-test` and `limitless-agent-staging` Apps — or scoped install to test/staging repos only)
- **Anthropic credentials** (ideally separate OAuth/API key per env so usage is attributable + capped)

### Promotion-pipeline mechanics

**Code path (per change):**
1. Dev → Test: `git push` to a `dev` branch; CI deploys to Test VPS automatically
2. Test → Staging: PR merge to `staging` branch; CI deploys to Staging VPS
3. Staging → Prod: PR merge to `main`; CI deploys to Prod VPS (this is current DR-002 Phase 3 pipeline, scope expanded)

**Promotion gates (each is blocking):**
- Dev → Test: author confirms local container spawns + completes a smoke task
- Test → Staging: automated test suite passes (container lifecycle, OneCLI integration, App token mint, Discord roundtrip, simple Architect dispatch)
- Staging → Prod: CEO acceptance + (eventually, when team grows) human peer-review

**Dependency upgrades follow the same path:** any version bump (Node, claude-code, OneCLI, base image, npm dep) ships through Dev → Test → Staging → Prod with the same gates.

## Cost estimate (rough, monthly steady-state)

| Item | Cost |
|---|---|
| Hetzner CX32 × 2 (test + staging; prod = current VPS-1) | ~60€/month |
| OneCLI gateway × 2 (postgres + app containers — runs on the same Hetzner boxes) | $0 (self-hosted on same VPS) |
| Test/Staging Discord bots | $0 (Discord bots are free) |
| Test/Staging GitHub Apps | $0 (free) |
| Anthropic credentials for test/staging (separate OAuth tokens or a metered API key with usage cap) | $0–$50/month (depends on test volume; capped) |
| **Total operational** | **~60–110€/month** |

One-time setup labor: 3–5 Architect-days (estimated).

## Setup labor breakdown

1. **Terraform module** for "create a NanoClaw env" — parameterized by env name, generates Hetzner VPS + DNS + initial firewall (~1 day)
2. **Ansible playbook** for first-run on a new env — installs Docker, OneCLI, NanoClaw service, Node, pnpm, deps; idempotent re-runnable (~1.5 days)
3. **Env-segregation of secrets/credentials** — separate `secrets.env` per env, separate App private keys, separate Discord tokens (~0.5 day)
4. **Promotion-pipeline scripts (or manual promotion checklist)** — initially manual, scripts as automation matures (~1 day)
5. **Test suite** — automated tests that exercise the full Architect lifecycle in Test env (container spawn + Claude query roundtrip + App token mint + Discord post + idle-timeout behavior) (~1 day)

## Critical implementation questions (for Architect refinement)

1. **Dev env: laptop vs dedicated dev-VPS?** Laptop is cheap but Apple-Container restrictions / OS differences may diverge from prod. Dedicated dev-VPS is easier to keep parity. Cost vs friction tradeoff.

2. **Test/Staging Discord: separate guild or namespaced channels?** Separate guild = full isolation, costs nothing. Namespaced channels = faster setup, but accidents could leak between envs. Recommend separate guild.

3. **GitHub App for test/staging: separate App or scoped install?**
   - Separate App: cleaner attribution (`limitless-agent-test[bot]`, `limitless-agent-staging[bot]`)
   - Same App, scoped to test/staging repos: simpler key management
   - Recommend separate Apps for cleanest audit boundary; minor key management overhead is acceptable.

4. **Anthropic credentials: how to avoid double-billing?** Each env needs its own account/credential or test+staging share a metered API key with usage caps. CEO call.

5. **DR-001 Phase 3 (App token minting): does it need a per-env App registration?** Almost certainly yes — `limitless-agent-test[bot]` for test repo PRs, etc. Maps to question 3.

6. **Renovate / dependency updates: per-env or shared?** If Renovate auto-PRs go to Dev branch, they flow Dev → Test → Staging → Prod naturally. Shared.

7. **Test data — synthetic or production-shape?** Test should use synthetic (faster, no risk). Staging should use prod-shape data (real channels, real PRs in a staging repo).

8. **Backup / rollback per env?** Prod has the existing `/home/limitless/nanoclaw.backup-*` pattern. Test/Staging probably don't need backups (they're disposable / re-buildable from Terraform).

## Why this is P0

1. **The v2 migration is the highest-risk change in NanoClaw's history for our fork.** Doing v2 migration in prod-only is a guaranteed re-run of today's incident at much larger scale (10x the moving parts).

2. **Every future structural change** (Bun runtime adoption, new channel additions, OneCLI app additions) deserves the same staging discipline. Building the pipeline once and reusing it forever has compounding ROI.

3. **The agentic-team-as-dev-project framing aligns with how we already treat other dev work.** This closes a structural gap, not adds new infrastructure for its own sake.

4. **Today's recovery cost was ~10 hours of CEO + Director focus.** A single avoided incident pays for the setup labor.

## Sequencing recommendation

1. **First:** Architect refines this proposal into a formal spec (when fleet is back). CEO ratifies.
2. **Then:** Architect (or Director if Architects still down) executes Terraform + Ansible setup. Test + Staging envs come online.
3. **Then:** v2 migration executes Dev → Test → Staging → Prod through the new pipeline.
4. **Going forward:** all dependency upgrades, governance changes, NanoClaw upstream syncs follow the same Dev → Test → Staging → Prod path.

## Open questions for CEO (before/during ratification)

- Cost cap acceptable? (~60–110€/month operational + 3–5 days labor)
- Q3 (separate App vs scoped): preference?
- Q4 (Anthropic billing): preference?
- Should this be one more spec under DR-NNN governance, or a standalone `docs/governance/architect-pipeline.md` policy doc?
- Timeline: does this need to land BEFORE v2 migration, or can v2 migration be the FIRST thing the new pipeline tests (riskier but faster)?

## Related memories / DRs (for Architect when refining)

- `feedback_verification_first.md` (incl. amendment 2026-04-24 on E2E capability smoke test) — pipeline is the platform-level enforcement of this principle
- `feedback_persistent_storage_for_work_products.md` — env discipline includes preserving WIP across env-rebuilds
- `feedback_blocker_surface_latency.md` — Test env should expose blockers within their cull-window
- `feedback_prefer_rigor_over_speed.md` — pipeline IS rigor over speed, codified
- `feedback_canonical_docs_first.md` (TBD — drafting from today's fleet incident) — Test env exercises canonical setup paths (`/init-onecli` etc.) so missing config surfaces deterministically
- DR-002 — monorepo-as-source-of-truth + GitHub Actions deploy pipeline (Phase 3 still pending). Pipeline should expand from "deploy to prod on merge" to "deploy through Dev/Test/Staging/Prod stages on respective merges"
- `project_agentic_governance.md` — existing governance arc; pipeline becomes a §X amendment

## Architect tasks queued (when fleet operational)

- [ ] Refine + ratify this proposal as a formal spec under `docs/superpowers/specs/`
- [ ] Author Terraform module for "create a NanoClaw env"
- [ ] Author Ansible playbook for first-run setup
- [ ] Author env segregation for secrets/credentials (per-env `secrets.env`, per-env GitHub App private keys, per-env Discord tokens)
- [ ] Author promotion-pipeline scripts (or initially: manual promotion checklist)
- [ ] Author automated test suite for Test env validation
- [ ] Update DR-002 Phase 3 deploy pipeline scope to handle multi-env promotion
- [ ] Document per-env runbooks (deploy, debug, rollback)

---

*This proposal is Director-drafted on behalf of CEO insight. Marked DRAFT pending Architect refinement once the streaming bug / fleet operational state is restored. Any Director-drafted assumptions should be flagged + corrected by the reviewing Architect — Architect has authority to restructure entirely.*
