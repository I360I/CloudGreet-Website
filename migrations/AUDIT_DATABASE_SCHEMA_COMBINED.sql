-- =====================================================
-- COMPREHENSIVE DATABASE AUDIT SCRIPT - COMBINED VERSION
-- Run this in Supabase SQL Editor - ALL RESULTS IN ONE QUERY
-- =====================================================

SELECT 
    '1. TABLE CHECK' as section,
    table_name as item,
    CASE 
        WHEN table_name IN (
            'businesses', 'custom_users', 'calls', 'appointments', 
            'leads', 'sms_messages', 'missed_call_recoveries', 
            'sms_opt_outs', 'background_jobs', 'toll_free_numbers',
            'ai_agents', 'calendar_events', 'appointment_reminders'
        ) THEN '✅ REQUIRED'
        ELSE '⚠️ OPTIONAL'
    END as status,
    'Table existence check' as details
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    '2. CALLS TABLE SCHEMA' as section,
    column_name as item,
    CASE 
        WHEN column_name IN ('id', 'business_id', 'call_id', 'from_number', 'to_number', 'status', 'duration', 'created_at', 'updated_at') 
        THEN '✅ REQUIRED'
        ELSE '⚠️ OPTIONAL'
    END as status,
    data_type || 
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END
        as details
FROM information_schema.columns
WHERE table_name = 'calls'
    AND table_schema = 'public'

UNION ALL

SELECT 
    '3. MISSING COLUMNS IN CALLS' as section,
    missing_column as item,
    '❌ MISSING' as status,
    'Required column not found' as details
FROM (
    VALUES 
        ('id'), ('business_id'), ('call_id'), ('from_number'), 
        ('to_number'), ('status'), ('duration'), ('recording_url'), 
        ('transcript'), ('caller_name'), ('created_at'), ('updated_at')
) AS required(missing_column)
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' 
        AND column_name = missing_column
        AND table_schema = 'public'
)

UNION ALL

SELECT 
    '4. BUSINESSES TABLE SCHEMA' as section,
    column_name as item,
    CASE 
        WHEN column_name IN ('id', 'owner_id', 'business_name', 'phone_number', 'created_at', 'updated_at') 
        THEN '✅ REQUIRED'
        ELSE '⚠️ OPTIONAL'
    END as status,
    data_type || 
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END
        as details
FROM information_schema.columns
WHERE table_name = 'businesses'
    AND table_schema = 'public'

UNION ALL

SELECT 
    '5. MISSED_CALL_RECOVERIES SCHEMA' as section,
    column_name as item,
    CASE 
        WHEN column_name IN ('id', 'business_id', 'caller_phone', 'status', 'message_sent', 'created_at', 'updated_at') 
        THEN '✅ REQUIRED'
        ELSE '⚠️ OPTIONAL'
    END as status,
    data_type || 
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END
        as details
FROM information_schema.columns
WHERE table_name = 'missed_call_recoveries'
    AND table_schema = 'public'

UNION ALL

SELECT 
    '6. ORPHANED CALLS' as section,
    COUNT(*)::text as item,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO ORPHANS'
        ELSE '⚠️ HAS ORPHANS'
    END as status,
    'Calls without business_id' as details
FROM calls
WHERE business_id IS NULL

UNION ALL

SELECT 
    '7. CALLS WITH MISSING DATA' as section,
    COUNT(*)::text as item,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL VALID'
        ELSE '⚠️ HAS ISSUES'
    END as status,
    'Calls with NULL from_number, status, or call_id' as details
FROM calls
WHERE from_number IS NULL 
    OR status IS NULL 
    OR call_id IS NULL

UNION ALL

SELECT 
    '8. CALLS TABLE INDEXES' as section,
    indexname as item,
    CASE 
        WHEN indexname LIKE '%business_id%' OR indexname LIKE '%call_id%' 
            OR indexname LIKE '%from_number%' OR indexname LIKE '%status%'
            OR indexname LIKE '%created_at%'
        THEN '✅ IMPORTANT'
        ELSE '⚠️ OPTIONAL'
    END as status,
    indexdef as details
FROM pg_indexes
WHERE tablename = 'calls'
    AND schemaname = 'public'

UNION ALL

SELECT 
    '9. MISSING INDEXES ON CALLS' as section,
    missing_index as item,
    '❌ MISSING' as status,
    'Performance index not found' as details
FROM (
    VALUES 
        ('idx_calls_business_id'),
        ('idx_calls_call_id'),
        ('idx_calls_from_number'),
        ('idx_calls_status'),
        ('idx_calls_created_at')
) AS required(missing_index)
WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'calls' 
        AND indexname = missing_index
        AND schemaname = 'public'
)

