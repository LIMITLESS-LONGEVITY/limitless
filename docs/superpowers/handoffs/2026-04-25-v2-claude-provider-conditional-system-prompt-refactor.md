---
name: NanoClaw v2 — refactor claude.ts to Meridian-shaped conditional resolveSystemPrompt
status: HANDOFF (ready for execution)
authored-by: Director (CC session)
intended-recipient: Infra Architect (or Director hand-applied with CEO ratification)
authority: ACTIONS ALLOWED (Phase 0 SDK Compliance follow-up; small surgical change)
incident-arc: project_2026-04-25_meridian_diff_and_streaming_bug.md
created: 2026-04-25
priority: P1 (closes "Meridian-shaped but unconditional" quick-fix from 2026-04-25)
related-specs: 2026-04-25-sdk-contract-proxy-as-interop-layer.md (binding)
related-handoffs: 2026-04-25-nanoclaw-v2-phase-0-sdk-compliance-handoff.md (this is a slice of Phase 0)
applies-to: /home/limitless/nanoclaw-v2/container/agent-runner/src/providers/claude.ts on VPS-1
---

# Handoff: v2 ClaudeProvider — conditional `resolveSystemPrompt`

## Problem

The 2026-04-25 quick-fix to v2's `ClaudeProvider.query()` set:

```typescript
systemPrompt: instructions || undefined,
settingSources: [],
```

This unblocks shadow v2 (avoids the `claude_code` preset emitting
beta-gated cache fields like `cache_control.ephemeral.scope` and
`context_management`) but is "Meridian-shaped but unconditional".

Meridian's contract surface (`src/proxy/query.ts:157`) makes the preset
CONDITIONAL on operator opt-in, with sensible defaults. v2 should adopt
the same shape so future work that needs the preset (e.g., auto-memory,
settings loading) can opt in without re-introducing the cache-fields
problem on default code paths.

The binding spec for why this matters:
`docs/superpowers/specs/2026-04-25-sdk-contract-proxy-as-interop-layer.md`.

## Reference contract — Meridian's `resolveSystemPrompt`

From `/tmp/meridian-ref/src/proxy/query.ts:157` (clone of
`https://github.com/rynfar/meridian` — to be re-cloned by Architect if
local /tmp wiped):

```typescript
function resolveSystemPrompt(
  systemContext: string | undefined,
  passthrough: boolean,
  settingSources: SettingSource[] | undefined,
  codeSystemPrompt: boolean | undefined,
  clientSystemPrompt: boolean | undefined,
  cwdNote: string,
): { systemPrompt?: string | { type: "preset"; preset: "claude_code"; append?: string } } {
  const hasSettings = settingSources != null && settingSources.length > 0
  const usePreset = codeSystemPrompt ?? (hasSettings || (!passthrough && !!systemContext))
  const includeClient = clientSystemPrompt ?? true
  const clientContext = includeClient ? systemContext : undefined
  const append = [clientContext, cwdNote].filter(Boolean).join("") || undefined

  if (usePreset) {
    return append
      ? { systemPrompt: { type: "preset" as const, preset: "claude_code" as const, append } }
      : { systemPrompt: { type: "preset" as const, preset: "claude_code" as const } }
  }
  if (append) return { systemPrompt: append }
  return {}
}
```

