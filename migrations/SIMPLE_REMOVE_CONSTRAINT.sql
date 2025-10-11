-- Simple script to remove the specific foreign key constraint
-- Run this in Supabase SQL Editor

ALTER TABLE businesses DROP CONSTRAINT IF EXISTS fk_businesses_owner_id_users CASCADE;



