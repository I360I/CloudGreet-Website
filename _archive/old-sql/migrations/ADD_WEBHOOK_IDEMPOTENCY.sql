-- Add webhook idempotency table to prevent duplicate processing
-- This prevents double-charging customers if webhooks retry

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);

-- Add comments for clarity
COMMENT ON TABLE webhook_events IS 'Tracks processed webhook events to prevent duplicate processing';
COMMENT ON COLUMN webhook_events.event_id IS 'Unique identifier from webhook provider (e.g., Stripe event ID)';
COMMENT ON COLUMN webhook_events.provider IS 'Webhook provider: stripe, telnyx, or retell';
COMMENT ON COLUMN webhook_events.event_type IS 'Type of webhook event (e.g., invoice.payment_succeeded)';
COMMENT ON COLUMN webhook_events.processed_at IS 'When the webhook was processed';