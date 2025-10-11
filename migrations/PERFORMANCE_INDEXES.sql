-- CloudGreet Performance Indexes
-- Run this to optimize database query performance
-- These indexes are based on actual query patterns in the codebase

-- ====================
-- CRITICAL INDEXES (Most frequently queried)
-- ====================

-- Businesses table (queried 75+ times)
CREATE INDEX IF NOT EXISTS idx_businesses_business_id ON businesses(id);
CREATE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email);
CREATE INDEX IF NOT EXISTS idx_businesses_phone_number ON businesses(phone_number);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON businesses(created_at DESC);

-- Calls table (queried 50+ times)
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_leg_id ON calls(call_leg_id);
CREATE INDEX IF NOT EXISTS idx_calls_from_number ON calls(from_number);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_business_created ON calls(business_id, created_at DESC);

-- Appointments table (heavily queried for scheduling)
CREATE INDEX IF NOT EXISTS idx_appointments_business_id ON appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_business_status ON appointments(business_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_business_scheduled ON appointments(business_id, scheduled_date);

-- AI Agents table
CREATE INDEX IF NOT EXISTS idx_ai_agents_business_id ON ai_agents(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);
CREATE INDEX IF NOT EXISTS idx_ai_agents_is_active ON ai_agents(is_active);

-- ====================
-- SECONDARY INDEXES (Frequently used)
-- ====================

-- Conversation History table
CREATE INDEX IF NOT EXISTS idx_conversation_history_business_id ON conversation_history(business_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_call_id ON conversation_history(call_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_created_at ON conversation_history(created_at DESC);

-- SMS Messages table  
CREATE INDEX IF NOT EXISTS idx_sms_messages_business_id ON sms_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_from_number ON sms_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_direction ON sms_messages(direction);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at DESC);

-- Finance/Billing table
CREATE INDEX IF NOT EXISTS idx_finance_business_id ON finance(business_id);
CREATE INDEX IF NOT EXISTS idx_finance_appointment_id ON finance(appointment_id);
CREATE INDEX IF NOT EXISTS idx_finance_status ON finance(status);
CREATE INDEX IF NOT EXISTS idx_finance_type ON finance(type);
CREATE INDEX IF NOT EXISTS idx_finance_created_at ON finance(created_at DESC);

-- Toll Free Numbers table
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_business_id ON toll_free_numbers(business_id);
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_number ON toll_free_numbers(number);
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_status ON toll_free_numbers(status);

-- SMS Opt-Outs table (TCPA compliance)
CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_phone_number ON sms_opt_outs(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_business_id ON sms_opt_outs(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_business_phone ON sms_opt_outs(business_id, phone_number);

-- ====================
-- COMPOSITE INDEXES (Multi-column queries)
-- ====================

-- Most common query: Get recent calls for a business
CREATE INDEX IF NOT EXISTS idx_calls_business_created_status ON calls(business_id, created_at DESC, status);

-- Appointment scheduling queries
CREATE INDEX IF NOT EXISTS idx_appointments_business_date_status ON appointments(business_id, scheduled_date, status);

-- Active agents for business
CREATE INDEX IF NOT EXISTS idx_ai_agents_business_active ON ai_agents(business_id, is_active);

-- ====================
-- TEXT SEARCH INDEXES (Optional - for full-text search)
-- ====================

-- Customer name search
-- CREATE INDEX IF NOT EXISTS idx_appointments_customer_name_trgm ON appointments USING gin(customer_name gin_trgm_ops);

-- Business name search
-- CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm ON businesses USING gin(business_name gin_trgm_ops);

-- ====================
-- NOTES
-- ====================
-- Run this migration on your Supabase database via the SQL editor
-- Monitor query performance using Supabase Dashboard → Database → Query Performance
-- Add more indexes if slow queries are identified in production
-- Remove indexes that are never used (check pg_stat_user_indexes)

