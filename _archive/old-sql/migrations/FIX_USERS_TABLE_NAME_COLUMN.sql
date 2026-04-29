-- Fix users table to add name column if it doesn't exist
-- This ensures compatibility with registration service

-- Add 'name' column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Update existing rows to have a name (derived from first_name and last_name)
UPDATE users 
SET name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
WHERE name IS NULL OR name = '';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