Key insights:
1. **`usePreset` is the gating decision.** Defaults to "preset if settings
   are loaded OR (we're not in passthrough AND we have systemContext)".
   Operator can override via `codeSystemPrompt` flag.
2. **Three return shapes:** `{ preset + append }`, `{ preset alone }`,
   `{ string append }`, `{}`. Each path uses a different SDK code path.
3. **The `passthrough` knob** is Meridian-specific (proxy mode flag).
   v2 doesn't have passthrough mode — that argument simplifies to false
   in our adaptation.
4. **`clientSystemPrompt`** lets clients suppress their own systemContext
   from the SDK call. v2 doesn't have a separate client/server context
   distinction yet — argument simplifies away.
5. **`cwdNote`** is for proxy-as-network-relay use case where SDK
   subprocess CWD ≠ client CWD. v2 runs SDK in-container at the same
   CWD — argument simplifies to empty string.

## Adapted contract for v2

V2's surface is simpler than Meridian's. Adapted signature:

```typescript
type SettingSource = 'user' | 'project' | 'local';

interface ResolvedSystemPrompt {
  systemPrompt?: string | { type: 'preset'; preset: 'claude_code'; append?: string };
  settingSources?: SettingSource[];
}

/**
 * Resolve `systemPrompt` + `settingSources` SDK options from operator opt-in.
 *
 * Meridian-shaped: the `claude_code` preset is OPT-IN. The default
 * (no preset, empty settingSources) avoids the SDK emitting cacheable
 * system blocks with beta-gated fields like `cache_control.ephemeral.scope`
 * — which our OAuth-mode auth doesn't currently support.
 *
 * Per spec: docs/superpowers/specs/2026-04-25-sdk-contract-proxy-as-interop-layer.md
 *
 * Decision tree:
 *  - usePreset === true: emit `{ type: 'preset', preset: 'claude_code', append? }`
 *    + pass settingSources through. Use this when you NEED memory / settings
 *    loading / cacheable system blocks AND have validated the relevant betas
 *    are enabled for your auth mode.
 *  - usePreset === undefined (default): no preset. systemContext goes as
 *    plain string; settingSources stays explicit `[]`. Safe default for
 *    OAuth-mode subscriptions on current Anthropic API.
 *  - usePreset === false: same as default but explicit.
 */
function resolveSystemPrompt(
  systemContext: string | undefined,
  settingSources: SettingSource[] | undefined,
  usePreset: boolean | undefined,
): ResolvedSystemPrompt {
  const hasSettings = settingSources != null && settingSources.length > 0;
  const shouldUsePreset = usePreset ?? hasSettings;
  const append = systemContext || undefined;

  if (shouldUsePreset) {
    const result: ResolvedSystemPrompt = {
      systemPrompt: append
        ? { type: 'preset', preset: 'claude_code', append }
        : { type: 'preset', preset: 'claude_code' },
    };
    if (settingSources && settingSources.length > 0) {
      result.settingSources = settingSources;
    }
    return result;
  }

  if (append) {
    return { systemPrompt: append, settingSources: [] };
  }
  return { settingSources: [] };
}
```

## File-level change set

### Change 1 — extend `types.ts` `ProviderOptions`

**File:** `/home/limitless/nanoclaw-v2/container/agent-runner/src/providers/types.ts`

Append to `ProviderOptions`:

```typescript
/**
 * SDK setting sources to load (user/project/local). When non-empty,
 * implies the `claude_code` preset (via resolveSystemPrompt) unless
 * `usePreset` is set to false explicitly.
 *
 * Default `undefined`: no settings loaded; SDK takes minimal-default
 * code path. Matches Meridian's contract where settings are opt-in.
 */
settingSources?: Array<'user' | 'project' | 'local'>;

/**
 * Override for the `claude_code` preset decision. Default behavior:
 * preset is enabled when `settingSources` is non-empty. Set explicitly
 * when caller wants to force the preset without loading settings, or
 * disable the preset even when settings are loaded.
 */
usePreset?: boolean;
```

### Change 2 — refactor `claude.ts` `ClaudeProvider`

**File:** `/home/limitless/nanoclaw-v2/container/agent-runner/src/providers/claude.ts`

#### 2a — add the `resolveSystemPrompt` helper

Add at module scope (after the existing helper functions, before `ClaudeProvider` class):

```typescript
type SettingSource = 'user' | 'project' | 'local';

interface ResolvedSystemPrompt {
  systemPrompt?: string | { type: 'preset'; preset: 'claude_code'; append?: string };
  settingSources?: SettingSource[];
}

/**
 * Meridian-shaped resolver — see docs/superpowers/specs/
 * 2026-04-25-sdk-contract-proxy-as-interop-layer.md for the contract this
 * implements. Default code path avoids the `claude_code` preset (which
 * emits cacheable system blocks with beta-gated fields).
 */
function resolveSystemPrompt(
  systemContext: string | undefined,
  settingSources: SettingSource[] | undefined,
  usePreset: boolean | undefined,
): ResolvedSystemPrompt {
  const hasSettings = settingSources != null && settingSources.length > 0;
  const shouldUsePreset = usePreset ?? hasSettings;
  const append = systemContext || undefined;

  if (shouldUsePreset) {
    const result: ResolvedSystemPrompt = {
      systemPrompt: append
        ? { type: 'preset', preset: 'claude_code', append }
        : { type: 'preset', preset: 'claude_code' },
    };
    if (settingSources && settingSources.length > 0) {
      result.settingSources = settingSources;
    }
    return result;
  }

  if (append) {
    return { systemPrompt: append, settingSources: [] };
  }
  return { settingSources: [] };
}
```

#### 2b — update `ClaudeProvider` constructor + query

Constructor — add fields:

```typescript
private settingSources?: SettingSource[];
private usePreset?: boolean;

constructor(options: ProviderOptions = {}) {
  this.assistantName = options.assistantName;
  this.mcpServers = options.mcpServers ?? {};
  this.additionalDirectories = options.additionalDirectories;
  this.settingSources = options.settingSources;
  this.usePreset = options.usePreset;
  this.env = {
    ...(options.env ?? {}),
    CLAUDE_CODE_AUTO_COMPACT_WINDOW,
  };
}
```

Query method — replace the unconditional `systemPrompt` + `settingSources` lines:

**Before:**
```typescript
const sdkResult = sdkQuery({
  prompt: stream,
  options: {
    cwd: input.cwd,
    additionalDirectories: this.additionalDirectories,
    resume: input.continuation,
    pathToClaudeCodeExecutable: '/pnpm/claude',
    systemPrompt: instructions || undefined,
    allowedTools: TOOL_ALLOWLIST,
    disallowedTools: SDK_DISALLOWED_TOOLS,
    env: this.env,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    settingSources: [],
    mcpServers: this.mcpServers,
    hooks: { /* ... */ },
  },
});
```

**After:**
```typescript
const resolved = resolveSystemPrompt(instructions, this.settingSources, this.usePreset);

const sdkResult = sdkQuery({
  prompt: stream,
  options: {
    cwd: input.cwd,
    additionalDirectories: this.additionalDirectories,
    resume: input.continuation,
    pathToClaudeCodeExecutable: '/pnpm/claude',
    ...resolved,
    allowedTools: TOOL_ALLOWLIST,
    disallowedTools: SDK_DISALLOWED_TOOLS,
    env: this.env,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    mcpServers: this.mcpServers,
    hooks: { /* ... unchanged ... */ },
  },
});
```

The spread `...resolved` injects `systemPrompt` (when present) and
`settingSources` (when present). Note: `settingSources` MUST be removed
from its old position to avoid double-keys / unintended overrides.

### Change 3 — call sites

ClaudeProvider is registered via:

```typescript
registerProvider('claude', (opts) => new ClaudeProvider(opts));
```

Existing call sites pass the v2 default ProviderOptions (no settings, no
preset opt-in). Behavior is unchanged for default callers. Call sites
that NEED the preset (none in current v2 codebase) opt in explicitly:

```typescript
new ClaudeProvider({ ...baseOpts, usePreset: true, settingSources: ['project', 'user'] });
```

No call-site changes needed for this PR. Audit:

```bash
grep -rn 'ClaudeProvider\|registerProvider.*claude' /home/limitless/nanoclaw-v2/
```

If any caller assumed the unconditional `systemPrompt` shape, this audit
catches it.

## Verification

### Pre-merge

1. **Typecheck:** `cd /home/limitless/nanoclaw-v2/container/agent-runner && pnpm run typecheck`
2. **Build:** `pnpm run build` (in agent-runner) + image rebuild for the
   container (`/home/limitless/nanoclaw-v2/scripts/build-container.sh`
   or equivalent — verify exact path on VPS-1)
3. **Default-path round-trip** on shadow v2:
   - Short prompt: ~3 sec, completes
   - Medium prompt: ~10 sec, completes
   - Verify no `cache_control.ephemeral.scope` 400 from Anthropic
4. **Preset-path round-trip** (opt-in test):
   - Configure a test agent-runner instance with
     `usePreset: true, settingSources: ['project']`
   - Confirm the SDK call constructs the preset shape (visible in
     OneCLI MITM logs as `systemPrompt: { type: 'preset', ... }`)
   - **Expected to fail with 400 today** (since preset re-emits
     cache_control.scope) — that's correct, opt-in is gated on enabling
     `prompt-caching-scope-2026-01-05` beta and validating in the
     Phase 0 compatibility matrix.

The default path passing + preset path failing-as-expected confirms the
refactor is semantically correct (gates the cache fields behind
operator opt-in) and that no caller is silently broken.

### Post-merge

- Shadow v2 service restart confirms hot-path stability
- 5-test functional matrix from the streaming-bug fallback plan
  (`2026-04-25-v2-streaming-bug-onecli-fallback-patch.md`) re-runs
  cleanly with the conditional config

## PR shape

**Branch:** `refactor/v2-claude-provider-conditional-system-prompt`

**Title:** `refactor(nanoclaw-v2): Meridian-shaped conditional resolveSystemPrompt in ClaudeProvider`

**Body:**

```
## Problem
2026-04-25 quick-fix set systemPrompt + settingSources unconditionally
to avoid the SDK's claude_code preset emitting beta-gated cache fields.
Meridian-shaped but unconditional — closes the quick-fix into a proper
contract surface.

## Change
1. Extend ProviderOptions with `settingSources?` and `usePreset?` opt-ins
2. Add Meridian-shaped `resolveSystemPrompt` helper
3. Refactor `ClaudeProvider.query` to use the helper

## Default behavior
Unchanged — no preset, no settings. Safe for OAuth-mode subscriptions on
current Anthropic API.

## Opt-in path
Future callers needing memory / settings loading set
`usePreset: true, settingSources: [...]` on construction. Gated on
the Phase 0 compatibility matrix validating the relevant betas for
our auth mode.

## Spec
docs/superpowers/specs/2026-04-25-sdk-contract-proxy-as-interop-layer.md

## §5.5 attestation
Pre-merge: typecheck clean, build clean, default-path 3-test round-trip
on shadow v2 (short, medium, tool-use) passes, preset-path round-trip
fails-as-expected confirming gating semantics.
Post-merge: 5-test functional matrix re-runs clean.

## Related
- Topic: project_2026-04-25_meridian_diff_and_streaming_bug.md
- Phase 0 handoff: 2026-04-25-nanoclaw-v2-phase-0-sdk-compliance-handoff.md
- Streaming-bug plan: 2026-04-25-v2-streaming-bug-onecli-fallback-patch.md
```

## Risks + mitigation

| Risk | Mitigation |
|---|---|
| TypeScript SDK option types changed between v2's pinned 0.2.119 and Meridian's reference version | Empirical: typecheck must pass post-edit. SDK type def confirms `settingSources?: SettingSource[]` and `systemPrompt?: string | { type: 'preset'; preset: 'claude_code'; append?: string }` are the current shape on 0.2.119. |
| Spread order matters — `...resolved` spread MUST NOT be overridden by later keys | Code review checks no `systemPrompt` or `settingSources` keys exist after the spread |
| Caller using `usePreset: true` re-introduces cache_control.scope 400 | Documented as expected behavior. Opt-in is gated on Phase 0 compatibility matrix. Default path stays safe. |
| `claude_code` preset has additional behaviors beyond cache field emission (auto-memory, etc.) — opt-in callers must understand | Inline JSDoc on `usePreset` + `settingSources` documents the trade-off |

## Out of scope

- Validating which betas enable cache_control.scope for OAuth auth.
  That's Phase 0 Deliverable 0.1-0.2 work (SDK Compliance Brief +
  Compatibility Matrix). This refactor produces the contract surface;
  Phase 0 produces the operational knowledge.
