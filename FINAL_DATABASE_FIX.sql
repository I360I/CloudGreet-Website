-- FINAL DATABASE FIX - Add any missing columns to match the APIs
-- Run this in Supabase SQL Editor

-- Check what columns exist in businesses table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'businesses' 
ORDER BY ordinal_position;

-- Add any missing columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Unknown',
ADD COLUMN IF NOT EXISTS state VARCHAR(50) DEFAULT 'Unknown',
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10) DEFAULT '00000',
ADD COLUMN IF NOT EXISTS services TEXT[],
ADD COLUMN IF NOT EXISTS service_areas TEXT[],
ADD COLUMN IF NOT EXISTS business_hours JSONB,
ADD COLUMN IF NOT EXISTS greeting_message TEXT,
ADD COLUMN IF NOT EXISTS tone VARCHAR(20) DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS max_call_duration INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS escalation_threshold INTEGER DEFAULT 5;

-- Update existing businesses with default values
UPDATE businesses 
SET 
  city = COALESCE(city, 'Unknown'),
  state = COALESCE(state, 'Unknown'), 
  zip_code = COALESCE(zip_code, '00000'),
  services = COALESCE(services, ARRAY['General Services']),
  service_areas = COALESCE(service_areas, ARRAY['Local Area']),
  business_hours = COALESCE(business_hours, '{"monday": {"open": "08:00", "close": "17:00"}, "tuesday": {"open": "08:00", "close": "17:00"}, "wednesday": {"open": "08:00", "close": "17:00"}, "thursday": {"open": "08:00", "close": "17:00"}, "friday": {"open": "08:00", "close": "17:00"}, "saturday": {"open": "09:00", "close": "15:00"}, "sunday": {"open": "09:00", "close": "15:00"}}'::jsonb),
  greeting_message = COALESCE(greeting_message, 'Thank you for calling ' || business_name || '. How can I help you today?'),
  tone = COALESCE(tone, 'professional'),
  max_call_duration = COALESCE(max_call_duration, 10),
  escalation_threshold = COALESCE(escalation_threshold, 5)
WHERE city IS NULL OR state IS NULL OR zip_code IS NULL;

-- Check what columns exist in users table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Verify the final schema
SELECT 'BUSINESSES TABLE:' as table_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'businesses' 
ORDER BY ordinal_position;

SELECT 'USERS TABLE:' as table_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Show sample data
SELECT 'SAMPLE BUSINESS:' as info;
SELECT id, business_name, business_type, email, phone_number, city, state, zip_code
FROM businesses 
LIMIT 1;

SELECT 'SAMPLE USER:' as info;
SELECT id, email, first_name, last_name, is_active
FROM users 
LIMIT 1;
