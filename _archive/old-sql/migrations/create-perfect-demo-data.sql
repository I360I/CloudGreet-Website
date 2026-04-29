-- Create perfect demo data for production
-- This ensures the voice webhook has all the data it needs

-- 1. Create demo business
INSERT INTO businesses (
  id, 
  business_name, 
  business_type, 
  phone_number, 
  greeting_message,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'CloudGreet Demo',
  'HVAC',
  '+18333956731',
  'Thank you for calling CloudGreet Demo! How can I help you today?',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  business_type = EXCLUDED.business_type,
  phone_number = EXCLUDED.phone_number,
  greeting_message = EXCLUDED.greeting_message,
  updated_at = NOW();

-- 2. Create demo AI agent
INSERT INTO ai_agents (
  id,
  business_id,
  agent_name,
  is_active,
  greeting_message,
  configuration,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'CloudGreet Demo Agent',
  true,
  'Thank you for calling CloudGreet Demo! How can I help you today?',
  '{"voice":"alloy","tone":"professional","services":["HVAC Repair","Heating Installation","Cooling Installation","Maintenance"],"hours":"9 AM - 5 PM"}',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  business_id = EXCLUDED.business_id,
  agent_name = EXCLUDED.agent_name,
  is_active = EXCLUDED.is_active,
  greeting_message = EXCLUDED.greeting_message,
  configuration = EXCLUDED.configuration,
  updated_at = NOW();

-- 3. Create toll free number record
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

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_phone_number ON businesses(phone_number);
CREATE INDEX IF NOT EXISTS idx_ai_agents_business_id ON ai_agents(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);

-- 5. Verify data was created
SELECT 
  'Demo Business' as type,
  id,
  business_name,
  phone_number,
  greeting_message
FROM businesses 
WHERE id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
  'Demo Agent' as type,
  id,
  agent_name,
  business_id::text,
  greeting_message
FROM ai_agents 
WHERE id = '00000000-0000-0000-0000-000000000002';
