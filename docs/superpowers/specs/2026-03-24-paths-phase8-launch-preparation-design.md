# PATHS Phase 8: Launch Preparation Design Spec

**Date:** 2026-03-24
**Status:** Draft
**Depends on:** Phases 1-7 (complete application), existing Terraform infrastructure (`limitless-infra/`)
**Working directories:** `C:/Projects/LIMITLESS/limitless-paths/` (app), `C:/Projects/LIMITLESS/limitless-infra/` (infra)

---

## 1. Scope

Phase 8 completes the infrastructure for production launch and sets up CI/CD:

1. **Terraform additions** — Vercel project resource, missing env vars (Stripe, AI), new variable declarations
2. **GitHub Actions CI** — lint, test, build on PRs to `limitless-paths`
3. **GitHub Actions Terraform** — plan on PRs, apply via manual dispatch on `limitless-infra`
4. **Smoke test checklist** — documented manual verification of production

**What already exists in Terraform** (no changes needed):
- Render web service (`paths-api`), PostgreSQL, Redis — all in `paths.tf`
- Cloudflare DNS records (`paths`, `paths-api`) — both CNAMEs in `paths.tf`
- Cloudflare R2 bucket (`limitless-paths-content`) — in `paths.tf`
- Sentry team + project (`paths-api`) — in `paths.tf`
- All env vars: `DATABASE_URL`, `REDIS_URL`, `PAYLOAD_SECRET`, `COOKIE_DOMAIN`, `NEXT_PUBLIC_SERVER_URL`, `R2_*`, `SENTRY_DSN`, `NODE_ENV`

