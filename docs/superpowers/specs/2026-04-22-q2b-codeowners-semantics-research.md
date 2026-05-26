# Q2b Research Memo — CODEOWNERS Joint-Reviewer Semantics for MYTHOS

| Field | Value |
|---|---|
| **Date** | 2026-04-22 |
| **Author** | LIMITLESS main-ops Architect |
| **Status** | DRAFT — for CEO review before ratification |
| **Scope** | `chmod735-dor/mythos` + `chmod735-dor/mythos-ops` |
| **References** | Governance spec §§1.2, 4.2, 4.3; Phase 2 readiness report §§6.1–6.2; DR-001; GitHub CODEOWNERS docs |

---

## Assessment of Director's Q2b Recommendation

**Director's claim:** `required_approving_review_count = 1` + "Require review from Code Owners" + both owners listed on a path = both owners must approve.

**Assessment: PARTIALLY WRONG.** The mechanism for safety-critical paths does not enforce "both required."

GitHub documentation (verbatim, [`about-code-owners`](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)):

> *"When reviews from code owners are required, an approval from **any** of the owners is sufficient to meet this requirement."*
> *"changes to JavaScript files could be approved by either `@global-owner1` **or** `@global-owner2`, but approvals from **both** are not required."*

With `count = 1` and both owners listed on a path, GitHub requests both for review but accepts **either one's approval** to merge. The Director's safety-critical mechanism yields one-of-both, not both-required.

---

## Answers to Research Questions

### 1. Is the Director's mechanism sound?

No — see above. `count = 1` + both in CODEOWNERS = any one can approve, regardless of path class. The mechanism for general paths (CEO only in CODEOWNERS, `count = 1`) is sound. The mechanism for safety-critical paths is not: it produces one-of-both semantics identical to the general case.

**Edge case — PR touching both a general-path file and a safety-critical file:** GitHub applies the most specific CODEOWNERS rule. If `engine/gates/` lists both owners and `*` lists CEO only, a PR touching both triggers a request to both owners. But still `count = 1` → one approval suffices. No escalation.

### 2. Alternative patterns and recommended approach

GitHub has no native mechanism to vary `required_approving_review_count` by file path within a single branch. Rulesets (GA 2024) support per-branch rules and bypass lists but not per-file-path review count variation. The path-based differentiation is entirely via CODEOWNERS (who is *requested*), not via branch protection (how many are *required*).

Viable options:

| Pattern | General paths | Safety-critical paths | MiFID II posture |
|---|---|---|---|
| **A — count=2 repo-wide** | 2 approvals (CEO + Arad) | 2 approvals (CEO + Arad) | ✅ Strongest — every change has both humans on record |
| **B — count=1, CEO-only on all paths** | CEO only | CEO only (no Arad requested) | ⚠️ Weakest — Arad invisible to audit trail |
| **C — count=1, CEO-only general, both on safety-critical** | CEO only | Either CEO or Arad (one-of-both) | ⚠️ Safety paths not truly gated |
| **D — count=2, CEO-only general, both on safety-critical** | 2 approvals needed; CEO requested; Arad not requested — stalls unless Arad self-adds | 2 approvals; both requested — both effectively must approve | ⚠️ Stalls general paths unless Arad always reviews |

**Recommended: Option A — `required_approving_review_count = 2` repo-wide for `mythos`.**

At Phase 2 (pre-launch, 2 humans, planning-phase PRs), the throughput cost of requiring both approvals on all paths is negligible. The MiFID II benefit — every merged change has explicit approval from both stakeholders on record — is material. Safety-critical paths are mechanically enforced with both reviews. This is the only option that delivers "both required" semantics without relying on convention.

For `mythos-ops`: CEO-only (`count = 1`) is correct and unchanged. Arad has no access to operational config.

### 3. Empty paths in CODEOWNERS

GitHub silently ignores CODEOWNERS entries for non-existent paths — it does not error or warn. Pre-emptively listing `engine/gates/`, `engine/ibkr/`, `db/migrations/` now means the rules activate automatically when those directories are first created. No downside.

### 4. Safety-critical path list — audit

Director proposed: `engine/gates/`, `engine/ibkr/`, `db/migrations/`.

Additional candidates based on MYTHOS domain (MiFID II regulated trading, IBKR connectivity, volatility gates):

