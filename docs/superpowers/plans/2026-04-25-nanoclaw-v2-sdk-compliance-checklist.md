# NanoClaw v2 Anthropic Agent SDK Compliance Checklist + Test Matrix

Date: 2026-04-25
Author: LIMITLESS Director
Status: Draft, research + planning only
Scope: NanoClaw v2 shadow instance on VPS-1

## 1. Purpose

NanoClaw v2 should be treated as a fresh baseline, not as a patched continuation of v1. Before LIMITLESS reintroduces v1 customizations, v2 must be proven compliant with the current Anthropic Agent SDK / Claude Code expectations for prompt construction, prompt caching, beta headers, auth, and streaming.

This document is a text-only planning artifact. It does not authorize code changes, config changes, deploys, restarts, or agent directives.

## 2. Current Working Diagnosis

The observed v2 failure:

```text
system.2.cache_control.ephemeral.scope: Extra inputs are not permitted
```

indicates that a system prompt block includes:

```json
"cache_control": { "type": "ephemeral", "scope": "..." }
```

and the Anthropic API route handling the request is rejecting `scope` as an unknown field.

Current evidence suggests this is not a NanoClaw streaming failure and not a basic auth failure. It is most likely an SDK/API beta compatibility issue:

- `@anthropic-ai/claude-agent-sdk@0.2.76` is known to work in production and does not trigger the failing `scope` behavior.
- `0.2.116` and `0.2.119` are known to emit behavior that triggers the 400 failure.
- Newer SDK/Claude Code behavior appears to distinguish stable/cacheable system prompt sections from dynamic sections.
- Public evidence indicates scoped prompt caching requires `anthropic-beta: prompt-caching-scope-2026-01-05`.
- Current injected beta headers do not include that header.

## 3. Compliance Principles

### 3.1 Fresh v2 first

Start from upstream/fresh NanoClaw v2 behavior. Do not add LIMITLESS v1 customizations until the baseline passes SDK compliance.

### 3.2 Prompt construction must be intentional

The prompt must clearly separate stable/cacheable information from dynamic per-run information.

Stable/cacheable content may include:

- Agent identity
- App or channel scope
- Stable operating rules
- Stable governance and safety constraints
- Stable tool-use policy

Dynamic/non-cacheable content must include:

- User message text
- Discord/channel metadata
- Current task or handoff details
- Recent conversation snippets
- Runtime status
- Usage-limit state
- Request IDs
- Timestamps
- Secrets or credentials
- Any one-off operational state

### 3.3 No secrets in cacheable sections

No token, credential, secret ID, request-specific metadata, or volatile context may appear before any SDK-recognized dynamic boundary or inside any block marked cacheable.

### 3.4 Headers must match emitted request fields

If the SDK emits a beta-gated request field, the final outbound request must include the beta header that authorizes that field. The relevant check is the final request to Anthropic, not merely the app’s intended header set.

### 3.5 Auth route is part of compatibility

The current auth route uses a Claude.ai consumer OAuth token (`sk-ant-oat01-`). Some beta features may behave differently across consumer OAuth and organization API-key (`sk-ant-api-`) routes. Switching auth should not be the first fix, but the compatibility matrix should account for it if needed.

## 4. SDK Contract Checklist

### 4.1 SDK version inventory

For every NanoClaw v2 test run, record:

- `@anthropic-ai/claude-agent-sdk` version
- embedded Claude Code version, if present
- `@anthropic-ai/sdk` version
- Node/Bun runtime version
- NanoClaw v2 commit or package version
- OneCLI SDK/proxy version, if involved

Known starting points:

| SDK version | Observed result | Notes |
| --- | --- | --- |
| 0.2.76 | Works | Production baked image; does not trigger failing `scope` behavior |
| 0.2.116 | Fails | Sends/causes scoped cache behavior |
| 0.2.119 | Fails | Current v2 tested version |
| 0.2.120 | Unknown | Exists, not proven safe |

### 4.2 Prompt boundary behavior

Confirm from SDK docs/source/runtime behavior:

- Whether `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` is public API, internal Claude Code behavior, or both.
- Whether host applications are expected to include the boundary explicitly.
- Whether content before the boundary receives global/shared cache scope.
- Whether content after the boundary avoids global scope.
- Whether the boundary affects system prompt blocks only or also messages/tools.

Checklist:

