-- Add missing columns to missed_call_recoveries table
-- These are needed by the process-recoveries endpoint

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS missed_call_recoveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    call_id VARCHAR(255),
    caller_phone VARCHAR(20) NOT NULL,
    caller_name VARCHAR(255),
    reason VARCHAR(50),
    message_sent TEXT NOT NULL,
    sms_api_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add status column if it doesn't exist
ALTER TABLE missed_call_recoveries 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Add scheduled_at column if it doesn't exist
ALTER TABLE missed_call_recoveries 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add attempts column if it doesn't exist
ALTER TABLE missed_call_recoveries 
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

-- Add notes column if it doesn't exist
ALTER TABLE missed_call_recoveries 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_business_id ON missed_call_recoveries(business_id);
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_caller_phone ON missed_call_recoveries(caller_phone);
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_created_at ON missed_call_recoveries(created_at);
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_status ON missed_call_recoveries(status);
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_scheduled_at ON missed_call_recoveries(scheduled_at);

-- Add CHECK constraint for status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'missed_call_recoveries_status_check'
    ) THEN
        ALTER TABLE missed_call_recoveries 
        ADD CONSTRAINT missed_call_recoveries_status_check 
        CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'));
    END IF;
END $$;

-- Update existing rows to have status 'sent' if they have a message_sent
UPDATE missed_call_recoveries 
SET status = 'sent' 
WHERE status IS NULL AND message_sent IS NOT NULL;

-- Update existing rows to have scheduled_at = created_at if null
UPDATE missed_call_recoveries 
SET scheduled_at = created_at 
WHERE scheduled_at IS NULL;

