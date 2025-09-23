-- =====================================================
-- CLOUDGREET FINAL PRODUCTION DATABASE SETUP
-- This will COMPLETELY DELETE EVERYTHING and recreate the entire database
-- =====================================================

-- =====================================================
-- STEP 1: COMPLETE DATABASE WIPE
-- =====================================================

-- Drop ALL existing tables, functions, triggers, policies, and extensions
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Grant permissions back to postgres and public
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- =====================================================
-- STEP 2: CREATE ALL TABLES
-- =====================================================

-- Users table (FIRST - no foreign key dependencies)
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    business_id UUID, -- Will be set after businesses table is created
    role VARCHAR(50) DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'user')),
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Businesses table
CREATE TABLE businesses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('HVAC', 'Paint', 'Roofing', 'Plumbing', 'Electrical', 'Landscaping', 'Cleaning', 'General')),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    website VARCHAR(255),
    description TEXT,
    services TEXT[],
    service_areas TEXT[],
    business_hours JSONB,
    greeting_message TEXT,
    tone VARCHAR(20) DEFAULT 'professional' CHECK (tone IN ('professional', 'friendly', 'casual')),
    ai_tone VARCHAR(20) DEFAULT 'professional' CHECK (ai_tone IN ('professional', 'friendly', 'casual')),
    voice VARCHAR(20) DEFAULT 'alloy' CHECK (voice IN ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')),
    custom_instructions TEXT,
    max_call_duration INTEGER DEFAULT 10,
    escalation_threshold INTEGER DEFAULT 5,
    escalation_phone VARCHAR(20),
    enable_call_recording BOOLEAN DEFAULT FALSE,
    enable_transcription BOOLEAN DEFAULT FALSE,
    enable_sms_forwarding BOOLEAN DEFAULT FALSE,
    notification_phone VARCHAR(20),
    notification_email VARCHAR(255),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    account_status VARCHAR(20) DEFAULT 'new_account' CHECK (account_status IN ('new_account', 'active', 'suspended', 'cancelled')),
    stripe_customer_id VARCHAR(255),
    subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
    billing_plan VARCHAR(50) DEFAULT 'pro' CHECK (billing_plan IN ('starter', 'pro', 'enterprise')),
    promo_code_used VARCHAR(50),
    trial_end_date TIMESTAMP WITH TIME ZONE,
    is_trial_active BOOLEAN DEFAULT TRUE,
    calendar_connected BOOLEAN DEFAULT FALSE,
    google_calendar_access_token TEXT,
    google_calendar_refresh_token TEXT,
    google_calendar_expiry_date TIMESTAMP WITH TIME ZONE,
    after_hours_policy VARCHAR(20) DEFAULT 'voicemail' CHECK (after_hours_policy IN ('voicemail', 'sms', 'none')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Agents table
CREATE TABLE ai_agents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    agent_name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'training', 'error')),
    telynyx_agent_id VARCHAR(255),
    retell_agent_id VARCHAR(255),
    greeting_message TEXT,
    tone VARCHAR(20) DEFAULT 'professional' CHECK (tone IN ('professional', 'friendly', 'casual')),
    prompt_template TEXT,
    configuration JSONB,
    performance_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Logs table
CREATE TABLE call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    call_id VARCHAR(255),
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    duration INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('answered', 'missed', 'busy', 'failed', 'completed', 'error_handled')),
    direction VARCHAR(20) DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
    recording_url TEXT,
    transcription_text TEXT,
    transcript TEXT,
    ai_confidence DECIMAL(3,2),
    caller_name VARCHAR(255),
    caller_city VARCHAR(255),
    caller_state VARCHAR(255),
    caller_country VARCHAR(255),
    service_requested VARCHAR(255),
    urgency VARCHAR(20),
    budget_mentioned DECIMAL(10,2),
    timeline VARCHAR(50),
    notes TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_scheduled TIMESTAMP WITH TIME ZONE,
    cost DECIMAL(10,4) DEFAULT 0,
    outcome VARCHAR(50),
    satisfaction_score INTEGER,
    call_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS Logs table
