# LIMITLESS Agentic Infrastructure — Cloud Deployment Plan

**Date:** 2026-04-02
**Author:** Architect (Main Instance)
**Classification:** Internal — Division Director
**Status:** DRAFT — Pending Director Approval

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Research Findings](#2-research-findings)
3. [Technology Selection](#3-technology-selection)
4. [Target Architecture](#4-target-architecture)
5. [Agent Fleet Design](#5-agent-fleet-design)
6. [Infrastructure Implementation](#6-infrastructure-implementation)
7. [Security Architecture](#7-security-architecture)
8. [Cost Analysis](#8-cost-analysis)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [Risk Register](#10-risk-register)

---

## 1. Executive Summary

### The Problem

Our agentic division (57 items, 5 phases complete) operates entirely from the Director's local machine. Every agent instance requires the Director to manually open a terminal, set environment variables, and launch Claude Code. This creates three limitations:

1. **No persistence** — agents only exist while the Director's terminal is open
2. **No autonomy** — agents can't wake up, check for work, or act without human initiation
3. **No scalability** — limited to however many terminals the Director can manage simultaneously

### The Solution

Deploy persistent, always-on AI agents on cloud VPS infrastructure using **NanoClaw** (container-isolated Claude Agent SDK wrapper) as the agent runtime, coordinated via **Discord** (existing infrastructure) and managed through a **Terraform + Ansible** IaC pipeline adapted from our previous `infra-docs` architecture.

### What Changes vs What Stays

| Stays the Same | Changes |
|---------------|---------|
| Discord communication (5 channels) | Agents run on cloud VPS, not local terminals |
| Structured handoff schema | Agents are always-on (daemon), not session-based |
| Boundary enforcement hooks | Proactive wake-ups (check for work periodically) |
| CLAUDE.md authority hierarchy | IaC-managed provisioning (Terraform + Ansible) |
| Monorepo + Turborepo builds | Container isolation per agent (Docker) |
| GitHub Actions CI/CD | Tailscale mesh for inter-agent networking |

### Scope (Trimmed to Current Needs)

Per Director's guidance: we are focused solely on **software development** for the Longevity OS. We do NOT need:
- Research/ML agents (no Biomarker AI, Clinical AI, Computer Vision teams)
- Lab/clinical software teams
- Security operations center (SecOps)
- 24/7 SRE on-call rotation

We DO need:
- Persistent Architect (orchestrator) — always-on, routes work, reviews PRs
- On-demand specialist engineers — spin up when work is assigned, spin down when done
- Automated QA — scheduled smoke tests, post-deploy verification
- Automated CI Agent — already implemented (GitHub Actions)

---

## 2. Research Findings

### The Claw Ecosystem (2026 State of the Art)

| Platform | Type | Lines of Code | License | Self-Hosted | Dev-Focused |
|----------|------|--------------|---------|-------------|-------------|
| **OpenClaw** | General-purpose personal AI assistant | ~500K | MIT | Yes (Docker/VPS) | No — messaging/automation |
| **NanoClaw** | Minimalist, container-isolated AI agent | ~3,900 | MIT | Yes (Docker/VPS) | Yes — built on Claude Agent SDK |
| **NemoClaw** | Enterprise OpenClaw (NVIDIA) | ~500K+ | Proprietary | Yes (K8s) | No — enterprise |

### Competing Platforms

| Platform | Self-Hosted | Multi-Agent | Dev-Focused | Cost Model |
|----------|-------------|-------------|-------------|------------|
| **Claude Agent SDK** | Yes (any VPS) | Subagents + MCP | Purpose-built | API tokens only |
| **Devin** | Enterprise VPC only | Parallel only | Purpose-built | $9/hr active |
| **OpenHands** | Yes (Docker/K8s) | Limited | Purpose-built | Free OSS + API |
| **MS Agent Framework** | Yes (open-source) | Best-in-class | Framework | Free + API |
| **CrewAI** | Yes (open-source) | Role-based | Framework | Free OSS |
| **LangGraph** | Yes (open-source) | Graph-based | Framework | Free OSS |

### Previous Work (`infra-docs` Repository)

The `chmod735-dor/infra-docs` repo contains a comprehensive architecture blueprint for deploying AI agents on cloud VPS:
- **Managing Agent** on AWS VPS (primary) + Oracle Cloud (warm standby)
- **Docker Compose** for container orchestration
- **Tailscale** WireGuard mesh for inter-agent encrypted networking
- **5-layer defense-in-depth** security model
- **Terraform + Ansible** IaC pattern (Terraform creates VMs, Ansible configures them)
- **8 Architecture Decision Records** covering container runtime, networking, secrets, IaC tooling

This blueprint is directly applicable. The key adaptation: replace OpenClaw runtime with NanoClaw (which uses Claude Agent SDK — our existing stack).

---

## 3. Technology Selection

### Primary Runtime: NanoClaw

**Why NanoClaw over OpenClaw:**
- Built on **Claude Agent SDK** — same technology our entire stack uses. Zero impedance mismatch.
- **~3,900 lines** vs OpenClaw's ~500K — auditable, debuggable, forkable
- **Container isolation** — each agent runs in its own Docker container with its own filesystem. OS-level security, not application-level.
- **Skills system** — extend via Discord skill, Git skill, custom skills for our monorepo workflow
- **Per-group memory** — each agent gets its own `CLAUDE.md` context, matching our existing agent definition architecture

**Why not the alternatives:**
- **OpenClaw** — overkill. 500K lines of messaging-automation code we don't need. Not dev-focused.
- **Devin** — SaaS-only. We can't self-host or customize. $9/hr adds up fast.
- **OpenHands** — strong alternative, but model-agnostic means we'd lose Claude-specific features (CLAUDE.md, hooks, MCP). Worth revisiting if Claude Agent SDK becomes limiting.
- **MS Agent Framework / CrewAI / LangGraph** — framework-level. We'd have to build the entire dev workflow on top. NanoClaw gives us a working agent runtime out of the box.

### Infrastructure: Adapted from `infra-docs`

| Component | `infra-docs` Choice | Our Choice | Rationale |
|-----------|-------------------|------------|-----------|
| Cloud provider | AWS primary + Oracle standby | **Hetzner primary** + Oracle standby | Hetzner: better price/performance for VPS ($5-10/mo); Oracle free tier for standby |
| Container runtime | Docker Engine + Compose v2 | **Docker Engine + Compose v2** | Same — NanoClaw's supported deployment model |
| Inter-agent networking | Tailscale | **Tailscale** | Same — WireGuard mesh, zero-config, ACL-based access |
| IaC | Terraform + Ansible | **Terraform + Ansible** | Same — Terraform creates VMs, Ansible configures them |
| Agent runtime | OpenClaw Gateway | **NanoClaw** | Better fit — Claude Agent SDK native, container-isolated, minimal |
| Communication | Telegram | **Discord** | Already in place — 5 channels, bot configured, hooks tested |
| Secrets | `.env` on host | **`.env` on host** (Phase 1) → Agent Vault (Phase 2) | NanoClaw supports OneCLI Agent Vault for production |

### Recommendation: Hetzner Cloud

| Provider | Spec | Monthly Cost | Notes |
|----------|------|-------------|-------|
| **Hetzner CX22** | 2 vCPU, 4GB RAM, 40GB SSD | ~€4.50/mo (~$5) | Sufficient for 1-2 agents |
| **Hetzner CX32** | 4 vCPU, 8GB RAM, 80GB SSD | ~€8.50/mo (~$9) | Comfortable for 2-4 concurrent agents |
| **Oracle Cloud** | ARM A1.Flex 4 vCPU, 24GB RAM | **Free** (always free tier) | Warm standby / overflow |

---

## 4. Target Architecture

### Deployment Topology

```
┌──────────────────────────────────────────────────────────────────┐
│                     DIRECTOR (Human)                              │
│                     Discord Client                                │
│                     Reviews · Approves · Routes                   │
└───────────────────────────┬──────────────────────────────────────┘
                            │ Discord
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│                   VPS-1: Hetzner CX32 (PRIMARY)                  │
│                   Frankfurt · Docker · Tailscale                  │
│                                                                   │
│   ┌─────────────────┐   ┌─────────────────┐                     │
│   │   ARCHITECT      │   │   PATHS ENG.    │                     │
│   │   (NanoClaw)     │   │   (NanoClaw)    │                     │
│   │   Always-on      │   │   On-demand     │                     │
│   │   Container      │   │   Container     │                     │
│   └────────┬────────┘   └────────┬────────┘                     │
│            │                      │                               │
│   ┌────────▼────────┐   ┌────────▼────────┐                     │
│   │   CUBES+ ENG.   │   │   HUB/DT ENG.  │                     │
│   │   (NanoClaw)    │   │   (NanoClaw)    │                     │
│   │   On-demand     │   │   On-demand     │                     │
│   │   Container     │   │   Container     │                     │
│   └─────────────────┘   └─────────────────┘                     │
│                                                                   │
│   Shared: Docker network · Monorepo clone · Tailscale node       │
└──────────────────────────────────────────────────────────────────┘
                            │ Tailscale (encrypted)
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│               VPS-2: Oracle Cloud (STANDBY)                      │
│               ARM · Docker · Tailscale                            │
│                                                                   │
│   ┌─────────────────┐   ┌─────────────────┐                     │
│   │   QA AGENT      │   │   OVERFLOW      │                     │
│   │   (NanoClaw)    │   │   (NanoClaw)    │                     │
│   │   Scheduled     │   │   On-demand     │                     │
│   │   Container     │   │   Container     │                     │
│   └─────────────────┘   └─────────────────┘                     │
│                                                                   │
│   Shared: Docker network · Monorepo clone · Tailscale node       │
└──────────────────────────────────────────────────────────────────┘
```

### Agent Lifecycle

```
IDLE ──[handoff posted to Discord]──> STARTING
   │                                      │
   │                                      ▼
   │                                  RUNNING
   │                                      │
   │                          ┌───────────┴───────────┐
   │                          │                       │
   │                     [work done]            [blocked/error]
   │                          │                       │
   │                          ▼                       ▼
   │                    COMPLETING              ESCALATING
   │                          │                       │
   │                          ▼                       ▼
   └──────────────────── IDLE ◄────────────── IDLE
```

**Architect Agent (always-on):**
- Runs 24/7 as a NanoClaw daemon
- Proactive wake-up every 30 minutes: checks Discord #handoffs, #alerts, open PRs
- Posts daily briefing at 09:00 UTC
- Routes work to specialist engineers by posting structured handoffs
- Reviews PRs via GitHub API

**Specialist Engineers (on-demand):**
- Spawned by the Architect when work is assigned
- NanoClaw container with monorepo clone + agent-specific CLAUDE.md
- Execute handoff → create PR → post completion to Discord → container stops
- Docker container auto-removed after 1 hour of inactivity

**QA Agent (scheduled):**
- Runs on schedule (post-deploy, daily smoke test)
- Playwright tests + health checks
- Posts results to Discord #workbench-ops or #alerts

---

## 5. Agent Fleet Design

### Mapping Original Guide Roles to Our Implementation

The original agentic guide specified ~35 persistent agents across 7 sub-divisions. Our trimmed implementation for software development:

| Original Role | Our Agent | Tier | Runtime | VPS |
|--------------|-----------|------|---------|-----|
| CTO Agent | **Architect** | Persistent (always-on) | NanoClaw | VPS-1 |
| VP Engineering | (merged into Architect) | — | — | — |
| VP AI/Research | NOT NEEDED (no research) | — | — | — |
| CISO | NOT NEEDED (security via hooks + CI) | — | — | — |
| Clinical Platform Squad | NOT NEEDED | — | — | — |
| Lab Systems Squad | NOT NEEDED | — | — | — |
| PATHS Engineer | **PATHS Engineer** | On-demand | NanoClaw | VPS-1 |
| HUB Engineer | **HUB Engineer** | On-demand | NanoClaw | VPS-1 |
| DT Engineer | **DT Engineer** | On-demand | NanoClaw | VPS-1 |
| Cubes+ Engineer | **Cubes+ Engineer** | On-demand | NanoClaw | VPS-1 |
| Infra Engineer | **Infra Engineer** | On-demand | NanoClaw | VPS-1 |
| QA Automation Lead | **QA Agent** | Scheduled | NanoClaw | VPS-2 |
| CI Agent | **CI Agent** | Automated | GitHub Actions | N/A |
| Sprint Orchestrator | (merged into Architect) | — | — | — |
| Compliance Audit | NOT NEEDED | — | — | — |

**Total: 7 agents (1 persistent + 5 on-demand + 1 scheduled) + 1 CI Agent (GitHub Actions)**

This matches exactly what we built in Phases 1-5 — the only change is WHERE they run (cloud VPS instead of local terminals).

### NanoClaw Agent Configuration

Each agent is a NanoClaw instance with:

```
groups/<agent-name>/
├── CLAUDE.md          # Agent-specific instructions (from .claude/agents/<name>.md)
├── SKILL.md           # Skills loaded for this agent
└── state.db           # SQLite persistent state
```

**Skills each agent needs:**
- **Discord skill** — read/write to ops channels, handoffs, alerts
- **Git skill** — clone monorepo, create branches, commit, push
- **GitHub skill** — create PRs, read PR comments, react to reviews
- **Render skill** — trigger deploys, check deploy status (via API)

---

## 6. Infrastructure Implementation

### Phase 1: Single VPS with Architect Agent

**Goal:** Get one persistent agent (Architect) running 24/7 on a Hetzner VPS.

**Steps:**

1. **Provision VPS:**
   ```hcl
   # terraform/hetzner.tf
   resource "hcloud_server" "agent_primary" {
     name        = "limitless-agents-1"
     server_type = "cx32"
     image       = "ubuntu-24.04"
     location    = "fsn1"  # Frankfurt
     ssh_keys    = [hcloud_ssh_key.deploy.id]
   }
   ```

2. **Configure host (Ansible):**
   - SSH hardening (key-only, no root login, fail2ban)
   - Docker Engine + Compose v2
   - Tailscale node (join mesh)
   - UFW firewall (default deny, allow SSH + Tailscale)
   - Clone monorepo (`LIMITLESS-LONGEVITY/limitless`)
   - Install NanoClaw (`gh repo fork qwibitai/nanoclaw --clone`)

3. **Configure Architect Agent:**
   - Copy `CLAUDE.md` (umbrella) + `agents/architect.md` into NanoClaw group
   - Set environment: `ANTHROPIC_API_KEY`, Discord bot token
   - Configure Discord skill (connect to 5 channels)
   - Configure Git/GitHub skills (SSH key, gh CLI auth)
   - Set proactive wake-up interval: 30 minutes
   - Set daily briefing cron: 09:00 UTC

4. **Start and verify:**
   - `docker compose up -d`
   - Verify Architect posts "Online" to #main-ops
   - Verify proactive wake-up checks #handoffs
   - Verify daily briefing posts to #main-ops

### Phase 2: Add Specialist Engineers

**Goal:** Enable the Architect to spawn specialist engineer containers on demand.

**Steps:**

1. **Create engineer container templates:**
   - Docker image with: Node.js 20, pnpm, git, gh CLI, NanoClaw
   - Pre-clone monorepo
   - Mount agent-specific CLAUDE.md
   - Auto-shutdown after 1 hour idle

2. **Architect spawn protocol:**
   - Architect receives handoff (or Director routes work)
   - Architect runs: `docker compose run --rm paths-engineer`
   - Engineer container starts, reads handoff from Discord
   - Engineer creates branch, implements, creates PR
   - Engineer posts completion to #workbench-ops
   - Container auto-removes

3. **Docker Compose service definitions:**
   ```yaml
   services:
     architect:
       build: ./containers/architect
       restart: always
       volumes:
         - ./monorepo:/workspace
         - ./groups/architect:/groups/architect
       environment:
         - ANTHROPIC_API_KEY
         - DISCORD_BOT_TOKEN
         - AGENT_ROLE=architect

     paths-engineer:
       build: ./containers/engineer
       profiles: ["on-demand"]
       volumes:
         - ./monorepo:/workspace
         - ./groups/paths:/groups/paths
       environment:
         - ANTHROPIC_API_KEY
         - DISCORD_BOT_TOKEN
         - AGENT_ROLE=paths-engineer
   ```

### Phase 3: Add QA Agent + Standby Node

**Goal:** Scheduled QA on Oracle Cloud + warm standby for overflow.

**Steps:**

1. Provision Oracle Cloud ARM instance (free tier)
2. Join Tailscale mesh
3. Deploy QA Agent with Playwright + scheduled cron
4. Configure as overflow: Architect can route work to VPS-2 when VPS-1 is busy

---

## 7. Security Architecture

Adapted from `infra-docs` 5-layer defense-in-depth:

| Layer | Implementation |
|-------|---------------|
| **1. Network** | UFW default-deny. SSH + Tailscale only. No management ports on public interfaces. All agent traffic over Tailscale WireGuard. |
| **2. Host OS** | SSH key-only (no passwords, no root login). fail2ban. unattended-upgrades. Minimal packages. |
| **3. Docker** | Non-root containers (`node` user uid 1000). `cap_drop: ALL`. `no-new-privileges`. Ports bound to `127.0.0.1`. Read-only filesystem where possible. |
| **4. Application** | NanoClaw container isolation. Agent boundary enforcement (AGENT_ROLE + session_id hooks). Discord bot token per agent. |
| **5. Secrets** | `.env` at 600 permissions (Phase 1). NanoClaw Agent Vault (Phase 2). Never in Git. 90-day rotation. |

### Agent-Specific Security

- Each agent container has **read-only access** to the monorepo except its own app directory
- The Architect container has **read-only access** to all code (can review but not modify)
- Only the Architect can spawn/stop other agent containers
- All agent actions logged to immutable audit trail (NanoClaw SQLite + Docker logs)
- SSH access to VPS: Director only (no agent self-modification of infrastructure)

---

## 8. Cost Analysis

### Monthly Operating Costs

| Item | Cost | Notes |
|------|------|-------|
| Hetzner CX32 VPS | ~$9/mo | 4 vCPU, 8GB RAM, Frankfurt |
| Oracle Cloud ARM | $0/mo | Always free tier (4 vCPU, 24GB RAM) |
| Tailscale | $0/mo | Free for 3 users, 100 devices |
| Claude API (Architect, always-on) | ~$30-60/mo | Proactive wake-ups + daily briefings + PR reviews |
| Claude API (Engineers, on-demand) | ~$20-50/mo | Depends on task volume |
| Claude API (QA, scheduled) | ~$5-10/mo | Daily smoke tests |
| Render (existing services) | ~$116/mo | Already paying — unchanged |
| **TOTAL NEW COST** | **~$64-129/mo** | On top of existing Render costs |

### Comparison to Human Engineers

| Model | Annual Cost | Capability |
|-------|-----------|------------|
| 1 junior developer | ~$60-80K | 1 person, 8h/day, single repo expertise |
| Our agentic fleet | ~$768-1,548/yr | 7 agents, 24/7, all repos, instant context switching |
| Original guide (95 humans) | $17-29M/yr | Full division |

---

## 9. Implementation Roadmap

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| **1: Architect Agent** | 1-2 sessions | Hetzner VPS provisioned, NanoClaw installed, Architect running 24/7, Discord connected, proactive wake-ups verified |
| **2: Engineer Fleet** | 1-2 sessions | Docker templates for 5 engineers, spawn/stop protocol, Architect can delegate work autonomously |
| **3: QA + Standby** | 1 session | Oracle Cloud VPS, QA Agent with Playwright, Tailscale mesh verified |
| **4: IaC Automation** | 1-2 sessions | Terraform + Ansible scripts for fleet provisioning, `provision-agent.sh` and `teardown-agent.sh` |
| **5: Production Hardening** | 1 session | Security checklist completion, secrets rotation, monitoring alerts, DR test |

**Total: 5-8 sessions**

### Prerequisites Before Starting

1. **Hetzner Cloud account** with API token
2. **Tailscale account** (free tier sufficient)
3. **Anthropic API key** for cloud agents (separate from CI key)
4. **Discord bot token** (existing one works if not rate-limited; or create a second bot for cloud agents)
5. **SSH key pair** for VPS access

---

## 10. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| **Claude API costs higher than estimated** | Medium | Medium | Set monthly budget cap in Anthropic console; use Sonnet (not Opus) for routine work; Haiku for monitoring |
| **NanoClaw instability** | Low | High | NanoClaw is ~3,900 lines — we can debug/fix it. Fork and maintain our own version if needed. |
| **Agent runs amok (infinite loop, bad commits)** | Medium | High | Boundary enforcement hooks (already built); PR-based workflow (agent can't push to main directly); Docker resource limits (CPU, memory, disk) |
| **VPS goes down** | Low | Medium | Oracle Cloud standby node; Tailscale failover; Architect can run locally as fallback |
| **Discord rate limiting** | Medium | Low | Separate bot per agent cluster; message batching; reduce proactive check frequency if needed |
| **Secrets exposure** | Low | High | `.env` at 600 perms; never in Git; NanoClaw Agent Vault in Phase 2; container isolation prevents cross-agent access |
| **Monorepo sync conflicts** | Medium | Medium | Each agent works on feature branches; PRs prevent direct-to-main; git pull before every task start |

---

## Appendix A: Key Decisions for Director Approval

| # | Decision | Recommendation | Alternatives |
|---|----------|---------------|-------------|
| 1 | Agent runtime | **NanoClaw** | OpenClaw (overkill), Claude Agent SDK direct (more DIY), OpenHands (different model) |
| 2 | Primary VPS | **Hetzner CX32** (~$9/mo) | AWS t3.medium (~$30/mo), DigitalOcean ($24/mo) |
| 3 | Standby VPS | **Oracle Cloud free tier** | Hetzner CX22 ($5/mo), no standby |
| 4 | Inter-node networking | **Tailscale** | WireGuard manual, Cloudflare Tunnel, SSH tunnels |
| 5 | Always-on agents | **Architect only** | All agents always-on (higher API cost), none always-on (current state) |
| 6 | IaC tooling | **Terraform + Ansible** | Pulumi + Ansible, Docker Machine, manual setup |

---

*This plan builds on the 57-item agentic division foundation (Phases 1-5 complete) and extends it from local-terminal execution to persistent cloud infrastructure. The core workflows, hooks, handoff schemas, and CI/CD pipeline remain unchanged — only the execution environment changes.*
