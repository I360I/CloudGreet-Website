-- PERFECT DATABASE SETUP FOR PRODUCTION
-- This creates the most optimized, production-ready database schema

-- 1. Create businesses table with all required columns
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  phone_number VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'US',
  website VARCHAR(255),
  description TEXT,
  services JSONB,
  service_areas JSONB,
  business_hours JSONB,
  greeting_message TEXT,
  owner_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create ai_agents table with comprehensive configuration
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  agent_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  telynyx_agent_id VARCHAR(255),
  configuration JSONB,
  performance_metrics JSONB,
  prompt_template TEXT,
  voice_settings JSONB,
  voice VARCHAR(50) DEFAULT 'alloy',
  tone VARCHAR(50) DEFAULT 'professional',
  ai_model VARCHAR(100) DEFAULT 'gpt-4o-realtime-preview-2024-12-17',
  greeting_message TEXT,
  custom_instructions TEXT,
  knowledge_base JSONB,
  availability_schedule JSONB,
  call_forwarding_number VARCHAR(20),
  voicemail_enabled BOOLEAN DEFAULT false,
  sms_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT false,
  calendar_integrated BOOLEAN DEFAULT false,
  crm_integrated BOOLEAN DEFAULT false,
  lead_qualification_criteria JSONB,
  appointment_booking_preferences JSONB,
  pricing_estimation_enabled BOOLEAN DEFAULT false,
  supported_languages TEXT[] DEFAULT ARRAY['en'],
  persona_description TEXT,
  fallback_behavior VARCHAR(100) DEFAULT 'human_transfer',
  sentiment_analysis_enabled BOOLEAN DEFAULT false,
  transcription_enabled BOOLEAN DEFAULT true,
  call_summary_enabled BOOLEAN DEFAULT true,
  custom_metrics JSONB,
  custom_events JSONB,
  custom_actions JSONB,
  custom_triggers JSONB,
  custom_automations JSONB,
  business_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create calls table with all necessary columns
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  call_id VARCHAR(255) UNIQUE,
  customer_phone VARCHAR(20),
  call_status VARCHAR(50),
  agent_id UUID REFERENCES ai_agents(id),
  transcript TEXT,
  ai_response TEXT,
  ai_session_id VARCHAR(255),
  from_number VARCHAR(20),
  to_number VARCHAR(20),
  status VARCHAR(50),
  direction VARCHAR(20),
  call_type VARCHAR(50),
  source VARCHAR(50),
  call_duration INTEGER DEFAULT 0,
  recording_url TEXT,
  transcription_text TEXT,
  outcome VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(255),
  service_type VARCHAR(100) NOT NULL,
  preferred_date DATE,
  preferred_time TIME,
  issue_description TEXT,
  status VARCHAR(50) DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create toll_free_numbers table
CREATE TABLE IF NOT EXISTS toll_free_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create conversation_history table for AI context
CREATE TABLE IF NOT EXISTS conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id VARCHAR(255) REFERENCES calls(call_id),
  session_id VARCHAR(255),
  user_message TEXT,
  ai_response TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Add all necessary indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_phone_number ON businesses(phone_number);
