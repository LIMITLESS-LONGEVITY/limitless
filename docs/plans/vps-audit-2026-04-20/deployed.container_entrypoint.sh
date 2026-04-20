#!/bin/bash
set -e

# Write credentials to /etc/environment so ALL processes see them (PAM-level)
# This is the OS-level fix — survives any process model, subagent spawning, etc.
if [ -n "$GH_TOKEN" ]; then
  echo "GH_TOKEN=$GH_TOKEN" >> /etc/environment
  echo "GITHUB_TOKEN=$GH_TOKEN" >> /etc/environment
  export GH_TOKEN GITHUB_TOKEN="$GH_TOKEN"
fi

# Fix git worktree reverse reference for container environment.
# The worktree's .git file points to the parent repo's .git/worktrees/<name>/
# which is mounted at its host path. But the reverse gitdir file inside that
# directory points to the HOST worktree path (e.g., /tmp/nanoclaw-worktrees/name).
# Git needs this reverse reference to match the actual worktree location.
WORKTREE="/workspace/extra/monorepo"
if [ -f "$WORKTREE/.git" ]; then
  HOST_GITDIR=$(sed 's/gitdir: //' "$WORKTREE/.git")
  if [ -d "$HOST_GITDIR" ]; then
    echo "$WORKTREE" > "$HOST_GITDIR/gitdir"
  fi
fi

# Compile agent-runner TypeScript
cd /app && npx tsc --outDir /tmp/dist 2>&1 >&2
ln -s /app/node_modules /tmp/dist/node_modules
chmod -R a-w /tmp/dist

# Read container input from stdin, start agent
cat > /tmp/input.json
node /tmp/dist/index.js < /tmp/input.json
