-- Test if we can access the original users table
-- Run this in Supabase SQL Editor

-- Check if users table exists and what permissions it has
SELECT 
    schemaname,
    tablename,
    tableowner,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'users';

-- Try to select from users table to test permissions
SELECT COUNT(*) as user_count FROM users LIMIT 1;

-- Check what columns exist in users table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;



