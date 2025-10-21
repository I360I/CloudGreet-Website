
-- Fix database schema issues
-- 1. Add missing ai_response column to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS ai_response TEXT;

-- 2. Add missing ai_session_id column to calls table  
ALTER TABLE calls ADD COLUMN IF NOT EXISTS ai_session_id TEXT;

-- 3. Create toll_free_numbers table if it doesn't exist
CREATE TABLE IF NOT EXISTS toll_free_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number VARCHAR(20) NOT NULL UNIQUE,
  business_id UUID REFERENCES businesses(id),
  status VARCHAR(20) DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add missing columns to toll_free_numbers if they don't exist
ALTER TABLE toll_free_numbers ADD COLUMN IF NOT EXISTS number VARCHAR(20);
ALTER TABLE toll_free_numbers ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
ALTER TABLE toll_free_numbers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'available';

-- 5. Create ai_agents table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  agent_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  configuration JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Add missing columns to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_id VARCHAR(255);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS from_number VARCHAR(20);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS to_number VARCHAR(20);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS direction VARCHAR(20);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_type VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS source VARCHAR(50);

-- 6b. Add missing columns to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_hours JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS services JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS service_areas JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS greeting_message TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 7. Create demo business and agent if they don't exist
-- First, ensure businesses table has proper primary key (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_pkey') THEN
        ALTER TABLE businesses ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);
    END IF;
END $$;

-- Insert demo business (check if it exists first)
INSERT INTO businesses (id, business_name, business_type, owner_name, phone_number, email, address, business_hours, services, service_areas, greeting_message, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'Demo Business',
  'Service Business',
  'Demo Owner',
  '+18333956731',
  'demo@cloudgreet.com',
  '123 Demo St, Demo City, DC 20001',
  '{"monday":{"open":"09:00","close":"17:00"},"tuesday":{"open":"09:00","close":"17:00"},"wednesday":{"open":"09:00","close":"17:00"},"thursday":{"open":"09:00","close":"17:00"},"friday":{"open":"09:00","close":"17:00"}}',
  '["General Services","Consulting","Support"]',
  '["Washington DC","Maryland","Virginia"]',
  'Thank you for calling Demo Business. How can I help you today?',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM businesses WHERE id = '00000000-0000-0000-0000-000000000001');

-- Insert demo AI agent (check if it exists first)
INSERT INTO ai_agents (id, business_id, agent_name, is_active, configuration, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Demo AI Agent',
  true,
  '{"greeting_message":"Thank you for calling Demo Business. How can I help you today?","voice":"alloy","services":["General Services","Consulting","Support"],"hours":"9 AM - 5 PM"}',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM ai_agents WHERE id = '00000000-0000-0000-0000-000000000002');

-- 8. Create toll free number records for demo
INSERT INTO toll_free_numbers (id, number, business_id, status, created_at, updated_at)
SELECT gen_random_uuid(), '+18333956731', '00000000-0000-0000-0000-000000000001', 'assigned', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM toll_free_numbers WHERE number = '+18333956731');

INSERT INTO toll_free_numbers (id, number, business_id, status, created_at, updated_at)
SELECT gen_random_uuid(), '+17372960092', '00000000-0000-0000-0000-000000000001', 'assigned', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM toll_free_numbers WHERE number = '+17372960092');

-- 9. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_number ON toll_free_numbers(number);
CREATE INDEX IF NOT EXISTS idx_ai_agents_business_id ON ai_agents(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(is_active);
