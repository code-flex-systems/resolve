#!/bin/bash
set -e
DB_URL="${1:-postgres://postgres:password@localhost/manifest}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

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

echo "Done!"