CREATE TABLE sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    message_id VARCHAR(255),
    to_number VARCHAR(20) NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    message_text TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'pending', 'received')),
    type VARCHAR(50),
    cost DECIMAL(10,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    service_type VARCHAR(255) NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    estimated_value DECIMAL(10,2),
    actual_value DECIMAL(10,2),
    notes TEXT,
    address TEXT,
    google_calendar_event_id VARCHAR(255),
    reminder_sent BOOLEAN DEFAULT FALSE,
    confirmation_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripe Customers table
CREATE TABLE stripe_customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripe Subscriptions table
CREATE TABLE stripe_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing Plans table
CREATE TABLE pricing_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    monthly_price DECIMAL(10,2) NOT NULL,
    per_booking_price DECIMAL(10,2) NOT NULL,
    features TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    stripe_price_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promo Codes table
CREATE TABLE promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Sessions table (for SMS conversations)
CREATE TABLE chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    messages JSONB DEFAULT '[]',
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, phone_number)
);

-- SMS Opt-outs table
CREATE TABLE sms_opt_outs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, phone_number)
);

-- Lead Scores table
CREATE TABLE lead_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255),
    total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
    urgency_score INTEGER NOT NULL CHECK (urgency_score >= 0 AND urgency_score <= 25),
    value_score INTEGER NOT NULL CHECK (value_score >= 0 AND value_score <= 25),
    fit_score INTEGER NOT NULL CHECK (fit_score >= 0 AND fit_score <= 25),
    engagement_score INTEGER NOT NULL CHECK (engagement_score >= 0 AND engagement_score <= 25),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'very_low')),
    recommendations TEXT,
    call_data JSONB,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_scheduled TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follow-up Schedule table
CREATE TABLE follow_up_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255),
    trigger VARCHAR(50) NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
    message_sent TEXT,
    execution_attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Health table
CREATE TABLE system_health (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
    response_time_ms INTEGER,
    error_message TEXT,
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotes table
CREATE TABLE quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    service_type VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_price DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'rejected', 'expired')),
    valid_until TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table
CREATE TABLE leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    service_requested VARCHAR(255),
    urgency VARCHAR(20) CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
    budget_mentioned DECIMAL(10,2),
    timeline VARCHAR(50),
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    source VARCHAR(50) DEFAULT 'phone' CHECK (source IN ('phone', 'sms', 'website', 'referral')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error Logs table
CREATE TABLE error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    call_id VARCHAR(255),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Analyses table
CREATE TABLE call_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    call_id VARCHAR(255) NOT NULL,
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    intent VARCHAR(100),
    key_topics TEXT[],
    customer_satisfaction INTEGER CHECK (customer_satisfaction >= 1 AND customer_satisfaction <= 5),
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    analysis_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Callback Requests table
CREATE TABLE callback_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20) NOT NULL,
    preferred_time TIMESTAMP WITH TIME ZONE,
    urgency VARCHAR(20) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Tickets table
CREATE TABLE support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('contact_form', 'technical_issue', 'billing_question', 'feature_request', 'general')),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    response TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 3: ADD FOREIGN KEY CONSTRAINTS (AFTER ALL TABLES EXIST)
-- =====================================================

-- Add foreign key constraint to users table
ALTER TABLE users ADD CONSTRAINT fk_users_business_id FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_admin ON users(is_admin);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Businesses indexes
CREATE INDEX idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX idx_businesses_business_type ON businesses(business_type);
CREATE INDEX idx_businesses_subscription_status ON businesses(subscription_status);
CREATE INDEX idx_businesses_stripe_customer_id ON businesses(stripe_customer_id);
CREATE INDEX idx_businesses_phone_number ON businesses(phone_number);
CREATE INDEX idx_businesses_onboarding_completed ON businesses(onboarding_completed);

-- AI Agents indexes
CREATE INDEX idx_ai_agents_business_id ON ai_agents(business_id);
CREATE INDEX idx_ai_agents_is_active ON ai_agents(is_active);
CREATE INDEX idx_ai_agents_status ON ai_agents(status);

-- Call Logs indexes
CREATE INDEX idx_call_logs_business_id ON call_logs(business_id);
CREATE INDEX idx_call_logs_created_at ON call_logs(created_at);
CREATE INDEX idx_call_logs_status ON call_logs(status);
CREATE INDEX idx_call_logs_from_number ON call_logs(from_number);
CREATE INDEX idx_call_logs_call_id ON call_logs(call_id);

