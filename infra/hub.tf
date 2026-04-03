# --- HUB Platform: Clinical & Hospitality Booking on Render ---
# Next.js + Prisma + PostgreSQL on Render (Frankfurt).
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

  ip_allow_list = [
    {
      cidr_block  = "0.0.0.0/0"
      description = "GitHub Actions CI runners"
    }
  ]
}

# Web Service (Next.js)
resource "render_web_service" "hub" {
  name   = "limitless-hub"
  plan   = "starter"
  region = "frankfurt"

  health_check_path = "/book/api/health"

  runtime_source = {
    native_runtime = {
      repo_url      = "https://github.com/LIMITLESS-LONGEVITY/limitless-hub"
      branch        = "main"
      runtime       = "node"
      build_command = "npm install -g pnpm && pnpm install --frozen-lockfile && pnpm run build"
      auto_deploy   = true
    }
  }

  start_command = "npx prisma migrate deploy && pnpm start"

  env_vars = {
    # Database — wired from Render PostgreSQL
    DATABASE_URL = {
      value = render_postgres.hub_db.connection_info.internal_connection_string
    }

    # Auth — shared JWT secret with PATHS for cookie SSO
    JWT_SECRET = {
      value = var.paths_payload_secret
    }
    COOKIE_DOMAIN = {
      value = ".limitless-longevity.health"
    }

    # Stripe
    STRIPE_SECRET_KEY = {
      value = var.stripe_secret_key
    }
    STRIPE_WEBHOOK_SECRET = {
      value = var.stripe_webhook_secret
    }

    # Resend (email)
    RESEND_API_KEY = {
      value = var.resend_api_key
    }
    RESEND_FROM_ADDRESS = {
      value = var.resend_from_address
    }

    # Service-to-service auth (HUB→PATHS tier-sync)
    HUB_SERVICE_KEY = {
      value = var.hub_service_key
    }

    # URLs
    NEXT_PUBLIC_HUB_URL = {
      value = "https://hub.limitless-longevity.health"
    }
    NEXT_PUBLIC_PATHS_URL = {
      value = "https://paths.limitless-longevity.health"
    }
    PATHS_INTERNAL_URL = {
      value = "https://paths-api.limitless-longevity.health"
    }

    # Node
    NODE_ENV = {
      value = "production"
    }

    # Gateway basePath — must be in Terraform, not set via API
    NEXT_PUBLIC_BASE_PATH = {
      value = "/book"
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
