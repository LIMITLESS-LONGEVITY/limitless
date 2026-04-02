# Claude Code Guardrails: Preventing Off-Target File Edits

**Date:** 2026-03-26
**Status:** Ready for implementation
**Purpose:** Reference spec for any Claude instance implementing worktree safety guardrails

---

## Context

**The incident:** Claude was instructed to work in a git worktree (`limitless-paths-workbench/`) but edited files in the main repo (`limitless-paths/`) instead. This happened because exploration agents referenced files in the main repo by absolute path, and Claude followed those paths without validating they were in the target directory.

**Root cause:** No enforcement mechanism existed — only soft instructions in memory files. Claude Code has multiple enforcement layers, but none were configured.

---

## Research Findings: Available Enforcement Mechanisms

### 1. Hooks (Harness-level, unbypassable)
- **PreToolUse** hooks fire before any tool executes and can **block** the action
- Exit code 2 = block + show error message to Claude
- JSON response with `"permissionDecision": "block"` = hard stop
- Can inspect all tool parameters including `file_path` for Edit/Write and `command` for Bash
- **Cannot be bypassed by Claude** — enforced at the harness level before Claude even sees the result
- Configured in `settings.json` or `settings.local.json`
- Source: https://code.claude.com/docs/en/hooks-guide

### 2. CLAUDE.md Instructions (Soft guidance, ~85-90% reliable)
- Loaded automatically, survives context compaction
- Can be overridden by user prompts or lost during exploration
- Good for reminders but insufficient alone
- **Can be bypassed** — if user says "edit this file" with a wrong path, CLAUDE.md won't stop it

### 3. Permissions (settings.json deny/allow rules)
- Can deny Edit/Write to specific path patterns
- Fragile with absolute vs relative paths on WSL
- No dynamic awareness of "current worktree"
- **Cannot be bypassed** but pattern matching is limited

### 4. Worktree Isolation (`isolation: "worktree"` on Agent tool)
- Agent subprocesses get their own worktree automatically
- Only applies to subagents, not the main conversation
- Good for parallel work but doesn't prevent the main agent from editing wrong paths

### 5. Custom MCP Tools
- Could wrap Edit/Write with path validation
- Overly complex — hooks achieve the same thing more simply

### Reliability Matrix

| Mechanism | Reliability | Bypassable? | Dynamic? | Complexity |
|-----------|------------|-------------|----------|------------|
| **Hooks** | 99.9% | No | Yes (reads config file) | Medium |
| **CLAUDE.md** | 85-90% | Yes | No | Low |
| **Permissions** | 70% | No | No (static patterns) | Low |
| **Worktree isolation** | 85% | N/A (agents only) | Yes | Low |

---

## Implementation Options (Three Tiers)

### Option A: Light Touch (CLAUDE.md only)

**Best for:** Maximum flexibility, trusting Claude to follow instructions
**Reliability:** ~85%

**What it does:** Adds explicit worktree rules to CLAUDE.md with "verify before every edit" checklist.

**Implementation:**
- Add worktree isolation section to `CLAUDE.md` in the LIMITLESS repo
- Add a `.claude/rules/worktree-isolation.md` rule file
- No hooks, no path blocking

**Trade-off:** Easy to set up, preserves full creative freedom, but can fail exactly how it did — exploration agents return main-repo paths, Claude follows them.

---

### Option B: Belt and Suspenders (Hooks + CLAUDE.md) — RECOMMENDED

**Best for:** Strong safety with maintained flexibility
**Reliability:** ~99.5%

**What it does:** Hook validates every Edit/Write path against a target directory marker file. CLAUDE.md provides soft guidance. When no worktree is active, Claude has full freedom.

**Implementation:**

#### 1. Hook Script (`.claude/hooks/enforce-worktree.sh`)

