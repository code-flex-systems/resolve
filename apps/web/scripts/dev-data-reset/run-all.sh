#!/bin/bash

# =====================================================
# run-all.sh
# Execute all dev database reset scripts in order
# =====================================================

set -e  # Exit on error

# Configuration - load from .env or use defaults
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../.env"

# Default values (can be overridden by .env)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"
DB_DATABASE="${DB_DATABASE:-manifest}"

# Load from .env if exists
if [ -f "$ENV_FILE" ]; then
    echo "Loading database config from .env..."
    export $(grep -E '^DB_(HOST|PORT|USER|PASSWORD|DATABASE)=' "$ENV_FILE" | xargs)
fi

# Build connection string
export PGPASSWORD="$DB_PASSWORD"
PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE"

echo "=============================================="
echo "Dev Database Reset Script"
echo "=============================================="
echo "Database: $DB_DATABASE @ $DB_HOST:$DB_PORT"
echo ""

# Confirmation prompt
read -p "This will DELETE all data and recreate test data. Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Starting database reset..."
echo ""

# Execute scripts in order
SCRIPTS=(
    "01-clear-data.sql"
    "02-select-users.sql"
    "03-generate-parties.sql"
    "03b-generate-party-details.sql"
    "04-generate-claims.sql"
    "05-generate-coverages.sql"
    "06-generate-claim-parties.sql"
    "07-generate-payments.sql"
    "08-generate-settlements.sql"
    "09-generate-recovery-events.sql"
)

for script in "${SCRIPTS[@]}"; do
    echo "----------------------------------------------"
    echo "Running: $script"
    echo "----------------------------------------------"
    $PSQL_CMD -f "$SCRIPT_DIR/$script"
    echo ""
done

echo "=============================================="
echo "Database reset complete!"
echo "=============================================="
echo ""

# Verification queries
echo "Verification Summary:"
echo "----------------------------------------------"
$PSQL_CMD -c "
SELECT 'Users' as entity, COUNT(*) as count FROM users
UNION ALL SELECT 'Claims', COUNT(*) FROM claim
UNION ALL SELECT 'Parties', COUNT(*) FROM party
UNION ALL SELECT 'Coverages', COUNT(*) FROM claim_coverage
UNION ALL SELECT 'Claim-Party Links', COUNT(*) FROM claim_party
UNION ALL SELECT 'Payments', COUNT(*) FROM claim_payment
UNION ALL SELECT 'Settlements', COUNT(*) FROM settlement
UNION ALL SELECT 'Recovery Events', COUNT(*) FROM recovery_event;
"

echo ""
echo "Done!"
