# LIMITLESS Agentic Software Development Division — Orchestration Architecture

**Date:** 2026-04-05
**Status:** OPERATIONAL — verified end-to-end 2026-04-05

---

## 1. High-Level Orchestration Flow

```mermaid
flowchart TB
    subgraph DIRECTOR["👤 DIRECTOR (Human)"]
        D[Discord Client]
    end

    subgraph DISCORD["Discord — LIMITLESS Ops Server"]
        MO["#main-ops<br/>Architect reports + Director commands"]
        WK["#workers<br/>Worker activity"]
        AL["#alerts<br/>Escalations"]
    end

    subgraph VPS["☁️ HETZNER VPS — NanoClaw Runtime"]
        NC["NanoClaw Host Process<br/>Message routing · Container lifecycle<br/>IPC polling · Notification relay"]

        subgraph ARCH_CONTAINER["🏗️ Architect Container (ephemeral)"]
            ARCH["Architect Agent<br/>Claude Agent SDK<br/>Orchestration CLAUDE.md"]
        end

        subgraph WORKERS["Worker Containers (ephemeral, parallel)"]
            W1["Executor<br/>scope: apps/paths"]
            W2["Executor<br/>scope: apps/cubes"]
            W3["Debugger<br/>scope: apps/paths"]
            W4["Verifier<br/>scope: *"]
        end
    end

    subgraph GITHUB["GitHub — LIMITLESS-LONGEVITY/limitless"]
        REPO["Monorepo<br/>apps/ · infra/ · packages/ · docs/"]
        PR["Pull Requests"]
        CI["GitHub Actions CI"]
    end

    D -->|"types task"| MO
    MO -->|"message event"| NC
    NC -->|"spawns container"| ARCH
    ARCH -->|"IPC: register_group<br/>+ Discord message"| NC
    NC -->|"spawns containers"| WORKERS
    WORKERS -->|"IPC: status/<br/>heartbeat · completion · failure"| NC
    NC -->|"relays to worker-status/"| ARCH
    WORKERS -->|"IPC: notification"| NC
    NC -->|"posts on behalf"| WK
    ARCH -->|"reports"| MO
    ARCH -->|"escalates"| AL
    WORKERS -->|"git push + gh pr create"| PR
    PR -->|"triggers"| CI
    ARCH -->|"merges if CI passes"| PR

    style DIRECTOR fill:#1a1a2e,stroke:#e6c14f,color:#fff
    style VPS fill:#1a1a2e,stroke:#4ecdc4,color:#fff
    style GITHUB fill:#1a1a2e,stroke:#888,color:#fff
    style DISCORD fill:#1a1a2e,stroke:#5865F2,color:#fff
    style ARCH_CONTAINER fill:#2d3436,stroke:#e6c14f,color:#fff
    style WORKERS fill:#2d3436,stroke:#4ecdc4,color:#fff
```

---

## 2. Task Lifecycle — From Director Command to Merged PR

```mermaid
sequenceDiagram
    actor Director
    participant Discord as Discord #main-ops
    participant NC as NanoClaw Host
    participant Arch as Architect Container
    participant Exec as Executor Container
    participant GH as GitHub

    Director->>Discord: @Architect task description
    Discord->>NC: message event
    NC->>Arch: spawn container (if idle)

    Note over Arch: Analyze complexity<br/>Check specificity (file paths, code refs)

    alt Simple task (single file, clear path)
        Arch->>NC: IPC: register_group<br/>{role: executor, scope: apps/X, envVars}
        NC->>NC: create git worktree
        Arch->>Discord: task message to #workers
        NC->>Exec: spawn container<br/>(worktree mounted, GH_TOKEN injected)

        Note over Exec: Read CLAUDE.md<br/>Write code · Build · Verify

        Exec->>NC: IPC: heartbeat (every 2min)
        NC->>Arch: relay to worker-status/
        Exec->>GH: git push + gh pr create
        Exec->>NC: IPC: completion {prUrl, summary}
        NC->>Arch: relay completion
    else Complex task (multi-file, cross-app)
        Arch->>NC: spawn Planner first
        Note over Arch: Planner→Architect review<br/>(max 3 rounds)
        Arch->>NC: spawn Executor(s) from plan
    end

    Arch->>NC: IPC: deregister_group
    NC->>NC: remove worktree
    GH->>GH: CI runs (build, review)

    alt CI passes
        Arch->>Discord: "PR #N ready, merging"
        Arch->>GH: merge PR
    else CI fails
        Arch->>NC: spawn Debugger
    end

    Arch->>Discord: completion report to #main-ops
    Director->>Director: reviews async
```

