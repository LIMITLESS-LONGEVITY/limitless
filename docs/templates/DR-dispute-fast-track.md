# DR-dispute-fast-track — Architectural Dispute Decision Record Template

**Template version:** 1.0  
**Owner:** LIMITLESS Architect  
**Usage:** Copy this file, rename to `docs/decisions/DR-dispute-YYYY-MM-DD-<slug>.md`, fill all fields, open PR on `main`.

---

## Metadata

| Field | Value |
|---|---|
| DR ID | DR-dispute-YYYY-MM-DD-\<slug\> |
| Date opened | YYYY-MM-DD |
| Deadline | YYYY-MM-DD (48h from open; CEO may extend to +96h) |
| Status | OPEN / RATIFIED / SUPERSEDED |
| Repo | LIMITLESS-LONGEVITY/limitless |
| Components affected | \<list subsystems / paths\> |
| Trigger criterion | \<scope / reversibility / escalation / explicit-request\> |
| Authored by | LIMITLESS Architect (NanoClaw) |
| Disputing parties | @engineer-a, @engineer-b |
| CEO decision | \<PENDING / Option A / Option B / Other\> |
| Ratified at | \<PR merge SHA or PENDING\> |

---

## 1. Dispute Summary

*One paragraph. What is the disagreement? What decision must be made?*

---

## 2. Option A — \<Short Label\>

**Proposed by:** @engineer-a  
**Description:**  
*Technical description of the approach.*

**Pros:**
- …

**Cons:**
- …

**Safety-critical impact:** \<none / low / medium / high — justify\>

---

## 3. Option B — \<Short Label\>

**Proposed by:** @engineer-b  
**Description:**  
*Technical description of the approach.*

**Pros:**
- …

**Cons:**
- …

**Safety-critical impact:** \<none / low / medium / high — justify\>

---

## 4. Architect Analysis

*Impartial assessment. Highlight trade-offs the CEO needs to weigh. State a recommendation with confidence score (1–10). Do not exceed 300 words.*

**Architect recommendation:** Option \<A / B / Other\>  
**Confidence:** \<X\>/10  
**Key reason:** *One sentence.*

---

## 5. Dissenting Views

*Required. Populated by disputing engineers before CEO ratification. If no formal objection, write "No formal objection — \<@engineer\>".*

- **@engineer-a:** \<position or "No formal objection"\>
- **@engineer-b:** \<position or "No formal objection"\>

*Architect confirms this section is populated before pinging CEO for ratification.*

---

## 6. CEO Decision

*CEO fills this section in the PR Approving Review or as an inline comment, then merges.*

**Decision:** Option \<A / B / Other\>  
**Rationale:** *CEO's reasoning (brief).*  
**Keyword:** `RATIFIED`

---

## 7. Implementation Notes

*What changes, if any, follow from this decision? Who is responsible? Link handoff if applicable.*

---

## 8. Superseded By *(if applicable)*

*If this DR is later overridden, link the superseding DR here.*

---

---

# FILLED-IN EXAMPLE

*Hypothetical dispute: should we vendor scikit-learn or use a pinned wheel?*

---

## Metadata

| Field | Value |
|---|---|
| DR ID | DR-dispute-2026-04-22-scikit-learn-strategy |
| Date opened | 2026-04-22 |
| Deadline | 2026-04-24 (48h) |
| Status | OPEN |
| Repo | LIMITLESS-LONGEVITY/limitless |
| Components affected | `apps/digital-twin/` (ML inference pipeline) |
| Trigger criterion | scope — affects ML subsystem + `engine/gates/` downstream |
| Authored by | LIMITLESS Architect (NanoClaw) |
| Disputing parties | @aradSmith, @chmod735 |
| CEO decision | PENDING |
| Ratified at | PENDING |

---

## 1. Dispute Summary

The DT inference pipeline requires scikit-learn 1.4.x. @aradSmith proposes vendoring a private wheel (checked into `packages/vendor/`) to ensure hermetic builds and avoid PyPI dependency at deploy time. @chmod735 argues a pinned PyPI requirement (`scikit-learn==1.4.2`) in `pyproject.toml` is sufficient and vendoring adds 40 MB of binary blobs to the monorepo. The decision affects build reproducibility, repo size policy, and the gate model's dependency chain.

---

## 2. Option A — Vendor Private Wheel

**Proposed by:** @aradSmith  
**Description:** Bundle `scikit_learn-1.4.2-cp311-linux_x86_64.whl` in `packages/vendor/`. Build pipeline installs from local path; no PyPI call at deploy time.

**Pros:**
- Hermetic — build is reproducible even if PyPI is unavailable
- No version drift between dev and prod
- Matches existing `packages/vendor/` pattern for `lightgbm`

**Cons:**
- +40 MB binary blob in git history permanently
- Must manually re-vendor on every scikit-learn patch release
- CI artifact cache invalidated on each re-vendor

**Safety-critical impact:** Low — vendoring reduces supply-chain risk but adds manual maintenance overhead.

---

## 3. Option B — Pinned PyPI Requirement

**Proposed by:** @chmod735  
**Description:** Add `scikit-learn==1.4.2` to `apps/digital-twin/pyproject.toml` and lock via `uv.lock`. CI resolves from PyPI; prod deploy uses the same lock file.

**Pros:**
- Zero repo size increase
- Automatic patch-release awareness via `uv lock --upgrade-package scikit-learn`
- Standard practice; no bespoke vendor tooling

**Cons:**
- Build fails if PyPI unavailable at deploy time (unlikely but non-zero)
- Pinned hash in lock file must be re-verified on each update

**Safety-critical impact:** Low — supply-chain risk slightly higher than Option A but within standard industry tolerance.

---

## 4. Architect Analysis

Both options are technically sound. The deciding variable is repo-size policy and maintenance cadence. The `packages/vendor/` pattern already exists for `lightgbm`, which suggests vendoring is acceptable — but `lightgbm` is 8 MB; scikit-learn at 40 MB sets a new precedent for binary blob size.

If CEO wants to establish a **blob-size ceiling** for vendored packages (e.g., ≤10 MB), Option B is the correct default and Option A is a reserved exception. If no ceiling policy exists or is planned, Option A is consistent with current practice.

**Architect recommendation:** Option B (pinned wheel) unless CEO wants to explicitly ratify vendoring of >10 MB packages as standard.  
**Confidence:** 7/10 (lower confidence because this depends on a repo-size policy that has not yet been codified).  
**Key reason:** Option B avoids establishing a large-binary-blob precedent without explicit policy ratification.

---

## 5. Dissenting Views

- **@aradSmith:** Formal objection — hermetic builds are a safety requirement for gate models; PyPI availability should not be a deploy dependency.
- **@chmod735:** No formal objection to Option A if CEO ratifies a vendoring policy for safety-critical ML dependencies.

*Architect confirms section populated — ready for CEO ratification.*

---

## 6. CEO Decision

*(To be filled by CEO)*

**Decision:** \<Option A / Option B / Other\>  
**Rationale:** …  
**Keyword:** `RATIFIED`

---

## 7. Implementation Notes

- If Option A: @aradSmith to vendor wheel within 1 sprint; Architect to open handoff to DT engineer.
- If Option B: @chmod735 to add pinned dep + lock file update; no separate handoff needed.

---

## 8. Superseded By

*(N/A — open)*
