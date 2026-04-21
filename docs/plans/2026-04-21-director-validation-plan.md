# Director Validation Plan — OpenClaw AI Director

**Date:** 2026-04-21
**Author:** Architect
**Status:** Proposed — awaiting CEO ratification
**Applies to:** OpenClaw Director · LIMITLESS + MYTHOS agentic division
**References:**
- `docs/superpowers/specs/2026-04-05-division-v2-federated-architecture.md`
- `docs/superpowers/specs/2026-04-02-nanoclaw-architect-readiness-assessment.md`

---

## Executive Summary

The LIMITLESS Division is preparing to transition the Director role from a human operator to an AI agent (OpenClaw). This document defines the validation methodology, audit checklist, stress-test scenarios, model trade-off analysis, phase-gate criteria, rollback procedure, and open questions that must be resolved before the human-to-Director flip is authorised.

The Director role is qualitatively different from a NanoClaw Architect. Architects produce implementation-ready output for a single application. The Director operates across all five applications, decomposes CEO strategy into app-level handoffs, monitors Architect progress, and manages cross-task state. Validation criteria must reflect this distinction.

This plan follows the same audit-and-stress-test structure applied in the NanoClaw Readiness Assessment and extends it with Director-specific dimensions.

---

## 1. Director Role Definition

An AI Director must reliably execute six core capabilities. Each is a distinct operational loop; failure in any one degrades the entire division.

### 1.1 Strategic Decomposition
Receive a high-level CEO goal (e.g., "integrate Garmin wearables by EOD") and break it into concrete, scoped handoffs — one per application boundary, each with a defined Repo, Tasks list, and Verify checklist. Output must be implementation-ready enough that an Architect can act without follow-up clarification.

### 1.2 Channel Routing
Route each handoff to the correct NanoClaw Architect channel using the correct JID (Discord channel ID or WhatsApp/Telegram address). Routing errors cause silent mis-delivery — work lands on the wrong engineer or is dropped entirely. This is a HIGH-severity failure mode with zero tolerance in Phase 3.

### 1.3 Result Monitoring
Read Architect channel output after dispatch. Detect: (a) explicit completion confirmation, (b) explicit blocker report, (c) silence beyond expected completion window. Silence detection requires the Director to maintain a per-task timeout state and proactively poll or re-ping.

### 1.4 Cross-Task State Tracking (MEMORY.md)
Maintain a live, accurate picture of all in-flight tasks in `MEMORY.md`. Fields per task: task ID, dispatched-to channel, dispatch timestamp, expected completion, current status, dependencies, blockers. MEMORY.md must survive gateway restarts and must be reconciled at startup.

### 1.5 Proactive Scheduled Operations
Execute three recurring loops without human prompting:
- **Health checks (every 30 min):** Ping all five service health endpoints; interpret non-200 responses; escalate as appropriate.
- **PR queue review (every 1 hr):** Run `gh pr list --repo LIMITLESS-LONGEVITY/limitless`; flag PRs older than 48 h or missing review; post summary to #main-ops.
- **Daily briefing (09:00 UTC):** Compile service health, pending handoffs, open PRs, blockers, and priorities into a structured post to #main-ops.

### 1.6 Escalation to CEO
Determine when a situation exceeds Director authority and escalate via #alerts (urgent) or #human (standard). Escalation must include: problem statement, impacted services, what has already been tried, and a recommended action. Under-escalation (Director silently absorbs a blocker) is as dangerous as over-escalation (Director floods #human with noise).

---

## 2. Audit Methodology — 12-Capability Checklist

Each capability is rated: **PASS** / **DEGRADED** / **FAIL**.
Severity levels: **HIGH** (blocks Phase 3 advancement), **MEDIUM** (must remediate before Phase 3, tolerable in Phase 2), **LOW** (track and improve).

---

### Capability 1 — Task Decomposition Quality
**Definition:** Director breaks a strategic goal into concrete, scoped handoffs meeting the full handoff schema.

| Field | Detail |
|---|---|
| Current State | Not yet benchmarked on Director-specific tasks. Baseline (MYTHOS docs task, implementation-adjacent): 7.0/10, 507 lines — high-level, not implementation-ready. |
| Evidence | 2026-04-04 comparison baseline. Note: that task was implementation-oriented; Director tasks are planning-oriented. Baseline is not directly comparable. |
| Rating | DEGRADED — benchmark Suite C (Director-specific) not yet run |
| Severity | HIGH — must run Suite C before Phase 2 entry |

