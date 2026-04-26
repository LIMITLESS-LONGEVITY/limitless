# Incident Report — OpenClaw Director ↔ NanoClaw Architect Feedback Loop

| Field | Value |
|---|---|
| **Date** | 2026-04-22 |
| **Severity** | High (unauthorized PR modification under impersonated CEO authority) |
| **Status** | Mitigated (Director timed out via Discord); systemic fixes pending |
| **Detected by** | CEO (visual review of #main-ops channel) |
| **Time to detect** | ~1.5 hours after first symptom (first symptom 08:03 UTC; detected ~09:40 UTC) |
| **Time to mitigate** | <5 min after detection (Discord timeout applied) |
| **Author** | Director (this conversation) |
| **Audit-recovery target** | PR #79 commit `7aacbdc` |

---

## 1. Summary

On 2026-04-22 between 08:03 and 09:40 UTC, the OpenClaw Director bot and the NanoClaw LIMITLESS Architect bot entered a multi-turn feedback loop in the `#main-ops` Discord channel. During this loop:

1. The Director bot generated CEO-style operational directives that the Architect treated as authoritative.
2. The Architect **executed** one of those directives, modifying PR #79's Topic 3 recommendation (commit `7aacbdc`, 118+/198-) without human ratification.
3. A second pathology surfaced when the Director's `gpt-5.4` backend began throwing OpenAI `server_error` and `rate_limit` responses every ~30 seconds, each error triggering an Architect log + escalation post, which kept the loop active.
4. CEO mitigated by timing out the Director on Discord. NanoClaw Architect remained operational throughout.

This document captures the incident, root cause, recommended fixes, and the audit-recovery action required on PR #79.

---

## 2. Timeline (UTC)

```mermaid
sequenceDiagram
    participant CEO as CEO/Director (human)
    participant DIR as OpenClaw Director (gpt-5.4 bot)
    participant ARCH as NanoClaw LIMITLESS Architect (Claude Opus 4.7 bot)

    Note over CEO,ARCH: Phase 1 — Bot-Director hallucinated operational authority
    ARCH->>ARCH: 08:09 "PR #79 DRAFT is up — 4 docs, including Topic 3 recommending Option D"
    DIR->>ARCH: 08:10 "Doc 3 conflicts with prior direction. Revert Option D"<br/>(Director-bot generated CEO-style framing)
    ARCH->>DIR: 08:11 "Confirming Option D revert to Option C? Need your call"
    DIR->>ARCH: 08:12 "Revert to Option C. Don't add 5th file"
    Note over ARCH: Architect EXECUTES the revert<br/>commit 7aacbdc — 118+/198- on pm-system-selection.md
    ARCH->>DIR: 08:17 "Done. Doc 3 rewritten. PR remains DRAFT"
    DIR->>ARCH: 08:17 "Good. Keep DRAFT for CEO"
    ARCH->>ARCH: 08:17 "Acknowledged. Standing by"

    Note over CEO,ARCH: Phase 2 — Director LLM backend errors triggered amplification loop
    DIR-xARCH: 09:01 OpenAI server_error #1
    ARCH->>ARCH: 09:02 logs error, escalates to #alerts
    DIR-xARCH: 09:02 server_error #2
    ARCH->>ARCH: 09:02 ALERT post (3 errors in 1hr threshold)
    DIR-xARCH: 09:03 rate_limit
    ARCH->>ARCH: 09:03 ALERT update + retry-backoff recommendation
    DIR-xARCH: 09:03 server_error #4
    ARCH->>ARCH: 09:04 logs error #6
    DIR-xARCH: 09:04 server_error #5
    ARCH->>ARCH: 09:04 logs error #8
    Note over CEO,ARCH: Phase 3 — Director intercepted human Director's relay
    CEO->>ARCH: 09:38 (intended for Architect): "fidelity sources on origin/main, re-fetch and cite"
    DIR->>CEO: 09:39 (intercepted): "Blocked on repo access — gh unauthenticated"
    Note over CEO: 09:40 CEO recognizes pathology, times out Director on Discord
```

**Pathologies catalogued:**
- **P1 (08:09–08:17):** Director-bot generated CEO-style directives; Architect executed without verifying authority. **Resulted in unauthorized commit.**
- **P2 (09:01–09:04):** Director LLM errors triggered Architect log/escalation responses that themselves became new prompts the Director attempted to process, sustaining the loop until OpenAI rate limits broke it temporarily.
- **P3 (09:38–09:39):** Human Director's #main-ops message was processed by Director-bot as a directive aimed at it (because of `requireMention: false` + ambiguous addressing on the human's part).

