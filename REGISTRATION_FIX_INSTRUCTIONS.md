# Registration 500 Error - Fix Instructions

## Problem
Registration API returns 500 error because `custom_users` table is missing `name` and `role` columns.

## Root Cause
The registration service (`lib/auth/register-service.ts`) tries to insert `name` and `role` into `custom_users` table, but these columns don't exist in the current database schema.

## Solution

### Option 1: Run SQL Migration (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the migration: `migrations/FIX_CUSTOM_USERS_TABLE.sql`

The migration will:
- Add `name VARCHAR(255)` column to `custom_users`
- Add `role VARCHAR(50)` column to `custom_users` with default 'owner'
- Update existing rows with derived names and default roles

### Option 2: Run Node Script
```bash
node scripts/fix-registration-schema.js
```

**Note**: This script may not work if Supabase RPC functions aren't available. Use Option 1 if this fails.

## Verification

After running the migration, verify the columns exist:

```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'custom_users' 
ORDER BY ordinal_position;
```

You should see:
- `name` VARCHAR(255)
- `role` VARCHAR(50) with default 'owner'

## Testing

After fixing, test registration:
1. Go to https://cloudgreet.com/register-simple
2. Fill in all required fields
3. Submit the form
4. Should successfully create account and redirect to dashboard

## Additional Fixes Applied

1. ✅ Added `name` field to `users` table insert (was missing)
2. ✅ Added error handling for update operations
3. ✅ Created migration script

## Files Changed

- `migrations/FIX_CUSTOM_USERS_TABLE.sql` - SQL migration to add missing columns
- `lib/auth/register-service.ts` - Fixed `users` table insert to include `name` field
- `scripts/fix-registration-schema.js` - Node script to fix schema (optional)

