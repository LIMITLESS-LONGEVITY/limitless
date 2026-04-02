# Postmortem: AI Tutor Production Failure (2026-03-26)

**Author**: Workbench Claude instance (limitless-paths-workbench)
**Date**: 2026-03-26
**Severity**: High — all AI features (tutor, action plan, daily protocol) broken for all users
**Resolution**: PR #9 merged — graceful degradation added to all AI endpoints

---

## What Happened

The AI Tutor returned "Something went wrong. Please try again." for every user. The action plan and daily protocol endpoints also failed silently.

## Render Logs

```
[error] column 57016c18...health_profiles_id does not exist
[error] Failed query: SELECT ... FROM content_chunks WHERE embedding IS NOT NULL ...
[info] "Daily protocol generation failed"
```

## Root Cause

Phase 6 added HealthProfiles, ActionPlans, DailyProtocols, and Certificates to `payload.config.ts` with correctly structured migrations. However:

1. The AI tutor endpoint (`src/endpoints/ai/tutor.ts` line 128) called `getHealthProfile()` **without a try/catch at the endpoint level**.
2. While `getHealthProfile()` itself has a try/catch, Payload's Drizzle adapter throws during **query building** (not execution) when it encounters an unknown column in a JOIN. This bypasses the utility's try/catch.
3. The RAG retrieval pipeline (`retrieveRelevantChunks()`) also had no try/catch — if the vector search query failed (e.g., schema mismatch), the entire request crashed.
4. The result: an unhandled 500 error with no user-friendly message.

## The Fix (PR #9)

- Wrapped RAG retrieval in try/catch — AI continues with empty context on failure
- Wrapped health profile fetch in a second try/catch layer at each endpoint
- Applied to all 3 endpoints: `tutor.ts`, `actionPlan.ts`, `dailyProtocol.ts`
- AI now responds (without personalization/RAG context) rather than crashing

---

## Process Issues

### 1. Rapid Multi-Phase Merges Without Deploy Verification

8 phases were committed to `main` in ~4 hours (13:47–17:30). Each phase added collections, migrations, endpoints, and frontend code. No pause between phases to verify the Render deploy succeeded and existing features still worked.

**CLAUDE.md says**: "After 2 failed remote builds: STOP. Enter Debug Mode."
**What happened**: Phases kept deploying without verifying previous deploys were healthy.

### 2. Three Fix Attempts in 30 Minutes (Anti-Loop Violation)

The certificates multi-tenant scope issue produced 3 commits between 15:00–15:39:
- `Add missing tenant cert migration + tenant column`
- `Remove certs from multi-tenant plugin scope`
- `Re-add certificates to multi-tenant plugin scope`

**CLAUDE.md says**: "After 2 failures: Debug Mode — no exceptions, no 'one more try'."
**What happened**: A third attempt was made without entering Debug Mode.

### 3. No End-to-End Smoke Test After Deploy

After merging to `main` and Render deploying, there was no verification that existing features (AI tutor, search, etc.) still worked.

### 4. Missing Defensive Coding

The AI endpoints had no top-level error handling for the pipeline before streaming. Any failure crashed the entire request.

---

## Required CLAUDE.md Additions

### Add to "Global Execution Discipline" section:

```markdown
### Phase Deployment Rule
- Each major phase (new collections, migrations, endpoints) = separate merge to main
- After each merge: verify Render deploy succeeds AND existing features still work
- Do NOT start the next phase until the current deploy is confirmed healthy
- Use Render MCP `list_deploys` to verify deploy status is "live"
- Quick smoke test: hit `/api/health`, `/articles`, `/api/ai/tutor` (if AI is live)
```

### Strengthen the existing Anti-Loop Rule:

```markdown
### Anti-Loop Rule (strengthened)
- After 2 failures on the same issue: Debug Mode — mandatory
- After 3 commits touching the same file/feature in under 1 hour: STOP, read the full chain, write a diagnosis
- "One more quick fix" is never allowed after 2 failures — this rule has no exceptions
```

### Add to "PATHS Gotchas" section:

```markdown
29. **AI endpoints must gracefully degrade** — Every AI endpoint that calls `getHealthProfile()`, `retrieveRelevantChunks()`, or any collection that might not be migrated yet MUST wrap the call in try/catch with graceful fallback. The AI should still respond (without personalization/context) rather than crash.
30. **New collections break existing code** — When adding a new collection (e.g., HealthProfiles), search the codebase for any code that might reference it before the migration runs. Payload's Drizzle adapter throws during query building (not execution) for unknown columns, bypassing try/catch in the called function.
31. **Deploy verification is mandatory** — After any merge to main, verify via Render logs/deploy status that the deploy succeeded AND run a smoke test on key endpoints. Do NOT assume a successful build = successful runtime.
```

---

## Required Memory File Updates

### Create: `feedback_deploy_verification.md`

```markdown
---
name: Deploy verification after merge
description: Always verify Render deploy health and smoke test key features after merging to main
type: feedback
---

After every merge to main, verify:
1. Render deploy status is "live" (use `mcp__render__list_deploys`)
2. Hit `/api/health` — should return 200
3. Hit the homepage — should render without errors
4. If AI features were touched: hit `/api/ai/tutor` with a test request
5. Check Render app logs for any errors in the first 60 seconds after deploy

**Why:** Phase 6 (2026-03-26) added HealthProfiles + ActionPlans + DailyProtocols. The migrations were correct but the AI tutor crashed with "column health_profiles_id does not exist" for all users. A 30-second smoke test would have caught this immediately.

**How to apply:** After every `gh pr merge`, wait 2-3 minutes for Render deploy, then verify.
```

### Add to existing MEMORY.md:

```
- [Deploy verification](feedback_deploy_verification.md) — Always smoke test after merge to main; Phase 6 AI crash was caught by workbench instance
```

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| 13:47 | Phase 3 merged — HealthProfiles, ActionPlans, DailyProtocols added |
| 14:24 | Phase 4 merged — Frontend AI UIs |
| 14:46 | Phase 5 merged — Certificates |
| 15:00-15:39 | 3 certificate fix commits (anti-loop violation) |
| 15:31 | Phase 6 merged — Streaks, paywall, multi-tenant prep |
| 16:01-17:30 | Phases 7-11 merged |
| ~17:30 | AI Tutor broken in production (undetected) |
| ~18:00 | Workbench instance discovers error via screenshot + Render logs |
| ~18:10 | PR #9 merged — graceful degradation fix |

---

## Lessons Learned

1. **Defensive coding is non-negotiable for AI endpoints** — Every external dependency (RAG, health profiles, Redis) must have a fallback path
2. **Deploy verification prevents silent regressions** — A 30-second smoke test catches what CI cannot
3. **The Anti-Loop Rule exists for a reason** — 3 rapid-fire fixes on the same issue = high probability of introducing new problems
4. **Phase isolation prevents blast radius** — If Phase 3 had been verified before Phase 4 started, the health profile issue would have been caught immediately
