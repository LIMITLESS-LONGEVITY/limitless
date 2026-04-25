---
name: SDK Contract — Proxy as Interop Layer (not Header Injection Layer)
status: SPEC
authored-by: Director (CC session)
ratified-by: pending CEO
originated-from: docs/superpowers/proposals/2026-04-25-cache-control-scope-investigation-handoff.md
incident-arc: project_2026-04-25_meridian_diff_and_streaming_bug.md
created: 2026-04-25
priority: P0 (binding rule for all proxy/gateway code that sits between claude-agent-sdk and api.anthropic.com)
related-DRs: pending — proposed as DR-NNN once ratified
applies-to: OneCLI gateway configuration, NanoClaw container-runner, agent-runner provider modules, any future MITM/proxy/gateway between SDK and Anthropic
---

# SDK Contract — Proxy as Interop Layer (not Header Injection Layer)

## Origin

The 2026-04-25 fleet incident (~24 hours of debug + recovery) traced to a
single architectural mistake: a generic `anthropic-beta` header injected at
the OneCLI proxy layer was overriding the coherent header constructed by
`@anthropic-ai/claude-agent-sdk`. The SDK's request body and the proxy's
header disagreed, and Anthropic strict-schema-rejected the body fields the
SDK had assumed enabled.

The fix was the deletion of one secret. The lesson is general enough to
deserve a binding rule: **a proxy that injects HTTP headers that the SDK
also computes will always eventually break, because the SDK's body and the
proxy's header are independent computations that drift over time.**

## The contract

Source-grounded against OneCLI as it exists at
`https://github.com/onecli/onecli` (clone inspected 2026-04-25).
Citations are file paths in that repo.

| Layer | Owns |
|---|---|
| `claude-agent-sdk` (callee) | Request body shape, `anthropic-beta` header, prompt-cache fields, retry semantics, SSE consumption. Constructs `Authorization: Bearer <token>` when given an OAuth token directly (e.g., via `CLAUDE_CODE_OAUTH_TOKEN` env). |
| OneCLI gateway (interop layer) | (1) Per-agent-token + per-host CONNECT policy via `PolicyEngine` (`apps/gateway/src/connect.rs:120-129`). (2) Static credential injection — for `api.anthropic.com`, sets `x-api-key: <password>` AND removes `authorization`; for all other hosts, sets `Authorization: Bearer <password>` (`apps/gateway/src/inject.rs:154-170`). (3) Generic configurable header injection via `generic`-typed secrets — operator-defined `headerName` + `valueFormat`. **This is the trap that broke us 2026-04-25.** (4) In-memory metadata cache for CONNECT resolution + injection rules (`apps/gateway/src/cache.rs`). (5) MITM TLS interception. |
| Anthropic API (server) | Schema validation, billing, model selection, response generation |

What OneCLI does NOT own (verified by source inspection):

- **OAuth flows / token refresh / JWT awareness.** OneCLI's
  `vault_credential_to_rules` (`apps/gateway/src/inject.rs:143-170`) is
  pure static-header replacement from a stored password. No OAuth code
  path exists in the gateway.
- **Response-body caching.** The cache (`cache.rs`) caches CONNECT
  resolution + injection rules only. No HTTP response bodies are
  cached or replayed.
- **`anthropic-beta` as a first-class concept.** Grep across
  `apps/gateway/`, `apps/web/`, and docs returns zero matches for any
  variant of `anthropic-beta` / `anthropic_beta`. OneCLI has no
  built-in handling. Any `anthropic-beta` injection MUST be
  operator-configured via a `generic` secret — and that path is the
  bug surface this spec exists to forbid.
- **Org-level allow/deny lists.** Policy is per-agent-token + per-host
  pattern, not org-wide. Per-agent scoping is the only allowlist
  surface OneCLI exposes.

The SDK and the API are direct counterparties. They communicate over a
versioned wire format that the SDK author and the API team co-evolve. A
proxy that *modifies* that wire format puts itself in the middle of a
contract it has no signing authority on. **The OneCLI feature that
broke us was `generic`-typed secrets used as a generic header injector
for an SDK-owned header — operator misuse of a legitimate primitive,
not a OneCLI bug.** The rule generalizes beyond OneCLI: don't use ANY
proxy's generic-header-injection feature to inject SDK-owned headers.

## The binding rule

**DO NOT inject `anthropic-beta` at a proxy / gateway layer.**

If the SDK constructs an outbound `anthropic-beta` header, the proxy must
forward it as-is, OR strip it (with documented reason — see Meridian's
billing-protection pattern), OR pass an SDK-API option upstream that asks
the SDK to add a beta. The proxy must not OVERRIDE the SDK's value with a
proxy-author-chosen string.

### Failure mode (forensic record from 2026-04-25)

OneCLI was configured with a generic-type secret named `Anthropic Beta Header`
that injected:

```
anthropic-beta: oauth-2025-04-20,extended-cache-ttl-2025-04-11,prompt-caching-2024-07-31
```

