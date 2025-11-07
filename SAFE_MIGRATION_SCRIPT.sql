-- ===========================================
-- SAFE MIGRATION SCRIPT - Creates Missing Tables Only
-- ===========================================
-- This script creates tables ONLY if they don't exist
-- Safe to run on existing databases with data
-- ===========================================

-- Enable necessary extensions (safe - uses IF NOT EXISTS)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- CORE BUSINESS TABLES (with IF NOT EXISTS)
-- ===========================================

-- 1. Businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES auth.users(id) NOT NULL,
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    phone_number TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    website TEXT,
    description TEXT,
    services TEXT[],
    service_areas TEXT[],
    business_hours JSONB,
    greeting_message TEXT,
    tone TEXT DEFAULT 'professional',
    ai_tone TEXT DEFAULT 'professional',
    voice TEXT DEFAULT 'alloy',
    custom_instructions TEXT,
    max_call_duration INTEGER DEFAULT 10,
    escalation_threshold INTEGER DEFAULT 5,
    escalation_phone TEXT,
    retell_agent_id TEXT,
    enable_call_recording BOOLEAN DEFAULT FALSE,
    enable_transcription BOOLEAN DEFAULT FALSE,
    enable_sms_forwarding BOOLEAN DEFAULT FALSE,
    notification_phone TEXT,
    notification_email TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_step INTEGER DEFAULT 0,
    onboarding_data JSONB,
    enable_appointment_booking BOOLEAN DEFAULT FALSE,
    calendar_connected BOOLEAN DEFAULT FALSE,
    job_types TEXT[],
    average_appointment_duration INTEGER DEFAULT 60,
    account_status TEXT DEFAULT 'new_account',
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'inactive',
    billing_plan TEXT DEFAULT 'pro',
    promo_code_used TEXT,
    trial_end_date TIMESTAMP WITH TIME ZONE,
    is_trial_active BOOLEAN DEFAULT TRUE,
    google_calendar_access_token TEXT,
    google_calendar_refresh_token TEXT,
    google_calendar_expiry_date TIMESTAMP WITH TIME ZONE,
    after_hours_policy TEXT DEFAULT 'voicemail',
    timezone TEXT DEFAULT 'America/New_York',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.5. Consents table (SMS opt-in/opt-out tracking for TCPA/A2P compliance)
CREATE TABLE IF NOT EXISTS consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('STOP', 'UNSTOP', 'HELP')),
    channel TEXT DEFAULT 'sms',
    business_id UUID REFERENCES businesses(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for consents (safe - uses IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_consents_phone ON consents(phone);
CREATE INDEX IF NOT EXISTS idx_consents_business_id ON consents(business_id);
CREATE INDEX IF NOT EXISTS idx_consents_action ON consents(action);

-- 2. Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    business_id UUID REFERENCES businesses(id),
    role TEXT DEFAULT 'owner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Custom users table
CREATE TABLE IF NOT EXISTS custom_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    business_id UUID REFERENCES businesses(id),
    role TEXT DEFAULT 'owner',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- LEAD MANAGEMENT TABLES
-- ===========================================

-- 4. Leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    source TEXT,
    status TEXT DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enriched leads table
CREATE TABLE IF NOT EXISTS enriched_leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id),
    business_id UUID REFERENCES businesses(id),
    email TEXT,
    phone TEXT,
    linkedin_url TEXT,
    company_name TEXT,
    job_title TEXT,
    location TEXT,
    enrichment_data JSONB,
    enrichment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- APPOINTMENT TABLES
-- ===========================================

-- 6. Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    service_type TEXT,
    estimated_value DECIMAL(10, 2),
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- CALL & VOICE TABLES
-- ===========================================

-- 7. Calls table
CREATE TABLE IF NOT EXISTS calls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    call_id TEXT UNIQUE,
    from_number TEXT,
    to_number TEXT,
    direction TEXT,
    status TEXT,
    duration INTEGER,
    recording_url TEXT,
    transcript TEXT,
    ai_response TEXT,
    ai_session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. AI Agents table
CREATE TABLE IF NOT EXISTS ai_agents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    agent_name TEXT,
    retell_agent_id TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    greeting TEXT,
    services TEXT[],
    hours JSONB,
    configuration JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- SMS TABLES
-- ===========================================

-- 9. SMS Messages table
CREATE TABLE IF NOT EXISTS sms_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    direction TEXT NOT NULL,
    status TEXT,
    telnyx_message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- BILLING TABLES
-- ===========================================

-- 10. Stripe Customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) UNIQUE NOT NULL,
    stripe_customer_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Stripe Subscriptions table
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- WEBHOOK & SYSTEM TABLES
-- ===========================================

-- 12. Webhook Events table (for idempotency)
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 13. Health Checks table
CREATE TABLE IF NOT EXISTS health_checks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    check_type TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- CREATE INDEXES (Safe - uses IF NOT EXISTS)
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email);
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON leads(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_business_id ON appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_business_id ON ai_agents(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_business_id ON sms_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);

-- ===========================================
-- ENABLE ROW LEVEL SECURITY (Safe - won't error if already enabled)
-- ===========================================

DO $$
BEGIN
    -- Enable RLS on tables (won't error if already enabled)
    ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN NULL; -- Ignore if already enabled
END $$;

DO $$
BEGIN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ===========================================
-- VERIFICATION QUERY - Run this after migration
-- ===========================================

-- Check which tables were created
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('businesses', 'users', 'calls', 'appointments', 'ai_agents', 'sms_messages') 
        THEN '✅ CRITICAL'
        ELSE '✅ OPTIONAL'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;








