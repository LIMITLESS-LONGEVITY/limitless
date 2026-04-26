# Dispatch A.1 — Spec-Driven Development frameworks

**Read `00-COMMON-CONTEXT.md` first.** Output file: `docs/superpowers/reports/research/A.1-spec-driven-development-2026-04-27.md`

## Players in scope (4)

1. **BMAD method** (Behavior-Driven Modular Agentic Development) — open methodology + reference toolchain
2. **GitHub Spec Kit** (open-source spec-driven dev toolkit from GitHub Next, productized track)
3. **Amazon Kiro** — spec mode (the spec-driven flow within Kiro IDE)
4. **Atlassian Rovo Dev Agents** — spec-driven dev features within Atlassian's agent suite

## Out of scope (don't drift into these)

- Specify, AWS Application Composer, Backstage templates (not enterprise-grade agentic-spec-driven for this purpose)
- Anything in track A.2 (coding engines), A.3 (workflow platforms), or A.4 (orchestration frameworks)
- LLM-only spec frameworks without a productized toolchain (e.g., research-paper-only methods)

## Capability axes (your matrix columns)

1. **Spec format** — proprietary syntax / Markdown subset / formal IDL / mixed
2. **Spec → code pipeline** — linear (spec → code, no return) / iterative (revise spec ⟷ regenerate) / round-trip (code → spec → code)
3. **SDLC phase coverage** — just code-gen / code+test / requirements→deployment
4. **Multi-agent support** — single agent / agent team / N/A
5. **Enterprise governance** — RBAC / audit trail / compliance attestations / SSO / on-prem option
6. **SCM integration** — GitHub / GitLab / Bitbucket / Azure DevOps / native
7. **Spec drift handling** — manual / automated detection / automated reconciliation
8. **Pricing model** — open-source / per-seat / per-spec / enterprise quote
9. **Maturity signal** — research / beta / GA / wide enterprise adoption

## Implications-for-our-platform questions to address in §4

- Should our platform standardize a spec format, or be format-agnostic?
- Where does spec-driven sit relative to our existing dispatch model (CEO directive → Director → Architect)? Is the dispatch itself a spec?
- What can we adopt from BMAD/Spec Kit's spec-as-source-of-truth pattern?
- Do any of these competitors solve the cross-app coordination problem we have (touched in DR-003 §8.1)?

## Sizing

4 players × ~9 axes + per-player notes + 4 implications + open questions + citations. Target output file: 600-1200 lines, ~4-8 KB.
