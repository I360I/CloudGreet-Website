
-- Comprehensive Database Schema Analysis
-- This will give us complete details about all tables, columns, constraints, and relationships

-- 1. Get all tables and their basic info
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Get all columns with detailed information
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    c.ordinal_position,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY'
        WHEN fk.column_name IS NOT NULL THEN 'FOREIGN KEY'
        WHEN uq.column_name IS NOT NULL THEN 'UNIQUE'
        ELSE 'REGULAR'
    END as constraint_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON t.table_name = pk.table_name AND c.column_name = pk.column_name
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
) fk ON t.table_name = fk.table_name AND c.column_name = fk.column_name
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'UNIQUE'
) uq ON t.table_name = uq.table_name AND c.column_name = uq.column_name
WHERE t.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

-- 3. Get all constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

-- 4. Get all indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 5. Get table row counts
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 6. Check for any missing or problematic columns
SELECT 
    'MISSING_COLUMNS' as issue_type,
    'calls' as table_name,
    'ai_response' as column_name,
    'TEXT' as expected_type
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'ai_response'
)
UNION ALL
SELECT 
    'MISSING_COLUMNS' as issue_type,
    'calls' as table_name,
    'ai_session_id' as column_name,
    'TEXT' as expected_type
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'ai_session_id'
)
UNION ALL
SELECT 
    'MISSING_COLUMNS' as issue_type,
    'businesses' as table_name,
    'owner_name' as column_name,
    'VARCHAR(255)' as expected_type
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'owner_name'
)
UNION ALL
SELECT 
    'MISSING_TABLES' as issue_type,
    'toll_free_numbers' as table_name,
    'ENTIRE_TABLE' as column_name,
    'TABLE' as expected_type
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'toll_free_numbers'
)
UNION ALL
SELECT 
    'MISSING_TABLES' as issue_type,
    'ai_agents' as table_name,
    'ENTIRE_TABLE' as column_name,
    'TABLE' as expected_type
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'ai_agents'
);

-- 7. Check for data type mismatches
SELECT 
    'DATA_TYPE_MISMATCH' as issue_type,
    table_name,
    column_name,
    data_type as current_type,
    'Expected different type' as issue_description
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    (table_name = 'calls' AND column_name = 'business_id' AND data_type != 'uuid') OR
    (table_name = 'calls' AND column_name = 'call_id' AND data_type != 'character varying') OR
    (table_name = 'businesses' AND column_name = 'business_hours' AND data_type != 'jsonb')
);

-- 8. Check for missing foreign key relationships
SELECT 
    'MISSING_FK' as issue_type,
    'calls.business_id' as relationship,
    'Should reference businesses.id' as expected_relationship
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'calls' 
    AND kcu.column_name = 'business_id'
    AND tc.constraint_type = 'FOREIGN KEY'
);
