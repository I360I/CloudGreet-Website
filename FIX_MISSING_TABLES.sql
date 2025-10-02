-- Fix Missing Tables and Permissions
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

-- 3. Fix permissions for all revenue optimization tables
-- Grant full access to service_role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant access to authenticated users
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 4. Disable RLS temporarily to fix permission issues
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
        RAISE NOTICE 'Disabled RLS for table: %', table_name;
    END LOOP;
END $$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);
CREATE INDEX IF NOT EXISTS idx_calls_customer_phone ON calls(customer_phone);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_messages_business_id ON sms_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at);

-- 6. Insert default revenue optimization settings for existing businesses
INSERT INTO revenue_optimization_settings (business_id, lead_scoring_enabled, upsell_enabled, dynamic_pricing_enabled)
SELECT id, true, true, true FROM businesses
ON CONFLICT (business_id) DO NOTHING;

-- 7. Verify tables exist
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