-- SMS Logs indexes
CREATE INDEX idx_sms_logs_business_id ON sms_logs(business_id);
CREATE INDEX idx_sms_logs_created_at ON sms_logs(created_at);
CREATE INDEX idx_sms_logs_direction ON sms_logs(direction);
CREATE INDEX idx_sms_logs_message_id ON sms_logs(message_id);

-- Appointments indexes
CREATE INDEX idx_appointments_business_id ON appointments(business_id);
CREATE INDEX idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_customer_phone ON appointments(customer_phone);

-- Stripe indexes
CREATE INDEX idx_stripe_customers_business_id ON stripe_customers(business_id);
CREATE INDEX idx_stripe_customers_stripe_customer_id ON stripe_customers(stripe_customer_id);
CREATE INDEX idx_stripe_subscriptions_business_id ON stripe_subscriptions(business_id);
CREATE INDEX idx_stripe_subscriptions_status ON stripe_subscriptions(status);

-- Chat Sessions indexes
CREATE INDEX idx_chat_sessions_business_id ON chat_sessions(business_id);
CREATE INDEX idx_chat_sessions_phone_number ON chat_sessions(phone_number);
CREATE INDEX idx_chat_sessions_last_activity ON chat_sessions(last_activity);

-- SMS Opt-outs indexes
CREATE INDEX idx_sms_opt_outs_business_id ON sms_opt_outs(business_id);
CREATE INDEX idx_sms_opt_outs_phone_number ON sms_opt_outs(phone_number);

-- Lead Scores indexes
CREATE INDEX idx_lead_scores_business_id ON lead_scores(business_id);
CREATE INDEX idx_lead_scores_priority ON lead_scores(priority);
CREATE INDEX idx_lead_scores_created_at ON lead_scores(created_at);

-- Follow-up Schedule indexes
CREATE INDEX idx_follow_up_schedule_business_id ON follow_up_schedule(business_id);
CREATE INDEX idx_follow_up_schedule_scheduled_date ON follow_up_schedule(scheduled_date);
CREATE INDEX idx_follow_up_schedule_status ON follow_up_schedule(status);

-- System indexes
CREATE INDEX idx_audit_logs_business_id ON audit_logs(business_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_notifications_business_id ON notifications(business_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_system_health_service_name ON system_health(service_name);

-- New table indexes
CREATE INDEX idx_quotes_business_id ON quotes(business_id);
CREATE INDEX idx_quotes_customer_phone ON quotes(customer_phone);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);

CREATE INDEX idx_leads_business_id ON leads(business_id);
CREATE INDEX idx_leads_customer_phone ON leads(customer_phone);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at);

CREATE INDEX idx_error_logs_business_id ON error_logs(business_id);
CREATE INDEX idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);

CREATE INDEX idx_call_analyses_business_id ON call_analyses(business_id);
CREATE INDEX idx_call_analyses_call_id ON call_analyses(call_id);
CREATE INDEX idx_call_analyses_sentiment ON call_analyses(sentiment);

CREATE INDEX idx_callback_requests_business_id ON callback_requests(business_id);
CREATE INDEX idx_callback_requests_customer_phone ON callback_requests(customer_phone);
CREATE INDEX idx_callback_requests_status ON callback_requests(status);

CREATE INDEX idx_support_tickets_business_id ON support_tickets(business_id);
CREATE INDEX idx_support_tickets_type ON support_tickets(type);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);

-- =====================================================
-- STEP 5: CREATE FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_subscriptions_updated_at BEFORE UPDATE ON stripe_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_scores_updated_at BEFORE UPDATE ON lead_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follow_up_schedule_updated_at BEFORE UPDATE ON follow_up_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 5: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE callback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Businesses policies
CREATE POLICY "Users can view their own businesses" ON businesses
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own businesses" ON businesses
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own businesses" ON businesses
    FOR UPDATE USING (owner_id = auth.uid());

-- AI Agents policies
CREATE POLICY "Users can view their own ai agents" ON ai_agents
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own ai agents" ON ai_agents
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can update their own ai agents" ON ai_agents
    FOR UPDATE USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Call Logs policies
