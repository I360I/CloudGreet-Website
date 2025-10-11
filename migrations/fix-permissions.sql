-- FIX PERMISSIONS FOR ALL TABLES
-- Run this script in Supabase SQL Editor

-- Grant permissions to authenticated role
GRANT ALL ON users TO authenticated;
GRANT ALL ON businesses TO authenticated;
GRANT ALL ON audit_logs TO authenticated;
GRANT ALL ON call_logs TO authenticated;
GRANT ALL ON appointments TO authenticated;
GRANT ALL ON sms_logs TO authenticated;
GRANT ALL ON ai_agents TO authenticated;
GRANT ALL ON calendar_integrations TO authenticated;
GRANT ALL ON promo_codes TO authenticated;
GRANT ALL ON billing_history TO authenticated;
GRANT ALL ON stripe_customers TO authenticated;
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON system_metrics TO authenticated;
GRANT ALL ON system_alerts TO authenticated;
GRANT ALL ON webhook_events TO authenticated;
GRANT ALL ON phone_numbers TO authenticated;
GRANT ALL ON service_areas TO authenticated;
GRANT ALL ON business_hours TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON api_keys TO authenticated;
GRANT ALL ON rate_limits TO authenticated;
GRANT ALL ON sessions TO authenticated;
GRANT ALL ON password_resets TO authenticated;
GRANT ALL ON email_verifications TO authenticated;
GRANT ALL ON user_preferences TO authenticated;
GRANT ALL ON business_settings TO authenticated;
GRANT ALL ON ai_conversations TO authenticated;
GRANT ALL ON call_recordings TO authenticated;
GRANT ALL ON transcription_jobs TO authenticated;
GRANT ALL ON integration_logs TO authenticated;
GRANT ALL ON performance_metrics TO authenticated;
GRANT ALL ON error_logs TO authenticated;
GRANT ALL ON feature_flags TO authenticated;
GRANT ALL ON user_activity TO authenticated;
GRANT ALL ON business_analytics TO authenticated;
GRANT ALL ON revenue_tracking TO authenticated;
GRANT ALL ON customer_feedback TO authenticated;
GRANT ALL ON support_tickets TO authenticated;
GRANT ALL ON api_usage TO authenticated;
GRANT ALL ON webhook_retries TO authenticated;
GRANT ALL ON backup_logs TO authenticated;
GRANT ALL ON maintenance_logs TO authenticated;

-- Grant permissions to service_role
GRANT ALL ON users TO service_role;
GRANT ALL ON businesses TO service_role;
GRANT ALL ON audit_logs TO service_role;
GRANT ALL ON call_logs TO service_role;
GRANT ALL ON appointments TO service_role;
GRANT ALL ON sms_logs TO service_role;
GRANT ALL ON ai_agents TO service_role;
GRANT ALL ON calendar_integrations TO service_role;
GRANT ALL ON promo_codes TO service_role;
GRANT ALL ON billing_history TO service_role;
GRANT ALL ON stripe_customers TO service_role;
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON system_metrics TO service_role;
GRANT ALL ON system_alerts TO service_role;
GRANT ALL ON webhook_events TO service_role;
GRANT ALL ON phone_numbers TO service_role;
GRANT ALL ON service_areas TO service_role;
GRANT ALL ON business_hours TO service_role;
GRANT ALL ON notifications TO service_role;
GRANT ALL ON api_keys TO service_role;
GRANT ALL ON rate_limits TO service_role;
GRANT ALL ON sessions TO service_role;
GRANT ALL ON password_resets TO service_role;
GRANT ALL ON email_verifications TO service_role;
GRANT ALL ON user_preferences TO service_role;
GRANT ALL ON business_settings TO service_role;
GRANT ALL ON ai_conversations TO service_role;
GRANT ALL ON call_recordings TO service_role;
GRANT ALL ON transcription_jobs TO service_role;
GRANT ALL ON integration_logs TO service_role;
GRANT ALL ON performance_metrics TO service_role;
GRANT ALL ON error_logs TO service_role;
GRANT ALL ON feature_flags TO service_role;
GRANT ALL ON user_activity TO service_role;
GRANT ALL ON business_analytics TO service_role;
GRANT ALL ON revenue_tracking TO service_role;
GRANT ALL ON customer_feedback TO service_role;
GRANT ALL ON support_tickets TO service_role;
GRANT ALL ON api_usage TO service_role;
GRANT ALL ON webhook_retries TO service_role;
GRANT ALL ON backup_logs TO service_role;
GRANT ALL ON maintenance_logs TO service_role;

-- Grant permissions to anon role (for public access where needed)
GRANT SELECT ON promo_codes TO anon;
GRANT SELECT ON feature_flags TO anon;

-- Grant sequence permissions
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon;
