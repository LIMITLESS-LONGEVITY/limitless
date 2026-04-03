# Terraform Infrastructure as Code — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Codify the entire LIMITLESS production infrastructure in Terraform, importing all existing resources so `terraform plan` shows zero drift.

**Architecture:** Single monolith workspace with organized files. Terraform Cloud (free tier, local execution) for state. 5 providers: Render, Vercel, Cloudflare, Sentry, GitHub. Import blocks for all ~15 existing resources. Reusable module skeleton for future apps.

**Tech Stack:** Terraform 1.5+, HCL, Terraform Cloud

**Spec:** `docs/superpowers/specs/2026-03-22-terraform-iac-design.md`

---

## Important Notes

**This plan mixes code tasks and platform configuration tasks.** Code tasks (writing `.tf` files) can be executed by an agent. Platform tasks (marked with `[MANUAL]`) require the user to perform actions in web dashboards or CLI.

**Provider schema verification:** The spec notes that exact attribute names for Render (e.g., `connection_string_internal` vs `internal_connection_string`) and plan identifiers must be verified against provider docs during implementation. Each task that creates resources includes a verification step.

**Import ID formats:** The spec provides best-effort import IDs. Cloudflare v5 may have changed formats from v4. Verify each against provider documentation before importing.

---

## File Structure

```
limitless-infra/               — New repo (separate from limitless-paths)
├── main.tf                    — Terraform settings, cloud backend, provider blocks
├── versions.tf                — Required provider versions (pinned)
├── variables.tf               — All variable declarations (sensitive marked)
├── foundation.tf              — Cloudflare zone, GitHub repo, Sentry org data source
├── paths.tf                   — Render services, Vercel PATHS project, Sentry, DNS, R2
├── guide.tf                   — Vercel guide project, DNS record
├── imports.tf                 — One-time import blocks (remove after successful import)
├── outputs.tf                 — URLs, service IDs, connection info
├── terraform.tfvars.example   — Placeholder values for onboarding/DR documentation
├── .gitignore                 — *.tfstate, *.tfvars, .terraform/, *.tfstate.backup
├── README.md                  — Setup instructions, workflow, import guide
└── modules/
    └── learnhouse-app/        — Reusable module skeleton for future apps
        ├── main.tf            — Resource definitions (parameterized)
        ├── variables.tf       — Module input variables
        ├── outputs.tf         — Module outputs
        └── README.md          — Module usage documentation
```

---

### Task 1: Install Terraform and Set Up Terraform Cloud

**[MANUAL] — User performs locally and in TF Cloud dashboard**

- [ ] **Step 1: Install Terraform**

Download and install Terraform 1.5+ from https://developer.hashicorp.com/terraform/downloads

Verify installation:
```bash
terraform --version
```
Expected: `Terraform v1.x.x` (1.5 or higher)

- [ ] **Step 2: Create Terraform Cloud account and organization**

1. Go to https://app.terraform.io
2. Sign up or log in
3. Create organization: `limitless-longevity`

- [ ] **Step 3: Create workspace**

1. In TF Cloud → Workspaces → Create
2. Name: `production`
3. Execution mode: **Local** (Settings → General → Execution Mode → Local)

This means Terraform runs on your machine but state is stored remotely in TF Cloud.

- [ ] **Step 4: Log in to Terraform Cloud from CLI**

```bash
terraform login
```

Follow the browser prompt to generate and paste an API token.

- [ ] **Step 5: Verify login**

```bash
terraform version
```
Expected: Shows version and confirms cloud connectivity (no errors).

---

### Task 2: Create Repository and Project Scaffold

- [ ] **Step 1: Create the `limitless-infra` repo on GitHub**

**[MANUAL]** — Create a new private repository named `limitless-infra` under the `LIMITLESS-LONGEVITY` organization. Initialize with README.

- [ ] **Step 2: Clone the repo locally**

```bash
cd C:/Projects/LIMITLESS
git clone https://github.com/LIMITLESS-LONGEVITY/limitless-infra.git
cd limitless-infra
```

- [ ] **Step 3: Create `.gitignore`**

```gitignore
# Terraform
.terraform/
*.tfstate
*.tfstate.backup
*.tfvars
!terraform.tfvars.example
# OS
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
```

- [ ] **Step 4: Create `terraform.tfvars.example`**

```hcl
# terraform.tfvars.example — copy variable names to TF Cloud workspace settings
# DO NOT put real values here. All values go in TF Cloud as sensitive variables.

render_api_key        = "rnd_..."
vercel_api_token      = "vcp_..."
cloudflare_api_token  = "..."
cloudflare_account_id = "..."
sentry_token          = "..."
github_token          = "ghp_..."
paths_jwt_secret      = "..."
paths_resend_api_key  = "re_..."
r2_access_key_id      = "..."
r2_secret_access_key  = "..."
```

- [ ] **Step 5: Create directory structure**

```bash
mkdir -p modules/learnhouse-app
```

- [ ] **Step 6: Commit scaffold**

```bash
git add .gitignore terraform.tfvars.example
git commit -m "Initial scaffold: .gitignore and tfvars example"
```

---

### Task 3: Write `versions.tf` and `main.tf` — Providers and Backend

**Files:**
- Create: `versions.tf`
- Create: `main.tf`

- [ ] **Step 1: Write `versions.tf`**

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    render = {
      source  = "render-oss/render"
      version = "~> 1.8"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 4.6"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.4"
    }
    sentry = {
      source  = "jianyuan/sentry"
      version = "~> 0.14"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}
```

- [ ] **Step 2: Write `main.tf`**

```hcl
# Terraform Cloud backend for remote state
terraform {
  cloud {
    organization = "limitless-longevity"
    workspaces {
      name = "production"
    }
  }
}

# --- Providers ---

provider "render" {
  api_key = var.render_api_key
}

