---
name: NanoClaw v2 — OneCLI fallback patch for streaming bug
status: PLAN (ready for execution)
authored-by: Director (CC session)
incident-arc: project_2026-04-25_meridian_diff_and_streaming_bug.md
created: 2026-04-25
priority: P1 (unblocks shadow v2 long-running tasks; required for Phase 0 testing)
applies-to: /home/limitless/nanoclaw-v2/src/container-runner.ts on VPS-1
related-specs: 2026-04-25-sdk-contract-proxy-as-interop-layer.md
---

# Plan: v2 streaming-bug fallback patch — bypass OneCLI MITM via direct OAuth env

## Problem

OneCLI gateway 1.18.2 disconnects ~3 seconds into streaming SSE responses
from `api.anthropic.com`. Logs show:

```
MITM method=POST /v1/messages?beta=true status=200 content_type=text/event-stream
WARN connection error host=api.anthropic.com:443 error=serving MITM connection
```

Affects BOTH prod 1.2.53 fleet (fork code) AND shadow v2 (fresh upstream)
because they share the same OneCLI gateway. Independent of the
cache_control fix landed today (see
`2026-04-25-sdk-contract-proxy-as-interop-layer.md`). Short responses
(<3 sec) succeed; longer responses die mid-stream.

This patch UNBLOCKS shadow v2 testing without waiting for OneCLI to fix
its streaming proxy. Prod 1.2.53 stays on OneCLI for now (changing prod
is governance-gated and not required for Phase 0).

## Strategy

Mirror prod 1.2.53's existing fallback pattern. Prod already supports
direct `CLAUDE_CODE_OAUTH_TOKEN` injection when `ONECLI_URL` is unset
(lines 385-417 of `apps/nanoclaw/src/container-runner.ts`). v2's
`src/container-runner.ts:443` calls `onecli.applyContainerConfig`
unconditionally. Bring v2 into shape with prod by adding the same
`ONECLI_URL`-guarded branch.

Add ONE additional refinement on top of prod's pattern: if
`onecli.applyContainerConfig` returns `false` (configured but failed —
e.g., agent not registered, gateway unreachable), ALSO fall back to
direct injection. This widens the bypass surface for shadow-v2-as-test,
which we want maximally robust.

## Patch shape

**File:** `/home/limitless/nanoclaw-v2/src/container-runner.ts`

**Around line 437-453** (the OneCLI gateway block).

### Current (problematic) code

```typescript
// OneCLI gateway — injects HTTPS_PROXY + certs so container API calls
// are routed through the agent vault for credential injection.
try {
  if (agentIdentifier) {
    await onecli.ensureAgent({ name: agentGroup.name, identifier: agentIdentifier });
  }
  const onecliApplied = await onecli.applyContainerConfig(args, { addHostMapping: false, agent: agentIdentifier });
  if (onecliApplied) {
    log.info('OneCLI gateway applied', { containerName });
  } else {
    log.warn('OneCLI gateway not applied — container will have no credentials', { containerName });
  }
} catch (err) {
  log.warn('OneCLI gateway error — container will have no credentials', { containerName, err });
}
```

### Proposed code

```typescript
// OneCLI gateway — injects HTTPS_PROXY + certs so container API calls
// are routed through the agent vault for credential injection.
//
// Fallback ladder when OneCLI is unset, fails to apply, or throws:
// inject CLAUDE_CODE_OAUTH_TOKEN directly via -e. Token is visible in
// `docker inspect` on the host; acceptable for a single-operator VPS.
// Mirrors prod 1.2.53's fallback at apps/nanoclaw/src/container-runner.ts:401.
let onecliApplied = false;
if (ONECLI_URL) {
  try {
    if (agentIdentifier) {
      await onecli.ensureAgent({ name: agentGroup.name, identifier: agentIdentifier });
    }
    onecliApplied = await onecli.applyContainerConfig(args, { addHostMapping: false, agent: agentIdentifier });
    if (onecliApplied) {
      log.info('OneCLI gateway applied', { containerName });
    }
  } catch (err) {
    log.warn('OneCLI gateway error — falling back to direct OAuth', { containerName, err });
  }
}
if (!onecliApplied) {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    args.push('-e', `CLAUDE_CODE_OAUTH_TOKEN=${process.env.CLAUDE_CODE_OAUTH_TOKEN}`);
    log.info('OneCLI bypassed — CLAUDE_CODE_OAUTH_TOKEN injected directly', { containerName });
  } else {
    log.warn('No OneCLI and no CLAUDE_CODE_OAUTH_TOKEN — container will have no Anthropic credentials', { containerName });
  }
}
```

