# Agent Identity Rollout Plan — DR-001 Implementation

**Date**: 2026-04-19
**Author**: Architect
**Status**: Proposed — awaiting CEO ratification of DR-001 before execution
**Implements**: `docs/decisions/DR-001-agent-identity-and-ratification-flow.md`
**Operator**: CEO (`chmod735`) — all provisioning steps require org-owner access

---

## Prerequisites

Before starting:
- [ ] DR-001 has been ratified (CEO Approving Review on the PR that introduced this document)
- [ ] NanoClaw engineer has been briefed on the container-runner changes required (separate handoff)
- [ ] VPS SSH access confirmed
- [ ] `gh` CLI authenticated as `chmod735` on the host machine

---

## Phase 1 — GitHub App Provisioning

### Step 1.1 — Register `limitless-agent` GitHub App

1. Navigate to: `https://github.com/organizations/LIMITLESS-LONGEVITY/settings/apps/new`
2. Fill in App settings:
   - **App name**: `limitless-agent`
   - **Homepage URL**: `https://github.com/LIMITLESS-LONGEVITY`
   - **Webhook**: Disabled (uncheck "Active")
   - **Permissions** — Repository permissions only:
     - Contents: **Read and write**
     - Pull requests: **Read and write**
     - Metadata: **Read** (auto-selected, read-only)
     - Commit statuses: **Read and write** (for status checks, if needed)
     - All others: **No access**
   - **Where can this GitHub App be installed?**: Only on this account
3. Click "Create GitHub App"
4. Record the **App ID** (displayed on the App settings page). Store in plaintext as it is not a secret:
   ```
   LIMITLESS_APP_ID=<app-id>
   ```
5. Scroll to "Private keys" section → Click "Generate a private key"
6. Download the `.pem` file. This is the high-value credential. **Do not commit it anywhere.**
7. Copy the PEM content for storage in Step 2.

### Step 1.2 — Register `mythos-agent` GitHub App

Repeat Step 1.1 with:
- **App name**: `mythos-agent`
- Same permissions as above
- Record `MYTHOS_APP_ID=<app-id>`
- Download separate `.pem` private key

### Step 1.3 — Install `limitless-agent` on `LIMITLESS-LONGEVITY/limitless`

1. On the `limitless-agent` App settings page, click "Install App"
2. Select organization: `LIMITLESS-LONGEVITY`
3. Select "Only select repositories" → choose `LIMITLESS-LONGEVITY/limitless`
4. Click "Install"
5. Record the **Installation ID** from the URL after redirect (format: `https://github.com/organizations/LIMITLESS-LONGEVITY/settings/installations/<installation-id>`):
   ```
   LIMITLESS_APP_INSTALLATION_ID=<installation-id>
   ```

Alternatively via `gh` CLI (after installation):
```bash
gh api /app/installations --jq '.[] | select(.account.login == "LIMITLESS-LONGEVITY") | {id, account: .account.login}'
```

### Step 1.4 — Install `mythos-agent` on MYTHOS repos

