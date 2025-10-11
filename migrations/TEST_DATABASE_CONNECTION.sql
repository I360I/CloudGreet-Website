-- Test database connection and table access
-- Run this in Supabase SQL Editor

-- Test if we can insert into custom_users table
INSERT INTO custom_users (email, password_hash, first_name, last_name, phone, is_active, is_admin)
VALUES ('test@example.com', 'test_hash', 'Test', 'User', '1234567890', true, false)
RETURNING id, email, first_name, last_name;

-- Test if we can insert into businesses table
INSERT INTO businesses (owner_id, business_name, business_type, email, phone, phone_number, address, city, state, zip_code, country, website, description, services, service_areas, business_hours, greeting_message, tone, onboarding_completed, account_status, subscription_status)
VALUES (
    (SELECT id FROM custom_users WHERE email = 'test@example.com' LIMIT 1),
    'Test Business',
    'HVAC',
    'test@example.com',
    '1234567890',
    '1234567890',
    '123 Test St',
    'Test City',
    'Test State',
    '12345',
    'US',
    'https://test.com',
    'Test Description',
    '["General Services"]',
    '["Local Area"]',
    '{"monday": {"open": "08:00", "close": "17:00"}}',
    'Test Greeting',
    'professional',
    false,
    'new_account',
    'inactive'
)
RETURNING id, business_name, business_type;

-- Test if we can insert into ai_agents table
INSERT INTO ai_agents (business_id, business_name, agent_name, is_active, configuration)
VALUES (
    (SELECT id FROM businesses WHERE business_name = 'Test Business' LIMIT 1),
    'Test Business',
    'CloudGreet AI Assistant',
    false,
    '{"greeting_message": "Test greeting", "tone": "professional", "max_call_duration": 10, "escalation_threshold": 5}'
)
RETURNING id, business_name, agent_name;

-- Clean up test data
DELETE FROM ai_agents WHERE business_name = 'Test Business';
DELETE FROM businesses WHERE business_name = 'Test Business';
DELETE FROM custom_users WHERE email = 'test@example.com';



