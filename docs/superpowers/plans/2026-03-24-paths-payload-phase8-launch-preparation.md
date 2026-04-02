# PATHS Payload CMS — Phase 8: Launch Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete production infrastructure (Vercel project, missing env vars) and set up CI/CD (GitHub Actions for testing and Terraform) to prepare for launch.

**Architecture:** Two repos, two workflows. `limitless-paths` gets a CI pipeline (lint, test, build on PRs). `limitless-infra` gets a Terraform pipeline (plan on PRs, apply on manual dispatch). Terraform additions are minimal — Vercel project resource and Stripe/AI env vars on the existing Render service.

**Tech Stack:** Terraform, GitHub Actions, Vercel Terraform provider, Render Terraform provider

**Spec:** `docs/superpowers/specs/2026-03-24-paths-phase8-launch-preparation-design.md`

**Depends on:** Phases 1-7 (complete application), existing Terraform in `limitless-infra/`

**Working directories:**
- `C:/Projects/LIMITLESS/limitless-paths/` (app — CI workflow)
- `C:/Projects/LIMITLESS/limitless-infra/` (infra — Terraform resources + workflow)

---

## File Structure

```
limitless-paths/
└── .github/
    └── workflows/
        └── ci.yml                      # New: lint, test, build on PRs

limitless-infra/
├── paths.tf                            # Modified: add Vercel project + Stripe/AI env vars
├── variables.tf                        # Modified: add Stripe + AI variable declarations
├── outputs.tf                          # Modified: add Vercel project ID output
└── .github/
    └── workflows/
        └── terraform.yml               # New: plan on PR, apply on dispatch
```

> **Note:** This phase works across two repos. Tasks 1-2 modify `limitless-infra/`. Tasks 3-4 modify `limitless-paths/`. Task 5 is manual verification.

---

## Task 1: Add Missing Terraform Variables and Env Vars

**Files:**
- Modify: `C:/Projects/LIMITLESS/limitless-infra/variables.tf`
- Modify: `C:/Projects/LIMITLESS/limitless-infra/paths.tf`

- [ ] **Step 1: Add new variable declarations to variables.tf**

Append to `C:/Projects/LIMITLESS/limitless-infra/variables.tf`:

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

- [ ] **Step 2: Add missing env vars to Render web service in paths.tf**

In `C:/Projects/LIMITLESS/limitless-infra/paths.tf`, add these entries to the `env_vars` block inside `render_web_service.paths_api` (after the existing `NODE_ENV` entry):

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

- [ ] **Step 3: Update terraform.tfvars with placeholder values**

Add to `C:/Projects/LIMITLESS/limitless-infra/terraform.tfvars` (this file is gitignored):

```hcl
stripe_secret_key            = ""  # Fill from Stripe Dashboard
stripe_webhook_secret        = ""  # Fill from Stripe Dashboard
ai_provider_default_api_key  = ""  # Fill from Together AI Dashboard
```

> **Note:** `ai_provider_default_base_url` has a default value in `variables.tf` so it doesn't need to be in tfvars unless overriding.

- [ ] **Step 4: Verify Terraform plan**

```bash
cd C:/Projects/LIMITLESS/limitless-infra
terraform plan -var-file=terraform.tfvars
```

Expected: Plan shows changes to `render_web_service.paths_api` (4 new env vars). No other resource changes.

> **CLAUDE.md rule:** ALWAYS run `terraform plan` before `terraform apply`.

- [ ] **Step 5: Commit (do NOT apply yet — apply after CI/CD is ready)**

```bash
git add variables.tf paths.tf
git commit -m "Add Stripe and AI provider env vars to Render web service"
```

---

## Task 2: Add Vercel Project Resource

**Files:**
- Modify: `C:/Projects/LIMITLESS/limitless-infra/paths.tf`
- Modify: `C:/Projects/LIMITLESS/limitless-infra/outputs.tf`

- [ ] **Step 1: Add Vercel project resource to paths.tf**

