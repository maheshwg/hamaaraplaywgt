-- Check if app_url and app_type columns exist, and add them if missing
-- This fixes the issue where tests start on about:blank instead of auto-navigating

-- Add app_url column if it doesn't exist
ALTER TABLE tests ADD COLUMN IF NOT EXISTS app_url VARCHAR(500);

-- Add app_type column if it doesn't exist  
ALTER TABLE tests ADD COLUMN IF NOT EXISTS app_type VARCHAR(100) DEFAULT 'other';

-- Check current state of tests
SELECT 
    id,
    name,
    app_url,
    app_type,
    status
FROM tests
ORDER BY created_date DESC
LIMIT 10;

-- Show which tests are missing app_url
SELECT 
    COUNT(*) as tests_without_url
FROM tests
WHERE app_url IS NULL OR app_url = '';