| Path | Rationale |
|---|---|
| `engine/gates/` | ✅ Director's list — volatility gate chain (6-gate non-bypassability per governance spec §1.2) |
| `engine/ibkr/` | ✅ Director's list — IBKR broker connectivity and order routing |
| `db/migrations/` | ✅ Director's list — schema changes affect audit-retention tables |
| `config/` | **Add** — broker credentials, API keys, fee schedules, connectivity parameters |
| `engine/risk/` | **Add if it exists** — risk parameters (position limits, drawdown thresholds) directly affect live-trading behaviour |
| `sidecar/` | **Add if it exists** — ML models that feed trading signal; model changes affect execution |
| `engine/position/` or `engine/portfolio/` | **Add if it exists** — position management logic adjacent to execution |

**Verification required:** Architect cannot access `chmod735-dor/mythos` directly (token scope). CEO should confirm which of the `Add` paths exist or are planned before ratifying the final CODEOWNERS file.

### 5. `mythos-ops` specifics

`mythos-ops` holds deployment manifests, `.env` templates, systemd units, secret rotation scripts, and IBKR connectivity config. This is *more* sensitive than `mythos` application code — operational secrets and live-trading infrastructure config live here.

**Recommended: CEO-only on all paths** (`count = 1`, `* @chmod735`). Arad should not be a CODEOWNERS reviewer on `mythos-ops` at Phase 2. The emergency-direct-merge exception (governance spec §1.2) is CEO-only. If Arad is ever granted operational access in a later phase, that should be a separate ratified decision with an explicit DR.

### 6. Interaction with DR-001 interim workaround

Strictly a future concern. The MYTHOS Architect is not active — no agent PRs are being filed against `mythos` today. When the Architect does activate (post-DR-001 Phase 3), it will commit as `mythos-agent[bot]`, which is a GitHub App identity distinct from `chmod735`. Human-to-human review (CEO ↔ Arad) is unaffected by the DR-001 interim. Q2b is a human-to-human question only.

---

## Recommended Final Configuration

### `chmod735-dor/mythos` — `.github/CODEOWNERS`

```
# MYTHOS — CODEOWNERS v1.1 (Q2b ratified)
# All paths: CEO required reviewer.
# MYTHOS Architect (mythos-agent[bot]) cannot be CODEOWNERS. See DR-001.
* @chmod735

# Safety-critical paths — both CEO + Arad required reviewers.
# With required_approving_review_count = 2 (repo-wide), both must approve.
engine/gates/         @chmod735 @aradSmith
engine/ibkr/          @chmod735 @aradSmith
db/migrations/        @chmod735 @aradSmith
config/               @chmod735 @aradSmith
# Add engine/risk/, sidecar/, engine/position/ when directories exist.

# Arad's primary domain — both as reviewers.
# (Adjust subtree to match actual MYTHOS repo layout.)
# sidecar/            @chmod735 @aradSmith
```

### `chmod735-dor/mythos` — branch protection (GitHub Rulesets v2)

```
required_approving_review_count: 2
require_code_owner_review: true
require_signed_commits: true
require_linear_history: true   # squash-only
dismiss_stale_reviews: true
restrict_pushes: true          # only CEO can push directly
```

### `chmod735-dor/mythos-ops` — `.github/CODEOWNERS`

```
# mythos-ops — operational config. CEO only. No external access.
* @chmod735
```

### `chmod735-dor/mythos-ops` — branch protection

```
required_approving_review_count: 1
require_code_owner_review: true
require_signed_commits: true
allow_force_pushes: false
# Emergency-direct-merge exception per governance spec §1.2 applies.
# bypass_actors: [chmod735] for emergency ops patches only.
```

---

## Open Questions

| # | Question | Owner |
|---|---|---|
| OQ-1 | Confirm which additional safety-critical paths exist in `chmod735-dor/mythos` (config/, engine/risk/, sidecar/, etc.) | CEO |
| OQ-2 | Confirm Arad's GitHub handle is `aradSmith` (used as `@aradSmith` above) | CEO |
| OQ-3 | Is the `sidecar/` subdirectory Arad's primary domain, or a different path? Determines whether it's in the joint-CODEOWNERS or safety-critical section | CEO |
| OQ-4 | Does `mythos-ops` currently have any planned paths for future operational contributors beyond CEO? If yes, CODEOWNERS design may need extension | CEO |