**Net delta:** ~12 added lines, ~2 removed lines. Effective net ~10 lines
of new code. (Earlier "5 line" estimate from the topic file was
optimistic — accurate count after looking at the actual surrounding
code is ~10.)

## Behavior matrix after patch

| `ONECLI_URL` set? | OneCLI applies? | `CLAUDE_CODE_OAUTH_TOKEN` set? | Outcome |
|---|---|---|---|
| Yes | Yes | irrelevant | OneCLI mode (current behavior, unchanged) |
| Yes | No (returned false / threw) | Yes | Direct OAuth injection (NEW) |
| Yes | No | No | Warning, no creds (degraded — same as today) |
| No | n/a | Yes | Direct OAuth injection (NEW) |
| No | n/a | No | Warning, no creds (degraded — same as today) |

The first row is the only one operators will see in normal operation
once this patch lands AND OneCLI's streaming bug is fixed upstream. The
second + fourth rows are the bypass paths for shadow v2.

## Activating bypass mode for shadow v2

Two operator switches activate the bypass path:

**Option A (preferred for testing) — unset `ONECLI_URL` in shadow v2 env:**

```bash
# On VPS-1, edit /home/limitless/nanoclaw-v2/.env
# Comment out: ONECLI_URL=https://...
# Add: CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...
# Restart shadow v2
```

This gives a clean experiment: shadow v2 talks directly to Anthropic;
prod's OneCLI is untouched.

**Option B (less invasive) — keep `ONECLI_URL` set, accept the fallback
when OneCLI fails:**

After the patch lands, OneCLI's existing 3-sec streaming death will
trigger an async error mid-request. The fallback only fires for NEW
container spawns, not in-flight requests, so this option doesn't fully
fix streaming for shadow v2. **Don't pick Option B for streaming tests
— pick Option A.**

## Verification approach

### Pre-merge (local / dev container)

1. Build the patched container-runner: `pnpm run build` in
   `/home/limitless/nanoclaw-v2/`
2. Run `pnpm run typecheck` — must pass
3. Verify no other call sites assume OneCLI always applies (search:
   `grep -n "onecliApplied" src/`)

### Post-merge functional test on shadow v2

Set up Option A (unset `ONECLI_URL`, set `CLAUDE_CODE_OAUTH_TOKEN`).
Restart shadow v2. Run three increasingly long tests:

| Test | Prompt | Expected outcome (post-fix) |
|---|---|---|
| Short | "what's 2+2?" | ~3 sec response, completes (already works on shadow v2 today) |
| Medium | "explain Anthropic prompt caching" | ~10-15 sec response, completes (FAILS today due to streaming death) |
| Long | "write 3-paragraph technical brief on SDK contract enforcement" | ~30 sec response, completes (FAILS today) |
| Tool use | "read package.json and summarize" | Tool call + response, completes |
| Multi-turn | 3-message conversation with context | All three turns complete |

Definition of done: All 5 tests succeed. Container exits with code 0
(not 137).

### Post-merge regression check on prod 1.2.53

The patch lives only in v2's repo path
(`/home/limitless/nanoclaw-v2/`), so prod 1.2.53 fork is unaffected by
default. Sanity check after deploy:

- Prod NanoClaw service still active: `systemctl status nanoclaw`
- Spawn a fresh Architect via the standard Discord dispatch path
- Confirm the Architect container shows `OneCLI gateway applied` in
  logs (not the new `OneCLI bypassed` message — prod stays on OneCLI)

### Test environment (when env-pipeline lands)

This patch should also land in Test environment as part of the
multi-env pipeline rollout (see
`2026-04-25-multi-environment-architect-pipeline.md`). Test env will
exercise the full path automatically on each Architect dispatch and
catch any future regressions.

## PR shape

**Branch:** `fix/v2-onecli-fallback-streaming-bypass`

**Title:** `fix(nanoclaw-v2): direct OAuth fallback when OneCLI unset or fails`

**Description outline:**