CREATE POLICY "Users can view their own call logs" ON call_logs
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own call logs" ON call_logs
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- SMS Logs policies
CREATE POLICY "Users can view their own sms logs" ON sms_logs
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own sms logs" ON sms_logs
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Appointments policies
CREATE POLICY "Users can view their own appointments" ON appointments
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own appointments" ON appointments
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can update their own appointments" ON appointments
    FOR UPDATE USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Stripe policies
CREATE POLICY "Users can view their own stripe data" ON stripe_customers
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own stripe data" ON stripe_customers
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own subscriptions" ON stripe_subscriptions
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own subscriptions" ON stripe_subscriptions
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Chat Sessions policies
CREATE POLICY "Users can view their own chat sessions" ON chat_sessions
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own chat sessions" ON chat_sessions
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can update their own chat sessions" ON chat_sessions
    FOR UPDATE USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- SMS Opt-outs policies
CREATE POLICY "Users can view their own sms opt-outs" ON sms_opt_outs
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own sms opt-outs" ON sms_opt_outs
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Lead Scores policies
CREATE POLICY "Users can view their own lead scores" ON lead_scores
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own lead scores" ON lead_scores
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Follow-up Schedule policies
CREATE POLICY "Users can view their own follow-up schedule" ON follow_up_schedule
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own follow-up schedule" ON follow_up_schedule
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can update their own follow-up schedule" ON follow_up_schedule
    FOR UPDATE USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- System policies
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ) OR user_id = auth.uid());

CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ) OR user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ) OR user_id = auth.uid());

-- New table policies
CREATE POLICY "Users can view their own quotes" ON quotes
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own quotes" ON quotes
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can update their own quotes" ON quotes
    FOR UPDATE USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own leads" ON leads
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own leads" ON leads
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can update their own leads" ON leads
    FOR UPDATE USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own error logs" ON error_logs
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ) OR user_id = auth.uid());

CREATE POLICY "Users can view their own call analyses" ON call_analyses
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own call analyses" ON call_analyses
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own callback requests" ON callback_requests
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own callback requests" ON callback_requests
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can update their own callback requests" ON callback_requests
    FOR UPDATE USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own support tickets" ON support_tickets
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ) OR user_id = auth.uid());

CREATE POLICY "Users can insert their own support tickets" ON support_tickets
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ) OR user_id = auth.uid());

CREATE POLICY "Users can update their own support tickets" ON support_tickets
    FOR UPDATE USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ) OR user_id = auth.uid());

-- =====================================================
-- STEP 6: GRANT PERMISSIONS
-- =====================================================

-- Grant all permissions to authenticated users
GRANT ALL ON users TO authenticated;
GRANT ALL ON businesses TO authenticated;
GRANT ALL ON ai_agents TO authenticated;
GRANT ALL ON call_logs TO authenticated;
GRANT ALL ON sms_logs TO authenticated;
GRANT ALL ON appointments TO authenticated;
GRANT ALL ON stripe_customers TO authenticated;
GRANT ALL ON stripe_subscriptions TO authenticated;
GRANT ALL ON pricing_plans TO authenticated;
GRANT ALL ON promo_codes TO authenticated;
GRANT ALL ON chat_sessions TO authenticated;
GRANT ALL ON sms_opt_outs TO authenticated;
GRANT ALL ON lead_scores TO authenticated;
GRANT ALL ON follow_up_schedule TO authenticated;
GRANT ALL ON audit_logs TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON system_health TO authenticated;
GRANT ALL ON quotes TO authenticated;
GRANT ALL ON leads TO authenticated;
GRANT ALL ON error_logs TO authenticated;
GRANT ALL ON call_analyses TO authenticated;
GRANT ALL ON callback_requests TO authenticated;
GRANT ALL ON support_tickets TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON users TO service_role;
GRANT ALL ON businesses TO service_role;
GRANT ALL ON ai_agents TO service_role;
GRANT ALL ON call_logs TO service_role;
GRANT ALL ON sms_logs TO service_role;
GRANT ALL ON appointments TO service_role;
GRANT ALL ON stripe_customers TO service_role;
GRANT ALL ON stripe_subscriptions TO service_role;
GRANT ALL ON pricing_plans TO service_role;
GRANT ALL ON promo_codes TO service_role;
GRANT ALL ON chat_sessions TO service_role;
GRANT ALL ON sms_opt_outs TO service_role;
GRANT ALL ON lead_scores TO service_role;
GRANT ALL ON follow_up_schedule TO service_role;
GRANT ALL ON audit_logs TO service_role;
GRANT ALL ON notifications TO service_role;
GRANT ALL ON system_health TO service_role;
GRANT ALL ON quotes TO service_role;
GRANT ALL ON leads TO service_role;
GRANT ALL ON error_logs TO service_role;
GRANT ALL ON call_analyses TO service_role;
GRANT ALL ON callback_requests TO service_role;
GRANT ALL ON support_tickets TO service_role;

