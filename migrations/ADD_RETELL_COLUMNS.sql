-- Add Retell Integration Columns to calls table
-- This migration adds all required columns for Retell AI integration

-- Add missing columns to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS retell_call_id VARCHAR(255);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS sentiment VARCHAR(20);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_summary TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS from_number VARCHAR(20);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS to_number VARCHAR(20);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_id VARCHAR(255);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_retell_call_id ON calls(retell_call_id);
CREATE INDEX IF NOT EXISTS idx_calls_sentiment ON calls(sentiment);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_from_number ON calls(from_number);
CREATE INDEX IF NOT EXISTS idx_calls_to_number ON calls(to_number);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_business_created ON calls(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_appointments_business_date ON appointments(business_id, scheduled_date);

-- Add comments for documentation
COMMENT ON COLUMN calls.retell_call_id IS 'Retell AI call identifier for webhook integration';
COMMENT ON COLUMN calls.sentiment IS 'Call sentiment analysis: positive, neutral, negative';
COMMENT ON COLUMN calls.call_summary IS 'AI-generated call summary';
COMMENT ON COLUMN calls.from_number IS 'Caller phone number';
COMMENT ON COLUMN calls.to_number IS 'Business phone number called';
COMMENT ON COLUMN calls.call_id IS 'Telnyx call control ID';
COMMENT ON COLUMN calls.status IS 'Call status: in_progress, completed, failed';
COMMENT ON COLUMN calls.duration IS 'Call duration in seconds';

-- Update existing records to have default values
UPDATE calls 
SET 
  status = COALESCE(status, 'completed'),
  duration = COALESCE(duration, 0),
  sentiment = COALESCE(sentiment, 'neutral')
WHERE 
  status IS NULL 
  OR duration IS NULL 
  OR sentiment IS NULL;

-- Add constraints (drop first if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sentiment') THEN
        ALTER TABLE calls DROP CONSTRAINT chk_sentiment;
    END IF;
END $$;

ALTER TABLE calls ADD CONSTRAINT chk_sentiment 
  CHECK (sentiment IN ('positive', 'neutral', 'negative'));

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_status') THEN
        ALTER TABLE calls DROP CONSTRAINT chk_status;
    END IF;
END $$;

ALTER TABLE calls ADD CONSTRAINT chk_status 
  CHECK (status IN ('in_progress', 'completed', 'failed', 'missed'));

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_duration') THEN
        ALTER TABLE calls DROP CONSTRAINT chk_duration;
    END IF;
END $$;

ALTER TABLE calls ADD CONSTRAINT chk_duration 
  CHECK (duration >= 0);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON calls TO authenticated;
GRANT ALL ON calls TO service_role;
