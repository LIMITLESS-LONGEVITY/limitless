# --- Foundation Resources ---
# Shared infrastructure that exists once across all apps.

# Cloudflare DNS Zone
resource "cloudflare_zone" "main" {
  account = {
    id = var.cloudflare_account_id
  }
  name = "limitless-longevity.health"

  lifecycle {
    prevent_destroy = true
  }
}

# GitHub Repository — PATHS production code
resource "github_repository" "limitless_paths" {
  name        = "limitless-paths"
  description = "PATHS educational platform (Payload CMS) — production"
  visibility  = "public"

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
