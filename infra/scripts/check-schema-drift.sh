#!/bin/bash
# check-schema-drift.sh — Detects schema drift between Payload CMS collections and production DB
# Connects to PATHS PostgreSQL and compares actual columns against expected schema.
#
# Usage: DATABASE_URL=<url> bash check-schema-drift.sh
# Output: List of missing/extra columns, exit 0 if clean, exit 1 if drift detected.

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL not set"
    exit 1
fi

# Expected tables that should exist (based on Payload collections)
EXPECTED_TABLES=(
    "users"
    "pages"
    "posts"
    "media"
    "categories"
    "articles"
    "courses"
    "modules"
    "lessons"
    "enrollments"
    "quizzes"
    "quiz_attempts"
    "certificates"
    "ai_config"
    "feedback"
    "content_chunks"
    "payload_locked_documents"
    "payload_locked_documents_rels"
    "payload_migrations"
    "payload_preferences"
)

DRIFT_FOUND=false

echo "=== PATHS Schema Drift Check — $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

for table in "${EXPECTED_TABLES[@]}"; do
    EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null | tr -d ' ')
    if [ "$EXISTS" != "t" ]; then
        echo "❌ MISSING TABLE: $table"
        DRIFT_FOUND=true
    fi
done

# Check critical columns that have caused outages
CRITICAL_CHECKS=(
    "ai_config|token_budgets_action_plan_max_tokens"
    "ai_config|token_budgets_daily_protocol_max_tokens"
    "ai_config|token_budgets_discover_max_tokens"
    "payload_locked_documents_rels|feedback_id"
    "enrollments|feedback_prompted"
)

for check in "${CRITICAL_CHECKS[@]}"; do
    IFS='|' read -r TABLE COLUMN <<< "$check"
    EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '$TABLE' AND column_name = '$COLUMN');" 2>/dev/null | tr -d ' ')
    if [ "$EXISTS" != "t" ]; then
        echo "❌ MISSING COLUMN: $TABLE.$COLUMN"
        DRIFT_FOUND=true
    fi
done

if [ "$DRIFT_FOUND" = true ]; then
    echo ""
    echo "⚠️  Schema drift detected. Run migrations or investigate."
    exit 1
else
    echo "✅ No schema drift detected. All expected tables and critical columns present."
    exit 0
fi
