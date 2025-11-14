-- ===========================================
-- SAFE POLICY CREATION SCRIPT
-- ===========================================
-- This script creates policies only if they don't exist
-- PostgreSQL doesn't support CREATE POLICY IF NOT EXISTS
-- ===========================================

-- Function to safely create a policy
CREATE OR REPLACE FUNCTION create_policy_if_not_exists(
    p_table_name TEXT,
    p_policy_name TEXT,
    p_policy_sql TEXT
) RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = p_table_name 
        AND policyname = p_policy_name
    ) THEN
        EXECUTE p_policy_sql;
        RAISE NOTICE 'Created policy: % on table %', p_policy_name, p_table_name;
    ELSE
        RAISE NOTICE 'Policy already exists: % on table %', p_policy_name, p_table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Now use the function to create policies safely
-- Example for businesses table:
SELECT create_policy_if_not_exists(
    'businesses',
    'Users can view their own business',
    'CREATE POLICY "Users can view their own business" ON businesses FOR ALL USING (auth.uid() = owner_id)'
);

-- Drop the helper function after use (optional)
-- DROP FUNCTION IF EXISTS create_policy_if_not_exists(TEXT, TEXT, TEXT);











