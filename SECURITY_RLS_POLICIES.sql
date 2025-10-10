-- CloudGreet RLS Security Policies
-- CRITICAL: Run this in Supabase SQL Editor before production launch

-- Enable RLS on all critical tables (only existing tables)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Businesses table policies
CREATE POLICY "Users can view own business" ON businesses
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own business" ON businesses
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own business" ON businesses
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Leads table policies
CREATE POLICY "Users can view own leads" ON leads
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own leads" ON leads
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own leads" ON leads
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Calls table policies
CREATE POLICY "Users can view own calls" ON calls
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own calls" ON calls
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Call logs table policies
CREATE POLICY "Users can view own call logs" ON call_logs
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own call logs" ON call_logs
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- SMS messages table policies
CREATE POLICY "Users can view own SMS" ON sms_messages
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own SMS" ON sms_messages
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- SMS logs table policies
CREATE POLICY "Users can view own SMS logs" ON sms_logs
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own SMS logs" ON sms_logs
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Invoices table policies
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Stripe customers table policies
CREATE POLICY "Users can view own Stripe data" ON stripe_customers
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own Stripe data" ON stripe_customers
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Stripe subscriptions table policies
CREATE POLICY "Users can view own subscriptions" ON stripe_subscriptions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own subscriptions" ON stripe_subscriptions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Webhook logs table policies (service role only)
CREATE POLICY "Service role can manage webhook logs" ON webhook_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Audit logs table policies (service role only)
CREATE POLICY "Service role can manage audit logs" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Conversations table policies (commented out - table doesn't exist yet)
-- CREATE POLICY "Users can view own conversations" ON conversations
--   FOR SELECT USING (auth.uid()::text = user_id::text);

-- CREATE POLICY "Users can insert own conversations" ON conversations
--   FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Appointments table policies
CREATE POLICY "Users can view own appointments" ON appointments
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own appointments" ON appointments
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own appointments" ON appointments
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- AI agents table policies
CREATE POLICY "Users can view own AI agents" ON ai_agents
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own AI agents" ON ai_agents
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own AI agents" ON ai_agents
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON users(auth_uid);
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user_id ON stripe_subscriptions(user_id);
-- CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_user_id ON ai_agents(user_id);
