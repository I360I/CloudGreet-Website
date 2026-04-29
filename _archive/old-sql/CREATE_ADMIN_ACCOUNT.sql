-- =====================================================
-- CREATE ADMIN ACCOUNT FOR ANTHONY
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "New Query"
-- 5. Copy and paste this ENTIRE file
-- 6. Click "Run" (or press Ctrl+Enter)
-- 7. You should see "Success. No rows returned"
-- 
-- Then login at: https://cloudgreet.com/admin/login
-- Email: anthony@cloudgreet.com
-- Password: Anthonyis42
-- =====================================================

INSERT INTO custom_users (
  email,
  password_hash,
  name,
  first_name,
  last_name,
  role,
  is_admin,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'anthony@cloudgreet.com',
  '$2a$10$BNhWikVOVfIx6CzPFPW08O1RTeNwQbk3vhVOmtSFBoaq0o2xJAIEe',
  'Anthony CloudGreet',
  'Anthony',
  'CloudGreet',
  'admin',
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = 'admin',
  is_admin = true,
  is_active = true,
  updated_at = NOW();

-- Verify the account was created
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  is_admin,
  is_active,
  created_at
FROM custom_users
WHERE email = 'anthony@cloudgreet.com';

