# 🔑 CloudGreet Required Environment Variables

## ⚡ CRITICAL - Platform Will Not Work Without These:

### **1. Database (Supabase)**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```
**What breaks without it:** Registration, Login, Dashboard, ALL data storage

---

### **2. AI Conversations (OpenAI)**
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```
**What breaks without it:** AI agent testing, AI conversations, entire AI receptionist functionality

---

### **3. Phone & SMS (Telnyx)**
```bash
TELYNX_API_KEY=your-telnyx-api-key-here
TELYNX_PHONE_NUMBER=+1234567890
TELYNX_CONNECTION_ID=your-connection-id-here
TELYNX_MESSAGING_PROFILE_ID=your-messaging-profile-id-here
```
**What breaks without it:** Phone provisioning, SMS notifications, voice calls, webhooks

---

### **4. Payments (Stripe)**
```bash
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```
**What breaks without it:** Subscriptions, payments, billing, phone provisioning (requires active subscription)

---

### **5. Security (JWT)**
```bash
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters-long
```
**What breaks without it:** Login, authentication, all protected routes

---

## 📧 OPTIONAL - Enhanced Features:

### **Email Notifications (Resend)**
```bash
RESEND_API_KEY=re_your-resend-api-key-here
```
**What breaks without it:** Email notifications for lead automation (returns 503 error)

---

## 🎯 RECOMMENDED - Additional Configuration:

### **Pricing Configuration**
```bash
MONTHLY_SUBSCRIPTION_FEE=200
BOOKING_FEE=50
PHONE_MONTHLY_COST=200
STRIPE_STARTER_AMOUNT=9700
STRIPE_PRO_AMOUNT=19700
STRIPE_PREMIUM_AMOUNT=49700
```

### **Application URLs**
```bash
NEXT_PUBLIC_BASE_URL=https://cloudgreet.com
NEXT_PUBLIC_APP_URL=https://cloudgreet.com
VERCEL_URL=cloud-greet-website.vercel.app
```

### **Notification Phone**
```bash
NOTIFICATION_PHONE=+1234567890
```

---

## ✅ VERIFICATION:

To verify all critical services are configured, visit:
```
https://your-domain.com/api/health/dependencies
```

This will show the status of:
- ✅ Supabase (Database)
- ✅ OpenAI (AI)
- ✅ Telnyx (Phone/SMS)
- ✅ Stripe (Payments)
- ✅ JWT (Security)

---

## 🚨 PRODUCTION REQUIREMENTS:

**NEVER use these in production:**
- ❌ Fallback secrets
- ❌ Test API keys
- ❌ Demo mode
- ❌ Placeholder values

**ALL services must be configured with REAL credentials for the platform to work.**




