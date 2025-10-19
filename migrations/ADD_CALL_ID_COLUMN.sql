-- Add missing call_id column to calls table
-- This fixes the database schema issue preventing call storage

ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS call_id VARCHAR(255);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);

-- Update existing records with generated call IDs if they don't have them
UPDATE calls 
SET call_id = 'call_' || id::text 
WHERE call_id IS NULL;

-- Make call_id not null after populating existing records
ALTER TABLE calls 
ALTER COLUMN call_id SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN calls.call_id IS 'Unique identifier for the call from Telnyx';
