# DR-002 — NanoClaw Source-of-Truth, Deployment Pipeline, and OneCLI Agent Vault Alignment

**Date**: 2026-04-19
**Author**: Architect
**Status**: Proposed — awaiting CEO ratification
**Applies to**: `LIMITLESS-LONGEVITY/limitless` · VPS deployments (`/home/limitless/nanoclaw/`, `/home/mythos/nanoclaw/`) · `LIMITLESS-LONGEVITY/nanoclaw` fork
**Blocks**: DR-001 Phase 3 (implementation landing target depends on this decision)
**Supersedes**: N/A (first decision record on NanoClaw source of truth)

---

## Decision

**Option B — Make the monorepo vendored copy (`apps/nanoclaw/`) the authoritative source of truth for all NanoClaw changes.** Deploy via a GitHub Actions pipeline: merge to `main` triggers an SSH deploy job that pulls the latest build to each VPS tenant, rebuilds, and restarts the service.

**MYTHOS OneCLI**: Provision a dedicated OneCLI instance for the `mythos` VPS user (separate from LIMITLESS). MYTHOS does not share LIMITLESS's OneCLI.

**Agent Vault assessment**: OneCLI's Agent Vault (credential policies, approval prompts) is complementary to — not a replacement for — DR-001 Phase 3's GitHub App installation token. DR-001 Phase 3 proceeds as planned, with the implementation landing in `apps/nanoclaw/src/container-runner.ts` and deploying via the pipeline established by this DR.

---

## Context

### The 3-Copy Drift — Quantified

Three distinct NanoClaw trees exist, all at different states:

#### Copy 1 — Monorepo vendored copy (`LIMITLESS-LONGEVITY/limitless/apps/nanoclaw/`)
- Version: **1.2.46** (upstream 1.2.53 — 7 patch releases behind)
- **LIMITLESS-specific additions not in upstream:**
  - `src/channels/discord.ts` — entire Discord channel adapter (~300 lines)
  - `src/config.ts`: `MONOREPO_PATH`, `WORKTREE_BASE`, `NOTIFICATION_CHANNELS` constants
  - `src/ipc.ts`: worktree management, notification channel routing, `deleteRegisteredGroup` import
  - `src/container-runner.ts`: PR #53 EACCES fix (`|| ''` fallback, OneCLI guard, `CLAUDE_CODE_OAUTH_TOKEN` injection)
  - `src/types.ts`: `teamId` in `ContainerConfig` (worker peer communication)
