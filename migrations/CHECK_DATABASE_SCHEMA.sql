-- CHECK DATABASE SCHEMA
-- Run this in your Supabase SQL Editor to see the actual table structure

-- Check all tables and their columns
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;

-- Check specific tables that are causing issues
SELECT 'businesses' as table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses'
UNION ALL
SELECT 'users' as table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users'
UNION ALL
SELECT 'ai_agents' as table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_agents'
UNION ALL
SELECT 'appointments' as table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments'
ORDER BY table_name, column_name;
