-- =====================================================
-- COMPREHENSIVE DATABASE AUDIT SCRIPT
-- Run this in Supabase SQL Editor to check for inconsistencies
-- =====================================================

-- NOTE: Run each section separately, or use UNION ALL to combine results

-- =====================================================
-- SECTION 1: TABLE EXISTENCE CHECK
-- =====================================================
SELECT 
    '1. TABLE CHECK' as audit_type,
    table_name,
    CASE 
        WHEN table_name IN (
            'businesses', 'custom_users', 'calls', 'appointments', 
            'leads', 'sms_messages', 'missed_call_recoveries', 
            'sms_opt_outs', 'background_jobs', 'toll_free_numbers',
            'ai_agents', 'calendar_events', 'appointment_reminders'
        ) THEN '✅ REQUIRED'
        ELSE '⚠️ OPTIONAL'
    END as status,
    NULL::text as details
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY 
    CASE WHEN table_name IN (
        'businesses', 'custom_users', 'calls', 'appointments', 
        'leads', 'sms_messages', 'missed_call_recoveries', 
        'sms_opt_outs', 'background_jobs', 'toll_free_numbers',
        'ai_agents', 'calendar_events', 'appointment_reminders'
    ) THEN 0 ELSE 1 END,
    table_name;

-- =====================================================
-- SECTION 2: CALLS TABLE SCHEMA
-- =====================================================
SELECT 
    '2. CALLS TABLE SCHEMA' as audit_type,
    column_name as item,
    data_type || 
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END
        as details,
    CASE 
        WHEN column_name IN ('id', 'business_id', 'call_id', 'from_number', 'to_number', 'status', 'duration', 'created_at', 'updated_at') 
        THEN '✅ REQUIRED'
        ELSE '⚠️ OPTIONAL'
    END as status
FROM information_schema.columns
WHERE table_name = 'calls'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- SECTION 3: MISSING REQUIRED COLUMNS IN CALLS TABLE
-- =====================================================
SELECT 
    '3. MISSING COLUMNS IN CALLS' as audit_type,
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
);

-- =====================================================
-- SECTION 4: BUSINESSES TABLE SCHEMA
-- =====================================================
SELECT 
    '4. BUSINESSES TABLE SCHEMA' as audit_type,
    column_name as item,
    data_type || 
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END
        as details,
    CASE 
        WHEN column_name IN ('id', 'owner_id', 'business_name', 'phone_number', 'created_at', 'updated_at') 
        THEN '✅ REQUIRED'
        ELSE '⚠️ OPTIONAL'
    END as status
FROM information_schema.columns
WHERE table_name = 'businesses'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- SECTION 5: MISSED_CALL_RECOVERIES TABLE SCHEMA
-- =====================================================
SELECT 
    '5. MISSED_CALL_RECOVERIES SCHEMA' as audit_type,
    column_name as item,
    data_type || 
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END
        as details,
    CASE 
        WHEN column_name IN ('id', 'business_id', 'caller_phone', 'status', 'message_sent', 'created_at', 'updated_at') 
        THEN '✅ REQUIRED'
        ELSE '⚠️ OPTIONAL'
    END as status
FROM information_schema.columns
WHERE table_name = 'missed_call_recoveries'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- SECTION 6: ORPHANED CALLS (without business_id)
-- =====================================================
SELECT 
    '6. ORPHANED CALLS' as audit_type,
    COUNT(*)::text as item,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO ORPHANS'
        ELSE '⚠️ HAS ORPHANS'
    END as status,
    'Calls without business_id' as details
FROM calls
WHERE business_id IS NULL;

-- =====================================================
-- SECTION 7: CALLS WITH MISSING REQUIRED FIELDS
-- =====================================================
SELECT 
    '7. CALLS WITH MISSING DATA' as audit_type,
    COUNT(*)::text as item,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL VALID'
        ELSE '⚠️ HAS ISSUES'
    END as status,
    'Calls with NULL from_number, status, or call_id' as details
FROM calls
WHERE from_number IS NULL 
    OR status IS NULL 
    OR call_id IS NULL;

-- =====================================================
-- SECTION 8: INDEXES ON CALLS TABLE
-- =====================================================
SELECT 
    '8. CALLS TABLE INDEXES' as audit_type,
    indexname as item,
    indexdef as details,
    CASE 
        WHEN indexname LIKE '%business_id%' OR indexname LIKE '%call_id%' 
            OR indexname LIKE '%from_number%' OR indexname LIKE '%status%'
            OR indexname LIKE '%created_at%'
        THEN '✅ IMPORTANT'
        ELSE '⚠️ OPTIONAL'
    END as status
FROM pg_indexes
WHERE tablename = 'calls'
    AND schemaname = 'public'
ORDER BY indexname;

-- =====================================================
-- SECTION 9: MISSING INDEXES ON CALLS TABLE
-- =====================================================
SELECT 
    '9. MISSING INDEXES ON CALLS' as audit_type,
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
);

