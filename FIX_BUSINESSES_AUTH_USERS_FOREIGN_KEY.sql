-- Fix businesses table foreign key constraint to reference auth.users table
-- Run this in Supabase SQL Editor

-- Drop existing foreign key constraint on businesses table
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS fk_businesses_owner_id_users CASCADE;

-- Add new foreign key constraint to businesses table referencing auth.users table
ALTER TABLE businesses
ADD CONSTRAINT fk_businesses_owner_id_auth_users
FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

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



