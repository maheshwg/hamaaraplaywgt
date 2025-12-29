#!/bin/bash

################################################################################
# Database Reset Script
# Drops all tables and lets Hibernate recreate them with fresh schema
################################################################################

set -e

# Load environment variables
if [ -f /opt/youraitester/.env ]; then
    export $(cat /opt/youraitester/.env | grep -v '^#' | xargs)
fi

DB_NAME=${DB_NAME:-test_automation}
DB_USER=${DB_USER:-testuser}
DB_PASSWORD=${DB_PASSWORD:-testpass123}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "=================================="
echo "Resetting Database"
echo "=================================="
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo ""
echo "WARNING: This will delete ALL data!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Dropping all tables..."

# Connect to PostgreSQL and drop all tables
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
-- Drop all tables in the correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS test_run_step_results CASCADE;
DROP TABLE IF EXISTS test_runs CASCADE;
DROP TABLE IF EXISTS test_steps CASCADE;
DROP TABLE IF EXISTS test_tags CASCADE;
DROP TABLE IF EXISTS test_datasets CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS project_memberships CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Drop any other tables that might exist
DO \$\$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;

-- Reset sequences if any
DO \$\$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') 
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
END \$\$;

SELECT 'Database reset complete. Tables will be recreated on next backend startup.' as message;
EOF

echo ""
echo "✓ Database reset complete!"
echo ""
echo "Next steps:"
echo "1. Restart the backend: bash /opt/youraitester/start-services.sh"
echo "2. Hibernate will recreate all tables with the latest schema"
echo ""







