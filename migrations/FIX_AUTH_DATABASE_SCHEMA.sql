-- =====================================================
-- FIX AUTHENTICATION DATABASE SCHEMA
-- This fixes the users table to match what the auth APIs expect
-- =====================================================

-- First, let's check what columns are missing and add them
-- The auth APIs expect: name, business_id, role, status, login_count

-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id),
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'owner',
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Update existing users to have a name if they don't have one
UPDATE users 
SET name = CONCAT(first_name, ' ', last_name)
WHERE name IS NULL AND first_name IS NOT NULL AND last_name IS NOT NULL;

-- Update existing users to have just first_name as name if no last_name
UPDATE users 
SET name = first_name
WHERE name IS NULL AND first_name IS NOT NULL;

-- Update existing users to have a default name if no names at all
UPDATE users 
SET name = 'User'
WHERE name IS NULL;

-- Make name column NOT NULL now that we've populated it
ALTER TABLE users ALTER COLUMN name SET NOT NULL;

-- Create an index on the business_id column for performance
CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);

-- Create an index on the status column for performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Create an index on the role column for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update the RLS policy for users to include the new columns
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create new policies that work with the updated schema
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id OR business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id OR business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Grant permissions on the updated columns
GRANT ALL ON users TO authenticated;

-- =====================================================
-- FIX BUSINESS TYPE CONSTRAINT
-- =====================================================

-- The businesses table has a restrictive CHECK constraint on business_type
-- Let's make it more flexible to accept the values from the registration form
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_business_type_check;

-- Create a new, more flexible constraint
ALTER TABLE businesses 
ADD CONSTRAINT businesses_business_type_check 
CHECK (business_type IN (
    'HVAC', 'Paint', 'Roofing', 'Plumbing', 'Electrical', 'Landscaping', 'Cleaning', 'General',
    'HVAC Services', 'Painting Services', 'Roofing Contractor', 'Plumbing Services', 
    'Electrical Services', 'Landscaping Services', 'Cleaning Services', 'General Services'
));

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check the users table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check if we have any users and their data
SELECT id, email, name, business_id, role, status, login_count, created_at
FROM users 
LIMIT 5;

-- Check the businesses table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'businesses' 
ORDER BY ordinal_position;