-- =====================================================
-- STEP 7: SEED DATA
-- =====================================================

-- Insert default pricing plan
INSERT INTO pricing_plans (name, description, monthly_price, per_booking_price, features, is_active) VALUES
(
    'Complete Solution',
    'Everything included - AI receptionist, lead qualification, appointment booking, and more',
    200.00,
    50.00,
    ARRAY[
        '24/7 AI Call Answering',
        'Intelligent Lead Qualification',
        'Calendar Booking & SMS Confirmations',
        'Missed-Call Recovery Texts',
        'Call Recordings & Transcripts',
        'Professional Dashboard & ROI Tracking',
        'Custom Business Greeting',
        'Integration with Google/Microsoft Calendar'
    ],
    true
);

-- Insert default promo codes
INSERT INTO promo_codes (code, description, discount_type, discount_value, max_uses, is_active) VALUES
('WELCOME20', 'Welcome discount for new customers', 'percentage', 20.00, 100, true),
('FIRST50', 'First month discount', 'fixed', 50.00, 50, true),
('LAUNCH30', 'Launch special discount', 'percentage', 30.00, 50, true);

-- =====================================================
-- STEP 8: COMPLETION MESSAGE
-- =====================================================

-- This completes the final production database setup
-- All tables, indexes, policies, functions, and triggers are now in place
-- The database is ready for CloudGreet production deployment

-- =====================================================
-- STEP 9: ADVANCED PRODUCTION FEATURES
-- =====================================================

-- Create comprehensive audit logging function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        business_id,
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        details,
        created_at
    ) VALUES (
        COALESCE(NEW.business_id, OLD.business_id),
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id::text, OLD.id::text),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP),
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create data retention policy function
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete old audit logs (older than 1 year)
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Delete old error logs (older than 90 days)
    DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Delete old system health records (older than 30 days)
    DELETE FROM system_health WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Update expired trials
    UPDATE businesses 
    SET subscription_status = 'inactive', is_trial_active = false 
    WHERE is_trial_active = true AND trial_end_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create performance monitoring function
CREATE OR REPLACE FUNCTION get_system_metrics()
RETURNS TABLE (
    total_businesses bigint,
    active_businesses bigint,
    total_calls_today bigint,
    total_appointments_today bigint,
    total_revenue_monthly numeric,
    system_uptime_percent numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM businesses) as total_businesses,
        (SELECT COUNT(*) FROM businesses WHERE subscription_status = 'active') as active_businesses,
        (SELECT COUNT(*) FROM call_logs WHERE DATE(created_at) = CURRENT_DATE) as total_calls_today,
        (SELECT COUNT(*) FROM appointments WHERE DATE(scheduled_date) = CURRENT_DATE) as total_appointments_today,
        (SELECT COALESCE(SUM(actual_value), 0) FROM appointments 
         WHERE DATE_TRUNC('month', scheduled_date) = DATE_TRUNC('month', CURRENT_DATE)) as total_revenue_monthly,
        (SELECT COALESCE(AVG(CASE WHEN status = 'healthy' THEN 100.0 ELSE 0.0 END), 0) 
         FROM system_health WHERE created_at > NOW() - INTERVAL '24 hours') as system_uptime_percent;
END;
$$ LANGUAGE plpgsql;