This secret was added at v1 setup time when SDK 0.2.76 emitted body fields
that aligned with that header set. The injection mode was **replace**, not
**merge** — OneCLI overwrote whatever the SDK had constructed.

When `claude-agent-sdk` 0.2.116+ added `cache_control.ephemeral.scope` to
the request body, the SDK simultaneously bumped its outbound
`anthropic-beta` header to include `prompt-caching-scope-2026-01-05` (the
gating beta for that field). The proxy's static-string injection
**discarded** the SDK's coherent header and wrote the stale 3-beta string.

Anthropic's API enforces strict schema validation against whatever
`anthropic-beta` value it actually received. With the proxy's stale header,
`scope` was an unknown field → 400 rejection:

```
system.2.cache_control.ephemeral.scope: Extra inputs are not permitted
```

Whac-a-mole on the body fields couldn't fix this because each field
addition would require yet another beta in the static injection string,
forever lagging the SDK by one release cycle. The *only* fix is to stop
injecting at the proxy and let the SDK's header through.

## Reference implementation: Meridian

`https://github.com/rynfar/meridian` is an unofficial proxy with the same
architecture as our setup (Anthropic-compatible client → proxy → Claude
subscription OAuth). It demonstrates the contract.

### Header handling — `src/proxy/betas.ts`

Meridian explicitly does NOT inject. It only **filters** — and only with a
documented reason (Max-tier billing protection):

- `allow-safe` (default): forward all betas EXCEPT `extended-cache-ttl-*`
  prefixes (which trigger Max-tier Extra-Usage billing)
- `strip-all`: drop every beta (kill switch for emergencies)
- `allow-all`: forward all betas unmodified (matches API-key profile)

The default policy preserves the SDK's intent. Operators can opt into
stricter filtering via `MERIDIAN_BETA_POLICY` env var — never via static
injection.

### Beta passing into the SDK — `src/proxy/query.ts`

When Meridian *does* want a beta enabled, it passes the `betas` array as an
SDK option:

```typescript
...(betas && betas.length > 0 ? { betas: betas as SdkBeta[] } : {}),
```

The SDK then synthesizes the outbound `anthropic-beta` header coherent
with the body it emits. This is the only correct way for an upstream layer
to influence the beta set.

### System prompt — `src/proxy/query.ts:157` (`resolveSystemPrompt`)

