# --- Digital Twin: Health Data Microservice on Render ---
# Fastify + Drizzle + PostgreSQL (TimescaleDB) on Render (Frankfurt).
# DNS and Sentry below.

# PostgreSQL Database (TimescaleDB extension added post-deploy)
resource "render_postgres" "dt_db" {
  name   = "limitless-digital-twin-db"
  plan   = "basic_256mb"
  region = "frankfurt"

  database_name = "limitless_digital_twin"
  database_user = "limitless_dt_user"
  version       = "16"

  lifecycle {
    prevent_destroy = true
  }
}

# PostgreSQL Staging Database (for CI migration testing)
resource "render_postgres" "dt_staging_db" {
  name   = "limitless-digital-twin-staging-db"
  plan   = "basic_256mb"
  region = "frankfurt"

  database_name = "limitless_dt_staging"
  database_user = "limitless_dt_staging_user"
  version       = "16"

  ip_allow_list = [
    {
      cidr_block  = "0.0.0.0/0"
      description = "GitHub Actions CI runners"
    }
  ]
}

# Web Service (Fastify API — no frontend)
resource "render_web_service" "digital_twin" {
  name   = "limitless-digital-twin"
  plan   = "starter"
  region = "frankfurt"

  health_check_path = "/api/health"

  runtime_source = {
    native_runtime = {
      repo_url      = "https://github.com/LIMITLESS-LONGEVITY/limitless-digital-twin"
      branch        = "main"
      runtime       = "node"
      build_command = "npm install -g pnpm && pnpm install --frozen-lockfile && pnpm run build"
      auto_deploy   = true
    }
  }

  start_command = "node dist/index.js"

  env_vars = {
    DATABASE_URL = {
      value = render_postgres.dt_db.connection_info.internal_connection_string
    }

    JWT_SECRET = {
      value = var.paths_payload_secret
    }

    PORT = {
      value = "3001"
    }

    NODE_ENV = {
      value = "production"
    }
  }
}

# --- Cloudflare DNS Record ---

resource "cloudflare_dns_record" "digital_twin" {
  zone_id = cloudflare_zone.main.id
  name    = "digital-twin-api"
  type    = "CNAME"
  content = "limitless-digital-twin.onrender.com"
  proxied = false
  ttl     = 1
}

# --- Sentry Error Tracking ---

resource "sentry_team" "digital_twin" {
  organization = data.sentry_organization.main.slug
  name         = "Digital Twin"
  slug         = "digital-twin"
}

resource "sentry_project" "digital_twin" {
  organization = data.sentry_organization.main.slug
  teams        = [sentry_team.digital_twin.slug]
  name         = "digital-twin"
  slug         = "digital-twin"
  platform     = "node"
}

resource "sentry_key" "digital_twin" {
  organization = data.sentry_organization.main.slug
  project      = sentry_project.digital_twin.slug
  name         = "digital-twin-terraform"
}
