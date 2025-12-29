-- Migration: Add isActive and lastLoginAt fields to users table
-- Date: 2025-12-22
-- Description: Add fields to support user status tracking and last login timestamp

-- Add is_active column (default to true for existing users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add last_login_at column (nullable for existing users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Update existing users to have is_active = true
UPDATE users 
SET is_active = true 
WHERE is_active IS NULL;

-- Add comment to columns for documentation
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active and can log in';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of the user''s last login';


