-- Complete Database Setup for CloudGreet
-- This script ensures all required tables exist with proper structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  business_name VARCHAR(500) NOT NULL,
  business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('hvac', 'roofing', 'painting')),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  website VARCHAR(255),
  license_number VARCHAR(100),
  -- Multi-tenant integration fields
  calendar_provider VARCHAR(50) DEFAULT 'google',
  calendar_id VARCHAR(255),
  calendar_access_token TEXT,
  calendar_refresh_token TEXT,
  phone_number VARCHAR(50),
  retell_agent_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'active',
  -- Tenant isolation
  tenant_id UUID DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- ANALYTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  revenue DECIMAL(10,2) DEFAULT 0.00,
  active_agents INTEGER DEFAULT 0,
  phone_numbers INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CALL LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR(50),
  customer_phone VARCHAR(50),
  duration INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'completed',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- APPOINTMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  service_type VARCHAR(100),
  appointment_date DATE,
  appointment_time TIME,
  duration INTEGER DEFAULT 60,
  status VARCHAR(50) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INTEGRATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Analytics can view own data" ON analytics;
DROP POLICY IF EXISTS "Analytics can update own data" ON analytics;
DROP POLICY IF EXISTS "Analytics can insert own data" ON analytics;
DROP POLICY IF EXISTS "Call logs can view own data" ON call_logs;
DROP POLICY IF EXISTS "Call logs can update own data" ON call_logs;
DROP POLICY IF EXISTS "Call logs can insert own data" ON call_logs;
DROP POLICY IF EXISTS "Appointments can view own data" ON appointments;
DROP POLICY IF EXISTS "Appointments can update own data" ON appointments;
DROP POLICY IF EXISTS "Appointments can insert own data" ON appointments;
DROP POLICY IF EXISTS "Integrations can view own data" ON integrations;
DROP POLICY IF EXISTS "Integrations can update own data" ON integrations;
DROP POLICY IF EXISTS "Integrations can insert own data" ON integrations;

-- Create RLS policies for users table
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Create RLS policies for analytics table
CREATE POLICY "Analytics can view own data" ON analytics
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Analytics can update own data" ON analytics
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Analytics can insert own data" ON analytics
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Create RLS policies for call_logs table
CREATE POLICY "Call logs can view own data" ON call_logs
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Call logs can update own data" ON call_logs
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Call logs can insert own data" ON call_logs
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Create RLS policies for appointments table
CREATE POLICY "Appointments can view own data" ON appointments
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Appointments can update own data" ON appointments
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Appointments can insert own data" ON appointments
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Create RLS policies for integrations table
CREATE POLICY "Integrations can view own data" ON integrations
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Integrations can update own data" ON integrations
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Integrations can insert own data" ON integrations
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default analytics data for test user
INSERT INTO analytics (user_id, total_calls, successful_calls, conversion_rate, revenue)
VALUES ('00000000-0000-0000-0000-000000000001', 0, 0, 0.00, 0.00)
ON CONFLICT (user_id, date) DO NOTHING;

-- Insert test user if not exists
INSERT INTO users (id, name, email, hashed_password, business_name, business_type, phone)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test User',
  'test@example.com',
  '$2b$12$B8qh2EDZ4WlxixKbUSHLsuCXAX8qjYVRCtHjn0a2pog6e6zUj126W',
  'Test Business',
  'hvac',
  '+1234567890'
)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
SELECT 'Database setup completed successfully!' as message;