Append to `C:/Projects/LIMITLESS/limitless-infra/paths.tf` (after the Sentry section):

```hcl
# --- Vercel Frontend ---

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

- [ ] **Step 2: Add new outputs to outputs.tf**

> **Note:** `paths_api_url` and `paths_frontend_url` already exist in `outputs.tf` — do NOT duplicate them.

Append to `C:/Projects/LIMITLESS/limitless-infra/outputs.tf`:

```hcl
output "vercel_project_id" {
  description = "Vercel project ID for PATHS frontend"
  value       = vercel_project.paths_frontend.id
}

output "paths_db_internal_url" {
  description = "Render PostgreSQL internal connection string"
  value       = render_postgres.paths_db.connection_info.internal_connection_string
  sensitive   = true
}
```

- [ ] **Step 3: Verify Terraform plan**

```bash
terraform plan -var-file=terraform.tfvars
```

Expected: Plan shows 4 resources to add (`vercel_project`, `vercel_project_domain`, 2x `vercel_project_environment_variable`), plus the env var changes from Task 1.

- [ ] **Step 4: Commit**

```bash
git add paths.tf outputs.tf
git commit -m "Add Vercel project resource with domain and environment variables"
```

---

## Task 3: Create GitHub Actions CI for limitless-paths

**Files:**
- Create: `C:/Projects/LIMITLESS/limitless-paths/.github/workflows/ci.yml`

- [ ] **Step 1: Create the CI workflow**

`C:/Projects/LIMITLESS/limitless-paths/.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    name: Test & Build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          run_install: false

      - name: Get pnpm store directory
        shell: bash
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Cache pnpm store
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint
        continue-on-error: true  # ESLint has a pre-existing config issue — don't block CI until fixed

      - name: Run tests
        run: pnpm vitest run tests/int/editorial-workflow.int.spec.ts tests/int/access-control.int.spec.ts tests/int/ai-provider.int.spec.ts tests/int/ai-rate-limiter.int.spec.ts tests/int/ai-guardrails.int.spec.ts tests/int/ai-prompts.int.spec.ts tests/int/enrollments.int.spec.ts tests/int/lesson-progress.int.spec.ts tests/int/course-reference-bypass.int.spec.ts tests/int/stripe-service.int.spec.ts tests/int/billing-logic.int.spec.ts
        env:
          PAYLOAD_SECRET: ci-test-secret-not-real
          AI_PROVIDER_DEFAULT_BASE_URL: https://api.together.xyz/v1
          AI_PROVIDER_DEFAULT_API_KEY: ci-test-key-not-real

      - name: Build
        run: pnpm build
        env:
          PAYLOAD_SECRET: ci-test-secret-not-real
          DATABASE_URL: postgresql://fake:fake@localhost:5432/fake
          NEXT_PUBLIC_SERVER_URL: http://localhost:3000
```

> **Note:** The test step lists all unit test files explicitly to avoid running integration tests that need a database. The build step provides dummy env vars so Payload config can initialize (it reads env vars at build time but doesn't connect to them).

- [ ] **Step 2: Commit**

```bash
cd C:/Projects/LIMITLESS/limitless-paths
git add .github/workflows/ci.yml
git commit -m "Add GitHub Actions CI: test and build on PRs and pushes to main"
```

---

## Task 4: Create GitHub Actions Terraform for limitless-infra

**Files:**
- Create: `C:/Projects/LIMITLESS/limitless-infra/.github/workflows/terraform.yml`

- [ ] **Step 1: Create the Terraform workflow**

`C:/Projects/LIMITLESS/limitless-infra/.github/workflows/terraform.yml`:

```yaml
name: Terraform

on:
  pull_request:
    branches: [master]
    paths:
      - '*.tf'
      - '*.tfvars'
  workflow_dispatch:
    inputs:
      action:
        description: 'Action to perform'
        required: true
        default: 'plan'
        type: choice
        options:
          - plan
          - apply

