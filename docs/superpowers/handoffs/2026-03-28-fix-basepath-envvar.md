# URGENT Fix: basePath Env Vars Wiped by Terraform

## Problem

`NEXT_PUBLIC_BASE_PATH` was set via Render API but Terraform apply wiped it. Terraform manages `env_vars` as a complete map — any apply that doesn't include the var removes it.

Both PATHS and HUB are serving at `/` instead of `/learn` and `/book`. The gateway can't route.

## Root Cause

The env var was set via API (outside Terraform), but `terraform apply` resets env vars to match what's in the `.tf` files. Since `NEXT_PUBLIC_BASE_PATH` wasn't in Terraform, it got deleted.

## Fix

Add `NEXT_PUBLIC_BASE_PATH` to the Render service env vars in Terraform.

### `limitless-infra/paths.tf`

Add to the `env_vars` map in `render_web_service.paths_api`:

```hcl
NEXT_PUBLIC_BASE_PATH = {
  value = "/learn"
}
```

### `limitless-infra/hub.tf`

Add to the `env_vars` map in `render_web_service.hub`:

```hcl
NEXT_PUBLIC_BASE_PATH = {
  value = "/book"
}
```

### Then

```bash
cd limitless-infra
terraform plan -var-file=terraform.tfvars   # verify only env_var additions
terraform apply -var-file=terraform.tfvars
./scripts/restore-custom-domains.sh
```

This will trigger a redeploy of both services with the env var present at build time.

## Verification

After deploy completes:
```bash
curl -s -o /dev/null -w "%{http_code}" https://paths-api.limitless-longevity.health/learn          # 200
curl -s -o /dev/null -w "%{http_code}" https://paths-api.limitless-longevity.health/learn/api/health # 200
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/learn                  # 200
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/book                   # 200
curl -s -o /dev/null -w "%{http_code}" https://app.limitless-longevity.health/book/stays             # 200
```

## Lesson Learned

**NEVER set Render env vars via API if Terraform manages the service.** Terraform will wipe them on next apply. All env vars must be in the `.tf` files.
