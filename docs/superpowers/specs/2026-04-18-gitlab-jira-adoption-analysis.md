# GitLab + Jira Adoption Impact Assessment — MYTHOS

**Date**: 2026-04-18
**Author**: Architect
**Status**: For operator review
**Scope**: MYTHOS only (`chmod735-dor/mythos`). LIMITLESS remains on GitHub regardless.

---

## Executive Summary

Switching MYTHOS from GitHub to GitLab is bounded and viable — MYTHOS is pre-code with 4 foundational docs and no CI pipeline. The core agentic tooling (`gh` → `glab`) is a well-supported swap; the largest unknown is whether Clawhip's webhook router supports GitLab's event taxonomy without code changes.

**Jira is orthogonal.** The collaborating team can use Jira for their PM tracking without any Jira integration in the MYTHOS Architect container. Smart Jira ID references in MR descriptions (`MYTHOS-123`) auto-link if configured on the Jira side — no agent tooling required.

**Recommendation**: See Q9. Migration to GitLab is viable if the collaborating team is the primary development team. If they are contributors to a GitHub-hosted repo, keep GitHub and use Jira reference links only.

---

## Q1 — Architect Pipeline Changes: `gh` vs `glab`

Every per-app CLAUDE.md and the global worker CLAUDE.md contain `gh` commands in the git workflow step. The MYTHOS Architect CLAUDE.md inherits this pattern. The following table maps each command to its `glab` equivalent.

### Side-by-side command mapping

| Action | `gh` (GitHub) | `glab` (GitLab) | Notes |
|--------|---------------|-----------------|-------|
| Create MR/PR | `gh pr create --title "..." --body "..."` | `glab mr create --title "..." --description "..."` | `--body` → `--description` |
| List open | `gh pr list --state open` | `glab mr list --state opened` | `open` → `opened` |
| View | `gh pr view 50` | `glab mr view 50` | Same |
| Merge | `gh pr merge 50 --squash` | `glab mr merge 50 --squash` | Same |
| Raw API | `gh api repos/owner/repo/pulls --jq '...'` | `glab api projects/owner%2Frepo/merge_requests --jq '...'` | URL-encoded namespace separator |
| Auth token | `GH_TOKEN` env var | `GITLAB_TOKEN` env var | Different var name |
| Clone repo | `gh repo clone owner/repo` | `glab repo clone owner/repo` | Same |
| List CI jobs | `gh run list` | `glab ci list` | GitLab CI native integration |
| PR checks | `gh pr checks 50` | `glab mr checks 50` | Less mature in `glab` |

### Gaps — things `gh` can do that `glab` cannot (cleanly)

1. **`gh pr create --fill`**: Auto-populates title and body from the last commit message and diff. `glab` has no equivalent — title and description must be supplied explicitly in every Architect pipeline step.
2. **`gh api` response paging**: `gh api --paginate` handles GitHub's `Link` header pagination automatically. `glab api` does not have a built-in `--paginate` flag; multi-page responses require manual offset handling.
3. **apt repository**: `gh` has an official Debian/Ubuntu apt repo (`cli.github.com/packages`). `glab` v1.92.1 (current stable) has no official apt repo — installation on Debian slim containers requires binary download or snap, which complicates Dockerfile authoring.

### CLAUDE.md changes required

Every MYTHOS pipeline Step 5 (Create PR) needs:
- `gh pr create` → `glab mr create`
- `--body` → `--description`
- `prUrl` example in IPC completion JSON: `https://github.com/...` → `https://gitlab.com/...`
- `gh pr list` in Architect monitoring → `glab mr list`

Files affected: `~/nanoclaw/groups/discord_mythos-eng/CLAUDE.md` (the ratified identity doc, once deployed).

---

## Q2 — NanoClaw Source Changes

### Files with hardcoded GitHub references

