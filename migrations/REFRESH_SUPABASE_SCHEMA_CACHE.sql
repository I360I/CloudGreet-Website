-- Refresh Supabase schema cache after adding new columns
-- Run this in Supabase SQL Editor

-- This forces Supabase to refresh its schema cache
-- The cache will be automatically refreshed, but this helps ensure it happens

-- Verify the appointments table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
ORDER BY column_name;

-- Check if the scheduled_date column exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name = 'scheduled_date'
) AS scheduled_date_exists;

-- If the column doesn't exist, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'scheduled_date'
    ) THEN
        ALTER TABLE appointments 
        ADD COLUMN scheduled_date TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Added scheduled_date column to appointments table';
    ELSE
        RAISE NOTICE 'scheduled_date column already exists';
    END IF;
END $$;

-- Also ensure service_type column exists (not service)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'service_type'
    ) THEN
        ALTER TABLE appointments 
        ADD COLUMN service_type VARCHAR(255);
        
        RAISE NOTICE 'Added service_type column to appointments table';
    ELSE
        RAISE NOTICE 'service_type column already exists';
    END IF;
END $$;

-- Final verification
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name IN ('scheduled_date', 'service_type', 'customer_name', 'business_id')
ORDER BY column_name;