**What needs to be added:**
- Vercel project resource (DNS record exists, but no Terraform-managed Vercel project)
- Stripe env vars on Render web service (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- AI provider env vars on Render web service (`AI_PROVIDER_DEFAULT_BASE_URL`, `AI_PROVIDER_DEFAULT_API_KEY`)
- Vercel env vars (`NEXT_PUBLIC_SERVER_URL`, `SENTRY_DSN`)
- New variable declarations in `variables.tf`
- GitHub Actions workflows (both repos)

**Environment strategy:** Production only (persistent). Preview deploys for PRs (Vercel automatic, Render if configured).

**Terraform:** Single workspace (`production`) in Terraform Cloud, org `limitless-longevity`. Local execution mode.

---

## 2. Terraform Additions

### 2.1 Vercel Project Resource

Add to `paths.tf`. The DNS CNAME record already points `paths.limitless-longevity.health` to `cname.vercel-dns.com`.

```hcl
resource "vercel_project" "paths_frontend" {
  name      = "limitless-paths"
  framework = "nextjs"

  git_repository = {
    type = "github"
    repo = "LIMITLESS-LONGEVITY/limitless-paths"
  }

  build_command   = "pnpm build"
  install_command = "pnpm install"
  root_directory  = ""
}

resource "vercel_project_domain" "paths" {
  project_id = vercel_project.paths_frontend.id
  domain     = "paths.limitless-longevity.health"
}

resource "vercel_project_environment_variable" "paths_server_url" {
  project_id = vercel_project.paths_frontend.id
  key        = "NEXT_PUBLIC_SERVER_URL"
  value      = "https://paths-api.limitless-longevity.health"
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "paths_sentry_dsn" {
  project_id = vercel_project.paths_frontend.id
  key        = "SENTRY_DSN"
  value      = sentry_key.paths_api.dsn["public"]
  target     = ["production"]
}
```

### 2.2 Missing Env Vars on Render Web Service

Add to the existing `env_vars` block in `render_web_service.paths_api`:

```hcl
# Stripe
STRIPE_SECRET_KEY = {
  value = var.stripe_secret_key
}
STRIPE_WEBHOOK_SECRET = {
  value = var.stripe_webhook_secret
}

# AI Provider
AI_PROVIDER_DEFAULT_BASE_URL = {
  value = var.ai_provider_default_base_url
}
AI_PROVIDER_DEFAULT_API_KEY = {
  value = var.ai_provider_default_api_key
}
```

### 2.3 New Variable Declarations

Add to `variables.tf`:

```hcl
# --- Stripe ---

variable "stripe_secret_key" {
  description = "Stripe secret key for payment processing"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  sensitive   = true
}

# --- AI Provider ---

variable "ai_provider_default_base_url" {
  description = "Default AI provider API base URL (e.g., Together AI)"
  type        = string
  default     = "https://api.together.xyz/v1"
}

variable "ai_provider_default_api_key" {
  description = "Default AI provider API key"
  type        = string
  sensitive   = true
}
```

### 2.4 Outputs

Add to `outputs.tf`:

```hcl
output "paths_api_url" {
  value = "https://paths-api.limitless-longevity.health"
}

output "paths_frontend_url" {
  value = "https://paths.limitless-longevity.health"
}

output "paths_db_internal_url" {
  value     = render_postgres.paths_db.connection_info.internal_connection_string
  sensitive = true
}
```

---

## 3. GitHub Actions CI (`limitless-paths`)

**File:** `limitless-paths/.github/workflows/ci.yml`

**Triggers:**
- Pull requests to `main`
- Pushes to `main`

**Job: `test`**

Steps:
1. Checkout code
2. Setup Node.js 20
3. Setup pnpm via `pnpm/action-setup`
4. Cache pnpm store
5. `pnpm install --frozen-lockfile`
6. `pnpm vitest run` (unit tests — no database needed)
7. `pnpm build` (TypeScript + Next.js build verification)

**Environment:** Ubuntu latest. No services needed — unit tests are pure functions.

---

## 4. GitHub Actions Terraform (`limitless-infra`)

**File:** `limitless-infra/.github/workflows/terraform.yml`

### On Pull Request: Plan

Triggers on PRs to `main` that modify `*.tf` files.

Steps:
1. Checkout code
2. Setup Terraform CLI
3. `terraform init` (authenticates with TF Cloud for state)
4. `terraform plan` (using `TF_VAR_*` env vars from GitHub secrets)
5. Post plan output as PR comment

### On Workflow Dispatch: Apply

Manual trigger from GitHub Actions UI.

Steps:
1. Checkout code
2. Setup Terraform CLI
3. `terraform init`
4. `terraform plan` (verify)
5. `terraform apply -auto-approve`

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `TF_API_TOKEN` | Terraform Cloud API token (state backend auth) |
| `TF_VAR_render_api_key` | Render API key |
| `TF_VAR_render_owner_id` | Render workspace owner ID |
| `TF_VAR_vercel_api_token` | Vercel API token |
| `TF_VAR_cloudflare_api_token` | Cloudflare API token |
| `TF_VAR_cloudflare_account_id` | Cloudflare account ID |
| `TF_VAR_github_token` | GitHub PAT |
| `TF_VAR_sentry_token` | Sentry auth token |
| `TF_VAR_paths_payload_secret` | Payload CMS secret |
| `TF_VAR_r2_access_key_id` | R2 access key |
| `TF_VAR_r2_secret_access_key` | R2 secret key |
| `TF_VAR_stripe_secret_key` | Stripe secret key |
| `TF_VAR_stripe_webhook_secret` | Stripe webhook secret |
| `TF_VAR_ai_provider_default_api_key` | AI provider API key |

---

## 5. Smoke Test Checklist

Manual verification after first production deploy:

| # | Test | Expected |
|---|------|----------|
| 1 | `GET https://paths-api.limitless-longevity.health/api/health` | 200 OK |
| 2 | Load `paths-api.limitless-longevity.health/admin` | Payload admin login page |
| 3 | Create admin user, log in | Dashboard loads with all collections |
| 4 | Create membership tier, content pillar, article → publish | Article visible in admin |
| 5 | Load `paths.limitless-longevity.health/articles` | Article listing renders |
| 6 | View published article | Reader with sidebar loads |
| 7 | Create course + modules + lessons | Course visible in admin |
| 8 | Enroll in course via `POST /api/enrollments/enroll` | Enrollment created (201) |
| 9 | View lesson in course player | Lesson viewer with sidebar loads |
| 10 | Open AI tutor, send message | Streaming response works |
| 11 | Generate quiz via `POST /api/ai/quiz/generate` | Quiz JSON returned |
| 12 | Create Stripe checkout session (test mode) | Redirects to Stripe |
| 13 | Trigger test webhook from Stripe CLI | Webhook processes, subscription created |
| 14 | Upload image via admin | Image uploads to R2, serves correctly |
| 15 | Verify Sentry: throw test error | Error appears in Sentry dashboard |
| 16 | Load `/account/profile` (authenticated) | Profile page renders |

---

## 6. File Structure

```
limitless-paths/
└── .github/
    └── workflows/
        └── ci.yml                      # Lint, test, build on PRs

limitless-infra/
├── paths.tf                            # Modified: add Vercel project + missing env vars
├── variables.tf                        # Modified: add Stripe + AI variable declarations
├── outputs.tf                          # Modified: add service URLs
└── .github/
    └── workflows/
        └── terraform.yml               # Plan on PR, apply on dispatch
```

---

## 7. Key Design Decisions

1. **Delta from existing infra** — `paths.tf` already has Render, DNS, R2, Sentry. We only add what's missing (Vercel project, Stripe/AI env vars).
2. **Single Sentry project** — One project (`paths-api`) covers both frontend and backend. Sufficient for launch — split if needed later.
3. **Native Node runtime** — Render uses Node native runtime (not Docker), matching the existing `paths.tf` configuration. Build command includes `pnpm install` and `pnpm build`.
4. **Semi-automated Terraform** — Plan on PR (visibility), apply on manual dispatch (safety).
5. **CI tests pure functions** — No database in CI. Unit tests + build catch regressions.
6. **Platform-native CD** — Vercel and Render auto-deploy on push to main. No deploy scripts in CI.
7. **Production only** — No persistent dev/staging. Preview deploys for PR testing.

---

## 8. Prerequisites Before Apply

1. **Vercel API token** — from Vercel account settings, added to `terraform.tfvars`
2. **Stripe products/prices** — created in Stripe Dashboard, IDs populated in MembershipTiers via Payload admin
3. **Stripe webhook endpoint** — registered in Stripe pointing to `paths-api.limitless-longevity.health/api/stripe/webhooks`
4. **Together AI API key** — from Together AI dashboard
5. **GitHub secrets** — all `TF_VAR_*` secrets added to `limitless-infra` repo settings
6. **`terraform.tfvars`** — updated locally with `stripe_secret_key`, `stripe_webhook_secret`, `ai_provider_default_api_key`
7. **Terraform Cloud** — workspace exists, local execution mode confirmed
8. **Vercel** — Terraform Vercel provider may need to be added to `versions.tf` if not present
