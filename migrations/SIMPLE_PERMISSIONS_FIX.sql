-- Simple permissions fix for custom_users table
-- Run this in Supabase SQL Editor

-- Drop RLS on custom_users table temporarily
ALTER TABLE custom_users DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Service role can access all custom_users" ON custom_users;
DROP POLICY IF EXISTS "Users can access their own data" ON custom_users;
DROP POLICY IF EXISTS "Anon users can insert new users" ON custom_users;

-- Grant all permissions to service_role
GRANT ALL ON TABLE custom_users TO service_role;
GRANT ALL ON TABLE businesses TO service_role;
GRANT ALL ON TABLE ai_agents TO service_role;

-- Grant permissions to authenticated users
GRANT ALL ON TABLE custom_users TO authenticated;
GRANT ALL ON TABLE businesses TO authenticated;
GRANT ALL ON TABLE ai_agents TO authenticated;

-- Grant permissions to anon users
GRANT ALL ON TABLE custom_users TO anon;
GRANT ALL ON TABLE businesses TO anon;
GRANT ALL ON TABLE ai_agents TO anon;

-- Verify permissions (using correct system tables)
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('custom_users', 'businesses', 'ai_agents');

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('custom_users', 'businesses', 'ai_agents');