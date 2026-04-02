# Terraform Infrastructure as Code — Design Spec

**Date:** 2026-03-22
**Status:** Approved
**Type:** Infrastructure / DevOps
**Goal:** Codify the entire LIMITLESS production infrastructure in Terraform for disaster recovery, multi-environment support, and future app scaling.

---

## Table of Contents

1. [Purpose & Goals](#1-purpose--goals)
2. [Provider Overview](#2-provider-overview)
3. [Architecture & File Structure](#3-architecture--file-structure)
4. [State Management](#4-state-management)
5. [Resource Specification](#5-resource-specification)
6. [Reusable Module](#6-reusable-module)
7. [Import Strategy](#7-import-strategy)
8. [Variables & Secrets](#8-variables--secrets)
9. [Workflow & Operations](#9-workflow--operations)
10. [Safety Controls](#10-safety-controls)

---

## 1. Purpose & Goals

### Primary goals

1. **Disaster recovery** — if everything disappears, `terraform apply` rebuilds the full infrastructure
2. **Multi-environment** — parameterized configs for spinning up staging/dev copies on demand
3. **Future app scaling** — reusable module pattern so deploying CUBES+ and HUBS is trivial

### What gets codified

Every production resource across 5 providers:
- Render: web service, PostgreSQL, Redis, project, environment variables
- Vercel: 2 projects (PATHS frontend, contributor guide), domains, environment variables
- Cloudflare: DNS zone, 4 CNAME records, R2 bucket
- Sentry: organization, 2 projects, client keys, team
- GitHub: repository settings

### What stays manual

- Account creation and billing on all platforms
- Git integration OAuth (Render ↔ GitHub, Vercel ↔ GitHub)
- Initial Terraform Cloud setup
- Database data (backups, migrations, seed data)
- R2 object uploads (content files)
- Resend domain verification DNS records

---

## 2. Provider Overview

| Provider | Source | Version | Tier | Notes |
|----------|--------|---------|------|-------|
| Render | `render-oss/render` | `~> 1.8` | Partner (Official) | Stable, covers all our resources |
| Vercel | `vercel/vercel` | `~> 4.6` | Partner (Official) | Stable, 7M+ downloads |
| Cloudflare | `cloudflare/cloudflare` | `~> 5.4` | Partner (Official) | Most mature, 229M+ downloads. Pin to stable v5 minor. |
| Sentry | `jianyuan/sentry` | `~> 0.14` | Community | Pre-1.0 but 19M+ downloads, actively maintained. Must set `base_url` to EU endpoint |
| GitHub | `integrations/github` | `~> 6.0` | Partner (Official) | Most downloaded, 274M+ |

### Provider configuration

```hcl
provider "render" {
  api_key = var.render_api_key
}

provider "vercel" {
  api_token = var.vercel_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token  # scoped token (DNS + R2 edit), not global API key
}

provider "sentry" {
  token    = var.sentry_token
  base_url = "https://de.sentry.io/api/"  # EU region — critical
}

provider "github" {
  token = var.github_token
  owner = "LIMITLESS-LONGEVITY"
}
```

---

## 3. Architecture & File Structure

### Approach: Monolith workspace with organized files

Single Terraform workspace, one `terraform apply` gives the full picture. Resources organized by logical grouping in separate files. Reusable module skeleton for future apps.

```
limitless-infra/
├── main.tf              — Terraform settings, backend config, provider blocks
├── versions.tf          — Required provider versions (pinned)
├── variables.tf         — All variable declarations
├── foundation.tf        — Cloudflare zone, GitHub repo, Sentry org data source
├── paths.tf             — Render services, Vercel PATHS project, Sentry projects, DNS, R2
├── guide.tf             — Vercel guide project, DNS record
├── outputs.tf           — URLs, service IDs, connection info
├── .gitignore           — *.tfstate, *.tfvars, .terraform/, *.tfstate.backup
├── README.md            — Setup instructions, workflow, import guide
└── modules/
    └── learnhouse-app/  — Reusable module skeleton for future apps
        ├── main.tf      — Resource definitions (parameterized)
        ├── variables.tf — Module input variables
        ├── outputs.tf   — Module outputs
        └── README.md    — Module usage documentation
```

### Why monolith (not layered)

At current scale (~15 resources, 1 app), layers add cross-workspace state reference complexity without benefit. A single workspace with well-organized files is easier to understand, debug, and maintain. Migration to layers is straightforward when the team or resource count grows significantly.

---

## 4. State Management

### Terraform Cloud (free tier)

```hcl
terraform {
  cloud {
    organization = "limitless-longevity"
    workspaces {
      name = "production"
    }
  }
}
```

| Feature | Details |
|---------|---------|
| Plan | Free (up to 500 managed resources) |
| State encryption | At rest, automatic |
| State versioning | Automatic, rollback available |
| State locking | Automatic (prevents concurrent modifications) |
| Sensitive values | Masked in UI and plan output |
| Execution mode | Local (runs on your machine, state stored remotely) |

### Why Terraform Cloud over alternatives

- No infrastructure to manage (vs. R2 backend needing encryption + locking setup)
- State backup and history built-in (vs. local file with no backup)
- Sensitive values masked automatically
- Collaboration-ready when team grows
- Free tier is more than sufficient

---

## 5. Resource Specification

### 5.1 Foundation (`foundation.tf`)

Resources that exist once and are shared across all apps. Managed resources use `prevent_destroy`.

| Resource | Terraform Type | Import ID | Notes |
|----------|---------------|-----------|-------|
| Cloudflare zone | `cloudflare_zone.main` (resource) | `6cdc4cf703e6e7f5d3f768abc956900f` | `prevent_destroy` |
| GitHub repository | `github_repository.limitless_paths` (resource) | `limitless-paths` | `prevent_destroy` |
| Sentry organization | `data.sentry_organization.main` (data source) | N/A — looked up by slug | Data source only — Sentry orgs cannot be managed via Terraform |

**Note:** Render "Projects" (the UI grouping feature) are not exposed in the Terraform provider. Service grouping remains a manual dashboard operation. The `render_project` resource does not exist.

### 5.2 PATHS (`paths.tf`)

| Resource | Terraform Type | Key Configuration |
|----------|---------------|-------------------|
| PostgreSQL | `render_postgres.paths_db` | Frankfurt, basic_256mb, PG 18, 1GB disk, `prevent_destroy` |
| Redis | `render_redis.paths_redis` | Frankfurt, free, allkeys_lru |
| Web Service | `render_web_service.paths_api` | Frankfurt, starter, Python, uv build, health check `/api/v1/health` |
| Vercel Project | `vercel_project.paths_web` | Next.js, `apps/web` root, fra1 region, bun install/build |
| Vercel Domains | `vercel_project_domain` × 2 | `paths.*`, `paths-admin.*` |
| Vercel Env Vars | `vercel_project_environment_variable` × 6 | One resource per env var (singular, not plural) |
| Sentry Team | `sentry_team.paths` | Team for PATHS projects |
| Sentry Projects | `sentry_project` × 2 | `paths-api` (Python/FastAPI), `paths-web` (JS/Next.js) |
| Sentry Keys | `sentry_key` × 2 | DSN keys for each project |
| DNS Records | `cloudflare_dns_record` × 3 | `paths`, `paths-admin`, `paths-api` CNAMEs |
| R2 Bucket | `cloudflare_r2_bucket` | `limitless-paths-content`, WEUR location |

**Environment variables on Render web service:**

The `render_web_service` resource includes all 20+ env vars. Non-sensitive values are hardcoded in the `.tf` file. Sensitive values reference:
- `render_postgres.paths_db.connection_string_internal` — DB connection (auto-wired)
- `render_redis.paths_redis.connection_string_internal` — Redis connection (auto-wired)
- `sentry_key.paths_api.dsn_public` — Sentry DSN (auto-wired)
- `var.paths_jwt_secret` — from TF Cloud
- `var.r2_access_key_id`, `var.r2_secret_access_key` — from TF Cloud
- `var.paths_resend_api_key` — from TF Cloud

Auto-wiring is a key benefit: Sentry DSNs and database connection strings flow between resources automatically, eliminating manual copy-paste between dashboards.

**Implementation note:** The exact attribute names for Render connection strings (e.g., `connection_string_internal` vs `internal_connection_string`) and Render plan identifiers (e.g., `basic_256mb` vs `starter`) must be verified against the provider schema during implementation using `terraform providers schema -json`.

### 5.3 Contributor Guide (`guide.tf`)

| Resource | Terraform Type | Key Configuration |
|----------|---------------|-------------------|
| Vercel Project | `vercel_project.guide` | No framework, `docs/contributor-guide` root, pip + mkdocs build |
| Vercel Domain | `vercel_project_domain.guide` | `guide.limitless-longevity.health` |
| DNS Record | `cloudflare_dns_record.guide` | `guide` CNAME |

### 5.4 Outputs (`outputs.tf`)

| Output | Value | Sensitive |
|--------|-------|-----------|
| `paths_frontend_url` | `https://paths.limitless-longevity.health` | No |
| `paths_admin_url` | `https://paths-admin.limitless-longevity.health` | No |
| `paths_api_url` | `https://paths-api.limitless-longevity.health` | No |
| `guide_url` | `https://guide.limitless-longevity.health` | No |
| `render_api_service_id` | Service ID | No |
| `render_db_id` | Database ID | Yes |
| `sentry_api_dsn` | DSN | Yes |
| `sentry_web_dsn` | DSN | Yes |

---

## 6. Reusable Module

### `modules/learnhouse-app/`

A skeleton module that encapsulates the full deployment pattern for a LearnHouse-based app. Not used in the current configuration (PATHS is defined directly in `paths.tf`), but documented and ready for CUBES+ and HUBS.

**Module inputs:**

| Variable | Type | Description |
|----------|------|-------------|
| `app_name` | string | App identifier (e.g., "cubes", "hubs") |
| `domain` | string | Base domain |
| `region` | string | Deployment region (default: "frankfurt") |
| `repo` | string | GitHub repo (org/name) |
| `repo_root_dir` | string | Root directory for the app in the repo |
| `render_plan` | string | Render plan tier (default: "starter") |
| `postgres_plan` | string | PostgreSQL plan (default: "basic_256mb") |
| `cloudflare_zone_id` | string | Zone ID for DNS records |
| `sentry_org` | string | Sentry organization slug |

**Module creates:**
- Render: web service + PostgreSQL + Redis
- Vercel: project + domains + env vars
- Sentry: team + 2 projects + keys
- Cloudflare: 3 DNS records (frontend, admin, api)

**Provider passthrough:** Modules that create resources across multiple providers need explicit provider configuration passed in the module block. Document this in the module README.

**Future usage:**
```hcl
module "cubes" {
  source             = "./modules/learnhouse-app"
  app_name           = "cubes"
  domain             = "limitless-longevity.health"
  repo               = "LIMITLESS-LONGEVITY/limitless-cubes"
  repo_root_dir      = "apps/web"
  cloudflare_zone_id = cloudflare_zone.main.id
  sentry_org         = data.sentry_organization.main.slug
}
```

---

## 7. Import Strategy

All infrastructure already exists. Terraform will **import** existing resources, not recreate them.

### Import sequence

1. **Foundation first** (zone, repo) — these have no dependencies. Sentry org is a data source (no import needed).
2. **PATHS resources** — Render services, Vercel projects, Sentry projects, DNS, R2
3. **Guide resources** — Vercel project, DNS

### Import approach: HCL import blocks (Terraform 1.5+)

Use declarative `import` blocks in the `.tf` files rather than CLI commands. Import blocks are idempotent, reviewable in version control, and self-documenting.

```hcl
# imports.tf — one-time import declarations (remove after successful import)

# Foundation
import {
  to = cloudflare_zone.main
  id = "6cdc4cf703e6e7f5d3f768abc956900f"
}
import {
  to = github_repository.limitless_paths
  id = "limitless-paths"
}

# Render
import {
  to = render_postgres.paths_db
  id = "dpg-d6vbfvia214c738789f0-a"
}
import {
  to = render_redis.paths_redis
  id = "red-d6vbh9f5r7bs73enqi0g"
}
import {
  to = render_web_service.paths_api
  id = "srv-d6vc6g3uibrs73euvq1g"
}

# Vercel
import {
  to = vercel_project.paths_web
  id = "prj_vIAgpgHVqgwd9dvoSsYAqf1bKPAj"
}
import {
  to = vercel_project.guide
  id = "prj_B2FoDVsR7kPUJkluY9VfbeESk6P0"
}

# Cloudflare DNS (verify import ID format for v5 — may be record_id only)
import {
  to = cloudflare_dns_record.paths
  id = "9820cbcee4ac1ec6dcd799c2c6315798"
}
import {
  to = cloudflare_dns_record.paths_admin
  id = "1ee0f2396fd862686284ab8f493f9261"
}
import {
  to = cloudflare_dns_record.paths_api
  id = "35078718d104c23291663feb07558fc4"
}

# Cloudflare R2
import {
  to = cloudflare_r2_bucket.paths_content
  id = "limitless-paths-content"  # verify format: may need account_id/bucket_name
}

# Sentry projects
import {
  to = sentry_project.paths_api
  id = "limitless-longevity/paths-api"
}
import {
  to = sentry_project.paths_web
  id = "limitless-longevity/paths-web"
}
```

**Implementation note:** Import ID formats vary by provider and version. The IDs above are best-effort based on documentation. Verify each against the provider's import documentation during implementation. Cloudflare v5 in particular may have changed import formats from v4.

### Verification

After all imports: `terraform plan` should show **"No changes"** (or minimal drift from defaults). Any drift is fixed by adjusting the `.tf` files to match reality, NOT by letting Terraform modify the live infrastructure.

---

## 8. Variables & Secrets

### Variable declarations (`variables.tf`)

All secrets are declared as variables with `sensitive = true`. Values are stored in Terraform Cloud workspace settings, never in code.

| Variable | Type | Sensitive | Source |
|----------|------|-----------|--------|
| `render_api_key` | string | Yes | TF Cloud |
| `vercel_api_token` | string | Yes | TF Cloud |
| `cloudflare_api_token` | string | Yes | TF Cloud — scoped token with DNS + R2 edit permissions |
| `cloudflare_account_id` | string | No | TF Cloud |
| `sentry_token` | string | Yes | TF Cloud — needs org:admin, project:admin, team:admin scopes |
| `github_token` | string | Yes | TF Cloud |
| `paths_jwt_secret` | string | Yes | TF Cloud |
| `paths_resend_api_key` | string | Yes | TF Cloud |
| `r2_access_key_id` | string | Yes | TF Cloud |
| `r2_secret_access_key` | string | Yes | TF Cloud |

### Documentation

A `terraform.tfvars.example` file (committed, with placeholder values) documents what variables need to be set. This helps onboarding and disaster recovery:

```hcl
# terraform.tfvars.example — copy variable names to TF Cloud workspace settings
render_api_key       = "rnd_..."
vercel_api_token     = "vcp_..."
cloudflare_api_token = "..."
cloudflare_account_id = "..."
# ... etc
```

### Stripe variables (deferred)

Stripe keys (`LEARNHOUSE_STRIPE_SECRET_KEY`, `LEARNHOUSE_STRIPE_PUBLISHABLE_KEY`, `LEARNHOUSE_STRIPE_WEBHOOK_STANDARD_SECRET`) are currently empty in production. When Stripe goes live, add corresponding TF Cloud variables and reference them in the Render env vars.

### Security

- All sensitive variables marked `sensitive = true` in Terraform
- Values stored as "Sensitive" in TF Cloud (encrypted, never displayed)
- State file encrypted at rest in TF Cloud
- No `.tfvars` files with actual values — all values come from TF Cloud
- API tokens in state file — TF Cloud handles encryption
- Cloudflare uses scoped API token (DNS + R2 only), not global API key

---

## 9. Workflow & Operations

### Day-to-day workflow

```
1. Edit .tf files locally
2. terraform plan          — preview changes (reads state from TF Cloud)
3. Review the plan output
4. terraform apply         — apply changes (updates state in TF Cloud)
5. git add, commit, push   — version control the .tf changes
```

### Adding a new resource

1. Add the resource definition to the appropriate `.tf` file
2. `terraform plan` — verify what will be created
3. `terraform apply` — create the resource
4. Commit the `.tf` change

### Modifying existing infrastructure

1. Edit the resource in the `.tf` file (e.g., change Render plan from "starter" to "standard")
2. `terraform plan` — shows exactly what will change
3. Review carefully — some changes cause resource recreation
4. `terraform apply` — apply the change
5. Commit

### Disaster recovery

1. Clone `limitless-infra` repo
2. `terraform init` — connects to TF Cloud, downloads providers
3. `terraform apply` — recreates all infrastructure from code
4. Restore database from Render backups (manual)
5. Restore R2 content (Cloudflare auto-replicates, should survive)
6. Re-run Alembic migrations and seed data if needed

### Multi-environment (future)

Create a new TF Cloud workspace (e.g., `staging`) with different variable values:
- Different Render plan (free tier)
- Different subdomains (`staging-paths.*`)
- Different Sentry project names
- Same `.tf` files, different variable values

---

## 10. Safety Controls

### Prevent accidental destruction

```hcl
lifecycle {
  prevent_destroy = true
}
```

Applied to:
- `cloudflare_zone.main` — DNS zone (all records depend on this)
- `github_repository.limitless_paths` — source code
- `render_postgres.paths_db` — production database with user data

Note: `sentry_organization` is a data source (read-only), so it does not need `prevent_destroy`.

### State safety

- TF Cloud provides state locking (prevents concurrent `apply`)
- State versioning allows rollback to previous state
- Execution mode: **local** (Terraform runs on your machine, only state is remote)

### Operational safety

- Always run `terraform plan` before `terraform apply`
- Never run `terraform destroy` in the production workspace
- Pin provider versions to avoid unexpected breaking changes
- Review plan output carefully — look for "destroy" or "replace" actions

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State backend | Terraform Cloud (free) | Encrypted, versioned, locked, no infrastructure to manage |
| Secrets management | TF Cloud variables | Single source, encrypted, injected at runtime |
| Repo | Separate `limitless-infra` | Infrastructure spans multiple apps, clean separation |
| Structure | Monolith workspace | Simple at current scale (~15 resources), easy to understand |
| Module | Skeleton only | Ready for CUBES+/HUBS without premature abstraction |
| Import strategy | Import all existing | Safe, no recreation, verify with plan |
| Provider pinning | Minor version (`~>`) | Allows patches, prevents breaking major upgrades |
| Sentry provider | Community (`jianyuan/sentry`) | Only option, mature (19M downloads), pin strictly |
| Execution mode | Local | Simpler, no TF Cloud runners needed, free tier compatible |
