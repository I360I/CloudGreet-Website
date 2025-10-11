-- Fix Permissions for Revenue Optimization Tables
-- Run this in Supabase SQL Editor

-- Grant full access to service_role for all revenue tables
GRANT ALL PRIVILEGES ON lead_scoring TO service_role;
GRANT ALL PRIVILEGES ON upsell_opportunities TO service_role;
GRANT ALL PRIVILEGES ON pricing_optimization_log TO service_role;
GRANT ALL PRIVILEGES ON competitor_analysis TO service_role;
GRANT ALL PRIVILEGES ON retention_analysis TO service_role;
GRANT ALL PRIVILEGES ON revenue_forecasts TO service_role;
GRANT ALL PRIVILEGES ON ai_conversation_analytics TO service_role;
GRANT ALL PRIVILEGES ON revenue_optimization_settings TO service_role;

-- Grant access to authenticated users
GRANT ALL PRIVILEGES ON lead_scoring TO authenticated;
GRANT ALL PRIVILEGES ON upsell_opportunities TO authenticated;
GRANT ALL PRIVILEGES ON pricing_optimization_log TO authenticated;
GRANT ALL PRIVILEGES ON competitor_analysis TO authenticated;
GRANT ALL PRIVILEGES ON retention_analysis TO authenticated;
GRANT ALL PRIVILEGES ON revenue_forecasts TO authenticated;
GRANT ALL PRIVILEGES ON ai_conversation_analytics TO authenticated;
GRANT ALL PRIVILEGES ON revenue_optimization_settings TO authenticated;

-- Disable RLS for revenue tables
ALTER TABLE lead_scoring DISABLE ROW LEVEL SECURITY;
ALTER TABLE upsell_opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_optimization_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_analysis DISABLE ROW LEVEL SECURITY;
ALTER TABLE retention_analysis DISABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_optimization_settings DISABLE ROW LEVEL SECURITY;

-- Verify all tables are accessible
DO $$
DECLARE
    table_name text;
    table_count integer := 0;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        table_count := table_count + 1;
        RAISE NOTICE 'Table %: %', table_count, table_name;
    END LOOP;
    RAISE NOTICE 'Total tables: %', table_count;
END $$;
