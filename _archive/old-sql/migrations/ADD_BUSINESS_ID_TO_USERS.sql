-- Add business_id column to users table if it doesn't exist
-- Run this in Supabase SQL Editor

-- Check if business_id column exists in users table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'business_id';

-- Add business_id column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'business_id';

-- Show current users table structure
SELECT 'USERS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
