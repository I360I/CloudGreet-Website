-- Performance Indexes Migration
-- Add indexes to improve query performance across the application

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Business table indexes
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_phone_number ON businesses(phone_number);
CREATE INDEX IF NOT EXISTS idx_businesses_subscription_status ON businesses(subscription_status);
CREATE INDEX IF NOT EXISTS idx_businesses_stripe_customer_id ON businesses(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON businesses(created_at DESC);

-- Calls table indexes
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);
CREATE INDEX IF NOT EXISTS idx_calls_from_number ON calls(from_number);
CREATE INDEX IF NOT EXISTS idx_calls_to_number ON calls(to_number);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_business_status ON calls(business_id, status);
CREATE INDEX IF NOT EXISTS idx_calls_business_created ON calls(business_id, created_at DESC);

-- Appointments table indexes
CREATE INDEX IF NOT EXISTS idx_appointments_business_id ON appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_phone ON appointments(customer_phone);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_email ON appointments(customer_email);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_business_status ON appointments(business_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_business_scheduled ON appointments(business_id, scheduled_date);

-- Enriched leads table indexes
CREATE INDEX IF NOT EXISTS idx_enriched_leads_business_id ON enriched_leads(business_id);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_owner_email ON enriched_leads(owner_email);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_owner_phone ON enriched_leads(owner_phone);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_business_name ON enriched_leads(business_name);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_industry ON enriched_leads(industry);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_lead_score ON enriched_leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_created_at ON enriched_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_business_score ON enriched_leads(business_id, lead_score DESC);

-- SMS messages table indexes
CREATE INDEX IF NOT EXISTS idx_sms_messages_business_id ON sms_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_to_number ON sms_messages(to_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_from_number ON sms_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(status);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sent_at ON sms_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_messages_business_status ON sms_messages(business_id, status);

-- Email logs table indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_business_id ON email_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_from_email ON email_logs(from_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

-- AI agents table indexes
CREATE INDEX IF NOT EXISTS idx_ai_agents_business_id ON ai_agents(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_created_at ON ai_agents(created_at DESC);

-- Automation executions table indexes
CREATE INDEX IF NOT EXISTS idx_automation_executions_business_id ON automation_executions(business_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_type ON automation_executions(type);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_executed_at ON automation_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_executions_created_at ON automation_executions(created_at DESC);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_business_id ON notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Campaigns table indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_business_id ON campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

-- Email templates table indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_business_id ON email_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_at ON email_templates(created_at DESC);

-- Phone numbers table indexes
CREATE INDEX IF NOT EXISTS idx_phone_numbers_business_id ON phone_numbers(business_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_number ON phone_numbers(number);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_type ON phone_numbers(type);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_status ON phone_numbers(status);

-- Toll free numbers table indexes
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_business_id ON toll_free_numbers(business_id);
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_number ON toll_free_numbers(number);
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_status ON toll_free_numbers(status);

-- Conversations table indexes
CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

-- Conversation messages table indexes
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_role ON conversation_messages(role);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at DESC);

-- Market intelligence table indexes
CREATE INDEX IF NOT EXISTS idx_market_intelligence_business_id ON market_intelligence(business_id);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_type ON market_intelligence(type);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_created_at ON market_intelligence(created_at DESC);

-- Lead enrichment table indexes
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_business_id ON lead_enrichment(business_id);
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_lead_id ON lead_enrichment(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_status ON lead_enrichment(status);
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_created_at ON lead_enrichment(created_at DESC);

-- Bulk enrichment table indexes
CREATE INDEX IF NOT EXISTS idx_bulk_enrichment_business_id ON bulk_enrichment(business_id);
CREATE INDEX IF NOT EXISTS idx_bulk_enrichment_status ON bulk_enrichment(status);
CREATE INDEX IF NOT EXISTS idx_bulk_enrichment_created_at ON bulk_enrichment(created_at DESC);

-- AB testing table indexes
CREATE INDEX IF NOT EXISTS idx_ab_testing_business_id ON ab_testing(business_id);
CREATE INDEX IF NOT EXISTS idx_ab_testing_status ON ab_testing(status);
CREATE INDEX IF NOT EXISTS idx_ab_testing_created_at ON ab_testing(created_at DESC);

-- Performance cache table indexes
CREATE INDEX IF NOT EXISTS idx_performance_cache_business_id ON performance_cache(business_id);
CREATE INDEX IF NOT EXISTS idx_performance_cache_key ON performance_cache(key);
CREATE INDEX IF NOT EXISTS idx_performance_cache_expires_at ON performance_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_performance_cache_created_at ON performance_cache(created_at DESC);

-- Security audits table indexes
CREATE INDEX IF NOT EXISTS idx_security_audits_business_id ON security_audits(business_id);
CREATE INDEX IF NOT EXISTS idx_security_audits_type ON security_audits(type);
CREATE INDEX IF NOT EXISTS idx_security_audits_status ON security_audits(status);
CREATE INDEX IF NOT EXISTS idx_security_audits_created_at ON security_audits(created_at DESC);

-- System health table indexes
CREATE INDEX IF NOT EXISTS idx_system_health_metric ON system_health(metric);
CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON system_health(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_created_at ON system_health(created_at DESC);

-- Webhook events table indexes (for idempotency)
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON webhook_events(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_calls_business_status_created ON calls(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_business_status_scheduled ON appointments(business_id, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_business_score_created ON enriched_leads(business_id, lead_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_messages_business_status_sent ON sms_messages(business_id, status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_business_status_sent ON email_logs(business_id, status, sent_at DESC);

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_calls_active ON calls(business_id, created_at DESC) WHERE status IN ('in-progress', 'completed');
CREATE INDEX IF NOT EXISTS idx_appointments_upcoming ON appointments(business_id, scheduled_date) WHERE status IN ('scheduled', 'confirmed') AND scheduled_date > NOW();
CREATE INDEX IF NOT EXISTS idx_enriched_leads_high_score ON enriched_leads(business_id, created_at DESC) WHERE lead_score >= 80;

-- Text search indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_enriched_leads_business_name_search ON enriched_leads USING gin(to_tsvector('english', business_name));
CREATE INDEX IF NOT EXISTS idx_enriched_leads_owner_name_search ON enriched_leads USING gin(to_tsvector('english', owner_name));
CREATE INDEX IF NOT EXISTS idx_calls_transcript_search ON calls USING gin(to_tsvector('english', transcript)) WHERE transcript IS NOT NULL;

-- Comments for documentation
COMMENT ON INDEX idx_businesses_owner_id IS 'Index for user-business relationship queries';
COMMENT ON INDEX idx_calls_business_status_created IS 'Composite index for dashboard call analytics';
COMMENT ON INDEX idx_appointments_business_status_scheduled IS 'Composite index for appointment management';
COMMENT ON INDEX idx_enriched_leads_business_score_created IS 'Composite index for lead scoring and sorting';
COMMENT ON INDEX idx_webhook_events_event_id IS 'Unique index for webhook idempotency';
COMMENT ON INDEX idx_calls_active IS 'Partial index for active calls only';
COMMENT ON INDEX idx_appointments_upcoming IS 'Partial index for upcoming appointments only';
COMMENT ON INDEX idx_enriched_leads_high_score IS 'Partial index for high-value leads only';