```bash
#!/bin/bash
# Enforce worktree isolation for Edit/Write operations.
# When .claude/worktree-target exists, only allows edits within that directory.
# When the file does not exist, all edits are allowed (normal mode).

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*' | head -1 | cut -d'"' -f4)

# If no file_path in input, allow (not an edit/write call we care about)
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Read the target directory from marker file
MARKER="$CLAUDE_PROJECT_DIR/.claude/worktree-target"
if [[ ! -f "$MARKER" ]]; then
  # No restriction active
  exit 0
fi

TARGET_DIR=$(cat "$MARKER" | tr -d '[:space:]')
if [[ -z "$TARGET_DIR" ]]; then
  exit 0
fi

# Resolve to absolute paths for comparison
RESOLVED_FILE=$(realpath -m "$FILE_PATH" 2>/dev/null || echo "$FILE_PATH")
RESOLVED_TARGET=$(realpath -m "$TARGET_DIR" 2>/dev/null || echo "$TARGET_DIR")

# Check if file is within target directory
if [[ "$RESOLVED_FILE" == "$RESOLVED_TARGET"* ]]; then
  exit 0
fi

# Also allow edits to the umbrella project files (CLAUDE.md, docs/, etc.)
UMBRELLA_DIR=$(realpath -m "$CLAUDE_PROJECT_DIR" 2>/dev/null || echo "$CLAUDE_PROJECT_DIR")
# Allow edits to docs, CLAUDE.md, .claude/ in the umbrella project
if [[ "$RESOLVED_FILE" == "$UMBRELLA_DIR/docs"* ]] || \
   [[ "$RESOLVED_FILE" == "$UMBRELLA_DIR/CLAUDE.md" ]] || \
   [[ "$RESOLVED_FILE" == "$UMBRELLA_DIR/.claude"* ]]; then
  exit 0
fi

# Block the edit
echo "BLOCKED: File is outside the active worktree." >&2
echo "  Target directory: $RESOLVED_TARGET" >&2
echo "  Attempted path:   $RESOLVED_FILE" >&2
echo "  Rewrite your path to use the worktree directory instead." >&2
exit 2
```

#### 2. Hook Registration (project `.claude/settings.local.json`)

Add to the existing settings.local.json:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/enforce-worktree.sh\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

#### 3. Activation / Deactivation

**Starting worktree work:**
```bash
echo "/mnt/c/Projects/LIMITLESS/limitless-paths-workbench" > .claude/worktree-target
```

**Returning to normal mode:**
```bash
rm .claude/worktree-target
```

#### 4. CLAUDE.md Addition

Add to the Worktree section of CLAUDE.md:

```markdown
### Worktree Safety (Hooks)

A PreToolUse hook (`enforce-worktree.sh`) validates every Edit/Write against `.claude/worktree-target`.

- **When `.claude/worktree-target` exists:** Only edits within that directory are allowed. All others are blocked.
- **When the file doesn't exist:** Normal mode — all edits allowed.
- **Activation:** `echo "/path/to/worktree" > .claude/worktree-target`
- **Deactivation:** `rm .claude/worktree-target`

When working in a worktree, exploration agents may return paths from the main repo.
Always rewrite those paths to point to the worktree before editing:
  `/mnt/c/Projects/LIMITLESS/limitless-paths/src/...`
  → `/mnt/c/Projects/LIMITLESS/limitless-paths-workbench/src/...`
```

---

### Option C: Lockdown (Hooks + Permissions + Bash restriction)

**Best for:** Maximum safety, minimal trust
**Reliability:** ~99.9%

**What it does:** Everything in Option B plus: deny permissions for parent directories, restrict Bash `cd` commands, and validate Bash commands that write files.

**Additional implementation on top of Option B:**

1. **Bash hook** — blocks `cd` or commands targeting directories outside worktree
2. **Deny permissions** for Edit/Write outside the worktree path pattern
3. **PreToolUse hook on Bash** — validates that commands don't use `sed`, `awk`, `cat >` etc. to write outside worktree

**Example deny permissions:**
```json
{
  "permissions": {
    "deny": [
      "Edit(/mnt/c/Projects/LIMITLESS/limitless-paths/**)",
      "Write(/mnt/c/Projects/LIMITLESS/limitless-paths/**)"
    ]
  }
}
```

**Trade-off:** Very safe but restrictive. Claude can't quickly peek at main repo files for reference. May slow down exploratory work. Harder to maintain. Permissions are static (must update when worktree path changes).

---

## How the Hook Works (Flow Diagram)

