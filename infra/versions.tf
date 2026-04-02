terraform {
  required_version = ">= 1.5.0"

  required_providers {
    render = {
      source  = "render-oss/render"
      version = "~> 1.8"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 4.6"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.4"
    }
    sentry = {
      source  = "jianyuan/sentry"
      version = "~> 0.14"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}
