-- Simple database check to see what's actually in the users table
-- Run this in Supabase SQL Editor to see the current state

-- Check what columns exist in the users table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check the latest users and their data
SELECT 
    id, 
    email, 
    name, 
    first_name, 
    last_name,
    is_active,
    status,
    role,
    business_id,
    created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if is_active column exists and has data
SELECT 
    COUNT(*) as total_users,
    COUNT(is_active) as users_with_is_active,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
FROM users;