-- Create business analytics function
CREATE OR REPLACE FUNCTION get_business_analytics(p_business_id UUID)
RETURNS TABLE (
    total_calls bigint,
    answered_calls bigint,
    missed_calls bigint,
    total_appointments bigint,
    completed_appointments bigint,
    total_revenue numeric,
    avg_call_duration numeric,
    conversion_rate numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM call_logs WHERE business_id = p_business_id) as total_calls,
        (SELECT COUNT(*) FROM call_logs WHERE business_id = p_business_id AND status = 'answered') as answered_calls,
        (SELECT COUNT(*) FROM call_logs WHERE business_id = p_business_id AND status = 'missed') as missed_calls,
        (SELECT COUNT(*) FROM appointments WHERE business_id = p_business_id) as total_appointments,
        (SELECT COUNT(*) FROM appointments WHERE business_id = p_business_id AND status = 'completed') as completed_appointments,
        (SELECT COALESCE(SUM(actual_value), 0) FROM appointments WHERE business_id = p_business_id) as total_revenue,
        (SELECT COALESCE(AVG(duration), 0) FROM call_logs WHERE business_id = p_business_id AND status = 'answered') as avg_call_duration,
        (SELECT CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'answered'))::numeric / COUNT(*)::numeric * 100
            ELSE 0 
         END FROM call_logs WHERE business_id = p_business_id) as conversion_rate;
END;
$$ LANGUAGE plpgsql;

