-- Create missing database tables for production readiness

-- Phone integrations table
CREATE TABLE IF NOT EXISTS phone_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'inactive',
    call_count INTEGER DEFAULT 0,
    last_call TIMESTAMP WITH TIME ZONE,
    agent_id VARCHAR(100),
    webhook_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, phone_number)
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer profiles table
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    age_range VARCHAR(20),
    income_range VARCHAR(50),
    household_type VARCHAR(50),
    location_type VARCHAR(50),
    home_type VARCHAR(50),
    preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, customer_id)
);

-- Call recordings table
CREATE TABLE IF NOT EXISTS call_recordings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recording_url TEXT,
    duration INTEGER,
    format VARCHAR(10) DEFAULT 'mp3',
    file_size VARCHAR(20),
    quality VARCHAR(20) DEFAULT 'high',
    transcription_url TEXT,
    transcription_accuracy DECIMAL(5,2),
    language VARCHAR(10) DEFAULT 'en-US',
    word_count INTEGER,
    retention_policy VARCHAR(50) DEFAULT 'standard',
    compliance_status VARCHAR(50) DEFAULT 'compliant',
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(call_id)
);

-- Smart notifications table
CREATE TABLE IF NOT EXISTS smart_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'unread',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- System alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding progress table
CREATE TABLE IF NOT EXISTS onboarding_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_step VARCHAR(50) DEFAULT 'business_info',
    completed_steps TEXT[] DEFAULT '{}',
    skipped_steps TEXT[] DEFAULT '{}',
    progress_percentage INTEGER DEFAULT 0,
    step_data JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Download tokens table
CREATE TABLE IF NOT EXISTS download_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance logs table
CREATE TABLE IF NOT EXISTS compliance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    call_id VARCHAR(100),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin actions table
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monitoring settings table
CREATE TABLE IF NOT EXISTS monitoring_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thresholds JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Customer interactions table
CREATE TABLE IF NOT EXISTS customer_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL,
    notes TEXT,
    outcome VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer preferences table
CREATE TABLE IF NOT EXISTS customer_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    communication_method VARCHAR(20) DEFAULT 'phone',
    preferred_time VARCHAR(20) DEFAULT 'morning',
    special_instructions TEXT,
    marketing_opt_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, user_id)
);

-- Call analytics table
CREATE TABLE IF NOT EXISTS call_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sentiment_overall VARCHAR(20),
    sentiment_score DECIMAL(3,2),
    satisfaction_score DECIMAL(3,2),
    frustration_score DECIMAL(3,2),
    confusion_score DECIMAL(3,2),
    keywords TEXT[],
    topics TEXT[],
    clarity_score INTEGER,
    background_noise_score INTEGER,
    interruption_count INTEGER,
    customer_satisfaction VARCHAR(20),
    booking_probability DECIMAL(3,2),
    follow_up_required BOOLEAN DEFAULT FALSE,
    recommended_actions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(call_id)
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    answer_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'unread',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_phone_integrations_user_id ON phone_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_user_id ON customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_user_id ON call_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_call_id ON call_recordings(call_id);
CREATE INDEX IF NOT EXISTS idx_smart_notifications_user_id ON smart_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_notifications_created_at ON smart_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_system_alerts_user_id ON system_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_download_tokens_user_id ON download_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_download_tokens_expires_at ON download_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_user_id ON compliance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_email ON admin_actions(admin_email);
CREATE INDEX IF NOT EXISTS idx_monitoring_settings_user_id ON monitoring_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_id ON customer_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_user_id ON customer_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_preferences_customer_id ON customer_preferences(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_preferences_user_id ON customer_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_call_analytics_call_id ON call_analytics(call_id);
CREATE INDEX IF NOT EXISTS idx_call_analytics_user_id ON call_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Add RLS policies for security
ALTER TABLE phone_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only access their own data)
CREATE POLICY "Users can view own phone integrations" ON phone_integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own phone integrations" ON phone_integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own phone integrations" ON phone_integrations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own activity logs" ON activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity logs" ON activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own customer profiles" ON customer_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customer profiles" ON customer_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own customer profiles" ON customer_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own call recordings" ON call_recordings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own call recordings" ON call_recordings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own call recordings" ON call_recordings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own smart notifications" ON smart_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own smart notifications" ON smart_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own smart notifications" ON smart_notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own system alerts" ON system_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own system alerts" ON system_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own system alerts" ON system_alerts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own onboarding progress" ON onboarding_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onboarding progress" ON onboarding_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding progress" ON onboarding_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own download tokens" ON download_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own download tokens" ON download_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own compliance logs" ON compliance_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own compliance logs" ON compliance_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own monitoring settings" ON monitoring_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own monitoring settings" ON monitoring_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own monitoring settings" ON monitoring_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own customer interactions" ON customer_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customer interactions" ON customer_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own customer preferences" ON customer_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customer preferences" ON customer_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own customer preferences" ON customer_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own call analytics" ON call_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own call analytics" ON call_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own call analytics" ON call_analytics FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own analytics" ON analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analytics" ON analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analytics" ON analytics FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