---

## 3. Capability-Based Agent Catalog

```mermaid
graph TB
    subgraph ORCHESTRATION["Tier 1: Orchestration"]
        ARCH_ROLE["🏗️ Architect<br/>Model: Opus<br/>Persistent orchestrator<br/>Plans · Spawns · Monitors · Reports"]
    end

    subgraph BUILD["Tier 2: Build Lane"]
        PLAN["📋 Planner<br/>Model: Opus<br/>Read-only analysis<br/>Task decomposition"]
        EXEC["⚡ Executor<br/>Model: Opus<br/>Writes code<br/>Primary producer"]
        DEBUG["🔍 Debugger<br/>Model: Opus<br/>Diagnosis-first<br/>Surgical fixes"]
        EXPLORE["🔭 Explorer<br/>Model: Sonnet<br/>Fast read-only<br/>Impact analysis"]
    end

    subgraph VERIFY["Tier 2: Verification Lane"]
        VER["✅ Verifier<br/>Model: Sonnet<br/>Build · Health · Acceptance"]
        TEST["🧪 Test Engineer<br/>Model: Sonnet<br/>Writes tests only"]
    end

    subgraph REVIEW["Tier 2: Review Lane"]
        REV["📝 Code Reviewer<br/>Model: Opus<br/>Quality · Security · Patterns"]
    end

    ARCH_ROLE -->|spawns| PLAN
    ARCH_ROLE -->|spawns| EXEC
    ARCH_ROLE -->|spawns| DEBUG
    ARCH_ROLE -->|spawns| EXPLORE
    ARCH_ROLE -->|spawns| VER
    ARCH_ROLE -->|spawns| TEST
    ARCH_ROLE -->|spawns| REV

    style ORCHESTRATION fill:#2d3436,stroke:#e6c14f,color:#fff
    style BUILD fill:#2d3436,stroke:#4ecdc4,color:#fff
    style VERIFY fill:#2d3436,stroke:#6c5ce7,color:#fff
    style REVIEW fill:#2d3436,stroke:#fd79a8,color:#fff
```

---

## 4. Container Isolation & Communication

```mermaid
flowchart LR
    subgraph HOST["NanoClaw Host Process"]
        IPC_WATCHER["IPC Watcher<br/>(polls every 1s)"]
        DISCORD_BOT["Discord Bot<br/>LIMITLESS Architect#5684"]
        CONTAINER_RUNNER["Container Runner<br/>Docker spawn/stop"]
    end

    subgraph ARCH_C["Architect Container"]
        ARCH_IPC["IPC Directory<br/>/workspace/ipc/"]
        ARCH_TASKS["tasks.json<br/>(task state)"]
        ARCH_WS["worker-status/<br/>(relayed by host)"]
    end

    subgraph WORKER_C["Worker Container (isolated)"]
        W_IPC["IPC Directory<br/>/workspace/ipc/"]
        W_STATUS["status/<br/>heartbeat · completion"]
        W_NOTIFY["messages/<br/>notification events"]
        W_CODE["/workspace/extra/monorepo/<br/>(git worktree, read-write)"]
    end

    ARCH_IPC -->|"register_group<br/>deregister_group"| IPC_WATCHER
    IPC_WATCHER -->|"spawn/stop"| CONTAINER_RUNNER
    CONTAINER_RUNNER -->|"creates"| WORKER_C

    W_STATUS -->|"read by host"| IPC_WATCHER
    IPC_WATCHER -->|"writes to"| ARCH_WS
    W_NOTIFY -->|"read by host"| IPC_WATCHER
    IPC_WATCHER -->|"posts to Discord"| DISCORD_BOT

    DISCORD_BOT -->|"messages"| ARCH_C

    style HOST fill:#0d1b2a,stroke:#e6c14f,color:#fff
    style ARCH_C fill:#1b2838,stroke:#e6c14f,color:#fff
    style WORKER_C fill:#1b2838,stroke:#4ecdc4,color:#fff
```

---

## 5. Credential Injection Chain

