# 🔧 **ENVIRONMENT VARIABLES SETUP GUIDE**

## 🎯 **COMPLETE PRODUCTION DEPLOYMENT GUIDE**

This guide will walk you through setting up all environment variables needed to make CloudGreet 100% production-ready.

---

## 📋 **REQUIRED SERVICES & ACCOUNTS**

Before setting up environment variables, you need these accounts:

### **1. Supabase (Database)**
- **Sign up**: [https://supabase.com](https://supabase.com)
- **Create project**: Choose a region close to your users
- **Get credentials**: Project URL, anon key, service role key

### **2. Stripe (Payment Processing)**
- **Sign up**: [https://stripe.com](https://stripe.com)
- **Get API keys**: Publishable key (public), Secret key (private)
- **Create products**: Set up subscription plans

### **3. Telynyx (Voice & SMS)**
- **Sign up**: [https://telynyx.com](https://telynyx.com)
- **Get credentials**: API key, messaging profile ID
- **Purchase phone numbers**: For voice and SMS

### **4. OpenAI (AI Processing)**
- **Sign up**: [https://openai.com](https://openai.com)
- **Get API key**: For GPT-4/GPT-3.5-turbo
- **Set up billing**: Add payment method

### **5. Google (Calendar Integration)**
- **Google Cloud Console**: [https://console.cloud.google.com](https://console.cloud.google.com)
- **Create project**: Enable Calendar API
- **Create credentials**: OAuth 2.0 client ID and secret

---

## 🔑 **ENVIRONMENT VARIABLES CONFIGURATION**

### **📁 Create `.env.local` File**

Create a `.env.local` file in your project root with these variables:

```bash
# ========================================
# SUPABASE DATABASE CONFIGURATION
# ========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ========================================
# STRIPE PAYMENT PROCESSING
# ========================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-publishable-key-here
STRIPE_SECRET_KEY=sk_test_your-secret-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here

# ========================================
# TELYNYX VOICE & SMS
# ========================================
TELYNYX_API_KEY=your-telynyx-api-key-here
TELYNYX_MESSAGING_PROFILE_ID=your-messaging-profile-id-here
TELYNYX_VOICE_APPLICATION_ID=your-voice-application-id-here

# ========================================
# OPENAI AI PROCESSING
# ========================================
OPENAI_API_KEY=sk-your-openai-api-key-here

# ========================================
# GOOGLE CALENDAR INTEGRATION
# ========================================
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI=https://your-domain.com/api/calendar/callback

# ========================================
# EMAIL CONFIGURATION
# ========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
FROM_EMAIL=noreply@your-domain.com
FROM_NAME=CloudGreet

# ========================================
# JWT SECURITY
# ========================================
JWT_SECRET=your-super-secure-jwt-secret-key-here
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://your-domain.com

# ========================================
# APPLICATION CONFIGURATION
# ========================================
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# ========================================
# DEFAULT PASSWORDS (CHANGE IN PRODUCTION)
# ========================================
DEFAULT_PASSWORD=your-secure-default-password-here
ADMIN_PASSWORD=your-secure-admin-password-here
NEXT_PUBLIC_ADMIN_PASSWORD=your-secure-admin-password-here

# ========================================
# PHONE NUMBERS & CONTACT
# ========================================
NEXT_PUBLIC_SUPPORT_PHONE=+1-800-CLOUDGREET
NOTIFICATION_PHONE=+1-555-123-4567
HUMAN_TRANSFER_PHONE=+1-555-123-4567

# ========================================
# BILLING CONFIGURATION
# ========================================
MONTHLY_SUBSCRIPTION_FEE=299
PER_BOOKING_FEE=15
```

---

## 🗄️ **SUPABASE SETUP INSTRUCTIONS**

### **1. Create Supabase Project**
```bash
1. Go to https://supabase.com
2. Click "Start your project"
3. Choose "New project"
4. Select organization
5. Enter project name: "cloudgreet-production"
6. Enter database password (save this!)
7. Choose region closest to your users
8. Click "Create new project"
```

### **2. Get Supabase Credentials**
```bash
1. Go to Settings > API
2. Copy "Project URL" → NEXT_PUBLIC_SUPABASE_URL
3. Copy "anon public" key → NEXT_PUBLIC_SUPABASE_ANON_KEY
4. Copy "service_role" key → SUPABASE_SERVICE_ROLE_KEY
```

### **3. Run Database Setup**
```bash
1. Go to SQL Editor in Supabase
2. Copy and paste the contents of COMPLETE_DATABASE_SETUP.sql
3. Click "Run" to create all tables and functions
4. Verify tables are created in Table Editor
```

---

## 💳 **STRIPE SETUP INSTRUCTIONS**

### **1. Create Stripe Account**
```bash
1. Go to https://stripe.com
2. Sign up for account
3. Complete account verification
4. Add bank account for payouts
```

### **2. Get Stripe API Keys**
```bash
1. Go to Developers > API keys
2. Copy "Publishable key" → NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
3. Copy "Secret key" → STRIPE_SECRET_KEY
4. Keep test keys for development, use live keys for production
```

### **3. Create Products & Prices**
```bash
1. Go to Products > Create product
2. Create "CloudGreet Monthly Subscription"
   - Price: $299/month
   - Billing: Recurring monthly
3. Create "Per Booking Fee"
   - Price: $15/booking
   - Billing: One-time
4. Note the Price IDs for your code
```

### **4. Set Up Webhooks**
```bash
1. Go to Developers > Webhooks
2. Add endpoint: https://your-domain.com/api/stripe/webhook
3. Select events:
   - invoice.payment_succeeded
   - invoice.payment_failed
   - customer.subscription.updated
   - customer.subscription.deleted
4. Copy webhook secret → STRIPE_WEBHOOK_SECRET
```

---

## 📞 **TELYNYX SETUP INSTRUCTIONS**

### **1. Create Telynyx Account**
```bash
1. Go to https://telynyx.com
2. Sign up for account
3. Complete account verification
4. Add payment method
```

### **2. Get API Credentials**
```bash
1. Go to API Keys section
2. Generate new API key → TELYNYX_API_KEY
3. Go to Messaging > Profiles
4. Create messaging profile → TELYNYX_MESSAGING_PROFILE_ID
5. Go to Voice > Applications
6. Create voice application → TELYNYX_VOICE_APPLICATION_ID
```

### **3. Purchase Phone Numbers**
```bash
1. Go to Numbers > Buy Numbers
2. Purchase local numbers for voice
3. Purchase toll-free numbers for SMS
4. Configure webhooks:
   - Voice: https://your-domain.com/api/telynyx/voice-webhook
   - SMS: https://your-domain.com/api/telynyx/sms-webhook
```

---

## 🤖 **OPENAI SETUP INSTRUCTIONS**

### **1. Create OpenAI Account**
```bash
1. Go to https://openai.com
2. Sign up for account
3. Verify email and phone
4. Add payment method (required for API access)
```

### **2. Get API Key**
```bash
1. Go to API Keys section
2. Create new secret key → OPENAI_API_KEY
3. Set usage limits to control costs
4. Enable GPT-4 access if needed
```

### **3. Set Usage Limits**
```bash
1. Go to Billing > Usage limits
2. Set monthly limit: $500 (adjust based on expected usage)
3. Set per-request limit: $10
4. Monitor usage regularly
```

---

## 📅 **GOOGLE CALENDAR SETUP INSTRUCTIONS**

### **1. Create Google Cloud Project**
```bash
1. Go to https://console.cloud.google.com
2. Create new project: "cloudgreet-calendar"
3. Enable Google Calendar API
4. Go to Credentials > Create Credentials
```

### **2. Create OAuth 2.0 Credentials**
```bash
1. Choose "OAuth client ID"
2. Application type: "Web application"
3. Authorized redirect URIs:
   - http://localhost:3000/api/calendar/callback (development)
   - https://your-domain.com/api/calendar/callback (production)
4. Copy Client ID → NEXT_PUBLIC_GOOGLE_CLIENT_ID
5. Copy Client Secret → GOOGLE_CLIENT_SECRET
```

### **3. Configure OAuth Consent Screen**
```bash
1. Go to OAuth consent screen
2. Choose "External" user type
3. Fill in app information:
   - App name: CloudGreet
   - User support email: your-email@gmail.com
   - Developer contact: your-email@gmail.com
4. Add scopes: https://www.googleapis.com/auth/calendar
5. Add test users for development
```

---

## 📧 **EMAIL SETUP INSTRUCTIONS**

### **1. Gmail SMTP Setup**
```bash
1. Enable 2-factor authentication on Gmail
2. Generate app password:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate password for "Mail"
3. Use credentials:
   - SMTP_HOST=smtp.gmail.com
   - SMTP_PORT=587
   - SMTP_USER=your-email@gmail.com
   - SMTP_PASS=your-16-char-app-password
```

### **2. Alternative Email Providers**
```bash
# SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key

# Mailgun
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

---

## 🔐 **SECURITY CONFIGURATION**

### **1. Generate Secure Secrets**
```bash
# Generate JWT secret (32+ characters)
JWT_SECRET=$(openssl rand -base64 32)

# Generate NextAuth secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Or use online generator: https://generate-secret.vercel.app/32
```

### **2. Set Strong Default Passwords**
```bash
# Generate secure passwords
DEFAULT_PASSWORD=your-secure-16-char-password
ADMIN_PASSWORD=your-secure-admin-password
```

---

## 🚀 **DEPLOYMENT CHECKLIST**

### **Before Deployment:**
- [ ] All environment variables configured
- [ ] Supabase database set up and tested
- [ ] Stripe webhooks configured and tested
- [ ] Telynyx phone numbers purchased and configured
- [ ] OpenAI API key tested
- [ ] Google Calendar integration tested
- [ ] Email configuration tested

### **After Deployment:**
- [ ] Test all API endpoints
- [ ] Verify database connections
- [ ] Test payment processing
- [ ] Test voice and SMS functionality
- [ ] Test calendar integration
- [ ] Monitor error logs
- [ ] Set up monitoring alerts

---

## 🧪 **TESTING ENVIRONMENT VARIABLES**

### **Test Script**
Create `test-env.js` to verify all environment variables:

```javascript
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'OPENAI_API_KEY',
  'TELYNYX_API_KEY',
  'JWT_SECRET'
];

console.log('🔍 Testing Environment Variables...\n');

let allPresent = true;
requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: Set`);
  } else {
    console.log(`❌ ${envVar}: Missing`);
    allPresent = false;
  }
});

if (allPresent) {
  console.log('\n🎉 All environment variables are configured!');
} else {
  console.log('\n⚠️  Some environment variables are missing. Please configure them.');
}
```

Run with: `node test-env.js`

---

## 🆘 **TROUBLESHOOTING**

### **Common Issues:**

1. **Database Connection Errors**
   - Verify Supabase URL and keys
   - Check if database is running
   - Verify RLS policies

2. **Stripe Webhook Failures**
   - Verify webhook endpoint URL
   - Check webhook secret
   - Test with Stripe CLI

3. **Telynyx API Errors**
   - Verify API key and profile ID
   - Check phone number configuration
   - Verify webhook URLs

4. **OpenAI Rate Limits**
   - Check API key validity
   - Verify billing is set up
   - Monitor usage limits

---

## 📞 **SUPPORT**

If you need help with any of these setups:

1. **Check the logs** in your application
2. **Test each service individually** using their APIs
3. **Use the test script** to verify environment variables
4. **Check service documentation** for each provider

**Your CloudGreet platform will be 100% production-ready once all environment variables are configured!** 🚀
