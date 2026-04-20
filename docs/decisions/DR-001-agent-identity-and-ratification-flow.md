# DR-001 — Agent Identity and Ratification Flow

**Date**: 2026-04-19
**Author**: Architect
**Status**: Proposed — awaiting CEO ratification
**Applies to**: `LIMITLESS-LONGEVITY/limitless` · `chmod735-dor/mythos` · `chmod735-dor/mythos-ops` · all future repos under this division
**Supersedes**: Ad-hoc Comment-type review workaround (`RATIFIED` keyword) in use since governance spec v1 rollout

---

## Decision

Adopt **GitHub Apps** as the canonical identity mechanism for all LIMITLESS and MYTHOS AI agents. Deploy two GitHub App registrations:

- **`limitless-agent`** — installed on `LIMITLESS-LONGEVITY/limitless`. Covers the main-ops Architect, all five per-app Architects (PATHS, Cubes+, HUB, DT, Infra), and all future LIMITLESS automation agents.
- **`mythos-agent`** — installed on `chmod735-dor/mythos` and `chmod735-dor/mythos-ops`. Covers the MYTHOS Architect and all future MYTHOS automation agents (test-engineer, verifier, deployment verifier, etc.).

Each App generates a short-lived installation access token (1-hour TTL) at NanoClaw container spawn time. This token replaces the CEO's `GH_TOKEN` as the git and GitHub CLI credential injected into agent containers. Agent commits and PRs are attributed to `limitless-agent[bot]` or `mythos-agent[bot]` — GitHub synthetic bot user accounts that are categorically distinct from the CEO's human account (`chmod735`).

This restores the formal Approving Review flow required by §5.1 of the governance spec: `chmod735` approves `limitless-agent[bot]`'s or `mythos-agent[bot]`'s PRs without triggering GitHub's self-approval block.

**Attribution hierarchy:**
| Layer | What it records | Where it appears |
|---|---|---|
| GitHub author | `limitless-agent[bot]` or `mythos-agent[bot]` — the NanoClaw agent system that pushed | Commit history, PR author field, org audit log |
| AI model | `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` trailer — the model that generated the content | Commit message footer |
| Ratifier | `chmod735` (CEO) — the human who reviewed and approved | Squash merge commit author; PR "Approved by" field |

The existing `Co-Authored-By` trailer is retained unchanged.

---

## Context

### The Gap

Governance spec v1 §5.1 requires a GitHub **Approving Review** (not a Comment) as the MiFID II ratification primitive. In practice, all agent-authored PRs are pushed using `GH_TOKEN` — which is the CEO's personal OAuth token, resolving to `chmod735`. GitHub's self-approval restriction unconditionally blocks `chmod735` from approving PRs authored by `chmod735`. The spec's ratification mechanism (§5.1 condition #2) is therefore structurally unreachable.

Interim mitigation in use: Comment-type review with `RATIFIED` keyword + squash merge. This preserves audit record content but does not produce a formal Approving Review state. It is not §5.1-compliant and must not be canonized as the permanent solution.

### Root Cause

Identity conflation: agents commit and push as the CEO's GitHub account because NanoClaw injects `GH_TOKEN=${process.env.GH_TOKEN}` and `GITHUB_TOKEN=${process.env.GH_TOKEN}` into agent containers (container-runner.ts lines ~145–146, ~268–270), and `GH_TOKEN` on the host is the CEO's personal OAuth token. This was appropriate for an early-stage system with one human and no governance requirements. It is incompatible with the governance model adopted in spec v1.

### Consequences of Conflation Beyond Self-Approval

1. **Muddied audit trail** — GitHub PR history shows every agent PR as authored by `chmod735`, indistinguishable from human-authored PRs.
2. **False impression for third-party auditors** — A MiFID II regulatory reviewer or security auditor would conclude the CEO personally authored all code. This is incorrect and potentially problematic.
3. **No per-agent attribution** — As the agent fleet grows (test-engineer, verifier, deployment agents), all remain indistinguishable.
4. **Identity violation as a principle** — Agents are not humans. They must not be represented as such in any system of record.

---

## Options Considered

### Option A — Single Shared Bot User Account

Create one GitHub machine user account (`limitless-agent-bot`). All agents share one fine-grained PAT. Commits and PRs attributed to `limitless-agent-bot`.

**Evaluation against nine criteria:**

