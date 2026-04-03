# --- API Gateway: Cloudflare Worker Reverse Proxy ---
# Routes app.limitless-longevity.health/* to the correct Render backend.
# Apps serve under their prefix using Next.js basePath.

# Worker script
resource "cloudflare_workers_script" "gateway" {
  account_id  = var.cloudflare_account_id
  script_name = "limitless-gateway"
  content     = file("${path.module}/gateway-worker.js")
  main_module = "gateway-worker.js"
}

# Worker route — match all requests on app subdomain
resource "cloudflare_workers_route" "gateway" {
  zone_id = cloudflare_zone.main.id
  pattern = "app.limitless-longevity.health/*"
  script  = cloudflare_workers_script.gateway.script_name
}

# DNS record for the gateway (proxied through Cloudflare for Worker to intercept)
resource "cloudflare_dns_record" "gateway" {
  zone_id = cloudflare_zone.main.id
  name    = "app"
  type    = "CNAME"
  content = "limitless-paths.onrender.com"
  proxied = true
  ttl     = 1
}

# Cloudflare Pages — OS Dashboard (static frontend)
# Auto-deploys from GitHub on push to main
# URL: limitless-os-dashboard.pages.dev
resource "cloudflare_pages_project" "os_dashboard" {
  account_id        = var.cloudflare_account_id
  name              = "limitless-os-dashboard"
  production_branch = "main"

  build_config = {
    build_command   = "npm install -g pnpm && pnpm install --frozen-lockfile && pnpm build"
    destination_dir = "out"
    root_dir        = "apps/os-dashboard"
  }

  source = {
    type = "github"
    config = {
      owner                          = "LIMITLESS-LONGEVITY"
      repo_name                      = "limitless"
      production_branch              = "main"
      production_deployments_enabled = true
      pr_comments_enabled            = true
      preview_deployment_setting     = "none"
    }
  }
}

# Origin DNS record for PATHS — not proxied, so the Worker can reach Render directly
# without Cloudflare intercepting (avoids 403 loop on same-zone proxied domains)
resource "cloudflare_dns_record" "paths_origin" {
  zone_id = cloudflare_zone.main.id
  name    = "origin-paths"
  type    = "CNAME"
  content = "limitless-paths.onrender.com"
  proxied = false
  ttl     = 300
}