CREATE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email);
CREATE INDEX IF NOT EXISTS idx_ai_agents_business_id ON ai_agents(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_calls_customer_phone ON calls(customer_phone);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(call_status);
CREATE INDEX IF NOT EXISTS idx_appointments_business_id ON appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_phone ON appointments(customer_phone);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_phone_number ON toll_free_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_business_id ON toll_free_numbers(business_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_call_id ON conversation_history(call_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_session_id ON conversation_history(session_id);

-- 8. Create premium demo data
INSERT INTO businesses (
  id, 
  business_name, 
  business_type, 
  phone_number, 
  email,
  address,
  greeting_message,
  services,
  service_areas,
  business_hours,
  owner_name,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'CloudGreet Premium HVAC',
  'HVAC Services',
  '+18333956731',
  'demo@cloudgreet.com',
  '123 Premium Ave, Washington DC 20001',
  'Thank you for calling CloudGreet Premium HVAC! This is our AI receptionist Sarah. How can I help you today?',
  '["Emergency HVAC Repair", "Heating System Installation", "Cooling System Installation", "Smart Home Integration", "Energy Efficiency Upgrades", "24/7 Emergency Service", "Preventive Maintenance", "Indoor Air Quality Solutions"]',
  '["Washington DC", "Arlington VA", "Alexandria VA", "Bethesda MD", "Silver Spring MD", "Fairfax VA", "Reston VA", "McLean VA"]',
  '{"monday":{"open":"07:00","close":"19:00"},"tuesday":{"open":"07:00","close":"19:00"},"wednesday":{"open":"07:00","close":"19:00"},"thursday":{"open":"07:00","close":"19:00"},"friday":{"open":"07:00","close":"19:00"},"saturday":{"open":"08:00","close":"17:00"},"sunday":{"open":"09:00","close":"15:00"},"emergency":"24/7"}',
  'Demo Owner',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  business_type = EXCLUDED.business_type,
  phone_number = EXCLUDED.phone_number,
  email = EXCLUDED.email,
  address = EXCLUDED.address,
  greeting_message = EXCLUDED.greeting_message,
  services = EXCLUDED.services,
  service_areas = EXCLUDED.service_areas,
  business_hours = EXCLUDED.business_hours,
  owner_name = EXCLUDED.owner_name,
  updated_at = NOW();

-- 9. Create premium AI agent
INSERT INTO ai_agents (
  id,
  business_id,
  agent_name,
  is_active,
  greeting_message,
  configuration,
  voice,
  tone,
  ai_model,
  custom_instructions,
  knowledge_base,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Sarah - Premium AI Receptionist',
  true,
  'Hi there! Thank you for calling CloudGreet Premium HVAC, this is Sarah. How can I help you today?',
  '{"voice":"alloy","tone":"professional","personality":"warm","expertise":"hvac","specialties":["emergency_service","energy_efficiency","smart_home","preventive_maintenance"],"conversation_style":"consultative","follow_up_enabled":true,"appointment_booking":true,"quote_generation":true}',
  'alloy',
  'professional',
  'gpt-4o-realtime-preview-2024-12-17',
  'You are Sarah, CloudGreet''s premium AI receptionist. You''re warm, professional, and genuinely helpful. You sound like a real human receptionist, not a robot. Use natural speech patterns with appropriate pauses and emphasis. Show genuine interest in helping customers with their HVAC needs. Be conversational, engaging, and use industry expertise to provide valuable guidance.',
  '{"company_info":{"name":"CloudGreet Premium HVAC","services":["Emergency HVAC Repair","Heating Installation","Cooling Installation","Smart Home Integration","Energy Efficiency Upgrades","24/7 Emergency Service","Preventive Maintenance","Indoor Air Quality Solutions"],"coverage_areas":["Washington DC","Arlington VA","Alexandria VA","Bethesda MD","Silver Spring MD","Fairfax VA","Reston VA","McLean VA"],"hours":"Mon-Fri 7AM-7PM, Sat 8AM-5PM, Sun 9AM-3PM, Emergency 24/7","specialties":["High-efficiency systems","Smart home integration","Energy savings","Emergency repairs","Preventive maintenance"]},"pricing_guidelines":{"emergency_repair":"$150-$500","heating_installation":"$2,500-$8,000","cooling_installation":"$3,000-$12,000","maintenance":"$100-$300","smart_home":"$500-$2,000"},"common_issues":{"no_heat":["Check thermostat","Check circuit breaker","Check gas supply","Call emergency service"],"no_cooling":["Check thermostat","Check air filter","Check outdoor unit","Call for service"],"high_bills":["Schedule energy audit","Check insulation","Upgrade to high-efficiency system","Smart thermostat installation"]}}',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  business_id = EXCLUDED.business_id,
  agent_name = EXCLUDED.agent_name,
  is_active = EXCLUDED.is_active,
  greeting_message = EXCLUDED.greeting_message,
  configuration = EXCLUDED.configuration,
  voice = EXCLUDED.voice,
  tone = EXCLUDED.tone,
  ai_model = EXCLUDED.ai_model,
  custom_instructions = EXCLUDED.custom_instructions,
  knowledge_base = EXCLUDED.knowledge_base,
  updated_at = NOW();

-- 10. Create toll free number record
INSERT INTO toll_free_numbers (
  id,
  phone_number,
  business_id,
  status,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  '+18333956731',
  '00000000-0000-0000-0000-000000000001',
  'assigned',
  NOW(),
  NOW()
)
ON CONFLICT (phone_number) DO UPDATE SET
  business_id = EXCLUDED.business_id,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 11. Verify data was created successfully
SELECT 
  'Premium Business' as type,
  id,
  business_name,
  phone_number,
  array_length(services, 1) as service_count
FROM businesses 
WHERE id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
  'Premium AI Agent' as type,
  id,
  agent_name,
  business_id::text,
  '1'::text
FROM ai_agents 
WHERE id = '00000000-0000-0000-0000-000000000002'

UNION ALL

SELECT 
  'Toll Free Number' as type,
  id,
  phone_number,
  business_id::text,
  status
FROM toll_free_numbers 
WHERE phone_number = '+18333956731';
