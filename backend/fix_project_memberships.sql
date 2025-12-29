-- Fix project_memberships table by removing redundant role column
-- The role is already stored in the users table, so it's not needed here

-- Remove the role column from project_memberships
ALTER TABLE project_memberships DROP COLUMN IF EXISTS role;

-- Verify the change
\d project_memberships

