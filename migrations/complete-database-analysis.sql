-- COMPLETE DATABASE ANALYSIS
-- This will show me EVERYTHING about your Supabase database

-- 1. ALL TABLES
SELECT 'TABLES' as info_type, table_name, 'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. ALL COLUMNS IN ALL TABLES
SELECT 'COLUMNS' as info_type, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. ALL CONSTRAINTS
SELECT 'CONSTRAINTS' as info_type, table_name, constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public'
ORDER BY table_name, constraint_type;

-- 4. ALL INDEXES
SELECT 'INDEXES' as info_type, tablename, indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 5. ROW COUNTS
SELECT 'ROW_COUNTS' as info_type, tablename, n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;
