# Agent Configuration Governance Specification

**Document ID:** SPEC-AGT-CFG-001  
**Date:** 2026-04-21  
**Author:** Architect  
**Status:** Proposed — awaiting CEO ratification  
**Applies to:** `LIMITLESS-LONGEVITY/limitless` · all LIMITLESS NanoClaw agents · OpenClaw Director  
**Branch:** `docs/phase-2-readiness-2026-04-21`  
**Related DRs:** DR-001 (credential rotation), DR-SEC-001 (token hygiene)

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Config Inventory — All Files Influencing Agent Behavior](#2-config-inventory)
   - 2.1 [NanoClaw Side](#21-nanoclaw-side)
   - 2.2 [OpenClaw Director Side](#22-openclaw-director-side)
   - 2.3 [Inventory Summary Table](#23-inventory-summary-table)
3. [Machine-Readable Agent Configuration Registry](#3-machine-readable-agent-configuration-registry)
   - 3.1 [Registry Schema](#31-registry-schema)
   - 3.2 [Proposed Registry Path](#32-proposed-registry-path)
   - 3.3 [Draft YAML Example](#33-draft-yaml-example)
4. [DR-CFG-NNN Decision Record Pattern](#4-dr-cfg-nnn-decision-record-pattern)
   - 4.1 [Namespace and Naming](#41-namespace-and-naming)
   - 4.2 [When to Create a DR-CFG](#42-when-to-create-a-dr-cfg)
   - 4.3 [Required Fields](#43-required-fields)
   - 4.4 [Filing Process](#44-filing-process)
   - 4.5 [Governance Tier Classification](#45-governance-tier-classification)
5. [Benchmarking Protocol](#5-benchmarking-protocol)
   - 5.1 [Overview](#51-overview)
   - 5.2 [Benchmark Task Suites](#52-benchmark-task-suites)
   - 5.3 [Scoring Rubric](#53-scoring-rubric)
   - 5.4 [Pass Thresholds and Baselines](#54-pass-thresholds-and-baselines)
   - 5.5 [Execution Process](#55-execution-process)
   - 5.6 [Results Artifact Format](#56-results-artifact-format)
6. [Governance Integration Recommendations](#6-governance-integration-recommendations)
   - 6.1 [Tier Mapping](#61-tier-mapping)
   - 6.2 [Registry Update Requirement](#62-registry-update-requirement)
   - 6.3 [Review Cadence](#63-review-cadence)
   - 6.4 [OpenClaw Config Gap and Remediation](#64-openclaw-config-gap-and-remediation)
7. [Open Issues and Risks](#7-open-issues-and-risks)
8. [Appendix A — Full Per-Group Settings.json State (2026-04-21)](#appendix-a)

---

## 1. Purpose and Scope

This specification establishes formal governance over every file, environment variable, and runtime parameter that influences the behaviour of an agent in the LIMITLESS Longevity OS division. Its goals are:

- **Auditability:** any change to an agent's instructions, model, or runtime parameters must leave a traceable record.
- **Reproducibility:** a given agent configuration must be fully recoverable from the documents in this repo.
- **Regression safety:** model or harness upgrades must pass defined benchmarks before reaching production.
- **Drift prevention:** scheduled reviews and mandatory DR-CFG records prevent silent configuration divergence.

The specification covers two agent subsystems:

| Subsystem | Runtime | Agents |
|---|---|---|
| **NanoClaw** | Claude Code (Anthropic Agent SDK) inside Docker containers managed by `apps/nanoclaw` | main-ops Architect, per-app Architects (paths-eng, cubes-eng, hub-eng, dt-eng, infra-eng) |
| **OpenClaw Director** | `openai-codex/gpt-5.4` on Director's VPS | Single Director instance |

This document does **not** govern application code in `apps/paths`, `apps/cubes`, `apps/hub`, `apps/digital-twin`, or `apps/os-dashboard`. It governs only the files that shape how agents reason, what they are permitted to do, and which model they run against.

---

## 2. Config Inventory

### 2.1 NanoClaw Side

All NanoClaw agents run inside Docker containers spawned by the NanoClaw host process. The following files collectively determine every aspect of agent behaviour.

---

#### 2.1.1 Per-Group CLAUDE.md Files (Agent Persona and Task Protocol)

**Location pattern:** `/workspace/project/groups/{group_folder}/CLAUDE.md`  
**Live instances:**

| Group Folder | Role | Scope | File Present |
|---|---|---|---|
| `discord_limitless-ops` | main-ops Architect | Cross-repo coordination | Yes |
| `discord_paths-eng` | PATHS Architect | `apps/paths/` | Yes |
| `discord_cubes-eng` | Cubes+ Architect | `apps/cubes/` | Yes |
| `discord_hub-eng` | HUB Architect | `apps/hub/` | Yes |
| `discord_dt-eng` | DT Architect | `apps/digital-twin/` | Yes |
| `discord_infra-eng` | Infra Architect | `infra/` | Yes |
| `main` | (legacy/test) | — | Yes |

**Content pattern (per-app Architects):** All per-app engineer CLAUDE.mds follow the same six-stage pipeline: Investigate → Plan → Execute → Verify → Create PR → Report. Each file specifies the exact monorepo path scope, build commands, hard constraints (e.g., `NEVER modify files outside apps/paths/`), and IPC notification format.

**Content pattern (main-ops Architect):** Defines cross-repo coordination role, proactive 30-minute check cadence, daily briefing at 09:00 UTC, handoff schema, health endpoints, and the verification-first principle.

**Governance gaps identified:**
- CLAUDE.md files are written directly to the host filesystem under `/workspace/project/groups/` and are **not** tracked in any git repository.
- No review cadence exists. Files may be edited ad hoc by the Director or Architect with no change record.
- No version control means rollback requires manual reconstruction.

**Recommendation:** All CLAUDE.md files should be committed to `docs/agent-personas/` in this monorepo and symlinked or copied to the host at deploy time via a DR-CFG-gated process.

---

#### 2.1.2 Global Worker CLAUDE.md (Worker Agent Template)

**Location:** `/workspace/project/groups/global/CLAUDE.md`  
**Mounted at:** `/workspace/global/CLAUDE.md` (read-only) inside every non-main container

This file provides the baseline worker identity template. It defines:
- `AGENT_ROLE` and `AGENT_SCOPE` environment variable semantics (read from container env at runtime)
- Peer-to-peer coordination protocol via `/workspace/team/` shared directory
- IPC heartbeat format (JSON files written to `/workspace/ipc/status/`)
- Completion and failure status schemas
- Iteration protocol (max 10 iterations, 3-strike rule per error type)
- Role-specific behaviour overrides: Executor, Planner, Explorer, Debugger, Verifier, Test Engineer

This file is the single source of truth for worker agent behaviour. It is loaded into every non-main container at spawn time.

**Governance gaps:** Same as 2.1.1 — not tracked in git, no review cadence.

---

#### 2.1.3 Per-Group settings.json (Container Environment Variables)

**Location pattern:** `/workspace/project/data/sessions/{group_folder}/.claude/settings.json`  
**Written by:** `apps/nanoclaw/src/container-runner.ts` at every container spawn (see §2.1.4)  
**Mounted at:** `/home/node/.claude/` inside containers

The settings.json file is the mechanism by which the Claude Code SDK reads environment variables. The SDK reads `~/.claude/settings.json` on startup and merges its `env` block into the process environment.

**Universal env vars (all groups):**

| Variable | Value | Effect |
|---|---|---|
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | `"1"` | Enables Agent SDK multi-agent team features |
| `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` | `"1"` | Allows SDK to load CLAUDE.md from additional mounted directories |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | `"0"` | Auto memory enabled (agent can persist notes across sessions) |
| `GH_TOKEN` | CEO's PAT (pre-DR-001 rotation) | GitHub CLI authentication for PR creation |
| `GITHUB_TOKEN` | Same as `GH_TOKEN` | Git push authentication |

**Per-group env vars (non-main groups):**

| Group | `AGENT_SCOPE` | `AGENT_ROLE` |
|---|---|---|
| `discord_dt-eng` | `apps/digital-twin` | `architect` |
| `discord_cubes-eng` | `apps/cubes` | `architect` |
| `discord_paths-eng` | `apps/paths` | `architect` |
| `discord_infra-eng` | `infra` | `architect` |
| `discord_hub-eng` | `apps/hub` | `architect` |
| `discord_limitless-ops` (main-ops) | _(not set)_ | _(not set)_ | 

**Note:** main-ops has no `AGENT_SCOPE` or `AGENT_ROLE`. The main-ops Architect's identity is entirely defined by its group CLAUDE.md.

**Critical gap — model selection:**  
`CLAUDE_CODE_USE_MODEL` is **not currently set** in any settings.json. The Agent SDK defaults to whatever the OneCLI proxy selects (currently Sonnet). The recommendation from the 2026-04-04 readiness assessment is:
- main-ops Architect: `CLAUDE_CODE_USE_MODEL=claude-opus-4-5` (or current Opus equivalent)
- Per-app Architects: `CLAUDE_CODE_USE_MODEL=claude-sonnet-4-5` (or current Sonnet equivalent)

**Critical gap — token rotation:**  
`GH_TOKEN` and `GITHUB_TOKEN` contain the CEO's personal access token. DR-001 mandates rotation to a machine account PAT. Until DR-001 is executed, settings.json files contain a credential that grants broad GitHub access across all containers.

**Critical gap — MAX_THINKING_TOKENS:**  
This env var is not documented in any settings.json and is not currently set. Its effect on extended thinking (if the model supports it) is undefined. Should be explicitly set or explicitly set to `0` to prevent non-deterministic behaviour on model upgrades.

---

#### 2.1.4 container-runner.ts — defaultEnv Block and Mount Logic

**Location:** `apps/nanoclaw/src/container-runner.ts`  
**Role:** Authoritative source of all environment variables written to settings.json

The `buildVolumeMounts` function (lines ~141–155) constructs the `defaultEnv` block and merges it with per-group `containerConfig.envVars`. This is the single canonical point where:
- Universal env vars are set
- Group-specific vars (AGENT_SCOPE, AGENT_ROLE, AGENT_SCOPE) are merged in
- The resulting settings.json is written to disk before container spawn

Any change to agent environment variables that is not reflected in this file will be overwritten on the next container spawn, because `container-runner.ts` always writes a fresh settings.json. This means settings.json files on disk are **derived artifacts**, not authoritative config.

**Important:** the `CLAUDE_CODE_USE_MODEL` gap can only be permanently closed by adding it to the `defaultEnv` block here (or the group's `containerConfig.envVars` in `registered_groups.json`).

---

#### 2.1.5 config.ts — NanoClaw Host Runtime Variables

**Location:** `apps/nanoclaw/src/config.ts`  
**Role:** Runtime configuration for the NanoClaw host process (not injected into containers, but governs container lifecycle)

| Variable | Default | Effect |
|---|---|---|
| `CONTAINER_IMAGE` | `nanoclaw-agent:latest` | Docker image used for all containers |
| `CONTAINER_TIMEOUT` | `1800000` (30 min) | Hard timeout before container is killed |
| `IDLE_TIMEOUT` | `1800000` (30 min) | Grace period after last output before idle kill |
| `ONECLI_URL` | `""` | OneCLI gateway URL for credential injection |
| `DISCORD_CHANNEL_MAIN_OPS` | `""` | Discord channel ID for main-ops notifications |
| `DISCORD_CHANNEL_WORKBENCH_OPS` | `""` | Discord channel ID for engineer updates |
| `DISCORD_CHANNEL_ALERTS` | `""` | Discord channel ID for urgent escalations |
| `DISCORD_CHANNEL_WORKERS` | `""` | Discord channel ID for worker updates |
| `LIMITLESS_MONOREPO_PATH` | `""` | Host path to monorepo (mounted read-only into main-ops) |
| `LIMITLESS_WORKTREE_BASE` | `/tmp/nanoclaw-worktrees` | Host path where git worktrees are created for workers |
| `MAX_CONCURRENT_CONTAINERS` | `5` | Concurrency cap on simultaneous container spawns |
| `MAX_MESSAGES_PER_PROMPT` | `10` | Maximum queued messages per prompt before dropping |
| `CONTAINER_MAX_OUTPUT_SIZE` | `10485760` (10 MB) | Maximum stdout+stderr before truncation |

These values are read from the host `.env` file or process environment at startup. They are **not** injected into containers but determine when containers run, how long they live, and which image is used.

---

#### 2.1.6 Dockerfile — Container Image Definition

**Location:** `apps/nanoclaw/container/Dockerfile`  
**Base image:** `node:22-slim`

Key layers relevant to agent behaviour:
- Installs Chromium (for `agent-browser` tool), `git`, and `gh` CLI
- Installs `@anthropic-ai/claude-code` and `agent-browser` globally via npm
- Sets `WORKDIR /workspace/group` (agent's working directory is its group folder)
- Copies and compiles the `agent-runner` TypeScript application
- Runs as `node` user (non-root) for security
- `chmod 666 /etc/environment` to allow entrypoint credential injection

**No model selection occurs here.** The Dockerfile does not set `CLAUDE_CODE_USE_MODEL` or any Anthropic API credential. Model selection is deferred to settings.json (via the SDK) and credential injection is deferred to the OneCLI gateway or `CLAUDE_CODE_OAUTH_TOKEN` env var.

**Governance note:** Any change to the Dockerfile changes the environment for all agents and must go through a Tier 3 DR-CFG (see §4.5).

---

#### 2.1.7 entrypoint.sh — Credential Injection and Git Worktree Fixup

**Location:** `apps/nanoclaw/container/entrypoint.sh`

Two responsibilities:
1. **Credential propagation:** Writes `GH_TOKEN` and `GITHUB_TOKEN` to `/etc/environment` so all subprocesses (including non-login bash shells invoked by Claude's Bash tool) inherit them. This is necessary because the Agent SDK spawns bash in non-interactive mode, which does not source `.bashrc` or `.profile`.
2. **Git worktree fixup:** Rewrites the `gitdir` reverse-reference file inside the parent `.git/worktrees/{name}/` directory so it points to `/workspace/extra/monorepo` (container path) rather than the host worktree path. This makes `git` commands work transparently inside the container when the worktree was created on the host.

Changes to this file affect all containers and require a Tier 3 DR-CFG.

---

#### 2.1.8 discord.ts — TRUSTED_BOT_IDS and Bot Message Filtering

**Location:** `apps/nanoclaw/src/channels/discord.ts` (approximately line 58)

The `TRUSTED_BOT_IDS` environment variable (comma-separated list of Discord user IDs) controls which bot messages are allowed through to the **main-ops** group. The logic is:

```
if (message.author.bot && group?.isMain) {
  const trustedBots = (process.env.TRUSTED_BOT_IDS || '').split(',').filter(Boolean);
  if (!trustedBots.includes(message.author.id)) return; // drop message
}
```

This prevents the main-ops Architect container from processing messages sent by other NanoClaw bot instances, which would create an Architect-to-Architect infinite loop. Non-main groups accept all bot messages (the Architect routes work to them via bot messages).

**Governance note:** Adding a new trusted bot ID (e.g., a new monitoring bot) requires updating this env var in the host `.env` file. This is a Tier 2 change (agent behaviour is altered).

---

#### 2.1.9 Model Selection — CLAUDE_CODE_USE_MODEL

**Current state:** NOT set in any settings.json or defaultEnv block.  
**Effective model:** Determined entirely by the OneCLI proxy's default routing (currently Sonnet).  
**SDK behaviour:** The Claude Code SDK reads `CLAUDE_CODE_USE_MODEL` at startup. If unset, the SDK uses the gateway's default.

**Risk:** A OneCLI proxy update could silently change the effective model for all agents with no audit trail, no benchmark verification, and no DR-CFG record.

**Recommended action (pre-ratification):** Add `CLAUDE_CODE_USE_MODEL` to the defaultEnv block in `container-runner.ts` with explicit per-group values, then file DR-CFG-001 to document the change.

---

#### 2.1.10 MAX_THINKING_TOKENS

**Current state:** Not documented or set anywhere in settings.json, defaultEnv, or host `.env`.  
**Effect:** If a future model supports extended thinking and this var is unset, behaviour is model-dependent and unverified.  
**Recommended action:** Explicitly set to `0` (disabled) in defaultEnv until a DR-CFG explicitly enables extended thinking for specific agent roles after benchmarking.

---

### 2.2 OpenClaw Director Side

The Director runs on a separate VPS and is only partially observable from NanoClaw containers.

---

#### 2.2.1 ~/.codex/auth.json

**Location:** Director VPS at `~/.codex/auth.json`  
**Content:** ChatGPT Plus OAuth JWT  
**Runtime:** `openai-codex/gpt-5.4`

**Critical constraint:** This file stores an OAuth token (not an API key) tied to the CEO's ChatGPT Plus subscription. Setting `OPENAI_API_KEY` in any environment that the `openai-codex` runtime reads will cause the runtime to revert to API key mode, breaking the subscription-billing flow. Any integration work that touches the Director's environment must be aware of this constraint.

**Governance gap:** This file is on the Director's local VPS. It is not in any git repository and is not accessible from NanoClaw containers. There is no rotation cadence, no audit trail, and no DR-CFG governing its lifecycle.

---

#### 2.2.2 Director Local Config Files

The following files live on the Director's VPS and are **not** accessible from NanoClaw containers or any git repository:

| File | Purpose |
|---|---|
| `SOUL.md` | Director's core identity, values, and behavioural constraints |
| `IDENTITY.md` | Role definition and operational scope |
| `USER.md` | Information about the CEO/operator |
| `TOOLS.md` | Available tools and their usage rules |
| `HEARTBEAT.md` | Status reporting cadence and format |
| `MEMORY.md` | Persistent memory schema |

**Governance gap:** These files constitute the OpenClaw Director's equivalent of CLAUDE.md. They are entirely outside the governance framework:
- No git history
- No review cadence
- No DR-CFG required for changes
- No rollback mechanism
- Not visible to Architect for cross-system alignment checks

See §6.4 for the proposed remediation.

---

### 2.3 Inventory Summary Table

| File / Variable | System | Authoritative? | In Git? | Reviewed? | Change Requires DR-CFG? |
|---|---|---|---|---|---|
| `groups/{group}/CLAUDE.md` (per-group) | NanoClaw | Yes | No | No | Yes (Tier 2) |
| `groups/global/CLAUDE.md` | NanoClaw | Yes | No | No | Yes (Tier 2) |
| `data/sessions/{group}/.claude/settings.json` | NanoClaw | No (derived) | No | No | Via container-runner.ts |
| `src/container-runner.ts` (defaultEnv) | NanoClaw | Yes | Yes | PR review | Yes (Tier 2) |
| `src/config.ts` | NanoClaw | Yes | Yes | PR review | Yes (Tier 2–3) |
| `container/Dockerfile` | NanoClaw | Yes | Yes | PR review | Yes (Tier 3) |
| `container/entrypoint.sh` | NanoClaw | Yes | Yes | PR review | Yes (Tier 3) |
| `src/channels/discord.ts` (TRUSTED_BOT_IDS) | NanoClaw | Yes | Yes | PR review | Yes (Tier 2) |
| `CLAUDE_CODE_USE_MODEL` (unset) | NanoClaw | — | — | — | Yes (Tier 2) |
| `MAX_THINKING_TOKENS` (unset) | NanoClaw | — | — | — | Yes (Tier 2) |
| `~/.codex/auth.json` | OpenClaw | Yes | No | No | Yes (Tier 2) |
| `SOUL.md` / `IDENTITY.md` / etc. | OpenClaw | Yes | No | No | Yes (Tier 2) |
| Host `.env` (TRUSTED_BOT_IDS, ONECLI_URL, etc.) | NanoClaw host | Yes | No | No | Yes (Tier 2–3) |

---

## 3. Machine-Readable Agent Configuration Registry

### 3.1 Registry Schema

Each entry in the registry represents one logical agent instance. The schema is designed to be parseable by automation (CI checks, deployment scripts) and human-readable for governance reviews.

```yaml
# Schema for docs/superpowers/agent-registry.yaml
# Each entry represents one agent instance
agents:
  - id: string                  # Unique slug, e.g. nanoclaw-main-ops
    type: string                # nanoclaw-architect | nanoclaw-worker | openclaw-director
    model:
      current: string           # Effective model (or "gateway-default" if unset)
      env_var: string           # Env var controlling model, or "N/A"
      explicitly_set: boolean   # Whether CLAUDE_CODE_USE_MODEL is set
    channel:
      platform: string          # discord | N/A
      jid: string               # discord_<folder> slug or N/A
      discord_channel_id: string | null
    scope:
      repo: string              # LIMITLESS-LONGEVITY/limitless
      paths: list[string]       # Monorepo paths this agent can write to
    config_files:
      - path: string            # Relative to repo root, or absolute VPS path
        type: string            # persona | env | image | entrypoint | runtime | auth
        in_git: boolean
        last_modified: string   # ISO date (best-known)
    last_reviewed: string       # ISO date of last governance review
    dr_version: string          # DR-CFG-NNN governing current config, or "pending"
    open_risks: list[string]    # Known gaps or action items
```

### 3.2 Proposed Registry Path

**`docs/superpowers/agent-registry.yaml`**

Rationale:
- Lives adjacent to this spec in `docs/superpowers/`
- Must be updated as part of every DR-CFG PR (see §4.4)
- Machine-parseable for future CI lint checks (e.g., verify no agent has `explicitly_set: false` for model)

### 3.3 Draft YAML Example

```yaml
# LIMITLESS Agent Configuration Registry
# Last updated: 2026-04-21
# Governed by: docs/superpowers/specs/2026-04-21-agent-config-governance.md

schema_version: "1.0"
updated: "2026-04-21"
updated_by: "Architect"

agents:

  - id: nanoclaw-main-ops
    type: nanoclaw-architect
    model:
      current: "gateway-default (claude-sonnet-4-6 via OneCLI)"
      env_var: CLAUDE_CODE_USE_MODEL
      explicitly_set: false
      recommended: "claude-opus-4-5"
    channel:
      platform: discord
      jid: discord_limitless-ops
      discord_channel_id: null  # populate from host .env DISCORD_CHANNEL_MAIN_OPS
    scope:
      repo: LIMITLESS-LONGEVITY/limitless
      paths:
        - "*"  # read-only access to full monorepo; no write scope (Architect only)
    config_files:
      - path: "groups/discord_limitless-ops/CLAUDE.md"
        type: persona
        in_git: false
        last_modified: "2026-04-04"
      - path: "groups/global/CLAUDE.md"
        type: persona
        in_git: false
        last_modified: "2026-04-04"
      - path: "data/sessions/discord_limitless-ops/.claude/settings.json"
        type: env
        in_git: false
        last_modified: "derived-at-spawn"
      - path: "src/container-runner.ts"
        type: env
        in_git: true
        last_modified: "2026-04-04"
      - path: "container/Dockerfile"
        type: image
        in_git: true
        last_modified: "2026-04-04"
      - path: "container/entrypoint.sh"
        type: entrypoint
        in_git: true
        last_modified: "2026-04-04"
      - path: "src/channels/discord.ts"
        type: runtime
        in_git: true
        last_modified: "2026-04-04"
    last_reviewed: "2026-04-21"
    dr_version: "pending-DR-CFG-001"
    open_risks:
      - "CLAUDE_CODE_USE_MODEL not set — model is gateway-default, unversioned"
      - "MAX_THINKING_TOKENS not set — extended thinking behaviour undefined"
      - "GH_TOKEN is CEO PAT — DR-001 rotation pending"
      - "CLAUDE.md not in git — no audit trail"

  - id: nanoclaw-paths-eng
    type: nanoclaw-architect
    model:
      current: "gateway-default (claude-sonnet-4-6 via OneCLI)"
      env_var: CLAUDE_CODE_USE_MODEL
      explicitly_set: false
      recommended: "claude-sonnet-4-5"
    channel:
      platform: discord
      jid: discord_paths-eng
      discord_channel_id: null
    scope:
      repo: LIMITLESS-LONGEVITY/limitless
      paths:
        - "apps/paths/"
    config_files:
      - path: "groups/discord_paths-eng/CLAUDE.md"
        type: persona
        in_git: false
        last_modified: "2026-04-04"
      - path: "groups/global/CLAUDE.md"
        type: persona
        in_git: false
        last_modified: "2026-04-04"
      - path: "data/sessions/discord_paths-eng/.claude/settings.json"
        type: env
        in_git: false
        last_modified: "derived-at-spawn"
      - path: "src/container-runner.ts"
        type: env
        in_git: true
        last_modified: "2026-04-04"
      - path: "container/Dockerfile"
        type: image
        in_git: true
        last_modified: "2026-04-04"
      - path: "container/entrypoint.sh"
        type: entrypoint
        in_git: true
        last_modified: "2026-04-04"
    last_reviewed: "2026-04-21"
    dr_version: "pending-DR-CFG-001"
    open_risks:
      - "CLAUDE_CODE_USE_MODEL not set"
      - "GH_TOKEN is CEO PAT — DR-001 rotation pending"
      - "CLAUDE.md not in git"

  - id: openclaw-director
    type: openclaw-director
    model:
      current: "openai-codex/gpt-5.4"
      env_var: "N/A (model hardcoded in openai-codex runtime)"
      explicitly_set: true
      recommended: "openai-codex/gpt-5.4"
    channel:
      platform: discord
      jid: "N/A (Director uses separate interface)"
      discord_channel_id: null
    scope:
      repo: LIMITLESS-LONGEVITY/limitless
      paths:
        - "*"  # Director has full oversight, not a code-writing agent
    config_files:
      - path: "~/.codex/auth.json"
        type: auth
        in_git: false
        last_modified: "unknown"
      - path: "~/SOUL.md"
        type: persona
        in_git: false
        last_modified: "unknown"
      - path: "~/IDENTITY.md"
        type: persona
        in_git: false
        last_modified: "unknown"
      - path: "~/USER.md"
        type: persona
        in_git: false
        last_modified: "unknown"
      - path: "~/TOOLS.md"
        type: persona
        in_git: false
        last_modified: "unknown"
      - path: "~/HEARTBEAT.md"
        type: persona
        in_git: false
        last_modified: "unknown"
      - path: "~/MEMORY.md"
        type: persona
        in_git: false
        last_modified: "unknown"
    last_reviewed: "2026-04-21"
    dr_version: "none — no DR-CFG framework existed prior to this spec"
    open_risks:
      - "All config files outside git — no audit trail, no rollback"
      - "SOUL.md/IDENTITY.md drift undetectable without manual comparison"
      - "auth.json contains OAuth JWT — rotation cadence undefined"
      - "CRITICAL: setting OPENAI_API_KEY in any env reverts auth.json to apikey mode"
```

---

## 4. DR-CFG-NNN Decision Record Pattern

### 4.1 Namespace and Naming

A new Decision Record namespace is established for agent configuration changes:

- **Prefix:** `DR-CFG`
- **Numbering:** Three-digit zero-padded integer, sequential: `DR-CFG-001`, `DR-CFG-002`, …
- **No sub-namespaces** within DR-CFG. The sequential number is sufficient.
- **Existing DR namespaces** (`DR-001`, `DR-SEC-001`) are unaffected.
- **First planned DR-CFG:** `DR-CFG-001` — explicit model selection for all NanoClaw agents.

### 4.2 When to Create a DR-CFG

**A DR-CFG is required for any change to:**

| Category | Examples |
|---|---|
| CLAUDE.md files | Any edit to persona, constraints, pipeline steps, channel list, health endpoints |
| settings.json env vars | Adding, removing, or changing any env var in defaultEnv or per-group containerConfig.envVars |
| Model selection | Setting or changing `CLAUDE_CODE_USE_MODEL` for any group |
| Dockerfile | Base image update, new package installation, WORKDIR change, USER change |
| container-runner.ts (env injection) | Changes to `defaultEnv` block, mount logic, credential handling |
| entrypoint.sh | Any change to credential injection or git fixup logic |
| OpenClaw config files | Any edit to SOUL.md, IDENTITY.md, USER.md, TOOLS.md, HEARTBEAT.md, MEMORY.md |
| TRUSTED_BOT_IDS | Adding or removing any bot ID from the trusted list |
| MAX_THINKING_TOKENS | Setting, changing, or removing this variable for any group |
| auth.json rotation | Credential rotation for either system |
| Notification channel IDs | Changes to DISCORD_CHANNEL_* env vars |

**A DR-CFG is NOT required for:**

- Spelling or grammar fixes in CLAUDE.md with no semantic change
- Documentation updates in `docs/` that do not affect agent files
- Adding or removing comments in source files
- Formatting-only changes to settings.json (whitespace, key order)
- Adding new benchmark result documents to `docs/superpowers/benchmarks/`

**Grey area — use judgment:**  
Changes that add a new example or clarify a constraint in CLAUDE.md without changing the constraint itself. If in doubt, file a DR-CFG. The cost is low; the audit benefit is high.

### 4.3 Required Fields

Every DR-CFG document must include the following fields:

```markdown
# DR-CFG-NNN: [Short Title]

**From:** [Author — Architect or Director or CEO]
**Date:** [ISO date]
**Status:** [Proposed | Approved | Rejected | Superseded]
**Approved by:** [CEO / Director / N/A]
**Agents Affected:** [List of agent IDs from agent-registry.yaml]
**Governance Tier:** [Tier 2 | Tier 3]

## Change Summary

[1–3 sentence plain-language description of what is changing.]

## Rationale

[Why is this change necessary? What problem does it solve?]

## Files Changed

| File | Change Type | Before | After |
|------|-------------|--------|-------|
| ... | ... | ... | ... |

## Rollback Procedure

[Step-by-step instructions to revert this change if it causes problems.
Must be executable without additional investigation.]

## Verification Steps

[Concrete, testable steps to confirm the change has the intended effect.
No "it probably works." Each step must have a pass/fail criterion.]

## Benchmark Results (model changes only)

[Link to benchmark results document in docs/superpowers/benchmarks/
Required for any change that sets or modifies CLAUDE_CODE_USE_MODEL.]

## Registry Update

Confirm that `docs/superpowers/agent-registry.yaml` has been updated
to reflect this change: [Yes | No — explain why not]
```

### 4.4 Filing Process

1. Author drafts the DR-CFG document in `docs/decisions/DR-CFG-NNN-short-title.md`
2. Author updates `docs/superpowers/agent-registry.yaml` to reflect the proposed change (set `dr_version` to the new DR-CFG ID, update relevant fields)
3. Author opens a PR to the monorepo with both files (and any actual config file changes, if the config lives in the repo)
4. **Tier 2:** PR requires review from Director (or CEO if Director is unavailable)
5. **Tier 3:** PR requires CEO approval before merge
6. On merge: apply changes to host filesystem if the config does not live in the repo (e.g., CLAUDE.md files, host `.env`)
7. Post to `#main-ops` with a summary of the change and the DR-CFG ID

### 4.5 Governance Tier Classification

Per the LIMITLESS Longevity OS Platform Specification §9:

| Config Category | Tier | Approver | Additional Requirement |
|---|---|---|---|
| CLAUDE.md files (persona, pipeline, constraints) | **Tier 2** | Director review required | Architect must post change summary to #main-ops |
| settings.json env vars (non-model) | **Tier 2** | Director review required | — |
| Model selection (CLAUDE_CODE_USE_MODEL) | **Tier 2** | Director review + CEO notification | Benchmark results required before merge |
| TRUSTED_BOT_IDS change | **Tier 2** | Director review | Security rationale required |
| MAX_THINKING_TOKENS | **Tier 2** | Director review | Benchmark results recommended |
| OpenClaw config files (SOUL.md etc.) | **Tier 2** | CEO approval | Must include snapshot to docs/director-config-snapshots/ |
| Dockerfile | **Tier 3** | CEO approval required | Security review of new packages |
| entrypoint.sh | **Tier 3** | CEO approval required | Credential handling audit |
| container-runner.ts (mount/env logic) | **Tier 3** | CEO approval required | Mount security audit |

---

## 5. Benchmarking Protocol

### 5.1 Overview

Any change to model selection (`CLAUDE_CODE_USE_MODEL`) or the container harness (Dockerfile, entrypoint.sh, `@anthropic-ai/claude-code` package version) must be validated against a standardised benchmark suite before the change takes effect in production. The purpose of benchmarking is to detect regressions in:

- Task completion quality
- Implementation readiness of outputs
- Reasoning depth and accuracy
- Adherence to platform constraints (e.g., never push to main, scope restrictions)

Benchmarks must be run against the **proposed** configuration in a staging environment before the DR-CFG is merged. Results are committed as a permanent record.

### 5.2 Benchmark Task Suites

#### Suite A — main-ops Architect

Five representative tasks covering the full operational scope of the main-ops Architect role.

| Task ID | Task Description | What is Evaluated |
|---|---|---|
| **A-1** | Given a PR diff (simulated), produce a handoff to #handoffs with all required schema fields, decomposed into ≥3 engineer tasks with verification steps | Schema completeness, decomposition quality, accuracy of technical assessment |
| **A-2** | Given simulated health check results (2 services degraded, 1 down), produce a triage report and write the appropriate alerts to Discord channels | Correct escalation routing, actionability of recommendations, alert format compliance |
| **A-3** | Given a cross-service feature request (e.g., "add session sync between HUB and DT"), produce a multi-repo implementation plan spanning ≥2 apps with dependency ordering | Cross-repo reasoning, risk identification, implementation readiness |
| **A-4** | Generate a daily briefing for 2026-04-21 given: 2 open PRs, 1 unexecuted handoff, all services healthy | Format adherence, completeness, signal-to-noise ratio |
| **A-5** | Given a new infrastructure requirement, compose a complete DR-CFG document with all required fields populated and a concrete rollback procedure | DR-CFG schema completeness, rollback executability, rationale quality |

#### Suite B — Per-App Architect (Engineer Roles)

Four tasks covering the engineering pipeline. Run once per engineer role (paths-eng, cubes-eng, hub-eng, dt-eng, infra-eng) with app-specific fixtures.

| Task ID | Task Description | What is Evaluated |
|---|---|---|
| **B-1** | Given a bug report with error trace, investigate root cause, propose a surgical fix with the exact file and line change, and specify a test to prevent regression | Root cause accuracy, fix precision, test quality |
| **B-2** | Given a feature spec (e.g., "add a GET /api/health endpoint returning {status, version, uptime}"), implement the endpoint, add a test, and produce a passing build | Implementation correctness, test coverage, build compliance |
| **B-3** | Given a schema change requirement (e.g., "add a nullable `archivedAt` timestamp to the User model"), produce the migration, update the types, and verify with a build | Migration correctness, type safety, no `push: true` violations |
| **B-4** | Given a cross-service integration task (e.g., "HUB must call DT's /api/sessions endpoint and cache the result"), produce an implementation plan respecting scope constraints (never modify files outside own app) | Scope discipline, integration design quality, API contract accuracy |

### 5.3 Scoring Rubric

Each task is scored on four dimensions, each 1–10:

| Dimension | 1 (Failing) | 5 (Acceptable) | 10 (Excellent) |
|---|---|---|---|
| **Completeness** | Major required elements missing | Most elements present; minor omissions | All required elements present and well-structured |
| **Implementation Readiness** | Cannot be handed to an engineer as-is | Requires moderate interpretation or gap-filling | Ready to execute immediately; no ambiguity |
| **Accuracy** | Factual errors or wrong file paths | Minor inaccuracies that don't block execution | Technically correct in all details |
| **Reasoning Quality** | No rationale; conclusions unsupported | Basic reasoning present | Demonstrates full understanding of system constraints and tradeoffs |

**Task score** = arithmetic mean of the four dimension scores.  
**Suite score** = arithmetic mean of all task scores in the suite.

### 5.4 Pass Thresholds and Baselines

**Minimum pass criteria:**
- Suite average score: **≥ 8.0**
- No individual dimension score: **< 7.0**
- No individual task score: **< 7.0**

Any benchmark run that fails these criteria blocks the associated DR-CFG from merging. The change must be revised (e.g., prompt tuning, reverting model selection) and benchmarks re-run.

**Established baselines (2026-04-04 assessment):**

| Agent | Baseline Score | Output Volume | Notes |
|---|---|---|---|
| Architect (main-ops) | **8.5 / 10** | ~1,260 lines | Implementation-ready; used for DR and handoff composition |
| Director (OpenClaw) | **7.0 / 10** | ~507 lines | Overview-level; strong on strategy, lighter on implementation detail |

The 2026-04-04 baseline represents the minimum acceptable production standard. A model upgrade must meet or exceed the baseline score across all Suite A/B dimensions to be approved.

**Regression definition:** A score drop of ≥ 0.5 on any dimension compared to the baseline is a regression requiring investigation before approval, even if the absolute score is above the pass threshold.

### 5.5 Execution Process

1. **Before any model change is deployed to production**, the proposed model must be staged:
   - Create a test group in NanoClaw (`discord_benchmark-{agent}`) with `CLAUDE_CODE_USE_MODEL` set to the proposed model
   - Run all tasks in the appropriate suite against the test group
   - A human evaluator (Director or CEO) scores each task using the rubric
   - Scores are recorded in the results artifact (see §5.6)

2. **Evaluator independence:** The person running the benchmark should not be the person who proposed the model change, where possible.

3. **Comparison:** Results must be compared against the established baseline. Any regression must be documented in the DR-CFG with a rationale for why it is acceptable (or the change must be blocked).

4. **Commit before deploy:** Results are committed to the monorepo before the DR-CFG is merged and before the model change takes effect.

### 5.6 Results Artifact Format

Benchmark results are stored at:

```
docs/superpowers/benchmarks/YYYY-MM-DD-{agent-id}-{change-slug}.md
```

Examples:
- `docs/superpowers/benchmarks/2026-04-21-nanoclaw-main-ops-opus-upgrade.md`
- `docs/superpowers/benchmarks/2026-05-15-nanoclaw-paths-eng-sonnet-upgrade.md`

Each results document must include:

```markdown
# Benchmark Results: {Agent ID} — {Change Description}

**Date:** YYYY-MM-DD
**Evaluator:** [Name / Role]
**Proposed Change:** [DR-CFG-NNN]
**Baseline Reference:** 2026-04-04 assessment

## Configuration Under Test

| Parameter | Value |
|-----------|-------|
| Agent ID | ... |
| Model | ... |
| CLAUDE_CODE_USE_MODEL | ... |
| Container image | ... |

## Results

### Suite [A|B] Task Scores

| Task | Completeness | Impl. Readiness | Accuracy | Reasoning | Task Score |
|------|-------------|-----------------|----------|-----------|------------|
| A-1  | ...         | ...             | ...      | ...       | ...        |
...

**Suite Average:** X.X / 10
**Pass:** [Yes | No]

## Dimension Comparison vs Baseline

| Dimension | Baseline | This Run | Delta |
|-----------|----------|----------|-------|
| Completeness | ... | ... | ... |
...

## Regressions Noted

[None | Description of any regression ≥ 0.5 drop]

## Recommendation

[Approve | Reject | Approve with conditions]
```

---

## 6. Governance Integration Recommendations

### 6.1 Tier Mapping

The following table maps all identified config categories to the existing §9 governance tiers and specifies the action required:

| Config File/Category | Current §9 Tier | PR Required | Approver | CEO Notification | Benchmark |
|---|---|---|---|---|---|
| CLAUDE.md (any agent) | **Tier 2** | Yes | Director | No | No (unless semantic change significant) |
| settings.json env vars | **Tier 2** | Via container-runner.ts | Director | No | No |
| Model selection (CLAUDE_CODE_USE_MODEL) | **Tier 2** | Yes | Director + CEO notified | **Yes** | **Required** |
| TRUSTED_BOT_IDS | **Tier 2** | Yes | Director | No | No |
| MAX_THINKING_TOKENS | **Tier 2** | Yes | Director | No | Recommended |
| Dockerfile | **Tier 3** | Yes | **CEO** | Implicit | No (unless model affected) |
| entrypoint.sh | **Tier 3** | Yes | **CEO** | Implicit | No |
| container-runner.ts env/mount | **Tier 3** | Yes | **CEO** | Implicit | No |
| OpenClaw SOUL.md / IDENTITY.md | **Tier 2** | Via snapshot process | **CEO** | Implicit | No |
| auth.json rotation | **Tier 2** | DR-CFG only (no code PR) | CEO | **Yes** | No |

### 6.2 Registry Update Requirement

Every DR-CFG pull request must include a commit that updates `docs/superpowers/agent-registry.yaml`. Specifically:

- The `dr_version` field for all affected agents must be updated to the new DR-CFG ID
- Any changed field (model, config_files, scope, etc.) must be updated to reflect the post-change state
- `last_reviewed` must be set to the DR-CFG date for all affected agents
- `open_risks` must be updated to remove risks resolved by this DR-CFG and add any new risks identified

**CI enforcement (proposed):** A GitHub Actions workflow should validate that any PR modifying `data/sessions/*/settings.json`, `container/Dockerfile`, `container/entrypoint.sh`, `src/container-runner.ts`, or `groups/*/CLAUDE.md` also includes a commit to `docs/superpowers/agent-registry.yaml`. This prevents the registry from falling out of sync.

### 6.3 Review Cadence

**Quarterly CLAUDE.md Review (every 90 days):**
- Initiated by: Architect (via scheduled task)
- Participants: Architect (facilitator), Director (reviewer and approver)
- Process:
  1. Architect reads all active CLAUDE.md files and produces a comparison against the previous quarter's snapshots
  2. Director reviews for alignment with current product direction and operational constraints
  3. Any changes identified result in a DR-CFG filed before implementation
  4. If no changes are needed, a brief "no-change" note is appended to the most recent DR-CFG or filed as a standalone review memo in `docs/decisions/`
- Timeline: review initiated on the first Monday of March, June, September, December

**Annual Full Config Audit:**
- All entries in `agent-registry.yaml` are reviewed for accuracy
- All `last_reviewed` dates are updated
- All `open_risks` are triaged with action items or explicit acceptance
- Results in a DR-CFG if any changes are made

**Ad-hoc reviews** are required when:
- A new agent is added to the platform
- A new service is added to the monorepo
- A security incident involves an agent or credential
- A model version is end-of-lifed by the provider

### 6.4 OpenClaw Config Gap and Remediation

**Problem:** The Director's configuration files (SOUL.md, IDENTITY.md, USER.md, TOOLS.md, HEARTBEAT.md, MEMORY.md) exist only on the Director's local VPS. They are:
- Not in any git repository
- Not accessible from NanoClaw containers
- Not subject to any review cadence
- Not protected by any DR-CFG requirement
- Unable to be rolled back if accidentally modified or deleted

This represents the most significant governance gap identified in this specification. The Director's persona is at least as consequential to system behaviour as any CLAUDE.md file, yet it has zero audit trail.

**Proposed remediation:**

1. **Read-only snapshot process:** On a weekly schedule (every Monday at 09:00 UTC), a NanoClaw cron task (registered via the `mcp__nanoclaw__schedule_task` tool) should:
   - Request the Director to output the current content of each config file to a structured Discord message
   - The Architect reads that message and commits the content to `docs/director-config-snapshots/YYYY-MM-DD/` via GitHub API

2. **DR-CFG gating:** The Director commits to filing a DR-CFG before making any intentional change to SOUL.md or IDENTITY.md. Changes to USER.md, TOOLS.md, HEARTBEAT.md are lower risk but still subject to the DR-CFG process.

3. **Diff alerting:** When a new snapshot is committed, the CI should diff it against the previous snapshot. Any change triggers a notification to `#alerts` so the Architect is aware.

4. **Short-term action (pre-ratification):** The Director should perform a one-time snapshot of all six config files and commit them to `docs/director-config-snapshots/2026-04-21/` as the baseline. This is the first step and should be actioned within 5 business days of this spec being ratified.

---

## 7. Open Issues and Risks

The following issues are tracked as blockers or high-priority actions. Each should result in a filed DR-CFG or handoff upon ratification.

| ID | Severity | Issue | Recommended Action | Owner |
|---|---|---|---|---|
| **R-001** | Critical | `CLAUDE_CODE_USE_MODEL` unset — model silently gateway-default | File DR-CFG-001 to set model explicitly per group | Architect |
| **R-002** | Critical | `GH_TOKEN` / `GITHUB_TOKEN` = CEO's personal PAT in all settings.json | Execute DR-001 (credential rotation to machine PAT) | CEO |
| **R-003** | High | All CLAUDE.md files outside git | Add all CLAUDE.md files to monorepo under `docs/agent-personas/`; update deploy scripts | Architect + DR-CFG |
| **R-004** | High | OpenClaw config files (SOUL.md etc.) not in any repo | Implement snapshot process per §6.4 | Director + Architect |
| **R-005** | High | `MAX_THINKING_TOKENS` undefined everywhere | Explicitly set to `0` in defaultEnv pending DR-CFG decision on enabling extended thinking | Architect |
| **R-006** | Medium | No CI enforcement of registry updates | Implement GitHub Actions lint check per §6.2 | Infra-eng handoff |
| **R-007** | Medium | `auth.json` rotation cadence undefined for Director | Define rotation cadence in DR-CFG filed by CEO | CEO |
| **R-008** | Low | `discord_hub-eng` settings.json missing `GH_TOKEN`/`GITHUB_TOKEN` and `AGENT_SCOPE`/`AGENT_ROLE` | Verify whether this is intentional or a gap; if gap, file DR-CFG | Architect |
| **R-009** | Low | `discord_paths-eng` settings.json missing `GH_TOKEN`/`GITHUB_TOKEN` | Verify and file DR-CFG if gap confirmed | Architect |

---

## Appendix A

### Full Per-Group Settings.json State (as of 2026-04-21)

For reference, the following table documents the complete env block of each known settings.json file at the time this specification was authored. This serves as the baseline snapshot that DR-CFG changes will be measured against.

| Group | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` | `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | `GH_TOKEN` | `GITHUB_TOKEN` | `AGENT_SCOPE` | `AGENT_ROLE` | `CLAUDE_CODE_USE_MODEL` |
|---|---|---|---|---|---|---|---|---|
| `discord_limitless-ops` | `"1"` | `"1"` | `"0"` | CEO PAT | CEO PAT | _(unset)_ | _(unset)_ | _(unset)_ |
| `discord_dt-eng` | `"1"` | `"1"` | `"0"` | CEO PAT | CEO PAT | `apps/digital-twin` | `architect` | _(unset)_ |
| `discord_cubes-eng` | `"1"` | `"1"` | `"0"` | CEO PAT | CEO PAT | `apps/cubes` | `architect` | _(unset)_ |
| `discord_infra-eng` | `"1"` | `"1"` | `"0"` | CEO PAT | CEO PAT | `infra` | `architect` | _(unset)_ |
| `discord_paths-eng` | `"1"` | `"1"` | `"0"` | _(unset)_ | _(unset)_ | _(unset)_ | _(unset)_ | _(unset)_ |
| `discord_hub-eng` | _(file absent — derived only)_ | — | — | — | — | `apps/hub` | `architect` | _(unset)_ |

**Notes:**
- `discord_paths-eng` is missing `GH_TOKEN`, `GITHUB_TOKEN`, `AGENT_SCOPE`, and `AGENT_ROLE`. This may be a bug (see R-008, R-009 in §7).
- `discord_hub-eng` was not found in `data/sessions/` at time of authoring. It will be created on first container spawn and populated from `container-runner.ts` defaultEnv plus the group's `containerConfig.envVars`.
- All CEO PAT references are the same token and are subject to DR-001 rotation.

---

*This specification was composed by the Architect on 2026-04-21 and is proposed for CEO ratification. Upon ratification, DR-CFG-001 should be filed within 5 business days to address R-001 (model selection) as the first governance action under this framework.*