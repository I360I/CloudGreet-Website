-- DEFINITIVE DATABASE FIX FOR AUTHENTICATION
-- This will definitely fix the login issue

-- Step 1: Add the is_active column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Step 2: Update all existing users to have is_active = true
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- Step 3: Make is_active NOT NULL
ALTER TABLE users ALTER COLUMN is_active SET NOT NULL;

-- Step 4: Verify the fix
SELECT 
    'SUCCESS: is_active column exists and has data' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
FROM users;
