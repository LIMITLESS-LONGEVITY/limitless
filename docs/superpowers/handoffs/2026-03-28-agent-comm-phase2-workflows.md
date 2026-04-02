# Agent Communication Phase 2 — CI Workflows

Three GitHub Actions workflows to add. These implement the CI-reactive orchestration layer.

**Context:** Phase 1 (IPC mailbox + Telegram) is live. CI Health Monitor scheduled agent is live (every 6h). These workflows complete Phase 2.

---

## Task 1: Cross-Repo Dispatch (`limitless-paths`)

When a PR merges on `limitless-paths` with an `affects:*` label, auto-create a follow-up issue on the affected repo.

### File: `limitless-paths/.github/workflows/cross-repo-dispatch.yml`

```yaml
name: Cross-Repo Dispatch
on:
  pull_request:
    types: [closed]

jobs:
  dispatch:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Check for cross-repo labels
        id: check
        run: |
          LABELS='${{ toJSON(github.event.pull_request.labels.*.name) }}'
          echo "affects_hub=$(echo $LABELS | jq 'map(select(. == "affects:hub")) | length')" >> $GITHUB_OUTPUT
          echo "affects_dt=$(echo $LABELS | jq 'map(select(. == "affects:dt")) | length')" >> $GITHUB_OUTPUT

      - name: Create HUB follow-up issue
        if: steps.check.outputs.affects_hub != '0'
        env:
          GH_TOKEN: ${{ secrets.CROSS_REPO_TOKEN }}
        run: |
          gh issue create --repo LIMITLESS-LONGEVITY/limitless-hub \
            --title "Follow-up: PATHS PR #${{ github.event.pull_request.number }} — ${{ github.event.pull_request.title }}" \
            --body "Merged PR affects HUB: ${{ github.event.pull_request.html_url }}\n\nReview for impact and update as needed." \
            --label "cross-repo,agent:hub"

      - name: Create DT follow-up issue
        if: steps.check.outputs.affects_dt != '0'
        env:
          GH_TOKEN: ${{ secrets.CROSS_REPO_TOKEN }}
        run: |
          gh issue create --repo LIMITLESS-LONGEVITY/limitless-digital-twin \
            --title "Follow-up: PATHS PR #${{ github.event.pull_request.number }} — ${{ github.event.pull_request.title }}" \
            --body "Merged PR affects Digital Twin: ${{ github.event.pull_request.html_url }}\n\nReview for impact and update as needed." \
            --label "cross-repo,agent:dt"
```

### Setup required:
1. Create a fine-grained GitHub PAT with `issues:write` on all 3 repos
2. Add as secret `CROSS_REPO_TOKEN` on `limitless-paths`
3. Add labels `affects:hub`, `affects:dt`, `affects:paths`, `cross-repo` to all repos

### Also add to HUB and DT:
Same workflow pattern in `limitless-hub/.github/workflows/cross-repo-dispatch.yml` and `limitless-digital-twin/.github/workflows/cross-repo-dispatch.yml` — adjusted for their respective target repos.

---

## Task 2: Post-Deploy Notification (`limitless-paths`)

After push to main, wait for Render deploy, smoke test, notify via Telegram.

### File: `limitless-paths/.github/workflows/post-deploy-notify.yml`

```yaml
name: Post-Deploy Notification
on:
  push:
    branches: [main]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for Render deploy
        run: sleep 180

      - name: Health check
        id: health
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://paths-api.limitless-longevity.health/learn/api/health)
          echo "status=$STATUS" >> $GITHUB_OUTPUT
          echo "Health: $STATUS"

      - name: Notify via Telegram
        env:
          BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: |
          if [ "${{ steps.health.outputs.status }}" = "200" ]; then
            MSG="✅ PATHS deployed to production. Health: 200. Commit: ${{ github.event.head_commit.message }}"
          else
            MSG="🔴 PATHS deploy may have failed. Health: ${{ steps.health.outputs.status }}. Check Render dashboard."
          fi
          curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
            -d chat_id="${CHAT_ID}" \
            -d text="${MSG}" \
            -d parse_mode="Markdown"
```

### Setup required:
1. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as secrets on `limitless-paths`
2. Also add to `limitless-hub` and `limitless-digital-twin` for their own post-deploy notifications
3. Adjust health check URLs per repo:
   - HUB: `https://limitless-hub.onrender.com/book/api/health` (until gateway is live, then `app.limitless-longevity.health/book/api/health`)
   - DT: `https://limitless-digital-twin.onrender.com/api/health`

---

## Task 3: Issue State Machine (`limitless-paths`)

Auto-transition GitHub Issue labels based on PR lifecycle events.

### File: `limitless-paths/.github/workflows/issue-state-machine.yml`

```yaml
name: Issue State Machine
on:
  pull_request:
    types: [opened, synchronize, closed]
  check_suite:
    types: [completed]

jobs:
  update-labels:
    runs-on: ubuntu-latest
    steps:
      - name: Extract issue number from PR body
        id: issue
        run: |
          # Look for "Fixes #N" or "Closes #N" in PR body
          ISSUE=$(echo "${{ github.event.pull_request.body }}" | grep -oP '(?:Fixes|Closes|Resolves)\s+#\K\d+' | head -1)
          echo "number=$ISSUE" >> $GITHUB_OUTPUT
          echo "Found issue: $ISSUE"

      - name: PR opened → status:pr-open
        if: github.event.action == 'opened' && steps.issue.outputs.number != ''
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh issue edit ${{ steps.issue.outputs.number }} --remove-label "status:in-progress" --add-label "status:pr-open" 2>/dev/null || true

      - name: PR merged → status:awaiting-qa
        if: github.event.action == 'closed' && github.event.pull_request.merged == true && steps.issue.outputs.number != ''
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh issue edit ${{ steps.issue.outputs.number }} --remove-label "status:pr-open" --add-label "status:awaiting-qa" 2>/dev/null || true

      - name: Notify via Telegram on merge
        if: github.event.action == 'closed' && github.event.pull_request.merged == true
        env:
          BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: |
          curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
            -d chat_id="${CHAT_ID}" \
            -d text="PR #${{ github.event.pull_request.number }} merged: ${{ github.event.pull_request.title }}" \
            -d parse_mode="Markdown" || true
```

### Setup required:
- `GITHUB_TOKEN` is automatic (no setup needed)
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` — same secrets as Task 2
- Add to all 3 repos

---

## GitHub Secrets Needed

| Secret | Repos | Value |
|--------|-------|-------|
| `CROSS_REPO_TOKEN` | limitless-paths, limitless-hub, limitless-digital-twin | Fine-grained PAT with `issues:write` on all repos |
| `TELEGRAM_BOT_TOKEN` | All 3 repos | `8695345830:AAEOituf4m2ibGfllHxTIbnlaGGIVZzdJyI` |
| `TELEGRAM_CHAT_ID` | All 3 repos | `777226800` |

**Note:** The Telegram secrets are the same values from `~/.config/limitless/telegram.env`. The `CROSS_REPO_TOKEN` needs to be created by the human (fine-grained PAT at https://github.com/settings/tokens).

---

## Priority Order

1. **Task 2** (post-deploy notify) — immediate value, low risk
2. **Task 3** (issue state machine) — automates label management
3. **Task 1** (cross-repo dispatch) — needs `CROSS_REPO_TOKEN` PAT created first