```
## Problem
OneCLI 1.18.2 has a streaming-disconnect bug at ~3 sec on SSE responses
from api.anthropic.com. Affects shadow v2 testing.

## Fix
Mirror prod 1.2.53's existing fallback pattern in v2's
container-runner.ts: when ONECLI_URL is unset OR onecli.applyContainerConfig
returns false / throws, inject CLAUDE_CODE_OAUTH_TOKEN directly to
container env via -e.

## Scope
- v2 only. Prod 1.2.53 fork already has this fallback (lines 401-417 of
  apps/nanoclaw/src/container-runner.ts).
- Bypass mode is opt-in: set CLAUDE_CODE_OAUTH_TOKEN + unset ONECLI_URL.
- Default behavior with ONECLI_URL set: unchanged (still uses OneCLI).

## Verification
- 5-test functional matrix on shadow v2 (short, medium, long, tool use,
  multi-turn) — all must complete without code 137 / streaming death.
- Prod 1.2.53 sanity check — Architect spawn still uses OneCLI mode.

## Related
- Spec: 2026-04-25-sdk-contract-proxy-as-interop-layer.md
- Incident: project_2026-04-25_meridian_diff_and_streaming_bug.md
- Phase 0: 2026-04-25-nanoclaw-v2-phase-0-sdk-compliance-handoff.md

## §5.5 attestation
Manual verification of the 5-test functional matrix on shadow v2 with
CLAUDE_CODE_OAUTH_TOKEN injected and ONECLI_URL unset. CLI socket at
/home/limitless/nanoclaw-v2/data/cli.sock. Test commands: `pnpm run
chat 'message'`. Container exit codes captured.
```

## Risks + mitigation

| Risk | Mitigation |
|---|---|
| Token visible in `docker inspect` host-side | Acceptable on VPS-1 (single-operator); documented in fallback log line. Out of scope for this patch — the token-via-env trade-off is explicitly accepted by prod 1.2.53 already. |
| Operator forgets to set `CLAUDE_CODE_OAUTH_TOKEN` and shadow v2 silently has no creds | The new warning log message is explicit. Phase 0 functional test catches this on first dispatch. |
| Shadow v2 runs both modes simultaneously (OneCLI + direct env) | Code is mutually exclusive: direct injection only fires when OneCLI didn't apply. Tested via behavior matrix above. |
| OneCLI streaming bug gets fixed upstream and we forget to re-enable OneCLI mode for shadow v2 | Re-enabling = setting `ONECLI_URL` back. Document in shadow v2 README + tag in handoff for next-session checklist. |
| Patch doesn't address the streaming bug for prod | Out of scope. Prod has a separate OneCLI streaming-death issue but only on long requests, and prod doesn't run long requests through Architect proactive checks (those are <3 sec each). Long-form Architect dispatches today are the missing capability — this patch restores it for shadow v2 only. |

## Out of scope

- Fixing OneCLI's streaming proxy itself. That's an OneCLI-source-code
  investigation in Rust at `https://github.com/onecli/onecli/apps/gateway`.
  Open-ended; deferred until the SDK Compliance Phase 0 deliverables
  prove shadow v2 actually does what we need without OneCLI.
- Changing prod 1.2.53 to bypass OneCLI. Prod's fork has its own fallback
  but defaults to OneCLI mode for credential vault auditability. Not
  changing that without separate governance review.
- Adding `ANTHROPIC_API_KEY` as a third fallback credential type. The
  consumer OAuth (`sk-ant-oat01-`) is what's in use; API-key swap is a
  Phase 1+ decision (per Phase 0 SDK Compliance handoff §"Anthropic
  credentials").

## Definition of done

- [ ] Patch applied to v2 `src/container-runner.ts` on a feature branch
- [ ] `pnpm run build` clean, `pnpm run typecheck` clean
- [ ] 5-test functional matrix passes on shadow v2 with bypass mode
- [ ] Prod 1.2.53 sanity check: Architect spawn still logs OneCLI applied
- [ ] PR opened, §5.5 attestation in body, formal Approving Review per
      ruleset 15502000, squash-merge
- [ ] Shadow v2 README updated with bypass mode operator notes
- [ ] Topic file `project_2026-04-25_meridian_diff_and_streaming_bug.md`
      updated to mark "streaming bug fix" as RESOLVED for shadow v2

## Suggested executor

Infra Architect (intimate codebase knowledge, owner of v2 install on
VPS-1). Dispatch via #infra-eng once Architect fleet is operational
under Phase 0 SDK compliance — until then, this patch can be hand-applied
by Director with CEO ratification, since the change is small and
surgical and the verification matrix is explicit.