| File | Reference | Change needed |
|------|-----------|---------------|
| `apps/nanoclaw/src/container-runner.ts` | `GH_TOKEN` / `GITHUB_TOKEN` injected via `-e` (lines 283–285) and written to `settings.json` (lines 145–146) | Add parallel `GITLAB_TOKEN` injection |
| `apps/nanoclaw/container/entrypoint.sh` | Writes `GH_TOKEN` + `GITHUB_TOKEN` to `/etc/environment` | Add `GITLAB_TOKEN` write + git URL rewrite |
| `apps/nanoclaw/container/Dockerfile` | Installs `gh` CLI via GitHub's apt repo | Add `glab` binary install |
| `apps/nanoclaw/groups/global/CLAUDE.md` | `gh pr create`, `prUrl: https://github.com/...` in IPC JSON examples | Update for GitLab workflow |

### Files NOT affected

| File | Reason |
|------|--------|
| `apps/nanoclaw/src/config.ts` | `NOTIFICATION_CHANNELS` maps to Discord JIDs — provider-agnostic |
| `apps/nanoclaw/src/ipc.ts` | `prUrl` field is an unvalidated string — any URL format works |
| `apps/nanoclaw/src/discord.ts` | Discord integration is provider-agnostic |
| All scheduled task / cron logic | No GitHub dependency |

### Propagation path

MYTHOS NanoClaw runs from `/home/mythos/nanoclaw/` — an rsynced copy of the LIMITLESS monorepo source. Changes must be:
1. PRed to `LIMITLESS-LONGEVITY/limitless` (or a MYTHOS-specific Dockerfile/image)
2. Rsynced to `/home/mythos/nanoclaw/`
3. Container image rebuilt (`./container/build.sh` with `CONTAINER_IMAGE=nanoclaw-agent-mythos:latest`)

---

## Q3 — Container Image Changes

### Dockerfile diff (estimated)

The current Dockerfile installs `gh` via GitHub's official apt repo:

```dockerfile
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [...] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y gh
```

`glab` has no official apt repo. Binary install:

```dockerfile
# Install glab (GitLab CLI) — binary install, no official apt repo on Debian slim
RUN GLAB_VERSION=$(curl -s "https://gitlab.com/gitlab-org/cli/-/releases/permalink/latest" \
      | grep -oP '(?<=tag/v)[0-9.]+' | head -1) \
    && curl -sL "https://gitlab.com/gitlab-org/cli/-/releases/v${GLAB_VERSION}/downloads/glab_${GLAB_VERSION}_linux_amd64.tar.gz" \
      | tar xz -C /tmp \
    && mv /tmp/bin/glab /usr/local/bin/glab \
    && rm -rf /tmp/bin /tmp/LICENSE /tmp/README.md
```

**Image weight**: `glab` binary ~25–30 MB uncompressed, ~12 MB compressed layer. Total image delta: ~12 MB compressed.

**Coexistence**: `gh` and `glab` use different binary names and different env vars (`GH_TOKEN` vs `GITLAB_TOKEN`). They can coexist in the same image without conflict. LIMITLESS workers would have `glab` available but unused.

### Options

**Option A — Shared image**: Add `glab` to `nanoclaw-agent:latest`. LIMITLESS gets the binary unused (+12 MB compressed). Simpler to maintain.

**Option B — MYTHOS fork**: Build `nanoclaw-agent-mythos:latest` from a separate Dockerfile extending the shared base. Requires maintaining a separate build. Cleaner image separation. Recommended if MYTHOS image needs other divergences (e.g., Python tooling for ML debugging in Phase 2+).

---

## Q4 — Credentials

### Comparison table

| Dimension | GitHub | GitLab |
|-----------|--------|--------|
| CLI env var | `GH_TOKEN` | `GITLAB_TOKEN` |
| git HTTP auth | Implicit via `gh auth setup-git` | Explicit: `https://oauth2:${GITLAB_TOKEN}@gitlab.com` |
| CI token | `GITHUB_TOKEN` (auto-injected in Actions) | `CI_JOB_TOKEN` (auto-injected in GitLab CI) |
| PAT scopes (write code + MRs) | `repo` (classic) or `Contents:RW + Pull requests:RW` (fine-grained) | `api` (broad) or `read_repository + write_repository` |
| Project-scoped token | Fine-grained PAT (beta, GitHub) | Project Access Token (GA, GitLab) — strongly recommended |
| Token rotation | GitHub PAT has no auto-rotation | GitLab project tokens support expiry dates |

