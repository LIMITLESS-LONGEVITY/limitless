# Q3 Research Memo: Architectural-Dispute Resolution Protocol for MYTHOS

**Date:** 2026-04-22  
**Author:** LIMITLESS Architect (NanoClaw)  
**Commissioned by:** Human Director (verified session, 4:31 PM UTC)  
**Scope:** Independent assessment of dispute-resolution protocol options for MYTHOS; recommendation on 6 decision points  
**Word count target:** ≤1000 words  

---

## 1. Context

Q3 of the `@aradSmith` Phase 2 activation decisions (§6.1 of the Readiness Report) asks: *when two engineers disagree on MYTHOS architecture, what governs the resolution?*

Three options were evaluated in the Readiness Report §6.2:
- **Option 1 — CEO decides immediately:** No paper trail; doesn't scale.
- **Option 2 — Architect proposes, CEO decides, no template:** Produces ad-hoc DRs; inconsistent.
- **Option 3 — Architect proposes via fast-track DR template, CEO decides:** Established pattern (DR-001, DR-002 precedent), produces durable rationale, keeps CEO as final authority.

CEO's stated lean: **Option 3.**

This memo assesses each of the 6 open decision points and confirms the recommendation.

---

## 2. Baseline: Established DR Pattern

DR-001 and DR-002 establish a working precedent:
- Architect authors the DR on a feature branch.
- PR opened; discussion in PR comments.
- CEO ratifies by squash-merge (Approving Review + `RATIFIED` keyword per §5.1 of governance spec).

A fast-track template simply instantiates this pattern with a fixed structure and deadline, eliminating blank-page friction when time pressure is high.

---

## 3. Six Decision Points

### 3.1 Core Model

**Recommendation: Option 3 — confirm.**

Rationale: Option 1 burns CEO cycles on every disagreement with no institutional memory. Option 2 produces inconsistent DRs that future engineers can't rely on. Option 3 matches the existing DR-001/DR-002 pattern exactly — engineers know the workflow, Architect already operates this way, and the CEO retains full decision authority. No new tooling required.

**Decision: Option 3.**

---

### 3.2 Threshold: What Triggers a Formal DR?

Not every disagreement warrants a DR. Suggested trigger criteria (any one sufficient):

1. **Scope:** Change affects ≥2 MYTHOS subsystems or ≥1 safety-critical path (`engine/gates/`, `engine/ibkr/`, `db/migrations/`).
2. **Reversibility:** Decision is hard or costly to undo within a sprint.
3. **Disagreement escalation:** Two engineers disagree and cannot resolve within one async exchange (e.g., one PR review cycle).
4. **Explicit request:** Any contributor, Architect, or CEO can invoke a DR at any time.

Low-threshold disputes (variable naming, minor refactors, purely stylistic) → PR comment resolution only; no DR required.

**Decision: Trigger on any of the 4 criteria above.**

---

### 3.3 DR Authorship

**Recommendation: Architect (AI) authors first draft; disputing engineers may append their dissent inline.**

This mirrors DR-001/DR-002. The Architect drafts an impartial analysis of both positions, states a recommendation with confidence score, and opens the PR. Engineers add their positions as inline PR comments or in a `## Dissenting Views` section. CEO reviews the full record and decides.

This keeps the DR neutral at draft stage while ensuring all technical positions are on record before the CEO decides.

**Decision: Architect authors; engineers may append dissent in PR comments or designated section.**

---

### 3.4 Deadline Policy

**Recommendation: 48-hour default deadline from DR opening to CEO decision, extendable once to 96 hours on explicit CEO request.**

Rationale: MYTHOS is a safety-critical system. Unresolved disputes block shipping. A 48h window gives the CEO a full business day to review while preventing indefinite stalls. Extension to 96h accommodates vacation or high-priority interrupts. Beyond 96h, Architect escalates to #alerts.

If the CEO has not acted by deadline, Architect posts a reminder in #main-ops and #alerts. No auto-ratification; CEO must always act explicitly.

**Decision: 48h default, 96h max extension, #alerts escalation on breach.**

---

### 3.5 Formal Dissent Recording

**Recommendation: Dissent is always on record; DR is never closed without acknowledging the losing position.**

The DR template (§4 below) includes a `## Dissenting Views` section. Before the CEO ratifies, the Architect confirms this section is populated (even if the dissenting engineer defers to "no formal objection"). This creates institutional memory: future engineers can read why the alternative was rejected.

Post-ratification, dissenting engineer is not required to agree — only to acknowledge the decision is final for this release cycle. Same convention as DR-001/DR-002 PR comment thread.

**Decision: Dissent section required; Architect confirms populated before CEO ratification.**

---

### 3.6 CEO-Initiated Disputes

**Recommendation: CEO may open a DR against a merged decision within 30 days of merge.**

Scenario: CEO reviews a past architectural choice and believes it should be revisited. CEO posts in #main-ops or #handoffs requesting a DR retroactively. Architect opens a `DR-retro-*` branch, drafts the re-assessment, and the standard fast-track process applies. The original DR is amended with a `## Superseded By` link if CEO ratifies the new position.

Outside 30 days: still possible, but Architect notes in the DR that downstream code may already depend on the prior decision — risk assessment required before ratification.

**Decision: CEO-initiated DR permitted; retroactive within 30d flagged as standard; beyond 30d flagged as risk-elevated.**

---

## 4. Recommendation Summary

| Decision Point | Recommendation |
|---|---|
| Core model | Option 3 — fast-track DR template |
| Trigger threshold | Any of 4 criteria (scope, reversibility, escalation, explicit request) |
| DR authorship | Architect drafts; engineers append dissent |
| Deadline | 48h default, 96h max, #alerts on breach |
| Dissent recording | Required section; Architect confirms before ratification |
| CEO-initiated | Permitted; retroactive within 30d standard, beyond 30d risk-elevated |

---

## 5. Template and Example

See companion file: `docs/templates/DR-dispute-fast-track.md`

The example dispute ("should we vendor scikit-learn or use a pinned wheel?") is included in the template as a filled-in instance showing all required fields.

---

## 6. Open Questions for CEO

1. **Threshold 3.2**: Does CEO want to add a dollar-cost criterion (e.g., "decision affects vendor spend >$X/month")?
2. **Deadline 3.4**: Is 48h acceptable given CEO's current meeting load, or prefer 72h default?
3. **Dissent 3.5**: Should dissenting engineer be required to comment, or is silence acceptable as "no formal objection"?

These are refinements; Option 3 is operationally ready with current defaults.

---

*Architect confidence: 9/10. Option 3 is the correct fit for MYTHOS's current team size, safety-critical profile, and existing DR precedent.*
