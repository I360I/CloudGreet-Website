# ✅ Vercel Deployment Checklist - CloudGreet

**Use this checklist to verify your Vercel deployment is configured correctly.**

---

## 1️⃣ Check Environment Variables (CRITICAL)

### Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

**Required for basic functionality:**
```bash
□ NEXT_PUBLIC_SUPABASE_URL
   ↳ Should be: https://xxxxx.supabase.co
   ↳ NOT: "your-project.supabase.co" or "placeholder"

□ NEXT_PUBLIC_SUPABASE_ANON_KEY
   ↳ Should start with: eyJ...
   ↳ Long string (200+ chars)

□ SUPABASE_SERVICE_ROLE_KEY
   ↳ Should start with: eyJ...
   ↳ Long string (200+ chars)
   ↳ DIFFERENT from anon key

□ JWT_SECRET
   ↳ Should be: Random 32+ character string
   ↳ NOT: "your_secret" or "placeholder"

□ NEXT_PUBLIC_BASE_URL
   ↳ Should be: https://your-actual-domain.vercel.app
   ↳ OR: https://cloudgreet.com (if custom domain)

□ NEXT_PUBLIC_APP_URL
   ↳ Same as NEXT_PUBLIC_BASE_URL
```

**Required for phone system:**
```bash
□ TELNYX_API_KEY
   ↳ Should start with: KEY...
   ↳ NOT: "your_telnyx_api_key_here"

□ TELNYX_PUBLIC_KEY
   ↳ From Telnyx dashboard

□ TELNYX_CONNECTION_ID
   ↳ UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

□ RETELL_API_KEY
   ↳ From Retell dashboard

□ NEXT_PUBLIC_RETELL_API_KEY
   ↳ Same as RETELL_API_KEY

□ RETELL_WEBHOOK_SECRET
   ↳ From Retell dashboard
```

**Required for billing:**
```bash
□ STRIPE_SECRET_KEY
   ↳ Should start with: sk_live_... (production)
   ↳ OR: sk_test_... (testing)

□ STRIPE_PUBLISHABLE_KEY
   ↳ Should start with: pk_live_... (production)
   ↳ OR: pk_test_... (testing)

□ STRIPE_WEBHOOK_SECRET
   ↳ Should start with: whsec_...
   ↳ Get from Stripe webhook endpoint
```

**Required for AI:**
```bash
□ OPENAI_API_KEY
   ↳ Should start with: sk-proj-...
   ↳ OR: sk-...
```

**Optional but recommended:**
```bash
□ RESEND_API_KEY (for email notifications)
□ GOOGLE_CLIENT_ID (for calendar)
□ GOOGLE_CLIENT_SECRET (for calendar)
□ ADMIN_PASSWORD (for admin access)
```

---

## 2️⃣ Test Health Endpoint

### Go to: https://your-domain.vercel.app/api/health

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-02T..."
}
```

**If it fails:**
- ❌ Deployment didn't succeed
- ❌ Check Vercel deployment logs

---

## 3️⃣ Check Environment Variables are Loaded

### Go to: https://your-domain.vercel.app/api/health/env

**Expected response:**
```json
{
  "supabase": true,
  "jwt": true,
  "telnyx": true,
  "retell": true,
  "stripe": true,
  "openai": true
}
```

**If any are `false`:**
- Go back to Step 1
- That integration is not configured

---

## 4️⃣ Test Database Connection

### Go to Supabase SQL Editor

**Run this query:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**You should see these tables:**
```
□ businesses
□ calls
□ appointments
□ custom_users
□ ai_agents (optional)
□ stripe_subscriptions
□ webhook_events
□ missed_call_recoveries
```

**If tables are missing:**
- Run the migration: `migrations/perfect-database-setup.sql`
- Copy/paste into Supabase SQL Editor
- Click "Run"

---

## 5️⃣ Test Authentication

### Test Registration
**Go to:** https://your-domain.vercel.app/register-simple

**Try to create an account:**
- Enter email: test@test.com
- Enter password: TestPassword123!
- Click Register

**Expected:**
- ✅ Success message
- ✅ Redirected to dashboard or login

**If it fails:**
- Check browser console for errors
- Check Vercel function logs
- Verify JWT_SECRET is set
- Verify database tables exist

### Test Login
**Go to:** https://your-domain.vercel.app/login-simple

**Try to login:**
- Enter the email/password you just created
- Click Login

**Expected:**
- ✅ Success message
- ✅ Redirected to dashboard
- ✅ Can see dashboard page

**If it fails:**
- Check Vercel function logs
- Verify JWT_SECRET matches registration
- Verify user was created in database

---

## 6️⃣ Configure Webhooks

### Stripe Webhook
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.vercel.app/api/stripe/webhook`
4. Select events:
   ```
   □ checkout.session.completed
   □ customer.subscription.created
   □ customer.subscription.updated
   □ customer.subscription.deleted
   □ invoice.payment_succeeded
   □ invoice.payment_failed
   ```
