-- Fix custom_users table to match registration service requirements
-- Add missing 'name' and 'role' columns

-- Add 'name' column if it doesn't exist
ALTER TABLE custom_users 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add 'role' column if it doesn't exist
ALTER TABLE custom_users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'user'));

-- Update existing rows to have a name (derived from first_name and last_name)
UPDATE custom_users 
SET name = TRIM(CONCAT(first_name, ' ', last_name))
WHERE name IS NULL OR name = '';

-- Update existing rows to have a role if null
UPDATE custom_users 
SET role = 'owner'
WHERE role IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'custom_users' 
ORDER BY ordinal_position;