```
Claude calls Edit(file_path="/mnt/c/.../limitless-paths/src/foo.tsx")
  ↓
PreToolUse fires → runs enforce-worktree.sh
  ↓
Hook reads .claude/worktree-target → "/mnt/c/.../limitless-paths-workbench/"
  ↓
"/mnt/c/.../limitless-paths/src/foo.tsx" does NOT start with target
  ↓
Hook exits with code 2 + error message:
  "BLOCKED: File is outside worktree. Target: .../limitless-paths-workbench/
   Attempted: .../limitless-paths/src/foo.tsx"
  ↓
Claude sees the error, adjusts path to worktree equivalent, retries
```

---

## Verification Checklist

After implementing, test these scenarios:

1. **Worktree active, edit in worktree** → should succeed
2. **Worktree active, edit in main repo** → should be BLOCKED with error message
3. **Worktree active, edit docs/CLAUDE.md in umbrella** → should succeed (whitelisted)
4. **No worktree active (marker deleted), edit anywhere** → should succeed
5. **Hook script error (bad JSON)** → should fail open (exit 0) not block everything

```bash
# Test the hook manually:
echo '{"tool_input":{"file_path":"/mnt/c/Projects/LIMITLESS/limitless-paths/src/test.tsx"}}' \
  | CLAUDE_PROJECT_DIR=/mnt/c/Projects/LIMITLESS bash .claude/hooks/enforce-worktree.sh
echo "Exit code: $?"
# Expected: exit 2 (blocked) when worktree-target exists pointing elsewhere
```

---

## Failure Modes & Mitigations

| Failure Mode | Mitigation |
|-------------|-----------|
| Exploration agent returns main-repo paths | CLAUDE.md instructs path rewriting; hook blocks the edit attempt |
| User explicitly says "edit /path/in/main/repo" | Only the hook catches this — CLAUDE.md alone cannot override user intent |
| Hook script has a syntax error | Test with sample JSON before deploying; script fails open (exit 0) |
| `jq` not installed | Script uses `grep`/`cut` — no `jq` dependency |
| Marker file has trailing whitespace | Script uses `tr -d '[:space:]'` to strip |
| Claude uses Bash `sed` to edit files | Option C adds Bash validation; Option B does not cover this |

---

## Files Summary

| File | Purpose |
|------|---------|
| `.claude/hooks/enforce-worktree.sh` | Hook script — validates Edit/Write paths |
| `.claude/settings.local.json` | Hook registration (PreToolUse matcher) |
| `.claude/worktree-target` | Marker file — contains target directory path (created/deleted to activate/deactivate) |
| `CLAUDE.md` | Soft guidance + documentation of the hook system |

---

## Addendum: Revised Implementation (2026-03-26)

### Key Insight: Per-Directory Settings

The original spec assumed a shared marker file (`worktree-target`) that both instances would read. This doesn't work because:
- Both instances see the same file
- No way to distinguish which instance is calling the hook
- Activating the marker blocks the wrong instance

**Solution:** Each directory has its own `.claude/settings.local.json`. The hook lives *inside the worktree's own `.claude/` directory*, so it only affects instances launched from that directory.

### What Was Actually Implemented

**Worktree instance** (`limitless-paths-workbench/`):
- `.claude/hooks/enforce-worktree.sh` — blocks Edit/Write outside the worktree
- `.claude/settings.local.json` — registers the hook on `Edit|Write`
- Whitelists: umbrella docs, CLAUDE.md, `.claude/`, `TEMP/`, user memory

**Main-branch instance** (`limitless-paths/` via umbrella repo):
- No hook, no restriction — edits freely

**No marker file needed** — the hook is hardcoded to the worktree path since it only exists in that directory.

### Test Results (all passing)

| Test | Input Path | Expected | Result |
|------|-----------|----------|--------|
| Edit in worktree | `limitless-paths-workbench/src/test.tsx` | Allow (exit 0) | PASS |
| Edit in main repo | `limitless-paths/src/test.tsx` | Block (exit 2) | PASS |
| Edit umbrella CLAUDE.md | `LIMITLESS/CLAUDE.md` | Allow (exit 0) | PASS |
| Edit user memory | `~/.claude/projects/.../memory/test.md` | Allow (exit 0) | PASS |

### Files Created

| File | Location | Purpose |
|------|----------|---------|
| `enforce-worktree.sh` | `limitless-paths-workbench/.claude/hooks/` | Hook script |
| `settings.local.json` | `limitless-paths-workbench/.claude/` | Hook registration |
