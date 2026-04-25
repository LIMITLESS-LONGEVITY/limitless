---
status: OPEN — awaiting analysis
type: research-only handoff (NO ACTIONS)
intended-recipients: any Architect with research capability — OpenClaw Director (re-enabled with gpt-5.5), CEO's external Architect (parallel experiment), or future NanoClaw Architect once fleet is restored
created: 2026-04-25
priority: P1 (blocks shadow v2 architect from being usable today)
constraints: ANALYSIS ONLY. Do NOT modify code, config, secrets, deployments, or anything else. Do NOT direct other agents. Do NOT take or recommend irreversible actions. Output is text-only — Discord reply or markdown summary returned to Director.
---

# Investigation: `cache_control.ephemeral.scope` rejection by Anthropic API

## TL;DR

We're trying to run a "shadow" instance of NanoClaw v2 (`/home/limitless/nanoclaw-v2/` on VPS-1, registered as a CLI agent in the existing OneCLI vault) so we have a working Architect for analysis tasks while our prod NanoClaw 1.2.53 fleet is partially broken. Everything works EXCEPT: every chat request returns `400` from Anthropic with:

```
{"type":"error","error":{"type":"invalid_request_error","message":"system.2.cache_control.ephemeral.scope: Extra inputs are not permitted"}}
```

The `scope` field is being sent inside `cache_control.ephemeral` by `@anthropic-ai/claude-agent-sdk` versions ≥ 0.2.116 (and confirmed in 0.2.119, the current latest). Our PROD's older 0.2.76 doesn't send it. Anthropic's API rejects the field with strict-schema validation.

We need to understand: **why is the `scope` field being rejected, what configuration would make it accepted, and what's the right path forward?**

## Full context

### What we observe

