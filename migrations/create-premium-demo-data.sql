-- Create premium demo data for the most impressive client showcase
-- This ensures the realtime AI has all the context it needs

-- 1. Create premium demo business
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
  updated_at = NOW();

-- 2. Create premium AI agent
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

-- 3. Create appointments table if it doesn't exist
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
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

-- 4. Create toll free number record
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

-- 5. Add premium indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_phone_number ON businesses(phone_number);
CREATE INDEX IF NOT EXISTS idx_ai_agents_business_id ON ai_agents(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_business_id ON appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_phone ON appointments(customer_phone);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- 6. Verify premium data was created
SELECT 
  'Premium Business' as type,
  id,
  business_name,
  phone_number,
  services::text as services
FROM businesses 
WHERE id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
  'Premium AI Agent' as type,
  id,
  agent_name,
  business_id::text,
  configuration::text
FROM ai_agents 
WHERE id = '00000000-0000-0000-0000-000000000002';
