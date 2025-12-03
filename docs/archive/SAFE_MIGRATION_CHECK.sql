-- ===========================================
-- SAFE MIGRATION CHECK - Run this FIRST
-- ===========================================
-- This script checks what tables already exist
-- before running the full schema migration
-- ===========================================

-- Check which tables already exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'businesses', 'users', 'calls', 'appointments', 
            'ai_agents', 'sms_messages', 'leads', 'conversation_history'
        ) THEN 'CRITICAL'
        WHEN table_name IN (
            'stripe_subscriptions', 'notifications', 'webhook_events',
            'consents', 'health_checks'
        ) THEN 'IMPORTANT'
        ELSE 'OPTIONAL'
    END as importance
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY 
    CASE 
        WHEN table_name IN (
            'businesses', 'users', 'calls', 'appointments', 
            'ai_agents', 'sms_messages', 'leads', 'conversation_history'
        ) THEN 1
        WHEN table_name IN (
            'stripe_subscriptions', 'notifications', 'webhook_events',
            'consents', 'health_checks'
        ) THEN 2
        ELSE 3
    END,
    table_name;

-- Count total tables
SELECT COUNT(*) as existing_table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';

-- Check for existing data
SELECT 
    'businesses' as table_name,
    COUNT(*) as row_count
FROM businesses
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'calls', COUNT(*) FROM calls
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'ai_agents', COUNT(*) FROM ai_agents
UNION ALL
SELECT 'sms_messages', COUNT(*) FROM sms_messages;