- [ ] Locate authoritative SDK documentation for `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`.
- [ ] Confirm exact exported constant name/value.
- [ ] Confirm expected placement in a host-provided system prompt.
- [ ] Confirm whether multiple system blocks are generated.
- [ ] Confirm which block index maps to `system.2` in the failing request.
- [ ] Confirm whether dynamic content is currently placed before or after the boundary.

### 4.3 Cache-control fields

For each SDK version and prompt shape, identify whether the final request includes:

- [ ] top-level `cache_control`
- [ ] block-level `cache_control`
- [ ] `cache_control.type`
- [ ] `cache_control.ttl`
- [ ] `cache_control.scope`

Field-to-header mapping to verify:

| Field | Stable? | Suspected/known beta header |
| --- | --- | --- |
| `cache_control.type = ephemeral` | Public/stable prompt caching behavior | May not require old prompt-caching beta on current API |
| `cache_control.ttl` | Beta/extended caching behavior | `extended-cache-ttl-2025-04-11` |
| `cache_control.scope` | Beta/scoped caching behavior | `prompt-caching-scope-2026-01-05` |

### 4.4 Beta header propagation

Current observed/injected header set:

```text
oauth-2025-04-20,extended-cache-ttl-2025-04-11,prompt-caching-2024-07-31
```

Candidate missing header:

```text
prompt-caching-scope-2026-01-05
```

Checklist:

- [ ] Confirm app-intended beta header set.
- [ ] Confirm OneCLI/proxy preserves all beta headers.
- [ ] Confirm headers are merged, not overwritten.
- [ ] Confirm OAuth beta header does not clobber scoped-caching beta header.
- [ ] Confirm final outbound Anthropic request includes the intended full `anthropic-beta` value.
- [ ] Confirm unsupported beta headers fail distinctly from missing beta fields.

### 4.5 Auth compatibility

Checklist:

- [ ] Test current consumer OAuth token route with current headers.
- [ ] Test consumer OAuth token route with `prompt-caching-scope-2026-01-05` added.
- [ ] Only if needed, test API-key route with the same payload and headers.
- [ ] Do not switch production auth route merely to hide the SDK mismatch.

### 4.6 Streaming compatibility

Because v2 streaming via OneCLI MITM has reportedly been verified, keep streaming in the matrix but do not conflate it with the scope failure.

Checklist:

- [ ] Minimal non-streaming request works.
- [ ] Minimal streaming request works.
- [ ] Real Architect prompt streaming works.
- [ ] Error path preserves Anthropic request IDs and response body.
- [ ] OneCLI MITM preserves `text/event-stream` behavior.

## 5. Proposed Prompt Contract

### 5.1 Static/cacheable section

This section should be stable across sessions and safe to cache globally if the SDK chooses to do so.

Recommended contents:

```text
You are the <App> Architect for LIMITLESS.
Your stable scope is <repo/app/channel>.
Your stable responsibilities are ...
Your stable governance rules are ...
Your stable tool policy is ...
```

Do not include:

- Current user message
- Recent chat history
- Timestamps
- Request IDs
- Secrets
- Runtime health/status
- Per-task branch names unless intentionally stable

### 5.2 Dynamic boundary

If confirmed as host-app applicable, place the SDK boundary after the stable section and before dynamic runtime context.

Conceptual form:

```text
<stable system instructions>

__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__

<dynamic runtime context>
```

Exact constant/value must be verified from SDK docs/source before implementation.

### 5.3 Dynamic/non-cacheable section

Recommended contents:

```text
Current message metadata:
- channel
- sender
- timestamp
- message ID

Current user request:
...

Recent relevant context:
...

Current operational constraints:
...
```

### 5.4 Required invariants

- [ ] Dynamic content never appears before the dynamic boundary.
- [ ] Secrets never appear in cacheable sections.
- [ ] Stable prompt does not include stale deployment assumptions.
- [ ] Prompt assembly is deterministic and testable.
- [ ] Prompt blocks can be logged/snapshotted safely with secrets redacted.

## 6. Compatibility Test Matrix

This is a design matrix only. Execute only after explicit approval.

### 6.1 Axes

SDK versions:

- A: `0.2.76`
- B: `0.2.116`
- C: `0.2.119`
- D: latest available, e.g. `0.2.120+`

Prompt shapes:

- P1: minimal system prompt, no boundary
- P2: minimal system prompt with dynamic boundary
- P3: real Architect prompt, current shape
- P4: real Architect prompt, refactored static/dynamic shape
- P5: long multi-turn session prompt

Header sets:

- H1: current headers
- H2: current headers + `prompt-caching-scope-2026-01-05`
- H3: no optional prompt-caching beta headers
- H4: SDK-default headers only