| Criterion | Assessment |
|---|---|
| Agent ≠ human identity | ✅ Distinct from `chmod735` |
| Clean Approving Review flow | ✅ CEO approves `limitless-agent-bot`'s PRs — no self-approval block |
| Cryptographic attribution (signed commits) | ⚠️ Manual GPG key setup required; commits unsigned by default |
| Works for all current + future agents | ✅ Single shared account works; no per-agent granularity |
| Per-agent vs per-division attribution | ❌ Zero granularity — all agents identical in audit trail |
| Commit trailer continuity | ✅ `Co-Authored-By` trailer unchanged |
| Collaborator team compatibility | ✅ No impact on human contributor workflow |
| Multi-human ratification scale | ✅ Additional reviewers can approve `limitless-agent-bot`'s PRs cleanly |
| MiFID II audit unchanged or improved | ⚠️ No degradation; no improvement in attribution clarity |
| Self-correction path | ⚠️ PAT rotation is manual; 2FA requires TOTP secret in password manager |

**Additional concerns:**
- Consumes one GitHub org seat ($4–21/mo depending on plan tier).
- GitHub requires 2FA for org members; bot account 2FA is operationally burdensome (TOTP secret must be stored separately, used to generate codes via `oathtool` or similar).
- Fine-grained PATs (GA March 2025) require org-owner approval flow before first activation — adds provisioning friction.
- Classic PATs are on GitHub's deprecation path.
- No `[bot]` badge in UI — agent commits visually indistinguishable from human commits.

**Assessment**: Fixes the self-approval problem. Operationally simpler than Option B but heavier than Option C. Acceptable as a fallback; not preferred.

---

### Option B — Per-Architect Bot Accounts

One GitHub machine user account per Architect role: `limitless-main-arch-bot`, `paths-arch-bot`, `cubes-arch-bot`, `hub-arch-bot`, `dt-arch-bot`, `infra-arch-bot`, `mythos-arch-bot`. Each gets its own fine-grained PAT.

**Evaluation:**

| Criterion | Assessment |
|---|---|
| Agent ≠ human identity | ✅ Each Architect is distinct from CEO and from each other |
| Clean Approving Review flow | ✅ CEO approves any `*-arch-bot` PR cleanly |
| Cryptographic attribution | ⚠️ GPG key per account — 7+ keys to generate, store, and rotate |
| Works for all agents | ⚠️ Works but requires provisioning N new accounts as fleet expands |
| Per-agent vs per-division attribution | ✅ Maximum per-agent granularity |
| Commit trailer continuity | ✅ Unchanged |
| Collaborator compatibility | ✅ No impact |
| Multi-human ratification scale | ✅ Clean |
| MiFID II audit | ✅ Best attribution granularity — distinguishes Architect from test-engineer etc. |
| Self-correction path | ❌ N PATs, N 2FA setups, N rotation schedules — debt multiplies with fleet size |

**Additional concerns:**
- 7 GitHub org seats minimum today; grows as agent types expand (test-engineer, verifier, deployment agent adds 3+ more).
- GitHub ToS §B.3: machine accounts are permitted but must be created by a human and consume paid seats. "No more than one **free** machine account per human" — each additional account requires a paid seat.
- At 10 agents: $40–210/mo in seat cost.
- 2FA per account: 7+ TOTP secrets.
- PAT rotation: 7+ schedules (or use shared rotation tooling, which adds complexity).

**Assessment**: Best audit-trail granularity. Disproportionate operational cost at current and projected scale. Not recommended.

---

### Option C — GitHub Apps per Division *(Chosen)*

Register two GitHub Apps under the `LIMITLESS-LONGEVITY` organization. Install each on the appropriate repositories. NanoClaw generates short-lived installation access tokens at container spawn time using each App's private key.

**Evaluation:**

