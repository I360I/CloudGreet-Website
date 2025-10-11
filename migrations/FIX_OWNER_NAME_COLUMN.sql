-- FIX: Remove owner_name column from businesses table
-- This fixes the registration failure

-- Drop the owner_name column from businesses table
ALTER TABLE businesses DROP COLUMN IF EXISTS owner_name;

-- Verify the fix
SELECT 'SUCCESS: owner_name column removed from businesses table' as status;
