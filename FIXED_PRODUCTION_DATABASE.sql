-- =====================================================
-- CLOUDGREET FIXED PRODUCTION DATABASE SETUP
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
-- STEP 2: CREATE ALL TABLES (FIXED ORDER)
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

-- Businesses table (SECOND - references users)
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
    tone VARCHAR(20) DEFAULT 'professional' CHECK (tone IN ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')),
    ai_tone VARCHAR(20) DEFAULT 'professional' CHECK (ai_tone IN ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')),
    custom_instructions TEXT,
    max_call_duration INTEGER DEFAULT 10,
    escalation_threshold INTEGER DEFAULT 5,
    escalation_phone VARCHAR(20),
    notification_phone VARCHAR(20),
    notification_email VARCHAR(255),
    enable_call_recording BOOLEAN DEFAULT FALSE,
    enable_transcription BOOLEAN DEFAULT FALSE,
    enable_sms_forwarding BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    account_status VARCHAR(20) DEFAULT 'new_account' CHECK (account_status IN ('new_account', 'active', 'suspended', 'cancelled')),
    stripe_customer_id VARCHAR(255),
    subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
    billing_plan VARCHAR(50) DEFAULT 'trial' CHECK (billing_plan IN ('trial', 'basic', 'pro', 'enterprise')),
    promo_code_used VARCHAR(50),
    trial_end_date TIMESTAMP WITH TIME ZONE,
    is_trial_active BOOLEAN DEFAULT TRUE,
    calendar_connected BOOLEAN DEFAULT FALSE,
    google_calendar_access_token TEXT,
    google_calendar_refresh_token TEXT,
    google_calendar_expiry_date TIMESTAMP WITH TIME ZONE,
    after_hours_policy VARCHAR(50) DEFAULT 'voicemail' CHECK (after_hours_policy IN ('voicemail', 'sms', 'transfer', 'hangup')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Agents table
CREATE TABLE ai_agents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'training', 'error')),
    retell_agent_id VARCHAR(255),
    greeting_message TEXT,
    tone VARCHAR(20) DEFAULT 'professional' CHECK (tone IN ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')),
    prompt_template TEXT,
    custom_instructions TEXT,
    max_call_duration INTEGER DEFAULT 10,
    escalation_threshold INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Logs table
CREATE TABLE call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    call_id VARCHAR(255) UNIQUE NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('answered', 'missed', 'voicemail', 'busy', 'failed')),
    duration INTEGER DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    transcription_text TEXT,
    transcript JSONB,
    caller_name VARCHAR(255),
    caller_city VARCHAR(100),
    caller_state VARCHAR(50),
    caller_country VARCHAR(50),
    cost DECIMAL(10,4) DEFAULT 0,
    outcome VARCHAR(50),
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
    call_analysis JSONB,
    recording_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS Logs table
CREATE TABLE sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    message_text TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'pending')),
    message_id VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    service_type VARCHAR(100),
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    estimated_value DECIMAL(10,2),
    actual_value DECIMAL(10,2),
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripe Customers table
CREATE TABLE stripe_customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripe Subscriptions table
CREATE TABLE stripe_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid')),
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
    per_booking_fee DECIMAL(10,2) NOT NULL,
    max_bookings INTEGER,
    features TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promo Codes table
CREATE TABLE promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'trial_days')),
    discount_value DECIMAL(10,2),
    trial_days INTEGER,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Sessions table
CREATE TABLE chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    customer_phone VARCHAR(20),
    customer_name VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS Opt Outs table
CREATE TABLE sms_opt_outs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    opt_out_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jarvis Interactions table
CREATE TABLE jarvis_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL,
    interaction_data JSONB NOT NULL,
    response_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jarvis Commands table
CREATE TABLE jarvis_commands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    command VARCHAR(100) NOT NULL,
    parameters JSONB,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jarvis Insights table
CREATE TABLE jarvis_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL,
    insight_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jarvis Business Rules table
CREATE TABLE jarvis_business_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    rule_condition TEXT NOT NULL,
    rule_action TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead Scores table
CREATE TABLE lead_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    factors JSONB,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follow Up Schedule table
CREATE TABLE follow_up_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    follow_up_type VARCHAR(50) NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    message_template TEXT,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market Intelligence table
CREATE TABLE market_intelligence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    intelligence_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    metric_date DATE NOT NULL,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotes table
CREATE TABLE quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    service_type VARCHAR(100) NOT NULL,
    description TEXT,
    estimated_cost DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'rejected', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table
CREATE TABLE leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    source VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    notes TEXT,
    last_contact TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error Logs table
CREATE TABLE error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Analyses table
CREATE TABLE call_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL,
    analysis_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Callback Requests table
CREATE TABLE callback_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    preferred_time TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Tickets table
CREATE TABLE support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    business VARCHAR(255),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
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

-- Business indexes
CREATE INDEX idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX idx_businesses_email ON businesses(email);
CREATE INDEX idx_businesses_phone ON businesses(phone);
CREATE INDEX idx_businesses_subscription_status ON businesses(subscription_status);

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_business_id ON users(business_id);

