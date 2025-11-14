-- ===========================================
-- Fix Appointments Table Structure
-- ===========================================
-- Your existing appointments table may have different columns
-- This script adds the missing columns if they don't exist
-- ===========================================

-- Check if appointments table exists and what columns it has
DO $$
BEGIN
    -- Add start_time if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'start_time'
    ) THEN
        -- If appointment_date and appointment_time exist, we can derive start_time
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'appointments' 
            AND column_name = 'appointment_date'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'appointments' 
            AND column_name = 'appointment_time'
        ) THEN
            -- Add start_time column by combining date and time
            ALTER TABLE appointments 
            ADD COLUMN start_time TIMESTAMP WITH TIME ZONE;
            
            -- Populate start_time from existing appointment_date and appointment_time
            UPDATE appointments 
            SET start_time = (appointment_date::date + appointment_time::time)::timestamp with time zone
            WHERE start_time IS NULL;
            
            -- Make it NOT NULL after populating
            ALTER TABLE appointments 
            ALTER COLUMN start_time SET NOT NULL;
        ELSE
            -- Just add the column with a default
            ALTER TABLE appointments 
            ADD COLUMN start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
    
    -- Add end_time if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'end_time'
    ) THEN
        ALTER TABLE appointments 
        ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
        
        -- Calculate end_time from start_time + duration (if duration exists)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'appointments' 
            AND column_name = 'duration'
        ) THEN
            UPDATE appointments 
            SET end_time = start_time + (duration || ' minutes')::interval
            WHERE end_time IS NULL AND start_time IS NOT NULL AND duration IS NOT NULL;
        ELSE
            -- Default to start_time + 60 minutes
            UPDATE appointments 
            SET end_time = start_time + interval '60 minutes'
            WHERE end_time IS NULL AND start_time IS NOT NULL;
        END IF;
        
        -- Make it NOT NULL after populating
        ALTER TABLE appointments 
        ALTER COLUMN end_time SET NOT NULL;
    END IF;
    
    -- Add other missing columns that might be needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'scheduled_date'
    ) THEN
        ALTER TABLE appointments 
        ADD COLUMN scheduled_date TIMESTAMP WITH TIME ZONE;
        
        -- Populate from start_time if it exists
        UPDATE appointments 
        SET scheduled_date = start_time
        WHERE scheduled_date IS NULL AND start_time IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE appointments 
        ADD COLUMN title TEXT;
        
        -- Populate from service_type if it exists
        UPDATE appointments 
        SET title = COALESCE(service_type, 'Appointment')
        WHERE title IS NULL AND service_type IS NOT NULL;
    END IF;
    
END $$;

-- Now create the index (safe - uses IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'appointments'
ORDER BY ordinal_position;











