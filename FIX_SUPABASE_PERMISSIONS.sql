-- FIX SUPABASE PERMISSIONS
-- Run this in your Supabase SQL Editor to fix the permission errors

-- First, let's check what tables exist and their current permissions
-- (This is just for reference, you don't need to run this)

-- Fix permissions for existing tables
-- Enable RLS on all tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create service role policies that bypass RLS for admin operations
-- This allows the service role to access all data for admin dashboard

-- Businesses table policies
DROP POLICY IF EXISTS "Service role can manage all businesses" ON public.businesses;
CREATE POLICY "Service role can manage all businesses" ON public.businesses
FOR ALL USING (true) WITH CHECK (true);

-- Users table policies  
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
CREATE POLICY "Service role can manage all users" ON public.users
FOR ALL USING (true) WITH CHECK (true);

-- Call logs table policies
DROP POLICY IF EXISTS "Service role can manage all call_logs" ON public.call_logs;
CREATE POLICY "Service role can manage all call_logs" ON public.call_logs
FOR ALL USING (true) WITH CHECK (true);

-- Appointments table policies
DROP POLICY IF EXISTS "Service role can manage all appointments" ON public.appointments;
CREATE POLICY "Service role can manage all appointments" ON public.appointments
FOR ALL USING (true) WITH CHECK (true);

-- SMS logs table policies
DROP POLICY IF EXISTS "Service role can manage all sms_logs" ON public.sms_logs;
CREATE POLICY "Service role can manage all sms_logs" ON public.sms_logs
FOR ALL USING (true) WITH CHECK (true);

-- AI agents table policies
DROP POLICY IF EXISTS "Service role can manage all ai_agents" ON public.ai_agents;
CREATE POLICY "Service role can manage all ai_agents" ON public.ai_agents
FOR ALL USING (true) WITH CHECK (true);

-- Audit logs table policies
DROP POLICY IF EXISTS "Service role can manage all audit_logs" ON public.audit_logs;
CREATE POLICY "Service role can manage all audit_logs" ON public.audit_logs
FOR ALL USING (true) WITH CHECK (true);

-- Grant necessary permissions to service role
GRANT ALL ON public.businesses TO service_role;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.call_logs TO service_role;
GRANT ALL ON public.appointments TO service_role;
GRANT ALL ON public.sms_logs TO service_role;
GRANT ALL ON public.ai_agents TO service_role;
GRANT ALL ON public.audit_logs TO service_role;

-- Grant sequence permissions (for auto-incrementing IDs)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO service_role;

-- Create a function to check if user is service role
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN current_setting('role') = 'service_role';
END;
$$;

-- Alternative: Create policies that allow service role access
-- This is a more secure approach than the blanket policies above

-- Drop the blanket policies and create more specific ones
DROP POLICY IF EXISTS "Service role can manage all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
DROP POLICY IF EXISTS "Service role can manage all call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "Service role can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Service role can manage all sms_logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Service role can manage all ai_agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Service role can manage all audit_logs" ON public.audit_logs;

-- Create more specific service role policies
CREATE POLICY "Service role full access to businesses" ON public.businesses
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to users" ON public.users
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to call_logs" ON public.call_logs
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to appointments" ON public.appointments
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to sms_logs" ON public.sms_logs
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to ai_agents" ON public.ai_agents
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to audit_logs" ON public.audit_logs
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Also create policies for authenticated users (for regular app usage)
-- These policies allow users to access their own data

-- Businesses: Users can access their own business
CREATE POLICY "Users can access their own business" ON public.businesses
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = businesses.owner_id 
    AND users.id = auth.uid()
  )
);

-- Users: Users can access their own profile
CREATE POLICY "Users can access their own profile" ON public.users
FOR ALL TO authenticated USING (id = auth.uid());

-- Call logs: Users can access their business's call logs
CREATE POLICY "Users can access their business call logs" ON public.call_logs
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE businesses.id = call_logs.business_id 
    AND businesses.owner_id = auth.uid()
  )
);

-- Appointments: Users can access their business's appointments
CREATE POLICY "Users can access their business appointments" ON public.appointments
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE businesses.id = appointments.business_id 
    AND businesses.owner_id = auth.uid()
  )
);

-- SMS logs: Users can access their business's SMS logs
CREATE POLICY "Users can access their business sms logs" ON public.sms_logs
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE businesses.id = sms_logs.business_id 
    AND businesses.owner_id = auth.uid()
  )
);

-- AI agents: Users can access their business's AI agents
CREATE POLICY "Users can access their business ai agents" ON public.ai_agents
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE businesses.id = ai_agents.business_id 
    AND businesses.owner_id = auth.uid()
  )
);

-- Audit logs: Users can access their business's audit logs
CREATE POLICY "Users can access their business audit logs" ON public.audit_logs
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE businesses.id = audit_logs.business_id 
    AND businesses.owner_id = auth.uid()
  )
);

-- Grant necessary permissions to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;

-- Grant sequence permissions to authenticated role
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Final verification query (optional - run this to check if everything is working)
-- SELECT 
--   schemaname,
--   tablename,
--   rowsecurity,
--   hasrls
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('businesses', 'users', 'call_logs', 'appointments', 'sms_logs', 'ai_agents', 'audit_logs');

COMMIT;
