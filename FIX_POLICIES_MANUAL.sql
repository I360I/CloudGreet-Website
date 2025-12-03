-- ===========================================
-- MANUAL POLICY FIX - Run This First
-- ===========================================
-- This script drops existing policies that conflict
-- Run this BEFORE running the full migration
-- ===========================================

-- Drop the problematic policy if it exists
DROP POLICY IF EXISTS "Users can view their own business" ON businesses;

-- Check what other policies exist on businesses table
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'businesses';

-- If you want to drop ALL policies on businesses (be careful!)
-- Uncomment the line below:
-- DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'businesses') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON businesses'; END LOOP; END $$;












