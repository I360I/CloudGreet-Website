-- ===========================================
-- Fix Appointments Table Structure - FINAL
-- ===========================================
-- Your appointments table exists but needs structure fixes
-- This script fixes the column constraints and populates missing data
-- ===========================================

DO $$
BEGIN
    -- Fix start_time: Make it NOT NULL and populate from scheduled_date if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'start_time'
    ) THEN
        -- Populate start_time from scheduled_date if start_time is NULL
        UPDATE appointments 
        SET start_time = scheduled_date
        WHERE start_time IS NULL AND scheduled_date IS NOT NULL;
        
        -- Set default for any remaining NULLs
        UPDATE appointments 
        SET start_time = COALESCE(scheduled_date, NOW())
        WHERE start_time IS NULL;
        
        -- Now make it NOT NULL
        ALTER TABLE appointments 
        ALTER COLUMN start_time SET NOT NULL;
        
        RAISE NOTICE 'Fixed start_time column';
    END IF;
    
    -- Fix end_time: Populate from start_time + duration if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'end_time'
    ) THEN
        -- Populate end_time from start_time + duration where it's NULL
        UPDATE appointments 
        SET end_time = start_time + (COALESCE(duration, 60) || ' minutes')::interval
        WHERE end_time IS NULL AND start_time IS NOT NULL;
        
        -- Set default for any remaining NULLs (shouldn't happen, but safety)
        UPDATE appointments 
        SET end_time = start_time + interval '60 minutes'
        WHERE end_time IS NULL AND start_time IS NOT NULL;
        
        RAISE NOTICE 'Fixed end_time column';
    END IF;
    
    -- Ensure title has a value if it's NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'title'
    ) THEN
        UPDATE appointments 
        SET title = COALESCE(service_type, 'Appointment', title)
        WHERE title IS NULL OR title = '';
        
        RAISE NOTICE 'Fixed title column';
    END IF;
    
    -- Add service_type if it doesn't exist (but based on your schema, it does)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'service_type'
    ) THEN
        ALTER TABLE appointments 
        ADD COLUMN service_type TEXT;
        
        RAISE NOTICE 'Added service_type column';
    END IF;
    
    RAISE NOTICE 'Appointments table structure fixed!';
    
END $$;

-- Now create the index (safe - uses IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);

-- Verify the fix
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'appointments'
ORDER BY ordinal_position;

-- Check for any NULL values that shouldn't be NULL
SELECT 
    COUNT(*) as total_appointments,
    COUNT(start_time) as has_start_time,
    COUNT(end_time) as has_end_time,
    COUNT(*) FILTER (WHERE start_time IS NULL) as missing_start_time,
    COUNT(*) FILTER (WHERE end_time IS NULL) as missing_end_time
FROM appointments;

