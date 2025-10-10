-- Comprehensive schema fix for CloudGreet database
-- Run this in Supabase SQL Editor

-- First, let's check what columns exist in the users table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check what columns exist in the ai_agents table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'ai_agents' 
ORDER BY ordinal_position;

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing columns to ai_agents table
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);

-- Update any existing records to have default values
UPDATE users SET is_admin = FALSE WHERE is_admin IS NULL;
UPDATE users SET created_at = NOW() WHERE created_at IS NULL;
UPDATE users SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE ai_agents SET business_name = 'Default Business' WHERE business_name IS NULL;

-- Verify the changes
SELECT 'USERS TABLE' as table_name, column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT 'AI_AGENTS TABLE' as table_name, column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'ai_agents' 
ORDER BY ordinal_position;



