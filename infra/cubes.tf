# --- Cubes+ Platform: Training & Coaching on Render ---
# Next.js 15 + Prisma 7 + PostgreSQL on Render (Frankfurt).
# Database manually provisioned (dpg-d75rsd63jp1c73dipvl0-a) — not managed by Terraform.
# DNS and Sentry below.

# Web Service (Next.js)
resource "render_web_service" "cubes" {
  name   = "limitless-cubes"
  plan   = "starter"
  region = "frankfurt"

  root_directory    = "apps/cubes"
  health_check_path = "/train/api/v1/domains"

  runtime_source = {
    native_runtime = {
      repo_url      = "https://github.com/LIMITLESS-LONGEVITY/limitless"
      branch        = "main"
      runtime       = "node"
      build_command = "cd ../.. && npm install -g pnpm && pnpm install --frozen-lockfile && cd apps/cubes && npx prisma generate && pnpm run build && cp -r .next/static .next/standalone/apps/cubes/.next/static && cp -r public .next/standalone/apps/cubes/public"
      auto_deploy   = true
      build_filter  = {
        paths = ["apps/cubes/**"]
      }
    }
  }

  start_command = "npx prisma db push --accept-data-loss && node .next/standalone/apps/cubes/server.js"

  env_vars = {
    # Database — manually provisioned, not wired from render_postgres
    DATABASE_URL = {
      value = var.cubes_database_url
    }

    # Auth — shared JWT secret with PATHS for cookie SSO
    PAYLOAD_SECRET = {
      value = var.paths_payload_secret
    }

    # Stripe
    STRIPE_SECRET_KEY = {
      value = var.stripe_secret_key
    }
    STRIPE_WEBHOOK_SECRET = {
      value = var.cubes_stripe_webhook_secret
    }

    # Digital Twin integration
    CUBES_DT_SERVICE_KEY = {
      value = var.cubes_dt_service_key
    }
    DT_API_URL = {
      value = "https://limitless-digital-twin.onrender.com"
    }

    # URLs
    NEXT_PUBLIC_APP_URL = {
      value = "https://app.limitless-longevity.health"
    }
    PATHS_API_URL = {
      value = "https://paths-api.onrender.com/learn"
    }

    # Node
    NODE_ENV = {
      value = "production"
    }

    # Gateway basePath
    NEXT_PUBLIC_BASE_PATH = {
      value = "/train"
    }
  }
}

# --- Sentry Error Tracking ---

resource "sentry_team" "cubes" {
  organization = data.sentry_organization.main.slug
  name         = "Cubes+"
  slug         = "cubes"
}

resource "sentry_project" "cubes" {
  organization = data.sentry_organization.main.slug
  teams        = [sentry_team.cubes.slug]
  name         = "cubes"
  slug         = "cubes"
  platform     = "javascript-nextjs"
}

resource "sentry_key" "cubes" {
  organization = data.sentry_organization.main.slug
  project      = sentry_project.cubes.slug
  name         = "cubes-terraform"
}