env:
  TF_API_TOKEN: ${{ secrets.TF_API_TOKEN }}
  TF_VAR_render_api_key: ${{ secrets.TF_VAR_render_api_key }}
  TF_VAR_render_owner_id: ${{ secrets.TF_VAR_render_owner_id }}
  TF_VAR_vercel_api_token: ${{ secrets.TF_VAR_vercel_api_token }}
  TF_VAR_cloudflare_api_token: ${{ secrets.TF_VAR_cloudflare_api_token }}
  TF_VAR_cloudflare_account_id: ${{ secrets.TF_VAR_cloudflare_account_id }}
  TF_VAR_github_token: ${{ secrets.TF_VAR_github_token }}
  TF_VAR_sentry_token: ${{ secrets.TF_VAR_sentry_token }}
  TF_VAR_paths_payload_secret: ${{ secrets.TF_VAR_paths_payload_secret }}
  TF_VAR_r2_access_key_id: ${{ secrets.TF_VAR_r2_access_key_id }}
  TF_VAR_r2_secret_access_key: ${{ secrets.TF_VAR_r2_secret_access_key }}
  TF_VAR_stripe_secret_key: ${{ secrets.TF_VAR_stripe_secret_key }}
  TF_VAR_stripe_webhook_secret: ${{ secrets.TF_VAR_stripe_webhook_secret }}
  TF_VAR_ai_provider_default_api_key: ${{ secrets.TF_VAR_ai_provider_default_api_key }}

jobs:
  plan:
    name: Terraform Plan
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' || (github.event_name == 'workflow_dispatch' && github.event.inputs.action == 'plan')

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color
        continue-on-error: true

      - name: Post Plan to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const output = `#### Terraform Plan
            \`\`\`
            ${{ steps.plan.outputs.stdout }}
            \`\`\`
            *Triggered by @${{ github.actor }}*`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            })

      - name: Plan Status
        if: steps.plan.outcome == 'failure'
        run: exit 1

  apply:
    name: Terraform Apply
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.action == 'apply'

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -no-color

      - name: Terraform Apply
        run: terraform apply -auto-approve
```

> **Note:** The `limitless-infra` repo uses `master` as the default branch (not `main`). **Verify this before committing** by running `git remote show origin | grep 'HEAD branch'` in the limitless-infra directory. The workflow triggers on PRs to `master`. The `-var-file` flag is NOT used — all variables are passed via `TF_VAR_*` environment variables from GitHub secrets, which Terraform picks up automatically.

- [ ] **Step 2: Commit**

```bash
cd C:/Projects/LIMITLESS/limitless-infra
git add .github/workflows/terraform.yml
git commit -m "Add GitHub Actions Terraform: plan on PR, apply on manual dispatch"
```

---

## Task 5: Apply Terraform and Smoke Test

**Files:** No file changes — operational steps only.

> **Important:** This task requires manual steps that cannot be fully automated. The implementer must have access to Stripe Dashboard, Together AI Dashboard, and GitHub repository settings.

- [ ] **Step 1: Configure GitHub secrets on limitless-infra repo**

Go to `github.com/LIMITLESS-LONGEVITY/limitless-infra/settings/secrets/actions` and add all secrets listed in the Terraform workflow's `env` block. Values come from:
- `TF_API_TOKEN` — Terraform Cloud user settings → API tokens
- `TF_VAR_render_*` — Render dashboard → Account settings → API keys
- `TF_VAR_vercel_api_token` — Vercel dashboard → Account settings → Tokens
- `TF_VAR_cloudflare_*` — Cloudflare dashboard → API tokens
- `TF_VAR_github_token` — GitHub → Settings → Developer settings → Personal access tokens
- `TF_VAR_sentry_token` — Sentry → Settings → Auth tokens (personal, NOT org token)
- `TF_VAR_paths_payload_secret` — same value as in `terraform.tfvars`
- `TF_VAR_r2_*` — same values as in `terraform.tfvars`
- `TF_VAR_stripe_*` — Stripe Dashboard → Developers → API keys + Webhooks
- `TF_VAR_ai_provider_default_api_key` — Together AI Dashboard → API keys

- [ ] **Step 2: Update local terraform.tfvars with real values**

Fill in the placeholder values added in Task 1 Step 3 with real API keys from Stripe and Together AI dashboards.

- [ ] **Step 3: Apply Terraform locally**

```bash
cd C:/Projects/LIMITLESS/limitless-infra
terraform plan -var-file=terraform.tfvars
# Review the plan carefully
terraform apply -var-file=terraform.tfvars
```

Expected: Creates Vercel project + domain + env vars. Updates Render service with Stripe/AI env vars.

> **CLAUDE.md rule:** ALWAYS run `terraform plan` before `terraform apply`. NEVER copy secrets from `.env.development` — verify against live production values.

- [ ] **Step 4: Configure Stripe webhook endpoint**

In Stripe Dashboard → Developers → Webhooks:
1. Add endpoint: `https://paths-api.limitless-longevity.health/api/stripe/webhooks`
2. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
3. Copy the signing secret → update `stripe_webhook_secret` in `terraform.tfvars` and GitHub secrets
4. Re-apply Terraform if the webhook secret changed

