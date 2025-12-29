-- Migration script to add app_url and app_type columns to tests table
-- Run this if you have existing tests in your database

-- Add app_url column (nullable - existing tests won't have this initially)
ALTER TABLE tests ADD COLUMN IF NOT EXISTS app_url VARCHAR(500);

-- Add app_type column with default value 'other'
ALTER TABLE tests ADD COLUMN IF NOT EXISTS app_type VARCHAR(100) DEFAULT 'other';

-- Optional: Update existing tests with a default app_url if needed
-- UPDATE tests SET app_url = 'https://www.example.com' WHERE app_url IS NULL;

-- Note: After running this migration, you should update your tests to set proper app_url values
-- The system will skip auto-navigation for tests without an app_url configured

