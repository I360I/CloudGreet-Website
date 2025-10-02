-- Admin Customization Tables for CloudGreet
-- Run this in your Supabase SQL editor

-- AI Agent Settings Table
CREATE TABLE IF NOT EXISTS ai_agent_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id TEXT NOT NULL,
    personality TEXT DEFAULT 'friendly' CHECK (personality IN ('professional', 'friendly', 'enthusiastic', 'calm')),
    response_speed TEXT DEFAULT 'normal' CHECK (response_speed IN ('fast', 'normal', 'deliberate')),
    business_hours TEXT DEFAULT '9 AM - 5 PM, Monday - Friday',
    voice TEXT DEFAULT 'alloy' CHECK (voice IN ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')),
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS Templates Table
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id TEXT NOT NULL,
    appointment_confirmation TEXT DEFAULT 'Hi [Name], your appointment is confirmed for [Date] at [Time]. We''ll see you then! Reply STOP to opt out.',
    follow_up TEXT DEFAULT 'Hi [Name], how was your service? We''d love your feedback! Reply STOP to opt out.',
    reminder TEXT DEFAULT 'Hi [Name], this is a reminder about your appointment tomorrow at [Time]. Reply STOP to opt out.',
    cancellation TEXT DEFAULT 'Hi [Name], your appointment has been cancelled. Please call us to reschedule. Reply STOP to opt out.',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Templates Table
CREATE TABLE IF NOT EXISTS business_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id TEXT NOT NULL,
    business_name TEXT DEFAULT 'Your Business Name',
    services TEXT DEFAULT 'Painting, HVAC, Plumbing',
    service_area TEXT DEFAULT 'Local Area',
    description TEXT DEFAULT 'Professional service business',
    website TEXT DEFAULT 'https://yourbusiness.com',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing Settings Table
CREATE TABLE IF NOT EXISTS pricing_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id TEXT NOT NULL,
    monthly_price DECIMAL(10,2) DEFAULT 200.00,
    per_booking_price DECIMAL(10,2) DEFAULT 50.00,
    trial_days INTEGER DEFAULT 7,
    currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_agent_settings_business_id ON ai_agent_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_business_id ON sms_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_business_templates_business_id ON business_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_pricing_settings_business_id ON pricing_settings(business_id);

-- Enable Row Level Security
ALTER TABLE ai_agent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;

-- Create policies (allow admin access)
CREATE POLICY "Admin can manage AI agent settings" ON ai_agent_settings
    FOR ALL USING (true);

CREATE POLICY "Admin can manage SMS templates" ON sms_templates
    FOR ALL USING (true);

CREATE POLICY "Admin can manage business templates" ON business_templates
    FOR ALL USING (true);

CREATE POLICY "Admin can manage pricing settings" ON pricing_settings
    FOR ALL USING (true);

-- Add unique constraints to prevent duplicates (must be done before inserts)
ALTER TABLE ai_agent_settings ADD CONSTRAINT unique_business_ai_settings UNIQUE (business_id);
ALTER TABLE sms_templates ADD CONSTRAINT unique_business_sms_templates UNIQUE (business_id);
ALTER TABLE business_templates ADD CONSTRAINT unique_business_templates UNIQUE (business_id);
ALTER TABLE pricing_settings ADD CONSTRAINT unique_business_pricing UNIQUE (business_id);

-- Insert default admin global settings
INSERT INTO ai_agent_settings (business_id, personality, response_speed, business_hours, voice, language)
VALUES ('admin-global', 'friendly', 'normal', '9 AM - 5 PM, Monday - Friday', 'alloy', 'en')
ON CONFLICT (business_id) DO NOTHING;

INSERT INTO sms_templates (business_id)
VALUES ('admin-global')
ON CONFLICT (business_id) DO NOTHING;

INSERT INTO business_templates (business_id)
VALUES ('admin-global')
ON CONFLICT (business_id) DO NOTHING;

INSERT INTO pricing_settings (business_id)
VALUES ('admin-global')
ON CONFLICT (business_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE ai_agent_settings IS 'Global AI agent configuration settings for admin customization';
COMMENT ON TABLE sms_templates IS 'Global SMS message templates for admin customization';
COMMENT ON TABLE business_templates IS 'Global business profile templates for admin customization';
COMMENT ON TABLE pricing_settings IS 'Global pricing configuration for admin customization';

COMMENT ON COLUMN ai_agent_settings.personality IS 'AI agent personality: professional, friendly, enthusiastic, calm';
COMMENT ON COLUMN ai_agent_settings.response_speed IS 'AI response speed: fast (1-2s), normal (2-3s), deliberate (3-4s)';
COMMENT ON COLUMN ai_agent_settings.voice IS 'Retell AI voice ID for speech synthesis';
COMMENT ON COLUMN sms_templates.appointment_confirmation IS 'Template for appointment confirmation SMS';
COMMENT ON COLUMN sms_templates.follow_up IS 'Template for service follow-up SMS';
COMMENT ON COLUMN pricing_settings.monthly_price IS 'Monthly subscription price in specified currency';
COMMENT ON COLUMN pricing_settings.per_booking_price IS 'Price per booking/appointment in specified currency';