### NanoClaw changes required

**`entrypoint.sh`** — add alongside existing `GH_TOKEN` block:
```bash
if [ -n "$GITLAB_TOKEN" ]; then
  echo "GITLAB_TOKEN=$GITLAB_TOKEN" >> /etc/environment
  export GITLAB_TOKEN
  # Configure git to use token for https://gitlab.com
  git config --global url."https://oauth2:${GITLAB_TOKEN}@gitlab.com".insteadOf "https://gitlab.com"
fi
```

**`container-runner.ts`** — add alongside existing GH_TOKEN block:
```typescript
if (process.env.GITLAB_TOKEN) {
  args.push('-e', `GITLAB_TOKEN=${process.env.GITLAB_TOKEN}`);
}
```

**`settings.json` `defaultEnv`** — add `GITLAB_TOKEN: process.env.GITLAB_TOKEN || ''` alongside `GH_TOKEN`.

**Recommendation**: Use a GitLab **project access token** (not a personal PAT) scoped to `chmod735-dor/mythos` with `api` + `write_repository` scopes. Project tokens are revocable per-project and do not expose the operator's entire GitLab account.

---

## Q5 — Jira Integration Pattern

### What the current stack touches

| Component | GitHub dependency? | Jira relevance |
|-----------|-------------------|----------------|
| `docs/decisions/DR-*.md` | None — repo-local markdown | None — DRs replace Jira issues for architectural tracking |
| `ROADMAP.md` Kanban boards | None — repo-local markdown | None — ROADMAP already serves the PM function internally |
| IPC `prUrl` completion field | GitHub URL format | Would become GitLab MR URL |
| Clawhip `github.*` event routing | GitHub webhooks | Separate concern (Q6) |

### Recommended pattern: Jira orthogonal + smart link references

The MYTHOS Architect does **not** need to create or update Jira tickets. The collaborating team manages Jira for their own PM workflow. MYTHOS Architect references Jira issues in MR titles/descriptions using the standard link pattern:

```
fix(engine): implement G3 volatility gate [MYTHOS-47]
```

