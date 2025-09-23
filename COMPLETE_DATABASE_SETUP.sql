-- =====================================================
-- CLOUDGREET COMPLETE DATABASE SETUP
-- This will DELETE ALL existing tables and recreate everything
-- =====================================================

-- DROP ALL EXISTING TABLES (in correct order due to foreign keys)
DROP TABLE IF EXISTS jarvis_interactions CASCADE;
DROP TABLE IF EXISTS jarvis_commands CASCADE;
DROP TABLE IF EXISTS jarvis_insights CASCADE;
DROP TABLE IF EXISTS lead_scores CASCADE;
DROP TABLE IF EXISTS follow_up_schedule CASCADE;
DROP TABLE IF EXISTS market_intelligence CASCADE;
DROP TABLE IF EXISTS ai_agent_tests CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS call_logs CASCADE;
DROP TABLE IF EXISTS sms_logs CASCADE;
DROP TABLE IF EXISTS ai_agents CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS stripe_customers CASCADE;
DROP TABLE IF EXISTS stripe_subscriptions CASCADE;
DROP TABLE IF EXISTS pricing_plans CASCADE;
DROP TABLE IF EXISTS promo_codes CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS system_health CASCADE;
DROP TABLE IF EXISTS admin_analytics CASCADE;

-- DROP ALL FUNCTIONS
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_market_intelligence() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_jarvis_insights() CASCADE;

-- =====================================================
-- CORE USER AND BUSINESS TABLES
-- =====================================================

-- Users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Businesses table
CREATE TABLE businesses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('HVAC', 'Paint', 'Roofing', 'Plumbing', 'Electrical', 'Landscaping', 'Cleaning', 'General')),
    email VARCHAR(255) NOT NULL,
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
    voice VARCHAR(20) DEFAULT 'alloy' CHECK (voice IN ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')),
    custom_instructions TEXT,
    max_call_duration INTEGER DEFAULT 10,
    escalation_threshold INTEGER DEFAULT 5,
    escalation_phone VARCHAR(20),
    enable_call_recording BOOLEAN DEFAULT FALSE,
    enable_transcription BOOLEAN DEFAULT FALSE,
    enable_sms_forwarding BOOLEAN DEFAULT FALSE,
    notification_phone VARCHAR(20),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    account_status VARCHAR(20) DEFAULT 'new_account' CHECK (account_status IN ('new_account', 'active', 'suspended', 'cancelled')),
    stripe_customer_id VARCHAR(255),
    subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AI AGENT TABLES
-- =====================================================

-- AI Agents table
CREATE TABLE ai_agents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    agent_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    telynyx_agent_id VARCHAR(255),
    configuration JSONB,
    performance_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COMMUNICATION TABLES
-- =====================================================

-- Call Logs table
CREATE TABLE call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    duration INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('answered', 'missed', 'busy', 'failed', 'completed')),
    call_type VARCHAR(20) DEFAULT 'inbound' CHECK (call_type IN ('inbound', 'outbound')),
    recording_url TEXT,
    transcription TEXT,
    ai_confidence DECIMAL(3,2),
    caller_name VARCHAR(255),
    caller_location VARCHAR(255),
    service_requested VARCHAR(255),
    urgency VARCHAR(20),
    budget_mentioned DECIMAL(10,2),
    timeline VARCHAR(50),
    notes TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_scheduled TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS Logs table
