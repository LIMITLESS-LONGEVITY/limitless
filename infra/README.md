# LIMITLESS Infrastructure

Terraform configuration for the entire LIMITLESS production infrastructure.

## Quick Start

```bash
# 1. Install Terraform (>= 1.5)
# 2. Log in to Terraform Cloud
terraform login

# 3. Initialize
terraform init

# 4. Preview changes
terraform plan

# 5. Apply changes
terraform apply
```

## Architecture

Single Terraform workspace managing ~15 resources across 5 providers:

| Provider | Resources |
|----------|-----------|
| Render | Web service, PostgreSQL, Redis |
| Vercel | 2 projects (PATHS frontend, contributor guide) |
| Cloudflare | DNS zone, 4 CNAME records, R2 bucket |
| Sentry | 2 projects, team, client keys |
| GitHub | Repository settings |

State is stored in **Terraform Cloud** (free tier, local execution mode).

## File Layout

| File | Contents |
|------|----------|
| `main.tf` | Backend config and provider blocks |
| `versions.tf` | Provider version constraints |
| `variables.tf` | Variable declarations |
| `foundation.tf` | Shared resources (CF zone, GitHub repo, Sentry org) |
| `paths.tf` | PATHS platform (Render, Vercel, Sentry, DNS, R2) |
| `guide.tf` | Contributor guide (Vercel, DNS) |
| `outputs.tf` | URLs, IDs, DSNs |

## Variables

All secrets are stored as sensitive variables in Terraform Cloud. See `terraform.tfvars.example` for the full list.

## Safety

- `prevent_destroy` on: Cloudflare zone, GitHub repo, PostgreSQL database
- Always run `terraform plan` before `terraform apply`
- Never run `terraform destroy` in the production workspace
- Provider versions are pinned to prevent breaking upgrades

## Disaster Recovery

1. Clone this repo
2. `terraform init` (connects to TF Cloud)
3. `terraform apply` (recreates all infrastructure)
4. Restore database from Render backups
5. Re-run Alembic migrations if needed

## Reusable Module

`modules/learnhouse-app/` contains a parameterized module for deploying additional LearnHouse apps (CUBES+, HUBS). See its README for usage.
