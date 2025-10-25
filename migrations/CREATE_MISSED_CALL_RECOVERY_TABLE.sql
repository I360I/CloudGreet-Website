-- =====================================================
-- MISSED CALL RECOVERY TABLE
-- =====================================================

-- Create missed call recoveries table
CREATE TABLE IF NOT EXISTS missed_call_recoveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    call_id VARCHAR(255),
    caller_phone VARCHAR(20) NOT NULL,
    caller_name VARCHAR(255),
    reason VARCHAR(50),
    message_sent TEXT NOT NULL,
    sms_api_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_business_id ON missed_call_recoveries(business_id);
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_caller_phone ON missed_call_recoveries(caller_phone);
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_created_at ON missed_call_recoveries(created_at);

-- Create SMS opt-outs table
CREATE TABLE IF NOT EXISTS sms_opt_outs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    opt_out_reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, phone_number)
);

-- Create index for faster opt-out checks
CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_business_phone ON sms_opt_outs(business_id, phone_number);

-- Add RLS policies
ALTER TABLE missed_call_recoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_opt_outs ENABLE ROW LEVEL SECURITY;

-- RLS policy for missed_call_recoveries
CREATE POLICY "Businesses can view their own missed call recoveries" ON missed_call_recoveries
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "System can insert missed call recoveries" ON missed_call_recoveries
    FOR INSERT WITH CHECK (true);

-- RLS policy for sms_opt_outs
CREATE POLICY "Businesses can view their own opt-outs" ON sms_opt_outs
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "System can manage opt-outs" ON sms_opt_outs
    FOR ALL USING (true);
