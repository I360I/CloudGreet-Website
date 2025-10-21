-- Fix Missing Tables Based on Actual Schema
-- This migration adds the missing tables that are causing the AI to fail

-- 1. Create calls table (this is the main missing table!)
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    call_id VARCHAR(255),
    call_leg_id VARCHAR(255),
    from_number VARCHAR(20),
    to_number VARCHAR(20),
    status VARCHAR(50),
    direction VARCHAR(20),
    call_type VARCHAR(50),
    source VARCHAR(50),
    ai_session_id TEXT,
    ai_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create toll_free_numbers table
CREATE TABLE IF NOT EXISTS toll_free_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    business_id UUID REFERENCES businesses(id),
    status VARCHAR(20) DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create conversation_history table (needed for AI conversations)
CREATE TABLE IF NOT EXISTS conversation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id VARCHAR(255),
    business_id UUID REFERENCES businesses(id),
    user_message TEXT,
    ai_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_phone_number ON toll_free_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversation_history_call_id ON conversation_history(call_id);

-- 5. Insert demo business if it doesn't exist
INSERT INTO businesses (id, business_name, business_type, email, phone_number, address, business_hours, services, service_areas, greeting_message, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    'Demo Business',
    'Service Business',
    'demo@cloudgreet.com',
    '+18333956731',
    '123 Demo St, Demo City, DC 20001',
    '{"monday":{"open":"09:00","close":"17:00"},"tuesday":{"open":"09:00","close":"17:00"},"wednesday":{"open":"09:00","close":"17:00"},"thursday":{"open":"09:00","close":"17:00"},"friday":{"open":"09:00","close":"17:00"}}',
    '["General Services","Consulting","Support"]',
    '["Washington DC","Maryland","Virginia"]',
    'Thank you for calling Demo Business. How can I help you today?',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM businesses WHERE id = '00000000-0000-0000-0000-000000000001');

-- 6. Insert demo AI agent if it doesn't exist
INSERT INTO ai_agents (id, business_id, agent_name, is_active, greeting_message, voice, ai_model, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Demo AI Agent',
    true,
    'Thank you for calling Demo Business. How can I help you today?',
    'alloy',
    'gpt-4o-realtime-preview-2024-12-17',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM ai_agents WHERE id = '00000000-0000-0000-0000-000000000002');

-- 7. Insert toll free number records for demo
INSERT INTO toll_free_numbers (id, phone_number, business_id, status, created_at, updated_at)
SELECT gen_random_uuid(), '+18333956731', '00000000-0000-0000-0000-000000000001', 'assigned', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM toll_free_numbers WHERE phone_number = '+18333956731');

INSERT INTO toll_free_numbers (id, phone_number, business_id, status, created_at, updated_at)
SELECT gen_random_uuid(), '+17372960092', '00000000-0000-0000-0000-000000000001', 'assigned', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM toll_free_numbers WHERE phone_number = '+17372960092');
