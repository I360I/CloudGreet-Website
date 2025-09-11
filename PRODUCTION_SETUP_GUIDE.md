# 🚀 CloudGreet Production Setup Guide

## ⚠️ **IMPORTANT: NO DEMO MODES**

This system is now **100% production-ready** with **NO demo modes anywhere**. All APIs require real API keys and will fail gracefully if not properly configured.

---

## 🔧 **REQUIRED ENVIRONMENT VARIABLES**

Create a `.env.local` file in your project root with the following **REQUIRED** variables:

```bash
# Supabase Configuration - REQUIRED
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# NextAuth Configuration - REQUIRED
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Stripe Configuration - REQUIRED
STRIPE_SECRET_KEY=your-stripe-secret-key-here
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key-here
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret-here

# Resend Configuration - REQUIRED
RESEND_API_KEY=your-resend-api-key-here

# Azure Configuration - REQUIRED
AZURE_COMMUNICATION_CONNECTION_STRING=your-azure-communication-connection-string
AZURE_COMMUNICATION_RESOURCE_NAME=your-azure-communication-resource-name
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=your-azure-speech-region

# Optional Integrations
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
RETELL_API_KEY=your-retell-api-key-here
```

---

## 🗄️ **DATABASE SETUP (SUPABASE)**

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and API keys

### 2. Create Database Tables
Run this SQL in your Supabase SQL editor:

```sql
-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  company_name TEXT,
  business_type TEXT DEFAULT 'HVAC',
  phone_number TEXT,
  onboarding_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voice agents table
CREATE TABLE voice_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  agent_id TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  status TEXT DEFAULT 'active',
  configuration JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call logs table
CREATE TABLE call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES voice_agents(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  recording_url TEXT,
  transcript TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table
CREATE TABLE analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed for your security requirements)
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id::text);
```

---

## 💳 **STRIPE SETUP**

### 1. Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Create account and get API keys
3. Set up webhooks for your domain

### 2. Configure Webhooks
Add these webhook endpoints in Stripe dashboard:
- `https://yourdomain.com/api/stripe/webhook`

---

## 📧 **RESEND SETUP**

### 1. Create Resend Account
1. Go to [resend.com](https://resend.com)
2. Create account and get API key
3. Verify your domain

---

## ☁️ **AZURE SETUP**

### 1. Create Azure Account
1. Go to [azure.microsoft.com](https://azure.microsoft.com)
2. Create Speech Services resource
3. Create Communication Services resource
4. Get API keys and connection strings

---

## 🚀 **DEPLOYMENT**

### 1. Build for Production
```bash
npm run build
```

### 2. Deploy to Vercel
```bash
npm install -g vercel
vercel --prod
```

### 3. Set Environment Variables
Add all environment variables in your deployment platform.

---

## ✅ **VERIFICATION CHECKLIST**

- [ ] Supabase database created and tables set up
- [ ] All environment variables configured
- [ ] Stripe account set up with webhooks
- [ ] Resend account configured
- [ ] Azure services configured
- [ ] Domain deployed and accessible
- [ ] SSL certificate active
- [ ] All APIs responding correctly

---

## 🔒 **SECURITY FEATURES**

- ✅ Security headers configured
- ✅ Rate limiting enabled
- ✅ Input validation on all forms
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Secure session management

---

## 📊 **MONITORING**

The system includes:
- Error logging
- Performance monitoring
- Analytics tracking
- Call recording
- User activity logs

---

## 🆘 **SUPPORT**

If you encounter any issues:
1. Check environment variables are set correctly
2. Verify all API keys are valid
3. Check database connection
4. Review error logs in browser console
5. Check server logs for detailed error messages

---

## 🎉 **READY FOR PRODUCTION**

Your CloudGreet system is now **100% production-ready** with:
- No demo modes anywhere
- Real API integrations only
- Professional error handling
- Security best practices
- Scalable architecture
- Client-ready interface

**The system will work perfectly for your clients!** 🚀