| Criterion | Assessment |
|---|---|
| Agent ≠ human identity | ✅ `[bot]` suffix is a GitHub-native categorical marker for non-human identities |
| Clean Approving Review flow | ✅ GitHub's endorsed automation model. `chmod735` approving `limitless-agent[bot]`'s PR is the normal flow — not a workaround. |
| Cryptographic attribution (signed commits) | ✅ Commits via GitHub Contents API are auto-signed by GitHub. `git push` commits on PR branches are unsigned — this is acceptable because the signed commits requirement on `main` is satisfied by the CEO squash merge (GitHub server-side signs it). |
| Works for all current + future agents | ✅ All LIMITLESS agents share one App; all MYTHOS agents share one App. Adding new agent types requires no new App provisioning. |
| Per-agent vs per-division attribution | ✅ Division-level identity now. Per-agent expansion available by registering additional Apps when needed (no architectural change). |
| Commit trailer continuity | ✅ `Co-Authored-By` trailer retained; per-agent attribution via `Authored-by-agent:` commit footer convention. |
| Collaborator compatibility | ✅ Human contributors author their own PRs natively — no intersection with App token flow. |
| Multi-human ratification scale | ✅ CEO + Safety Reviewer both review `[bot]`-authored PRs. No self-approval concern for either. |
| MiFID II audit unchanged or improved | ✅ Improved: `[bot]` authorship in PR author field is unambiguous to any auditor. Division attribution (`mythos-agent[bot]`) is appropriate for current MiFID II scope. |
| Self-correction path | ✅ GitHub supports multiple private keys per App for zero-downtime rotation. Immediate fallback: Option A (bot user account) activatable in <1 hour. Full recovery documented in rollout plan. |

**Additional benefits:**
- **Zero GitHub seat cost** — Apps do not consume org member seats. Cost is identical at 2 agents or 20 agents.
- **No 2FA management** — Apps authenticate via JWT signed with RSA private key. No TOTP secrets, no 2FA enrollment.
- **Minimum-scope tokens** — Each installation token can be scoped at generation time to `contents: write`, `pull-requests: write`, `metadata: read` only. Blast radius of a compromised token: 1 hour, minimum permissions.
- **GitHub's official long-term recommendation** — "Apps are not user-dependent and survive if the creating user leaves the org." GitHub's stated roadmap deprecates classic PATs; fine-grained PATs add friction; Apps are the endorsed path.
- **Org audit log separation** — App installation activity appears in a separate audit log category from human user activity. Clear compliance paper trail.
- **`[bot]` badge in GitHub UI** — Immediately legible. Every reviewer, auditor, and external contributor sees at a glance that the PR was authored by an automated system.

**Note on signed commits (MYTHOS §1.2 requirement)**:
The "Require signed commits" ruleset on `main` applies to commits pushed *to* `main`. Agents push to PR branches — not `main`. When the CEO clicks "Squash and merge" on a PR via the GitHub web UI, GitHub creates the squash commit server-side and signs it automatically with GitHub's web-flow signing key. This produces a "Verified" squash commit on `main` without requiring CEO local GPG/SSH configuration. The signed commits requirement is therefore satisfied by the merge mechanism itself. See also: Open Question resolution in governance spec v1.1 §Open Questions item 3.

---

### Option D — Signed-Commits-Only Attribution (No Identity Change)

CEO's identity remains as author; agent attribution via GPG-signed `Co-Authored-By` trailers only.

**Assessment**: Does not fix the self-approval problem — CEO is still both author and sole available approver. **Rejected without further evaluation.**

---

## Decision Rationale

Option C is selected for the following reasons, in priority order:

1. **First-principles correctness**: GitHub Apps produce a `[bot]` identity that is structurally non-human. This accurately represents what a NanoClaw agent is. The conflation of agent identity with CEO identity is a category error. Option C resolves it at the root.

2. **§5.1 restoration without workaround**: `chmod735` approving `limitless-agent[bot]`'s PR is the standard GitHub flow for human-ratifies-automation. No bypass rules, no ruleset exceptions, no special CODEOWNERS entries. The spec works as designed.

3. **Zero scaling cost**: As the agent fleet grows from 7 to 15+ agent types, zero additional seat cost or 2FA overhead is incurred. Option B's cost scales linearly with fleet size; Option C's does not.

4. **Operational simplicity at scale**: Two private keys to manage (one per App). Installation tokens expire automatically — no rotation debt accumulates. Contrast with Option B: N PATs + N 2FA setups + N rotation schedules.

5. **GitHub's direction**: Classic PATs are deprecated. Fine-grained PATs require org-approval flows. Apps are GitHub's documented long-term path for automation identity. Building on this foundation avoids forced migration later.

6. **MiFID II compatibility**: `limitless-agent[bot]` and `mythos-agent[bot]` are auditor-legible. A third-party MiFID II reviewer immediately understands that bot-authored, CEO-ratified PRs represent the design intent: AI proposes, human ratifies.

