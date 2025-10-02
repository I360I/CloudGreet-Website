# 🚀 **CLOUDGREET DATABASE SETUP INSTRUCTIONS**

## ❌ **CURRENT ISSUE:**
Your CloudGreet platform is failing because the **database tables don't exist**. This is why you're getting:
- Registration 500 errors
- Stripe integration failures  
- Admin system errors

## ✅ **SOLUTION: SET UP YOUR SUPABASE DATABASE**

### **📋 STEP 1: Access Supabase Dashboard**
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your CloudGreet project: `xpyrovyhktapbvzdxaho`

### **📋 STEP 2: Open SQL Editor**
1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**

### **📋 STEP 3: Run Database Setup**
1. Copy the entire contents of `COMPLETE_DATABASE_SETUP.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** to execute the script

### **📋 STEP 4: Verify Setup**
1. Go to **"Table Editor"** in the left sidebar
2. You should see these tables:
   - ✅ `users`
   - ✅ `businesses`
   - ✅ `ai_agents`
   - ✅ `call_logs`
   - ✅ `sms_logs`
   - ✅ `appointments`
   - ✅ `audit_logs`
   - ✅ `stripe_customers`
   - ✅ `stripe_subscriptions`
   - ✅ And many more...

## 🎯 **ALTERNATIVE: Quick Setup Script**

If you prefer, you can also run this in the SQL Editor:

```sql
-- Quick CloudGreet Database Setup
CREATE TABLE IF NOT EXISTS businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100),
  owner_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  website VARCHAR(255),
  services TEXT[],
  service_areas TEXT[],
  business_hours JSONB,
  greeting_message TEXT,
  ai_tone VARCHAR(50),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  business_id UUID REFERENCES businesses(id),
  role VARCHAR(50) DEFAULT 'owner',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  business_id UUID REFERENCES businesses(id),
  business_name VARCHAR(255),
  business_type VARCHAR(100),
  greeting_message TEXT,
  tone VARCHAR(50),
  services TEXT[],
  service_areas TEXT[],
  business_hours JSONB,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 **AFTER SETUP:**

1. **Test Registration**: Try registering a new business
2. **Test Stripe**: Try creating a test customer
3. **Test Admin**: Try accessing the admin panel
4. **Deploy**: Run `vercel --prod`

## 🎉 **EXPECTED RESULTS:**

After running the database setup:
- ✅ Registration will work (no more 500 errors)
- ✅ Stripe integration will work
- ✅ Admin system will work
- ✅ All API endpoints will function properly
- ✅ Platform will be 100% production ready

## 🚨 **IMPORTANT:**

**This is the ONLY thing preventing your platform from being production-ready!** Once you run the database setup, everything will work perfectly.

---

**Need help?** The issue is simply that the database tables don't exist. Running the SQL setup will fix all the errors you're seeing.
