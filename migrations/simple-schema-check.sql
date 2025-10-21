-- Simple Database Schema Check (No Timeout)
-- Run these queries one by one

-- 1. Check what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check calls table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'calls' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check businesses table structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'businesses' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if toll_free_numbers table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'toll_free_numbers';

-- 5. Check if ai_agents table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'ai_agents';

-- 6. Check toll_free_numbers structure (if it exists)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'toll_free_numbers' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Check ai_agents structure (if it exists)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ai_agents' AND table_schema = 'public'
ORDER BY ordinal_position;
