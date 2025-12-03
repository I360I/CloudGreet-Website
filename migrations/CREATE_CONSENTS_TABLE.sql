-- Create consents table for SMS opt-in/opt-out tracking
-- This table tracks TCPA/A2P compliance actions (STOP, UNSTOP, HELP)

CREATE TABLE IF NOT EXISTS consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('STOP', 'UNSTOP', 'HELP')),
    channel TEXT DEFAULT 'sms',
    business_id UUID REFERENCES businesses(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_consents_phone ON consents(phone);
CREATE INDEX IF NOT EXISTS idx_consents_business_id ON consents(business_id);
CREATE INDEX IF NOT EXISTS idx_consents_action ON consents(action);

-- Grant permissions
GRANT ALL PRIVILEGES ON consents TO service_role;
GRANT ALL PRIVILEGES ON consents TO authenticated;














