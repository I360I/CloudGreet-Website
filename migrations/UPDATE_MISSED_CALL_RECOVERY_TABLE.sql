-- =====================================================
-- UPDATE MISSED CALL RECOVERY TABLE
-- Add fields for scheduled recovery processing
-- =====================================================

-- Add missing columns if they don't exist
ALTER TABLE missed_call_recoveries 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing records to have status
UPDATE missed_call_recoveries 
SET status = 'sent' 
WHERE status IS NULL AND message_sent IS NOT NULL;

-- Create index for faster queries on status and scheduled_at
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_status ON missed_call_recoveries(status);
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_scheduled_at ON missed_call_recoveries(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_pending ON missed_call_recoveries(status, scheduled_at) WHERE status = 'pending';
