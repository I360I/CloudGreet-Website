-- Ultra simple permissions fix
-- Run this in Supabase SQL Editor

-- Disable RLS on all tables
ALTER TABLE custom_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents DISABLE ROW LEVEL SECURITY;

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



