-- AUTOMATION TABLES UPDATE FOR SUPABASE
-- Run this in your Supabase SQL editor

-- 1. Follow-up sequence table
CREATE TABLE IF NOT EXISTS follow_up_sequence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
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

-- 2. Contact activities table
CREATE TABLE IF NOT EXISTS contact_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('email_sent', 'sms_sent', 'call_made', 'demo_scheduled')),
    details JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Scheduled calls table
CREATE TABLE IF NOT EXISTS scheduled_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
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

-- 4. ML training data table
CREATE TABLE IF NOT EXISTS ml_training_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
    features JSONB NOT NULL,
    outcome VARCHAR(50) NOT NULL CHECK (outcome IN ('converted', 'not_converted', 'in_progress')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Add missing columns to existing leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS ai_score INTEGER,
ADD COLUMN IF NOT EXISTS ai_priority VARCHAR(20) CHECK (ai_priority IN ('Low', 'Medium', 'High')),
ADD COLUMN IF NOT EXISTS ai_insights TEXT[],
ADD COLUMN IF NOT EXISTS ai_recommendations TEXT[],
ADD COLUMN IF NOT EXISTS ml_score INTEGER,
ADD COLUMN IF NOT EXISTS ml_probability DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS ml_factors JSONB,
ADD COLUMN IF NOT EXISTS ml_confidence DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS ml_recommendations TEXT[],
ADD COLUMN IF NOT EXISTS business_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS estimated_revenue INTEGER,
ADD COLUMN IF NOT EXISTS ai_receptionist_value JSONB;

-- 6. Create indexes for performance
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

CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score);
CREATE INDEX IF NOT EXISTS idx_leads_ml_score ON leads(ml_score);
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON leads(business_id);

-- 7. Disable RLS for new tables (same as existing tables)
ALTER TABLE follow_up_sequence DISABLE ROW LEVEL SECURITY;
ALTER TABLE contact_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_data DISABLE ROW LEVEL SECURITY;

-- 8. Verify tables were created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('follow_up_sequence', 'contact_activities', 'scheduled_calls', 'ml_training_data')
ORDER BY table_name, ordinal_position;