-- =====================================================
-- SECTION 10: FOREIGN KEY CONSTRAINTS
-- =====================================================
SELECT 
    '10. FOREIGN KEY CONSTRAINTS' as audit_type,
    tc.table_name || '.' || kcu.column_name as item,
    '→ ' || ccu.table_name || '.' || ccu.column_name as details,
    '✅ VALID' as status
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
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- SECTION 11: DATA TYPE CHECK
-- =====================================================
SELECT 
    '11. DATA TYPE CHECK' as audit_type,
    table_name || '.' || column_name as item,
    'Current: ' || data_type as details,
    CASE 
        WHEN (table_name = 'calls' AND column_name = 'duration' AND data_type != 'integer') THEN '❌ WRONG TYPE'
        WHEN (table_name = 'calls' AND column_name = 'status' AND data_type NOT IN ('text', 'character varying')) THEN '❌ WRONG TYPE'
        WHEN (table_name = 'calls' AND column_name = 'from_number' AND data_type NOT IN ('text', 'character varying')) THEN '❌ WRONG TYPE'
        ELSE '✅ CORRECT'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('calls', 'missed_call_recoveries', 'businesses')
    AND column_name IN ('duration', 'status', 'from_number', 'caller_phone', 'business_id')
ORDER BY table_name, column_name;

-- =====================================================
-- SECTION 12: MISSED_CALL_RECOVERIES STATUS VALUES
-- =====================================================
SELECT 
    '12. RECOVERIES STATUS VALUES' as audit_type,
    COALESCE(status, 'NULL') as item,
    COUNT(*)::text || ' records' as details,
    CASE 
        WHEN status IN ('pending', 'sent', 'failed', 'cancelled') OR status IS NULL THEN '✅ VALID'
        ELSE '❌ INVALID'
    END as status
FROM missed_call_recoveries
GROUP BY status
ORDER BY count DESC;

-- =====================================================
-- SECTION 13: CALLS STATUS VALUES
-- =====================================================
SELECT 
    '13. CALLS STATUS VALUES' as audit_type,
    COALESCE(status, 'NULL') as item,
    COUNT(*)::text || ' records' as details,
    CASE 
        WHEN status IN ('initiated', 'answered', 'completed', 'missed', 'busy', 'failed') OR status IS NULL THEN '✅ VALID'
        ELSE '⚠️ UNEXPECTED'
    END as status
FROM calls
GROUP BY status
ORDER BY count DESC;

-- =====================================================
-- SECTION 14: DUPLICATE CALL_IDS
-- =====================================================
SELECT 
    '14. DUPLICATE CALL_IDS' as audit_type,
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
) duplicates;

-- =====================================================
-- SECTION 15: BACKGROUND_JOBS TABLE
-- =====================================================
SELECT 
    '15. BACKGROUND_JOBS TABLE' as audit_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'background_jobs' AND table_schema = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status,
    'N/A' as item,
    'Optional table for job queue' as details;

-- =====================================================
-- SECTION 16: SMS_OPT_OUTS TABLE
-- =====================================================
SELECT 
    '16. SMS_OPT_OUTS TABLE' as audit_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'sms_opt_outs' AND table_schema = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status,
    'N/A' as item,
    'Required for SMS compliance' as details;

-- =====================================================
-- SECTION 17: TABLE ROW COUNTS
-- =====================================================
SELECT 
    '17. TABLE ROW COUNTS' as audit_type,
    relname as item,
    n_live_tup::text || ' rows' as details,
    CASE 
        WHEN relname IN (
            'businesses', 'custom_users', 'calls', 'appointments', 
            'leads', 'sms_messages', 'missed_call_recoveries', 
            'sms_opt_outs', 'background_jobs'
        ) THEN '✅ TRACKED'
        ELSE '⚠️ UNTRACKED'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY 
    CASE WHEN relname IN (
        'businesses', 'custom_users', 'calls', 'appointments', 
        'leads', 'sms_messages', 'missed_call_recoveries', 
        'sms_opt_outs', 'background_jobs'
    ) THEN 0 ELSE 1 END,
    n_live_tup DESC;

-- =====================================================
-- SECTION 18: NULL BUSINESS_IDS
-- =====================================================
SELECT 
    '18. NULL BUSINESS_IDS' as audit_type,
    'calls' as item,
    COUNT(*)::text || ' records' as details,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO NULLS'
        ELSE '⚠️ HAS NULLS'
    END as status
FROM calls
WHERE business_id IS NULL
UNION ALL
SELECT 
    '18. NULL BUSINESS_IDS' as audit_type,
    'missed_call_recoveries' as item,
    COUNT(*)::text || ' records' as details,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO NULLS'
        ELSE '❌ HAS NULLS'
    END as status
FROM missed_call_recoveries
WHERE business_id IS NULL;

-- =====================================================
-- SECTION 19: CUSTOM_USERS COLUMNS
-- =====================================================
SELECT 
    '19. CUSTOM_USERS COLUMNS' as audit_type,
    column_name as item,
    data_type as details,
    CASE 
        WHEN column_name IN ('id', 'email', 'name', 'role', 'created_at') THEN '✅ REQUIRED'
        ELSE '⚠️ OPTIONAL'
    END as status
FROM information_schema.columns
WHERE table_name = 'custom_users'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- SECTION 20: FINAL SUMMARY
-- =====================================================
SELECT 
    '=== FINAL SUMMARY ===' as audit_type,
    'Review all sections above' as item,
    'Look for ❌ or ⚠️ indicators' as details,
    '✅ COMPLETE' as status;
