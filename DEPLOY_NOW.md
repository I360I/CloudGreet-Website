# 🚀 DEPLOY NOW - Step by Step

## ✅ **STEP 1: Verify Environment Variables** (5 min)

**Go to Vercel Dashboard → Your Project → Settings → Environment Variables**

**Add these REQUIRED variables:**

```bash
# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
JWT_SECRET=your-32-character-minimum-secret-key

# AI (Retell)
RETELL_API_KEY=your-retell-api-key

# Phone/SMS (Telnyx)
TELNYX_API_KEY=your-telnyx-api-key

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_live_or_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

**Optional (for calendar):**
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**For cron jobs:**
```bash
CRON_SECRET=random-secret-string
```

---

## ✅ **STEP 2: Deploy** (2 min)

```bash
vercel --prod
```

**OR** push to main branch (if connected to Git):
```bash
git add .
git commit -m "Ready for production"
git push origin main
```

---

## ✅ **STEP 3: Configure Webhooks** (10 min)

### **A. Telnyx Webhooks:**

1. Go to: https://portal.telnyx.com/#/app/messaging/webhooks
2. Click "Add Webhook"
3. Add these URLs (replace with your domain):

   **Voice Webhook:**
   ```
   https://your-domain.vercel.app/api/telnyx/voice-webhook
   ```
   Events: `call.initiated`, `call.answered`, `call.ended`

   **SMS Webhook:**
   ```
   https://your-domain.vercel.app/api/telnyx/sms-webhook
   ```
   Events: `message.received`, `message.sent`

### **B. Retell AI Webhooks:**

1. Go to: https://retellai.com/dashboard/settings/webhooks
2. Add webhook URL:
   ```
   https://your-domain.vercel.app/api/retell/voice-webhook
   ```
3. Enable: `tool_call`, `call_ended`

---

## ✅ **STEP 4: Verify Cron Jobs** (2 min)

**In Vercel Dashboard → Settings → Cron Jobs:**

Verify these exist (should auto-create from `vercel.json`):
- ✅ `/api/cron/process-jobs` - Every minute
- ✅ `/api/cron/health-check` - Every 5 minutes

If missing, add them manually.

---

## ✅ **STEP 5: Test Everything** (15 min)

### **Test 1: Registration**
1. Go to your production URL
2. Register a new user
3. Complete onboarding
4. ✅ Verify: User created, business created

### **Test 2: Make a Call**
1. Call your business phone number
2. ✅ Verify: Call appears in dashboard
3. ✅ Verify: Recording available (if enabled)
4. ✅ Verify: Transcript available (if enabled)

### **Test 3: Missed Call Recovery**
1. Call and hang up immediately (< 5 seconds)
2. Wait 1-2 minutes
3. ✅ Verify: SMS recovery sent

### **Test 4: Appointment Booking**
1. Call and ask AI to book appointment
2. ✅ Verify: Appointment created in dashboard
3. ✅ Verify: Stripe charged (if configured)

---

## 🐛 **TROUBLESHOOTING:**

### **Webhooks not working?**
- Check webhook URLs are correct
- Check Vercel logs: `vercel logs`
- Verify webhook secret matches

### **Cron jobs not running?**
- Check Vercel cron jobs are configured
- Check CRON_SECRET matches
- Test manually: `curl https://your-domain.vercel.app/api/cron/process-jobs`

### **Database errors?**
- Verify Supabase credentials
- Check RLS policies
- Run audit script again

---

## ✅ **YOU'RE DONE!**

Once all tests pass, your MVP is **100% REAL and WORKING**! 🎉