- **Missing from monorepo (upstream has, we don't):**
  - `src/session-cleanup.ts` — 24-hour session cleanup script runner
  - `ONECLI_API_KEY` in `src/config.ts` — authenticated OneCLI gateway access (added upstream 2026-04-15)
  - `ONECLI_API_KEY` in `src/container-runner.ts` — passed to OneCLI SDK constructor (same PR)
  - `ONECLI_API_KEY: ''` in `src/container-runner.test.ts` mock

#### Copy 2 — Deployed LIMITLESS VPS (`/home/limitless/nanoclaw/`)
- Git repo tracking: `qwibitai/nanoclaw`, `LIMITLESS-LONGEVITY/nanoclaw`, `qwibitai/nanoclaw-discord`
- Contains **10+ uncommitted local modifications** (exact content not readable without SSH — requires one-time audit)
- Has the manual EACCES patch (applied by Director after PR #53 merged to monorepo but not propagated)
- This is what `nanoclaw.service` runs. It is not in sync with the monorepo or upstream.

#### Copy 3 — Deployed MYTHOS VPS (`/home/mythos/nanoclaw/`)
- **Not a git repository** — raw rsync copy of Copy 2 at an unknown point in time
- Has the manual EACCES patch
- No audit trail, no version information recoverable from the filesystem
- This is what `nanoclaw-mythos.service` runs

#### Fork state — `LIMITLESS-LONGEVITY/nanoclaw`
- Last commit: **2026-04-03** (version 1.2.46)
- Upstream HEAD: **2026-04-18** (version 1.2.53)
- **16 days and 7 upstream versions behind**
- The fork has no LIMITLESS-specific commits beyond the standard upstream content — all LIMITLESS-specific code lives in the monorepo vendored copy, not the fork
- The fork is currently unused as an active development branch; it is a stale mirror

### The Unsustainability of the Current Pattern

The manual-propagation pattern (Architect merges to monorepo → Director manually SSH patches VPS) has now failed once (PR #53). It will fail on every future NanoClaw change. Each failure:
- Requires a Director to identify that propagation is needed
- Requires manual SSH session with correct context
- Leaves no audit trail that the deployed code matches the spec
- For MYTHOS: is doubly risky because MYTHOS's deployed tree is not a git repo

The pattern is also inconsistent with the governance spec (PR #55, §5.1): code that runs in production must be traceable to a ratified merge commit. MYTHOS NanoClaw today is not traceable to any commit.

### The OneCLI Agent Vault Announcement — What It Is and Is Not

**What the announcement covers:**
- Rate limiting: per-endpoint request rate limits for agent-initiated API calls
- Credential approval prompts: OneCLI holds an HTTP connection open and asks a human to approve credential release before serving the token to the container
- `ONECLI_API_KEY`: a new auth credential for NanoClaw → OneCLI authentication (the gateway now requires NanoClaw to identify itself)
- Upcoming: time-bound credential access windows, more advanced approval policies

**What the announcement does NOT cover:**
- GitHub identity minting: OneCLI does not generate GitHub App installation tokens
- Container outbound git operations: OneCLI intercepts HTTP calls made by code running inside the container; it does not control what credentials are injected at container startup
- DR-001 Phase 3 replacement: the OneCLI Agent Vault operates on runtime credential release; DR-001 Phase 3 operates on container launch-time credential injection. These are orthogonal layers.

**What this means for DR-001 Phase 3:**
DR-001 Phase 3 proceeds as planned. The GitHub App installation token (`GH_TOKEN` for git push + PR creation) is injected at NanoClaw container spawn time — before any code inside the container runs. Agent Vault cannot substitute for this because Vault operates on requests made by code already running inside the container.

The two systems are **complementary**: Agent Vault handles "when the agent calls the Anthropic API, require CEO approval"; DR-001 Phase 3 handles "when the agent is launched, it gets a time-scoped GitHub App token instead of the CEO's personal token."

**v2 preview assessment:**
The v2 branch (Chat SDK integration, 15 messaging platforms, approval dialogs) is in active development with breaking changes daily. The `v2` branch had 15+ commits on 2026-04-19 alone. It is not adoption-ready. LIMITLESS should monitor v2 and adopt when it stabilizes. **Estimated timeline: 4–8 weeks post-announcement stabilization period.** Not a blocker for this DR.

**The upstream `add-github` v2 skill** uses a dedicated bot user account (not GitHub Apps) for NanoClaw to participate in GitHub issue/PR comment threads. This is a different use case from DR-001 (pushing commits + opening PRs). DR-001's GitHub App choice remains correct for the commit-attribution use case.

---

## Options Considered

### Option A — Delete Monorepo Vendored Copy; Deployed Clone is Source of Truth

- Architect submits changes directly to `LIMITLESS-LONGEVITY/nanoclaw` fork; deployed tree git-pulls
- Remove `apps/nanoclaw/` from monorepo; Architect mounts `/home/limitless/nanoclaw/` read-only for investigation

| Criterion | Assessment |
|---|---|
| Change control | ❌ Fork PRs don't go through the monorepo ratification workflow (PR #55/§5.1) |
| Governance alignment | ❌ NanoClaw changes bypass the LIMITLESS governance spec entirely |
| MiFID II / MYTHOS audit | ❌ MYTHOS code is not traceable to a ratified commit |
| Architect workflow | ⚠️ Architect must context-switch between two repos; fork has no division-specific features path |
| Upstream sync | ✅ Easier — deployed tree is already tracking upstream |
| Blast radius | ❌ Each VPS tenant diverges independently with no cross-visibility |
| LIMITLESS-specific features | ❌ Division-specific code (discord, worktrees) would need a fork, removing upstream PR optionality |

**Assessment**: Removes governance. Incompatible with PR #55 ratification model. Rejected.

---

### Option B — Monorepo Vendored Copy is Source of Truth + Deploy Pipeline *(Chosen)*

- `apps/nanoclaw/` in monorepo is the canonical version
- GitHub Actions pipeline: on merge to `main` (path filter: `apps/nanoclaw/**`), SSH deploys to both VPS tenants, rebuilds, restarts services
- `LIMITLESS-LONGEVITY/nanoclaw` fork used as an upstream staging buffer: periodic upstream cherry-picks land in fork, then are PR'd into the monorepo
- MYTHOS VPS gets a real git clone of the monorepo (sparse checkout of `apps/nanoclaw/`) instead of the current rsync copy

| Criterion | Assessment |
|---|---|
| Change control | ✅ Every NanoClaw change flows through monorepo PR + ratification |
| Governance alignment | ✅ NanoClaw changes governed by PR #55 like all other code |
| MiFID II / MYTHOS audit | ✅ MYTHOS deployed code is traceable to a ratified merge commit |
| Architect workflow | ✅ Architect already edits `apps/nanoclaw/` — no workflow change |
| Upstream sync | ✅ Fork-as-staging-buffer provides clean upstream integration path |
| Blast radius | ✅ Single source of truth; both tenants deploy from the same tree |
| LIMITLESS-specific features | ✅ Division-specific code lives alongside upstream code in a well-maintained tree |
| DR-001 Phase 3 landing target | ✅ Unambiguous: `apps/nanoclaw/src/container-runner.ts`, deployed via pipeline |
| Operational cost | Medium — requires GitHub Actions SSH deploy setup |

**Concerns addressed:**
- *"Monorepo becomes a nanoclaw monorepo"* — Turborepo's `packages/` + `apps/` model already accommodates this. NanoClaw is an internal package.
- *"Upstream changes are harder to pull"* — The fork-as-staging-buffer pattern (upstream → fork → monorepo PR) is the same as what well-maintained monorepo forks do. Not harder, just more explicit.

**Assessment**: Aligns with governance. Clear audit trail. Adopted.

---

### Option C — Git Subtree

- `apps/nanoclaw/` remains in monorepo; `git subtree` bidirectionally syncs with `LIMITLESS-LONGEVITY/nanoclaw`

| Criterion | Assessment |
|---|---|
| Change control | ✅ Same as Option B |
| Upstream sync | ⚠️ `git subtree` produces merge commits that pollute monorepo history; subtree push/pull syntax is non-obvious and error-prone |
| LIMITLESS-specific features | ⚠️ Bidirectional sync means LIMITLESS-specific features would need to be surgically excluded from upstream pushes |
| Operational complexity | ❌ `git subtree split --prefix apps/nanoclaw/ --branch ...` is not a trivial CLI pattern; divergence between subtree state and `--prefix` path creates confusion |

**Assessment**: More complex than Option B with no meaningful benefit. Option B with fork-as-staging-buffer achieves the same upstream sync goal with less operational friction. Rejected.

---

### Option D — Upstream-First; PR to `qwibitai/nanoclaw`

- Submit LIMITLESS-specific features (discord channel, worktrees, notification channels) as PRs to upstream

| Criterion | Assessment |
|---|---|
| Change control | ✅ Full upstream governance |
| LIMITLESS-specific features | ❌ Upstream will not accept LIMITLESS-division-specific config (NOTIFICATION_CHANNELS, MONOREPO_PATH, DISCORD_CHANNEL_* env vars) |
| Velocity | ❌ Upstream review cycle: days to weeks per PR |
| MiFID II | ❌ No control over when upstream changes deploy |
| Blast radius | ❌ LIMITLESS changes affect all qwibitai/nanoclaw users |

**Assessment**: Correct for generic bug fixes and improvements; incompatible with LIMITLESS-specific features. Can be used selectively (e.g., submit `ONECLI_API_KEY` alignment PRs) but cannot be the primary workflow. Rejected as primary path; adopted selectively for generic fixes.

---

### Option E — Adopt Agent Vault, Collapse Custom Code

- Upgrade to current upstream (1.2.53), adopt Agent Vault for all credential management, eliminate LIMITLESS-specific config where vault substitutes

| Criterion | Assessment |
|---|---|
| Code maintenance | ✅ Less custom code if vault substitutes for direct injection |
| Agent Vault substitution coverage | ❌ Vault does not substitute for: discord.ts, MONOREPO_PATH, WORKTREE_BASE, NOTIFICATION_CHANNELS, PR #53 guard. These are LIMITLESS-operational, not credential-management. |
| v2 stability | ❌ v2 is in active preview with breaking changes; unsafe to adopt |
| DR-001 Phase 3 | ❌ Agent Vault does not mint GitHub App installation tokens — custom container-runner code still required |
| Immediate deployability | ❌ v2 adoption would be a multi-week integration effort on unstable code |

**Assessment**: Wrong timing. The `ONECLI_API_KEY` addition (upstream 1.2.53) is the only immediate Agent Vault-adjacent change that should be absorbed now. Full Agent Vault adoption (including v2's approval dialogs) should be planned as a separate Phase 2 upgrade after v2 stabilizes. Rejected as a wholesale approach now; adopted in part (ONECLI_API_KEY sync).

---

## Decision Rationale

Option B is selected for the following reasons:

1. **Governance alignment above all**: The LIMITLESS governance spec (PR #55) requires that all production code be traceable to a ratified merge commit. MYTHOS's current rsync NanoClaw is un-auditable and MiFID II-incompatible. Option B closes this immediately.

2. **Architect workflow unchanged**: The Architect already edits `apps/nanoclaw/` in the monorepo. Making this authoritative requires zero workflow change for the Architect.

3. **Single source of truth eliminates propagation accidents**: The PR #53 incident (monorepo merged → manual VPS patch required) will not recur once the deploy pipeline is in place. The pipeline is the propagation mechanism.

4. **DR-001 Phase 3 landing target is unambiguous**: The container-runner change lands in `apps/nanoclaw/src/container-runner.ts`. The pipeline deploys it. There is no ambiguity about which tree the change belongs to.

5. **LIMITLESS-specific features are correctly scoped**: Discord, worktrees, and notification channels are LIMITLESS operational infrastructure — they belong in the LIMITLESS monorepo, not in upstream qwibitai/nanoclaw.

---

## MYTHOS OneCLI Decision

### Option E1 — Own OneCLI Instance (Chosen)

Provision a separate OneCLI instance for the `mythos` VPS user. `ONECLI_URL` in MYTHOS `.env` points to `http://localhost:10254` (or a different port to avoid collision with LIMITLESS's OneCLI).

**Rationale:**
- Tenant isolation: MYTHOS and LIMITLESS are separate divisions. Cross-tenant credential visibility violates the isolation model established in the federated architecture spec.
- MiFID II: An auditor reviewing MYTHOS's credential access trail should see only MYTHOS agent activity, not LIMITLESS activity. Shared OneCLI conflates both.
- Rate limiting and approval policies for MYTHOS agents (e.g., restricting IBKR API calls per hour) should be independently configurable without affecting LIMITLESS.
- Operational simplicity: two independent processes are easier to reason about than one multi-tenant process.

### Option E2 — Share LIMITLESS OneCLI (Rejected)
- Cross-tenant auth is not documented as supported in the OneCLI SDK
- Even if technically possible, it violates tenant isolation and the MiFID II audit trail
- A credential policy set for LIMITLESS agents would apply to MYTHOS agents and vice versa
- Rejected on isolation grounds

### Option E3 — Stay OneCLI-less Permanently (Rejected)
- Requires manual patching of every upstream release that touches OneCLI integration
- Currently 7 versions behind; `ONECLI_API_KEY` was added upstream on April 15 — MYTHOS cannot adopt this without its own OneCLI
- DR-001's PR #53 fix (direct `CLAUDE_CODE_OAUTH_TOKEN` injection) is appropriate as an **interim measure** until MYTHOS has its own OneCLI
- Once MYTHOS OneCLI is live, the `CLAUDE_CODE_OAUTH_TOKEN` direct injection migrates to OneCLI credential routing — cleaner and consistent with upstream
- Rejected as permanent posture; PR #53 interim fix remains valid until OneCLI is provisioned

---

## Consequences

### Positive
- Every NanoClaw change in production is traceable to a ratified monorepo commit
- MYTHOS NanoClaw becomes a proper git-tracked deployment (MiFID II compliant)
- DR-001 Phase 3 has a clean landing target
- Upstream sync path is explicit and auditable (upstream → fork → monorepo PR)
- `ONECLI_API_KEY` gap is closed immediately in the monorepo (single commit)
- Manual propagation accidents cannot recur once pipeline is live

### Negative / Trade-offs
- **Deploy pipeline setup**: Requires GitHub Actions SSH credentials (deploy key scoped to VPS), job definition, and testing. One-time cost. Estimated: 1 engineer sprint.
- **One-time VPS audit**: Before making the monorepo authoritative, the 10+ uncommitted local mods in `/home/limitless/nanoclaw/` must be catalogued and either (a) absorbed into the monorepo, (b) documented as superseded by newer monorepo code, or (c) promoted to upstream PRs. This audit requires SSH access and cannot be done by the Architect without host access.
- **MYTHOS clone migration**: `/home/mythos/nanoclaw/` changes from an rsync copy to a git clone. Requires one-time operator action.
- **Monorepo CI includes NanoClaw tests**: Turborepo pipeline must be configured to run NanoClaw's vitest suite. This is low-risk but adds CI time.

### Neutral
- `LIMITLESS-LONGEVITY/nanoclaw` fork is retained as a staging buffer for upstream cherry-picks. It does not require any changes to its current state.
- Upstream-first contributions (generic bug fixes, `ONECLI_API_KEY`, `session-cleanup.ts`) can still be submitted directly to `qwibitai/nanoclaw`. This DR doesn't restrict contributing upstream.

---

## Self-Correction Path

| Failure mode | Recovery |
|---|---|
| Deploy pipeline SSH key compromised | Rotate the deploy key. Update the GitHub Actions secret. Re-run the pipeline to verify. |
| Pipeline deploys broken build to VPS | `systemctl stop nanoclaw.service && cd /home/limitless/nanoclaw && git checkout HEAD~1 && npm run build && systemctl start nanoclaw.service`. Roll forward by reverting the monorepo PR. |
| VPS git clone diverges from monorepo | `git fetch origin && git reset --hard origin/main` (destructive — operator confirms first). Deploy pipeline prevents divergence in steady state. |
| Upstream NanoClaw has breaking API change | Fork absorbs the change into a branch. Evaluate impact on LIMITLESS-specific code. Tested integration PR before merging to monorepo. v2 adoption follows this same pattern. |

---

## Open Questions

1. `[OPEN: VPS audit]` — The exact content of the 10+ uncommitted local modifications in `/home/limitless/nanoclaw/` is not yet known. A one-time SSH audit is required before making the monorepo authoritative. **Action owner**: Operator (CEO) at rollout Phase 1.
2. `[OPEN: MYTHOS OneCLI port]` — Should MYTHOS OneCLI run on port 10254 (same as LIMITLESS, on a different VPS user) or a different port? If both run on the same physical host, port collision must be avoided. **Action owner**: Operator at rollout Phase 5.
3. `[OPEN: DR-001 Phase 3 + MYTHOS OneCLI sequencing]` — DR-001 Phase 3 (GitHub App token injection) and MYTHOS OneCLI provisioning are independent. DR-001 Phase 3 can deploy before MYTHOS OneCLI is live; the `CLAUDE_CODE_OAUTH_TOKEN` direct injection (PR #53 interim) remains valid until MYTHOS OneCLI is provisioned. See `docs/plans/nanoclaw-source-of-truth-rollout.md`.
4. `[OPEN: v2 upgrade timeline]` — Monitor `qwibitai/nanoclaw` v2 branch for stabilization. Trigger: when v2 is merged to main OR a stable tag is published. Decision owner: CEO at that time.

---

*This Decision Record is governed by the agentic SDLC governance spec (PR #55). It must be ratified by CEO Approving Review before rollout begins.*
