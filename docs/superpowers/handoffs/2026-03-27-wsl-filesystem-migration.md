# Handoff: WSL2 Filesystem Migration — Windows FS to Linux FS

**Date:** 2026-03-27
**From:** Main Instance (Operator)
**To:** Workbench Instance (Engineer)
**Priority:** HIGH — affects all git/build/dev performance
**Plan file:** `~/.claude/plans/federated-coalescing-honey.md`

---

## Problem

All repos live on Windows FS (`/mnt/c/Projects/LIMITLESS/`) accessed through WSL2's 9p/drvfs bridge. Measured performance:

| Operation | Current (9p) | Expected (ext4) |
|-----------|-------------|-----------------|
| `git status` (60K files) | **11.2 seconds** | ~0.3 seconds |
| File enumeration (find TS/JS) | **1 min 23 sec** | ~1-2 seconds |
| `pnpm build` | Slow (cmd.exe bridge) | Native speed |

Additionally, Node.js is not installed in WSL — all commands run via `cmd.exe /c`, adding process bridge overhead. This is unsustainable as the platform grows to 5 repos.

## Goal

Move all development to Linux FS (`~/projects/LIMITLESS/`) with native Linux toolchain. Eliminate all `cmd.exe /c` workarounds.

---

## Phase 1: Install WSL Toolchain (zero risk — nothing moves)

**Constraint:** `sudo` requires interactive password. The user must run `! sudo apt-get install -y unzip` in the Claude prompt before fnm can install. Alternatively, skip fnm and install Node.js from tarball (no sudo needed):

### Option A: fnm (preferred, needs sudo for unzip)
```bash
# User runs interactively first:
# ! sudo apt-get install -y unzip

curl -fsSL https://fnm.vercel.app/install | bash
source ~/.bashrc
fnm install 20
fnm default 20
```

### Option B: Direct tarball (no sudo needed)
```bash
curl -fsSL https://nodejs.org/dist/v20.19.0/node-v20.19.0-linux-x64.tar.xz | tar -xJ -C ~/
echo 'export PATH="$HOME/node-v20.19.0-linux-x64/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
node --version  # verify v20.19.0
```

### Then (either option):
```bash
# Enable pnpm
corepack enable pnpm
pnpm --version

# Git identity
git config --global user.name "Your Name"
git config --global user.email "neckar@gmail.com"

# Git credentials — use Windows GCM from WSL (verified path)
git config --global credential.helper "/mnt/c/Program Files/Git/mingw64/bin/git-credential-manager.exe"

# Line endings
git config --global core.autocrlf input

# VERIFY: clone + push test
cd /tmp
git clone https://github.com/LIMITLESS-LONGEVITY/limitless-hub.git test-hub
cd test-hub
git checkout -b test/wsl-creds
git push origin test/wsl-creds
git push origin --delete test/wsl-creds
rm -rf /tmp/test-hub
# If push works → credentials are flowing. Proceed to Phase 2.
```

**Gate:** Do NOT proceed to Phase 2 until `git push` works natively from WSL without `cmd.exe`.

---

## Phase 2: Migrate Repos

Fresh clone is cleaner than copying (avoids CRLF artifacts).

```bash
mkdir -p ~/projects/LIMITLESS

cd ~/projects/LIMITLESS

# Umbrella repo (corporate site + docs)
git clone https://github.com/LIMITLESS-LONGEVITY/limitless-website.git .
# This clones into ~/projects/LIMITLESS/ directly (flat structure, same as current)

# Code repos (inside umbrella directory, gitignored by umbrella)
git clone https://github.com/LIMITLESS-LONGEVITY/limitless-paths.git
git clone https://github.com/LIMITLESS-LONGEVITY/limitless-hub.git
git clone https://github.com/LIMITLESS-LONGEVITY/limitless-infra.git

# Re-create worktree for two-instance workflow
cd ~/projects/LIMITLESS/limitless-paths
git worktree add ../limitless-paths-workbench workbench

# Install dependencies (native pnpm!)
cd ~/projects/LIMITLESS/limitless-paths && pnpm install
cd ~/projects/LIMITLESS/limitless-hub && pnpm install

# VERIFY performance
cd ~/projects/LIMITLESS/limitless-paths
time git status
# Expected: < 1 second (was 11.2s)
```

**Important:** The umbrella repo remote is `limitless-website.git`, not `LIMITLESS.git`.

---

## Phase 3: Migrate Claude Code Config

### 3a. Copy project-level `.claude/` config
```bash
cp -r /mnt/c/Projects/LIMITLESS/.claude ~/projects/LIMITLESS/.claude
```