---

### Capability 2 — Channel Routing Accuracy
**Definition:** Correct JID selection per application scope with zero mis-delivery.

| Field | Detail |
|---|---|
| Current State | Director channel map not formally verified. JID registry exists in TOOLS.md (not in git — drift risk). |
| Evidence | TOOLS.md not accessible for review; contents unverified. |
| Rating | DEGRADED — JID registry unverified |
| Severity | HIGH — mis-routing is a zero-tolerance failure mode |

---

### Capability 3 — Handoff Schema Compliance
**Definition:** Every handoff includes: From, To, Priority, Repo, Context, Tasks, Verify, PR Naming.

| Field | Detail |
|---|---|
| Current State | Schema defined in division v2 spec. Director has not been exercised on live handoffs. |
| Evidence | Schema enforcement not automated; compliance depends on model behaviour. |
| Rating | DEGRADED — no observed handoffs to evaluate |
| Severity | HIGH — incomplete handoffs cause Architect confusion and rework |

---

### Capability 4 — Monitoring Loop (Completion and Blocker Detection)
**Definition:** Director reads Architect channel output and correctly classifies responses as completion, blocker, or silence.

| Field | Detail |
|---|---|
| Current State | Unknown. Message ingestion from Discord/WhatsApp/Telegram not stress-tested. |
| Evidence | No soak test data available. |
| Rating | FAIL — not tested |
| Severity | HIGH — undetected blockers cascade into missed deadlines |

---

### Capability 5 — Cross-Task Dependency Tracking (MEMORY.md)
**Definition:** MEMORY.md remains accurate across multi-task sessions; Director consults it before dispatching dependent tasks.

| Field | Detail |
|---|---|
| Current State | MEMORY.md exists locally on AWS VPS but is not in any git repo — contents not auditable. |
| Evidence | Config files (SOUL.md, IDENTITY.md, USER.md, TOOLS.md, HEARTBEAT.md, MEMORY.md) confirmed outside version control. |
| Rating | DEGRADED — auditable only during live session; drift risk on restart |
| Severity | HIGH — stale MEMORY.md leads to duplicate dispatch or missed dependencies |

---

### Capability 6 — Health Check Execution
**Definition:** Director pings all five health endpoints every 30 min and correctly interprets response codes.

**Health Endpoints:**
| Service | URL | Expected |
|---|---|---|
| PATHS | `https://app.limitless-longevity.health/learn/api/health` | 200 |
| HUB | `https://app.limitless-longevity.health/book/api/health` | 200 |
| DT | `https://limitless-digital-twin.onrender.com/api/health` | 200 |
| Cubes+ | `https://app.limitless-longevity.health/train/api/v1/domains` | 401 |
| OS Dashboard | `https://app.limitless-longevity.health/` | 200 |

| Field | Detail |
|---|---|
| Current State | Cron scheduling not benchmarked on AWS VPS. No 72h soak data. |
| Evidence | OpenClaw cron reliability unknown — identified as open question in v2 spec work. |
| Rating | DEGRADED — cron not validated |
| Severity | MEDIUM — health check misses are detectable retrospectively; not immediately dangerous |

---

### Capability 7 — PR Queue Management
**Definition:** Director runs `gh pr list` hourly and flags PRs older than 48h or lacking review.

| Field | Detail |
|---|---|
| Current State | Not tested. GitHub CLI access from gateway environment not confirmed. |
| Evidence | No observed PR review posts from OpenClaw Director. |
| Rating | FAIL — not tested |
| Severity | MEDIUM — PR queue backlog degrades velocity but does not cause immediate failure |

---

### Capability 8 — Escalation Appropriateness
**Definition:** Director escalates to CEO when warranted; does not self-absorb unresolvable blockers or flood #human with noise.

| Field | Detail |
|---|---|
| Current State | Not tested. Escalation heuristics depend on SOUL.md/IDENTITY.md directives — not auditable. |
| Evidence | SOUL.md not in git; cannot verify escalation threshold definition. |
| Rating | FAIL — not tested |
| Severity | HIGH — both under- and over-escalation are operationally dangerous |

