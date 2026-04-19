# NanoClaw Source-of-Truth Rollout Plan — DR-002 Implementation

**Date**: 2026-04-19
**Author**: Architect
**Status**: Proposed — awaiting CEO ratification of DR-002 before execution
**Implements**: `docs/decisions/DR-002-nanoclaw-source-of-truth-and-deployment.md`
**Operator**: CEO — all VPS steps require SSH access; all GitHub steps require org-owner access

---

## Prerequisites

Before starting:
- [ ] DR-002 has been ratified (CEO Approving Review on the PR that introduced this document)
- [ ] DR-001 has been ratified (GitHub App provisioning from DR-001 rollout may be executed in parallel or before this plan)
- [ ] SSH access to Hetzner VPS confirmed (`ssh -i ~/.ssh/limitless_hetzner limitless@<VPS_IP>`)
- [ ] SSH access to MYTHOS VPS user confirmed (`ssh -i ~/.ssh/limitless_hetzner mythos@<VPS_IP>` or `sudo -u mythos`)

---

## Phase 1 — VPS Drift Audit (One-Time; Required Before Any Other Step)

This step must be completed before the monorepo is declared authoritative. The goal is to capture and classify every uncommitted local modification in `/home/limitless/nanoclaw/`.

### Step 1.1 — Capture LIMITLESS VPS diff

```bash
# SSH into VPS as limitless user
ssh -i ~/.ssh/limitless_hetzner limitless@<VPS_IP>

# Navigate to deployed NanoClaw
cd /home/limitless/nanoclaw

# Capture full diff of all uncommitted changes
git status                          # List modified/untracked files
git diff HEAD > /tmp/limitless-nanoclaw-uncommitted.diff
git stash list                      # Check for stashed changes

# Capture which remote/branch we're on
git remote -v
git log --oneline -10
git branch -a

# Record the deployed version
node -e "const p=require('./package.json'); console.log('deployed version:', p.version)"

# Exit VPS
exit
```

Copy `/tmp/limitless-nanoclaw-uncommitted.diff` off the VPS (via `scp`).

### Step 1.2 — Classify the diff

For each modified file, classify:
- **Class (a) — Local prod fix, never committed upstream or to monorepo**: These MUST be absorbed into the monorepo before the pipeline goes live, or they will be overwritten on first deploy.
- **Class (b) — Upstream change, never pulled into deployed**: Confirmed absent. Upstream changes flow into monorepo via fork-staging; deployed will receive them via pipeline.
- **Class (c) — LIMITLESS-intentional divergence**: Already present in the monorepo vendored copy (discord.ts, MONOREPO_PATH, etc.). No action needed.