provider "vercel" {
  api_token = var.vercel_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
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

- [ ] **Step 3: Run `terraform init`**

```bash
terraform init
```
Expected: All 5 providers download successfully, backend initializes against TF Cloud.

- [ ] **Step 4: Run `terraform validate`**

```bash
terraform validate
```
Expected: `Success! The configuration is valid.` (may warn about missing variable values — that's fine at this stage)

- [ ] **Step 5: Commit**

```bash
git add versions.tf main.tf .terraform.lock.hcl
git commit -m "Add provider versions and Terraform Cloud backend"
```

**Note:** `.terraform.lock.hcl` SHOULD be committed — it locks exact provider builds for reproducibility.

---

### Task 4: Write `variables.tf` — All Variable Declarations

**Files:**
- Create: `variables.tf`

- [ ] **Step 1: Write `variables.tf`**

```hcl
# --- Provider API Keys ---

variable "render_api_key" {
  description = "Render API key"
  type        = string
  sensitive   = true
}

variable "vercel_api_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token (scoped: DNS + R2 edit)"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "sentry_token" {
  description = "Sentry auth token (scopes: org:admin, project:admin, team:admin)"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

# --- Application Secrets ---

variable "paths_jwt_secret" {
  description = "JWT secret for PATHS API"
  type        = string
  sensitive   = true
}

variable "paths_resend_api_key" {
  description = "Resend API key for PATHS email"
  type        = string
  sensitive   = true
}

variable "r2_access_key_id" {
  description = "Cloudflare R2 access key ID"
  type        = string
  sensitive   = true
}

variable "r2_secret_access_key" {
  description = "Cloudflare R2 secret access key"
  type        = string
  sensitive   = true
}
```

- [ ] **Step 2: Run `terraform validate`**

```bash
terraform validate
```
Expected: `Success! The configuration is valid.`

- [ ] **Step 3: Commit**

```bash
git add variables.tf
git commit -m "Add all variable declarations with sensitivity flags"
```

---

### Task 5: Configure TF Cloud Variables

**[MANUAL] — User enters values in TF Cloud dashboard**

- [ ] **Step 1: Gather all API tokens**

You need these tokens from the respective dashboards:

| Variable | Where to get it |
|----------|----------------|
| `render_api_key` | Render → Account Settings → API Keys |
| `vercel_api_token` | Vercel → Settings → Tokens → Create |
| `cloudflare_api_token` | Cloudflare → My Profile → API Tokens → Create (permissions: Zone DNS Edit, R2 Edit) |
| `cloudflare_account_id` | Cloudflare → any domain → Overview → right sidebar (Account ID) |
| `sentry_token` | Sentry EU → Settings → Auth Tokens → Create (scopes: org:admin, project:admin, team:admin) |
| `github_token` | GitHub → Settings → Developer settings → Fine-grained tokens → Create (repo: limitless-infra, limitless-paths) |
| `paths_jwt_secret` | Copy from `.env.development` (`LEARNHOUSE_JWT_SECRET`) |
| `paths_resend_api_key` | Copy from `.env.development` (`LEARNHOUSE_RESEND_API_KEY`) |
| `r2_access_key_id` | Copy from `.env.development` (`LEARNHOUSE_AWS_ACCESS_KEY_ID`) |
| `r2_secret_access_key` | Copy from `.env.development` (`LEARNHOUSE_AWS_SECRET_ACCESS_KEY`) |

- [ ] **Step 2: Set variables in TF Cloud**

1. Go to https://app.terraform.io → `limitless-longevity` org → `production` workspace → Variables
2. For each variable above:
   - Click "Add variable" → Category: **Terraform variable**
   - Enter the variable name exactly as shown
   - Enter the value
   - Check **Sensitive** for all except `cloudflare_account_id`
3. Verify all 10 variables are listed

- [ ] **Step 3: Verify Terraform can read variables**

```bash
terraform plan
```
Expected: Plan runs without "variable not set" errors (will show "no changes" since no resources are defined yet).

---

### Task 6: Write `foundation.tf` — Shared Infrastructure

**Files:**
- Create: `foundation.tf`

- [ ] **Step 1: Check Cloudflare provider docs for `cloudflare_zone` resource schema**

Verify the exact attribute names by checking the Cloudflare Terraform provider v5 documentation. Key attributes to confirm:
- How `account_id` is passed (top-level vs nested)
- Whether `zone` or `name` is the attribute for the domain name
- Whether `plan` is an attribute

```bash
terraform providers schema -json | python -m json.tool | grep -A 20 '"cloudflare_zone"'
```

Alternatively, check: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/zone

- [ ] **Step 2: Check GitHub provider docs for `github_repository` resource schema**

Key attributes to confirm:
- `name` vs `full_name`
- `visibility` (replaces old `private` boolean)
- Available `lifecycle` options

- [ ] **Step 3: Write `foundation.tf`**

```hcl
# --- Foundation Resources ---
# Shared infrastructure that exists once across all apps.

# Cloudflare DNS Zone
resource "cloudflare_zone" "main" {
  account_id = var.cloudflare_account_id
  zone       = "limitless-longevity.health"

  lifecycle {
    prevent_destroy = true
  }
}

# GitHub Repository — PATHS production code
resource "github_repository" "limitless_paths" {
  name        = "limitless-paths"
  description = "PATHS educational platform — production"
  visibility  = "private"

  has_issues   = true
  has_projects = false
  has_wiki     = false

  lifecycle {
    prevent_destroy = true
  }
}

# Sentry Organization — data source (read-only, cannot be managed via TF)
data "sentry_organization" "main" {
  slug = "limitless-longevity"
}
```

**Note:** Adjust attribute names based on what you found in Steps 1-2. The schema check is critical — provider v5 may use different names than v4 docs show.

- [ ] **Step 4: Run `terraform validate`**

```bash
terraform validate
```
Expected: `Success! The configuration is valid.`

- [ ] **Step 5: Commit**

```bash
git add foundation.tf
git commit -m "Add foundation resources: Cloudflare zone, GitHub repo, Sentry org"
```

---

### Task 7: Write `paths.tf` — Render Resources

**Files:**
- Create: `paths.tf`

This task covers Render resources only. Vercel, Sentry, DNS, and R2 are added in subsequent tasks to keep each step focused and verifiable.

- [ ] **Step 1: Check Render provider schema for exact attribute names**

```bash
terraform providers schema -json | python -m json.tool | grep -A 30 '"render_postgres"'
terraform providers schema -json | python -m json.tool | grep -A 30 '"render_redis"'
terraform providers schema -json | python -m json.tool | grep -A 50 '"render_web_service"'
```

Key things to verify:
- PostgreSQL: plan name format (`basic_256mb`?), `region` values, `version` type (string vs number)
- Redis: plan name, `max_memory_policy` values
- Web service: `plan` attribute name, `env` block structure, `health_check_path` attribute
- Connection string attribute: `connection_string_internal` vs `internal_connection_string`

- [ ] **Step 2: Write Render resources in `paths.tf`**

```hcl
# --- PATHS Platform: Render Resources ---

# PostgreSQL Database
resource "render_postgres" "paths_db" {
  name   = "paths-db"
  plan   = "basic_256mb"
  region = "frankfurt"

  database_name = "learnhouse"
  database_user = "learnhouse_user"
  version       = "18"

  lifecycle {
    prevent_destroy = true
  }
}

# Redis Cache
resource "render_redis" "paths_redis" {
  name              = "paths-redis"
  plan              = "free"
  region            = "frankfurt"
  max_memory_policy = "allkeys_lru"
}

# API Web Service
resource "render_web_service" "paths_api" {
  name       = "paths-api"
  plan       = "starter"
  region     = "frankfurt"
  runtime    = "python"

  repo_url   = "https://github.com/LIMITLESS-LONGEVITY/limitless-paths"
  branch     = "main"
  root_dir   = "apps/api"

  build_command = "pip install uv && uv sync --frozen"
  start_command = "uv run uvicorn app:app --host 0.0.0.0 --port $PORT"

  health_check_path = "/api/v1/health"

  # Environment variables — non-sensitive values hardcoded
  env {
    key   = "LEARNHOUSE_DOMAIN"
    value = "limitless-longevity.health"
  }
  env {
    key   = "LEARNHOUSE_TOP_DOMAIN"
    value = "limitless-longevity.health"
  }
  env {
    key   = "LEARNHOUSE_HOSTING_CONFIG"
    value = "custom"
  }
  env {
    key   = "LEARNHOUSE_MULTI_ORG"
    value = "false"
  }
  env {
    key   = "LEARNHOUSE_COOKIE_DOMAIN"
    value = ".limitless-longevity.health"
  }
  env {
    key   = "LEARNHOUSE_CORS_ORIGINS"
    value = "https://paths.limitless-longevity.health,https://paths-admin.limitless-longevity.health"
  }
  env {
    key   = "LEARNHOUSE_AWS_ENDPOINT"
    value = "https://${var.cloudflare_account_id}.r2.cloudflarestorage.com"
  }
  env {
    key   = "LEARNHOUSE_AWS_REGION"
    value = "weur"
  }
  env {
    key   = "LEARNHOUSE_AWS_BUCKET_NAME"
    value = "limitless-paths-content"
  }
  env {
    key   = "LEARNHOUSE_USE_HTTPS"
    value = "true"
  }
  env {
    key   = "LEARNHOUSE_NEWAPI_URL_FRONT"
    value = "https://paths-api.limitless-longevity.health"
  }

  # Environment variables — sensitive, auto-wired from other resources
  env {
    key   = "LEARNHOUSE_DATABASE_URL"
    value = render_postgres.paths_db.connection_string_internal
  }
  env {
    key   = "LEARNHOUSE_REDIS_URL"
    value = render_redis.paths_redis.connection_string_internal
  }
  env {
    key   = "LEARNHOUSE_SENTRY_DSN"
    value = sentry_key.paths_api.dsn_public
  }

  # Environment variables — sensitive, from TF Cloud
  env {
    key   = "LEARNHOUSE_JWT_SECRET"
    value = var.paths_jwt_secret
  }
  env {
    key   = "LEARNHOUSE_AWS_ACCESS_KEY_ID"
    value = var.r2_access_key_id
  }
  env {
    key   = "LEARNHOUSE_AWS_SECRET_ACCESS_KEY"
    value = var.r2_secret_access_key
  }
  env {
    key   = "LEARNHOUSE_RESEND_API_KEY"
    value = var.paths_resend_api_key
  }
}
```

**CRITICAL:** The attribute names above (`connection_string_internal`, `plan`, `env` block format) are best-effort from the spec. You MUST adjust them based on what you found in Step 1's schema check. If the provider uses a different block format for env vars (e.g., `environment` instead of `env`, or a map instead of repeated blocks), rewrite accordingly.

**Note:** The `sentry_key.paths_api.dsn_public` reference won't resolve until Task 9 (Sentry resources). That's expected — `terraform validate` will catch this, but `terraform plan` requires all referenced resources to exist. We'll validate the full configuration after all resource files are written.

**Stripe env vars (deferred):** The live Render service may have empty Stripe env vars (`LEARNHOUSE_STRIPE_SECRET_KEY`, `LEARNHOUSE_STRIPE_PUBLISHABLE_KEY`, `LEARNHOUSE_STRIPE_WEBHOOK_STANDARD_SECRET`). If `terraform plan` shows drift because of these, add them with empty string defaults. When Stripe goes live, add TF Cloud variables and wire them in.

- [ ] **Step 3: Run `terraform validate`**

```bash
terraform validate
```
Expected: May show errors about `sentry_key.paths_api` not existing yet — that's expected. Verify Render resource syntax is valid.

- [ ] **Step 4: Commit**

```bash
git add paths.tf
git commit -m "Add PATHS Render resources: PostgreSQL, Redis, web service with env vars"
```

---

### Task 8: Add Vercel Resources to `paths.tf` and Create `guide.tf`

**Files:**
- Modify: `paths.tf` (append Vercel resources)
- Create: `guide.tf`

- [ ] **Step 1: Check Vercel provider schema**

```bash
terraform providers schema -json | python -m json.tool | grep -A 30 '"vercel_project"'
terraform providers schema -json | python -m json.tool | grep -A 20 '"vercel_project_domain"'
terraform providers schema -json | python -m json.tool | grep -A 20 '"vercel_project_environment_variable"'
```

Key things to verify:
- `vercel_project`: `framework`, `root_directory`, `serverless_function_region` attribute names
- `vercel_project_domain`: `project_id` and `domain` attributes
- `vercel_project_environment_variable`: singular resource name (not plural), `target` format (list of strings?)
- Build command configuration: `build_command` vs `settings` block

- [ ] **Step 2: Append Vercel PATHS resources to `paths.tf`**

Add to the end of `paths.tf`:

```hcl
# --- PATHS Platform: Vercel Resources ---

# PATHS Frontend (Next.js)
resource "vercel_project" "paths_web" {
  name      = "limitless-paths-web"
  framework = "nextjs"

  git_repository = {
    type              = "github"
    repo              = "LIMITLESS-LONGEVITY/limitless-paths"
    production_branch = "main"
  }

  root_directory                 = "apps/web"
  serverless_function_region     = "fra1"
  build_command                  = "bun install && bun run build"
}

# PATHS Frontend Domains
resource "vercel_project_domain" "paths" {
  project_id = vercel_project.paths_web.id
  domain     = "paths.limitless-longevity.health"
}

resource "vercel_project_domain" "paths_admin" {
  project_id = vercel_project.paths_web.id
  domain     = "paths-admin.limitless-longevity.health"
}

# PATHS Frontend Environment Variables
resource "vercel_project_environment_variable" "paths_next_public_api_url" {
  project_id = vercel_project.paths_web.id
  key        = "NEXT_PUBLIC_LEARNH_API_URL"
  value      = "https://paths-api.limitless-longevity.health/api/v1"
  target     = ["production"]
}

resource "vercel_project_environment_variable" "paths_next_public_domain" {
  project_id = vercel_project.paths_web.id
  key        = "NEXT_PUBLIC_LEARNH_DOMAIN"
  value      = "limitless-longevity.health"
  target     = ["production"]
}

resource "vercel_project_environment_variable" "paths_next_public_top_domain" {
  project_id = vercel_project.paths_web.id
  key        = "NEXT_PUBLIC_LEARNH_TOP_DOMAIN"
  value      = "limitless-longevity.health"
  target     = ["production"]
}

resource "vercel_project_environment_variable" "paths_next_public_hosting" {
  project_id = vercel_project.paths_web.id
  key        = "NEXT_PUBLIC_LEARNH_HOSTING_CONFIG"
  value      = "custom"
  target     = ["production"]
}

resource "vercel_project_environment_variable" "paths_next_public_multi_org" {
  project_id = vercel_project.paths_web.id
  key        = "NEXT_PUBLIC_LEARNH_MULTI_ORG"
  value      = "false"
  target     = ["production"]
}

resource "vercel_project_environment_variable" "paths_sentry_web_dsn" {
  project_id = vercel_project.paths_web.id
  key        = "NEXT_PUBLIC_SENTRY_DSN"
  value      = sentry_key.paths_web.dsn_public
  target     = ["production"]
}
```

**Note:** Adjust attribute names based on Step 1 schema check. The `git_repository` block format and `target` format may differ.

**Cross-dependency:** The `paths_sentry_web_dsn` env var references `sentry_key.paths_web.dsn_public`, which is created in Task 9. `terraform validate` will error until Task 9 is complete — that's expected.

- [ ] **Step 3: Write `guide.tf`**

```hcl
# --- Contributor Guide: Vercel + DNS ---

# Contributor Guide (MkDocs Material on Vercel)
resource "vercel_project" "guide" {
  name = "limitless-paths-guide"

  git_repository = {
    type              = "github"
    repo              = "LIMITLESS-LONGEVITY/limitless-paths"
    production_branch = "main"
  }

  root_directory = "docs/contributor-guide"
  build_command  = "pip install --break-system-packages mkdocs-material && python -m mkdocs build"
  output_directory = "site"
}

# Guide Domain
resource "vercel_project_domain" "guide" {
  project_id = vercel_project.guide.id
  domain     = "guide.limitless-longevity.health"
}

# Guide DNS Record
resource "cloudflare_dns_record" "guide" {
  zone_id = cloudflare_zone.main.id
  name    = "guide"
  type    = "CNAME"
  content = "cname.vercel-dns.com"
  proxied = false
  ttl     = 1  # Auto
}
```

- [ ] **Step 4: Run `terraform validate`**

```bash
terraform validate
```
Expected: May still error on `sentry_key` references. All other syntax should be valid.

- [ ] **Step 5: Commit**

```bash
git add paths.tf guide.tf
git commit -m "Add Vercel projects (PATHS frontend, guide) and DNS for guide"
```

---

### Task 9: Add Sentry, DNS, and R2 Resources to `paths.tf`

**Files:**
- Modify: `paths.tf` (append Sentry, DNS, R2 resources)

- [ ] **Step 1: Check Sentry and Cloudflare provider schemas**

```bash
terraform providers schema -json | python -m json.tool | grep -A 20 '"sentry_team"'
terraform providers schema -json | python -m json.tool | grep -A 20 '"sentry_project"'
terraform providers schema -json | python -m json.tool | grep -A 20 '"sentry_key"'
terraform providers schema -json | python -m json.tool | grep -A 20 '"cloudflare_dns_record"'
terraform providers schema -json | python -m json.tool | grep -A 20 '"cloudflare_r2_bucket"'
```

Key things to verify:
- `sentry_team`: `organization` attribute name (slug?)
- `sentry_project`: `organization`, `teams` vs `team` attribute, `platform` values
- `sentry_key`: `organization`, `project` attributes, `dsn_public` output name
- `cloudflare_dns_record`: `zone_id`, `name`, `content` vs `value`, `proxied`, `ttl`
- `cloudflare_r2_bucket`: `account_id`, `name`, `location` attribute

- [ ] **Step 2: Append Sentry, DNS, and R2 resources to `paths.tf`**

Add to the end of `paths.tf`:

```hcl
# --- PATHS Platform: Sentry Resources ---

resource "sentry_team" "paths" {
  organization = data.sentry_organization.main.slug
  name         = "PATHS"
  slug         = "paths"
}

resource "sentry_project" "paths_api" {
  organization = data.sentry_organization.main.slug
  teams        = [sentry_team.paths.slug]
  name         = "paths-api"
  slug         = "paths-api"
  platform     = "python-fastapi"
}

resource "sentry_project" "paths_web" {
  organization = data.sentry_organization.main.slug
  teams        = [sentry_team.paths.slug]
  name         = "paths-web"
  slug         = "paths-web"
  platform     = "javascript-nextjs"
}

resource "sentry_key" "paths_api" {
  organization = data.sentry_organization.main.slug
  project      = sentry_project.paths_api.slug
  name         = "Default"
}

resource "sentry_key" "paths_web" {
  organization = data.sentry_organization.main.slug
  project      = sentry_project.paths_web.slug
  name         = "Default"
}

# --- PATHS Platform: Cloudflare DNS Records ---

resource "cloudflare_dns_record" "paths" {
  zone_id = cloudflare_zone.main.id
  name    = "paths"
  type    = "CNAME"
  content = "cname.vercel-dns.com"
  proxied = false
  ttl     = 1  # Auto
}

resource "cloudflare_dns_record" "paths_admin" {
  zone_id = cloudflare_zone.main.id
  name    = "paths-admin"
  type    = "CNAME"
  content = "cname.vercel-dns.com"
  proxied = false
  ttl     = 1  # Auto
}

resource "cloudflare_dns_record" "paths_api" {
  zone_id = cloudflare_zone.main.id
  name    = "paths-api"
  type    = "CNAME"
  content = "limitless-paths-api.onrender.com"
  proxied = false
  ttl     = 1  # Auto
}

# --- PATHS Platform: Cloudflare R2 Bucket ---

resource "cloudflare_r2_bucket" "paths_content" {
  account_id = var.cloudflare_account_id
  name       = "limitless-paths-content"
  location   = "WEUR"
}
```

**Note:** Adjust attribute names based on Step 1 schema check. In particular:
- Sentry `teams` may be a list or single value
- Sentry `platform` values may differ from what's shown
- Cloudflare v5 `dns_record` may use `content` (not `value`)
- R2 `location` values may be lowercase

- [ ] **Step 3: Run `terraform validate`**

```bash
terraform validate
```
Expected: `Success! The configuration is valid.` — All resource references should now resolve (Sentry keys referenced by Render and Vercel env vars exist).

- [ ] **Step 4: Commit**

```bash
git add paths.tf
git commit -m "Add Sentry projects/keys, DNS records, and R2 bucket for PATHS"
```

---

### Task 10: Write `outputs.tf`

**Files:**
- Create: `outputs.tf`

- [ ] **Step 1: Write `outputs.tf`**

```hcl
# --- Outputs ---

output "paths_frontend_url" {
  description = "PATHS frontend URL"
  value       = "https://paths.limitless-longevity.health"
}

output "paths_admin_url" {
  description = "PATHS admin panel URL"
  value       = "https://paths-admin.limitless-longevity.health"
}

output "paths_api_url" {
  description = "PATHS API URL"
  value       = "https://paths-api.limitless-longevity.health"
}

output "guide_url" {
  description = "Contributor guide URL"
  value       = "https://guide.limitless-longevity.health"
}

output "render_api_service_id" {
  description = "Render web service ID for PATHS API"
  value       = render_web_service.paths_api.id
}

output "render_db_id" {
  description = "Render PostgreSQL database ID"
  value       = render_postgres.paths_db.id
  sensitive   = true
}

output "sentry_api_dsn" {
  description = "Sentry DSN for PATHS API"
  value       = sentry_key.paths_api.dsn_public
  sensitive   = true
}

output "sentry_web_dsn" {
  description = "Sentry DSN for PATHS Web"
  value       = sentry_key.paths_web.dsn_public
  sensitive   = true
}
```

- [ ] **Step 2: Run `terraform validate`**

```bash
terraform validate
```
Expected: `Success! The configuration is valid.`

- [ ] **Step 3: Commit**

```bash
git add outputs.tf
git commit -m "Add outputs: URLs, service IDs, Sentry DSNs"
```

---

### Task 11: Write `imports.tf` — Import All Existing Resources

**Files:**
- Create: `imports.tf`

- [ ] **Step 1: Verify import ID formats against provider documentation**

Before writing import blocks, check the import documentation for each provider:
- **Cloudflare v5 zone:** May need just the zone ID, or `account_id/zone_id`
- **Cloudflare v5 DNS records:** May be `zone_id/record_id` or just `record_id`
- **Cloudflare R2:** May be `account_id/bucket_name` or just `bucket_name`
- **Render:** Verify resource ID format (the `dpg-`, `red-`, `srv-` prefixed IDs from the spec)
- **Vercel:** Project IDs (`prj_...` format)
- **Sentry:** `org-slug/project-slug` format
- **GitHub:** Repository name only

Check the Terraform registry docs for each resource's "Import" section.

- [ ] **Step 2: Write `imports.tf`**

```hcl
# --- One-time import declarations ---
# Remove this file after all imports are successful and `terraform plan` shows no changes.

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

# Cloudflare DNS
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

import {
  to = cloudflare_dns_record.guide
  id = "<GUIDE_DNS_RECORD_ID>"
}

# Cloudflare R2
import {
  to = cloudflare_r2_bucket.paths_content
  id = "limitless-paths-content"
}

# Sentry
import {
  to = sentry_project.paths_api
  id = "limitless-longevity/paths-api"
}

import {
  to = sentry_project.paths_web
  id = "limitless-longevity/paths-web"
}

# Sentry team and keys — import if provider supports it (check docs)
# If import is not supported, Terraform will attempt to create them.
# Team creation may fail if slug already exists; keys are additive.
# import {
#   to = sentry_team.paths
#   id = "limitless-longevity/paths"
# }
# import {
#   to = sentry_key.paths_api
#   id = "<org-slug/project-slug/key-id>"
# }
# import {
#   to = sentry_key.paths_web
#   id = "<org-slug/project-slug/key-id>"
# }

# Vercel domains — these exist and must be imported
import {
  to = vercel_project_domain.paths
  id = "<VERCEL_PATHS_DOMAIN_ID>"
}
import {
  to = vercel_project_domain.paths_admin
  id = "<VERCEL_PATHS_ADMIN_DOMAIN_ID>"
}
import {
  to = vercel_project_domain.guide
  id = "<VERCEL_GUIDE_DOMAIN_ID>"
}

# Vercel env vars — these exist and must be imported
# Import IDs typically: project_id/env_var_id
# Look up env var IDs via: vercel env ls (CLI) or Vercel API
# import {
#   to = vercel_project_environment_variable.paths_next_public_api_url
#   id = "<project_id/env_id>"
# }
# ... repeat for all 6 env vars
```

**Pre-requisite steps before writing this file:**

1. **Look up guide DNS record ID:**
   ```bash
   curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     "https://api.cloudflare.com/client/v4/zones/6cdc4cf703e6e7f5d3f768abc956900f/dns_records?name=guide.limitless-longevity.health" \
     | python -m json.tool
   ```
   Copy the record `id` and replace `<GUIDE_DNS_RECORD_ID>`.

2. **Check Sentry provider import support:**
   Check https://registry.terraform.io/providers/jianyuan/sentry/latest/docs for `sentry_team` and `sentry_key` import sections. If supported, uncomment and fill in IDs. If not, leave commented and handle creation conflicts in Task 12.

3. **Look up Vercel domain IDs:**
   ```bash
   curl -s -H "Authorization: Bearer $VERCEL_API_TOKEN" \
     "https://api.vercel.com/v9/projects/prj_vIAgpgHVqgwd9dvoSsYAqf1bKPAj/domains" \
     | python -m json.tool
   ```
   Extract domain IDs and replace placeholders. Repeat for guide project.

4. **Look up Vercel env var IDs:**
   ```bash
   curl -s -H "Authorization: Bearer $VERCEL_API_TOKEN" \
     "https://api.vercel.com/v9/projects/prj_vIAgpgHVqgwd9dvoSsYAqf1bKPAj/env" \
     | python -m json.tool
   ```
   If the import format is complex or not well-supported, an alternative is to `terraform import` them via CLI one by one, or let Terraform recreate them (env vars are idempotent — setting the same value is safe).

5. **Verify Cloudflare v5 and R2 import ID formats:**
   Check https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs for the Import section of `cloudflare_dns_record` and `cloudflare_r2_bucket`. Note whether format is `record_id`, `zone_id/record_id`, or `account_id/bucket_name`.

**Note:** Not all import IDs may be discoverable before `terraform plan`. Some providers reveal the correct format in error messages during the first plan attempt. Budget time in Task 12 for iterative ID format fixes.

- [ ] **Step 3: Run `terraform validate`**

```bash
terraform validate
```
Expected: `Success! The configuration is valid.`

- [ ] **Step 4: Commit**

```bash
git add imports.tf
git commit -m "Add import blocks for all existing infrastructure resources"
```

---

### Task 12: Run `terraform plan` — First Import and Drift Detection

**[MANUAL] — Requires TF Cloud variables to be configured (Task 5)**

- [ ] **Step 1: Run `terraform plan`**

```bash
terraform plan
```

This is the critical moment. Terraform will:
1. Read state from TF Cloud (empty initially)
2. Process import blocks (import existing resources into state)
3. Compare imported state against `.tf` definitions
4. Show differences (drift)

Expected output categories:
- **Import:** Resources being imported (all of them on first run)
- **No changes:** Resources where `.tf` matches reality — ideal
- **Update in-place:** Drift where `.tf` differs from reality — needs fixing
- **Destroy/recreate:** Schema mismatch — STOP and fix `.tf` files

- [ ] **Step 2: Analyze drift**

For each resource showing changes:
1. Read the plan output carefully
2. Determine if the `.tf` file needs updating to match reality (most common) or if the live resource has drifted from desired state
3. Update the `.tf` file to match reality — during import, the goal is **zero drift**, not changing infrastructure

Common drift sources:
- Attribute names slightly wrong (e.g., `basic-256mb` vs `basic_256mb`)
- Default values that Terraform manages but weren't in the `.tf`
- Provider-specific formatting differences

- [ ] **Step 3: Fix drift and re-plan iteratively**

```bash
# After each .tf edit:
terraform plan
```

Repeat until plan shows only imports and no changes. This may take several iterations.

- [ ] **Step 4: Run `terraform apply` to finalize imports**

```bash
terraform apply
```

Type `yes` when prompted. This imports all resources into TF Cloud state.

Expected: All resources imported, no changes applied to live infrastructure.

- [ ] **Step 5: Verify zero drift**

```bash
terraform plan
```

Expected: `No changes. Your infrastructure matches the configuration.`

If there's still drift, go back to Step 2.

- [ ] **Step 6: Commit drift fixes**

```bash
git add foundation.tf paths.tf guide.tf imports.tf
git commit -m "Fix resource definitions to match live infrastructure (zero drift)"
```

---

### Task 13: Write Reusable Module Skeleton

**Files:**
- Create: `modules/learnhouse-app/main.tf`
- Create: `modules/learnhouse-app/variables.tf`
- Create: `modules/learnhouse-app/outputs.tf`
- Create: `modules/learnhouse-app/README.md`

- [ ] **Step 1: Write `modules/learnhouse-app/variables.tf`**

```hcl
variable "app_name" {
  description = "App identifier (e.g., 'cubes', 'hubs')"
  type        = string
}

variable "domain" {
  description = "Base domain (e.g., 'limitless-longevity.health')"
  type        = string
}

variable "region" {
  description = "Deployment region"
  type        = string
  default     = "frankfurt"
}

variable "repo" {
  description = "GitHub repo (org/name)"
  type        = string
}

variable "repo_root_dir" {
  description = "Root directory for the frontend app in the repo"
  type        = string
  default     = "apps/web"
}

variable "render_plan" {
  description = "Render web service plan tier"
  type        = string
  default     = "starter"
}

variable "postgres_plan" {
  description = "Render PostgreSQL plan"
  type        = string
  default     = "basic_256mb"
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for DNS records"
  type        = string
}

variable "sentry_org" {
  description = "Sentry organization slug"
  type        = string
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID (for R2)"
  type        = string
}

variable "jwt_secret" {
  description = "JWT secret for the API"
  type        = string
  sensitive   = true
}

variable "r2_access_key_id" {
  description = "R2 access key ID"
  type        = string
  sensitive   = true
}

variable "r2_secret_access_key" {
  description = "R2 secret access key"
  type        = string
  sensitive   = true
}

variable "resend_api_key" {
  description = "Resend API key for email"
  type        = string
  sensitive   = true
}
```

- [ ] **Step 2: Write `modules/learnhouse-app/main.tf`**

```hcl
# Reusable module for deploying a LearnHouse-based app.
# Creates: Render (API + DB + Redis), Vercel (frontend), Sentry (2 projects), DNS (3 records), R2 bucket.
#
# Usage:
#   module "cubes" {
#     source             = "./modules/learnhouse-app"
#     app_name           = "cubes"
#     domain             = "limitless-longevity.health"
#     repo               = "LIMITLESS-LONGEVITY/limitless-cubes"
#     cloudflare_zone_id = cloudflare_zone.main.id
#     sentry_org         = data.sentry_organization.main.slug
#     cloudflare_account_id = var.cloudflare_account_id
#     jwt_secret         = var.cubes_jwt_secret
#     r2_access_key_id   = var.r2_access_key_id
#     r2_secret_access_key = var.r2_secret_access_key
#     resend_api_key     = var.cubes_resend_api_key
#   }

# --- Render ---

resource "render_postgres" "db" {
  name          = "${var.app_name}-db"
  plan          = var.postgres_plan
  region        = var.region
  database_name = "learnhouse"
  database_user = "learnhouse_user"
  version       = "18"

  lifecycle {
    prevent_destroy = true
  }
}

resource "render_redis" "cache" {
  name              = "${var.app_name}-redis"
  plan              = "free"
  region            = var.region
  max_memory_policy = "allkeys_lru"
}

resource "render_web_service" "api" {
  name       = "${var.app_name}-api"
  plan       = var.render_plan
  region     = var.region
  runtime    = "python"
  repo_url   = "https://github.com/${var.repo}"
  branch     = "main"
  root_dir   = "apps/api"

  build_command     = "pip install uv && uv sync --frozen"
  start_command     = "uv run uvicorn app:app --host 0.0.0.0 --port $PORT"
  health_check_path = "/api/v1/health"

  # Env vars omitted for brevity — copy pattern from paths.tf
  # and parameterize with var.app_name, var.domain, etc.
}

# --- Vercel ---

resource "vercel_project" "web" {
  name      = "limitless-${var.app_name}-web"
  framework = "nextjs"

  git_repository = {
    type              = "github"
    repo              = var.repo
    production_branch = "main"
  }

  root_directory             = var.repo_root_dir
  serverless_function_region = "fra1"
}

resource "vercel_project_domain" "frontend" {
  project_id = vercel_project.web.id
  domain     = "${var.app_name}.${var.domain}"
}

resource "vercel_project_domain" "admin" {
  project_id = vercel_project.web.id
  domain     = "${var.app_name}-admin.${var.domain}"
}

# --- Sentry ---

resource "sentry_team" "app" {
  organization = var.sentry_org
  name         = upper(var.app_name)
  slug         = var.app_name
}

resource "sentry_project" "api" {
  organization = var.sentry_org
  teams        = [sentry_team.app.slug]
  name         = "${var.app_name}-api"
  slug         = "${var.app_name}-api"
  platform     = "python-fastapi"
}

resource "sentry_project" "web" {
  organization = var.sentry_org
  teams        = [sentry_team.app.slug]
  name         = "${var.app_name}-web"
  slug         = "${var.app_name}-web"
  platform     = "javascript-nextjs"
}

resource "sentry_key" "api" {
  organization = var.sentry_org
  project      = sentry_project.api.slug
  name         = "Default"
}

resource "sentry_key" "web" {
  organization = var.sentry_org
  project      = sentry_project.web.slug
  name         = "Default"
}

# --- Cloudflare DNS ---

resource "cloudflare_dns_record" "frontend" {
  zone_id = var.cloudflare_zone_id
  name    = var.app_name
  type    = "CNAME"
  content = "cname.vercel-dns.com"
  proxied = false
  ttl     = 1
}

resource "cloudflare_dns_record" "admin" {
  zone_id = var.cloudflare_zone_id
  name    = "${var.app_name}-admin"
  type    = "CNAME"
  content = "cname.vercel-dns.com"
  proxied = false
  ttl     = 1
}

resource "cloudflare_dns_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "${var.app_name}-api"
  type    = "CNAME"
  content = "limitless-${var.app_name}-api.onrender.com"
  proxied = false
  ttl     = 1
}

# --- Cloudflare R2 ---

resource "cloudflare_r2_bucket" "content" {
  account_id = var.cloudflare_account_id
  name       = "limitless-${var.app_name}-content"
  location   = "WEUR"
}
```

- [ ] **Step 3: Write `modules/learnhouse-app/outputs.tf`**

```hcl
output "frontend_url" {
  description = "Frontend URL"
  value       = "https://${var.app_name}.${var.domain}"
}

output "admin_url" {
  description = "Admin panel URL"
  value       = "https://${var.app_name}-admin.${var.domain}"
}

output "api_url" {
  description = "API URL"
  value       = "https://${var.app_name}-api.${var.domain}"
}

output "api_service_id" {
  description = "Render web service ID"
  value       = render_web_service.api.id
}

output "db_id" {
  description = "Render PostgreSQL ID"
  value       = render_postgres.db.id
  sensitive   = true
}

output "sentry_api_dsn" {
  description = "Sentry API DSN"
  value       = sentry_key.api.dsn_public
  sensitive   = true
}

output "sentry_web_dsn" {
  description = "Sentry Web DSN"
  value       = sentry_key.web.dsn_public
  sensitive   = true
}
```

- [ ] **Step 4: Write `modules/learnhouse-app/README.md`**

```markdown
# LearnHouse App Module

Reusable Terraform module for deploying a LearnHouse-based app on the LIMITLESS platform.

## What it creates

- **Render:** Web service (FastAPI) + PostgreSQL + Redis
- **Vercel:** Next.js project + 2 domains (frontend, admin)
- **Sentry:** Team + 2 projects (API, web) + client keys
- **Cloudflare:** 3 DNS records (frontend, admin, API) + R2 bucket

## Usage

```hcl
module "cubes" {
  source               = "./modules/learnhouse-app"
  app_name             = "cubes"
  domain               = "limitless-longevity.health"
  repo                 = "LIMITLESS-LONGEVITY/limitless-cubes"
  cloudflare_zone_id   = cloudflare_zone.main.id
  sentry_org           = data.sentry_organization.main.slug
  cloudflare_account_id = var.cloudflare_account_id
  jwt_secret           = var.cubes_jwt_secret
  r2_access_key_id     = var.r2_access_key_id
  r2_secret_access_key = var.r2_secret_access_key
  resend_api_key       = var.cubes_resend_api_key
}
```

## Provider passthrough

This module creates resources across 5 providers. When calling from the root module, all providers are inherited automatically. If you need explicit provider configuration, pass them via the `providers` argument in the module block.

## Inputs

| Name | Type | Default | Description |
|------|------|---------|-------------|
| app_name | string | — | App identifier |
| domain | string | — | Base domain |
| region | string | "frankfurt" | Deployment region |
| repo | string | — | GitHub repo (org/name) |
| repo_root_dir | string | "apps/web" | Frontend root directory |
| render_plan | string | "starter" | Render plan tier |
| postgres_plan | string | "basic_256mb" | PostgreSQL plan |
| cloudflare_zone_id | string | — | Zone ID |
| sentry_org | string | — | Sentry org slug |
| cloudflare_account_id | string | — | CF account ID |
| jwt_secret | string | — | JWT secret (sensitive) |
| r2_access_key_id | string | — | R2 key (sensitive) |
| r2_secret_access_key | string | — | R2 secret (sensitive) |
| resend_api_key | string | — | Resend key (sensitive) |
```

- [ ] **Step 5: Run `terraform validate`**

```bash
terraform validate
```
Expected: `Success!` — The module is a skeleton, not referenced by any root config, so it validates independently.

- [ ] **Step 6: Commit**

```bash
git add modules/
git commit -m "Add reusable learnhouse-app module skeleton for future apps"
```

---

### Task 14: Write `README.md`

**Files:**
- Create/Replace: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# LIMITLESS Infrastructure

Terraform configuration for the entire LIMITLESS production infrastructure.

## Quick Start

```bash
# 1. Install Terraform (>= 1.5)
# 2. Log in to Terraform Cloud
terraform login

# 3. Initialize
terraform init

# 4. Preview changes
terraform plan

# 5. Apply changes
terraform apply
```

## Architecture

Single Terraform workspace managing ~15 resources across 5 providers:

| Provider | Resources |
|----------|-----------|
| Render | Web service, PostgreSQL, Redis |
| Vercel | 2 projects (PATHS frontend, contributor guide) |
| Cloudflare | DNS zone, 4 CNAME records, R2 bucket |
| Sentry | 2 projects, team, client keys |
| GitHub | Repository settings |

State is stored in **Terraform Cloud** (free tier, local execution mode).

## File Layout

| File | Contents |
|------|----------|
| `main.tf` | Backend config and provider blocks |
| `versions.tf` | Provider version constraints |
| `variables.tf` | Variable declarations |
| `foundation.tf` | Shared resources (CF zone, GitHub repo, Sentry org) |
| `paths.tf` | PATHS platform (Render, Vercel, Sentry, DNS, R2) |
| `guide.tf` | Contributor guide (Vercel, DNS) |
| `outputs.tf` | URLs, IDs, DSNs |
| `imports.tf` | One-time import blocks (remove after import) |

## Variables

All secrets are stored as sensitive variables in Terraform Cloud. See `terraform.tfvars.example` for the full list.

## Safety

- `prevent_destroy` on: Cloudflare zone, GitHub repo, PostgreSQL database
- Always run `terraform plan` before `terraform apply`
- Never run `terraform destroy` in the production workspace
- Provider versions are pinned to prevent breaking upgrades

## Disaster Recovery

1. Clone this repo
2. `terraform init` (connects to TF Cloud)
3. `terraform apply` (recreates all infrastructure)
4. Restore database from Render backups
5. Re-run Alembic migrations if needed

## Reusable Module

`modules/learnhouse-app/` contains a parameterized module for deploying additional LearnHouse apps (CUBES+, HUBS). See its README for usage.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Add README with setup instructions, architecture, and DR guide"
```

---

### Task 15: Remove `imports.tf` and Final Verification

**Prerequisite:** Task 12 completed successfully (`terraform plan` shows no changes)

- [ ] **Step 1: Remove import blocks**

Delete `imports.tf` — import blocks are one-time declarations and should not remain after successful import.

```bash
rm imports.tf
```

- [ ] **Step 2: Verify removal doesn't affect state**

```bash
terraform plan
```
Expected: `No changes. Your infrastructure matches the configuration.`

Removing import blocks does NOT remove resources from state. It only removes the import declarations.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Remove one-time import blocks after successful infrastructure import"
```

- [ ] **Step 4: Push to remote**

```bash
git push origin main
```

- [ ] **Step 5: Final summary**

At this point you should have:
- All ~15 production resources managed by Terraform
- Zero drift between `.tf` files and live infrastructure
- State stored securely in Terraform Cloud
- Reusable module ready for CUBES+ and HUBS
- Full documentation in README

---

## Task Dependency Graph

```
Task 1 (TF Cloud setup) ──┐
                           ├── Task 3 (providers) ── Task 4 (variables) ──┐
Task 2 (repo scaffold) ───┘                                               │
                                                                          │
Task 5 (TF Cloud vars) ──────────────────────────────────────────────────┤
                                                                          │
Task 6 (foundation) ─── Task 7 (Render) ─── Task 8 (Vercel) ─── Task 9 (Sentry/DNS/R2)
                                                                          │
Task 10 (outputs) ────────────────────────────────────────────────────────┤
                                                                          │
Task 11 (imports) ─── Task 12 (plan/apply/fix drift) ─── Task 15 (cleanup)
                                                                          │
Task 13 (module skeleton) ────────────────────────────────────────────────┤
Task 14 (README) ─────────────────────────────────────────────────────────┘
```

**Parallelizable:** Tasks 13 and 14 are independent and can run alongside Tasks 6-12.
