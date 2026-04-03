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
  api_key  = var.render_api_key
  owner_id = var.render_owner_id
}

provider "vercel" {
  api_token = var.vercel_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "sentry" {
  token    = var.sentry_token
  base_url = "https://de.sentry.io/api/"
}

provider "github" {
  token = var.github_token
  owner = "LIMITLESS-LONGEVITY"
}
