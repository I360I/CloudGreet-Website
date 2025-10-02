-- COMPLETE DATABASE FIX
-- This addresses all potential schema mismatches

-- 1. Fix businesses table (remove owner_name if it still exists)
ALTER TABLE businesses DROP COLUMN IF EXISTS owner_name;

-- 2. Ensure users table has all required columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Update existing users to have proper values
UPDATE users 
SET 
  first_name = COALESCE(first_name, 'User'),
  last_name = COALESCE(last_name, 'Name'),
  name = COALESCE(name, CONCAT(first_name, ' ', last_name)),
  is_active = COALESCE(is_active, true)
WHERE first_name IS NULL OR last_name IS NULL OR name IS NULL OR is_active IS NULL;

-- 4. Make columns NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
ALTER TABLE users ALTER COLUMN is_active SET NOT NULL;

-- 5. Ensure businesses table has all required columns
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Unknown';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS state VARCHAR(50) DEFAULT 'Unknown';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10) DEFAULT '00000';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS services TEXT[];
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS service_areas TEXT[];
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_hours JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS greeting_message TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tone VARCHAR(20) DEFAULT 'professional';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'new_account';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive';

-- 6. Update existing businesses with default values
UPDATE businesses 
SET 
  city = COALESCE(city, 'Unknown'),
  state = COALESCE(state, 'Unknown'),
  zip_code = COALESCE(zip_code, '00000'),
  services = COALESCE(services, ARRAY['General Services']),
  service_areas = COALESCE(service_areas, ARRAY['Local Area']),
  business_hours = COALESCE(business_hours, '{"monday": {"open": "08:00", "close": "17:00"}, "tuesday": {"open": "08:00", "close": "17:00"}, "wednesday": {"open": "08:00", "close": "17:00"}, "thursday": {"open": "08:00", "close": "17:00"}, "friday": {"open": "08:00", "close": "17:00"}, "saturday": {"open": "09:00", "close": "15:00"}, "sunday": {"open": "09:00", "close": "15:00"}}'::jsonb),
  greeting_message = COALESCE(greeting_message, 'Thank you for calling ' || business_name || '. How can I help you today?'),
  tone = COALESCE(tone, 'professional'),
  onboarding_completed = COALESCE(onboarding_completed, false),
  account_status = COALESCE(account_status, 'new_account'),
  subscription_status = COALESCE(subscription_status, 'inactive')
WHERE city IS NULL OR state IS NULL OR zip_code IS NULL;

-- 7. CREATE MISSING CALLS TABLE (CRITICAL FOR API ROUTES)
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

-- 8. CREATE MISSING SMS MESSAGES TABLE (CRITICAL FOR SMS FUNCTIONALITY)
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

-- 9. CREATE MISSING LEADS TABLE (CRITICAL FOR AUTOMATION)
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

-- 10. CREATE MISSING AUTOMATION TABLES
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

-- 11. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);
CREATE INDEX IF NOT EXISTS idx_calls_customer_phone ON calls(customer_phone);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);

CREATE INDEX IF NOT EXISTS idx_sms_messages_business_id ON sms_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at);

-- 12. CREATE INDEXES FOR LEADS AND AUTOMATION
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

-- 13. ADD UPDATE TRIGGERS
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. ADD LEADS AND AUTOMATION TRIGGERS
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follow_up_sequence_updated_at BEFORE UPDATE ON follow_up_sequence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_calls_updated_at BEFORE UPDATE ON scheduled_calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. DISABLE RLS FOR NEW TABLES
ALTER TABLE calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequence DISABLE ROW LEVEL SECURITY;
ALTER TABLE contact_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_data DISABLE ROW LEVEL SECURITY;

-- 16. GRANT PERMISSIONS
GRANT ALL ON TABLE calls TO service_role;
GRANT ALL ON TABLE sms_messages TO service_role;
GRANT ALL ON TABLE calls TO authenticated;
GRANT ALL ON TABLE sms_messages TO authenticated;

-- 17. GRANT PERMISSIONS FOR AUTOMATION TABLES
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

-- 18. Verify the fix
SELECT 'Database fix completed successfully' as status;
SELECT 'Users table columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT 'Businesses table columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
ORDER BY ordinal_position;

-- 19. Verify new tables were created
SELECT 'NEW TABLES VERIFICATION:' as info;
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calls') THEN '✅ Calls table exists' ELSE '❌ Calls table missing' END as calls_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_messages') THEN '✅ SMS messages table exists' ELSE '❌ SMS messages table missing' END as sms_messages_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN '✅ Leads table exists' ELSE '❌ Leads table missing' END as leads_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_up_sequence') THEN '✅ Follow-up sequence table exists' ELSE '❌ Follow-up sequence table missing' END as follow_up_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_activities') THEN '✅ Contact activities table exists' ELSE '❌ Contact activities table missing' END as contact_activities_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_calls') THEN '✅ Scheduled calls table exists' ELSE '❌ Scheduled calls table missing' END as scheduled_calls_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ml_training_data') THEN '✅ ML training data table exists' ELSE '❌ ML training data table missing' END as ml_training_check;
