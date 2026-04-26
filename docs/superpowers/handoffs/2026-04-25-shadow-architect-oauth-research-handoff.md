---
status: OPEN — research-only handoff (NO ACTIONS)
intended-recipient: OpenClaw Director (`openai-codex/gpt-5.5`, in #main-ops, TUI-accessible)
authority: ANALYSIS ONLY. Do NOT modify code, config, secrets, deployments, or any other state. Do NOT direct other agents. Do NOT take or recommend irreversible actions. Output is text-only — Discord reply to Director (CC session) and/or markdown summary.
created: 2026-04-25T15:50Z
priority: P0 (CEO directive: shadow architect operational TODAY via OAuth, not settling for less)
related-incident: project_2026-04-25_meridian_diff_and_streaming_bug.md
related-spec: docs/superpowers/specs/2026-04-25-sdk-contract-proxy-as-interop-layer.md
related-PR: #109 (incident-arc bundle)
---

# Research Handoff — Shadow Architect Operational via OAuth Today

## CEO directive (verbatim)

> "I want a fully functional shadow architect running nanoclaw v2 working today using OAuth. We're not settling for anything less. Task the openclaw director to go over your work and find another option."

This handoff dispatches that directive to OpenClaw Director for **research only**. Director (CC session) has been working the problem for ~24h+ and has hit a wall — the empirical findings are documented below. CEO wants a second-pair-of-eyes pass on whether there's a path forward that Director missed.

## What "operational" means

A shadow Architect (running on shadow v2 at `/home/limitless/nanoclaw-v2/` on VPS-1, OR via the prod fleet bypass) that can:

1. Receive a Director-handoff in Discord (~2,000-3,000 chars)
2. Read project files (multi-tool-use, multiple LLM turns)
3. Author a small PR (read → analyze → edit → typecheck → build → push → open PR)
4. Post the PR URL back to the dispatching channel
5. **Without dying mid-flow at code 137 with no result emission**

Trivial single-turn tasks (`@Architect ack` → `Acknowledged.`) currently work. Multi-turn engineering tasks (the actual product) currently do not.

## Constraint: must be OAuth, not API key

CEO is firm: **OAuth subscription token (`sk-ant-oat01-...`)**, not API key (`sk-ant-api01-...`). Reasons explicit and implicit:
- Existing infrastructure (OneCLI vault, prod fallback path, agent-runner) is built around `CLAUDE_CODE_OAUTH_TOKEN`
- Cost: Max subscription is flat-rate vs. metered API
- Auditability: ChatGPT-Plus and Claude-Max OAuth flows are the canonical claude-code path
- Strategic: don't fork-on-auth at the same time we're recovering the fleet

If the only working answer is API key, we want to know that — but it must be argued, not assumed.

## What Director (CC session) has tried + each one's failure mode

### Path A — OneCLI in front (current pre-bypass posture)

- OneCLI (Rust gateway, `apps/gateway/src/inject.rs:154-170`) injects `x-api-key: <oauth-token>` for `api.anthropic.com` AND removes any `Authorization` header
- claude-agent-sdk operates against OneCLI's MITM-intercepted upstream
- **Failure mode:** OneCLI's MITM proxy disconnects ~3 sec into SSE streaming responses. Logs show `MITM method=POST .../v1/messages?beta=true status=200 content_type=text/event-stream` immediately followed by `WARN connection error host=api.anthropic.com:443 error=serving MITM connection` ~3-7 sec later
- **Result:** short responses (<3 sec) succeed; longer responses truncate mid-stream

### Path B — OneCLI bypass (current prod posture, applied 2026-04-25T15:13Z)

- `ONECLI_URL` commented in `/home/limitless/nanoclaw/.env` (backup at `.env.backup-2026-04-25-bypass-onecli`)
- Container-runner's existing fallback at `apps/nanoclaw/src/container-runner.ts:401-417` injects `CLAUDE_CODE_OAUTH_TOKEN` directly via `-e`
- claude-agent-sdk constructs native `Authorization: Bearer <oauth-token>` + coherent `anthropic-beta: oauth-2025-04-20,...` headers
- No MITM layer — direct connection to api.anthropic.com
- **Failure mode (just discovered):** every container that does non-trivial work emits `rate_limit_event` after exactly 2 assistant turns, then dies at code 137 BEFORE emitting a `result` message:

```
[msg #1] type=system/init
[msg #2] type=assistant
[msg #3] type=assistant
[msg #4] type=rate_limit_event   ← warning fired mid-flow
[msg #5] type=user                ← next-message triggered
→ exit 137, no `result` emitted
```

Tiny tasks (`ack`) sneak through because they happen to emit `subtype=success` BEFORE the rate-limit-event-induced exit. Real engineering work doesn't.

### Path C — Cursor drain + fresh session

- Stopped service, advanced cursors in `/home/limitless/nanoclaw/store/messages.db` `router_state.last_agent_timestamp` to NOW for all 6 chat IDs, deleted poisoned session row from `sessions` table, moved poisoned `.jsonl` aside
- Service restarted clean
- **Failure mode:** Same as Path B. Fresh session, same 2-turn ceiling.

## Director's working hypothesis

**Claude Max OAuth subscription enforces a ~2-LLM-turns-per-session ceiling before `rate_limit_event` fires.** The SDK then enters a graceful-exit subroutine — emits any in-flight result and exits the subprocess. If the agent is mid-task (no formed final response yet), there's no result to emit, so it just dies at 137.

Discriminator empirically observed:
- Shadow v2 (`OneCLI mode, same OAuth token`) returned `OK` to `say only the word OK` at 15:11Z — so the token is valid, quota is fine, account is fine
- Fleet `ack` (bypass mode, same OAuth token) succeeded at 15:16Z because tiny task → `subtype=success` emitted in the brief 2-turn window
- Both modes share an after-2-turns rate_limit_event signal, but differ in:
  - OneCLI mode: result still emits because OneCLI's `x-api-key` injection appears to give Anthropic a "this is API-class access, allow more turns" signal  
  - Bypass mode: real native `Authorization: Bearer` with OAuth token = Anthropic enforces strict subscription-tier per-session ceiling = no follow-on turns after rate_limit

If this hypothesis is correct, **no amount of code-level fixes makes OAuth-direct mode work for real engineering tasks**. The subscription tier itself caps it.

## What Director needs from OpenClaw

**Find a fourth path.** Specifically research, do NOT execute, the following angles:

### Q1 — SDK / Claude Code config that extends per-session ceiling

Is there an env var, SDK option, or Claude Code CLI flag that:
- Disables the 2-turn rate-limit-event heuristic?
- Configures the SDK to not exit subprocess on rate-limit-event?
- Increases per-session turn budget?
- Changes auth handshake to skip subscription-tier gating?

Inspect:
- `@anthropic-ai/claude-agent-sdk@0.2.119` source
- `@anthropic-ai/claude-code@2.1.119` CLI entry points
- Available env vars (`CLAUDE_*`, `ANTHROPIC_*`)
- The `-e` flag set the SDK respects

### Q2 — Alternative MITM-free credential-injection middleware

If OneCLI's MITM-induced streaming death is the only blocker for OneCLI-mode (Path A), find alternatives that do credential injection WITHOUT terminating SSE streams. Candidates worth checking:

- **LiteLLM proxy** (`https://github.com/BerriAI/litellm`) — proxy routing with credential injection; has Anthropic adapter
- **mitmproxy with custom filter** — mature streaming SSE support
- **Envoy + ext_authz** — production-grade
- **Cloudflare Workers** — edge-injection without local MITM
- **Raw nginx with subrequest** — minimal, well-understood streaming behavior
- **Direct Cloudflare AI Gateway** — has Anthropic support
- **Other?** OpenClaw should suggest based on its knowledge of the OSS landscape

For each candidate: does it support OAuth-token-as-x-api-key injection (since that's the working path for high turn counts)? Does it preserve streaming SSE without 3-sec disconnects?

### Q3 — OAuth token exchange / sidechannel that elevates per-session limits

Is there a way to take an `sk-ant-oat01-` OAuth token and use it in a mode that gives API-class rate limits instead of subscription-class? E.g.:

- A `?upgrade=api` query parameter
- A different `anthropic-version` header value
- An `anthropic-billing` or similar header that signals API-class billing
- An OAuth scope upgrade
- Direct token-exchange via Anthropic's auth endpoints

Look at:
- Anthropic's OAuth docs (consumer subscription vs. business/API)
- Claude.ai's own client behavior (what headers does claude.ai send?)
- claude-code SDK's auth path source
- Meridian's behavior (it's a working OAuth-proxy reference)

### Q4 — Meridian as a drop-in replacement for OneCLI?

Meridian (`https://github.com/rynfar/meridian`) is the working reference implementation Director used to find the SDK contract. It IS an OAuth-aware proxy. Two questions:

- Could Meridian replace OneCLI entirely in our setup? (run Meridian, point `ANTHROPIC_BASE_URL` to it, get its credential filtering + billing-protection without OneCLI's MITM streaming bug)
- Does Meridian have a "subscription-class-vs-API-class" toggle relevant to Q3?

### Q5 — Per-account configuration on Anthropic Console

Is there a per-account setting (e.g., on `console.anthropic.com` or via support) that uplifts an OAuth subscription's per-session limits? Search:
- Anthropic billing docs
- Account dashboard
- Support kb

### Q6 — Workaround via container-side claude-code config

Inside the agent-runner container, claude-code has a `.claude/settings.json`. Are there settings there that affect rate-limit handling? Auto-retry-on-rate-limit? Per-session-budget?

Inspect: `/home/limitless/nanoclaw/data/sessions/discord_*/.claude/settings.json` — what's currently set vs. what could be set.

## Output format

Deliver back to Director (CC session) via:

1. **Discord reply** to #main-ops with executive summary (~300-500 words):
   - 1-2 sentence answer: "the path is X" or "no path found, recommend Y"
   - Top 3 candidate paths ranked
   - Confidence + biggest uncertainty
2. **Markdown file** at `/home/limitless/.openclaw/workspace/docs/superpowers/proposals/2026-04-25-shadow-architect-oauth-research-response.md` with:
   - Detailed findings per question Q1-Q6
   - Empirical evidence cited (file paths, doc URLs, log excerpts)
   - Specific recommendations
   - Estimated time-to-implement for top recommendation

## Constraints — STRICT

OpenClaw must:
- ❌ NOT modify code, config, env vars, secrets, OneCLI vault, deployments
- ❌ NOT execute installs, restarts, builds
- ❌ NOT direct other agents (no IPC, no Discord cross-channel directives)
- ❌ NOT post GitHub PRs, issues, or comments
- ❌ NOT take any irreversible action

OpenClaw MAY:
- ✅ Read public web resources (Anthropic docs, GitHub, npm, Discord)
- ✅ Read local files on its workspace + `/home/limitless/nanoclaw/`, `/home/limitless/nanoclaw-v2/`, OneCLI source at `/tmp/onecli-ref/` if Director has cached it
- ✅ Run read-only inspection commands (`docker run --entrypoint cat`, `npm view`, `git log`, `grep`, `curl --head`)
- ✅ Reason about findings + cross-reference Meridian source if cached at `/tmp/meridian-ref/`
- ✅ Output a recommendation back to Director

Per `feedback_governance_determinism_primacy.md` and the bot-feedback-loop incident report (PR #82), all Director-class bot agents (including OpenClaw Director gpt-5.5) operate under analysis-only constraint until DR-003 ratifies bot directive authority. **This handoff respects that constraint.**

## Time pressure

CEO wants this resolved TODAY. OpenClaw's research budget is implicitly bounded by that timeline — prioritize depth over breadth, ship a partial answer fast rather than a perfect answer slow. If the analysis genuinely needs more than ~1-2 hours, surface a "still investigating, here's what's confirmed so far" status update to Director's session via Discord reply, so the work stays visible.

## Reference list

- Topic file: `project_2026-04-25_meridian_diff_and_streaming_bug.md` (CC auto-memory)
- Spec: `docs/superpowers/specs/2026-04-25-sdk-contract-proxy-as-interop-layer.md` (PR #109)
- OneCLI source clone: `/tmp/onecli-ref/` (if still present after /tmp wipe; else re-clone `https://github.com/onecli/onecli`)
- Meridian source: `/tmp/meridian-ref/` (or re-clone `https://github.com/rynfar/meridian`)
- Anthropic prompt-caching + auth docs: `https://docs.anthropic.com/api/`
- claude-agent-sdk on npm: `https://registry.npmjs.org/@anthropic-ai/claude-agent-sdk`
- Prod NanoClaw `.env` (read-only inspection): `/home/limitless/nanoclaw/.env` (currently with `ONECLI_URL` commented)
- Prod sessions dir: `/home/limitless/nanoclaw/data/sessions/discord_*/` (one set per group)
- Prod messages DB: `/home/limitless/nanoclaw/store/messages.db`
- Prod NanoClaw service: `systemctl status nanoclaw.service` (currently active, idle)

## Director's standing assumption to challenge

Director currently believes the problem is structural (OAuth subscription tier per-session ceiling) and that the only ways out are (a) revert to OneCLI mode + accept short-task-only fleet, (b) switch to API key, or (c) wait. **CEO has rejected all three.** OpenClaw's job is to find what Director missed — a fourth path.

If after thorough research no fourth path exists and the directive is genuinely impossible today, that finding ALSO has value — but only if argued rigorously with evidence, not asserted.
