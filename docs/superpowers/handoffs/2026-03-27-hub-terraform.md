# Handoff: HUB Terraform Infrastructure

**Date:** 2026-03-27
**From:** Main Instance (Operator/Architect)
**To:** Workbench Instance (Infra Engineer)
**Priority:** After HUB scaffold PR merges
**Repo:** `limitless-infra`
**Design spec:** `docs/superpowers/specs/2026-03-27-hub-design.md`

---

## Objective

Add Terraform resources for the HUB platform: Render web service, PostgreSQL (prod + staging), Cloudflare DNS, and Sentry. Follow the `paths.tf` pattern exactly.

## Pre-Requisites

1. HUB scaffold PR #1 merged to `limitless-hub` main
2. WSL migration complete (so `terraform plan/apply` runs natively)
3. `terraform.tfvars` has all existing variables populated

---

## Create: `limitless-infra/hub.tf`

Model after `paths.tf`. The HUB is simpler — no Redis, no R2, no AI providers.

```hcl
# --- HUB Platform: Next.js + Prisma on Render ---
# PostgreSQL and web service on Render (Frankfurt).
# DNS and Sentry below.

# PostgreSQL Database
resource "render_postgres" "hub_db" {
  name   = "limitless-hub-db"
  plan   = "basic_256mb"
  region = "frankfurt"

  database_name = "limitless_hub"
  database_user = "limitless_hub_user"
  version       = "16"

  lifecycle {
    prevent_destroy = true
  }
}

# PostgreSQL Staging Database (for CI migration testing)
resource "render_postgres" "hub_staging_db" {
  name   = "limitless-hub-staging-db"
  plan   = "basic_256mb"
  region = "frankfurt"

  database_name = "limitless_hub_staging"
  database_user = "limitless_hub_staging_user"
  version       = "16"
}

# Web Service
resource "render_web_service" "hub" {
  name   = "limitless-hub"
  plan   = "starter"
  region = "frankfurt"

  health_check_path = "/api/health"

  runtime_source = {
    native_runtime = {
      repo_url      = "https://github.com/LIMITLESS-LONGEVITY/limitless-hub"
      branch        = "main"
      runtime       = "node"
      build_command = "npm install -g pnpm && pnpm install --frozen-lockfile && npx prisma generate && pnpm build"
      auto_deploy   = true
    }
  }

  start_command = "npx prisma migrate deploy && node server.js"

  env_vars = {
    # Database
    DATABASE_URL = {
      value = render_postgres.hub_db.connection_info.internal_connection_string
    }

    # Auth (shared JWT secret with PATHS)
    JWT_SECRET = {
      value = var.hub_jwt_secret
    }

    # URLs
    NEXT_PUBLIC_HUB_URL = {
      value = "https://hub.limitless-longevity.health"
    }
    NEXT_PUBLIC_PATHS_URL = {
      value = "https://paths.limitless-longevity.health"
    }

    # Cookie
    COOKIE_DOMAIN = {
      value = ".limitless-longevity.health"
    }

    # Stripe
    STRIPE_SECRET_KEY = {
      value = var.stripe_secret_key
    }
    STRIPE_WEBHOOK_SECRET = {
      value = var.hub_stripe_webhook_secret
    }

    # Resend (email)
    RESEND_API_KEY = {
      value = var.resend_api_key
    }
    RESEND_FROM_ADDRESS = {
      value = var.resend_from_address
    }

    # Sentry
    SENTRY_DSN = {
      value = sentry_key.hub.dsn["public"]
    }

    # Node
    NODE_ENV = {
      value = "production"
    }
  }
}

# --- Cloudflare DNS Records ---

resource "cloudflare_dns_record" "hub" {
  zone_id = cloudflare_zone.main.id
  name    = "hub"
  type    = "CNAME"
  content = "limitless-hub.onrender.com"
  proxied = false
  ttl     = 1
}

# --- Sentry Error Tracking ---

resource "sentry_team" "hub" {
  organization = data.sentry_organization.main.slug
  name         = "HUB"
  slug         = "hub"
}

resource "sentry_project" "hub" {
  organization = data.sentry_organization.main.slug
  teams        = [sentry_team.hub.slug]
  name         = "hub"
  slug         = "hub"
  platform     = "javascript-nextjs"
}

resource "sentry_key" "hub" {
  organization = data.sentry_organization.main.slug
  project      = sentry_project.hub.slug
  name         = "hub-terraform"
}
```

---

## Add Variables: `variables.tf`

Append these new variables:

```hcl
# --- HUB ---

variable "hub_jwt_secret" {
  description = "JWT secret shared with PATHS for cookie SSO validation"
  type        = string
  sensitive   = true
}

variable "hub_stripe_webhook_secret" {
  description = "Stripe webhook signing secret for HUB"
  type        = string
  sensitive   = true
}
```

**Note:** `stripe_secret_key`, `resend_api_key`, `resend_from_address` are already defined (shared with PATHS).

---

## Add Outputs: `outputs.tf`

```hcl
output "hub_url" {
  description = "HUB platform URL"
  value       = "https://hub.limitless-longevity.health"
}

output "hub_staging_db_external_url" {
  description = "HUB staging DB external connection string (for CI)"
  value       = render_postgres.hub_staging_db.connection_info.external_connection_string
  sensitive   = true
}
```

---

## Add to `terraform.tfvars`

```
hub_jwt_secret            = "..."  # MUST match PATHS's PAYLOAD_SECRET (same JWT signing key)
hub_stripe_webhook_secret = "..."  # Create new Stripe webhook for hub.limitless-longevity.health
```

**Critical:** The `hub_jwt_secret` must be the SAME value as `paths_payload_secret`. PATHS signs JWTs with its Payload secret; HUB verifies with the same key. If they differ, SSO won't work.

---

## Update `restore-custom-domains.sh`

Add HUB custom domain restoration. The script needs to know the Render service ID for `limitless-hub` and add `hub.limitless-longevity.health` as a custom domain.

---

## Execution

```bash
cd limitless-infra

# 1. Add hub_jwt_secret and hub_stripe_webhook_secret to terraform.tfvars
# 2. Plan
terraform plan -var-file=terraform.tfvars

# 3. Apply
terraform apply -var-file=terraform.tfvars

# 4. MANDATORY: restore custom domains
RENDER_API_KEY=rnd_xxx ./scripts/restore-custom-domains.sh

# 5. Extract staging DB URL and set GitHub secret
terraform output -raw hub_staging_db_external_url
# Copy the URL, then:
cd ../limitless-hub
gh secret set STAGING_DATABASE_URL
# Paste the URL
```

---

## Verification

1. `terraform plan` shows only additions (no modifications to existing PATHS resources)
2. `terraform apply` succeeds
3. Render dashboard shows `limitless-hub` service + 2 PostgreSQL databases
4. `hub.limitless-longevity.health` resolves (CNAME → Render)
5. Sentry project `hub` exists
6. GitHub secret `STAGING_DATABASE_URL` set on `limitless-hub` repo

## Cost Impact

| Resource | Monthly Cost |
|----------|-------------|
| Render Web Service (starter) | $7 |
| Render PostgreSQL prod (basic_256mb) | $7 |
| Render PostgreSQL staging (basic_256mb) | $7 |
| Sentry (free tier) | $0 |
| Cloudflare DNS | $0 |
| **Total** | **$21/mo** |