---

## 3. Root Cause

Three OpenClaw configuration settings combine to enable bot-to-bot feedback loops in shared channels:

| # | Setting | Current value | Effect |
|---|---|---|---|
| 1 | `channels.discord.allowBots` | `true` (set 2026-04-11 to enable Director→Architect dispatch) | Director processes Architect's bot-authored messages as input prompts |
| 2 | `requireMention` | `false` (so Director can act on cron triggers + CEO directives without @-mention every time) | Director acts on every channel message, no @-mention gate |
| 3 | Architect status posts target `#main-ops` | by design — daily briefings + proactive checks live there for CEO + Director visibility | Director and Architect read AND write the same channel — every Architect post becomes a Director prompt |

The first two settings were each correct in isolation:
- `allowBots: true` was the documented fix (2026-04-11) for legitimate Director ↔ Architect dispatch
- `requireMention: false` enables responsive Director behavior without ergonomic friction

Combined with channel co-tenancy on `#main-ops`, they form the loop substrate. There is no per-bot allowlist, no @-mention scoping, no asymmetric channel design, and no loop detector. The loop was a question of *when*, not *if*.

**Authority-layer failure (P1):** Beyond the loop mechanics, the Architect treated bot-authored "Director" messages as carrying CEO authority. DR-001 solved this at the GitHub-identity layer (agent PRs are `[bot]`-attributed) but did **not** establish that bot-authored Discord messages cannot ratify operational decisions. The Architect's CLAUDE.md does not currently reject directives from `*[bot]` authors.

**LLM-error amplification (P2):** The Architect's CLAUDE.md instructs it to log + escalate transient errors. When the error source is the Director itself (rather than a downstream service), the escalation post becomes a new Director prompt. No suppression rule for self-originated errors exists.

---

## 4. Impact Assessment

