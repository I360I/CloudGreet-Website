# Multi-Tenant Registration Verification

## Current Status
⚠️ **Registration partially working** - `users` table missing `name` column

## What Registration Does (Multi-Tenant Flow)

### 1. Creates Supabase Auth User ✅
- User ID: UUID from Supabase Auth
- Email: Lowercased and validated
- Password: Hashed with bcrypt (12 rounds)
- Email confirmed: true

### 2. Creates `custom_users` Record ✅
- `id`: Same as auth user ID
- `email`: Lowercased
- `password_hash`: Bcrypt hash
- `first_name`: From form
- `last_name`: From form
- `name`: Derived from first_name + last_name
- `role`: 'owner'
- `business_id`: Set after business creation
- `is_active`: true
- `is_admin`: false

### 3. Creates `users` Record ⚠️
- `id`: Same as auth user ID
- `email`: Lowercased
- `first_name`: From form
- `last_name`: From form
- `phone`: From form (sanitized)
- `role`: 'owner'
- `business_id`: Set after business creation
- ⚠️ **ISSUE**: `name` column doesn't exist in `users` table

### 4. Creates `businesses` Record ✅
- `id`: New UUID
- `owner_id`: Links to user ID
- `business_name`: From form
- `business_type`: From form (normalized: HVAC, Painting, Roofing, etc.)
- `email`: Lowercased
- `phone`: From form (sanitized)
- `phone_number`: Same as phone
- `address`: From form
- `website`: From form (optional)

### 5. Updates User Records with Business ID ✅
- Updates `custom_users.business_id` = business.id
- Updates `users.business_id` = business.id
- Both records now linked to business

### 6. Creates JWT Token ✅
- Contains: `userId`, `businessId`, `email`, `role`
- Used for all authenticated requests
- Enforces tenant isolation

## Multi-Tenant Isolation

### How It Works:
1. **Registration**: Each user gets their own `business_id`
2. **JWT Token**: Contains `businessId` for all requests
3. **API Queries**: All queries filter by `business_id`
4. **Data Isolation**: Users can only see their own business data

### Verification Points:
- ✅ `custom_users.business_id` is set
- ✅ `users.business_id` is set
- ✅ `businesses.owner_id` links to user
- ✅ JWT token contains `businessId`
- ✅ All API endpoints use `requireAuth` which extracts `businessId`
- ✅ All database queries filter by `business_id`

## Current Issue

**Error**: `Could not find the 'name' column of 'users' in the schema cache`

**Fix Applied**: Removed `name` field from `users` table insert
**Migration Created**: `migrations/FIX_USERS_TABLE_NAME_COLUMN.sql` (optional - adds column if needed)

## Required Data Saved

### User Data:
- ✅ Email (lowercased)
- ✅ Password (hashed)
- ✅ First name
- ✅ Last name
- ✅ Full name (in custom_users)
- ✅ Phone (sanitized)
- ✅ Role: 'owner'
- ✅ Business ID (linked)

### Business Data:
- ✅ Business name
- ✅ Business type (normalized)
- ✅ Email
- ✅ Phone
- ✅ Address
- ✅ Website (optional)
- ✅ Owner ID (linked to user)

### Multi-Tenant Links:
- ✅ `custom_users.business_id` → `businesses.id`
- ✅ `users.business_id` → `businesses.id`
- ✅ `businesses.owner_id` → `users.id` / `custom_users.id`

## Next Steps

1. **Run Migration** (if you want `name` column in `users` table):
   ```sql
   -- Run: migrations/FIX_USERS_TABLE_NAME_COLUMN.sql
   ```

2. **OR**: Code fix is deployed (removes `name` from insert)

3. **Test Registration** again after deployment

4. **Verify Multi-Tenant**:
   - Register 2 different businesses
   - Verify each can only see their own data
   - Verify `business_id` is different for each
   - Verify JWT tokens contain correct `businessId`

