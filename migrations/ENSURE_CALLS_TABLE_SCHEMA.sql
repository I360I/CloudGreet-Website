-- Ensure calls table has all required columns
-- This migration is idempotent - safe to run multiple times

-- Add from_number if it doesn't exist
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS from_number TEXT;

-- Add to_number if it doesn't exist
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS to_number TEXT;

-- Add status if it doesn't exist
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS status TEXT;

-- Add call_id if it doesn't exist
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS call_id TEXT;

-- Add duration if it doesn't exist
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 0;

-- Add recording_url if it doesn't exist
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- Add transcript if it doesn't exist
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Add caller_name if it doesn't exist
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS caller_name TEXT;

-- Add business_id if it doesn't exist
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Add created_at if it doesn't exist
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at if it doesn't exist
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_calls_from_number ON calls(from_number);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);

-- Update existing rows: if status is NULL but call_status exists, copy it
-- Only run if call_status column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calls' AND column_name = 'call_status'
    ) THEN
        UPDATE calls 
        SET status = call_status 
        WHERE status IS NULL AND call_status IS NOT NULL;
    END IF;
END $$;

-- Update existing rows: if from_number is NULL but customer_phone exists, copy it
-- Only run if customer_phone column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calls' AND column_name = 'customer_phone'
    ) THEN
        UPDATE calls 
        SET from_number = customer_phone 
        WHERE from_number IS NULL AND customer_phone IS NOT NULL;
    END IF;
END $$;

-- Make from_number NOT NULL if possible (only if all rows have values)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM calls WHERE from_number IS NULL
    ) THEN
        ALTER TABLE calls ALTER COLUMN from_number SET NOT NULL;
    END IF;
END $$;

