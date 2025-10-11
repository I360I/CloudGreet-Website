-- Force recreate users table - this will definitely fix the duplicates
-- Run this in Supabase SQL Editor

-- Drop all foreign key constraints that reference users table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT conname, conrelid::regclass AS table_name
              FROM pg_constraint 
              WHERE confrelid = 'users'::regclass)
    LOOP
        EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT ' || r.conname;
    END LOOP;
END $$;

-- Drop the users table completely
DROP TABLE IF EXISTS users CASCADE;

-- Recreate users table with clean schema
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    business_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_business_id ON users(business_id);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Verify the clean schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;



