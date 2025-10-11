-- =====================================================
-- COMPREHENSIVE USERS TABLE SCHEMA FIX
-- This ensures the users table has the correct columns
-- =====================================================

-- First, let's see what columns currently exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Add the is_active column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add other missing columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'owner' CHECK (role IN ('user', 'admin', 'owner'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Update existing users to have proper values
UPDATE users 
SET name = COALESCE(name, CONCAT(first_name, ' ', last_name), first_name, 'User')
WHERE name IS NULL;

UPDATE users 
SET is_active = COALESCE(is_active, true)
WHERE is_active IS NULL;

UPDATE users 
SET role = COALESCE(role, 'owner')
WHERE role IS NULL;

UPDATE users 
SET status = COALESCE(status, 'active')
WHERE status IS NULL;

UPDATE users 
SET login_count = COALESCE(login_count, 0)
WHERE login_count IS NULL;

-- Make sure the columns are NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users ALTER COLUMN status SET NOT NULL;
ALTER TABLE users ALTER COLUMN login_count SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (
        auth.uid() = id OR 
        (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()) AND role != 'admin')
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (
        auth.uid() = id OR 
        (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()) AND role != 'admin')
    );

-- Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON businesses TO authenticated;

-- Verify the final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Show a sample user to verify the data
SELECT id, email, name, is_active, role, status, business_id, created_at
FROM users 
LIMIT 3;