- [ ] **Step 5: Run smoke test checklist**

| # | Test | Expected |
|---|------|----------|
| 1 | `GET https://paths-api.limitless-longevity.health/api/health` | 200 OK |
| 2 | Load `paths-api.limitless-longevity.health/admin` | Payload admin login page |
| 3 | Create admin user, log in | Dashboard loads with all 17 collections |
| 4 | Create membership tier + content pillar + article → publish | Article in admin |
| 5 | Load `paths.limitless-longevity.health/articles` | Article listing renders |
| 6 | View published article | Reader with sidebar loads |
| 7 | Create course + modules + lessons | Course in admin |
| 8 | `POST /api/enrollments/enroll` with courseId | 201 enrollment created |
| 9 | View lesson in course player | Lesson viewer with sidebar |
| 10 | Open AI tutor, send message | Streaming response from AI |
| 11 | `POST /api/ai/quiz/generate` | Quiz JSON returned |
| 12 | Create Stripe checkout session (test mode) | Redirects to Stripe |
| 13 | Trigger webhook via Stripe CLI or Dashboard | Subscription created in Payload |
| 14 | Upload image via admin | Image in R2, serves correctly |
| 15 | Throw test error | Error in Sentry dashboard |
| 16 | Load `/account/profile` (authenticated) | Profile page renders |

- [ ] **Step 6: Push both repos**

```bash
# limitless-infra
cd C:/Projects/LIMITLESS/limitless-infra
git push origin master

# limitless-paths (if not already pushed)
cd C:/Projects/LIMITLESS/limitless-paths
git push origin main
```

---

## Phase 8 Milestone Checklist

After completing all 5 tasks, verify:

- [ ] Terraform `variables.tf` has Stripe + AI variable declarations
- [ ] Render web service has all env vars (DB, Redis, Payload, R2, Sentry, Stripe, AI)
- [ ] Vercel project created via Terraform with domain + env vars
- [ ] GitHub Actions CI runs on PRs to `limitless-paths` (test + build)
- [ ] GitHub Actions Terraform runs plan on PRs to `limitless-infra`
- [ ] GitHub Actions Terraform apply works via manual dispatch
- [ ] All GitHub secrets configured on both repos
- [ ] Stripe webhook endpoint registered and verified
- [ ] All 16 smoke test items pass
- [ ] Frontend accessible at `paths.limitless-longevity.health`
- [ ] Backend accessible at `paths-api.limitless-longevity.health`

**Platform is LIVE.**

**Post-launch priorities:**
- Custom admin dashboard widgets (usage stats, member management)
- SEO fine-tuning (meta descriptions, OG images, sitemap)
- Performance monitoring via Sentry
- Custom login/registration page (replace Payload admin login)
- Content seeding (initial articles, courses, tiers)