Meridian also avoids assumption-based defaults on the SDK's other coherent
surfaces. `resolveSystemPrompt` makes the `claude_code` preset CONDITIONAL
on whether the operator opted in:

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
  // ...
  if (usePreset) {
    return append
      ? { systemPrompt: { type: "preset" as const, preset: "claude_code" as const, append } }
      : { systemPrompt: { type: "preset" as const, preset: "claude_code" as const } }
  }
  if (append) return { systemPrompt: append }
  return {}
}
```

The contract is: **the preset (which causes the SDK to emit cacheable
system blocks with version-specific fields) is opt-in**. If you don't
explicitly want the preset behavior, pass `systemPrompt` as a string and
the SDK takes a minimal-default code path that doesn't emit those fields.

This is the correct shape. NanoClaw v2's quick-fix on 2026-04-25
(`systemPrompt: instructions || undefined` + `settingSources: []`) is
*Meridian-shaped but unconditional* — compliant for the immediate case
but architecturally weaker. See spec deliverable on
`apply-meridian-aligned-config-cleanly` (queued).

## Consequences for the LIMITLESS deployment

### MUST (binding)

1. **No `anthropic-beta` injection at OneCLI** for the Anthropic-bound agent.
   The `Anthropic Beta Header` generic secret (id
   `84bc6286-52b1-4053-b5fa-0f50826ad5c4`) was deleted on 2026-04-25 and
   must not be re-added. If a future need to enable a specific beta
   appears, route it through the SDK option in agent-runner code, not
   through proxy injection.

2. **OneCLI's role is credential injection only** for Anthropic. Its
   anthropic-typed secret (id `18646778-e05f-4825-a615-e88893428338`) is
   the canonical bearer-token source. Anything beyond bearer-injection +
   SSL routing belongs in agent-runner code.

3. **Beta enablement happens via SDK API**, not headers. When NanoClaw
   wants a beta enabled (e.g., `prompt-caching-scope-2026-01-05` after
   we've validated it works for our auth mode), agent-runner passes
   `betas: [...]` to `query()`. This requires per-version compatibility
   testing because the SDK may not yet expose new betas as recognized
   options — see compatibility-matrix work in the Phase 0 SDK Compliance
   handoff.

4. **`systemPrompt` shape is conditional**, not preset-by-default. Same
   contract surface as Meridian's `resolveSystemPrompt`. Opt-in to the
   `claude_code` preset only when the agent NEEDS the cacheable
   system-context features (auto-memory, settings loading). The current
   v2 code treats unconditional `string || undefined` as a workaround;
   Phase 0 deliverable refactors it.

5. **`settingSources` is conditional**, not unconditionally `[]`. Default
   `undefined` (SDK default) when the agent doesn't need settings;
   explicit `['project', 'user']` when it does. The Phase 0 refactor
   makes this an opt-in contract.

### SHOULD

1. **Mirror Meridian's `MERIDIAN_BETA_POLICY` pattern at OneCLI** when
   forwarding (not injecting): operator-tunable filter for billable
   betas, default-safe with documented allow-all override. Out of scope
   for this spec; queued for Infra Architect when OneCLI gains a forward
   path.

2. **Static-version pin OneCLI** to a release matrix tested against our
   SDK + Anthropic-API combination. Drifts in any of the three
   participants must be caught by the multi-environment Architect
   pipeline (`docs/superpowers/proposals/2026-04-25-multi-environment-architect-pipeline.md`)
   before reaching prod.

### MAY

1. Forward incoming `anthropic-beta` headers from the SDK with org-policy
   filtering applied (Meridian's `filterBetasForProfile`-equivalent) once
   we add a forward path. Filtering with documented reason (e.g., "do
   not enable extended-cache-ttl on Max accounts because it triggers
   Extra-Usage billing") is acceptable. Filtering as
   "operator-thinks-they-know-better-than-the-SDK" is not.

## Detection / regression prevention

A repeat of this incident is structurally guaranteed in a single-environment
system where header-injection secrets accumulate over time without
validation against current SDK versions. Two complementary mitigations:

### Code-level

`apps/nanoclaw/src/setup-onecli-secrets.ts` (or equivalent setup script)
must NOT contain a step that creates a generic-type `anthropic-beta` secret.
A test (Phase 0 deliverable, `nanoclaw-v2/scripts/sdk-compat-probe.ts` or
similar) verifies that an outbound request from a smoke-test container
reaches `api.anthropic.com` with the SDK-constructed header intact (no
proxy override).

### Environment-level

The multi-environment Architect pipeline (Dev → Test → Staging → Prod)
catches header-injection regressions in Test before they reach Prod. A
Test-environment OneCLI configured identically to Prod runs the smoke
test on every Architect dispatch, surfacing schema-validation 400s as
build failures.

### Documentation-level

This spec is the canonical reference. CLAUDE.md fragments for any
agent-runner or OneCLI-touching Architect must link to it.

## Open questions (for next-spec or DR ratification)

1. **OneCLI as a beta forwarder**: when (if ever) does OneCLI gain a path
   that allows it to forward incoming SDK headers with an `allow-safe`
   filter? Currently OneCLI is configured via secrets-as-static-headers
   only; a forwarder mode would require OneCLI feature work.

2. **Pinning OneCLI version per env**: should each environment lock to a
   tested OneCLI version, with upgrade rehearsal in Test before Staging
   before Prod? See env-pipeline proposal §"Dependency upgrades follow
   the same path".

3. **Director / OpenClaw analog**: OpenClaw similarly proxies between
   `openai-codex` (gpt-5.5) and ChatGPT subscription OAuth. Does the
   same contract apply there? Likely yes — but ratification scoped to
   Anthropic-side first; OpenClaw analog deferred.

4. **DR-NNN promotion**: this spec's binding rules deserve a DR record
   for governance ratification (CEO + CODEOWNER review). Promote on
   first ratification cycle.

## References

- Incident topic file: `project_2026-04-25_meridian_diff_and_streaming_bug.md`
  (CEO+Director session memory)
- Investigation handoff: `docs/superpowers/proposals/2026-04-25-cache-control-scope-investigation-handoff.md`
  (analysis-only research dispatched to Architects)
- Phase 0 SDK Compliance handoff:
  `docs/superpowers/proposals/2026-04-25-nanoclaw-v2-phase-0-sdk-compliance-handoff.md`
  (executor-grade plan that consumes this spec as a binding constraint)
- Multi-environment pipeline:
  `docs/superpowers/proposals/2026-04-25-multi-environment-architect-pipeline.md`
  (the structural defense-in-depth)
- Meridian `src/proxy/betas.ts` (filter, don't inject)
- Meridian `src/proxy/query.ts:157` (`resolveSystemPrompt` — conditional preset)
- Meridian `src/proxy/query.ts:235` (passes `betas` as SDK option)
- Anthropic prompt-caching docs: https://docs.anthropic.com/api/prompt-caching
- claude-agent-sdk on npm: https://registry.npmjs.org/@anthropic-ai/claude-agent-sdk

## Definition of done (for ratification)

- [ ] Spec reviewed by Infra Architect (codebase implications)
- [ ] Spec reviewed by main-ops Architect (governance integration)
- [ ] CEO formal Approving Review under ruleset id 15502000
- [ ] Squash-merged to main
- [ ] OneCLI setup scripts audited for any residual `anthropic-beta`
      injection paths (and any found are removed in the same PR)
- [ ] Phase 0 SDK Compliance deliverable updated to cite this spec as
      binding
