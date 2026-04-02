# Handoff: Fix Claude Review Workflow (Invalid Action Inputs)

**Date:** 2026-03-27
**From:** Main Instance (Operator)
**To:** Workbench Instance (Engineer)
**Priority:** Low — non-blocking but causes CI warnings/failures
**Scope:** 3 files across 2 repos + 1 template

---

## Problem

The `claude-review.yml` workflow uses three inputs that don't exist in `anthropics/claude-code-action@v1`:

```
##[warning]Unexpected input(s) 'model', 'review_on_open', 'review_on_push'
```

The action still runs but logs warnings and may fail on cleanup steps ("Bad credentials" on token revocation).

## Root Cause

The action's API changed — `model` was removed (use `claude_args` instead), and `review_on_open`/`review_on_push` were never valid inputs. Review triggering is controlled by the workflow's `on:` event configuration.

## Fix

### Current (broken):
```yaml
- uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    model: claude-sonnet-4-6
    claude_args: "--max-turns 5"
    trigger_phrase: "@claude"
    review_on_open: true
    review_on_push: false
```

### Fixed:
```yaml
- uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    claude_args: "--model claude-sonnet-4-6 --max-turns 5"
    trigger_phrase: "@claude"
```

The model is passed via `claude_args` as `--model claude-sonnet-4-6`. Review-on-open behavior is already handled by the `on: pull_request: types: [opened, synchronize]` trigger. No separate flag needed.

## Files to Update

| # | File | Repo |
|---|------|------|
| 1 | `limitless-paths/.github/workflows/claude-review.yml` | limitless-paths |
| 2 | `limitless-hub/.github/workflows/claude-review.yml` | limitless-hub (if added by scaffold — check first) |
| 3 | `docs/superpowers/templates/claude-review-workflow.yml` | umbrella repo (template for all future repos) |

## Verification

After pushing, open a test PR on limitless-paths. The "Claude PR Review" job should:
1. Run without `##[warning]Unexpected input(s)` in the logs
2. Post a review comment on the PR
3. Not fail with "Bad credentials" on cleanup
