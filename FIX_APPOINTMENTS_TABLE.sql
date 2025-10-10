-- Fix appointments table to add missing scheduled_date column
-- Run this in Supabase SQL Editor

-- Add scheduled_date column if it doesn't exist
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE;

-- Add appointment_time column if it doesn't exist  
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS appointment_time TIMESTAMP WITH TIME ZONE;

-- Update existing records to use scheduled_date from created_at if scheduled_date is null
UPDATE appointments 
SET scheduled_date = created_at 
WHERE scheduled_date IS NULL;

-- Verify the columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name IN ('scheduled_date', 'appointment_time', 'created_at')
ORDER BY column_name;



