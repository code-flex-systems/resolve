#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Connection string: first argument, or DATABASE_URL from the environment /
# apps/web/.env. Never hardcode credentials here - this file is committed.
if [ -z "${1:-}" ] && [ -z "${DATABASE_URL:-}" ] && [ -f "$SCRIPT_DIR/../../.env" ]; then
  DATABASE_URL="$(grep '^DATABASE_URL=' "$SCRIPT_DIR/../../.env" | cut -d= -f2-)"
fi
DB_URL="${1:-${DATABASE_URL:-}}"

if [ -z "$DB_URL" ]; then
  echo "Usage: $0 <postgres-connection-string>"
  echo "(or set DATABASE_URL in the environment / apps/web/.env)"
  exit 1
fi

echo "Seeding database..."
for script in \
  seed_reference_data.sql \
  seed_claims.sql \
  seed_desk_workflow.sql \
  seed_parties_coverage.sql \
  seed_tasks_recovery.sql \
  seed_payments.sql \
  seed_documents.sql \
  seed_workflow_rules.sql \
  seed_logs.sql \
  seed_analytics.sql
do
  echo "  Running $script..."
  psql "$DB_URL" -f "$SCRIPT_DIR/$script"
done

echo "  Running seed_checklists.ts..."
cd "$SCRIPT_DIR/../.." && npx tsx src/scripts/seed_checklists.ts

echo "  Running seed_response_audit_logs.sql..."
psql "$DB_URL" -f "$SCRIPT_DIR/seed_response_audit_logs.sql"

echo "  Running seed_resource_index.sql..."
psql "$DB_URL" -f "$SCRIPT_DIR/seed_resource_index.sql"

echo "Done!"
