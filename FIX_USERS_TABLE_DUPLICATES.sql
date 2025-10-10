-- Fix duplicate columns in users table
-- Run this in Supabase SQL Editor

-- First, let's see what columns we have and their order
SELECT column_name, ordinal_position, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- The users table has duplicate columns which is causing issues
-- We need to clean this up by recreating the table with the correct schema

-- Create a backup of existing data (if any)
CREATE TABLE users_backup AS SELECT * FROM users;

-- Drop the problematic users table
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

-- Restore data from backup (if any)
INSERT INTO users (id, email, password_hash, first_name, last_name, business_id, is_active, is_admin, phone, last_login, created_at, updated_at)
SELECT 
    id,
    email,
    password_hash,
    first_name,
    last_name,
    business_id,
    COALESCE(is_active, true),
    COALESCE(is_admin, false),
    phone::VARCHAR(20),
    last_login,
    COALESCE(created_at, NOW()),
    COALESCE(updated_at, NOW())
FROM users_backup
WHERE email IS NOT NULL AND password_hash IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- Drop backup table
DROP TABLE users_backup;

-- Verify the clean schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
