# CloudGreet Supabase Database Setup Guide

## Quick Setup Instructions

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/xpyrovyhktapbvzdxaho

2. **Navigate to SQL Editor** in the left sidebar

3. **Run the following SQL commands** to create all required tables:

### 1. Create Users Table
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) DEFAULT '',
  business_type VARCHAR(100) DEFAULT 'HVAC',
  phone_number VARCHAR(20) DEFAULT '',
  onboarding_status VARCHAR(50) DEFAULT 'pending',
  retell_agent_id VARCHAR(255),
  retell_phone_number VARCHAR(20),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Create Customers Table
```sql
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Create Calls Table
```sql
CREATE TABLE IF NOT EXISTS calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  call_id VARCHAR(255) UNIQUE,
  phone_number VARCHAR(20),
  duration INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'completed',
  transcript TEXT,
  recording_url TEXT,
  satisfaction_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Create Appointments Table
```sql
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  service_type VARCHAR(100),
  price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Create Notifications Table
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6. Create Indexes for Performance
```sql
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
```

## Row Level Security (RLS) Setup

After creating the tables, enable RLS and create policies:

### Enable RLS
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

### Create Policies
```sql
-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Customers policies
CREATE POLICY "Users can view own customers" ON customers FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own customers" ON customers FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own customers" ON customers FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Calls policies
CREATE POLICY "Users can view own calls" ON calls FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own calls" ON calls FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Appointments policies
CREATE POLICY "Users can view own appointments" ON appointments FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own appointments" ON appointments FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own appointments" ON appointments FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own notifications" ON notifications FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid()::text = user_id::text);
```

## Testing the Setup

After running all the SQL commands:

1. **Test the registration API**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","email":"test@example.com","password":"TestPass123!","companyName":"Test Company","businessType":"restaurant"}'
   ```

2. **Check the status**:
   ```bash
   curl http://localhost:3000/api/status-check
   ```

## Current Integration Status

- ✅ **Stripe**: Working (Live account configured)
- ❌ **Retell AI**: API key needs verification
- ⚠️ **Resend**: Domain verification needed
- ⚠️ **Supabase**: Database tables need to be created

## Next Steps

1. Create the database tables using the SQL above
2. Test user registration
3. Test the onboarding flow
4. Verify Retell AI API key
5. Set up domain verification for Resend
