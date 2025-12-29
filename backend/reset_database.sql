-- Reset Database Script
-- This script drops all tables to start with a fresh database
-- WARNING: This will delete ALL data!

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
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Reset sequences if any
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') 
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
END $$;







