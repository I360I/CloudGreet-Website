-- Create test AI agent for settings integration testing
-- This script creates a test business and AI agent for testing settings updates

-- First, create a test user (required for foreign key constraint)
INSERT INTO users (
    id,
    email,
    password_hash,
    name,
    first_name,
    last_name,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440002',
    'test@testbusiness.com',
    '$2b$10$test.hash.for.testing.purposes.only',
    'Test User',
    'Test',
    'User',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = NOW();

-- Now create a test business (after user exists)
INSERT INTO businesses (
    id,
    owner_id,
    business_name,
    business_type,
    email,
    phone,
    phone_number,
    address,
    city,
    state,
    zip_code,
    services,
    service_areas,
    business_hours,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    'Test Business',
    'Plumbing',
    'test@testbusiness.com',
    '+15551234567',
    '+15551234567',
    '123 Test Street',
    'Test City',
    'TC',
    '12345',
    ARRAY['Plumbing', 'HVAC', 'Emergency Services'],
    ARRAY['Downtown', 'West Side', 'North End'],
    '{"monday": "8:00 AM - 6:00 PM", "tuesday": "8:00 AM - 6:00 PM", "wednesday": "8:00 AM - 6:00 PM", "thursday": "8:00 AM - 6:00 PM", "friday": "8:00 AM - 6:00 PM", "saturday": "9:00 AM - 4:00 PM", "sunday": "Emergency Only"}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    business_type = EXCLUDED.business_type,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    phone_number = EXCLUDED.phone_number,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    zip_code = EXCLUDED.zip_code,
    services = EXCLUDED.services,
    service_areas = EXCLUDED.service_areas,
    business_hours = EXCLUDED.business_hours,
    updated_at = NOW();

-- Create a test AI agent for the business
INSERT INTO ai_agents (
    id,
    business_id,
    agent_name,
    greeting_message,
    tone,
    services,
    service_areas,
    business_hours,
    is_active,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    'Test AI Agent',
    'Hello! Thank you for calling Test Business. How can I help you today?',
    'professional',
    ARRAY['Plumbing', 'HVAC', 'Emergency Services'],
    ARRAY['Downtown', 'West Side', 'North End'],
    '{"monday": "8:00 AM - 6:00 PM", "tuesday": "8:00 AM - 6:00 PM", "wednesday": "8:00 AM - 6:00 PM", "thursday": "8:00 AM - 6:00 PM", "friday": "8:00 AM - 6:00 PM", "saturday": "9:00 AM - 4:00 PM", "sunday": "Emergency Only"}'::jsonb,
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    agent_name = EXCLUDED.agent_name,
    greeting_message = EXCLUDED.greeting_message,
    tone = EXCLUDED.tone,
    services = EXCLUDED.services,
    service_areas = EXCLUDED.service_areas,
    business_hours = EXCLUDED.business_hours,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();


-- Verify the test data was created
SELECT 
    'Business created' as status,
    business_name,
    business_type,
    phone_number
FROM businesses 
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

SELECT 
    'AI Agent created' as status,
    agent_name,
    greeting_message,
    tone,
    is_active
FROM ai_agents 
WHERE id = '550e8400-e29b-41d4-a716-446655440003';

SELECT 
    'User created' as status,
    email,
    first_name,
    last_name
FROM users 
WHERE id = '550e8400-e29b-41d4-a716-446655440002';