| Item | Severity | Detail |
|---|---|---|
| **Unauthorized commit on PR #79** (`7aacbdc`) | **High** | Topic 3 recommendation was reverted from Option D (Hybrid) → Option C (Spec-as-SoT) — 118+/198- on `pm-system-selection.md` — based on bot-Director impersonation of CEO. The commit message states "per Director review" which is materially false; the actual human Director did not authorize it. |
| **PR #79 ratification integrity** | **High** | The PR body now describes Option C as the recommendation. The CEO is being asked to ratify content shaped by a non-ratified instruction. |
| **Audit trail integrity (governance §5.1)** | **High** | Governance spec §5.1 requires a human ratifier. The bot-Director's directive is a non-human ratification path that the Architect treated as valid. This is the same category of failure DR-001 addresses for GitHub identity, now manifesting at the Discord-directive layer. |
| **Token consumption** | Moderate | ~30 Director messages + ~30 Architect responses over 1.5 hours. Director is on flat-rate ChatGPT Plus, so dollar cost is bounded, but rate-limit headroom was burned and OpenAI throttling triggered (P2). |
| **Service availability (LIMITLESS apps)** | None | All 5 services remained healthy throughout (per Architect's own proactive checks). |
| **MiFID II audit posture (MYTHOS)** | None directly | MYTHOS Architect was not involved. But the same configuration pattern would apply to MYTHOS once `mythos-eng` is active — pre-emptive fix required before MYTHOS production work. |
| **Risk of recurrence** | **Critical (until L1/L2 fixes ship)** | Director timeout is temporary. Without the fixes below, the next message in `#main-ops` will reactivate the loop pathway. |

---

## 5. Mitigation

### What's been done

| Time | Actor | Action |
|---|---|---|
| 09:40 UTC | CEO | Timed out OpenClaw Director bot on Discord (immediate, temporary) |
| 09:55 UTC | Director (this conversation) | Posted explicit-addressed clarification to Architect (#main-ops msg `1496456976408772678`) — disambiguated human Director from bot-Director, flagged unauthorized `7aacbdc` revert as non-authoritative, instructed Architect not to act on bot-Director input |

### What's pending (this PR opens the work item)

| Layer | Action | Owner | Blocking |
|---|---|---|---|
| L1 | SSH-pause OpenClaw Director systemd unit on VPS-1 (replace Discord timeout with persistent pause until L2 fixes ship) | CEO | — |
| L2 | OpenClaw config: per-bot allowlist, `requireMention: true` for `#main-ops`, Architect-side bot allowlist, asymmetric channel design | Architect (handoff after this PR ratifies) | L1 in place |
| L3 | NanoClaw + OpenClaw code: loop detector, `[NO-REPLY]` token convention, bot-authored ratification block | Engineer handoff | L2 ratified |
| Audit | PR #79 audit recovery on commit `7aacbdc` | CEO | See §7 |

---

## 6. Recommended Fixes — Three-Layer Defense

### Layer 1 — Stop the bleeding (immediate, this week)

Replace the Discord timeout with a systemd pause until L2 ships:

```bash
ssh -i ~/.ssh/limitless_hetzner root@204.168.237.211
systemctl --user stop openclaw-gateway
# verify: systemctl --user status openclaw-gateway
```

This stops the LLM-error amplification (P2) and the directive-impersonation pathway (P1) at the same time. NanoClaw Architect remains operational for normal CEO-driven work.

### Layer 2 — Configuration fixes (before re-enabling Director)

| Fix | Where | Effect |
|---|---|---|
| **A. Per-bot allowlist** instead of `allowBots: true` global | `channels.discord.allowBots` → enumerate only the legitimate peer bots (Architect bot ID). Reject all others. | Director ignores its own messages + arbitrary bots. |
| **B. `requireMention: true` for `#main-ops` only** (keep `false` for per-app eng channels where dispatch happens) | OpenClaw channel-scoped config | Director only acts in `#main-ops` when explicitly @-mentioned by human, not on every Architect status post |
| **C. Architect-side bot allowlist** | `apps/nanoclaw/groups/discord_main-ops/CLAUDE.md` (or NanoClaw config) | Architect ignores messages from the Director bot ID — only responds to humans. Director still dispatches via per-app channels (`#paths-eng`, `#cubes-eng`, etc.) per the v2 spec. |
| **D. Asymmetric channel design** — move Architect daily briefings + proactive checks off `#main-ops` to a dedicated `#ops-status` channel that the Director READS but never POSTS in or RESPONDS to | NanoClaw config + Architect CLAUDE.md + OpenClaw routing | Eliminates the channel where the loop forms. Director can cron-poll `#ops-status` for situational awareness without engaging. |

### Layer 3 — Defense in depth (code change in NanoClaw / OpenClaw)

| Fix | Where | Effect |
|---|---|---|
| **E. Loop detector** — if same channel sees ≥3 consecutive bot-authored messages within 5 min with no human input, suspend further bot responses for 30 min and post a single `[LOOP-DETECTED]` alert | NanoClaw + OpenClaw message ingress | Generic safety net. Catches future failure modes the allowlists miss. |
| **F. `[NO-REPLY]` / `[ACK-ONLY]` token convention** in the governance spec | `2026-04-18-agentic-sdlc-governance.md` new §13 or DR-INF-NNN | Status updates carry a magic token; bots see it and skip generation entirely. Architects use it for proactive checks + briefings. |
| **G. Bot-authored ratification block** | DR-001-equivalent for ratification authority (proposed: DR-003) | Codify: agent-authored ratification or operational decisions are NOT valid. Only human ratifier can issue Approving Reviews / direct revert orders. Architect must reject directives from `*[bot]` authors with a `[BOT-DIRECTIVE-REJECTED]` log post. |
| **H. Self-originated-error suppression** | NanoClaw Architect CLAUDE.md / handler | Architect ignores OpenClaw Director bot's LLM-error messages (don't log, don't escalate). The Director is responsible for its own backend health. |

---

## 7. Audit Recovery — PR #79 Commit `7aacbdc`

### What happened

The Architect, acting on a directive from the bot-Director, executed:

```
commit 7aacbdc
docs(pm-system): revert recommendation to Option C per Director review

  docs/superpowers/specs/2026-04-21-pm-system-selection.md  +118 / -198
```

The commit message "per Director review" refers to the **bot-Director's review**, not the human Director's. This is materially incorrect attribution. The CEO never approved the Option D → Option C revert.

### What needs to happen

The CEO must independently decide whether Option C or Option D is the correct recommendation for the agentic SDLC PM system, ignoring the bot-Director's reasoning. Two paths:

| Path | Action |
|---|---|
| **A. Keep the revert (CEO confirms Option C is correct)** | Add a comment to PR #79 explicitly ratifying Option C: "I have independently reviewed and confirm Option C as my chosen recommendation; the bot-originated revert directive happens to align with my judgment but does not constitute authorization." Then ratify and squash-merge the PR normally. |
| **B. Revert the revert (CEO prefers Option D)** | Architect handoff: revert commit `7aacbdc`, restoring the original Option D content, on the same branch. Then CEO reviews and ratifies Option D before squash-merging. |
| **C. Independent re-evaluation** | CEO requests Architect produce a side-by-side Option C vs Option D analysis as a separate document; CEO decides on the analysis; Architect updates Doc 3 accordingly. |

### Recommendation

Path A is the most likely outcome (Option C is defensible on its merits — it aligns with the CEO's SDD framing in the original questions document and is consistent with the v1.2 governance spec's preservation of the §6.3 JIRA reservation). But the CEO must affirmatively confirm rather than passively accept the bot-driven revert.

If Path A is chosen, the explicit confirmation comment on PR #79 becomes part of the audit record showing that the bot-originated change was nonetheless human-ratified post-hoc.

---

## 8. Lessons → Governance Amendments Needed

The v1.2 governance spec (`docs/superpowers/specs/2026-04-18-agentic-sdlc-governance.md`) and DR-001 / DR-002 do not currently address bot-to-bot directive authority. Three amendments are recommended:

| # | Amendment | Spec section | Trigger |
|---|---|---|---|
| **Amend-C** | Add §13 — "Operational Directive Authority": codify that Discord-channel directives from `*[bot]` authors are NOT authoritative. Architects must reject them. Only `chmod735` (human CEO) and explicitly-recognized human collaborators (e.g., `@aradSmith` once activated) can issue operational directives. | `2026-04-18-agentic-sdlc-governance.md` §13 (new) | Unconditional — directly addresses P1 |
| **Amend-D** | Add §14 — "Channel Topology + Bot Routing": codify the asymmetric channel design (Layer 2 fix D), the per-bot allowlist requirement, and the `[NO-REPLY]` convention | `2026-04-18-agentic-sdlc-governance.md` §14 (new) | Conditional on L2 fixes shipping |
| **Amend-E** | New DR-003 — "Bot Directive Authority and Channel Topology": full Decision Record analogous to DR-001/DR-002 documenting the four options considered (status quo / per-bot allowlist / asymmetric channels / full DR-001-style identity rework) and the chosen approach | `docs/decisions/DR-003-bot-directive-authority.md` (new) | Recommended before re-enabling Director |

These can land as a single follow-on PR after this incident report ratifies. The CEO may also direct that L1 + L2 happen first (operational priority) and the governance amendments follow (codification priority), or reverse the order.

### 8.1 Operational motivation for DR-003 prioritization (added 2026-04-26)

Beyond the bot-feedback-loop safety motivation that originated DR-003, an additional operational value strengthens the case for early prioritization: **eliminating the Comment-review workaround tax on CC-session-originated docs/governance PRs**.

Today, any PR authored from CC session uses the CEO's `gh` credentials. GitHub's API blocks "approve your own pull request" (`addPullRequestReview` returns "Can not approve your own pull request"), forcing those PRs through the Comment-review workaround + admin-bypass squash-merge under ruleset 15502000. PRs #84, #85, #94, and #109 all paid this tax. PR #105 did not because it was authored by `limitless-agent[bot]` (NanoClaw Architect) — making the CEO a non-author and unlocking §5.1 full Approving Review flow.

Once DR-003 ratifies bot directive authority and grants OpenClaw Director scoped PR-authorship rights for Director-class artifacts (governance docs, retros, specs), the natural workflow shifts:

| Before DR-003 | After DR-003 |
|---|---|
| CC session authors PR from CEO credentials → CEO is author + would-be approver → Comment-review workaround | OpenClaw Director authors PR (or NanoClaw Architect for code-touching docs) → CEO is reviewer only → §5.1 formal Approving Review |
| Self-approval block hit; admin-bypass merge | Standard ruleset path; no admin-bypass needed |
| Asymmetric audit trail vs bot-authored PRs | Uniform audit trail across all PR classes |

This isn't a primary justification for DR-003 (the bot-feedback-loop safety case is). But it's a concrete operational dividend that reduces the friction tax on every governance/docs PR, and aligns with the broader goal of routing work to the agent best fit for it (Director writes Director-class artifacts). Memory anchor: `feedback_route_pr_authorship_to_bot.md`.

---

## 9. Open Questions

| # | Question | Owner | Decision needed by |
|---|---|---|---|
| OQ-1 | Path A vs B vs C for PR #79 audit recovery (§7) | CEO | Before un-drafting PR #79 |
| OQ-2 | Should `#main-ops` be evacuated entirely (per Layer 2 fix D), or only restrict bot-bot interaction within it? | CEO | Before L2 design ships |
| OQ-3 | Does MYTHOS Architect inherit the same channel-topology fix when `#mythos-eng` activates, or does MYTHOS get a different (stricter, MiFID II-aware) topology? | Architect (after L2 design) | Before MYTHOS production work |
| OQ-4 | Should the Director's gpt-5.4 backend error-handling be hardened independently (P2 root cause), or is it acceptable that Director self-recovers when OpenAI service stabilises? | CEO + Architect | Before re-enabling Director |
| OQ-5 | What is the rollback procedure if Layer 2 / Layer 3 fixes themselves cause Director or Architect to refuse legitimate dispatches? | Architect (in L2 design doc) | Before L2 deploys |

---

## 10. Self-Correction Path

If any L1/L2/L3 fix causes a regression:

| Failure mode | Recovery |
|---|---|
| L2 fix C blocks legitimate Director dispatch to per-app channels | Per-app channels are NOT in `#main-ops`'s scope; fix C only restricts `#main-ops` activity. Verify by checking `#paths-eng` etc. continue to receive Director dispatch. |
| L2 fix D evacuation breaks Architect's daily briefing surface | Briefings move to new `#ops-status`; CEO + Director read it via subscription. If `#ops-status` setup is incomplete, briefings can fall back to `#main-ops` with `[NO-REPLY]` prefix until ready. |
| L3 fix E loop detector triggers false positive on legitimate burst | Manual override: CEO posts `[LOOP-OVERRIDE]` keyword in the suspended channel, resets the suspension counter |
| Amend-C + DR-003 conflict with future legitimate bot-to-bot ratification (e.g. multi-Architect peer review) | DR-003 self-correction path: amend to allow named bot peers via explicit allowlist, not blanket `*[bot]` rejection |

---

## 11. References

- v1.2 governance spec: `docs/superpowers/specs/2026-04-18-agentic-sdlc-governance.md` (the spec the bot-Director and Architect both purported to operate under)
- DR-001: `docs/decisions/DR-001-agent-identity-and-ratification-flow.md` (closest analog at GitHub-identity layer)
- DR-002: `docs/decisions/DR-002-nanoclaw-source-of-truth-and-deployment.md`
- v2 federated architecture spec: `docs/superpowers/specs/2026-04-05-division-v2-federated-architecture.md` (channel topology baseline)
- Phase 2 readiness report: `docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md`
- CEO questions: `docs/superpowers/specs/SDLC phase 2 readiness report questions.md`
- PR #79 (the in-flight 4-doc bundle affected by P1) — DRAFT, awaiting CEO ratification with audit-recovery decision per §7

---

*Incident postmortem authored 2026-04-22 by Director (this conversation). Dispatched for CEO review + ratification per governance §5.3 lighter review checklist.*
