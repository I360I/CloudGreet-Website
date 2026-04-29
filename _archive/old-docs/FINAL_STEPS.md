# Final Steps to Complete Monitor Setup

## ✅ Step 1: Add CRON_SECRET to Vercel (Required!)

Your app needs this to verify requests from GitHub Actions.

1. Go to: https://vercel.com/dashboard
2. Click on your CloudGreet project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Add:
   - **Key**: `CRON_SECRET`
   - **Value**: `F16diJmRWqmWcd0ncpk443Ah1JNQMVhxiwFEe/pwlw8=`
   - **Environment**: Select **Production** (and Preview if you want)
6. Click **"Save"**

---

## ✅ Step 2: Create Monitor Employee Account

The sales dashboard monitor needs a real user account.

### Option A: Quick Way (Supabase Dashboard)

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Users**
4. Click **"Add user"** → **"Create new user"**
5. Fill in:
   - **Email**: `monitor@cloudgreet.com`
   - **Password**: `MonitorPass123!`
   - ✅ Check **"Auto Confirm User"**
6. Click **"Create user"**
7. Copy the **User UUID** (you'll need it)

8. Go to **SQL Editor** in Supabase
9. Run this SQL (replace `USER_UUID_HERE` with the UUID you copied):

```sql
INSERT INTO custom_users (
  id,
  email, 
  password_hash, 
  first_name, 
  last_name,
  role,
  is_active,
  created_at
) VALUES (
  'USER_UUID_HERE', -- Replace with UUID from auth.users
  'monitor@cloudgreet.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- Hash for 'MonitorPass123!'
  'Monitor',
  'User',
  'sales',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_active = true;
```

### Option B: Register Through Your App

1. Go to your registration page
2. Register with:
   - Email: `monitor@cloudgreet.com`
   - Password: `MonitorPass123!`
3. Then run this SQL in Supabase:

```sql
UPDATE custom_users 
SET role = 'sales', is_active = true 
WHERE email = 'monitor@cloudgreet.com';
```

---

## ✅ Step 3: Test Everything

Run the diagnostic script to verify:

```bash
node scripts/e2e-monitor-diagnostic.js
```

You should see:
- ✅ All schema checks pass
- ✅ All endpoint tests pass
- ✅ All monitor scripts pass

---

## ✅ Step 4: Check GitHub Actions

1. Go to your GitHub repo
2. Click **"Actions"** tab
3. You should see **"Synthetic Monitors"** workflow
4. Click on it to see if it's running/passing

The monitors run **hourly**, so you might need to wait a bit or manually trigger them:
- Go to Actions → Synthetic Monitors → "Run workflow" button

---

## 🎉 Done!

Once you complete these steps, your monitors should work!

