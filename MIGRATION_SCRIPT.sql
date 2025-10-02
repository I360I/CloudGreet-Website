-- =====================================================
-- CLOUDGREET DATABASE MIGRATION SCRIPT
-- Adds missing fields and tables WITHOUT dropping existing data
-- =====================================================

-- =====================================================
-- STEP 1: ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add missing columns to businesses table
DO $$ 
BEGIN
    -- Add city column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'city') THEN
        ALTER TABLE businesses ADD COLUMN city VARCHAR(100) NOT NULL DEFAULT 'Unknown';
    END IF;
    
    -- Add state column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'state') THEN
        ALTER TABLE businesses ADD COLUMN state VARCHAR(50) NOT NULL DEFAULT 'Unknown';
    END IF;
    
    -- Add zip_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'zip_code') THEN
        ALTER TABLE businesses ADD COLUMN zip_code VARCHAR(10) NOT NULL DEFAULT '00000';
    END IF;
    
    -- Add phone_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'phone_number') THEN
        ALTER TABLE businesses ADD COLUMN phone_number VARCHAR(20) NOT NULL DEFAULT '000-000-0000';
    END IF;
    
    -- Update phone_number with phone value if phone_number is default
    UPDATE businesses SET phone_number = phone WHERE phone_number = '000-000-0000' AND phone IS NOT NULL;
END $$;

-- =====================================================
-- STEP 2: CREATE MISSING TABLES (IF THEY DON'T EXIST)
-- =====================================================

-- Create password_reset_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calls table if it doesn't exist
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

-- Create leads table if it doesn't exist
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
    business_id_google VARCHAR(255),
    ai_receptionist_value JSONB,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'closed')),
    source VARCHAR(50) DEFAULT 'google_places' CHECK (source IN ('google_places', 'manual', 'referral', 'website')),
    notes TEXT,
    last_contact_date TIMESTAMP WITH TIME ZONE,
    next_follow_up_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create follow_up_sequence table if it doesn't exist
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

-- Create contact_activities table if it doesn't exist
CREATE TABLE IF NOT EXISTS contact_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('email_sent', 'sms_sent', 'call_made', 'demo_scheduled')),
    details JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scheduled_calls table if it doesn't exist
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

-- Create ml_training_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS ml_training_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    features JSONB NOT NULL,
    outcome VARCHAR(50) NOT NULL CHECK (outcome IN ('converted', 'not_converted', 'in_progress')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create follow_up_tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS follow_up_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('call', 'email', 'sms', 'demo', 'follow_up')),
    task_description TEXT NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'failed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    completion_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 3: CREATE INDEXES FOR NEW TABLES
-- =====================================================

-- Indexes for password_reset_tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Indexes for calls
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);
CREATE INDEX IF NOT EXISTS idx_calls_customer_phone ON calls(customer_phone);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);

-- Indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score);
CREATE INDEX IF NOT EXISTS idx_leads_ml_score ON leads(ml_score);
CREATE INDEX IF NOT EXISTS idx_leads_business_id_google ON leads(business_id_google);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- Indexes for follow_up_sequence
CREATE INDEX IF NOT EXISTS idx_follow_up_sequence_lead_id ON follow_up_sequence(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequence_status ON follow_up_sequence(status);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequence_scheduled_date ON follow_up_sequence(scheduled_date);

-- Indexes for contact_activities
CREATE INDEX IF NOT EXISTS idx_contact_activities_lead_id ON contact_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_type ON contact_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_contact_activities_timestamp ON contact_activities(timestamp);

-- Indexes for scheduled_calls
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_lead_id ON scheduled_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_status ON scheduled_calls(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_scheduled_date ON scheduled_calls(scheduled_date);

-- Indexes for ml_training_data
CREATE INDEX IF NOT EXISTS idx_ml_training_data_lead_id ON ml_training_data(lead_id);
CREATE INDEX IF NOT EXISTS idx_ml_training_data_outcome ON ml_training_data(outcome);

-- Indexes for follow_up_tasks
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_business_id ON follow_up_tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_lead_id ON follow_up_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_status ON follow_up_tasks(status);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_priority ON follow_up_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_scheduled_date ON follow_up_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_assigned_to ON follow_up_tasks(assigned_to);

-- =====================================================
-- STEP 4: CREATE UPDATE TRIGGERS FOR NEW TABLES
-- =====================================================

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for new tables (with error handling)
DO $$ 
BEGIN
    -- Create trigger for password_reset_tokens
    BEGIN
        CREATE TRIGGER update_password_reset_tokens_updated_at 
            BEFORE UPDATE ON password_reset_tokens
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    -- Create trigger for calls
    BEGIN
        CREATE TRIGGER update_calls_updated_at 
            BEFORE UPDATE ON calls
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    -- Create trigger for leads
    BEGIN
        CREATE TRIGGER update_leads_updated_at 
            BEFORE UPDATE ON leads
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    -- Create trigger for follow_up_sequence
    BEGIN
        CREATE TRIGGER update_follow_up_sequence_updated_at 
            BEFORE UPDATE ON follow_up_sequence
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    -- Create trigger for scheduled_calls
    BEGIN
        CREATE TRIGGER update_scheduled_calls_updated_at 
            BEFORE UPDATE ON scheduled_calls
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    -- Create trigger for follow_up_tasks
    BEGIN
        CREATE TRIGGER update_follow_up_tasks_updated_at 
            BEFORE UPDATE ON follow_up_tasks
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- =====================================================
-- STEP 5: GRANT PERMISSIONS FOR NEW TABLES
-- =====================================================

-- Grant permissions for new tables
GRANT ALL ON TABLE password_reset_tokens TO service_role;
GRANT ALL ON TABLE calls TO service_role;
GRANT ALL ON TABLE leads TO service_role;
GRANT ALL ON TABLE follow_up_sequence TO service_role;
GRANT ALL ON TABLE contact_activities TO service_role;
GRANT ALL ON TABLE scheduled_calls TO service_role;
GRANT ALL ON TABLE ml_training_data TO service_role;
GRANT ALL ON TABLE follow_up_tasks TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE password_reset_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE calls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE follow_up_sequence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE contact_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE scheduled_calls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ml_training_data TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE follow_up_tasks TO authenticated;

-- =====================================================
-- STEP 6: VERIFICATION
-- =====================================================

-- Verify the migration was successful
SELECT 'MIGRATION VERIFICATION:' as info;

-- Check if businesses table has the new columns
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'city') THEN '✅ city column added' ELSE '❌ city column missing' END as city_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'state') THEN '✅ state column added' ELSE '❌ state column missing' END as state_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'zip_code') THEN '✅ zip_code column added' ELSE '❌ zip_code column missing' END as zip_code_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'phone_number') THEN '✅ phone_number column added' ELSE '❌ phone_number column missing' END as phone_number_check;

-- Check if new tables were created
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_tokens') THEN '✅ password_reset_tokens table created' ELSE '❌ password_reset_tokens table missing' END as password_reset_tokens_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calls') THEN '✅ calls table created' ELSE '❌ calls table missing' END as calls_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN '✅ leads table created' ELSE '❌ leads table missing' END as leads_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_up_sequence') THEN '✅ follow_up_sequence table created' ELSE '❌ follow_up_sequence table missing' END as follow_up_sequence_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_activities') THEN '✅ contact_activities table created' ELSE '❌ contact_activities table missing' END as contact_activities_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_calls') THEN '✅ scheduled_calls table created' ELSE '❌ scheduled_calls table missing' END as scheduled_calls_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ml_training_data') THEN '✅ ml_training_data table created' ELSE '❌ ml_training_data table missing' END as ml_training_data_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_up_tasks') THEN '✅ follow_up_tasks table created' ELSE '❌ follow_up_tasks table missing' END as follow_up_tasks_check;

-- Final success message
SELECT '🎉 MIGRATION COMPLETE!' as status;
SELECT '✅ All missing columns and tables added successfully' as message;
SELECT '✅ Existing data preserved' as data_preserved;
SELECT '✅ Ready for onboarding completion' as ready;