CREATE TABLE sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    to_number VARCHAR(20) NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'pending')),
    type VARCHAR(50),
    cost DECIMAL(10,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- APPOINTMENT AND SCHEDULING TABLES
-- =====================================================

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

-- =====================================================
-- BILLING AND SUBSCRIPTION TABLES
-- =====================================================

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
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- JARVIS AI TABLES (ENHANCED)
-- =====================================================

-- Jarvis Interactions table
CREATE TABLE jarvis_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_message TEXT NOT NULL,
    jarvis_response TEXT NOT NULL,
    intent_type VARCHAR(50) NOT NULL,
    intent_confidence DECIMAL(3,2) NOT NULL CHECK (intent_confidence >= 0 AND intent_confidence <= 1),
    action_executed BOOLEAN DEFAULT FALSE,
    action_type VARCHAR(50),
    action_data JSONB,
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jarvis Commands table
CREATE TABLE jarvis_commands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    command_name VARCHAR(100) NOT NULL,
    command_description TEXT,
    command_script TEXT NOT NULL,
    parameters JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    execution_count INTEGER DEFAULT 0,
    last_executed TIMESTAMP WITH TIME ZONE,
    success_rate DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jarvis Insights table
CREATE TABLE jarvis_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL,
    insight_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_actionable BOOLEAN DEFAULT FALSE,
    action_taken BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jarvis Business Rules table
CREATE TABLE jarvis_business_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    rule_description TEXT,
    trigger_conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    execution_count INTEGER DEFAULT 0,
    last_executed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ADVANCED FEATURES TABLES
-- =====================================================

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

-- Market Intelligence table
CREATE TABLE market_intelligence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL,
    analysis_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SYSTEM AND ADMIN TABLES
-- =====================================================

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

-- Admin Analytics table
CREATE TABLE admin_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metric_type VARCHAR(20) NOT NULL CHECK (metric_type IN ('count', 'sum', 'average', 'percentage')),
    date DATE NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_admin ON users(is_admin);

-- Businesses indexes
CREATE INDEX idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX idx_businesses_business_type ON businesses(business_type);
CREATE INDEX idx_businesses_subscription_status ON businesses(subscription_status);
CREATE INDEX idx_businesses_stripe_customer_id ON businesses(stripe_customer_id);

-- AI Agents indexes
CREATE INDEX idx_ai_agents_business_id ON ai_agents(business_id);
CREATE INDEX idx_ai_agents_is_active ON ai_agents(is_active);

-- Call Logs indexes
CREATE INDEX idx_call_logs_business_id ON call_logs(business_id);
CREATE INDEX idx_call_logs_created_at ON call_logs(created_at);
CREATE INDEX idx_call_logs_status ON call_logs(status);
CREATE INDEX idx_call_logs_from_number ON call_logs(from_number);

-- SMS Logs indexes
CREATE INDEX idx_sms_logs_business_id ON sms_logs(business_id);
CREATE INDEX idx_sms_logs_created_at ON sms_logs(created_at);
CREATE INDEX idx_sms_logs_direction ON sms_logs(direction);

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

-- Jarvis indexes
CREATE INDEX idx_jarvis_interactions_business_id ON jarvis_interactions(business_id);
CREATE INDEX idx_jarvis_interactions_created_at ON jarvis_interactions(created_at);
CREATE INDEX idx_jarvis_interactions_intent_type ON jarvis_interactions(intent_type);
CREATE INDEX idx_jarvis_commands_business_id ON jarvis_commands(business_id);
CREATE INDEX idx_jarvis_commands_active ON jarvis_commands(is_active);
CREATE INDEX idx_jarvis_insights_business_id ON jarvis_insights(business_id);
CREATE INDEX idx_jarvis_insights_type ON jarvis_insights(insight_type);
CREATE INDEX idx_jarvis_insights_expires_at ON jarvis_insights(expires_at);
CREATE INDEX idx_jarvis_business_rules_business_id ON jarvis_business_rules(business_id);

-- Advanced features indexes
CREATE INDEX idx_lead_scores_business_id ON lead_scores(business_id);
CREATE INDEX idx_lead_scores_priority ON lead_scores(priority);
CREATE INDEX idx_lead_scores_created_at ON lead_scores(created_at);
CREATE INDEX idx_follow_up_schedule_business_id ON follow_up_schedule(business_id);
CREATE INDEX idx_follow_up_schedule_scheduled_date ON follow_up_schedule(scheduled_date);
CREATE INDEX idx_follow_up_schedule_status ON follow_up_schedule(status);
CREATE INDEX idx_market_intelligence_business_id ON market_intelligence(business_id);
CREATE INDEX idx_market_intelligence_type ON market_intelligence(analysis_type);
CREATE INDEX idx_market_intelligence_expires_at ON market_intelligence(expires_at);

-- System indexes
CREATE INDEX idx_audit_logs_business_id ON audit_logs(business_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_notifications_business_id ON notifications(business_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_system_health_service_name ON system_health(service_name);
CREATE INDEX idx_admin_analytics_date ON admin_analytics(date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
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
ALTER TABLE jarvis_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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

-- Jarvis policies
CREATE POLICY "Users can view their own jarvis interactions" ON jarvis_interactions
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own jarvis interactions" ON jarvis_interactions
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own jarvis commands" ON jarvis_commands
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own jarvis commands" ON jarvis_commands
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can update their own jarvis commands" ON jarvis_commands
    FOR UPDATE USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own jarvis insights" ON jarvis_insights
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own jarvis insights" ON jarvis_insights
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own jarvis business rules" ON jarvis_business_rules
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own jarvis business rules" ON jarvis_business_rules
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can update their own jarvis business rules" ON jarvis_business_rules
    FOR UPDATE USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Advanced features policies
CREATE POLICY "Users can view their own lead scores" ON lead_scores
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own lead scores" ON lead_scores
    FOR INSERT WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

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

CREATE POLICY "Users can view their own market intelligence" ON market_intelligence
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own market intelligence" ON market_intelligence
    FOR INSERT WITH CHECK (business_id IN (
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

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Cleanup functions
CREATE OR REPLACE FUNCTION cleanup_expired_market_intelligence()
RETURNS void AS $$
BEGIN
    DELETE FROM market_intelligence WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION cleanup_expired_jarvis_insights()
RETURNS void AS $$
BEGIN
    DELETE FROM jarvis_insights WHERE expires_at < NOW();
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

CREATE TRIGGER update_jarvis_commands_updated_at BEFORE UPDATE ON jarvis_commands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jarvis_business_rules_updated_at BEFORE UPDATE ON jarvis_business_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_scores_updated_at BEFORE UPDATE ON lead_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follow_up_schedule_updated_at BEFORE UPDATE ON follow_up_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GRANT PERMISSIONS
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
GRANT ALL ON jarvis_interactions TO authenticated;
GRANT ALL ON jarvis_commands TO authenticated;
GRANT ALL ON jarvis_insights TO authenticated;
GRANT ALL ON jarvis_business_rules TO authenticated;
GRANT ALL ON lead_scores TO authenticated;
GRANT ALL ON follow_up_schedule TO authenticated;
GRANT ALL ON market_intelligence TO authenticated;
GRANT ALL ON audit_logs TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON system_health TO authenticated;
GRANT ALL ON admin_analytics TO authenticated;

-- =====================================================
-- SEED DATA
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
('FIRST50', 'First month discount', 'fixed', 50.00, 50, true);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- This completes the full database setup
-- All tables, indexes, policies, functions, and triggers are now in place
-- The database is ready for CloudGreet with Jarvis AI
