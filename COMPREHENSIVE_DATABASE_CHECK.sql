-- COMPREHENSIVE DATABASE CHECK
-- Run this in Supabase SQL Editor to see exactly what's missing

-- Check users table structure
SELECT 'USERS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check businesses table structure  
SELECT 'BUSINESSES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'businesses' 
ORDER BY ordinal_position;

-- Check if ai_agents table exists
SELECT 'AI_AGENTS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ai_agents' 
ORDER BY ordinal_position;

-- Check if audit_logs table exists
SELECT 'AUDIT_LOGS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
ORDER BY ordinal_position;

-- List all tables in the database
SELECT 'ALL TABLES IN DATABASE:' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check if we have any users
SELECT 'SAMPLE USER DATA:' as info;
SELECT id, email, first_name, last_name, is_active, created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 3;

-- Check if we have any businesses
SELECT 'SAMPLE BUSINESS DATA:' as info;
SELECT id, business_name, business_type, email, phone_number, created_at
FROM businesses 
ORDER BY created_at DESC 
LIMIT 3;

-- Check foreign key relationships
SELECT 'FOREIGN KEY CONSTRAINTS:' as info;
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema='public'
ORDER BY tc.table_name, kcu.column_name;