```mermaid
flowchart TD
    ENV[".env on VPS host<br/>GH_TOKEN=github_pat_..."]
    SYSTEMD["systemd EnvironmentFile<br/>loads .env into process env"]
    PROCESS["NanoClaw process.env<br/>GH_TOKEN available"]
    DOCKER["container-runner.ts<br/>args.push('-e', GH_TOKEN=...)"]
    CONTAINER["Container process env<br/>(docker inspect confirms)"]
    ENTRYPOINT["entrypoint.sh<br/>writes to /etc/environment"]
    BASHRC["/etc/bash.bashrc<br/>set -a; source /etc/environment; set +a"]
    SUBAGENT["Subagent bash tool<br/>$GH_TOKEN = 93 chars ✅"]
    GIT["git push + gh pr create<br/>authenticated ✅"]

    ENV --> SYSTEMD --> PROCESS --> DOCKER --> CONTAINER --> ENTRYPOINT --> BASHRC --> SUBAGENT --> GIT

    style ENV fill:#2d3436,stroke:#fd79a8,color:#fff
    style SUBAGENT fill:#2d3436,stroke:#00b894,color:#fff
    style GIT fill:#2d3436,stroke:#00b894,color:#fff
```

---

## 6. Failure Handling

```mermaid
flowchart TD
    FAIL{"Worker reports<br/>failure"}

    FAIL -->|"Build error"| SPAWN_DBG["Architect spawns<br/>Debugger with error context"]
    FAIL -->|"Same error 3x"| ESCALATE["Architect posts to<br/>#alerts — Director intervention"]
    FAIL -->|"No heartbeat 10min"| STALE["Architect terminates<br/>container, reassigns task"]
    FAIL -->|"Max retries (2x)"| ESCALATE

    SPAWN_DBG -->|"Fix found"| RETRY["Debugger creates PR"]
    SPAWN_DBG -->|"Fix failed"| ESCALATE

    RETRY --> VERIFY["Architect spawns<br/>Verifier"]
    VERIFY -->|"Pass"| MERGE["Architect merges PR"]
    VERIFY -->|"Fail"| FAIL

    style FAIL fill:#e74c3c,stroke:#fff,color:#fff
    style ESCALATE fill:#e74c3c,stroke:#fff,color:#fff
    style MERGE fill:#00b894,stroke:#fff,color:#fff
```

---

## 7. Key Distinction from OMX

```mermaid
graph LR
    subgraph OMX["OMX / claw-code Stack"]
        OMX_D["Discord input"]
        OMX_O["oh-my-codex<br/>Workflow CLI"]
        OMX_C["clawhip<br/>Notification daemon"]
        OMX_T["tmux<br/>Process isolation"]
        OMX_W["Worktrees<br/>File isolation"]
        OMX_D --> OMX_O --> OMX_T --> OMX_W
        OMX_O --> OMX_C
    end

    subgraph LIMITLESS["LIMITLESS Stack"]
        L_D["Discord input"]
        L_NC["NanoClaw<br/>Container runtime +<br/>Notification relay +<br/>IPC orchestration"]
        L_DOCKER["Docker<br/>OS-level isolation"]
        L_WT["Worktrees<br/>File isolation"]
        L_HOOKS["Hooks + Gates<br/>Hard enforcement"]
        L_D --> L_NC --> L_DOCKER --> L_WT
        L_NC --> L_HOOKS
    end

    style OMX fill:#1a1a2e,stroke:#888,color:#fff
    style LIMITLESS fill:#1a1a2e,stroke:#e6c14f,color:#fff
```

| Dimension | OMX | LIMITLESS |
|-----------|-----|-----------|
| **Container isolation** | tmux (process-level) | Docker (OS-level, kernel namespaces) |
| **Notification routing** | clawhip (separate daemon) | NanoClaw IPC relay (built-in) |
| **Credential model** | Local workstation env | 3-layer injection chain (IaC) |
| **Governance** | Prompt engineering | Hook + gate enforcement (code, not prose) |
| **Cloud deployment** | Not built-in | Hetzner VPS + systemd + Terraform |
| **Cost model** | API tokens ($3/MTok) | Max subscription ($100/mo flat) |
| **Agent spawning** | tmux split-window | Docker container spawn via IPC |
| **Crash recovery** | Event-sourced Rust engine | Filesystem tasks.json + heartbeat |
