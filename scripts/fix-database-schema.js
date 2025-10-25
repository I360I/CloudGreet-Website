const fs = require('fs');



// Create SQL migration to fix the database schema
const migrationSQL = `
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

-- 7. Create demo business and agent if they don't exist
INSERT INTO businesses (id, business_name, business_type, owner_name, phone_number, email, address, business_hours, services, service_areas, greeting_message, created_at, updated_at)
VALUES (
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
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ai_agents (id, business_id, agent_name, is_active, configuration, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Demo AI Agent',
  true,
  '{"greeting_message":"Thank you for calling Demo Business. How can I help you today?","voice":"alloy","services":["General Services","Consulting","Support"],"hours":"9 AM - 5 PM"}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 8. Create toll free number record for demo
INSERT INTO toll_free_numbers (id, number, business_id, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '+18333956731',
  '00000000-0000-0000-0000-000000000001',
  'assigned',
  NOW(),
  NOW()
) ON CONFLICT (number) DO NOTHING;

-- 9. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_number ON toll_free_numbers(number);
CREATE INDEX IF NOT EXISTS idx_ai_agents_business_id ON ai_agents(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(is_active);
`;

// Write the migration file
fs.writeFileSync('migrations/fix-database-schema.sql', migrationSQL);





















