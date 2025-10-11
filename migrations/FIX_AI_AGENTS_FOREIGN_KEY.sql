-- Fix ai_agents table foreign key constraint to reference custom_users
-- Run this in Supabase SQL Editor

-- Check current foreign key constraints on ai_agents table
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='ai_agents';

-- Drop existing foreign key constraints on ai_agents table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'ai_agents' AND constraint_type = 'FOREIGN KEY') 
    LOOP
        EXECUTE 'ALTER TABLE ai_agents DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
    END LOOP;
END $$;

-- Add new foreign key constraint to reference businesses table (which now references custom_users)
ALTER TABLE ai_agents 
ADD CONSTRAINT fk_ai_agents_business_id 
FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;



