# --- PATHS Platform: Payload CMS on Render ---
# PostgreSQL, Redis, and Payload web service on Render (Frankfurt).
# DNS, R2, and Sentry below.

# PostgreSQL Database
resource "render_postgres" "paths_db" {
  name   = "limitless-paths-db"
  plan   = "basic_256mb"
  region = "frankfurt"

  database_name = "limitless_paths"
  database_user = "limitless_paths_user"
  version       = "16"

  lifecycle {
    prevent_destroy = true
  }
}

# PostgreSQL Staging Database (for CI migration testing)
resource "render_postgres" "paths_staging_db" {
  name   = "limitless-paths-staging-db"
  plan   = "basic_256mb"
  region = "frankfurt"

  database_name = "limitless_paths_staging"
  database_user = "limitless_paths_staging_user"
  version       = "16"

  ip_allow_list = [
    {
      cidr_block  = "0.0.0.0/0"
      description = "GitHub Actions CI runners"
    }
  ]
}

# Redis Cache
resource "render_redis" "paths_redis" {
  name              = "limitless-paths-redis"
  plan              = "free"
  region            = "frankfurt"
  max_memory_policy = "allkeys_lru"
}

# Payload CMS Web Service (Docker)
resource "render_web_service" "paths_api" {
  name   = "paths-api"
  plan   = "starter"
  region = "frankfurt"

  health_check_path = "/learn/api/health"

  runtime_source = {
    native_runtime = {
      repo_url      = "https://github.com/LIMITLESS-LONGEVITY/limitless-paths"
      branch        = "main"
      runtime       = "node"
      build_command = "npm install -g pnpm && pnpm install --frozen-lockfile && pnpm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public"
      auto_deploy   = true
    }
  }

  start_command = "npx payload migrate && node .next/standalone/server.js"

  env_vars = {
    # Database — wired from Render PostgreSQL
    DATABASE_URL = {
      value = render_postgres.paths_db.connection_info.internal_connection_string
    }

    # Payload
    PAYLOAD_SECRET = {
      value = var.paths_payload_secret
    }
    NEXT_PUBLIC_SERVER_URL = {
      value = "https://paths-api.limitless-longevity.health"
    }

    # Auth
    COOKIE_DOMAIN = {
      value = ".limitless-longevity.health"
    }

    # Redis — wired from Render Redis
    REDIS_URL = {
      value = render_redis.paths_redis.connection_info.internal_connection_string
    }

    # R2 Storage
    R2_BUCKET = {
      value = cloudflare_r2_bucket.paths_content.name
    }
    R2_ACCESS_KEY_ID = {
      value = var.r2_access_key_id
    }
    R2_SECRET_ACCESS_KEY = {
      value = var.r2_secret_access_key
    }
    R2_ENDPOINT = {
      value = "https://${var.cloudflare_account_id}.r2.cloudflarestorage.com"
    }

    # Sentry — wired from sentry_key resource
    SENTRY_DSN = {
      value = sentry_key.paths_api.dsn["public"]
    }

    # Node
    NODE_ENV = {
      value = "production"
    }

    # Gateway basePath — must be in Terraform, not set via API
    NEXT_PUBLIC_BASE_PATH = {
      value = "/learn"
    }

    # Stripe
    STRIPE_SECRET_KEY = {
      value = var.stripe_secret_key
    }
    STRIPE_WEBHOOK_SECRET = {
      value = var.stripe_webhook_secret
    }

    # Service-to-service auth
    HUB_SERVICE_KEY = {
      value = var.hub_service_key
    }
    DT_SERVICE_URL = {
      value = "https://digital-twin-api.limitless-longevity.health"
    }
    DT_SERVICE_KEY = {
      value = var.paths_dt_service_key
    }

    # AI Provider
    AI_PROVIDER_DEFAULT_BASE_URL = {
      value = var.ai_provider_default_base_url
    }
    AI_PROVIDER_DEFAULT_API_KEY = {
      value = var.ai_provider_default_api_key
    }

    # Jina AI (RAG embeddings + reranking)
    AI_PROVIDER_JINA_BASE_URL = {
      value = "https://api.jina.ai/v1"
    }
    AI_PROVIDER_JINA_API_KEY = {
      value = var.jina_api_key
    }

    # Resend (email)
    RESEND_API_KEY = {
      value = var.resend_api_key
    }
    RESEND_FROM_ADDRESS = {
      value = var.resend_from_address
    }
  }
}

# --- Cloudflare DNS Records ---

resource "cloudflare_dns_record" "paths_api" {
  zone_id = cloudflare_zone.main.id
  name    = "paths-api"
  type    = "CNAME"
  content = "paths-api.onrender.com"
  proxied = false
  ttl     = 1
}

resource "cloudflare_dns_record" "paths" {
  zone_id = cloudflare_zone.main.id
  name    = "paths"
  type    = "CNAME"
  content = "paths-api.onrender.com"
  proxied = false
  ttl     = 1
}

# --- Cloudflare R2 Storage ---

resource "cloudflare_r2_bucket" "paths_content" {
  account_id = var.cloudflare_account_id
  name       = "limitless-paths-content"
  location   = "WEUR"
}

# --- Sentry Error Tracking ---

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
  platform     = "javascript-nextjs"
}

resource "sentry_key" "paths_api" {
  organization = data.sentry_organization.main.slug
  project      = sentry_project.paths_api.slug
  name         = "paths-api-terraform"
}

# --- Vercel ---
# NOTE: Vercel frontend removed — Payload 3.x serves both API and frontend
# from a single Next.js app on Render. The `paths` DNS CNAME points to Render.
# If frontend/backend split is needed later, re-add Vercel project and refactor
# server components to use REST API instead of Payload Local API.