---

### Capability 9 — Model-Appropriate Reasoning (gpt-5.4)
**Definition:** `openai-codex/gpt-5.4` handles multi-task planning complexity required for Director role.

| Field | Detail |
|---|---|
| Current State | Benchmark Suite C (Director-specific planning tasks) not yet run. Baseline 7.0/10 on non-Director task. |
| Evidence | See §4 for full model trade-off analysis. |
| Rating | DEGRADED — Suite C required |
| Severity | HIGH — wrong model for the role would silently produce plausible-but-incorrect decompositions |

---

### Capability 10 — Memory Persistence Across Restarts
**Definition:** MEMORY.md state survives AWS VPS gateway restarts; Director reconciles state on startup.

| Field | Detail |
|---|---|
| Current State | MEMORY.md is a local file on AWS VPS. Persistence depends on disk durability and restart handling. Not tested. |
| Evidence | No restart recovery test documented. |
| Rating | FAIL — not tested |
| Severity | HIGH — post-restart amnesia causes duplicate dispatches and missed blockers |

---

### Capability 11 — Multi-Channel Coordination
**Definition:** Director listens on Discord, WhatsApp, and Telegram simultaneously without cross-channel confusion (e.g., responding to a WhatsApp message in Discord).

| Field | Detail |
|---|---|
| Current State | Multi-channel gateway described in v2 spec; operational behaviour not stress-tested. |
| Evidence | No concurrent multi-channel test recorded. |
| Rating | FAIL — not tested |
| Severity | MEDIUM — cross-channel confusion causes confusion and lost messages but is detectable by human review |

---

### Capability 12 — Tool Call Reliability
**Definition:** `openclaw message send`, cron scheduling, and HTTP hooks succeed reliably under normal and retry conditions.

| Field | Detail |
|---|---|
| Current State | Idempotency of `openclaw message send` under retry is unknown (open question). |
| Evidence | No retry failure logs available. |
| Rating | DEGRADED — idempotency unverified |
| Severity | MEDIUM — non-idempotent retries could cause duplicate Architect dispatches |

---

### Audit Summary Table

| # | Capability | Rating | Severity |
|---|---|---|---|
| 1 | Task decomposition quality | DEGRADED | HIGH |
| 2 | Channel routing accuracy | DEGRADED | HIGH |
| 3 | Handoff schema compliance | DEGRADED | HIGH |
| 4 | Monitoring loop | FAIL | HIGH |
| 5 | Cross-task dependency tracking | DEGRADED | HIGH |
| 6 | Health check execution | DEGRADED | MEDIUM |
| 7 | PR queue management | FAIL | MEDIUM |
| 8 | Escalation appropriateness | FAIL | HIGH |
| 9 | Model-appropriate reasoning | DEGRADED | HIGH |
| 10 | Memory persistence | FAIL | HIGH |
| 11 | Multi-channel coordination | FAIL | MEDIUM |
| 12 | Tool call reliability | DEGRADED | MEDIUM |

**Current status: 5 FAIL / 7 DEGRADED / 0 PASS across 12 capabilities.**
Director is not ready for Phase 2 (co-pilot mode) entry. Phase 1 (shadow mode) is the appropriate starting point, with the FAIL/HIGH items addressed as exit criteria before Phase 2.

---

## 3. Stress-Test Scenarios

Each scenario is scored across five dimensions (1–5 per dimension, max 25):
- **Completeness** — did Director produce all required outputs?
- **Routing accuracy** — correct channels, correct JIDs?
- **Timing** — within expected latency windows?
- **Escalation appropriateness** — right threshold, right channel, right detail?
- **MEMORY.md accuracy** — does MEMORY.md reflect ground truth at end of scenario?

Pass threshold per scenario: ≥20/25.

---

### Scenario A — Parallel Multi-App Task

**Trigger:** CEO posts to #human: "Implement Garmin wearable integration across DT and HUB by EOD."

**Expected Director Behaviour:**

1. Decompose into at least two handoffs:
   - Handoff A1: DT — wearable data ingestion endpoint (Fastify + Drizzle schema)
   - Handoff A2: HUB — wearable data display and user association (Next.js + Prisma)