Expected Class (a) candidates based on known history:
- Any config changes made directly on the VPS (e.g., port adjustments, path fixes)
- The manual EACCES patch (if applied slightly differently from the PR #53 monorepo version — should be confirmed)

### Step 1.3 — Absorb Class (a) items into monorepo

For each Class (a) item identified, file a monorepo PR:
- Title: `fix(nanoclaw): absorb VPS local modification — <description>`
- Include the `Authored-by-agent: N/A (operator-sourced)` note since these come from manual VPS changes
- CEO reviews and merges before Step 2 proceeds

**Do not proceed to Phase 2 until all Class (a) items are absorbed.** If you proceed before absorbing them, the deploy pipeline will overwrite local VPS modifications on first run.

---

## Phase 2 — Monorepo Sync: Absorb Upstream Missed Changes

The monorepo is currently on version 1.2.46; upstream is at 1.2.53. Three upstream changes must be absorbed:

### Step 2.1 — Add `ONECLI_API_KEY` to monorepo config.ts

File a monorepo PR adding:

**`apps/nanoclaw/src/config.ts`** — Add to `readEnvFile` array and export:
```typescript
const envConfig = readEnvFile([
  'ASSISTANT_NAME',
  'ASSISTANT_HAS_OWN_NUMBER',
  'ONECLI_URL',
  'ONECLI_API_KEY',   // ← add this line (upstream PR #1777, v1.2.53)
  'TZ',
]);

// ... (existing exports) ...

export const ONECLI_KEY =
  process.env.ONECLI_API_KEY || envConfig.ONECLI_API_KEY;
```

**`apps/nanoclaw/src/container-runner.ts`** — Pass `apiKey` to OneCLI constructor:
```typescript
import { ONECLI_API_KEY, ONECLI_URL } from './config.js';
// ...
const onecli = new OneCLI({ url: ONECLI_URL, apiKey: ONECLI_API_KEY });
```

**`apps/nanoclaw/src/container-runner.test.ts`** — Add to config mock:
```typescript
ONECLI_API_KEY: '',
```

PR title: `fix(nanoclaw): absorb upstream ONECLI_API_KEY — sync to v1.2.53`

### Step 2.2 — Add `session-cleanup.ts` to monorepo

Add `apps/nanoclaw/src/session-cleanup.ts` (copy from upstream). Update `apps/nanoclaw/src/index.ts` to call `startSessionCleanup()` at startup, following upstream's pattern.

PR title: `feat(nanoclaw): add session cleanup — sync upstream session-cleanup.ts`

**Note**: Evaluate whether the `scripts/cleanup-sessions.sh` script referenced by session-cleanup.ts needs to be added too. Upstream has it in `scripts/`; check the monorepo for its presence before adding.

### Step 2.3 — Bump version in monorepo `package.json`

After Steps 2.1 and 2.2 are merged, bump `apps/nanoclaw/package.json` version to `1.2.53` to reflect parity with upstream.

PR title: `chore(nanoclaw): bump version to 1.2.53 — upstream parity`

---

## Phase 3 — GitHub Actions Deploy Pipeline

This is the critical infrastructure change. It establishes automated propagation from monorepo to VPS.

### Step 3.1 — Create VPS deploy key (scoped to deploy-only access)

```bash
# On VPS: generate a dedicated deploy SSH key pair (no passphrase)
ssh-keygen -t ed25519 -C "nanoclaw-deploy@limitless" -f ~/.ssh/nanoclaw_deploy_key -N ""

# Add the PUBLIC key to the VPS's authorized_keys with a command restriction:
echo "command=\"/home/limitless/scripts/nanoclaw-deploy.sh\",no-port-forwarding,no-X11-forwarding,no-agent-forwarding $(cat ~/.ssh/nanoclaw_deploy_key.pub)" >> ~/.ssh/authorized_keys
```

### Step 3.2 — Create the VPS deploy script

Create `/home/limitless/scripts/nanoclaw-deploy.sh` on the VPS:

```bash
#!/bin/bash
set -euo pipefail

NANOCLAW_DIR="/home/limitless/nanoclaw"
SERVICE_LIMITLESS="nanoclaw.service"
SERVICE_MYTHOS="nanoclaw-mythos.service"

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $1"; }

log "Deploy started"
cd "$NANOCLAW_DIR"

# Pull latest from monorepo sparse checkout (see Phase 4 setup)
git fetch origin
git reset --hard origin/main
log "Pulled latest: $(git log --oneline -1)"

# Rebuild
rm -rf dist/
npm run build
log "Build complete"

# Restart LIMITLESS service
systemctl restart "$SERVICE_LIMITLESS"
log "Restarted $SERVICE_LIMITLESS"

# Deploy to MYTHOS (separate clone — see Phase 4)
MYTHOS_DIR="/home/mythos/nanoclaw"
if [ -d "$MYTHOS_DIR/.git" ]; then
  log "Deploying to MYTHOS..."
  cd "$MYTHOS_DIR"
  git fetch origin
  git reset --hard origin/main
  rm -rf dist/
  npm run build
  systemctl restart "$SERVICE_MYTHOS"
  log "Restarted $SERVICE_MYTHOS"
fi

log "Deploy complete"
```

```bash
chmod +x /home/limitless/scripts/nanoclaw-deploy.sh
```

**Note on systemctl from deploy script**: `systemctl restart` requires either `sudo` with passwordless rules for the service names, or the deploy script runs as root. Evaluate the VPS sudoers config. If needed:
```bash
# Add to /etc/sudoers.d/nanoclaw-deploy
limitless ALL=(root) NOPASSWD: /bin/systemctl restart nanoclaw.service, /bin/systemctl restart nanoclaw-mythos.service
```
Update the deploy script to prefix with `sudo`.

### Step 3.3 — Add deploy key private key to GitHub Secrets

In the `LIMITLESS-LONGEVITY/limitless` repo (or organization):
- `Settings → Secrets and variables → Actions → New secret`
- Name: `VPS_DEPLOY_KEY`
- Value: contents of `~/.ssh/nanoclaw_deploy_key` (the PRIVATE key)
- Also add: `VPS_HOST` (VPS IP address), `VPS_USER` (`limitless`)

### Step 3.4 — Create GitHub Actions workflow

Create `.github/workflows/deploy-nanoclaw.yml` in the monorepo:

```yaml
name: Deploy NanoClaw

on:
  push:
    branches: [main]
    paths:
      - 'apps/nanoclaw/**'

jobs:
  deploy:
    name: Deploy to VPS
    runs-on: ubuntu-latest

    steps:
      - name: SSH deploy
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_DEPLOY_KEY }}
          script: |
            /home/limitless/scripts/nanoclaw-deploy.sh

      - name: Notify Architect on success
        if: success()
        run: |
          echo "NanoClaw deployed successfully from commit ${{ github.sha }}"

      - name: Notify Architect on failure
        if: failure()
        run: |
          echo "NanoClaw deploy FAILED for commit ${{ github.sha }}"
          # TODO: Post to #alerts Discord channel via webhook
```

**PR title**: `ci: add NanoClaw deploy pipeline (DR-002)`

**Note**: The `appleboy/ssh-action` is a widely-used, well-maintained GitHub action. Pin to a specific SHA in production use (security hardening step for Phase 3 completion).

---

## Phase 4 — VPS Git Clone Migration

After the deploy pipeline is in place, migrate both VPS deployments from their current states to git-tracked clones of the monorepo.

### Step 4.1 — Migrate LIMITLESS VPS from multi-remote clone to monorepo clone

The current LIMITLESS deployment (`/home/limitless/nanoclaw/`) is a clone of `qwibitai/nanoclaw` with multiple remotes. This must be remapped to the monorepo.

**IMPORTANT**: Do not execute this step until Phase 1 Class (a) items are absorbed (Phase 2 PRs merged).

```bash
# SSH into VPS
ssh -i ~/.ssh/limitless_hetzner limitless@<VPS_IP>

cd /home/limitless

# Stop service during migration
systemctl stop nanoclaw.service

# Backup current deployment (30-second safety net)
cp -r nanoclaw nanoclaw.backup.$(date +%Y%m%d)

# Remove the existing multi-remote clone
rm -rf nanoclaw/

# Clone the monorepo with sparse checkout (only apps/nanoclaw/)
git clone --sparse --depth=1 https://x-access-token:${GH_TOKEN}@github.com/LIMITLESS-LONGEVITY/limitless.git nanoclaw
cd nanoclaw
git sparse-checkout set apps/nanoclaw
# Note: this gives us the full monorepo structure with only apps/nanoclaw/ populated

# Alternative: full clone (simpler if bandwidth is not a concern)
# git clone https://x-access-token:${GH_TOKEN}@github.com/LIMITLESS-LONGEVITY/limitless.git nanoclaw

# Set up the working directory to match how NanoClaw expects it
# NanoClaw runs from its own directory; service ExecStart must point to the right path
# If using sparse checkout: ExecStart will be /home/limitless/nanoclaw/apps/nanoclaw/
# If symlink preferred:
ln -s /home/limitless/nanoclaw/apps/nanoclaw /home/limitless/nanoclaw-svc

# Install dependencies + build
cd /home/limitless/nanoclaw/apps/nanoclaw
npm install
npm run build

# Update systemd service ExecStart path if needed
# systemctl edit nanoclaw.service  → update WorkingDirectory and ExecStart

# Start service
systemctl start nanoclaw.service

# Verify
systemctl status nanoclaw.service
# Verify health endpoint
curl -s https://app.limitless-longevity.health/learn/api/health
```

**Rollback**: If health check fails, `systemctl stop nanoclaw.service && rm -rf nanoclaw && mv nanoclaw.backup.$(date +%Y%m%d) nanoclaw && cd nanoclaw && npm run build && systemctl start nanoclaw.service`

### Step 4.2 — Migrate MYTHOS VPS from rsync copy to git clone

The current MYTHOS deployment (`/home/mythos/nanoclaw/`) is not a git repo. Convert it.

```bash
# SSH into VPS as mythos user
ssh -i ~/.ssh/limitless_hetzner limitless@<VPS_IP>
sudo -u mythos bash

cd /home/mythos

# Stop service during migration
systemctl stop nanoclaw-mythos.service

# Backup
cp -r nanoclaw nanoclaw.backup.$(date +%Y%m%d)

# Remove rsync copy
rm -rf nanoclaw/

# Clone the monorepo (same as LIMITLESS but under mythos user)
git clone --sparse --depth=1 https://x-access-token:${MYTHOS_GH_TOKEN}@github.com/LIMITLESS-LONGEVITY/limitless.git nanoclaw
cd nanoclaw
git sparse-checkout set apps/nanoclaw

# Install dependencies + build
cd /home/mythos/nanoclaw/apps/nanoclaw
npm install
npm run build

# Start service
systemctl start nanoclaw-mythos.service

# Verify (MYTHOS has no public health endpoint yet — check service status)
systemctl status nanoclaw-mythos.service
```

**Note on `MYTHOS_GH_TOKEN`**: The MYTHOS NanoClaw needs a token to clone from `LIMITLESS-LONGEVITY/limitless`. Once DR-001 is implemented, this will be the `mythos-agent` GitHub App installation token. Until then, use the CEO's `GH_TOKEN` (read-only for cloning the public/private monorepo). The token only needs `contents: read` scope for the initial clone.

**Note on deploy script**: Update `/home/limitless/scripts/nanoclaw-deploy.sh` Step 3.2 to reference the new MYTHOS path (`/home/mythos/nanoclaw/apps/nanoclaw/`).

---

## Phase 5 — MYTHOS OneCLI Provisioning

After Phase 4 is complete and MYTHOS is running from a git clone, provision a dedicated OneCLI instance for MYTHOS.

### Step 5.1 — Install OneCLI on MYTHOS VPS user

```bash
# SSH into VPS as mythos user
sudo -u mythos bash

# Install OneCLI (follow current onecli.sh installation docs)
curl -fsSL https://onecli.sh/install.sh | bash

# Configure to run on a different port from LIMITLESS (default 10254)
# If LIMITLESS already uses 10254, configure MYTHOS on 10255
export ONECLI_PORT=10255
```

**Check for port collision**: Verify LIMITLESS's OneCLI port before assigning MYTHOS's port.
```bash
ss -tlnp | grep 1025
# Check what LIMITLESS's nanoclaw .env sets ONECLI_URL to
```

### Step 5.2 — Configure MYTHOS `.env`

Add to `/home/mythos/nanoclaw/apps/nanoclaw/.env` (or the MYTHOS-equivalent `.env` path):

```bash
# OneCLI gateway — MYTHOS dedicated instance
ONECLI_URL=http://localhost:10255
ONECLI_API_KEY=<mythos-onecli-api-key>  # From MYTHOS's OneCLI configuration
```

### Step 5.3 — Remove CLAUDE_CODE_OAUTH_TOKEN direct injection (post-OneCLI)

Once MYTHOS OneCLI is live and handling Anthropic credential routing, the `CLAUDE_CODE_OAUTH_TOKEN` direct `-e` injection (installed by PR #53) is no longer needed. The OneCLI gateway will intercept the Anthropic API calls and inject the credential.

**Verification before removing**:
```bash
# In a MYTHOS test container, confirm Claude Code gets credentials via OneCLI
# (not via -e flag) by checking container env:
# docker inspect <container-id> | jq '.[0].Config.Env' | grep -v CLAUDE_CODE
```

Remove from `apps/nanoclaw/src/container-runner.ts` the PR #53 `CLAUDE_CODE_OAUTH_TOKEN` injection block, and file a new PR.

**PR title**: `fix(nanoclaw): remove CLAUDE_CODE_OAUTH_TOKEN direct injection — MYTHOS now uses OneCLI`

---

## Phase 6 — DR-001 Phase 3 Implementation (GitHub App Token)

**This phase is unblocked by Phase 4 completing.** Once the monorepo vendored copy is the authoritative source and the deploy pipeline is live, the DR-001 Phase 3 implementation PR can be executed.

**Landing target**: `apps/nanoclaw/src/container-runner.ts` in the monorepo.

**Deployment**: Automatic via the GitHub Actions pipeline when the PR merges to main.

File a separate engineer handoff after DR-002 is ratified and Phases 1–4 are complete. PR title: `feat(nanoclaw): GitHub App installation token at container spawn (DR-001 Phase 3)`.

---

## Phase 7 — Ongoing Upstream Sync Protocol

Establish a repeatable process for pulling upstream NanoClaw changes into the monorepo:

### Upstream sync frequency
- **Weekly check**: Architect reviews upstream commit log (`gh api repos/qwibitai/nanoclaw/commits?per_page=20`) in the Monday briefing
- **Immediate action trigger**: Any upstream commit touching `src/container-runner.ts`, `src/config.ts`, or `src/@onecli-sh/sdk` import — these are high-collision files with LIMITLESS-specific changes

### Sync procedure (per upstream release)
```bash
# Step 1: Update LIMITLESS-LONGEVITY/nanoclaw fork to upstream HEAD
cd /tmp
git clone https://github.com/LIMITLESS-LONGEVITY/nanoclaw.git
cd nanoclaw
git remote add upstream https://github.com/qwibitai/nanoclaw.git
git fetch upstream
git merge upstream/main  # or cherry-pick specific commits
git push origin main

# Step 2: Compare fork with monorepo vendored copy
# (Identify what's new in fork vs monorepo)
# File monorepo PR: feat(nanoclaw): sync upstream vX.X.XX
```

### LIMITLESS-specific patch management
Maintain a `docs/plans/nanoclaw-upstream-patches.md` document listing all LIMITLESS-specific patches and which upstream files they touch. Before each upstream sync, check the collision table.

| Patch | File | Upstream collision risk |
|---|---|---|
| Discord channel | `src/channels/discord.ts` | Low (new file, no upstream equivalent) |
| MONOREPO_PATH + WORKTREE_BASE | `src/config.ts` | Medium (upstream adds new config vars to same file) |
| NOTIFICATION_CHANNELS | `src/config.ts` | Medium |
| OneCLI guard (PR #53) | `src/container-runner.ts` | High (upstream frequently changes this file) |
| DR-001 GitHub App token (Phase 6) | `src/container-runner.ts` | High |

---

## Rollout Sequencing Summary

| Phase | Action | Prerequisite | Rollback |
|---|---|---|---|
| **1** | VPS drift audit | DR-002 ratified | N/A (read-only) |
| **2.1** | Absorb ONECLI_API_KEY into monorepo | Phase 1 complete | Revert PR |
| **2.2** | Absorb session-cleanup.ts | Phase 1 complete | Revert PR |
| **2.3** | Bump version to 1.2.53 | 2.1 + 2.2 merged | Revert PR |
| **3.1** | Create VPS deploy key | Phases 2.x merged | Delete key |
| **3.2** | Create deploy script on VPS | Phase 3.1 | Delete script |
| **3.3** | Add secrets to GitHub | Phase 3.1 | Delete secrets |
| **3.4** | Add GitHub Actions workflow | Phases 3.1–3.3 | Revert PR; delete workflow |
| **4.1** | Migrate LIMITLESS VPS to monorepo clone | Phase 3 live + tested | Restore backup |
| **4.2** | Migrate MYTHOS VPS to monorepo clone | Phase 4.1 stable | Restore backup |
| **5.1–5.3** | MYTHOS OneCLI provisioning | Phase 4.2 stable | Remove OneCLI; restore PR #53 behavior |
| **6** | DR-001 Phase 3 (GitHub App token) | Phase 4 complete | Revert engineer PR |
| **7** | Establish upstream sync protocol | Phase 6 complete | N/A (process doc) |

---

## Post-Rollout Monitoring

After all phases complete, verify monthly:
- [ ] Deploy pipeline fires on `apps/nanoclaw/**` push to `main`
- [ ] LIMITLESS VPS `git log --oneline -1` matches monorepo `main` HEAD
- [ ] MYTHOS VPS `git log --oneline -1` matches monorepo `main` HEAD
- [ ] No uncommitted modifications on either VPS (`git status` = clean)
- [ ] MYTHOS OneCLI responding: `curl -s http://localhost:10255/api/health`
- [ ] Upstream NanoClaw version delta ≤ 2 minor versions (if exceeded, schedule sync sprint)

---

*This plan is plan-only. No implementation begins until DR-002 is ratified and CEO explicitly authorizes each phase.*
