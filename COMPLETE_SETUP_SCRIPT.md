# 🚀 CLOUDGREET COMPLETE SETUP SCRIPT
# This script will make CloudGreet 100% production-ready

## STEP 1: SUPABASE DATABASE SETUP

### 1.1 Create Supabase Project
```bash
# Go to https://supabase.com/dashboard
# Click "New Project"
# Choose organization
# Project name: cloudgreet-production
# Database password: [GENERATE STRONG PASSWORD]
# Region: Choose closest to your users
```

### 1.2 Run Database Schema
```bash
# Copy the contents of ULTIMATE_COMPLETE_SUPABASE_SCHEMA.sql
# Go to Supabase Dashboard > SQL Editor
# Paste the entire schema and click "Run"
# This creates all tables, RLS policies, and functions
```

### 1.3 Get Supabase Credentials
```bash
# From Supabase Dashboard > Settings > API
# Copy these values:
# - Project URL (https://xxx.supabase.co)
# - Service Role Key (starts with eyJ...)
# - Anon Key (starts with eyJ...)
```

## STEP 2: ENVIRONMENT VARIABLES SETUP

### 2.1 Create .env.local file
```bash
# Create .env.local in project root with these variables:

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Telnyx Configuration (for voice/SMS)
TELNYX_API_KEY=your_telnyx_api_key_here
TELNYX_WEBHOOK_SECRET=your_webhook_secret_here

# Google Calendar Integration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Email Service (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Application URLs
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app

# Stripe Configuration (for billing)
STRIPE_SECRET_KEY=your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
```

### 2.2 Set Vercel Environment Variables
```bash
# Go to Vercel Dashboard > Your Project > Settings > Environment Variables
# Add ALL the variables from .env.local above
# Make sure to set them for Production, Preview, and Development
```

## STEP 3: THIRD-PARTY SERVICE SETUP

### 3.1 OpenAI Setup
```bash
# Go to https://platform.openai.com/api-keys
# Create new API key
# Add to environment variables
# Ensure you have credits in your OpenAI account
```

### 3.2 Telnyx Setup (Voice/SMS)
```bash
# Go to https://portal.telnyx.com/
# Create account and get API key
# Set up webhook URL: https://your-domain.vercel.app/api/telnyx/voice-webhook
# Configure phone number for your business
# Add to environment variables
```

### 3.3 Google Calendar Setup
```bash
# Go to https://console.developers.google.com/
# Create new project
# Enable Google Calendar API
# Create OAuth 2.0 credentials
# Set authorized redirect URIs: https://your-domain.vercel.app/api/calendar/callback
# Add credentials to environment variables
```

### 3.4 SendGrid Setup (Email)
```bash
# Go to https://app.sendgrid.com/
# Create account and get API key
# Verify sender email address
# Add API key to environment variables
```

### 3.5 Stripe Setup (Billing)
```bash
# Go to https://dashboard.stripe.com/
# Get API keys from Developers > API Keys
# Set up webhook endpoint: https://your-domain.vercel.app/api/stripe/webhook
# Add keys to environment variables
```

## STEP 4: DEPLOYMENT SETUP

### 4.1 Deploy to Vercel
```bash
# Make sure all environment variables are set in Vercel
# Deploy the application
vercel --prod

# Test the deployment
curl https://your-domain.vercel.app/api/health
```

### 4.2 Configure Webhooks
```bash
# Telnyx Webhook: https://your-domain.vercel.app/api/telnyx/voice-webhook
# Stripe Webhook: https://your-domain.vercel.app/api/stripe/webhook
# Google Calendar Callback: https://your-domain.vercel.app/api/calendar/callback
```

## STEP 5: TESTING & VERIFICATION

### 5.1 Test Registration
```bash
# Go to https://your-domain.vercel.app/register-simple
# Fill out registration form
# Should create user in Supabase
# Should redirect to dashboard
```

### 5.2 Test Voice System
```bash
# Go to https://your-domain.vercel.app/landing
# Enter phone number and click call button
# Should initiate call via Telnyx
# AI should respond using OpenAI
```

### 5.3 Test Dashboard
```bash
# Login to dashboard
# Should show real data from Supabase
# Should display analytics and metrics
```

## STEP 6: PRODUCTION OPTIMIZATION

### 6.1 Security Headers
```bash
# Verify security headers are set
# Check for HTTPS enforcement
# Ensure CORS is properly configured
```

### 6.2 Performance Monitoring
```bash
# Set up Vercel Analytics
# Monitor API response times
# Check for any 500 errors
```

### 6.3 Database Optimization
```bash
# Run database queries to check performance
# Ensure indexes are created
# Monitor connection limits
```

## STEP 7: FINAL VERIFICATION

### 7.1 End-to-End Test
```bash
# 1. Register new business
# 2. Complete onboarding
# 3. Test voice call
# 4. Test SMS functionality
# 5. Test calendar integration
# 6. Test billing system
# 7. Test dashboard analytics
```

### 7.2 Production Checklist
```bash
# ✅ Supabase database configured
# ✅ All environment variables set
# ✅ Third-party services connected
# ✅ Webhooks configured
# ✅ Security headers applied
# ✅ Performance optimized
# ✅ Error handling implemented
# ✅ Logging configured
# ✅ Monitoring set up
```

## EMERGENCY FIXES

### If Registration Still Fails:
```bash
# Check Supabase connection
# Verify JWT_SECRET is set
# Check database permissions
# Review API logs in Vercel
```

### If Voice Calls Don't Work:
```bash
# Verify Telnyx API key
# Check webhook URL configuration
# Test OpenAI API key
# Review voice webhook logs
```

### If Dashboard Shows No Data:
```bash
# Check Supabase RLS policies
# Verify user authentication
# Test database queries
# Check API endpoints
```

## SUCCESS CRITERIA

The system is fully working when:
- ✅ Users can register and login
- ✅ Voice calls connect to AI
- ✅ SMS messages send successfully
- ✅ Calendar appointments book
- ✅ Dashboard shows real data
- ✅ Billing system processes payments
- ✅ All APIs return 200 status codes
- ✅ No 500 errors in logs
- ✅ Real-time features work
- ✅ Multi-tenant data isolation works

## NEXT STEPS AFTER SETUP

1. **Monitor Performance**: Set up alerts for any failures
2. **User Testing**: Have real users test the system
3. **Feedback Collection**: Gather user feedback and iterate
4. **Scaling**: Monitor usage and scale as needed
5. **Maintenance**: Regular updates and security patches

---

# 🎯 THIS SCRIPT WILL MAKE CLOUDGREET 100% REAL AND PRODUCTION-READY

Follow each step exactly, and you'll have a fully functional AI receptionist platform that can handle real customers, process real payments, and provide real value to service businesses.

**NO MORE FAKE FEATURES - EVERYTHING WILL BE REAL!**
