-- Fix missing columns in database schema
-- Run this in Supabase SQL Editor

-- Add missing is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add missing business_name column to ai_agents table
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);

-- Update any existing records to have default values
UPDATE users SET is_admin = FALSE WHERE is_admin IS NULL;
UPDATE ai_agents SET business_name = 'Default Business' WHERE business_name IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('is_admin', 'is_active');

SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'ai_agents' AND column_name = 'business_name';

