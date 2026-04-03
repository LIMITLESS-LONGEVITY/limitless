# Workflow Enforcement Gap Analysis & Remediation Plan

**Status: FULLY IMPLEMENTED (2026-03-27)**

All three enforcement layers are active:
- GitHub Branch Protection: ACTIVE (1 approval, "Test & Build" CI, enforce admins, no force push)
- Claude Code Hooks: ACTIVE (enforce-branch-strategy.sh, enforce-docs-only.sh, enforce-repo-boundary.sh registered in settings.local.json)
- CI Gate: ACTIVE (staging migration + tests required before merge)

## Context

During the 2026-03-27 session, both the Main and Workbench instances pushed code directly to `main`, bypassing the PR workflow we designed. Investigation revealed that **every guardrail we built was soft guidance** — CLAUDE.md instructions, memory files, agent role descriptions. None were technically enforced. The hooks we wrote (`enforce-repo-boundary.sh`, `enforce-docs-only.sh`) existed as files but were **never registered** in any `settings.local.json`. GitHub had **no branch protection rules** on `main`. Both instances had `Bash(git push:*)` in their permission allowlists with no branch filtering.

**The result:** Our governance framework is a well-documented honor system with zero enforcement machinery.

---

## Root Cause Analysis

### What Happened
1. Main instance edited `src/ai/models.ts` (code file) and pushed directly to `main` — 3 separate commits
2. Workbench instance pushed directly to `main` — multiple commits including CI config changes
3. Neither instance was blocked by any technical mechanism
4. The user noticed the deviation only when explicitly reviewing the workflow

### Why It Happened

| Layer | What We Built | Why It Failed |
|---|---|---|
| **CLAUDE.md rules** | "Workbench → PR, Main → docs only" | Soft guidance (~85% reliable). Overridden by urgency and user direction. |
| **Agent definitions** | 6 agents with role descriptions | Descriptions say "create feature branch" but nothing enforces it. |
| **Hooks (files)** | `enforce-repo-boundary.sh`, `enforce-docs-only.sh` | **Never registered** in `settings.local.json`. Dead code. |
| **Permissions** | `Bash(git push:*)` in both instances | Wildcard allows all branches. No branch-level filtering. |
| **GitHub** | No branch protection configured | Anyone can push directly, force-push, or delete branches. |
| **Git hooks** | None | No `pre-push`, `commit-msg`, or `pre-commit` hooks in repo. |

### The Core Problem

We designed governance (Phase 0-1 of agentic dev team) but implemented only the **documentation layer**, not the **enforcement layer**. Documentation tells agents what to do; enforcement prevents them from doing what they shouldn't.

---

## Remediation: Three Enforcement Layers

### Layer 1: GitHub Branch Protection (Highest Priority — Server-Side, Unbypassable)

This is the only layer that cannot be circumvented by any Claude instance or local configuration. It lives on GitHub's servers.

**Configure on `main` branch of `limitless-paths`:**

```
Settings → Branches → Add branch protection rule → Branch name: main

✓ Require a pull request before merging
  ✓ Require approvals: 1 (user self-approves for solo dev)
  ✓ Dismiss stale pull request approvals when new commits are pushed
✓ Require status checks to pass before merging
  ✓ Require branches to be up to date before merging
  Select checks: "Test & Build" (the CI job)
✓ Do not allow bypassing the above settings
  (This blocks even admins from direct pushing)
```

**What this prevents:**
- Direct `git push origin main` from ANY source → rejected by GitHub
- Merging without CI passing → blocked
- Force-pushing to main → blocked

**Exception for emergencies:** Create a GitHub Ruleset with a bypass for the repo owner, restricted to "pull requests only" — meaning even the bypass requires a PR, just without review.

**Apply to all repos:** Once `limitless-hub` and `limitless-digital-twin` are created, apply the same protection. Use an organization-level Ruleset (available on Teams plan since June 2025) to enforce across all repos automatically.

**Implementation:** Manual — you configure this in the GitHub web UI. Takes 2 minutes.

### Layer 2: Claude Code PreToolUse Hooks (Medium Priority — Local Enforcement)

These run in the Claude Code harness and block tool calls before execution. They're a defense-in-depth layer — even if GitHub protection somehow fails or the user forgets to set it up on a new repo, the hooks catch violations locally.

**New hook: `enforce-branch-strategy.sh`**

Intercepts all `Bash` tool calls containing `git push` and blocks pushes to `main` unless the current working directory is the umbrella repo (where Main pushes docs to GitHub Pages).

```bash
#!/bin/bash
# enforce-branch-strategy.sh
# Blocks git push to main from code repos. Only allows docs/content pushes.
# Register as PreToolUse hook with matcher "Bash"

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    inp = data.get('input', data)
    print(inp.get('command', ''))
except:
    print('')
" 2>/dev/null)

# Only inspect git push commands
if ! echo "$COMMAND" | grep -qE "git push"; then
    exit 0  # Not a git push — allow
fi

# Block pushes to main from code repos
if echo "$COMMAND" | grep -qE "git push.*origin\s+main|git push.*origin\s+HEAD:main"; then
    CWD=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('cwd', ''))
except:
    print('')
" 2>/dev/null)

    # Allow pushes from umbrella repo (GitHub Pages docs)
    if echo "$CWD" | grep -qE "LIMITLESS$"; then
        exit 0
    fi

    echo "BLOCKED: Direct push to main is not allowed from code repos."
    echo "Use a feature branch and create a PR instead:"
    echo "  git checkout -b feature/your-change"
    echo "  git push origin feature/your-change"
    echo "  gh pr create"
    exit 2
fi

# Block force pushes everywhere
if echo "$COMMAND" | grep -qE "git push.*--force|git push.*-f"; then
    echo "BLOCKED: Force push is never allowed."
    exit 2
fi

exit 0  # All other git push commands are allowed
```

