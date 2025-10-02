-- Fix Only Missing Tables (Skip Existing Policies)
-- Run this in Supabase SQL Editor

-- 1. Create missing calls table
CREATE TABLE IF NOT EXISTS calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_phone VARCHAR(20) NOT NULL,
    agent_id VARCHAR(100),
    call_duration INTEGER DEFAULT 0,
    call_status VARCHAR(20) DEFAULT 'completed',
    service_requested VARCHAR(100),
    urgency VARCHAR(10) CHECK (urgency IN ('high', 'medium', 'low')),
    estimated_value DECIMAL(10,2) DEFAULT 0,
    conversion_outcome VARCHAR(50),
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    transcript TEXT,
    recording_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create missing sms_messages table  
CREATE TABLE IF NOT EXISTS sms_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'sent',
    direction VARCHAR(10) DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Fix permissions for missing tables only
GRANT ALL PRIVILEGES ON calls TO service_role;
GRANT ALL PRIVILEGES ON sms_messages TO service_role;
GRANT ALL PRIVILEGES ON calls TO authenticated;
GRANT ALL PRIVILEGES ON sms_messages TO authenticated;

-- 4. Disable RLS for missing tables only
ALTER TABLE calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages DISABLE ROW LEVEL SECURITY;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);
CREATE INDEX IF NOT EXISTS idx_calls_customer_phone ON calls(customer_phone);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_messages_business_id ON sms_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at);

-- 6. Verify tables exist
DO $$
DECLARE
    table_name text;
    table_count integer := 0;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        table_count := table_count + 1;
        RAISE NOTICE 'Table %: %', table_count, table_name;
    END LOOP;
    RAISE NOTICE 'Total tables: %', table_count;
END $$;