UNION ALL

SELECT 
    '10. FOREIGN KEY CONSTRAINTS' as section,
    tc.table_name || '.' || kcu.column_name as item,
    '✅ VALID' as status,
    '→ ' || ccu.table_name || '.' || ccu.column_name as details
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('calls', 'missed_call_recoveries', 'appointments', 'sms_messages')

UNION ALL

SELECT 
    '11. DATA TYPE CHECK' as section,
    table_name || '.' || column_name as item,
    CASE 
        WHEN (table_name = 'calls' AND column_name = 'duration' AND data_type != 'integer') THEN '❌ WRONG TYPE'
        WHEN (table_name = 'calls' AND column_name = 'status' AND data_type NOT IN ('text', 'character varying')) THEN '❌ WRONG TYPE'
        WHEN (table_name = 'calls' AND column_name = 'from_number' AND data_type NOT IN ('text', 'character varying')) THEN '❌ WRONG TYPE'
        ELSE '✅ CORRECT'
    END as status,
    'Current: ' || data_type as details
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('calls', 'missed_call_recoveries', 'businesses')
    AND column_name IN ('duration', 'status', 'from_number', 'caller_phone', 'business_id')

UNION ALL

SELECT 
    '12. RECOVERIES STATUS VALUES' as section,
    COALESCE(status, 'NULL') as item,
    CASE 
        WHEN status IN ('pending', 'sent', 'failed', 'cancelled') OR status IS NULL THEN '✅ VALID'
        ELSE '❌ INVALID'
    END as status,
    COUNT(*)::text || ' records' as details
FROM missed_call_recoveries
GROUP BY status

UNION ALL

SELECT 
    '13. CALLS STATUS VALUES' as section,
    COALESCE(status, 'NULL') as item,
    CASE 
        WHEN status IN ('initiated', 'answered', 'completed', 'missed', 'busy', 'failed') OR status IS NULL THEN '✅ VALID'
        ELSE '⚠️ UNEXPECTED'
    END as status,
    COUNT(*)::text || ' records' as details
FROM calls
GROUP BY status

UNION ALL

SELECT 
    '14. DUPLICATE CALL_IDS' as section,
    COUNT(*)::text as item,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO DUPLICATES'
        ELSE '❌ HAS DUPLICATES'
    END as status,
    'Duplicate call_id values found' as details
FROM (
    SELECT call_id, COUNT(*) as cnt
    FROM calls
    WHERE call_id IS NOT NULL
    GROUP BY call_id
    HAVING COUNT(*) > 1
) duplicates

UNION ALL

SELECT 
    '15. BACKGROUND_JOBS TABLE' as section,
    'background_jobs' as item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'background_jobs' AND table_schema = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status,
    'Optional table for job queue' as details

UNION ALL

SELECT 
    '16. SMS_OPT_OUTS TABLE' as section,
    'sms_opt_outs' as item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'sms_opt_outs' AND table_schema = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status,
    'Required for SMS compliance' as details

UNION ALL

SELECT 
    '17. TABLE ROW COUNTS' as section,
    relname as item,
    CASE 
        WHEN relname IN (
            'businesses', 'custom_users', 'calls', 'appointments', 
            'leads', 'sms_messages', 'missed_call_recoveries', 
            'sms_opt_outs', 'background_jobs'
        ) THEN '✅ TRACKED'
        ELSE '⚠️ UNTRACKED'
    END as status,
    n_live_tup::text || ' rows' as details
FROM pg_stat_user_tables
WHERE schemaname = 'public'

UNION ALL

SELECT 
    '18. NULL BUSINESS_IDS' as section,
    'calls' as item,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO NULLS'
        ELSE '⚠️ HAS NULLS'
    END as status,
    COUNT(*)::text || ' records' as details
FROM calls
WHERE business_id IS NULL

UNION ALL

SELECT 
    '18. NULL BUSINESS_IDS' as section,
    'missed_call_recoveries' as item,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO NULLS'
        ELSE '❌ HAS NULLS'
    END as status,
    COUNT(*)::text || ' records' as details
FROM missed_call_recoveries
WHERE business_id IS NULL

UNION ALL

SELECT 
    '19. CUSTOM_USERS COLUMNS' as section,
    column_name as item,
    CASE 
        WHEN column_name IN ('id', 'email', 'name', 'role', 'created_at') THEN '✅ REQUIRED'
        ELSE '⚠️ OPTIONAL'
    END as status,
    data_type as details
FROM information_schema.columns
WHERE table_name = 'custom_users'
    AND table_schema = 'public'

ORDER BY section, item;


