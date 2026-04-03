# --- Provider API Keys ---

variable "render_api_key" {
  description = "Render API key"
  type        = string
  sensitive   = true
}

variable "render_owner_id" {
  description = "Render workspace/team owner ID"
  type        = string
}

variable "vercel_api_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token (scoped: DNS + R2 + Workers Scripts + Pages edit)"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "sentry_token" {
  description = "Sentry auth token (scopes: org:admin, project:admin, team:admin)"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

# --- Application Secrets ---

variable "paths_payload_secret" {
  description = "Payload CMS secret for JWT encryption (minimum 32 characters)"
  type        = string
  sensitive   = true
}

variable "r2_access_key_id" {
  description = "Cloudflare R2 access key ID"
  type        = string
  sensitive   = true
}

variable "r2_secret_access_key" {
  description = "Cloudflare R2 secret access key"
  type        = string
  sensitive   = true
}

# --- Service-to-Service Auth ---

variable "hub_service_key" {
  description = "Shared service key for HUB→PATHS internal API calls (tier-sync)"
  type        = string
  sensitive   = true
}

variable "paths_dt_service_key" {
  description = "Service key for PATHS→Digital Twin API calls (health profile sync, ai-context)"
  type        = string
  sensitive   = true
}

# --- Wearable OAuth ---

variable "oura_client_id" {
  description = "Oura Ring OAuth2 client ID"
  type        = string
  sensitive   = true
}

variable "oura_client_secret" {
  description = "Oura Ring OAuth2 client secret"
  type        = string
  sensitive   = true
}

# --- Cubes+ ---

variable "cubes_database_url" {
  description = "Cubes+ PostgreSQL connection string (manually provisioned DB dpg-d75rsd63jp1c73dipvl0-a)"
  type        = string
  sensitive   = true
}

variable "cubes_dt_service_key" {
  description = "Service key for Cubes+→Digital Twin API calls"
  type        = string
  sensitive   = true
}

variable "cubes_stripe_webhook_secret" {
  description = "Stripe webhook signing secret for Cubes+ (different endpoint from PATHS/HUB)"
  type        = string
  sensitive   = true
}

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
  description = "Default AI provider API base URL (OpenRouter for testing, Together AI for production)"
  type        = string
  default     = "https://openrouter.ai/api/v1"
}

variable "ai_provider_default_api_key" {
  description = "Default AI provider API key"
  type        = string
  sensitive   = true
}

# --- Jina AI (RAG embeddings + reranking) ---

variable "jina_api_key" {
  description = "Jina AI API key for embeddings and reranking"
  type        = string
  sensitive   = true
}

# --- Resend (Email) ---

variable "resend_api_key" {
  description = "Resend API key for transactional emails (password reset, notifications)"
  type        = string
  sensitive   = true
}

variable "resend_from_address" {
  description = "Default from address for emails"
  type        = string
  default     = "noreply@limitless-longevity.health"
}