### 3b. Update hardcoded paths in hooks

Three hook scripts have hardcoded `/mnt/c/Projects/LIMITLESS`:

**`enforce-docs-only.sh` line 8:**
```bash
# Change from:
UMBRELLA="/mnt/c/Projects/LIMITLESS"
# Change to:
UMBRELLA="$HOME/projects/LIMITLESS"
```

**`enforce-repo-boundary.sh` line 12:**
```bash
# Change from:
UMBRELLA="/mnt/c/Projects/LIMITLESS"
# Change to:
UMBRELLA="$HOME/projects/LIMITLESS"
```

**`enforce-branch-strategy.sh` line 45:**
```bash
# Change from:
if [[ "$CWD" == */LIMITLESS && ...
# This one uses glob patterns, so it should work regardless of path. Verify.
```

### 3c. Update `settings.local.json`

Update hook command paths:
```json
// Change from:
"command": "bash /mnt/c/Projects/LIMITLESS/.claude/hooks/enforce-branch-strategy.sh"
// Change to:
"command": "bash $HOME/projects/LIMITLESS/.claude/hooks/enforce-branch-strategy.sh"
```

Same for `enforce-docs-only.sh`.

Also clean up stale Windows-specific permissions (no longer needed):
- Remove `Bash(\"/mnt/c/Program Files/nodejs/npx\" tsc:*)`
- Remove `Bash(\"/mnt/c/Program Files/nodejs/node.exe\":*)`
- Remove `Bash(cmd.exe:*)` (or keep for edge cases)
- Remove the Render API key permission (it has the actual key in plaintext — security issue)
- Add native equivalents: `Bash(pnpm:*)`, `Bash(node:*)`, `Bash(npx:*)`

### 3d. Migrate memory files

```bash
# Launch Claude Code from new path to auto-create project key:
# cd ~/projects/LIMITLESS && claude

# Then discover the new project key:
ls ~/.claude/projects/
# Expected: old key (-mnt-c-Projects-LIMITLESS) + new key (-home-nefarious-projects-LIMITLESS)

# Copy memory files
OLD_KEY="-mnt-c-Projects-LIMITLESS"
NEW_KEY="-home-nefarious-projects-LIMITLESS"  # verify actual name
cp -r ~/.claude/projects/$OLD_KEY/memory/* ~/.claude/projects/$NEW_KEY/memory/
```

---

## Phase 4: Verify Everything

```bash
# 1. Build passes natively
cd ~/projects/LIMITLESS/limitless-paths && pnpm build

# 2. Lint passes
cd ~/projects/LIMITLESS/limitless-paths && pnpm lint

# 3. Tests pass
cd ~/projects/LIMITLESS/limitless-paths && pnpm test

# 4. Git push/pull works
cd ~/projects/LIMITLESS/limitless-paths
git checkout -b test/linux-fs-verify
git push origin test/linux-fs-verify
git push origin --delete test/linux-fs-verify

# 5. Worktree works
cd ~/projects/LIMITLESS/limitless-paths-workbench
git status
pnpm build

# 6. Claude Code memory loads
# Launch claude from ~/projects/LIMITLESS/ and check memory
```

---

## Phase 5: Update Documentation

### Update `CLAUDE.md` (umbrella)
- Remove all `cmd.exe /c` references
- Update `**Local:**` paths from `C:/Projects/LIMITLESS/` to `~/projects/LIMITLESS/`
- Remove WSL workaround notes

### Update `limitless-paths/CLAUDE.md`
- Remove: `**WSL:** Run builds via cmd.exe /c "pnpm build". Git commits via cmd.exe /c "git commit -F .git/COMMIT_MSG".`
- Update build commands to native: `pnpm build`, `pnpm lint`, `git commit`

### Update memory files
- `environment_setup.md` — Replace entire content with native Linux toolchain notes
- `worktree_setup.md` — Update paths

---

## Phase 6: Archive and Clean Up

```bash
# DON'T delete Windows directory yet — keep as backup for a week
# User should do this manually:
# mv /mnt/c/Projects/LIMITLESS /mnt/c/Projects/LIMITLESS.bak
```

---

## What NOT to Change

- GitHub Actions CI (runs on ubuntu-latest, unaffected)
- Render deployments (deploy from GitHub, unaffected)
- Terraform Cloud (uses its own execution, unaffected)
- Git remotes, branches, or history

## Rollback

If anything breaks, the old directory is still at `/mnt/c/Projects/LIMITLESS/`. Just switch back to it. All repos are cloned from GitHub — no unique local state.