GitLab and Jira both support auto-linking via the Jira-GitLab integration (configurable in Jira's project settings under "Development Tools" → "GitLab"). This requires zero container changes.

### If Jira integration in container is later required

The most mature npm-installable option is `@aashari/mcp-server-atlassian-jira` (v3.2.1, Dec 2025, 482 commits). It exposes generic `jira_get/post/put/patch/delete` MCP tools. Add via MCP config — do NOT bake into the container image at this stage.

Alternatively, Atlassian's own remote MCP server at `https://mcp.atlassian.com/v1/mcp` requires no installation — it's an HTTP endpoint. OAuth 2.1 or API token auth. Supports Jira + Confluence + Compass. Production-ready with TLS and audit logging.

**JiraCLI** (`ankitpokhrel/jira-cli`, Docker image: `ghcr.io/ankitpokhrel/jira-cli:latest`) is available if command-line Jira access is needed.

**Image weight estimate if added**: `@aashari/mcp-server-atlassian-jira` via `npx` on demand — ~5 MB download per invocation, no image change. Baked in: ~30–50 MB for the package + dependencies. Atlassian remote MCP: zero image weight (HTTP endpoint).

---

## Q6 — Clawhip Routing

### GitHub vs GitLab webhook event taxonomy

| Event | GitHub | GitLab |
|-------|--------|--------|
| MR/PR opened | `X-GitHub-Event: pull_request` + `action: opened` | `X-Gitlab-Event: Merge Request Hook` + `action: open` |
| MR/PR merged | `X-GitHub-Event: pull_request` + `action: closed` + `merged: true` | `X-Gitlab-Event: Merge Request Hook` + `action: merge` |
| MR/PR closed | `X-GitHub-Event: pull_request` + `action: closed` + `merged: false` | `X-Gitlab-Event: Merge Request Hook` + `action: close` |
| Push | `X-GitHub-Event: push` | `X-Gitlab-Event: Push Hook` |
| Tag push | `X-GitHub-Event: create` + `ref_type: tag` | `X-Gitlab-Event: Tag Push Hook` |
| Issue created | `X-GitHub-Event: issues` + `action: opened` | `X-Gitlab-Event: Issue Hook` + `action: open` |

**Key structural difference**: GitHub uses distinct event names (one event per payload type). GitLab consolidates MR lifecycle into a single `Merge Request Hook` event with an `action` field. A Clawhip router that pattern-matches on `github.pull_request.opened` cannot directly match GitLab payloads without code changes.

### Clawhip assessment

The Clawhip integration plan (referenced but not accessible) describes `github.*` event routing via a `~/.clawhip/config.toml`. Whether Clawhip has built-in support for `gitlab.*` events is **unknown from available codebase access**.

**Speculative assessment** (flag: not verified against Clawhip source):
- If Clawhip matches on webhook header + payload field, it likely needs a new provider handler for `X-Gitlab-Event` / `object_kind` routing
- GitLab's `action` field within a single event type requires payload-level filtering, which may not be in the current router
- Risk level: **medium-high** — Clawhip routing is the least-verified part of this assessment

**Mitigation**: Before committing to GitLab, verify Clawhip GitLab support by checking `~/.clawhip/config.toml` schema and Clawhip binary help output for provider configuration. If GitLab is not supported, MYTHOS can bypass Clawhip and route GitLab webhooks directly to a Discord channel or NanoClaw endpoint.

---

## Q7 — CI/CD Equivalents

MYTHOS has no CI pipeline yet — this is a clean slate. There is no porting cost.

### Syntax comparison (for authoring reference)

| Feature | GitHub Actions | GitLab CI |
|---------|---------------|-----------|
| Config file | `.github/workflows/*.yml` | `.gitlab-ci.yml` (single file) |
| Trigger on push | `on: push:` | `rules: - if: $CI_PIPELINE_SOURCE == "push"` |
| Trigger on MR | `on: pull_request:` | `rules: - if: $CI_PIPELINE_SOURCE == "merge_request_event"` |
| Job definition | `jobs: build: runs-on: ubuntu steps:` | `build: stage: build image: ubuntu script:` |
| Checkout | `uses: actions/checkout@v4` | Built-in — git clone automatic |
| Script steps | `run: npm test` | `script: - npm test` |
| Docker image | `container: node:20` | `image: node:20` |
| Job dependencies | `needs: [build]` | `stage:` ordering (implicit) or `needs:` |
| Registry token | `GITHUB_TOKEN` | `CI_JOB_TOKEN` |
| Cache | `actions/cache@v4` (action) | `cache: paths:` (declarative) |

**Verdict**: Authoring a MYTHOS `.gitlab-ci.yml` from scratch is equivalent effort to authoring `.github/workflows/*.yml`. GitLab CI's native Docker image support and built-in git clone reduce boilerplate. GitLab CI Runners can use MYTHOS's own VPS as a self-hosted runner — relevant for Phase 2 ML model builds that need local GPU/hardware access.

---

## Q8 — Blast Radius on LIMITLESS

LIMITLESS remains on GitHub. Impact breakdown:

| Component | Impacted? | Notes |
|-----------|-----------|-------|
| LIMITLESS container image (`nanoclaw-agent:latest`) | Low | Adding `glab` adds ~12 MB compressed — harmless if using shared image. Zero impact with Option B (MYTHOS fork). |
| LIMITLESS `container-runner.ts` | None | `GH_TOKEN` injection unchanged. `GITLAB_TOKEN` addition is conditional — no effect if `GITLAB_TOKEN` is unset. |
| LIMITLESS `.env` | None | Only MYTHOS `.env` gets `GITLAB_TOKEN`. |
| Clawhip daemon (shared) | Medium | If GitLab routing is added to Clawhip config, shared daemon changes could affect `github.*` route stability. Recommend config namespacing: `[provider.github]` and `[provider.gitlab]` as separate blocks. |
| LIMITLESS CLAUDE.md files | None | LIMITLESS Architects continue using `gh pr create` unchanged. |
| Discord routing | None | D.O.R OPS server is already separate from LIMITLESS Ops. |

**Lowest-blast-radius path**: MYTHOS builds its own `nanoclaw-agent-mythos:latest` image. No changes to the shared image, no LIMITLESS regression risk.

---

## Q9 — Recommended Adoption Path

### Option A — Migrate `chmod735-dor/mythos` to GitLab now

**Cost**: 4 docs to migrate (no code). ~6 bounded changes: new GitLab repo, MYTHOS container image with `glab`, `GITLAB_TOKEN` credential wiring, MYTHOS CLAUDE.md pipeline update, Clawhip assessment + routing update, Jira smart-link reference convention.

**Benefit**: Collaborating team works in their native environment. GitLab project tokens are cleaner than GitHub fine-grained PATs. GitLab self-hosted runners suit MYTHOS's Phase 2+ GPU/hardware requirements.

**Risk**: Clawhip GitLab routing support is unverified. Medium-high uncertainty.

**When to choose**: The collaborating team is the **primary development team** for MYTHOS code (writing most of Phase 2+ implementation).

---

### Option B — Dual-stack (GitHub canonical + GitLab mirror)

Mirror `chmod735-dor/mythos` → GitLab. GitHub stays authoritative; GitLab is a read mirror for the collaborating team's CI/CD. 

**Not recommended.** Adds infrastructure complexity (mirror sync, diverging PR workflows) without proportional benefit. The collaborating team still needs to submit MRs to GitHub. If they prefer GitLab, migrate fully.

---

### Option C — Keep GitHub, Jira reference links only

Zero migration. Collaborating team uses Jira for their PM tracking; MYTHOS Architect continues `gh pr create` on GitHub. MR descriptions reference Jira IDs (`[MYTHOS-47]`). Jira auto-links if configured.

**When to choose**: The collaborating team is a **contributor team** — they submit PRs to the GitHub repo, they don't own the development workflow.

---

### Final recommendation

**Determine the collaborating team's role before deciding.**

- **Contributor role** → Option C. Zero friction, no infrastructure changes.
- **Primary development role** → Option A. Pre-code is the right moment. Verify Clawhip GitLab support first (30-minute check) — if unsupported, plan a bypass before committing.

Option B is never the right choice.

---

## Migration Cost Estimates (Option A only)

| Task | Estimated effort | Confidence |
|------|-----------------|------------|
| Create `chmod735-dor-gitlab/mythos` repo + migrate 4 docs | 1 hour | High |
| Verify Clawhip GitLab routing / implement bypass | 2–4 hours | Medium |
| MYTHOS-specific Dockerfile with `glab` | 1 hour | High |
| `entrypoint.sh` + `container-runner.ts` `GITLAB_TOKEN` wiring | 1 hour | High |
| MYTHOS CLAUDE.md pipeline update (`gh` → `glab`) | 30 minutes | High |
| `GITLAB_TOKEN` project token provisioning | 30 minutes | High |
| Jira smart-link configuration on Jira side | Collaborating team | N/A |
| **Total (MYTHOS side)** | **~6–8 hours** | |

---

## Open Questions

1. **Clawhip GitLab support**: Does `glab`/GitLab webhook routing work with the current Clawhip version? Check `~/.clawhip/config.toml` schema for `[provider]` blocks. **Blocks Option A decision.**
2. **Collaborating team role**: Primary development team or contributor team? **Determines Option A vs C.**
3. **GitLab group/namespace**: Where would `chmod735-dor/mythos` live on GitLab? `chmod735-dor` group, personal namespace, or a new shared group with the collaborating team?
4. **Self-hosted runner for Phase 2**: If migrating, should the MYTHOS VPS register as a GitLab Runner for Phase 2 ML model builds? (Avoids cloud runner costs and keeps GPU local.)
5. **Jira project setup**: If using smart links, the collaborating team needs to configure the GitLab-Jira integration in their Jira project settings. Confirm they can do this without MYTHOS-side effort.
