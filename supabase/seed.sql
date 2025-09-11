-- Seed data for testing
-- Note: This will be run after the migration

-- Insert a test user (password: 'password123')
INSERT INTO users (
  id,
  name,
  email,
  hashed_password,
  company_name,
  business_type,
  phone_number,
  onboarding_status,
  retell_agent_id,
  retell_phone_number,
  stripe_customer_id,
  stripe_subscription_id
) VALUES (
  'e88ae48f-ad45-49c8-a61a-38a79604c45d',
  'Test Business Owner',
  'test@cloudgreet.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8Kz2', -- password123
  'Test HVAC Company',
  'HVAC',
  '+1234567890',
  'completed',
  'agent_123',
  '+1987654321',
  'cus_test123',
  'sub_test123'
) ON CONFLICT (email) DO NOTHING;

-- Insert sample customers
INSERT INTO customers (user_id, name, email, phone, address) VALUES
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', 'John Smith', 'john@example.com', '+1234567890', '123 Main St, City, State'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', 'Sarah Johnson', 'sarah@example.com', '+1234567891', '456 Oak Ave, City, State'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', 'Mike Davis', 'mike@example.com', '+1234567892', '789 Pine Rd, City, State'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', 'Lisa Wilson', 'lisa@example.com', '+1234567893', '321 Elm St, City, State'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', 'David Brown', 'david@example.com', '+1234567894', '654 Maple Dr, City, State');

-- Insert sample calls (last 30 days)
INSERT INTO calls (user_id, customer_id, phone_number, duration, status, call_type, satisfaction_score, notes, created_at) VALUES
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'John Smith' LIMIT 1), '+1234567890', 180, 'completed', 'inbound', 5, 'Customer called about AC repair', NOW() - INTERVAL '1 day'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'Sarah Johnson' LIMIT 1), '+1234567891', 240, 'completed', 'inbound', 4, 'Scheduled maintenance appointment', NOW() - INTERVAL '2 days'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'Mike Davis' LIMIT 1), '+1234567892', 120, 'completed', 'inbound', 5, 'Emergency heating repair', NOW() - INTERVAL '3 days'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'Lisa Wilson' LIMIT 1), '+1234567893', 300, 'completed', 'inbound', 4, 'New installation inquiry', NOW() - INTERVAL '5 days'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'David Brown' LIMIT 1), '+1234567894', 90, 'completed', 'inbound', 5, 'Follow-up call', NOW() - INTERVAL '7 days'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'John Smith' LIMIT 1), '+1234567890', 150, 'completed', 'inbound', 4, 'Service call', NOW() - INTERVAL '10 days'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'Sarah Johnson' LIMIT 1), '+1234567891', 200, 'completed', 'inbound', 5, 'Maintenance reminder', NOW() - INTERVAL '12 days'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'Mike Davis' LIMIT 1), '+1234567892', 180, 'completed', 'inbound', 4, 'Warranty inquiry', NOW() - INTERVAL '15 days'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'Lisa Wilson' LIMIT 1), '+1234567893', 220, 'completed', 'inbound', 5, 'Installation follow-up', NOW() - INTERVAL '18 days'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'David Brown' LIMIT 1), '+1234567894', 160, 'completed', 'inbound', 4, 'Service inquiry', NOW() - INTERVAL '20 days'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'John Smith' LIMIT 1), '+1234567890', 190, 'completed', 'inbound', 5, 'Emergency call', NOW() - INTERVAL '22 days'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'Sarah Johnson' LIMIT 1), '+1234567891', 140, 'completed', 'inbound', 4, 'Maintenance call', NOW() - INTERVAL '25 days'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'Mike Davis' LIMIT 1), '+1234567892', 170, 'completed', 'inbound', 5, 'Service call', NOW() - INTERVAL '28 days'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'Lisa Wilson' LIMIT 1), '+1234567893', 130, 'completed', 'inbound', 4, 'Inquiry call', NOW() - INTERVAL '30 days');

-- Insert sample appointments
INSERT INTO appointments (user_id, customer_id, title, description, start_time, end_time, status) VALUES
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'John Smith' LIMIT 1), 'AC Repair', 'Fix air conditioning unit', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours', 'scheduled'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'Sarah Johnson' LIMIT 1), 'Maintenance', 'Regular maintenance check', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '1 hour', 'scheduled'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'Mike Davis' LIMIT 1), 'Installation', 'New HVAC system installation', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '4 hours', 'scheduled'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'Lisa Wilson' LIMIT 1), 'Inspection', 'System inspection', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '1 hour', 'scheduled'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', (SELECT id FROM customers WHERE name = 'David Brown' LIMIT 1), 'Repair', 'Heating system repair', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '2 hours', 'scheduled');

-- Insert sample notifications
INSERT INTO notifications (user_id, type, title, message, data) VALUES
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', 'call', 'New Call Received', 'John Smith called about AC repair', '{"customer": "John Smith", "duration": 180}'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', 'appointment', 'Appointment Scheduled', 'Sarah Johnson scheduled maintenance', '{"customer": "Sarah Johnson", "date": "2024-01-15"}'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', 'payment', 'Payment Received', 'Payment of $150 received from Mike Davis', '{"customer": "Mike Davis", "amount": 150}'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', 'call', 'New Call Received', 'Lisa Wilson called about installation', '{"customer": "Lisa Wilson", "duration": 300}'),
  ('e88ae48f-ad45-49c8-a61a-38a79604c45d', 'appointment', 'Appointment Completed', 'David Brown appointment completed', '{"customer": "David Brown", "status": "completed"}');
