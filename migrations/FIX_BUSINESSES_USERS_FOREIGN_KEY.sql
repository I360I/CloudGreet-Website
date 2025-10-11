-- Fix businesses table foreign key constraint to reference users table
-- Run this in Supabase SQL Editor

-- Drop existing foreign key constraint on businesses table if it references custom_users
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT conname, contype, confrelid::regclass AS foreign_table
              FROM pg_constraint
              WHERE conrelid = 'public.businesses'::regclass
                AND contype = 'f'
                AND confrelid = 'public.custom_users'::regclass)
    LOOP
        EXECUTE 'ALTER TABLE businesses DROP CONSTRAINT ' || r.conname;
    END LOOP;
END $$;

-- Add new foreign key constraint to businesses table referencing users table
ALTER TABLE businesses
ADD CONSTRAINT fk_owner_id_users
FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

-- Verify the foreign key constraint
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='businesses';