1. Install `mythos-agent` on `chmod735-dor/mythos`:
   - Select org: `chmod735-dor` (or personal account if that's where the org lives)
   - Select repos: `mythos` and `mythos-ops`
   - Record installation ID as `MYTHOS_APP_INSTALLATION_ID=<installation-id>`

### Step 1.5 — Retrieve Bot User IDs for git config

GitHub App bot users have a numeric user ID required for the `user.email` in git config. Retrieve each:

```bash
# For limitless-agent
gh api users/limitless-agent%5Bbot%5D --jq '{id, login}'
# → {"id": 12345678, "login": "limitless-agent[bot]"}

# For mythos-agent
gh api users/mythos-agent%5Bbot%5D --jq '{id, login}'
# → {"id": 87654321, "login": "mythos-agent[bot]"}
```

Record:
```
LIMITLESS_BOT_USER_ID=<id>
MYTHOS_BOT_USER_ID=<id>
```

---

## Phase 2 — VPS Credential Storage

### Step 2.1 — Store credentials in NanoClaw `.env`

On the VPS hosting NanoClaw for LIMITLESS, add to `/home/limitless/nanoclaw/.env`:

```bash
# GitHub App — limitless-agent
LIMITLESS_APP_ID=<app-id>
LIMITLESS_APP_INSTALLATION_ID=<installation-id>
LIMITLESS_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
<pem-content-with-literal-newlines>
-----END RSA PRIVATE KEY-----"

# Bot user identity (for git config inside containers)
LIMITLESS_BOT_USER_ID=<bot-user-id>

# CEO's GH_TOKEN remains for administrative operations (non-agent PRs, repo management)
GH_TOKEN=<ceo-token>
```

On the VPS hosting NanoClaw for MYTHOS, add to `/home/mythos/nanoclaw/.env` (or the MYTHOS-equivalent path):

```bash
# GitHub App — mythos-agent
MYTHOS_APP_ID=<app-id>
MYTHOS_APP_INSTALLATION_ID=<installation-id>
MYTHOS_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
<pem-content-with-literal-newlines>
-----END RSA PRIVATE KEY-----"

# Bot user identity
MYTHOS_BOT_USER_ID=<bot-user-id>

# CEO's GH_TOKEN remains for admin operations
GH_TOKEN=<ceo-token>
```

**Security requirements for `.env` file:**
```bash
chmod 600 /home/limitless/nanoclaw/.env
chown limitless:limitless /home/limitless/nanoclaw/.env
```

The private key in the `.env` must have literal newlines preserved (not escaped `\n`). Test parsing with:
```bash
node -e "const k = process.env.LIMITLESS_APP_PRIVATE_KEY; console.log(k.startsWith('-----BEGIN'));"
```

### Step 2.2 — File permissions audit

Verify `.env` is not readable by other users:
```bash
ls -la /home/limitless/nanoclaw/.env
# Expected: -rw------- 1 limitless limitless ...
```

---

## Phase 3 — NanoClaw Container-Runner Update

This phase requires a separate engineer handoff. The Architect is not implementing code changes in this PR. The following describes what the implementation must achieve.

### Required change: Token generation at container spawn time

**Current flow** (container-runner.ts ~L268–270):
```typescript
if (process.env.GH_TOKEN) {
  args.push('-e', `GH_TOKEN=${process.env.GH_TOKEN}`);
  args.push('-e', `GITHUB_TOKEN=${process.env.GH_TOKEN}`);
}
```

**Required flow** (pseudocode — engineer implements):
```typescript
// Generate GitHub App installation token (1-hour TTL)
const appToken = await generateInstallationToken({
  appId: process.env.LIMITLESS_APP_ID,           // or MYTHOS_APP_ID
  installationId: process.env.LIMITLESS_APP_INSTALLATION_ID,
  privateKey: process.env.LIMITLESS_APP_PRIVATE_KEY,
});

if (appToken) {
  args.push('-e', `GH_TOKEN=${appToken}`);
  args.push('-e', `GITHUB_TOKEN=${appToken}`);
} else {
  // Fallback: CEO token for non-agent containers or if App token generation fails
  logger.warn('App token generation failed — falling back to GH_TOKEN');
  if (process.env.GH_TOKEN) {
    args.push('-e', `GH_TOKEN=${process.env.GH_TOKEN}`);
    args.push('-e', `GITHUB_TOKEN=${process.env.GH_TOKEN}`);
  }
}
```

**Token generation function** (`generateInstallationToken`):

The function must:
1. Sign a JWT: `{ iss: APP_ID, iat: now - 60, exp: now + 540 }` signed with `RS256` using the private key
2. POST to `https://api.github.com/app/installations/{INSTALLATION_ID}/access_tokens` with `Authorization: Bearer {jwt}`
3. Parse and return `response.data.token`
4. Cache the token until 55 minutes after generation (conservative margin before 60-minute expiry)
5. On cache miss or expiry, regenerate

**Library options** (engineer chooses based on existing dependencies):
- `@octokit/auth-app` — purpose-built, handles JWT signing and token exchange
- `jsonwebtoken` + `node-fetch` — manual implementation (more explicit, zero new dependencies if already present)

**Git config injection** (required in settings.json or as `-e` args):
```typescript
// Must also be injected so git commits carry the correct bot identity
const botUserId = process.env.LIMITLESS_BOT_USER_ID;  // e.g. "12345678"
const botLogin  = 'limitless-agent[bot]';
const botEmail  = `${botUserId}+${botLogin}@users.noreply.github.com`;

// Inject into container settings.json env (alongside GH_TOKEN)
mergedEnv['GIT_AUTHOR_NAME']    = botLogin;
mergedEnv['GIT_AUTHOR_EMAIL']   = botEmail;
mergedEnv['GIT_COMMITTER_NAME'] = botLogin;
mergedEnv['GIT_COMMITTER_EMAIL']= botEmail;
```

The settings.json approach (writing into Claude Code's env config) ensures git uses the bot identity for all commits made inside the container. The `GIT_AUTHOR_*` and `GIT_COMMITTER_*` environment variables override any local `git config user.*` settings.

**Scope**: This change applies to agent containers only (groups where `containerConfig?.envVars?.AGENT_ROLE` is set). Non-agent containers (e.g., direct CEO-operated sessions) retain the CEO's `GH_TOKEN`.

**Engineer handoff reference**: Create a handoff to `#workbench-ops` or the appropriate app Architect after DR-001 is ratified. PR title for the implementation: `feat(nanoclaw): GitHub App installation token at container spawn (DR-001)`.

---

## Phase 4 — Git Configuration Verification

After the container-runner update is deployed, verify inside a spawned agent container:

```bash
# Verify git identity resolves to the bot account
git config user.name
# Expected: limitless-agent[bot]

git config user.email
# Expected: 12345678+limitless-agent[bot]@users.noreply.github.com

# Verify gh CLI is authenticated as the App bot (not the CEO)
gh auth status
# Expected: Logged in to github.com account limitless-agent[bot] (...)

# Verify push works
git checkout -b test/dr-001-identity-check
echo "test" >> /tmp/test.txt
git add /tmp/test.txt
git commit -m "chore: DR-001 identity verification test"
git push origin test/dr-001-identity-check
# → Should succeed; commit author should show as limitless-agent[bot] on GitHub

# Create a test PR
gh pr create --title "chore: DR-001 identity verification" --body "Test PR — delete after verification" --draft
# → PR author should show as limitless-agent[bot] in GitHub UI

# CEO navigates to the PR and clicks "Approve"
# → Should succeed without self-approval error

# Verify: CEO merges the test PR
# Clean up: delete the test branch
git push origin --delete test/dr-001-identity-check
```

**Expected results:**
- [ ] `git config user.name` returns `limitless-agent[bot]`
- [ ] `git config user.email` returns `{bot-user-id}+limitless-agent[bot]@users.noreply.github.com`
- [ ] `gh auth status` shows `limitless-agent[bot]` (not `chmod735`)
- [ ] GitHub PR author field shows `limitless-agent[bot]`
- [ ] CEO can submit Approving Review on the test PR
- [ ] Squash merge commit on `main` shows "Verified" badge (GitHub-signed server-side)

---

## Phase 5 — CODEOWNERS and PR Template Updates

### Step 5.1 — Update CODEOWNERS comments (no functional change)

In `LIMITLESS-LONGEVITY/limitless/.github/CODEOWNERS`, update the agent note:
```
# Note: AI Architect agents operate as limitless-agent[bot] (GitHub App bot user)
# and cannot be CODEOWNERS. Human CEO (chmod735) is the required approver. See DR-001.
```

In `chmod735-dor/mythos/.github/CODEOWNERS`:
```
# Note: MYTHOS Architect operates as mythos-agent[bot] (GitHub App bot user)
# and cannot be CODEOWNERS. CEO required for all paths. See DR-001.
```

### Step 5.2 — Update PR templates (no functional change)

Replace the footer `🤖 Agent-authored — human ratification required before merge.` with:
```
🤖 Authored by `limitless-agent[bot]` — human ratification required before merge. See DR-001.
```
(or `mythos-agent[bot]` for MYTHOS repos)

---

## Phase 6 — Retention Export Update

### Step 6.1 — Update export cron to use CEO's token for gh API calls

The weekly/daily retention export cron (`gh api` calls for PR history) must continue to use the CEO's `GH_TOKEN`, not the App token. The App token is scoped to `contents: write` and `pull-requests: write` — sufficient for pushing and creating PRs, but the retention export requires read access to historical PRs with full body content.

No change required to the export cron if it runs with the CEO's `GH_TOKEN` (which it does today). Verify:
```bash
# Confirm export cron uses GH_TOKEN (CEO) not app token
grep GH_TOKEN /path/to/retention-export.sh
# Should reference ${GH_TOKEN} or equivalent CEO token
```

---

## Phase 7 — Rollout Sequencing

Apply in this order:

| Step | Action | Verifiable? | Rollback? |
|---|---|---|---|
| 1 | Register GitHub Apps (Steps 1.1–1.2) | ✅ App settings page | Delete App |
| 2 | Install Apps on repos (Steps 1.3–1.4) | ✅ `gh api /app/installations` | Uninstall App |
| 3 | Retrieve bot user IDs (Step 1.5) | ✅ `gh api users/...` | N/A (read-only) |
| 4 | Add credentials to VPS `.env` (Phase 2) | ✅ `node -e` parse test | Remove env vars |
| 5 | Deploy container-runner update (Phase 3) | ✅ Via dedicated engineer PR | Revert the PR |
| 6 | Verify identity flow in container (Phase 4) | ✅ Explicit checklist | Revert engineer PR |
| 7 | Update CODEOWNERS comments (Phase 5) | ✅ File diff | Revert PR |
| 8 | Update PR templates (Phase 5) | ✅ File diff | Revert PR |
| 9 | Confirm retention export unaffected (Phase 6) | ✅ Manual run | N/A (read-only) |

**Do not proceed to Step 5 (container-runner deployment) until Steps 1–4 are fully verified.** If the App token is injected but not correctly generated, agents will have no GitHub authentication and all git operations will fail.

---

## Token Rotation Procedure

### App private key rotation (recommended: annually or on key compromise)

```bash
# 1. Generate a NEW private key (do not delete the old one yet)
# GitHub: App Settings → Private keys → Generate a private key
# Download the new .pem file

# 2. Add new key to .env (temporarily have both old and new)
LIMITLESS_APP_PRIVATE_KEY_NEW="-----BEGIN RSA PRIVATE KEY-----
<new-pem-content>
-----END RSA PRIVATE KEY-----"

# 3. Update NanoClaw to use new key variable (or swap the value of LIMITLESS_APP_PRIVATE_KEY)
# Restart NanoClaw service
systemctl restart nanoclaw-limitless.service

# 4. Verify new key works (spawn a test container, confirm git push succeeds)

# 5. Delete old key from GitHub App settings
# GitHub: App Settings → Private keys → Delete old key

# 6. Remove LIMITLESS_APP_PRIVATE_KEY_NEW from .env; LIMITLESS_APP_PRIVATE_KEY now holds the new value
```

Multiple private keys can be active simultaneously on a GitHub App — this enables zero-downtime rotation.

### Installation token (no manual rotation)

Installation tokens expire automatically after 1 hour. NanoClaw generates a fresh token at each container spawn. No manual rotation required.

---

## Recovery Procedure

### Scenario 1: Private key compromised

1. Immediately revoke the compromised key in GitHub App settings (App → Private keys → Delete)
2. Generate a replacement private key
3. Update VPS `.env` with new key
4. Restart NanoClaw service
5. Verify token generation works in test container
6. Audit GitHub's org audit log for any unauthorized pushes during the exposure window

### Scenario 2: GitHub App suspended or deleted

1. Activate Option A fallback immediately:
   - Create `limitless-agent-bot` machine user account (CEO creates, using a separate email)
   - Generate fine-grained PAT with `contents: write`, `pull-requests: write`
   - Submit PAT for org-owner approval (required for fine-grained PATs)
   - Update VPS `.env`: `GH_TOKEN_AGENT=<bot-pat>` (separate from CEO's `GH_TOKEN`)
   - Update container-runner to inject `GH_TOKEN_AGENT` for agent containers
2. File a governance amendment PR noting the identity model change
3. Investigate the cause of App suspension and remediate before re-registering the App

### Scenario 3: GitHub changes `[bot]` attribution policy

1. Assess impact on MiFID II audit trail (consult legal if needed)
2. The `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` trailer remains as a secondary attribution record in all commit messages — independent of GitHub's UI-layer attribution
3. Consider adding `Authored-by-agent: {agent-name}` as a mandatory commit footer for all agent commits (this is a commit message convention, independent of GitHub's identity system)
4. File a governance amendment PR

### Scenario 4: VPS `.env` credential leak

1. Immediately rotate: App private key(s), CEO `GH_TOKEN`
2. Audit org audit log for unauthorized pushes, PR creations, or repo access
3. Review which commits were pushed during the exposure window
4. For MYTHOS: notify MiFID II compliance function if any regulated algorithm changes may have been tampered with

---

## Ongoing Monitoring

After rollout, verify monthly:
- [ ] App installation still active: `gh api /app/installations`
- [ ] Bot user IDs unchanged (stable after initial assignment)
- [ ] Agent PRs showing `limitless-agent[bot]` / `mythos-agent[bot]` in author field
- [ ] CEO can still submit Approving Reviews on agent PRs
- [ ] No `GH_TOKEN` (CEO token) leaking into agent container logs

---

*This plan is plan-only. No implementation begins until DR-001 is ratified and CEO explicitly authorizes rollout.*
