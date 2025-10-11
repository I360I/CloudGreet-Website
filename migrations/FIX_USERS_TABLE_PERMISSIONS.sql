-- Fix permissions for users table
-- Run this in Supabase SQL Editor

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to service_role on users table
GRANT ALL ON TABLE users TO service_role;

-- Grant permissions to authenticated users
GRANT ALL ON TABLE users TO authenticated;

-- Grant permissions to anon users
GRANT ALL ON TABLE users TO anon;

-- Verify permissions
SELECT 
    schemaname,
    tablename,
    tableowner,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'users';