Every Anthropic `/v1/messages?beta=true` request from our v2 shadow agent dies with the 400 above. OneCLI gateway logs confirm the request makes it to Anthropic intact, claude-agent-sdk retries internally and may eventually succeed (we've seen `200` with `text/event-stream` content type follow the 400 within 600ms in some traces), but the agent-runner surfaces the first 400 as the user-visible error and the chat client exits with `"API Error: 400 ..."`.

Sample Anthropic request_ids hitting this: `req_011CaPzpsjGkQoybmaTLLfEy`, `req_011CaQ1AqRRSi8pQFtKnBSZw`, `req_011CaQ1KJMeBixapvvNK3fKH`, `req_011CaQ1hh4FQeY11Ga38eFgo`.

### Decoding the error

| Path component | Meaning |
|---|---|
| `system` | `system` field of the request body (array of system content blocks) |
| `.2` | Index 2 — the third system block (0-indexed) |
| `.cache_control` | That block has a `cache_control` object |
| `.ephemeral` | The cache_control type is `ephemeral` |
| `.scope` | That ephemeral object has a sub-field called `scope` |
| `Extra inputs are not permitted` | Strict-schema rejection of unknown field |

So claude-agent-sdk is constructing a system message array where the third entry has `cache_control: { type: "ephemeral", scope: <something> }`. Anthropic's API doesn't accept the `scope` field.

### What works vs what doesn't

| Configuration | claude-agent-sdk version | Result |
|---|---|---|
| Prod 1.2.53 fleet (older image baked 2026-04-03) | **0.2.76** | Works — Anthropic returns 200 |
| Shadow v2 (image built 2026-04-25, claude-code 2.1.119 pinned) | **0.2.116** | Hits the 400 |
| Shadow v2 after upgrading agent-runner package.json to `0.2.119` + rebuild | **0.2.119** | Still hits the 400 |
| Direct curl to `/v1/messages` (no `?beta=true`) with Bearer + anthropic-beta header (no `cache_control` at all) | n/a — no SDK | Works — Anthropic returns 200 |
| Direct curl to `/v1/messages?beta=true` with Bearer + anthropic-beta header (no cache_control) | n/a — no SDK | Works — Anthropic returns 200 |

So the pattern: **the `scope` field was introduced in claude-agent-sdk between 0.2.76 and 0.2.116; it triggers Anthropic 400 even when the request is otherwise valid.**

### Beta headers we currently inject (via OneCLI's "Anthropic Beta Header" generic secret)

`anthropic-beta: oauth-2025-04-20,extended-cache-ttl-2025-04-11,prompt-caching-2024-07-31`

We've tried adding `extended-cache-ttl-2025-04-11` and `prompt-caching-2024-07-31` — the 400 persists. Maybe we need a different beta header to enable `scope`, or `scope` is account-feature-gated and not exposed via beta header.

### Auth context

- We use Anthropic OAuth token: `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` (truncated obviously — full token is in OneCLI's anthropic-type secret on VPS-1)
- Token is from a Claude.ai subscription (Claude Max, originally), not an org-level API key (`sk-ant-api-...`)
- This may matter: account/plan-feature-gating is plausible

### v2 architecture details that might be relevant

- v2 runs claude-agent-sdk in **Bun** runtime (not Node) inside the agent-runner container. Bun's HTTP client may serialize requests slightly differently than Node, but unlikely to add a `scope` field on its own.
- v2 uses **two-DB session split** (`inbound.db` host-write / `outbound.db` container-write). The system message construction happens inside the container (claude-agent-sdk side), not on the host.
- v2's container Dockerfile pins `CLAUDE_CODE_VERSION=2.1.116` originally — we bumped to `2.1.119`. The CLI is installed via `pnpm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}` and bundles its own `claude-agent-sdk`, but the AGENT-RUNNER side (which is what does the actual API calls) installs its own `@anthropic-ai/claude-agent-sdk` via Bun in `/app/node_modules/`.
- Per `/home/limitless/nanoclaw-v2/container/agent-runner/package.json`: `"@anthropic-ai/claude-agent-sdk": "^0.2.116"` — **caret-pinned**, so it picked 0.2.116. We've since bumped to `0.2.119` directly.

### What "everyone else's v2 works" likely means

NanoClaw v2 shipped 2026-04-22 and is in active use. CEO's empirical observation: many users have it running successfully. Plausible explanations for why ours doesn't:

1. **Account-feature gating.** Anthropic may have ENABLED the `scope` field for some accounts (specifically: API-key accounts on Claude Console org plans, or accounts enrolled in a beta program) but NOT for ours. Our `sk-ant-oat01-` token is a Claude.ai consumer subscription — feature support may differ from `sk-ant-api-` org keys.
2. **Required beta header we don't know.** Anthropic gates new fields behind specific `anthropic-beta` header values. We inject `oauth-2025-04-20,extended-cache-ttl-2025-04-11,prompt-caching-2024-07-31`. The `scope` field may need a different beta name.
3. **Recent server-side regression on Anthropic's side.** Anthropic may have intended to support `scope` but pushed a server change that broke it. Other v2 users may also be hitting this RIGHT NOW (today) — community channels may show it.
4. **SDK config option to disable.** The agent-runner-src might have a parameter passed to `query()` that controls cache_control attachment. Our v2 install hasn't customized this. Default behavior includes `scope`.
5. **Most v2 community users are on API keys, not OAuth subscriptions.** OAuth was historically claude.ai-only; API access historically required `sk-ant-api-`. Our OAuth-on-API-endpoint usage may be relatively rare in the v2 community.

## Specific research questions for the Architect

Please investigate and report back. **Do not act — just research and recommend.**

### Q1 — `scope` field provenance

When was the `scope` field added to `@anthropic-ai/claude-agent-sdk`'s cache_control construction? Bisect (or look at the SDK changelog / release notes / git history if accessible) between 0.2.76 (works) and 0.2.116 (broken). Identify:

- Earliest SDK version that sends `scope`
- Latest SDK version that does NOT send `scope`
- Any release-note context about why `scope` was added (linked Anthropic feature, beta program, etc.)

### Q2 — Anthropic API status of `scope`

Search Anthropic's:
- Public API documentation (https://docs.anthropic.com/api/prompt-caching and adjacent)
- Beta-features documentation
- Release notes / API changelog
- Discord / community

Determine:
- Is `cache_control.ephemeral.scope` a documented field?
- If yes, what beta header (or account configuration) enables it?
- If no, is there evidence it was REMOVED from the API recently? (If so, when?)
- Any equivalent / replacement field (e.g., `ttl` instead of `scope`)?

### Q3 — Other v2 users hitting the same error

Search:
- NanoClaw upstream Discord / Issues (https://github.com/qwibitai/nanoclaw + https://discord.gg/VDdww8qS42)
- claude-agent-sdk Issues (https://github.com/anthropics/claude-agent-sdk presumably; search for it)
- Anthropic support forums

Determine:
- Has this 400 been reported by other v2 users in the last 1-2 days?
- Any documented workaround (SDK version pin, beta header, env var, config)?

### Q4 — Recommendation

Based on Q1-Q3 findings, what should we do?

Candidate paths:
- (a) Pin claude-agent-sdk in v2's agent-runner to a specific older version (e.g., 0.2.95 or wherever scope was introduced − 1)
- (b) Configure agent-runner to disable prompt caching entirely (if SDK option exists)
- (c) Add a different beta header to OneCLI injection (specific value to be identified by Q2)
- (d) Switch to API key auth (`sk-ant-api-`) instead of OAuth — if account-gating is the issue
- (e) Wait for Anthropic / SDK to align — if it's a transient bug being fixed upstream
- (f) Some other approach we haven't considered

Recommend ONE primary path with rationale, plus a fallback if primary fails.

## Constraints — STRICT

This task is **analysis only**. The Architect must:

- ❌ NOT modify any source code
- ❌ NOT modify any config (OneCLI secrets, env vars, Dockerfiles, package.json)
- ❌ NOT execute any deploys, restarts, builds, or installations
- ❌ NOT instruct or direct other agents (no IPC, no Discord cross-channel directives)
- ❌ NOT post any GitHub PRs, issues, comments, or other persistent artifacts
- ❌ NOT push, pull, or otherwise modify the monorepo
- ❌ NOT execute any irreversible action

The Architect MAY:

- ✅ Read public web resources (Anthropic docs, GitHub repos, npm registry, community forums)
- ✅ Read local files (this handoff, our git history, our package.json, our SDK install state)
- ✅ Run read-only inspection commands (`docker run ... --entrypoint cat ...`, `git log`, `npm view`, etc.)
- ✅ Reason about findings
- ✅ Output a recommendation back to Director (text or markdown)

The motivation for this constraint: in a prior incident (2026-04-22) the OpenClaw Director issued unauthorized directives that triggered an Architect to push an irreversible code change. Per `feedback_governance_determinism_primacy.md` and the bot-feedback-loop incident report (PR #82), all Director-level bot agents are restricted to analysis-only tasks until DR-003 governance ratifies bot directive authority. This task respects that constraint.

## Output format

Deliver a Discord reply (300-1500 words) OR a markdown summary, addressed back to Director, containing:

1. **Summary** — 1-2 sentences answering "what's the root cause + the fix"
2. **Q1 findings** — SDK version where `scope` was introduced + supporting evidence
3. **Q2 findings** — Anthropic API status of `scope` + beta header (if any) that enables it
4. **Q3 findings** — community signal (others hitting it / not / what they did)
5. **Q4 recommendation** — primary path + rationale + fallback
6. **Confidence** — your subjective confidence in the recommendation (low/medium/high) and the biggest uncertainty

Do NOT post the recommendation directly into prod systems. Do NOT begin executing the recommendation. The recommendation goes to Director, who surfaces to CEO, who decides whether to execute.

## References / artifacts available

- This handoff: `docs/superpowers/proposals/2026-04-25-cache-control-scope-investigation-handoff.md`
- Shadow v2 install: `/home/limitless/nanoclaw-v2/` on VPS-1 (currently running, service log at `/home/limitless/nanoclaw-v2/data/service.log`)
- Shadow v2 image: `nanoclaw-agent-v2-e89339a5:latest` (built 2026-04-25, claude-code 2.1.119, claude-agent-sdk 0.2.119)
- OneCLI on VPS-1: gateway 1.18.2 (image dated 2026-04-22), CLI 1.4.1
- OneCLI secrets on VPS-1:
  - `Anthropic` (id: 18646778-e05f-4825-a615-e88893428338) — type=anthropic — auto-injects Bearer auth
  - `Anthropic Beta Header` (id: 84bc6286-52b1-4053-b5fa-0f50826ad5c4) — type=generic — injects `anthropic-beta: oauth-2025-04-20,extended-cache-ttl-2025-04-11,prompt-caching-2024-07-31`
- Prod fleet image: `nanoclaw-agent:latest` (claude-code 2.1.119, claude-agent-sdk 0.2.76 — older bundled SDK)
- Prod 1.2.53 vs upstream 2.0.13 architecture diff: `docs/superpowers/proposals/2026-04-25-multi-environment-architect-pipeline.md` (env-pipeline doc references the v2 migration scope)
- Anthropic API endpoint: `https://api.anthropic.com/v1/messages?beta=true`
- claude-agent-sdk on npm: `https://registry.npmjs.org/@anthropic-ai/claude-agent-sdk`

## Caveat for any Architect picking this up

The Director (the human-LLM hybrid running this from the CEO's Claude Code session) has spent ~2 hours bisecting today and reached the conclusions above. The next 30-60 minutes of investigation by the Architect should produce a confident recommendation. If after that time the Architect is also stuck, surface a "still investigating" status update with what you've ruled out, so Director can re-route or escalate.
