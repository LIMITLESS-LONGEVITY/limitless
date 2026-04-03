# --- Outputs ---

output "paths_api_url" {
  description = "PATHS API + Admin panel URL"
  value       = "https://paths-api.limitless-longevity.health"
}

output "paths_frontend_url" {
  description = "PATHS frontend URL (served by Render, same as API)"
  value       = "https://paths.limitless-longevity.health"
}

output "render_api_service_id" {
  description = "Render web service ID for PATHS API"
  value       = render_web_service.paths_api.id
}

output "render_db_id" {
  description = "Render PostgreSQL database ID"
  value       = render_postgres.paths_db.id
  sensitive   = true
}

output "sentry_api_dsn" {
  description = "Sentry DSN for PATHS API"
  value       = sentry_key.paths_api.dsn["public"]
  sensitive   = true
}

output "paths_db_internal_url" {
  description = "Render PostgreSQL internal connection string"
  value       = render_postgres.paths_db.connection_info.internal_connection_string
  sensitive   = true
}

output "paths_staging_db_external_url" {
  description = "Render PostgreSQL staging external connection string (for CI)"
  value       = render_postgres.paths_staging_db.connection_info.external_connection_string
  sensitive   = true
}

# --- HUB Outputs ---

output "hub_url" {
  description = "HUB platform URL"
  value       = "https://hub.limitless-longevity.health"
}

output "hub_service_id" {
  description = "Render web service ID for HUB"
  value       = render_web_service.hub.id
}

output "hub_db_internal_url" {
  description = "HUB PostgreSQL internal connection string"
  value       = render_postgres.hub_db.connection_info.internal_connection_string
  sensitive   = true
}

output "hub_staging_db_external_url" {
  description = "HUB PostgreSQL staging external connection string (for CI)"
  value       = render_postgres.hub_staging_db.connection_info.external_connection_string
  sensitive   = true
}

output "hub_sentry_dsn" {
  description = "Sentry DSN for HUB"
  value       = sentry_key.hub.dsn["public"]
  sensitive   = true
}

# --- Digital Twin Outputs ---

output "dt_api_url" {
  description = "Digital Twin API URL"
  value       = "https://digital-twin-api.limitless-longevity.health"
}

output "dt_service_id" {
  description = "Render web service ID for Digital Twin"
  value       = render_web_service.digital_twin.id
}

output "dt_db_internal_url" {
  description = "Digital Twin PostgreSQL internal connection string"
  value       = render_postgres.dt_db.connection_info.internal_connection_string
  sensitive   = true
}

output "dt_staging_db_external_url" {
  description = "Digital Twin PostgreSQL staging external connection string (for CI)"
  value       = render_postgres.dt_staging_db.connection_info.external_connection_string
  sensitive   = true
}

output "dt_sentry_dsn" {
  description = "Sentry DSN for Digital Twin"
  value       = sentry_key.digital_twin.dsn["public"]
  sensitive   = true
}
