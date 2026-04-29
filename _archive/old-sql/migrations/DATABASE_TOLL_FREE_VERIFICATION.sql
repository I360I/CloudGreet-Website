-- Add verification fields to toll_free_numbers table
ALTER TABLE toll_free_numbers
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_failure_reason TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_toll_free_verification_status 
ON toll_free_numbers(verification_status);

-- Create system_events table for admin dashboard
CREATE TABLE IF NOT EXISTS system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster event queries
CREATE INDEX IF NOT EXISTS idx_system_events_type_created 
ON system_events(event_type, created_at DESC);

-- Add comment
COMMENT ON TABLE system_events IS 'System-wide events for admin dashboard monitoring';
COMMENT ON COLUMN toll_free_numbers.verification_status IS 'Values: unverified, pending, verified, rejected';