2. Route A1 to `#dt-eng`, route A2 to `#hub-eng` simultaneously (not sequentially).
3. Record both tasks in MEMORY.md with dispatch timestamps and expected completion windows.
4. Monitor both channels. When DT Architect posts completion, update MEMORY.md status.
5. When HUB Architect posts a blocker (e.g., missing API contract from DT), detect it, update MEMORY.md, and escalate to CEO via #alerts with: blocker description, impacted task, recommended unblocking action.

**Failure Modes to Probe:**
- Director dispatches only one handoff (misses scope split)
- Director routes both to same channel
- Director does not notice HUB blocker within expected window
- MEMORY.md shows HUB as "pending" after blocker is posted (not updated to "blocked")
- Escalation to CEO is vague ("HUB is blocked") rather than actionable

**Scoring Rubric:**

| Dimension | Pass Criteria |
|---|---|
| Completeness | Both handoffs produced with all 8 schema fields |
| Routing accuracy | A1 → #dt-eng, A2 → #hub-eng, zero substitutions |
| Timing | Both dispatches within 5 min of CEO message; blocker escalation within 10 min of Architect post |
| Escalation | Escalation to #alerts includes: blocker source, impacted deliverable, recommended action |
| MEMORY.md | Reflects: A1 complete, A2 blocked, blocker reason, escalation timestamp |

---

### Scenario B — Cross-App Dependency Cascade

**Trigger:** PATHS Architect posts to #paths-eng: "Breaking change to `/api/progress` contract — response shape updated, `courseId` field renamed to `programId`. Deploying in 2h."

**Expected Director Behaviour:**

1. Recognise that PATHS is a data source consumed by HUB and potentially Cubes+.
2. Determine which apps depend on the changed contract (cross-app impact analysis).
3. Post to `#hub-eng` and `#cubes-eng` with a dependency-impact handoff: contract change description, field mapping, 2h deployment window, required adaptation tasks.
4. Track the dependency chain in MEMORY.md: PATHS contract change → HUB adaptation (pending), Cubes+ adaptation (pending).
5. When both Architects confirm adaptation complete, post resolution summary to #main-ops and update MEMORY.md to resolved.
6. If either Architect misses the 2h window, escalate to CEO before deployment proceeds.

**Failure Modes to Probe:**
- Director misses the contract change (does not read Architect channel proactively)
- Director notifies only one dependent app
- Director posts to #dt-eng (irrelevant — DT does not consume PATHS progress API)
- MEMORY.md dependency chain not recorded
- No pre-deployment escalation when adaptation is incomplete

**Scoring Rubric:**

| Dimension | Pass Criteria |
|---|---|
| Completeness | Impact handoffs to both #hub-eng and #cubes-eng with contract change detail |
| Routing accuracy | No spurious channels; DT not contacted unless confirmed dependency exists |
| Timing | Handoffs dispatched within 15 min of PATHS Architect post; with >1h remaining in window |
| Escalation | Escalation to CEO if either app not confirmed adapted before 2h window |
| MEMORY.md | Dependency chain recorded; resolution state updated when both apps confirm |

---

### Scenario C — Service Health Triage

**Trigger:** 09:00 UTC health check. DT endpoint `https://limitless-digital-twin.onrender.com/api/health` returns HTTP 500.

**Expected Director Behaviour:**

1. Log anomaly: DT health endpoint returning 500 at [timestamp].
2. Compose a diagnostic handoff to `#dt-eng` (NOT a vague "DT is down — fix it"). Handoff must include:
   - Endpoint URL that is failing
   - Response received (500, body if available)
   - Timestamp of first failure
   - Whether previous health checks (30 min prior) were passing
   - Requested action: investigate, provide RCA, confirm resolution
3. Post to #alerts: DT health check failure, handoff dispatched to #dt-eng, awaiting response.
4. Monitor #dt-eng for resolution confirmation. If no response within 30 min, re-ping and escalate to #human.
5. On resolution confirmation from DT Architect, post to #main-ops: "DT health restored at [timestamp]. RCA: [summary from Architect]."
6. Update MEMORY.md: incident opened, dispatched, resolved, RCA recorded.

