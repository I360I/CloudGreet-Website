-- COMPLETE USER FIX - Update all existing users
-- Run this in Supabase SQL Editor

-- Step 1: Update ALL existing users to have is_active = true
UPDATE users 
SET is_active = true 
WHERE is_active IS NULL OR is_active = false;

-- Step 2: Verify the fix
SELECT 
    'VERIFICATION: All users should have is_active = true' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
    COUNT(CASE WHEN is_active = false OR is_active IS NULL THEN 1 END) as inactive_users
FROM users;

-- Step 3: Show the latest users to verify
SELECT 
    id, 
    email, 
    name,
    is_active,
    created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;
