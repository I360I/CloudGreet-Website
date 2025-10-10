-- Fix permissions for all tables
-- Run this in Supabase SQL Editor

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to service_role on all tables
GRANT ALL ON TABLE users TO service_role;
GRANT ALL ON TABLE businesses TO service_role;
GRANT ALL ON TABLE ai_agents TO service_role;

-- Grant permissions to authenticated users
GRANT ALL ON TABLE users TO authenticated;
GRANT ALL ON TABLE businesses TO authenticated;
GRANT ALL ON TABLE ai_agents TO authenticated;

-- Grant permissions to anon users
GRANT ALL ON TABLE users TO anon;
GRANT ALL ON TABLE businesses TO anon;
GRANT ALL ON TABLE ai_agents TO anon;

-- Verify permissions
SELECT 
    schemaname,
    tablename,
    tableowner,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('users', 'businesses', 'ai_agents');