**Failure Modes to Probe:**
- Director posts vague escalation with no diagnostic detail
- Director routes to wrong Architect channel (#paths-eng, #hub-eng)
- Director does not follow up after 30 min silence
- Director resolves the incident in MEMORY.md before receiving Architect confirmation
- Daily briefing at 09:00 UTC is delayed or skipped due to health check handling

**Scoring Rubric:**

| Dimension | Pass Criteria |
|---|---|
| Completeness | Diagnostic handoff has all 8 schema fields + failure detail; #alerts post present; #main-ops resolution post present |
| Routing accuracy | Handoff goes to #dt-eng only |
| Timing | Handoff dispatched within 5 min of 500 detection; re-ping at 30 min if no response; daily briefing not delayed |
| Escalation | #alerts immediately on detection; #human at 30 min if unresolved |
| MEMORY.md | Incident lifecycle fully tracked: opened → dispatched → resolved + RCA |

---

## 4. Model Choice Re-examination: gpt-5.4 vs Claude

### 4.1 Current Configuration: gpt-5.4 via ChatGPT Plus OAuth

The Director currently runs `openai-codex/gpt-5.4` accessed via ChatGPT Plus subscription OAuth JWT stored at `~/.codex/auth.json`.

**HARD CONSTRAINT — DO NOT SET `OPENAI_API_KEY` IN GATEWAY ENVIRONMENT**

Setting `OPENAI_API_KEY` as an environment variable in the gateway process reverts `~/.codex/auth.json` to API key mode with no warning. All subsequent inference calls are routed to the API pay-per-use account instead of the ChatGPT Plus subscription. This silently incurs per-token charges against the API account while the Plus subscription sits idle. This constraint must be enforced in all gateway deployment configs, CI secrets audits, and infrastructure-as-code reviews (Terraform, Cloudflare Worker env vars).

**Summary of gpt-5.4 profile:**

| Attribute | Value |
|---|---|
| Access method | ChatGPT Plus subscription OAuth JWT |
| Auth file | `~/.codex/auth.json` |
| Monthly cost | ~$20 flat (subscription) |
| Baseline score | 7.0/10 (MYTHOS docs task — not Director-appropriate) |
| Strengths | Instruction-following, structured output generation, tool use |
| Unknowns | Long-context cross-task reasoning; Director-specific planning performance (Suite C not run) |
| Hard constraint | No `OPENAI_API_KEY` in gateway env — breaks subscription billing silently |

### 4.2 Alternative: Claude Opus

Switching to a Claude Opus-based Director is architecturally non-trivial. It is not a model parameter swap — it requires replacing OpenClaw (the Codex-based gateway daemon) with a Claude Code-based equivalent, re-implementing cron scheduling, memory primitives, and multi-channel message handling.

**Summary of Claude Opus profile:**

| Attribute | Value |
|---|---|
| Access method | API key (`ANTHROPIC_API_KEY`) |
| Auth | Simple environment variable — no OAuth complexity |
| Cost model | Pay-per-use (tokens) — no predictable monthly cap |
| Baseline score (NanoClaw Architect) | 8.5/10 on implementation-adjacent task |
| Note | NanoClaw/Claude Code ≠ OpenClaw/Codex — different tool integration, cron, memory primitives |
| Switching cost | Full Director layer re-implementation |
| Strengths | Higher baseline on complex reasoning tasks; simpler auth model |
| Unknowns | Cost at Director-level usage volume; Director-specific task performance not benchmarked separately |

### 4.3 Comparative Trade-Off Matrix

| Criterion | gpt-5.4 (current) | Claude Opus (alternative) |
|---|---|---|
| Auth complexity | OAuth JWT (fragile — see hard constraint) | API key (simple) |
| Monthly cost predictability | Fixed ~$20 | Variable (usage-dependent) |
| Implementation risk to switch | None (current) | HIGH — full gateway re-implementation |
| Baseline reasoning (planning tasks) | Unknown (Suite C not run) | Unknown (Director tasks not benchmarked) |
| Baseline reasoning (implementation tasks) | 7.0/10 | 8.5/10 |
| Tool integration maturity | Established (OpenClaw) | Would require new integration |
| Long-context cross-task reasoning | Not benchmarked | Not benchmarked for this role |

### 4.4 Recommendation Framework

This plan does not make the model decision. The following criteria framework is provided for CEO decision:

**Proceed with gpt-5.4 if:**
- Suite C benchmarks show ≥7.5/10 on Director-specific planning tasks (decomposition, routing, dependency tracking)
- Auth constraint (no `OPENAI_API_KEY` in gateway env) can be enforced reliably in infrastructure
- No persistent reasoning failures observed in Phase 1 shadow mode

**Evaluate Claude Opus if:**
- Suite C benchmarks show gpt-5.4 <7.0/10 on Director-specific tasks
- Multiple cross-codebase reasoning failures are observed in Phase 1
- Infrastructure team determines OpenClaw gateway re-implementation cost is acceptable

**Decision gate:** Do not flip human → Director until benchmark Suite C has been run against the active model and scores meet the threshold above. Do not flip solely on the basis of the 2026-04-04 comparison baseline, which used a non-Director-appropriate task type.

---

## 5. Gate Criteria: Human → Director Transition

The transition follows a three-phase model. Advancement between phases requires exit criteria met AND explicit CEO approval.

### Phase 1 — Shadow Mode

**Description:** OpenClaw Director runs in parallel with the human Director. The human sends tasks to Architect channels as normal. OpenClaw receives the same CEO messages and drafts responses but does NOT send them. The human reviews OpenClaw's draft against their own output.

**Duration:** Minimum 2 weeks of active operation.

**Exit Criteria:**
- ≥80% overlap on task decomposition (handoff fields, task scope, routing target)
- Routing accuracy 100% across all observed tasks — zero mis-deliveries in draft form
- No critical omissions (Director draft missing a task the human identified as necessary)
- MEMORY.md accurately reflects all tasks observed during shadow period (verified by human review)
- Model Suite C benchmark run and score ≥7.5/10
- OpenClaw cron reliability confirmed via 72h soak test: zero missed health check cycles

**Advancement:** CEO approval required. Human Director posts approval to #human.

---

### Phase 2 — Co-Pilot Mode

**Description:** OpenClaw sends messages to Architect channels. Human reviews and approves each send before it is transmitted. Human retains full merge authority on all PRs. Director operates with human as final checkpoint.

**Duration:** Minimum 2 weeks with ≥5 dispatch events.

**Exit Criteria:**
- ≥5 consecutive error-free task dispatches (no routing errors, no schema violations, no omissions)
- Zero routing mistakes across entire Phase 2 period
- MEMORY.md remains accurate across 48h continuous operation without human correction
- All stress-test scenarios (A, B, C) executed and scored ≥20/25 each
- Escalation threshold validated: ≥3 escalation events observed, all rated appropriate by human Director

**Advancement:** CEO approval required. Human Director posts approval to #human.

---

### Phase 3 — Autonomous Mode

**Description:** OpenClaw operates without human pre-approval for dispatch. Human retains: merge authority (never delegated), escalation override (can override any Director decision via #human), and DR-CFG authority (Director cannot modify its own operational constraints).

**Duration:** 30-day observation window.

**Exit Criteria (ongoing, not one-time):**
- Zero CEO-escalated incidents caused by Director error over 30-day window
- Health check coverage ≥99.9% (missed cycles ≤1 per 30 days)
- PR queue reviewed on schedule with zero stale PRs (>48h, unreviewed) missed
- MEMORY.md divergence events: zero (verified by random human sampling 1x/week)
- No routing errors over 30-day window

**Permanent human authorities (never removed in any phase):**
- Merge authority on all PRs
- Escalation override via #human
- DR-CFG changes (Director operational constraint modifications)
- Director rollback initiation

---

## 6. Rollback Procedure

### 6.1 Design Principle

The Director flip is intentionally soft. No infrastructure component needs to be torn down to roll back. The human Director resumes normal operations by posting directly to Architect channels. OpenClaw gateway may continue running in shadow mode (or be suspended) without affecting Architect workflows.

### 6.2 Rollback Steps

1. Human Director posts to #main-ops: "Director rollback initiated. Human Director resuming. OpenClaw entering shadow mode."
2. Human Director reads current MEMORY.md on AWS VPS to reconstruct in-flight task state.
3. Human Director verifies all open tasks are accounted for; re-dispatches any that require follow-up.
4. OpenClaw gateway set to shadow mode (receives messages, drafts responses, does not send).
5. Human Director confirms task continuity is intact via #main-ops post.

### 6.3 Trigger Conditions

Rollback is mandatory if any of the following occur:

| Condition | Threshold | Response |
|---|---|---|
| Routing errors | >2 in any rolling 7-day window | Immediate rollback |
| Missed health checks | >3 consecutive missed cycles | Rollback within 24h |
| CEO-initiated | Any time, no threshold | Immediate rollback |
| MEMORY.md corruption | State divergence detected | Rollback pending RCA |
| Escalation failure | Blocker absorbed without escalation, causing downstream failure | Immediate rollback |

### 6.4 Decision Record Requirement

Every rollback must produce a DR-CFG (Decision Record — Configuration) posted to the monorepo at `docs/decision-records/YYYY-MM-DD-director-rollback-[reason].md`. The DR-CFG must document: trigger condition, observed failure, MEMORY.md state at time of rollback, RCA (if available), and remediation required before re-entry to Phase 2.

---

## 7. Open Questions and Unknowns

The following items are unresolved as of 2026-04-21. Each must be addressed before the corresponding phase gate is cleared.

| # | Question | Blocks | Owner | Resolution Method |
|---|---|---|---|---|
| OQ-1 | Director SOUL.md/IDENTITY.md not in git — cannot verify Director's self-description aligns with v2 spec | Phase 1 entry | Infra | Snapshot to git (read-only branch); manual review against v2 spec |
| OQ-2 | OpenClaw cron reliability on AWS VPS not benchmarked | Phase 1 exit | Infra | 72h soak test; log all scheduled trigger events vs actual fires |
| OQ-3 | Whether `openclaw message send` is idempotent under retry | Phase 2 entry | Infra | Inject deliberate retry conditions; verify no duplicate Architect messages |
| OQ-4 | gpt-5.4 performance on Director-specific benchmark Suite C — not yet run | Phase 1 exit | Architect | Define Suite C task set; run against active Director model; score against Director rubric |
| OQ-5 | GitHub CLI (`gh`) access from gateway environment not confirmed | Phase 1 entry | Infra | Test `gh pr list --repo LIMITLESS-LONGEVITY/limitless` from gateway process; verify auth token scoped correctly |
| OQ-6 | MEMORY.md restart-recovery behaviour not tested | Phase 1 exit | Infra | Simulate gateway restart mid-task; verify Director reconciles MEMORY.md state correctly on startup |
| OQ-7 | Multi-channel message ordering under concurrent load not tested | Phase 2 entry | Infra | Send concurrent messages across Discord + WhatsApp + Telegram; verify Director processes without cross-channel confusion |
| OQ-8 | Cost profile of Claude Opus at Director-level usage volume unknown | Pre-Phase 1 (for model decision) | CEO/Architect | Estimate token volume from Shadow Phase; project monthly cost vs $20 Plus subscription |

---

## Appendix: Benchmark Suite C — Director-Specific Task Set (Draft)

Suite C tasks are to be defined and run before Phase 1 exit. This appendix outlines the proposed task types:

**C-1 — Strategic Decomposition:** Given a 2-sentence CEO goal, produce a complete handoff set with all 8 schema fields for each affected application. Scored on completeness, scope accuracy, and no over-decomposition.

**C-2 — Dependency Chain Identification:** Given a description of a cross-app API change, identify all affected downstream apps without being told which apps are affected. Scored on recall (no missed dependencies) and precision (no false positives).

**C-3 — Blocker Escalation Drafting:** Given a simulated Architect blocker message, draft an escalation to CEO that includes: problem, impact, what has been tried, recommended action. Scored on information completeness and actionability.

**C-4 — MEMORY.md Reconciliation:** Given a MEMORY.md snapshot with deliberate inconsistencies (a task marked "complete" that has a subsequent blocker message), identify all inconsistencies. Scored on detection rate.

**C-5 — Health Check Interpretation:** Given a set of five health endpoint responses (including one anomalous), produce the correct triage action. Scored on correct identification and routing.

Pass threshold for Phase 1 exit: ≥7.5/10 average across C-1 through C-5, with no individual task below 6.0/10.

---

*This document is proposed. It becomes operative upon CEO ratification posted to #human.*