-- Call log indexes
CREATE INDEX idx_call_logs_business_id ON call_logs(business_id);
CREATE INDEX idx_call_logs_call_id ON call_logs(call_id);
CREATE INDEX idx_call_logs_from_number ON call_logs(from_number);
CREATE INDEX idx_call_logs_created_at ON call_logs(created_at);

-- SMS log indexes
CREATE INDEX idx_sms_logs_business_id ON sms_logs(business_id);
CREATE INDEX idx_sms_logs_from_number ON sms_logs(from_number);
CREATE INDEX idx_sms_logs_to_number ON sms_logs(to_number);
CREATE INDEX idx_sms_logs_created_at ON sms_logs(created_at);

-- Appointment indexes
CREATE INDEX idx_appointments_business_id ON appointments(business_id);
CREATE INDEX idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_customer_phone ON appointments(customer_phone);

-- Audit log indexes
CREATE INDEX idx_audit_logs_business_id ON audit_logs(business_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Notification indexes
CREATE INDEX idx_notifications_business_id ON notifications(business_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- =====================================================
-- STEP 5: CREATE FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_call_logs_updated_at BEFORE UPDATE ON call_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_logs_updated_at BEFORE UPDATE ON sms_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stripe_customers_updated_at BEFORE UPDATE ON stripe_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stripe_subscriptions_updated_at BEFORE UPDATE ON stripe_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_plans_updated_at BEFORE UPDATE ON pricing_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON promo_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jarvis_business_rules_updated_at BEFORE UPDATE ON jarvis_business_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_follow_up_schedule_updated_at BEFORE UPDATE ON follow_up_schedule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_callback_requests_updated_at BEFORE UPDATE ON callback_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 6: ROW LEVEL SECURITY (RLS) POLICIES
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
ALTER TABLE jarvis_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE callback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for multi-tenancy
-- Users can only access their own data and their business data
CREATE POLICY "Users can access own data" ON users FOR ALL USING (auth.uid()::text = id::text);
CREATE POLICY "Users can access business data" ON businesses FOR ALL USING (auth.uid()::text = owner_id::text);
CREATE POLICY "Users can access AI agents" ON ai_agents FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access call logs" ON call_logs FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access SMS logs" ON sms_logs FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access appointments" ON appointments FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access Stripe data" ON stripe_customers FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access Stripe subscriptions" ON stripe_subscriptions FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access chat sessions" ON chat_sessions FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access jarvis data" ON jarvis_interactions FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access jarvis commands" ON jarvis_commands FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access jarvis insights" ON jarvis_insights FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access jarvis rules" ON jarvis_business_rules FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access lead scores" ON lead_scores FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access follow up schedule" ON follow_up_schedule FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access market intelligence" ON market_intelligence FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access notifications" ON notifications FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access quotes" ON quotes FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access leads" ON leads FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access callback requests" ON callback_requests FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));
CREATE POLICY "Users can access support tickets" ON support_tickets FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id::text = auth.uid()::text));

-- =====================================================
-- STEP 7: GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions to service role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =====================================================
-- STEP 8: SEED INITIAL DATA
-- =====================================================

-- Insert default pricing plans
INSERT INTO pricing_plans (name, description, monthly_price, per_booking_fee, max_bookings, features) VALUES
('Basic', 'Perfect for small businesses just getting started', 99.00, 5.00, 50, ARRAY['Unlimited calls', 'Basic SMS', 'Email support']),
('Pro', 'Most popular plan for growing businesses', 199.00, 3.00, 200, ARRAY['Unlimited calls', 'Advanced SMS', 'Priority support', 'Analytics dashboard']),
('Enterprise', 'For businesses with high call volume', 399.00, 2.00, 1000, ARRAY['Unlimited calls', 'Premium SMS', '24/7 support', 'Advanced analytics', 'Custom integrations']);

-- Insert default promo codes
INSERT INTO promo_codes (code, description, discount_type, trial_days, max_uses, is_active) VALUES
('7FREE', '7-day free trial', 'trial_days', 7, 1000, true),
('LAUNCH50', '50% off first month', 'percentage', NULL, 100, true),
('WELCOME', 'Free setup and first month', 'fixed', NULL, 50, true);

-- =====================================================
-- STEP 9: CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete old audit logs (older than 90 days)
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Delete old error logs (older than 30 days)
    DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Delete old system health records (older than 7 days)
    DELETE FROM system_health WHERE created_at < NOW() - INTERVAL '7 days';
    
    -- Update expired trials
    UPDATE businesses 
    SET subscription_status = 'inactive', is_trial_active = false 
    WHERE is_trial_active = true AND trial_end_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETE! DATABASE IS READY FOR PRODUCTION
-- =====================================================

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ CloudGreet Production Database Setup Complete!';
    RAISE NOTICE '📊 All tables created successfully';
    RAISE NOTICE '🔒 Row Level Security enabled';
    RAISE NOTICE '⚡ Performance indexes created';
    RAISE NOTICE '🎯 Multi-tenant architecture ready';
    RAISE NOTICE '🚀 Ready for production deployment!';
END $$;