5. Click "Add endpoint"
6. Copy "Signing secret" (starts with `whsec_`)
7. Add to Vercel env vars: `STRIPE_WEBHOOK_SECRET`
8. Redeploy

### Telnyx Webhook
1. Go to: https://portal.telnyx.com
2. Navigate to: Telephony → Connections
3. Select your connection
4. Set webhook URL: `https://your-domain.vercel.app/api/telnyx/voice-webhook`
5. Set method: POST
6. Set failover: Off
7. Save

### Retell Webhook
1. Go to: https://app.retellai.com (or your Retell dashboard)
2. Navigate to: Settings → Webhooks
3. Set webhook URL: `https://your-domain.vercel.app/api/retell/voice-webhook`
4. Copy webhook secret
5. Add to Vercel env vars: `RETELL_WEBHOOK_SECRET`
6. Redeploy

---

## 7️⃣ Test Phone System (Optional)

**Only if you have phone system set up:**

1. Make a test call to your Telnyx number
2. Check Vercel function logs for webhook receipt
3. Verify call appears in database:
   ```sql
   SELECT * FROM calls ORDER BY created_at DESC LIMIT 5;
   ```

---

## 8️⃣ Test Billing (Optional)

**Only if you have Stripe set up:**

1. Go to dashboard billing page
2. Try to start checkout
3. Use Stripe test card: 4242 4242 4242 4242
4. Verify webhook fires in Stripe dashboard
5. Verify subscription created in database:
   ```sql
   SELECT * FROM stripe_subscriptions;
   ```

---

## 🚨 Common Issues & Fixes

### Issue: "Unauthorized" error everywhere
**Fix:** 
- Check JWT_SECRET is set in Vercel
- Verify it's the same for all environments (production/preview)
- Redeploy after adding

### Issue: "Database connection failed"
**Fix:**
- Check Supabase credentials in Vercel env vars
- Verify Supabase project is active
- Check Supabase dashboard for IP restrictions

### Issue: Webhooks not firing
**Fix:**
- Verify webhook URLs are correct (use your actual domain)
- Check webhook secrets are set in Vercel
- Verify webhook endpoints are configured in external services
- Check Vercel function logs for errors

### Issue: "Environment variable not found"
**Fix:**
- Add the variable in Vercel dashboard
- Make sure it's set for "Production" environment
- Redeploy after adding
- Wait 1-2 minutes for deployment to complete

### Issue: Build succeeds but site shows error
**Fix:**
- Check Vercel function logs
- Most likely: database or env var issue
- Test /api/health/env to see which integration is missing

---

## ✅ Final Checklist

**Before declaring "IT WORKS":**

```bash
□ Health check endpoint returns 200
□ Environment check shows all true
□ Can register a new account
□ Can login with that account
□ Can see dashboard
□ Database has the user record
□ Stripe webhook is configured (if using billing)
□ Telnyx webhook is configured (if using phone)
□ Made a test call (if using phone system)
□ Call appears in database (if using phone system)
```

---

## 🎯 Success Criteria

**Minimum to be "working":**
1. ✅ Site loads
2. ✅ Can register
3. ✅ Can login
4. ✅ Can see dashboard
5. ✅ No console errors

**Fully working:**
1. ✅ All of above
2. ✅ Phone system receives calls
3. ✅ Calls appear in dashboard
4. ✅ Billing checkout works
5. ✅ Webhooks fire correctly

---

**If you complete this checklist and something still doesn't work, check Vercel function logs for specific error messages.**

