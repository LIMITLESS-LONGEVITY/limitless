# Agentic SDLC Governance & Workflow

**Date**: 2026-04-18
**Amended**:
- 2026-04-19 (v1.1 — agent identity model; see DR-001)
- 2026-04-19 (v1.2 — DR-002 findings: NanoClaw deploy pipeline established; DR-001 Phase 3 landing target clarified; Agent Vault confirmed non-replacement; see DR-002)
**Author**: Architect
**Status**: Proposed — awaiting CEO ratification
**Applies to**: `LIMITLESS-LONGEVITY/limitless` · `chmod735-dor/mythos` · `chmod735-dor/mythos-ops` · all future repos under this division

> **v1.1 note**: A parallel amendment (v1.1, PR #60) resolves the agent-identity/ratification-flow gap (DR-001). If PR #60 merges before this PR, v1.2 applies on top of v1.1. Both amendments are additive and non-conflicting.

---

## Executive Summary

This spec codifies the governance model for an agentic software development team where AI agents author all code and planning deliverables, and humans ratify via PR review. It supersedes ad-hoc PR merges and establishes a repeatable, auditable workflow that satisfies MiFID II Art. 25 retention requirements for MYTHOS and provides a consistent SDLC baseline for LIMITLESS.

**Core principles:**
1. Agents propose; humans ratify. No agent merges to `main`.
2. Every merge is a timestamped, attributable record.
3. Safety-critical paths have stricter gates and narrower ownership.
4. The governance model is itself versioned and PR-governed.

---

## 1. Branch Protection Policy

### 1.1 Universal baseline (all repos)

Applied to `main` branch. Settings use GitHub Rulesets (v2 API) where available; fall back to legacy branch protection rules.

| Setting | Value | Rationale |
|---------|-------|-----------|
| Require pull request before merging | ✅ Required | No direct push to main — ever |
| Required approving reviews | **1** (CEO) | Single human ratifier; upgradeable (see §11) |
| Dismiss stale reviews on new commits | ✅ | Re-approval required after each push |
| Require review from Code Owners | ✅ (where CODEOWNERS exists) | Enforces domain ownership |
| Require status checks before merging | ✅ (repo-specific, see below) | Automated gate must pass |
| Require branches to be up to date | ✅ | Prevents stale-branch merges |
| Require conversation resolution | ✅ | No unresolved comments at merge time |
| Restrict who can push to matching branches | CEO only (admins) | Prevents direct push bypass |
| Allow force pushes | ❌ | Preserves history integrity |
| Allow deletions | ❌ | `main` is permanent |
| Require signed commits | ✅ **MYTHOS only** | Cryptographic authorship for MiFID II |
| Require linear history | ✅ **MYTHOS only** | Squash-only; clean audit chain |
| Block force pushes | ✅ | Defense-in-depth |
| Auto-delete head branches on merge | ✅ | Housekeeping |

### 1.2 Per-repo class settings

#### `LIMITLESS-LONGEVITY/limitless` (production-adjacent)

Required status checks:
- `build` — `pnpm build` for the affected app(s)
- `test` — vitest / Jest for affected packages
- `typecheck` — TypeScript compile check

No signed commits required at this time (add when CI signing is set up).

#### `chmod735-dor/mythos` (regulated — MiFID II)

Required status checks (evolve with each phase):
- **Phase 1 (Planning)**: none (markdown-only PRs)
- **Phase 2+**: `pytest` (sidecar), `npm test` (engine), `docker-compose-smoke`
- **Execution layer PRs**: additionally require `gate-invariant-check` (custom test that verifies 6-gate chain non-bypassability)

Additional settings vs baseline:
- Require signed commits: ✅
- Require linear history (squash only): ✅
- Required approving reviews: **1 CEO** (Phase 1–2) → **CEO + Safety Reviewer** (Phase 3+ when safety reviewer is designated)

#### `chmod735-dor/mythos-ops` (operational config)

Required status checks: none (config files, no build pipeline)

Exception: CEO may merge directly (bypassing PR requirement) for emergency operational patches ONLY if:
1. The change is to a NanoClaw `.env` file or systemd unit only
2. A follow-up PR documenting the change is created within 24 hours
3. The emergency merge is noted in the commit message as `[emergency-direct-merge]`

---

## 2. Review Model

The table below defines author, automated gates, and required human approver for each change class. "Agent" means any Architect or Engineer AI agent. "CEO" means the human CEO (sole ratifier at present).

| Change class | Author | Automated gates | Human approver | Notes |
|---|---|---|---|---|
| **MYTHOS — Safety-critical** (gate chain `engine/gates/`, audit schema `db/migrations/`, order path `engine/ibkr/`) | Architect / Engineer | Build + tests + `gate-invariant-check` | CEO (required) + Safety Reviewer (Phase 3+) | Highest scrutiny. DR required for every non-trivial choice. |
| **MYTHOS — Planning deliverables** (Charter, SOW, SRS, FRS, DDS, SDD) | MYTHOS Architect | Ratification checklist in PR body | CEO (checklist ticked + "RATIFIED" in review body) | MiFID II audit record; see §5. |
| **MYTHOS — Decision Records** | MYTHOS Architect | None | CEO | DR-NNN files; lightweight. |
| **MYTHOS — Implementation (non-safety)** | Architect / Engineer | Build + tests | CEO | `sidecar/`, `docs/`, non-gate engine code. |
| **MYTHOS — Infrastructure** (Docker Compose, CI, DB migrations) | MYTHOS Architect | Docker build smoke | CEO | Schema migrations require DR. |
| **LIMITLESS — App code** | Per-app Architect / Engineer | `pnpm build` + tests | CEO | Normal dev cycle. |
| **LIMITLESS — Infra** (`infra/`) | Infra Architect | `terraform plan` output in PR body | CEO | Plan output required. |
| **NanoClaw — Tier 3 behavioral** (routing, mounts, security) | Architect | Build + vitest | CEO | Follows self-mod governance (existing spec §4). |
| **Governance / spec docs** | Architect | None | CEO | This document is an example. |
| **Agent peer review** (any class) | Secondary Architect | n/a | Non-blocking | See §3. |

---

## 3. Agent-to-Agent Review

### When it is appropriate

A second Architect opinion is appropriate when:
- The change touches cross-division boundaries (e.g. shared NanoClaw code affects both LIMITLESS and MYTHOS)
- The authoring Architect is uncertain about a decision and flags `[OPEN: peer review requested]` in the PR body
- The change involves a Decision Record on a topic outside the authoring Architect's domain

### When it is sufficient

**Never for merge-blocking paths.** Agent-to-agent review is advisory only. It does not substitute for human CEO approval on any PR. The CEO retains sole merge authority.

### Audit trail

Secondary Architect posts a review comment on the PR with this structure:
```
## Agent Peer Review — [Architect name] — [ISO 8601 timestamp]

Summary of review: <findings>
Agreement with approach: YES / NO / PARTIAL
Concerns: <list or "none">
Recommendation: Approve / Request changes / Escalate to human

⚠️ This is an AI peer review. Human CEO approval is required before merge.
```

This comment becomes part of the PR audit trail.

---

## 4. CODEOWNERS Conventions

### 4.1 `LIMITLESS-LONGEVITY/limitless` — `.github/CODEOWNERS`

```
# LIMITLESS monorepo — CODEOWNERS
# CEO is default approver for all paths.
* @<CEO-github-handle>

# Per-app domain ownership (CEO + app Architect)
# Architect handles PR authorship; CEO handles ratification.
apps/paths/           @<CEO-github-handle>
apps/cubes/           @<CEO-github-handle>
apps/hub/             @<CEO-github-handle>
apps/digital-twin/    @<CEO-github-handle>
apps/nanoclaw/        @<CEO-github-handle>
apps/os-dashboard/    @<CEO-github-handle>
infra/                @<CEO-github-handle>
docs/                 @<CEO-github-handle>
```

Note: Architect agents operate as GitHub App bot users (`limitless-agent[bot]`) and cannot be CODEOWNERS. Human CEO (`chmod735`) is the required approver. See DR-001.

### 4.2 `chmod735-dor/mythos` — `.github/CODEOWNERS`

```
# MYTHOS — CODEOWNERS
# CEO required for all paths.
# Note: MYTHOS Architect operates as mythos-agent[bot] (GitHub App bot user)
# and cannot be CODEOWNERS. See DR-001.
* @<CEO-github-handle>

# Safety-critical paths — CEO required + safety reviewer when designated
engine/gates/         @<CEO-github-handle>
engine/ibkr/          @<CEO-github-handle>
db/migrations/        @<CEO-github-handle>
# When safety reviewer is designated: add @<safety-reviewer-handle> to above 3 paths

# Collaborating team domain (when onboarded — see §11)
# sidecar/            @<CEO-github-handle> @<collab-team-lead-handle>
# docs/               @<CEO-github-handle> @<collab-team-lead-handle>
```

### 4.3 `chmod735-dor/mythos-ops` — `.github/CODEOWNERS`

```
# mythos-ops — operational config
# CEO only — no external team access to operational secrets/config.
* @<CEO-github-handle>
```

### 4.4 Adding collaborating-team reviewers

External team members can be added as CODEOWNERS for specific subtrees (e.g. `sidecar/` for an ML contributor team). They become **required reviewers** for their subtree but do NOT carry merge authority. CEO retains merge authority on all paths. To add: uncomment the relevant lines in the CODEOWNERS template above and replace `@<collab-team-lead-handle>` with actual handles.

---

## 5. Ratification Mechanism (MiFID II Compliant)

### 5.1 What constitutes a ratified merge

A MYTHOS PR is **ratified** when ALL of the following are true at merge time:

1. All checkboxes in the PR body ratification checklist are ticked
2. CEO has submitted a GitHub **Approving Review** (not just a comment). This is achievable because agent PRs are authored by `mythos-agent[bot]` (a GitHub App bot identity distinct from the CEO's human account `chmod735`). GitHub's self-approval restriction does not apply — `chmod735` approving `mythos-agent[bot]`'s PR is the standard human-ratifies-automation flow. See DR-001.
3. The review body contains the word `RATIFIED` or `Approved` explicitly
4. All required status checks have passed
5. No unresolved review conversations remain

The merge commit then carries: timestamp (UTC), merge author (CEO GitHub handle), PR number, PR title, and a link to the full PR body including the ratification checklist. This constitutes a durable, attributable, timestamped record.

> **v1.0 workaround retired**: Prior to agent identity implementation (DR-001), a Comment-type review with `RATIFIED` keyword was used as an interim measure because agents pushed as the CEO's GitHub account. This workaround is retired once DR-001 rollout is complete. All future ratifications must use a formal Approving Review (condition #2 above).

### 5.2 Standard ratification checklist (all MYTHOS PRs)

Include in every MYTHOS PR body:

```markdown
## Ratification

**⚠️ CEO: check all boxes before merging. Unchecked boxes = not ratified.**

- [ ] I have read this document / diff in full
- [ ] No open questions silently assumed (all flagged as `[OPEN]` or resolved with a DR)
- [ ] Sovereignty constraint confirmed: no cloud inference on live-trading hot path
- [ ] Safety gates confirmed non-overridable by any AI output
- [ ] Regulatory posture confirmed: Ireland / EU — MiFID II applies
- [ ] Audit retention confirmed: 7-year retention plan not undermined by this change

*(For non-trading PRs — docs, planning deliverables — the last 4 items may be marked N/A if genuinely not applicable.)*
```

### 5.3 LIMITLESS PR checklist (lighter)

```markdown
## Review checklist

- [ ] Change does what the PR title says
- [ ] Build and tests pass (see status checks above)
- [ ] No unintended side effects on other apps
- [ ] No secrets or credentials in diff
```

### 5.4 MiFID II Art. 25 retention compliance

**Retention period**: MiFID II Art. 25 and the associated RTS 6 (Commission Delegated Regulation (EU) 2017/589) require records of algorithmic trading strategies, including development and testing records, to be retained for **at least 5 years** (Art. 25(1)); national competent authority may extend to 7 years. Ireland's CBI requires 7 years. This spec targets 7 years.

**What must be retained**: Per RTS 6, records must include the rationale for algorithmic trading decisions, changes to algorithms, and approval records. A MYTHOS PR merge commit — containing the ratification checklist, CEO approval, diff, and PR body — satisfies this requirement for algorithmic design changes. Trade execution audit records are governed separately (§ Non-Negotiable Constraints in the MYTHOS Architect CLAUDE.md).

**Record format**: MiFID II does not mandate a specific system. Records must be durable, ordered, and accessible to the competent authority on request. GitHub's PR history with cryptographic commit hashes and signed commits satisfies this.

**7-year retention mechanism**:
- GitHub's native PR/commit history provides the primary record
- Weekly automated export via `gh api` to operator-controlled durable storage (e.g. Backblaze B2 or AWS S3 with Object Lock) provides the backup record
- Export script: `gh api repos/<org>/<repo>/pulls --paginate --jq '[.[] | {number, title, state, merged_at, merged_by, body, html_url}]'` + `gh api repos/<org>/<repo>/commits --paginate`
- Retention in operator storage: 7 years, immutable (Object Lock / WORM policy)
- This weekly export cron is **sufficient** for MiFID II compliance provided the operator-controlled storage is subject to access logging and is outside GitHub's control (in case GitHub account is terminated)

**Open question**: Whether a formal Data Processing Agreement (DPA) with GitHub is required for MiFID II record-keeping purposes. Atlassian and similar enterprise tools typically carry DPAs. GitHub offers a DPA via the GitHub Customer Agreement (Enterprise). For a single-operator IBKR account, regulatory risk is low but legal review is recommended before Phase 4 live trading. Flag: `[OPEN: legal review before Phase 4]`

---

## 6. Issue / Ticket Linkage

### 6.1 PR title convention

All PRs must follow **Conventional Commits** prefixing:

```
type(scope): description
```

| Type | Use |
|------|-----|
| `feat` | New capability (new feature, new endpoint, new model) |
| `fix` | Bug fix |
| `docs` | Documentation, specs, planning deliverables |
| `chore` | Maintenance, dependency updates, tooling |
| `refactor` | Code restructure without behavior change |
| `test` | Test additions/changes |
| `perf` | Performance improvement |
| `ci` | CI/CD pipeline changes |
| `build` | Build system changes |
| `revert` | Revert a previous commit |

Scope examples: `paths`, `cubes`, `nanoclaw`, `mythos/engine`, `mythos/sidecar`, `infra`, `specs`

### 6.2 ROADMAP ticket reference

For MYTHOS PRs implementing a ROADMAP ticket, include in the PR body:

```
ROADMAP-REF: P1-INFRA-001
```

This is parseable by tooling but requires no external tracker integration.

### 6.3 Jira smart-commit plug-in point

If Jira is adopted for collaborating-team tracking, include in the PR body or commit message:

```
JIRA: MYTHOS-47
```

This triggers Jira smart-commit linking if the GitLab-Jira or GitHub-Jira integration is configured. No tooling change required today — the convention is reserved.

---

## 7. PR Templates

PR templates live at `.github/pull_request_template.md` in each repo. They are checked into the repo and versioned via PRs against this governance spec.

### 7.1 MYTHOS — `.github/pull_request_template.md`

```markdown
## Summary

<!-- 2-4 bullet points: what this PR does and why -->

## Change class

<!-- Select one: -->
<!-- [ ] Safety-critical (gate chain / audit schema / order path) -->
<!-- [ ] Planning deliverable (Charter / SOW / SRS / FRS / DDS / SDD) -->
<!-- [ ] Decision Record -->
<!-- [ ] Implementation (non-safety) -->
<!-- [ ] Infrastructure -->

## ROADMAP reference

<!-- ROADMAP-REF: P1-INFRA-001 (or N/A) -->

## Test evidence

<!-- Build output, pytest results, backtest summary, or "N/A for planning deliverable" -->

## Ratification

**⚠️ CEO: check all boxes before merging.**

- [ ] I have read this document / diff in full
- [ ] No open questions silently assumed (all flagged as `[OPEN]` or resolved with a DR)
- [ ] Sovereignty constraint: no cloud inference on live-trading hot path *(or N/A)*
- [ ] Safety gates non-overridable by any AI output *(or N/A)*
- [ ] Regulatory posture: Ireland / EU — MiFID II *(or N/A)*
- [ ] Audit retention: 7-year plan not undermined *(or N/A)*

🤖 Agent-authored — human ratification required before merge.
```

### 7.2 LIMITLESS — `.github/pull_request_template.md`

```markdown
## Summary

<!-- What this PR does and why -->

## Test evidence

<!-- Build output or "no testable change" -->

## Review checklist

- [ ] Change does what the PR title says
- [ ] Build and tests pass
- [ ] No unintended side effects on other apps
- [ ] No secrets or credentials in diff

🤖 Agent-authored — human ratification required before merge.
```

### 7.3 mythos-ops — `.github/pull_request_template.md`

```markdown
## Summary

<!-- What operational config this changes -->

## Service impact

<!-- Which services are affected and how (restart required? downtime? ) -->

## Rollback plan

<!-- How to revert if this causes an incident -->

## Review checklist

- [ ] Change is operational config only (no application code)
- [ ] Service impact documented above
- [ ] Rollback plan is actionable
- [ ] No secrets committed in plaintext

🤖 Agent-authored — human ratification required before merge.
```

---

## 8. Commit Message Conventions

All commits follow **Conventional Commits v1.0.0** (https://www.conventionalcommits.org/).

### 8.1 Commit attribution hierarchy (v1.1)

Every agent-authored commit carries three layers of attribution:

| Layer | What it records | Where it appears |
|---|---|---|
| **GitHub author** | `limitless-agent[bot]` or `mythos-agent[bot]` — the NanoClaw agent system that pushed | Commit history, PR author field, org audit log |
| **AI model** | `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` — the underlying model that generated the content | Commit message footer |
| **Ratifier** | `chmod735` (CEO) — the human who reviewed and squash-merged | Squash merge commit author; PR "Approved by" field |

The `Co-Authored-By` trailer is retained from v1 and must not be removed. It provides AI model-level attribution that is independent of GitHub's identity system and persists in the commit message regardless of any future changes to GitHub's `[bot]` attribution policy.

For per-agent attribution within a division (since all LIMITLESS agents share `limitless-agent[bot]`), include an `Authored-by-agent:` footer in the commit message body:

```
Authored-by-agent: PATHS Architect
```

This is optional for LIMITLESS (non-MiFID II) and recommended for MYTHOS (MiFID II attribution).

### 8.2 Format

```
type(scope): subject line ≤72 chars

Body: what and why (not how). Wrap at 72 chars.
Multiple paragraphs allowed.

Footer:
Authored-by-agent: <Agent name>
ROADMAP-REF: P1-INFRA-001
Reviewed-by: CEO
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

### 8.3 Rules

1. Subject line: imperative mood ("add gate" not "added gate"), ≤72 chars, no trailing period
2. Breaking changes: append `!` to type (`feat!`) and include `BREAKING CHANGE:` in footer
3. Agent attribution: always include `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` (or the model used)
4. Per-agent attribution: include `Authored-by-agent: <name>` in footer (required for MYTHOS, recommended for LIMITLESS)
5. Squash commits on merge: the squash commit message = PR title (already Conventional Commits) + PR body as extended description

---

## 9. Merge Strategy

### Default: Squash merge

All repos use **squash merge** as the default and only permitted merge strategy on `main`.

| Strategy | Used? | Rationale |
|----------|-------|-----------|
| Squash merge | ✅ Default | One commit per PR. Clean linear history. PR body preserved in squash commit description. MiFID II: the squash commit + PR body = complete audit record. |
| Merge commit | ❌ | Creates noisy merge commits; dilutes audit trail. |
| Rebase merge | ❌ | Rewrites commit hashes; invalidates signed commits; breaks MiFID II audit chain for MYTHOS. |

### Squash commit message

GitHub auto-populates the squash commit message as `PR title (#PR number)`. The PR body (including ratification checklist, test evidence, ROADMAP reference) is preserved as the extended commit description. This is the audit record.

### Exception: Phase gate tags

After a squash commit that completes a MYTHOS phase, an annotated tag is applied:
```bash
git tag -a mythos-p1-complete -m "MYTHOS Phase 1 (Planning) complete. All P1 deliverables ratified. Go/no-go: approved by CEO <date>."
git push origin mythos-p1-complete
```

---

## 10. Versioning & Release Model

### 10.1 Application code (SemVer)

All apps in `LIMITLESS-LONGEVITY/limitless` and `chmod735-dor/mythos` use **Semantic Versioning 2.0.0**.

| Increment | Trigger |
|-----------|---------|
| `MAJOR` (1.0.0 → 2.0.0) | Breaking API change or MYTHOS live-trading mode transition |
| `MINOR` (1.0.0 → 1.1.0) | New capability, new endpoint, new model version |
| `PATCH` (1.0.0 → 1.0.1) | Bug fix, dependency update, non-breaking change |

MYTHOS starts at `0.1.0` at Phase 1 scaffold. `1.0.0` is tagged at first live-trading deployment (Phase 4).

### 10.2 Spec documents (date-versioned)

Spec files: `docs/superpowers/specs/YYYY-MM-DD-name.md`. Date = authoring date. Version within the document is tracked by `**Status:**` and git history.

### 10.3 Phase gate tags (MYTHOS)

| Tag | Meaning |
|-----|---------|
| `mythos-p1-complete` | All Phase 1 planning deliverables ratified; Phase 2 approved to start |
| `mythos-p2-complete` | Ingest layer complete; Phase 2 go/no-go passed |
| `mythos-p3-complete` | Perception + paper trading criteria met |
| `mythos-p4-live` | First live trade executed; monitoring active |

### 10.4 Changelog

`CHANGELOG.md` in each repo root. Format: [Keep a Changelog](https://keepachangelog.com/). Entries generated from squash commit messages grouped by version. Maintained by Architect; updated with each PR merge.

---

## 11. Collaborating-Team Onboarding

### 11.1 Authority model

External collaborators operate as **contributors**: they submit PRs, carry required-reviewer status for their subtree (when added to CODEOWNERS), but cannot merge to `main`. Merge authority remains with CEO.

| Role | Can author PRs | Required reviewer for subtree | Can merge | Can approve (non-blocking) |
|------|---------------|-------------------------------|-----------|---------------------------|
| CEO (`chmod735`) | ✅ | ✅ (all paths) | ✅ | ✅ |
| AI Architect (GitHub App bot: `limitless-agent[bot]` / `mythos-agent[bot]`) | ✅ | ❌ (bot users cannot be CODEOWNERS) | ❌ | ❌ |
| Collaborating team lead | ✅ | ✅ (their subtree) | ❌ | ✅ |
| Collaborating team member | ✅ | ❌ | ❌ | ✅ |

### 11.2 Onboarding steps

1. CEO adds team lead's GitHub handle to CODEOWNERS for their subtree (e.g. `sidecar/` for ML team)
2. CEO invites collaborators as repo collaborators with **Write** permission (enough to push branches and create PRs; not enough to merge to protected `main`)
3. Collaborating team creates PRs against `main`; their lead's review is required (CODEOWNERS) + CEO approval required (branch protection) before merge
4. Architectural disputes: Architect (AI) proposes resolution via Decision Record; CEO decides and merges

### 11.3 CEO single-approver scale

**Current state (Phase 1)**: CEO as sole approver is appropriate. All PRs are authored by AI agents (`limitless-agent[bot]` / `mythos-agent[bot]`); the review burden is ratification of agent output, not peer code review. The author ≠ approver invariant is maintained by the GitHub App identity model (DR-001). Volume is manageable (1–3 PRs/day estimated in Phase 1).

**Scale-up trigger**: When Execution layer implementation begins (Phase 3), designate a **Safety Reviewer** with domain expertise in quantitative trading systems. This person becomes a required reviewer specifically for `engine/gates/`, `engine/ibkr/`, and `db/migrations/`. CEO retains merge authority.

**Multi-human future**: If the team grows to >3 humans, introduce a `CODEOWNERS`-based 2-of-N approval model. This spec does not prescribe the threshold — it is an operator decision.

---

## 12. Rollout Sequence

Apply in this order. Do NOT skip steps. Each step is independently verifiable.

### Step 1 — `chmod735-dor/mythos` (highest priority — governs Sprint 1.A.2 onward)

- [ ] 1.1 Create `.github/CODEOWNERS` using §4.2 template (CEO handle substituted)
- [ ] 1.2 Create `.github/pull_request_template.md` using §7.1 template
- [ ] 1.3 Apply branch protection ruleset per §1.2 (MYTHOS settings)
- [ ] 1.4 Enable: require signed commits, require linear history, require status checks (Phase 1: none; update at Phase 2 kick-off)
- [ ] 1.5 Enable: auto-delete head branches on merge
- [ ] 1.6 Verify: attempt a direct push to `main` → confirm rejected
- [ ] 1.7 Grandfather clause: PR #1 (if open) is exempt from ratification checklist; note exemption in PR comment

### Step 2 — `chmod735-dor/mythos-ops`

- [ ] 2.1 Create `.github/CODEOWNERS` using §4.3 template
- [ ] 2.2 Create `.github/pull_request_template.md` using §7.3 template
- [ ] 2.3 Apply branch protection per §1.2 (mythos-ops settings, including emergency-direct-merge exception)
- [ ] 2.4 Verify: confirm protection applies

### Step 3 — `LIMITLESS-LONGEVITY/limitless` (backport)

- [ ] 3.1 Create `.github/CODEOWNERS` using §4.1 template
- [ ] 3.2 Create `.github/pull_request_template.md` using §7.2 template
- [ ] 3.3 Apply branch protection per §1.2 (LIMITLESS settings — no signed commits, no linear history requirement yet)
- [ ] 3.4 Grandfather clause: all PRs merged before `<rollout date>` are exempt
- [ ] 3.5 Add LIMITLESS PR template rollout date to CHANGELOG.md

### Step 4 — Retention backup cron

- [ ] 4.1 Create weekly export cron (NanoClaw scheduled task or VPS cron) that runs `gh api` export for all 3 repos
- [ ] 4.2 Configure operator-controlled durable storage (Backblaze B2 / S3) with 7-year Object Lock policy
- [ ] 4.3 Verify first export completes successfully; confirm file is in durable storage

---

## Design Questions (Resolved or Flagged)

### DQ1 — CEO single-approver survival at scale
**Resolved**: CEO single-approver survives Phase 1–2. At Phase 3 (Execution layer implementation), add a designated Safety Reviewer for the three safety-critical CODEOWNERS paths. Full multi-human model deferred until team >3 humans.

### DQ2 — PR template authorship and location
**Resolved**: PR templates are checked into each repo at `.github/pull_request_template.md`. Changes to templates go through the normal PR governance process (meta-governance).

### DQ3 — Multi-repo PRs
**Resolved**: Multi-repo changes use **serial PRs with cross-references**. PR body includes `Cross-repo: <URL of related PR>`. Merge order: infrastructure repo first, application repo second. No atomic multi-repo merge mechanism is implemented.

### DQ4 — Grandfather clause for pre-governance PRs
**Resolved**: PRs merged before `<rollout date of this spec>` are explicitly exempt. Notation: add a comment to the relevant PR stating `Merged before governance spec v1 (2026-04-18). Exempt from ratification checklist per DQ4.` The exemption itself becomes a PR-visible record.

### DQ5 — GitHub export for MiFID II retention
**Resolved with caveat**: Weekly `gh api` export to operator-controlled durable storage with WORM (Object Lock) policy is sufficient for MiFID II Art. 25 algorithmic trading record retention, subject to the following:
- Storage is outside GitHub's control (backup, not primary)
- Access is logged
- Legal review recommended before Phase 4 live trading regarding DPA with GitHub
- Flag: `[OPEN: legal review before Phase 4]`

---

## Open Questions

1. `[OPEN: legal review before Phase 4]` — Whether a formal DPA with GitHub is required for MiFID II record-keeping. Low risk for single-operator account; legal review before live trading.
2. `[OPEN: Safety Reviewer designation]` — Designate by Phase 3 kick-off. External quantitative trading / regulatory expert preferred.
3. `[RESOLVED: signed commits tooling — v1.1]` — The "Require signed commits" ruleset on `main` applies to commits pushed *to* `main`. Agents push to PR branches, not `main`. The squash merge commit on `main` is created server-side by GitHub when the CEO clicks "Squash and merge" via the web UI — GitHub automatically signs this commit, producing a "Verified" badge without any CEO local GPG/SSH configuration. CEO local signing is recommended as best practice for CEO-authored commits (e.g., emergency direct merges per §1.2 mythos-ops exception) but is not required for branch protection to function. See DR-001 Option C rationale.
4. `[OPEN: PR #1 on chmod735-dor/mythos]` — Confirm whether PR #1 is open. If so, apply grandfather clause per DQ4 before activating branch protection.
5. `[OPEN: DR-001 Phase 3 implementation — v1.2]` — DR-001 Phase 3 (GitHub App installation token in container-runner) is **unblocked by DR-002 Phase 4** (VPS migration to monorepo clone + deploy pipeline). Landing target: `apps/nanoclaw/src/container-runner.ts`. Deployment: GitHub Actions pipeline (DR-002). Implementation PR title: `feat(nanoclaw): GitHub App installation token at container spawn (DR-001 Phase 3)`. File this handoff after DR-002 is ratified and DR-002 Phases 1–4 are complete.
6. `[OPEN: MYTHOS OneCLI provisioning — v1.2]` — After DR-002 Phase 4 (MYTHOS VPS on git clone), provision a dedicated OneCLI instance for the `mythos` VPS user (DR-002 Phase 5). Once live, the `CLAUDE_CODE_OAUTH_TOKEN` direct injection from PR #53 is replaced by OneCLI credential routing. See `docs/plans/nanoclaw-source-of-truth-rollout.md` §Phase 5. The PR #53 direct injection remains valid as interim until OneCLI is live.
7. `[CONFIRMED: Agent Vault does not replace DR-001 Phase 3 — v1.2]` — OneCLI Agent Vault handles runtime credential policies (rate limiting, approval prompts) for API calls made from inside containers. It does not mint GitHub App installation tokens at container launch time. DR-001 Phase 3 is necessary and proceeds as planned. The two systems are complementary. See DR-002 §Context.