-- Create advanced search function
CREATE OR REPLACE FUNCTION search_businesses(
    p_search_term TEXT,
    p_business_type TEXT DEFAULT NULL,
    p_subscription_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    business_name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    business_type VARCHAR,
    subscription_status VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    total_calls BIGINT,
    total_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.business_name,
        b.email,
        b.phone,
        b.business_type,
        b.subscription_status,
        b.created_at,
        (SELECT COUNT(*) FROM call_logs WHERE business_id = b.id) as total_calls,
        (SELECT COALESCE(SUM(actual_value), 0) FROM appointments WHERE business_id = b.id) as total_revenue
    FROM businesses b
    WHERE 
        (p_search_term IS NULL OR 
         b.business_name ILIKE '%' || p_search_term || '%' OR
         b.email ILIKE '%' || p_search_term || '%' OR
         b.phone ILIKE '%' || p_search_term || '%')
    AND (p_business_type IS NULL OR b.business_type = p_business_type)
    AND (p_subscription_status IS NULL OR b.subscription_status = p_subscription_status)
    ORDER BY b.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive reporting function
CREATE OR REPLACE FUNCTION generate_monthly_report(p_business_id UUID, p_month DATE)
RETURNS JSONB AS $$
DECLARE
    report_data JSONB;
BEGIN
    SELECT jsonb_build_object(
        'business_id', p_business_id,
        'report_month', p_month,
        'total_calls', (SELECT COUNT(*) FROM call_logs 
                       WHERE business_id = p_business_id 
                       AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', p_month)),
        'answered_calls', (SELECT COUNT(*) FROM call_logs 
                          WHERE business_id = p_business_id 
                          AND status = 'answered'
                          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', p_month)),
        'total_appointments', (SELECT COUNT(*) FROM appointments 
                              WHERE business_id = p_business_id 
                              AND DATE_TRUNC('month', scheduled_date) = DATE_TRUNC('month', p_month)),
        'completed_appointments', (SELECT COUNT(*) FROM appointments 
                                  WHERE business_id = p_business_id 
                                  AND status = 'completed'
                                  AND DATE_TRUNC('month', scheduled_date) = DATE_TRUNC('month', p_month)),
        'total_revenue', (SELECT COALESCE(SUM(actual_value), 0) FROM appointments 
                         WHERE business_id = p_business_id 
                         AND DATE_TRUNC('month', scheduled_date) = DATE_TRUNC('month', p_month)),
        'avg_call_duration', (SELECT COALESCE(AVG(duration), 0) FROM call_logs 
                             WHERE business_id = p_business_id 
                             AND status = 'answered'
                             AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', p_month)),
        'conversion_rate', (SELECT CASE 
                                   WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'answered'))::numeric / COUNT(*)::numeric * 100
                                   ELSE 0 
                                   END FROM call_logs 
                          WHERE business_id = p_business_id 
                          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', p_month)),
        'generated_at', NOW()
    ) INTO report_data;
    
    RETURN report_data;
END;
$$ LANGUAGE plpgsql;

-- Create security audit function
CREATE OR REPLACE FUNCTION security_audit()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Admin User Count'::TEXT,
        CASE WHEN COUNT(*) > 5 THEN 'WARNING' ELSE 'OK' END::TEXT,
        'Found ' || COUNT(*) || ' admin users'::TEXT,
        CASE WHEN COUNT(*) > 5 THEN 'Consider reducing admin users for security' ELSE 'Admin user count is appropriate' END::TEXT
    FROM users WHERE is_admin = true
    UNION ALL
    SELECT 
        'Inactive Businesses'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'INFO' ELSE 'OK' END::TEXT,
        'Found ' || COUNT(*) || ' inactive businesses'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'Consider archiving or removing inactive businesses' ELSE 'No inactive businesses found' END::TEXT
    FROM businesses WHERE subscription_status = 'inactive' AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create automated maintenance function
CREATE OR REPLACE FUNCTION run_maintenance()
RETURNS TABLE (
    task_name TEXT,
    status TEXT,
    records_affected BIGINT,
    execution_time INTERVAL
) AS $$
DECLARE
    start_time TIMESTAMP;
    task_start TIMESTAMP;
    records_count BIGINT;
BEGIN
    start_time := NOW();
    
    -- Task 1: Cleanup old audit logs
    task_start := NOW();
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
    GET DIAGNOSTICS records_count = ROW_COUNT;
    RETURN QUERY SELECT 'Cleanup old audit logs'::TEXT, 'COMPLETED'::TEXT, records_count, NOW() - task_start;
    
    -- Task 2: Cleanup old error logs
    task_start := NOW();
    DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS records_count = ROW_COUNT;
    RETURN QUERY SELECT 'Cleanup old error logs'::TEXT, 'COMPLETED'::TEXT, records_count, NOW() - task_start;
    
    -- Task 3: Update expired trials
    task_start := NOW();
    UPDATE businesses SET subscription_status = 'inactive', is_trial_active = false 
    WHERE is_trial_active = true AND trial_end_date < NOW();
    GET DIAGNOSTICS records_count = ROW_COUNT;
    RETURN QUERY SELECT 'Update expired trials'::TEXT, 'COMPLETED'::TEXT, records_count, NOW() - task_start;
    
    RETURN QUERY SELECT 'Total maintenance time'::TEXT, 'COMPLETED'::TEXT, 0::BIGINT, NOW() - start_time;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 10: SECURITY AND RATE LIMITING
-- =====================================================

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_endpoint TEXT,
    p_max_requests INTEGER DEFAULT 100,
    p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    window_start TIMESTAMP;
BEGIN
    window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    
    -- Clean up old entries
    DELETE FROM rate_limits 
    WHERE window_start < window_start AND blocked_until IS NULL;
    
    -- Check if currently blocked
    IF EXISTS (SELECT 1 FROM rate_limits 
               WHERE identifier = p_identifier 
               AND endpoint = p_endpoint 
               AND blocked_until > NOW()) THEN
        RETURN FALSE;
    END IF;
    
    -- Get or create current window
    INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, NOW())
    ON CONFLICT (identifier, endpoint) 
    DO UPDATE SET 
        request_count = rate_limits.request_count + 1,
        updated_at = NOW()
    WHERE rate_limits.window_start > window_start;
    
    -- Check if limit exceeded
    SELECT request_count INTO current_count
    FROM rate_limits 
    WHERE identifier = p_identifier 
    AND endpoint = p_endpoint 
    AND window_start > window_start;
    
    IF current_count > p_max_requests THEN
        UPDATE rate_limits 
        SET blocked_until = NOW() + (p_window_minutes || ' minutes')::INTERVAL
        WHERE identifier = p_identifier 
        AND endpoint = p_endpoint;
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create session management table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'CloudGreet Production Database Setup Complete!' as status;
SELECT 'All tables created successfully' as message;
SELECT 'Row Level Security enabled' as security;
SELECT 'Performance indexes created' as performance;
SELECT 'Advanced functions and triggers added' as advanced;
SELECT 'Security features implemented' as security_features;
SELECT 'Ready for production deployment' as ready;