**Register in settings:**

For the umbrella repo (`.claude/settings.local.json`):
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "bash .claude/hooks/enforce-branch-strategy.sh"
        }]
      }
    ]
  }
}
```

For the workbench (already has its own `settings.local.json`):
Same hook registration.

**Also register the existing hooks that were never activated:**
- `enforce-docs-only.sh` → on `Edit|Write` matcher in umbrella settings (for Main instance)
- `enforce-repo-boundary.sh` → referenced in agent definitions but needs settings registration

### Layer 3: Git Local Hooks (Low Priority — Belt-and-Suspenders)

A `pre-push` hook in the repo that warns (but doesn't hard-block, since GitHub protection handles that):

```bash
#!/bin/bash
# .git/hooks/pre-push — Warning on direct push to main
BRANCH=$(git rev-parse --abbrev-ref HEAD)
REMOTE="$1"

if [ "$BRANCH" = "main" ]; then
    echo "⚠️  WARNING: Pushing directly to main."
    echo "   Use a PR workflow: git checkout -b feature/x && git push origin feature/x"
    # Don't exit 1 — GitHub protection is the hard block
fi
```

This is informational, not blocking (GitHub protection is the real enforcement). Useful for human developers who might push from a terminal outside Claude Code.

---

## What Each Layer Catches

| Scenario | GitHub Protection | Claude Hook | Git Hook |
|---|---|---|---|
| Workbench pushes code to main | **BLOCKED** | **BLOCKED** | Warned |
| Main pushes code to main | **BLOCKED** | **BLOCKED** (enforce-docs-only) | Warned |
| Main pushes docs to main (umbrella) | Allowed (different repo) | Allowed (exempted) | Warned |
| Force push to main | **BLOCKED** | **BLOCKED** | Warned |
| PR without CI passing | **BLOCKED** | N/A | N/A |
| PR without review | **BLOCKED** | N/A | N/A |
| Agent edits files outside its repo | N/A | **BLOCKED** (enforce-repo-boundary) | N/A |

---

## Implementation Order

### Step 1: GitHub Branch Protection (you, 2 minutes, manual)
Go to `github.com/LIMITLESS-LONGEVITY/limitless-paths/settings/branches` and configure as described above. This is the single most impactful change — it makes direct pushes to main physically impossible at the server level.

### Step 2: Create `enforce-branch-strategy.sh` hook
New file in `.claude/hooks/`. Blocks `git push origin main` from code repos at the Claude Code level.

### Step 3: Register ALL hooks in settings.local.json
Both instances need their hooks activated:
- **Umbrella:** `enforce-branch-strategy.sh` (Bash), `enforce-docs-only.sh` (Edit|Write)
- **Workbench:** `enforce-branch-strategy.sh` (Bash), `enforce-repo-boundary.sh limitless-paths` (Edit|Write)

### Step 4: Update agent definitions
Add explicit branch strategy to each agent's system prompt:
- Engineers: "ALWAYS create a feature branch. NEVER push to main directly."
- QA Operator: "You cannot push code. You can push docs to the umbrella repo only."

### Step 5: Update CLAUDE.md and memory
Document the enforcement layers so future sessions understand what's hard-blocked vs soft-guided.

### Step 6: Apply to future repos
When `limitless-hub` and `limitless-digital-twin` are created, apply the same GitHub protection + hooks from day one. Use organization-level Ruleset to enforce automatically.

---

## Verification

After implementation, test each layer:

1. **GitHub protection:** Try `git push origin main` from limitless-paths — should be rejected by GitHub with "protected branch" error
2. **Claude hook:** In a Claude Code session, try `git push origin main` — should be blocked by hook with instructions to use a PR
3. **PR workflow:** Create a test branch, push, create PR — CI should run, require passing before merge
4. **Docs exception:** Push a CLAUDE.md change from the umbrella repo to main — should be allowed (different repo, GitHub Pages)

---

## Critical Files

### Create
- `.claude/hooks/enforce-branch-strategy.sh` — new hook blocking direct pushes to main

### Modify
- `.claude/settings.local.json` — register all 3 hooks (branch-strategy, docs-only, repo-boundary)
- `limitless-paths-workbench/.claude/settings.local.json` — register branch-strategy + repo-boundary hooks
- `.claude/agents/paths-engineer.md` — add explicit "never push to main" instruction
- `.claude/agents/hub-engineer.md` — same
- `.claude/agents/dt-engineer.md` — same
- `.claude/agents/qa-operator.md` — add "no code pushes" instruction
- `CLAUDE.md` — document enforcement layers
- `limitless-paths/CLAUDE.md` — document PR-only workflow requirement

### Configure (manual, GitHub UI)
- `github.com/LIMITLESS-LONGEVITY/limitless-paths/settings/branches` — branch protection on main
