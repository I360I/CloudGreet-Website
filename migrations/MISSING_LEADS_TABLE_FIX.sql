-- MISSING LEADS TABLE FIX FOR SUPABASE
-- Run this in your Supabase SQL editor

-- 1. Create the missing leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    website VARCHAR(255),
    address TEXT,
    business_type VARCHAR(100),
    rating DECIMAL(3,2),
    review_count INTEGER DEFAULT 0,
    estimated_revenue INTEGER,
    ai_score INTEGER,
    ai_priority VARCHAR(20) CHECK (ai_priority IN ('Low', 'Medium', 'High')),
    ai_insights TEXT[],
    ai_recommendations TEXT[],
    ml_score INTEGER,
    ml_probability DECIMAL(5,4),
    ml_factors JSONB,
    ml_confidence DECIMAL(5,4),
    ml_recommendations TEXT[],
    business_id_google VARCHAR(255), -- Google Places business ID
    ai_receptionist_value JSONB,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'closed')),
    source VARCHAR(50) DEFAULT 'google_places' CHECK (source IN ('google_places', 'manual', 'referral', 'website')),
    notes TEXT,
    last_contact_date TIMESTAMP WITH TIME ZONE,
    next_follow_up_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the missing automation tables
CREATE TABLE IF NOT EXISTS follow_up_sequence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('email', 'call', 'sms', 'demo_schedule')),
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    executed_at TIMESTAMP WITH TIME ZONE,
    execution_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('email_sent', 'sms_sent', 'call_made', 'demo_scheduled')),
    details JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    call_type VARCHAR(50) DEFAULT 'cold_call' CHECK (call_type IN ('cold_call', 'follow_up', 'demo', 'closing')),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_answer')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ml_training_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    features JSONB NOT NULL,
    outcome VARCHAR(50) NOT NULL CHECK (outcome IN ('converted', 'not_converted', 'in_progress')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score);
CREATE INDEX IF NOT EXISTS idx_leads_ml_score ON leads(ml_score);
CREATE INDEX IF NOT EXISTS idx_leads_business_id_google ON leads(business_id_google);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE INDEX IF NOT EXISTS idx_follow_up_sequence_lead_id ON follow_up_sequence(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequence_status ON follow_up_sequence(status);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequence_scheduled_date ON follow_up_sequence(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_contact_activities_lead_id ON contact_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_type ON contact_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_contact_activities_timestamp ON contact_activities(timestamp);

CREATE INDEX IF NOT EXISTS idx_scheduled_calls_lead_id ON scheduled_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_status ON scheduled_calls(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_scheduled_date ON scheduled_calls(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_ml_training_data_lead_id ON ml_training_data(lead_id);
CREATE INDEX IF NOT EXISTS idx_ml_training_data_outcome ON ml_training_data(outcome);

-- 4. Add update triggers
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follow_up_sequence_updated_at BEFORE UPDATE ON follow_up_sequence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_calls_updated_at BEFORE UPDATE ON scheduled_calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Disable RLS for new tables
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequence DISABLE ROW LEVEL SECURITY;
ALTER TABLE contact_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_data DISABLE ROW LEVEL SECURITY;

-- 6. Grant permissions
GRANT ALL ON TABLE leads TO service_role;
GRANT ALL ON TABLE follow_up_sequence TO service_role;
GRANT ALL ON TABLE contact_activities TO service_role;
GRANT ALL ON TABLE scheduled_calls TO service_role;
GRANT ALL ON TABLE ml_training_data TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE follow_up_sequence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE contact_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE scheduled_calls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ml_training_data TO authenticated;

-- 7. Verify tables were created
SELECT 'LEADS TABLE VERIFICATION:' as info;
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN '✅ Leads table exists' ELSE '❌ Leads table missing' END as leads_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_up_sequence') THEN '✅ Follow-up sequence table exists' ELSE '❌ Follow-up sequence table missing' END as follow_up_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_activities') THEN '✅ Contact activities table exists' ELSE '❌ Contact activities table missing' END as contact_activities_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_calls') THEN '✅ Scheduled calls table exists' ELSE '❌ Scheduled calls table missing' END as scheduled_calls_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ml_training_data') THEN '✅ ML training data table exists' ELSE '❌ ML training data table missing' END as ml_training_check;

-- 8. Show table structure
SELECT 'LEADS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leads' 
ORDER BY ordinal_position;
