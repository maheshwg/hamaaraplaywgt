-- Cleanup script for test data before schema migration
-- Run this in your PostgreSQL client before restarting the backend

-- Delete all step results first (foreign key constraint)
DELETE FROM test_run_step_results;

-- Delete all test runs
DELETE FROM test_runs;

-- Optionally, reset sequences if you want IDs to start from 1 again
-- ALTER SEQUENCE test_run_step_results_id_seq RESTART WITH 1;

-- Verify cleanup
SELECT COUNT(*) as remaining_step_results FROM test_run_step_results;
SELECT COUNT(*) as remaining_test_runs FROM test_runs;

-- You should see 0 for both counts
