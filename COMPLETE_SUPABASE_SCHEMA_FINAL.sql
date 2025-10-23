-- ===========================================
-- CLOUDGREET COMPLETE DATABASE SCHEMA - FINAL
-- ALL 70+ TABLES REFERENCED IN CODEBASE
-- ===========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- CORE BUSINESS TABLES
-- ===========================================

-- 1. Businesses table (main business information)
CREATE TABLE businesses (
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
    onboarding_completed BOOLEAN DEFAULT FALSE,
    account_status TEXT DEFAULT 'new_account',
    subscription_status TEXT DEFAULT 'inactive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Users table (extends Supabase auth.users)
CREATE TABLE users (
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
CREATE TABLE custom_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    business_id UUID REFERENCES businesses(id),
    role TEXT DEFAULT 'owner',
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'active',
    login_count INTEGER DEFAULT 0,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- LEAD MANAGEMENT TABLES
-- ===========================================

-- 4. Leads table (customer leads)
CREATE TABLE leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT DEFAULT 'phone',
    status TEXT DEFAULT 'new',
    notes TEXT,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enriched leads table (Apollo Killer feature)
CREATE TABLE enriched_leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    business_name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    phone TEXT,
    website TEXT,
    google_place_id TEXT UNIQUE,
    business_type TEXT,
    google_rating DECIMAL(3,2),
    google_review_count INTEGER DEFAULT 0,
    owner_name TEXT,
    owner_title TEXT,
    owner_email TEXT,
    owner_email_verified BOOLEAN DEFAULT FALSE,
    owner_email_confidence DECIMAL(3,2),
    owner_phone TEXT,
    owner_linkedin_url TEXT,
    enrichment_status TEXT DEFAULT 'pending',
    enrichment_sources TEXT[] DEFAULT '{}',
    enrichment_attempts INTEGER DEFAULT 0,
    last_enriched_at TIMESTAMP WITH TIME ZONE,
    total_score INTEGER DEFAULT 0,
    fit_score INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 0,
    contact_quality_score INTEGER DEFAULT 0,
    opportunity_score INTEGER DEFAULT 0,
    urgency_score INTEGER DEFAULT 0,
    personalized_pitch TEXT,
    pain_points TEXT[] DEFAULT '{}',
    recommended_approach TEXT,
    best_contact_time TEXT,
    objections_anticipated TEXT[] DEFAULT '{}',
    employee_count_min INTEGER,
    employee_count_max INTEGER,
    annual_revenue_min DECIMAL(15,2),
    annual_revenue_max DECIMAL(15,2),
    technology_stack TEXT[],
    social_media TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enrichment queue table
CREATE TABLE enrichment_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    lead_id UUID REFERENCES enriched_leads(id),
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Bulk enrichment jobs table
CREATE TABLE bulk_enrichment_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    job_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    total_leads INTEGER DEFAULT 0,
    processed_leads INTEGER DEFAULT 0,
    failed_leads INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Bulk enrichment logs table
CREATE TABLE bulk_enrichment_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES bulk_enrichment_jobs(id) NOT NULL,
    lead_id UUID REFERENCES enriched_leads(id),
    status TEXT NOT NULL,
    error_message TEXT,
    processing_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- APPOINTMENT & SCHEDULING TABLES
-- ===========================================

-- 9. Appointments table (scheduled appointments)
CREATE TABLE appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    lead_id UUID REFERENCES leads(id),
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'scheduled',
    estimated_value DECIMAL(10,2),
    actual_value DECIMAL(10,2),
    google_calendar_event_id TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    confirmation_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Appointment reminders table
CREATE TABLE appointment_reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    appointment_id UUID REFERENCES appointments(id) NOT NULL,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    reminder_type TEXT NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending',
    message_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Calendar events table
CREATE TABLE calendar_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    appointment_id UUID REFERENCES appointments(id),
    google_event_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- CALL MANAGEMENT TABLES
-- ===========================================

-- 12. Calls table (call logs and recordings)
CREATE TABLE calls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    lead_id UUID REFERENCES leads(id),
    call_id TEXT UNIQUE NOT NULL,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    status TEXT NOT NULL,
    direction TEXT DEFAULT 'inbound',
    duration INTEGER DEFAULT 0,
    recording_url TEXT,
    transcript TEXT,
    quality_score INTEGER,
    caller_name TEXT,
    caller_city TEXT,
    caller_state TEXT,
    service_requested TEXT,
    urgency TEXT,
    budget_mentioned DECIMAL(10,2),
    notes TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    ai_response TEXT,
    ai_session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Call logs table
CREATE TABLE call_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    call_id TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    agent_id TEXT,
    call_duration INTEGER DEFAULT 0,
    call_status TEXT DEFAULT 'completed',
    service_requested TEXT,
    urgency TEXT,
    estimated_value DECIMAL(10,2) DEFAULT 0,
    conversion_outcome TEXT,
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    satisfaction_rating INTEGER,
    transcript TEXT,
    recording_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Call conversations table
CREATE TABLE call_conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    call_id TEXT NOT NULL,
    conversation_data JSONB NOT NULL,
    summary TEXT,
    sentiment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Toll free numbers table (phone numbers)
CREATE TABLE toll_free_numbers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active',
    webhook_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- AI & AUTOMATION TABLES
-- ===========================================

-- 16. AI agents table (AI configuration)
CREATE TABLE ai_agents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    name TEXT NOT NULL,
    configuration JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. AI agent settings table
CREATE TABLE ai_agent_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    agent_type TEXT NOT NULL,
    settings JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. Realtime sessions table (for AI conversations)
CREATE TABLE realtime_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    session_id TEXT UNIQUE NOT NULL,
    call_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Conversation history table
CREATE TABLE conversation_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    session_id TEXT,
    call_id TEXT,
    user_message TEXT,
    ai_response TEXT,
    intent TEXT,
    entities JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. Conversations table
CREATE TABLE conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    lead_id UUID REFERENCES leads(id),
    call_id TEXT,
    messages JSONB NOT NULL,
    summary TEXT,
    sentiment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. AI conversation analytics table
CREATE TABLE ai_conversation_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    conversation_id UUID REFERENCES conversations(id),
    metrics JSONB NOT NULL,
    insights TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- SMS & MESSAGING TABLES
-- ===========================================

-- 22. SMS messages table
CREATE TABLE sms_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    lead_id UUID REFERENCES leads(id),
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    message TEXT NOT NULL,
    direction TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. SMS logs table
CREATE TABLE sms_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    direction TEXT DEFAULT 'outbound',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 24. SMS templates table
CREATE TABLE sms_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    template_name TEXT NOT NULL,
    template_content TEXT NOT NULL,
    template_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 25. SMS opt-outs table
CREATE TABLE sms_opt_outs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    phone_number TEXT NOT NULL,
    opt_out_type TEXT DEFAULT 'STOP',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- AUTHENTICATION & SECURITY TABLES
-- ===========================================

-- 26. Password reset tokens table
CREATE TABLE password_reset_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 27. Audit logs table
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- BILLING & PAYMENT TABLES
-- ===========================================

-- 28. Billing history table
CREATE TABLE billing_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    description TEXT,
    billing_type TEXT NOT NULL,
    stripe_payment_intent_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 29. Stripe customers table
CREATE TABLE stripe_customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    stripe_customer_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 30. Stripe subscriptions table
CREATE TABLE stripe_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    status TEXT NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 31. Payment methods table
CREATE TABLE payment_methods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    stripe_payment_method_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 32. Refunds table
CREATE TABLE refunds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    stripe_refund_id TEXT UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 33. Invoices table
CREATE TABLE invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 34. Subscription usage table
CREATE TABLE subscription_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    subscription_id UUID REFERENCES stripe_subscriptions(id),
    usage_type TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    usage_limit INTEGER,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 35. Coupon usage table
CREATE TABLE coupon_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    coupon_code TEXT NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- CONTACT & SUPPORT TABLES
-- ===========================================

-- 36. Contact submissions table
CREATE TABLE contact_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    business TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 37. Contact activities table
CREATE TABLE contact_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    lead_id UUID REFERENCES leads(id),
    activity_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- AUTOMATION & CAMPAIGN TABLES
-- ===========================================

-- 38. Follow-up tasks table
CREATE TABLE follow_up_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    lead_id UUID REFERENCES leads(id),
    task_type TEXT NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 39. Follow-up sequence table
CREATE TABLE follow_up_sequence (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    trigger_event TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 40. Campaigns table
CREATE TABLE campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 41. Follow-up sequences table
CREATE TABLE follow_up_sequences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    trigger_event TEXT NOT NULL,
    trigger_delay INTEGER DEFAULT 0,
    conditions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 42. Follow-up steps table
CREATE TABLE follow_up_steps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sequence_id UUID REFERENCES follow_up_sequences(id) NOT NULL,
    step_number INTEGER NOT NULL,
    step_type TEXT NOT NULL,
    content TEXT,
    delay_hours INTEGER DEFAULT 0,
    conditions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 43. Nurture campaigns table
CREATE TABLE nurture_campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    target_segment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 44. Campaign performance table
CREATE TABLE campaign_performance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES nurture_campaigns(id) NOT NULL,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    metrics JSONB NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 45. Scheduled calls table
CREATE TABLE scheduled_calls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    lead_id UUID REFERENCES leads(id),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- LEAD SEGMENTATION & TARGETING TABLES
-- ===========================================

-- 46. Lead segments table
CREATE TABLE lead_segments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 47. Segmentation rules table
CREATE TABLE segmentation_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    segment_id UUID REFERENCES lead_segments(id) NOT NULL,
    field_name TEXT NOT NULL,
    operator TEXT NOT NULL,
    value TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 48. Targeting campaigns table
CREATE TABLE targeting_campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    segment_id UUID REFERENCES lead_segments(id) NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- ANALYTICS & ATTRIBUTION TABLES
-- ===========================================

-- 49. Attribution models table
CREATE TABLE attribution_models (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    name TEXT NOT NULL,
    model_type TEXT NOT NULL,
    configuration JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 50. Lead sources table
CREATE TABLE lead_sources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    configuration JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 51. Lead attribution table
CREATE TABLE lead_attribution (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    lead_id UUID REFERENCES leads(id) NOT NULL,
    source_id UUID REFERENCES lead_sources(id),
    touchpoints JSONB NOT NULL,
    attribution_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 52. Lead scoring table
CREATE TABLE lead_scoring (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    lead_id UUID REFERENCES leads(id) NOT NULL,
    score INTEGER NOT NULL,
    scoring_factors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- CRM & PIPELINE TABLES
-- ===========================================

-- 53. CRM pipelines table
CREATE TABLE crm_pipelines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 54. Pipeline stages table
CREATE TABLE pipeline_stages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pipeline_id UUID REFERENCES crm_pipelines(id) NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    stage_type TEXT NOT NULL,
    configuration JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- A/B TESTING TABLES
-- ===========================================

-- 55. AB tests table
CREATE TABLE ab_tests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    test_type TEXT NOT NULL,
    configuration JSONB NOT NULL,
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- SYSTEM & ADMIN TABLES
-- ===========================================

-- 56. Notifications table
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 57. Data exports table
CREATE TABLE data_exports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    export_type TEXT NOT NULL,
    file_url TEXT,
    status TEXT DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 58. System events table
CREATE TABLE system_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 59. System health table
CREATE TABLE system_health (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    service_name TEXT NOT NULL,
    status TEXT NOT NULL,
    response_time INTEGER,
    error_count INTEGER DEFAULT 0,
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 60. Performance metrics table
CREATE TABLE performance_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    metric_type TEXT NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 61. Scheduled maintenance table
CREATE TABLE scheduled_maintenance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 62. Webhook logs table
CREATE TABLE webhook_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    webhook_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- PRICING & QUOTES TABLES
-- ===========================================

-- 63. Pricing rules table
CREATE TABLE pricing_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    service_type TEXT NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    pricing_model TEXT NOT NULL,
    rules JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 64. Pricing plans table
CREATE TABLE pricing_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle TEXT NOT NULL,
    features JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 65. Quotes table
CREATE TABLE quotes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    lead_id UUID REFERENCES leads(id),
    quote_number TEXT UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    line_items JSONB NOT NULL,
    status TEXT DEFAULT 'draft',
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 66. Promo codes table
CREATE TABLE promo_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 67. Finance table
CREATE TABLE finance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    transaction_type TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- ADVANCED REVENUE TABLES
-- ===========================================

-- 68. Upsell opportunities table
CREATE TABLE upsell_opportunities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    lead_id UUID REFERENCES leads(id),
    opportunity_type TEXT NOT NULL,
    potential_value DECIMAL(10,2) NOT NULL,
    probability DECIMAL(3,2),
    status TEXT DEFAULT 'identified',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 69. Pricing optimization log table
CREATE TABLE pricing_optimization_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    optimization_type TEXT NOT NULL,
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    impact_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 70. Competitor analysis table
CREATE TABLE competitor_analysis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    competitor_name TEXT NOT NULL,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 71. Retention analysis table
CREATE TABLE retention_analysis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    analysis_period TEXT NOT NULL,
    retention_rate DECIMAL(5,2),
    churn_rate DECIMAL(5,2),
    analysis_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 72. Revenue forecasts table
CREATE TABLE revenue_forecasts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    forecast_period TEXT NOT NULL,
    predicted_revenue DECIMAL(15,2),
    confidence_level DECIMAL(3,2),
    forecast_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 73. Revenue optimization settings table
CREATE TABLE revenue_optimization_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    optimization_type TEXT NOT NULL,
    settings JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- ADMIN CUSTOMIZATION TABLES
-- ===========================================

-- 74. Business templates table
CREATE TABLE business_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    template_type TEXT NOT NULL,
    template_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 75. Pricing settings table
CREATE TABLE pricing_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    pricing_model TEXT NOT NULL,
    settings JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- MACHINE LEARNING TABLES
-- ===========================================

-- 76. ML training data table
CREATE TABLE ml_training_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) NOT NULL,
    data_type TEXT NOT NULL,
    training_data JSONB NOT NULL,
    model_version TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Business indexes
CREATE INDEX idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX idx_businesses_phone_number ON businesses(phone_number);

-- User indexes
CREATE INDEX idx_users_business_id ON users(business_id);
CREATE INDEX idx_custom_users_business_id ON custom_users(business_id);

-- Lead indexes
CREATE INDEX idx_leads_business_id ON leads(business_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_enriched_leads_business_id ON enriched_leads(business_id);
CREATE INDEX idx_enrichment_queue_business_id ON enrichment_queue(business_id);
CREATE INDEX idx_bulk_enrichment_jobs_business_id ON bulk_enrichment_jobs(business_id);

-- Appointment indexes
CREATE INDEX idx_appointments_business_id ON appointments(business_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointment_reminders_appointment_id ON appointment_reminders(appointment_id);
CREATE INDEX idx_calendar_events_business_id ON calendar_events(business_id);

-- Call indexes
CREATE INDEX idx_calls_business_id ON calls(business_id);
CREATE INDEX idx_calls_call_id ON calls(call_id);
CREATE INDEX idx_calls_from_number ON calls(from_number);
CREATE INDEX idx_call_logs_business_id ON call_logs(business_id);
CREATE INDEX idx_call_conversations_business_id ON call_conversations(business_id);
CREATE INDEX idx_toll_free_numbers_business_id ON toll_free_numbers(business_id);
CREATE INDEX idx_toll_free_numbers_phone_number ON toll_free_numbers(phone_number);

-- AI indexes
CREATE INDEX idx_ai_agents_business_id ON ai_agents(business_id);
CREATE INDEX idx_ai_agent_settings_business_id ON ai_agent_settings(business_id);
CREATE INDEX idx_realtime_sessions_business_id ON realtime_sessions(business_id);
CREATE INDEX idx_realtime_sessions_session_id ON realtime_sessions(session_id);
CREATE INDEX idx_conversation_history_business_id ON conversation_history(business_id);
CREATE INDEX idx_conversations_business_id ON conversations(business_id);
CREATE INDEX idx_ai_conversation_analytics_business_id ON ai_conversation_analytics(business_id);

-- SMS indexes
CREATE INDEX idx_sms_messages_business_id ON sms_messages(business_id);
CREATE INDEX idx_sms_messages_to_number ON sms_messages(to_number);
CREATE INDEX idx_sms_logs_business_id ON sms_logs(business_id);
CREATE INDEX idx_sms_templates_business_id ON sms_templates(business_id);
CREATE INDEX idx_sms_opt_outs_phone_number ON sms_opt_outs(phone_number);

-- Auth indexes
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_audit_logs_business_id ON audit_logs(business_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- Billing indexes
CREATE INDEX idx_billing_history_business_id ON billing_history(business_id);
CREATE INDEX idx_stripe_customers_business_id ON stripe_customers(business_id);
CREATE INDEX idx_stripe_subscriptions_business_id ON stripe_subscriptions(business_id);
CREATE INDEX idx_payment_methods_business_id ON payment_methods(business_id);
CREATE INDEX idx_refunds_business_id ON refunds(business_id);
CREATE INDEX idx_invoices_business_id ON invoices(business_id);
CREATE INDEX idx_subscription_usage_business_id ON subscription_usage(business_id);
CREATE INDEX idx_coupon_usage_business_id ON coupon_usage(business_id);

-- Activity indexes
CREATE INDEX idx_contact_activities_business_id ON contact_activities(business_id);
CREATE INDEX idx_follow_up_tasks_business_id ON follow_up_tasks(business_id);
CREATE INDEX idx_follow_up_sequence_business_id ON follow_up_sequence(business_id);
CREATE INDEX idx_campaigns_business_id ON campaigns(business_id);
CREATE INDEX idx_scheduled_calls_business_id ON scheduled_calls(business_id);

-- Automation indexes
CREATE INDEX idx_follow_up_sequences_business_id ON follow_up_sequences(business_id);
CREATE INDEX idx_follow_up_steps_sequence_id ON follow_up_steps(sequence_id);
CREATE INDEX idx_nurture_campaigns_business_id ON nurture_campaigns(business_id);
CREATE INDEX idx_campaign_performance_campaign_id ON campaign_performance(campaign_id);

-- Segmentation indexes
CREATE INDEX idx_lead_segments_business_id ON lead_segments(business_id);
CREATE INDEX idx_segmentation_rules_segment_id ON segmentation_rules(segment_id);
CREATE INDEX idx_targeting_campaigns_business_id ON targeting_campaigns(business_id);

-- Analytics indexes
CREATE INDEX idx_attribution_models_business_id ON attribution_models(business_id);
CREATE INDEX idx_lead_sources_business_id ON lead_sources(business_id);
CREATE INDEX idx_lead_attribution_business_id ON lead_attribution(business_id);
CREATE INDEX idx_lead_scoring_business_id ON lead_scoring(business_id);

-- CRM indexes
CREATE INDEX idx_crm_pipelines_business_id ON crm_pipelines(business_id);
CREATE INDEX idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);

-- A/B Testing indexes
CREATE INDEX idx_ab_tests_business_id ON ab_tests(business_id);

-- System indexes
CREATE INDEX idx_notifications_business_id ON notifications(business_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_data_exports_business_id ON data_exports(business_id);
CREATE INDEX idx_system_health_service_name ON system_health(service_name);
CREATE INDEX idx_performance_metrics_business_id ON performance_metrics(business_id);

-- Pricing indexes
CREATE INDEX idx_pricing_rules_business_id ON pricing_rules(business_id);
CREATE INDEX idx_pricing_plans_name ON pricing_plans(name);
CREATE INDEX idx_quotes_business_id ON quotes(business_id);
CREATE INDEX idx_quotes_lead_id ON quotes(lead_id);
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_finance_business_id ON finance(business_id);

-- Advanced Revenue indexes
CREATE INDEX idx_upsell_opportunities_business_id ON upsell_opportunities(business_id);
CREATE INDEX idx_pricing_optimization_log_business_id ON pricing_optimization_log(business_id);
CREATE INDEX idx_competitor_analysis_business_id ON competitor_analysis(business_id);
CREATE INDEX idx_retention_analysis_business_id ON retention_analysis(business_id);
CREATE INDEX idx_revenue_forecasts_business_id ON revenue_forecasts(business_id);
CREATE INDEX idx_revenue_optimization_settings_business_id ON revenue_optimization_settings(business_id);

-- Admin indexes
CREATE INDEX idx_business_templates_business_id ON business_templates(business_id);
CREATE INDEX idx_pricing_settings_business_id ON pricing_settings(business_id);
CREATE INDEX idx_ml_training_data_business_id ON ml_training_data(business_id);

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE enriched_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_enrichment_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_enrichment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE toll_free_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequence ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurture_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE segmentation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE targeting_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE upsell_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_optimization_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_optimization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_data ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS POLICIES FOR MULTI-TENANT SECURITY
-- ===========================================

-- Business policies
CREATE POLICY "Users can view their own business" ON businesses
    FOR ALL USING (auth.uid() = owner_id);

-- User policies
CREATE POLICY "Users can view their own profile" ON users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can view their own custom profile" ON custom_users
    FOR ALL USING (auth.uid() = id OR business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Lead policies
CREATE POLICY "Users can view their own leads" ON leads
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own enriched leads" ON enriched_leads
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own enrichment queue" ON enrichment_queue
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own bulk enrichment jobs" ON bulk_enrichment_jobs
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own bulk enrichment logs" ON bulk_enrichment_logs
    FOR ALL USING (job_id IN (
        SELECT id FROM bulk_enrichment_jobs WHERE business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    ));

-- Appointment policies
CREATE POLICY "Users can view their own appointments" ON appointments
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own appointment reminders" ON appointment_reminders
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own calendar events" ON calendar_events
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Call policies
CREATE POLICY "Users can view their own calls" ON calls
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own call logs" ON call_logs
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own call conversations" ON call_conversations
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own phone numbers" ON toll_free_numbers
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- AI policies
CREATE POLICY "Users can view their own AI agents" ON ai_agents
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own AI agent settings" ON ai_agent_settings
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own realtime sessions" ON realtime_sessions
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own conversation history" ON conversation_history
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own conversations" ON conversations
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own AI conversation analytics" ON ai_conversation_analytics
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- SMS policies
CREATE POLICY "Users can view their own SMS messages" ON sms_messages
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own SMS logs" ON sms_logs
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own SMS templates" ON sms_templates
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own SMS opt-outs" ON sms_opt_outs
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Auth policies
CREATE POLICY "Users can view their own password reset tokens" ON password_reset_tokens
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ) OR user_id = auth.uid());

-- Billing policies
CREATE POLICY "Users can view their own billing history" ON billing_history
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own stripe customers" ON stripe_customers
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own subscriptions" ON stripe_subscriptions
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own payment methods" ON payment_methods
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own refunds" ON refunds
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own invoices" ON invoices
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own subscription usage" ON subscription_usage
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own coupon usage" ON coupon_usage
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Activity policies
CREATE POLICY "Users can view their own contact activities" ON contact_activities
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own follow-up tasks" ON follow_up_tasks
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own follow-up sequence" ON follow_up_sequence
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own campaigns" ON campaigns
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own scheduled calls" ON scheduled_calls
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Automation policies
CREATE POLICY "Users can view their own follow-up sequences" ON follow_up_sequences
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own follow-up steps" ON follow_up_steps
    FOR ALL USING (sequence_id IN (
        SELECT id FROM follow_up_sequences WHERE business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    ));

CREATE POLICY "Users can view their own nurture campaigns" ON nurture_campaigns
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own campaign performance" ON campaign_performance
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Segmentation policies
CREATE POLICY "Users can view their own lead segments" ON lead_segments
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own segmentation rules" ON segmentation_rules
    FOR ALL USING (segment_id IN (
        SELECT id FROM lead_segments WHERE business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    ));

CREATE POLICY "Users can view their own targeting campaigns" ON targeting_campaigns
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Analytics policies
CREATE POLICY "Users can view their own attribution models" ON attribution_models
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own lead sources" ON lead_sources
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own lead attribution" ON lead_attribution
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own lead scoring" ON lead_scoring
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- CRM policies
CREATE POLICY "Users can view their own CRM pipelines" ON crm_pipelines
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own pipeline stages" ON pipeline_stages
    FOR ALL USING (pipeline_id IN (
        SELECT id FROM crm_pipelines WHERE business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    ));

-- A/B Testing policies
CREATE POLICY "Users can view their own AB tests" ON ab_tests
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- System policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ) OR user_id = auth.uid());

CREATE POLICY "Users can view their own data exports" ON data_exports
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own performance metrics" ON performance_metrics
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Pricing policies
CREATE POLICY "Users can view their own pricing rules" ON pricing_rules
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own quotes" ON quotes
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own finance records" ON finance
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Advanced Revenue policies
CREATE POLICY "Users can view their own upsell opportunities" ON upsell_opportunities
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own pricing optimization log" ON pricing_optimization_log
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own competitor analysis" ON competitor_analysis
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own retention analysis" ON retention_analysis
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own revenue forecasts" ON revenue_forecasts
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own revenue optimization settings" ON revenue_optimization_settings
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Admin policies
CREATE POLICY "Users can view their own business templates" ON business_templates
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own pricing settings" ON pricing_settings
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view their own ML training data" ON ml_training_data
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Public tables (no RLS needed)
-- contact_submissions, system_events, scheduled_maintenance, promo_codes, pricing_plans, webhook_logs, system_health
