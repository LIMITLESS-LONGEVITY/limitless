#!/bin/bash
# restore-custom-domains.sh
# Run after every `terraform apply` that modifies render_web_service resources.
# The Render Terraform provider does not manage custom domains — apply resets them.
#
# Requires: RENDER_API_KEY environment variable
# Usage: RENDER_API_KEY=rnd_xxx ./scripts/restore-custom-domains.sh

set -euo pipefail

if [ -z "${RENDER_API_KEY:-}" ]; then
  echo "ERROR: RENDER_API_KEY not set. Get it from https://dashboard.render.com/u/settings#api-keys"
  exit 1
fi

API="https://api.render.com/v1"

add_domain() {
  local service_id="$1"
  local domain="$2"

  echo -n "Adding $domain to $service_id... "

  response=$(curl -s -w "\n%{http_code}" -X POST "$API/services/$service_id/custom-domains" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$domain\"}")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)

  if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
    echo "OK"
  elif [ "$http_code" = "409" ]; then
    echo "already exists (OK)"
  else
    echo "FAILED (HTTP $http_code): $body"
  fi
}

echo "=== Restoring custom domains ==="
echo ""

# PATHS API
echo "--- paths-api (srv-d70fsaua2pns73b48kf0) ---"
add_domain "srv-d70fsaua2pns73b48kf0" "paths-api.limitless-longevity.health"
add_domain "srv-d70fsaua2pns73b48kf0" "paths.limitless-longevity.health"

# HUB
echo "--- hub (srv-d73o9j1aae7s73b45gf0) ---"
add_domain "srv-d73o9j1aae7s73b45gf0" "hub.limitless-longevity.health"

# Digital Twin
echo "--- digital-twin (srv-d73p42khg0os739msrrg) ---"
add_domain "srv-d73p42khg0os739msrrg" "digital-twin-api.limitless-longevity.health"

echo ""
echo "=== Done ==="