Auth routes:

- R1: current `sk-ant-oat01-` consumer OAuth
- R2: `sk-ant-api-` org API key, only if needed

Transport modes:

- T1: direct Anthropic API, no SDK, control
- T2: SDK direct, no OneCLI
- T3: SDK through OneCLI MITM
- T4: full NanoClaw v2 path

### 6.2 Minimal pass/fail matrix

| Test ID | SDK | Prompt | Headers | Auth | Transport | Expected purpose |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | none | P1 | H1 | R1 | T1 | Confirms auth/endpoint baseline |
| C-002 | 0.2.76 | P3 | H1 | R1 | T4 | Confirms known-good old SDK path |
| C-003 | 0.2.119 | P3 | H1 | R1 | T4 | Reproduces current failure |
| C-004 | 0.2.119 | P3 | H2 | R1 | T4 | Tests missing scoped-cache beta hypothesis |
| C-005 | 0.2.119 | P4 | H1 | R1 | T4 | Tests prompt refactor without new beta |
| C-006 | 0.2.119 | P4 | H2 | R1 | T4 | Tests intended compliant v2 path |
| C-007 | 0.2.119 | P4 | H2 | R1 | T2 | Separates SDK behavior from OneCLI proxy behavior |
| C-008 | 0.2.119 | P4 | H2 | R2 | T2/T4 | Only if OAuth route appears incompatible |
| C-009 | latest | P4 | H2 | R1 | T4 | Tests latest SDK after compliance fixes |

### 6.3 Required capture per test

For each test, capture:

- SDK version
- prompt shape identifier
- beta header set intended by app
- beta header set observed at final Anthropic request
- auth route
- response status
- full error body if failed
- Anthropic request ID if available
- whether request included `cache_control.scope`
- whether request included `cache_control.ttl`
- whether streaming started
- whether SSE completed

## 7. Decision Gates

### Gate 1: Baseline understood

Pass criteria:

- Current failure reproduced in a controlled test.
- Final request payload/header mismatch identified or ruled out.
- `system.2` block contents mapped to prompt assembly source.

### Gate 2: SDK-compliant prompt contract drafted

Pass criteria:

- Static/dynamic prompt sections defined.
- Boundary behavior confirmed.
- Secrets/dynamic-state placement rules documented.

### Gate 3: Header compatibility proven

Pass criteria:

- If `scope` is emitted, the required beta header is present at the final Anthropic request.
- If OAuth route rejects scoped caching even with beta header, that limitation is documented.

### Gate 4: Fresh v2 green baseline

Pass criteria:

- Real Architect prompt succeeds on fresh v2 with current or accepted SDK version.
- Streaming works through the intended route.
- No v1 customizations are required for baseline success except those explicitly needed for auth/transport.

### Gate 5: Customization reintroduction allowed

Pass criteria:

- Each v1 customization has an explicit reason to be ported.
- Each customization has a compatibility test.
- No customization changes prompt/cache semantics unless intentionally reviewed.

## 8. Recommended Work Order

1. Freeze current v2 shadow state for observation.
2. Produce source-level map of prompt construction in fresh v2.
3. Produce source-level map of SDK cache-control behavior.
4. Verify final outbound headers through the request path.
5. Draft final prompt contract.
6. Run minimal matrix C-001 through C-006 after approval.
7. Choose whether to pin SDK temporarily or proceed with latest SDK plus compliant prompt/header handling.
8. Only then evaluate v1 customizations.

## 9. Primary Recommendation

Make `NanoClaw v2 Phase 0: Anthropic Agent SDK Compliance` the mandatory first step.

Short-term pinning to `@anthropic-ai/claude-agent-sdk@0.2.76` remains a safe unblock tactic, but it should not become the architectural endpoint. The durable endpoint is a fresh v2 baseline that uses the latest SDK correctly, with prompt construction and beta headers aligned to the SDK’s emitted request fields.

## 10. Biggest Open Questions

1. Is `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` intended for external host applications, or only internal Claude Code prompt assembly?
2. Does `prompt-caching-scope-2026-01-05` work with the current `sk-ant-oat01-` consumer OAuth route?
3. Is `cache_control.scope` still beta-only, or has it changed/been partially rolled back in Anthropic’s API surface?
4. Which exact SDK version first made scoped cache control active for NanoClaw’s prompt shape?
5. Can NanoClaw v2 disable scoped prompt caching while keeping other latest-SDK benefits?
