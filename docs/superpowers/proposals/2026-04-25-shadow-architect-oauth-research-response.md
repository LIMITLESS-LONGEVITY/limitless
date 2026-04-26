# Shadow Architect OAuth Research Response

Date: 2026-04-25
Author: OpenClaw Director
Status: Research-only response, no execution performed
Handoff: `/home/limitless/.openclaw/workspace/docs/superpowers/proposals/2026-04-25-shadow-architect-oauth-research-handoff.md`

## Executive summary

The best fourth path is **not** to extend the direct OAuth subprocess into a long internal agent loop. The strongest path is to switch the shadow Architect to a **Meridian-style SDK-compliant passthrough proxy architecture**: keep Claude Max OAuth, avoid OneCLI TLS MITM, let the Claude Agent SDK operate with its expected low-turn/passthrough pattern, and let NanoClaw or an adapter execute tools between requests.

The key finding is that the observed “2-turn ceiling” may not be an arbitrary bug. Meridian’s source explicitly treats **2 turns as the base budget for passthrough mode**: turn 1 generates tool-use blocks, turn 2 processes the blocked-tool handoff. Meridian makes that usable by returning tool calls to the client and resuming across requests. NanoClaw direct-bypass appears to be trying to run a full internal multi-turn engineering loop through a subscription-OAuth session, then dies when the SDK/account path wants to hand control back.

Top candidate paths:

1. **Meridian-style passthrough replacement for OneCLI** — highest confidence, fastest path to a compliant OAuth shadow if NanoClaw can call an Anthropic-compatible local proxy or be adapted to tool passthrough.
2. **Minimal non-MITM reverse proxy for header normalization + SSE preservation** — technically likely to fix OneCLI’s streaming failure, but must be governed carefully because using header shape to alter rate-limit treatment may be policy-sensitive.
3. **Pin / configure SDK into older or safer behavior while compatibility work proceeds** — useful fallback, but unlikely to solve the direct-OAuth multi-turn ceiling if the ceiling is account/SDK semantic rather than SDK bug.

I found no strong evidence for an env var, `.claude/settings.json` switch, OAuth token exchange, or Console setting that safely converts Claude Max OAuth into unlimited API-style long internal agent loops.

## Evidence reviewed

### Local / prior evidence

- Handoff documents two empirical failure modes:
  - OneCLI MITM mode: upstream `200 text/event-stream` then MITM connection error after ~3 seconds.
  - OneCLI bypass mode: direct `Authorization: Bearer <sk-ant-oat01>` emits `rate_limit_event` after exactly 2 assistant turns, then process exits 137 without `result` for non-trivial tasks.
- Prior local SDK inspection found NanoClaw v2 using `@anthropic-ai/claude-agent-sdk@0.2.119`.
- Prior research found `cache_control.scope` beta/header mismatch and Meridian/opencode-with-claude as relevant OAuth proxy prior art.

### Meridian source/docs evidence

From public Meridian README and source fetched from GitHub:

- Meridian “bridges the Claude Code SDK to the standard Anthropic API.” It routes through the official SDK `query()` path and exposes Anthropic/OpenAI-compatible HTTP endpoints.
- `src/proxy/server.ts` imports `query` from `@anthropic-ai/claude-agent-sdk` and strips `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, and `ANTHROPIC_AUTH_TOKEN` from the SDK subprocess env so the subprocess uses native Claude auth rather than looping through the proxy.
- `src/proxy/query.ts` builds SDK options centrally.
- Meridian has explicit SDK feature controls: `settingSources`, `codeSystemPrompt`, `clientSystemPrompt`, `memory`, `dreaming`, `sharedMemory`, `betas`, `maxBudgetUsd`, etc.
- `src/proxy/query.ts` contains a critical passthrough note: base passthrough mode uses 2 turns because turn 1 generates tool-use blocks and turn 2 processes the blocked-tool handoff. Resume/deferred tools/advisor increase this small budget.
- `src/proxy/betas.ts` filters beta headers by profile. For `claude-max`, default policy is `allow-safe`: strip known billable betas such as `extended-cache-ttl-*`, while forwarding safe betas required for SDK behavior. It also supports `MERIDIAN_BETA_POLICY=strip-all|allow-safe|allow-all`.

These facts strongly suggest Meridian is not “making Max OAuth unlimited.” It is **structuring the agent loop so Max OAuth can operate in short SDK-compatible turns**, while the proxy/client manages continuity.

## Q1 — SDK / Claude Code config that extends per-session ceiling

### Finding

I found **no credible config knob that extends a Claude Max OAuth direct subprocess into an unrestricted internal multi-turn engineering loop**.

Relevant SDK/CLI observations:

- The Agent SDK exposes `maxTurns` as an option/CLI flag, but that is a client-side runaway limit, not an account quota uplift.
- Claude Code contains UI/commands around rate limits, including `rate-limit-options`, `/upgrade`, “extra usage,” and plan upgrade flows.
- CLI code indicates if already on the highest Max plan, the suggested path for additional usage is to log in with an API usage-billed account. That is explicitly not the CEO’s desired path.
- The SDK emits `rate_limit_event` separately from normal result events; NanoClaw’s adapter currently ignores `rate_limit_event` in some UI contexts, but the subprocess exit still occurs.

### Conclusion

No Q1 option looks like a safe “increase per-session ceiling” switch. Increasing `maxTurns` cannot overcome subscription/account rate-limit events. A setting to “not exit on rate_limit_event” would not solve the underlying lack of allowed follow-on inference.

### Estimated implementation time if pursued

Not recommended. Further source spelunking could take 1-2 hours, but likely yields no working path.

## Q2 — Alternative MITM-free credential-injection middleware

### Finding

A non-MITM reverse proxy can likely solve **the SSE truncation** part of Path A, because OneCLI’s failure mode appears tied to TLS MITM stream handling, not to Anthropic or the SDK itself.

Candidate classes:

1. **Meridian**
   - Already a local HTTP proxy.
   - Designed for Claude Max OAuth + SDK.
   - Does not need TLS MITM against `api.anthropic.com`.
   - Preserves streaming and session behavior by design.

2. **Minimal Node/Hono/Fastify reverse proxy**
   - Accept local Anthropic-compatible requests.
   - Rewrite/normalize auth headers.
   - Forward to Anthropic or SDK.
   - Preserve SSE with streaming response piping.
   - Fast to write, but would be new custom infra.

3. **nginx / Envoy / mitmproxy**
   - Can preserve SSE if configured correctly (`proxy_buffering off`, long read timeouts, no response buffering).
   - Good if the only requirement is header injection and streaming pass-through.
   - Less aligned with SDK semantics than Meridian.

4. **LiteLLM / Cloudflare AI Gateway**
   - Possible, but may add translation complexity and beta-header/auth edge cases.
   - Less attractive for same-day recovery.

### Caution

If the goal is explicitly to use `x-api-key` header shape to obtain “API-class” behavior from an OAuth token, that may be policy-sensitive. I recommend framing this as **header normalization required by the SDK/proxy contract**, not as an attempt to bypass subscription limits. The safer route is Meridian-style SDK-native OAuth behavior.

### Conclusion

Q2’s best concrete candidate is **Meridian**, not a generic MITM replacement. If Meridian cannot be integrated fast enough, a minimal SSE-safe reverse proxy is the backup technical pattern.

### Estimated implementation time

- Meridian spike: 1-3 hours if it can run locally and NanoClaw can point at an Anthropic-compatible base URL.
- Custom reverse proxy: 2-4 hours plus validation, higher governance risk.

## Q3 — OAuth token exchange / sidechannel that elevates per-session limits

### Finding

No credible evidence found for a safe OAuth token exchange, query parameter, billing header, or scope upgrade that converts Claude Max OAuth into API-class long-session behavior while staying on the same subscription route.

The Claude Code source does include OAuth refresh handling and account metadata such as subscription type/rate-limit tier. It also includes upgrade/extra-usage UI paths. But those are product/account flows, not a documented token exchange to bypass rate limits.

### Conclusion

Do not pursue Q3 as an engineering path. If Anthropic supports such an uplift, it should come through official account/support/Console channels, not reverse-engineered headers.

### Estimated implementation time

Not recommended.

## Q4 — Meridian as drop-in replacement for OneCLI

### Finding

Meridian is the strongest fourth path.

Why:

- It was built for exactly this family of problem: Claude Max/Pro OAuth with tools that expect Anthropic/OpenAI-compatible HTTP APIs.
- It avoids OneCLI’s TLS MITM failure mode.
- It uses the official Claude Agent SDK `query()` path.
- It understands Max vs API profiles.
- It has beta filtering specific to Max subscription behavior.
- It intentionally models passthrough mode with a 2-turn base budget, which matches the empirical “2 turns then rate limit event” clue.

The key architectural question is whether NanoClaw v2 can act like a client of Meridian:

- If NanoClaw v2 can send Anthropic-compatible requests to a local base URL, Meridian may be a near drop-in replacement for OneCLI.
- If NanoClaw v2 is itself calling `@anthropic-ai/claude-agent-sdk query()` directly, then Meridian is not drop-in at the current seam. The seam would need to move: either NanoClaw calls Meridian as an API, or NanoClaw adopts Meridian’s passthrough/session design internally.

### Most important insight

Meridian probably does **not** solve this by extending direct OAuth turn limits. It solves it by **not trying to run the whole engineering loop inside one long direct OAuth subprocess**. In passthrough mode, tool calls return to the client; the client executes tools and submits the next request/session continuation.

### Conclusion

Make Meridian the primary recovery spike. The goal should be:

> Replace OneCLI as the OAuth/SSE bridge with Meridian or replicate Meridian’s passthrough pattern, so the shadow Architect operates as a client-managed multi-request agent rather than a single long internal Claude Code subprocess.

### Estimated implementation time

- Read-only confirmation of NanoClaw seam: 30-60 minutes.
- Run Meridian local spike: 1-2 hours after approval.
- Integrate as shadow-only base URL: 1-3 hours if compatible.
- If NanoClaw requires deeper adapter changes: same-day possible but riskier, 4-8 hours.

## Q5 — Anthropic Console per-account configuration uplift

### Finding

No evidence found for a simple Console setting that increases per-session Max OAuth agent-loop limits. Claude Code’s own UI includes `/upgrade`, Max-tier detection, and extra-usage paths, but highest Max appears to direct users toward API usage-billed login for additional usage.

Possible legitimate account-level paths:

- Upgrade from lower Max/Pro tier to higher Max tier, if not already at highest.
- Enable/request extra usage if account type supports it.
- Contact Anthropic support/account team for higher limits or enterprise/team plan behavior.

### Conclusion

Q5 is not a same-day engineering fix unless the account is not already on the highest Max tier or has an available extra-usage toggle. It is worth checking manually, but do not block the engineering path on it.

### Estimated implementation time

Manual account check: 5-15 minutes by an authenticated human.

## Q6 — Container-side `.claude/settings.json` rate-limit handling

### Finding

No evidence found that `.claude/settings.json` can override subscription rate limits or prevent subprocess exit after a rate-limit event.

Relevant settings/features can affect:

- auto-memory
- auto-dreaming
- CLAUDE.md loading
- prompt/system behavior
- tool permissions
- telemetry/header helpers
- model/effort/thinking

But rate limits are account/server-side. Settings may reduce token pressure or disable features that trigger extra turns, but they cannot turn a Max OAuth account into API-class capacity.

### Useful setting-adjacent path

Container settings may still matter for stability:

- Disable or minimize auto-memory/dreaming/CLAUDE.md if they add hidden turns or prompt complexity.
- Use minimal safe betas.
- Avoid extended-cache TTL on Max unless proven needed.
- Ensure `maxTurns` is set intentionally for passthrough vs internal mode.

### Conclusion

Q6 is a tuning/mitigation path, not the fourth path.

### Estimated implementation time

Read-only audit: 30 minutes. Safe config experiment after approval: 30-60 minutes.

## Ranked recommendations

### 1. Primary: Meridian-style passthrough bridge

**Path:** Run or adapt Meridian as the OAuth/SSE bridge and have shadow NanoClaw operate against it in Anthropic-compatible client mode, or copy Meridian’s pattern into the v2 shadow adapter.

**Why:** It is aligned with the official SDK, handles Max-vs-API profile differences, avoids OneCLI MITM, and explains the 2-turn observation as an expected passthrough-loop budget rather than a fatal blocker.

**Validation:**

1. Confirm whether NanoClaw v2 can use `ANTHROPIC_BASE_URL` or equivalent to hit a local Anthropic-compatible endpoint instead of direct SDK process mode.
2. If yes, test against Meridian with OAuth profile.
3. If no, compare NanoClaw’s SDK direct usage to Meridian `buildQueryOptions()` and add/replicate passthrough mode.

**Time-to-implement:** 1-3 hours if endpoint seam exists; 4-8 hours if adapter changes are required.

### 2. Backup: SSE-safe local reverse proxy replacing OneCLI MITM

**Path:** Keep the working auth/header posture of OneCLI mode but replace the TLS MITM streaming layer with a simple local reverse proxy that preserves SSE.

**Why:** OneCLI mode’s blocker is stream truncation, not auth. A normal reverse proxy can stream indefinitely if configured correctly.

**Risks:** Must avoid intentionally bypassing service limits. Must confirm ToS/policy posture. Does not fix SDK semantics as cleanly as Meridian.

**Time-to-implement:** 2-4 hours.

### 3. Mitigation: SDK/prompt/beta minimization

**Path:** Keep OAuth direct but reduce hidden turn pressure: disable optional features, minimize betas, pin SDK if needed, avoid auto-memory/dreaming/extended cache TTL.

**Why:** May allow slightly larger tasks, but unlikely to deliver full Architect capability if the 2-turn direct-OAuth pattern is structural.

**Time-to-implement:** 1-2 hours of experiments, uncertain payoff.

## Specific tests to run after approval

1. **Meridian smoke test**
   - Start Meridian with the same Claude OAuth account.
   - Send an Anthropic-compatible streaming request long enough to exceed 3 seconds.
   - Confirm SSE does not truncate.

2. **Meridian tool passthrough test**
   - Use a simple tool-call workflow.
   - Confirm the model returns tool calls, client executes, and next request resumes successfully.

3. **NanoClaw seam test**
   - Determine whether NanoClaw v2 can point to a custom Anthropic base URL without invoking its own SDK subprocess directly.

4. **Beta policy test**
   - Compare current headers against Meridian `allow-safe`: especially strip `extended-cache-ttl-*` on Max.

5. **Direct OAuth ceiling confirmation**
   - Run the same multi-turn prompt through direct SDK internal mode with maxTurns high.
   - If it still rate-limits after 2 turns, treat direct internal OAuth mode as non-viable for full Architect work.

## Final answer

The fourth path is **not** “find a hidden flag to make OAuth direct unlimited.” The fourth path is **change the architecture to match how working Claude Max OAuth bridges operate**: a local SDK-compliant proxy/passthrough loop, with Meridian as the reference and likely fastest implementation candidate.

If CEO requires a fully functional OAuth shadow Architect today, I recommend prioritizing **Meridian-as-OneCLI-replacement / Meridian-style passthrough** immediately.
