-- Fix permissions for custom_users table
-- Run this in Supabase SQL Editor

-- Grant all permissions to the service role on custom_users table
GRANT ALL ON TABLE custom_users TO service_role;

-- Grant permissions to authenticated users (for RLS)
GRANT ALL ON TABLE custom_users TO authenticated;

-- Grant permissions to anon users (for RLS)
GRANT ALL ON TABLE custom_users TO anon;

-- Enable Row Level Security (RLS) on custom_users table
ALTER TABLE custom_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for service role to access all rows
CREATE POLICY "Service role can access all custom_users" ON custom_users
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Create RLS policy for authenticated users to access their own data
CREATE POLICY "Users can access their own data" ON custom_users
FOR ALL TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Create RLS policy for anon users to insert new users (for registration)
CREATE POLICY "Anon users can insert new users" ON custom_users
FOR INSERT TO anon
WITH CHECK (true);

-- Verify permissions
SELECT 
    schemaname,
    tablename,
    usename,
    privilege_type
FROM pg_tables_priv 
WHERE tablename = 'custom_users';

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'custom_users';