7. **Expansion path**: If per-agent attribution is required in the future (e.g., regulatory requirement to distinguish MYTHOS Architect from MYTHOS test-engineer), additional Apps can be registered incrementally. No architectural change.

---

## Consequences

### Positive

- §5.1 ratification mechanism is fully restored. CEO clicks "Approve" on agent PRs. Formal Approving Review state is recorded in GitHub's PR history.
- PR author field shows `limitless-agent[bot]` — unambiguously non-human.
- Org audit log cleanly separates automated agent activity from human CEO activity.
- Zero new monthly cost regardless of agent fleet growth.
- No 2FA management for bot identities.
- Installation token blast radius: 1 hour, minimum scoped permissions.
- `[RESOLVED: signed commits tooling]` — Squash merge via GitHub web UI is GitHub-signed automatically; CEO local GPG/SSH configuration is not required for branch protection to function.

### Negative / Trade-offs

- **Implementation effort in NanoClaw**: `container-runner.ts` must be updated to generate an installation token at spawn time (JWT sign → exchange for token → inject as `GH_TOKEN`). Estimated complexity: medium (one NanoClaw engineer sprint). This PR covers plan only — implementation requires a separate engineer handoff.
- **Private key security**: Each App's RSA private key (~2 KB PEM) must be stored in NanoClaw's `.env` (`LIMITLESS_APP_PRIVATE_KEY`, `MYTHOS_APP_PRIVATE_KEY`). These replace the CEO's OAuth token as the high-value credentials for automation. Security model is equivalent: one high-value secret per division on the VPS, protected by VPS access controls.
- **Division-level attribution only (Phase 1)**: All LIMITLESS agents look identical in commit history (`limitless-agent[bot]`). Per-agent attribution is supplemented by `Authored-by-agent: PATHS Architect` commit footer convention until per-agent Apps are registered. This is sufficient for current LIMITLESS audit requirements (non-MiFID II).
- **CEO's `GH_TOKEN` remains on host**: The CEO's personal token stays in the host `.env` for administrative operations (repo management, non-agent PRs, `gh` CLI admin tasks). This is unchanged from today.

### Neutral

- `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` trailer: retained unchanged in all agent commit messages.
- CODEOWNERS: remains CEO-only for all repos. GitHub App bot users cannot be CODEOWNERS (they are synthetic accounts, not org members). No change to CODEOWNERS files.
- Collaborating team members: their PRs are authored by their own human accounts. No intersection with the App token flow.

---

## Self-Correction Path

If the GitHub App identity model fails in the future:

| Failure mode | Recovery |
|---|---|
| Private key compromised | Immediately revoke in App settings. Generate replacement key (multiple keys supported — zero-downtime). Update `.env` on VPS. |
| App installation suspended by GitHub | Activate Option A fallback (shared bot user account) within 1 hour. File remediation PR to update spec. |
| GitHub changes `[bot]` attribution policy | `Co-Authored-By` and `Authored-by-agent:` commit footers provide secondary attribution record independent of GitHub's UI. |
| VPS `.env` credential leak | Rotate both App private keys. Rotate CEO's `GH_TOKEN`. Audit commit history for any unauthorized pushes. |

Full step-by-step recovery procedures: `docs/plans/agent-identity-rollout.md` §Recovery.

---

## Open Questions

1. `[OPEN: Per-agent Apps for MYTHOS]` — At what point does MYTHOS require per-agent App registrations (e.g., distinguishing MYTHOS Architect from MYTHOS test-engineer in MiFID II records)? **Trigger**: when a second category of MYTHOS automation agent is deployed (Phase 2+ execution agents). **Decision owner**: CEO at that time.
2. `[OPEN: LIMITLESS per-agent attribution]` — If per-app Architect attribution is required for LIMITLESS (not currently a requirement), register `limitless-paths-arch`, `limitless-cubes-arch`, etc. as additional Apps. **Decision owner**: CEO when requirement arises.
3. `[RESOLVED: signed commits tooling]` — Squash merge via GitHub web UI satisfies the signed commits requirement on `main` via GitHub's automatic server-side signing. CEO local GPG/SSH configuration not required for branch protection. Recommended as best practice for CEO-authored commits (e.g., emergency direct merges) but not mandatory.

---

*This Decision Record is itself governed by the agentic SDLC governance spec. It must be ratified by CEO Approving Review before implementation begins.*
