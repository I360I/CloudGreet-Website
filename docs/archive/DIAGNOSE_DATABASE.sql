-- ===========================================
-- COMPREHENSIVE DATABASE DIAGNOSTIC
-- ===========================================
-- This script shows you EVERYTHING in your database
-- Run this first to understand what exists
-- ===========================================

-- 1. ALL TABLES
SELECT 
    'TABLES' as category,
    COUNT(*) as count,
    string_agg(table_name, ', ' ORDER BY table_name) as items
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';

-- 2. ALL RLS POLICIES
SELECT 
    'RLS POLICIES' as category,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. ALL INDEXES
SELECT 
    'INDEXES' as category,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. ALL FOREIGN KEYS
SELECT
    'FOREIGN KEYS' as category,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 5. TABLES WITH ROW COUNTS
SELECT 
    'TABLE ROW COUNTS' as category,
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC, tablename;

-- 6. SPECIFIC POLICIES ON BUSINESSES TABLE
SELECT 
    'BUSINESSES POLICIES' as category,
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has WHERE clause'
        ELSE 'No WHERE clause'
    END as has_qual,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK'
        ELSE 'No WITH CHECK'
    END as has_with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'businesses'
ORDER BY policyname;

-- 7. CHECK FOR SPECIFIC PROBLEMATIC POLICIES
SELECT 
    'PROBLEMATIC POLICIES' as category,
    tablename,
    policyname,
    'This policy already exists' as issue
FROM pg_policies
WHERE schemaname = 'public'
    AND policyname IN (
        'Users can view their own business',
        'Users can update their own business',
        'Users can insert their own business'
    )
ORDER BY tablename, policyname;