- Adding analogous helpers for other providers (codex, mock). v2's
  ClaudeProvider is the only one currently emitting the problematic
  fields.
- Changing the `passthrough` semantics. v2 doesn't have a passthrough
  mode; if/when one is added, the helper signature gains `passthrough`
  arg as Meridian's does.

## Definition of done

- [ ] Patch applied to v2 `types.ts` + `claude.ts` on a feature branch
- [ ] `pnpm run typecheck` clean in agent-runner
- [ ] `pnpm run build` clean
- [ ] Container image rebuild succeeds
- [ ] Default-path 3-test round-trip on shadow v2 passes
- [ ] Preset-path opt-in test fails-as-expected (confirms gating)
- [ ] PR opened, §5.5 attestation in body, formal Approving Review per
      ruleset 15502000, squash-merge
- [ ] Topic file `project_2026-04-25_meridian_diff_and_streaming_bug.md`
      updated to mark "Meridian-shaped but unconditional" as RESOLVED

## Suggested executor

Infra Architect — same scope as Phase 0 SDK Compliance, intimate v2
codebase knowledge, owns shadow v2 install on VPS-1. Dispatch via
#infra-eng once Architect fleet is operational under either Phase 0
SDK compliance OR the streaming-bug fallback patch (whichever
restores Architects first).

If hand-applied by Director with CEO ratification: scope is small +
surgical, test surface is clear, risk is low. Acceptable interim path
if fleet stays down longer than ~24 hours.
