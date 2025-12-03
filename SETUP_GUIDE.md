# CloudGreet Setup Guide - Step-by-Step Launch

**Status:** Business Partner Companion Guide  
**Purpose:** Get CloudGreet from 95% complete to accepting paying customers

---

## 🎯 Quick Status Check

Before you start, verify what's already done:
```bash
# Check if database is set up
npm run validate:db

# Check if environment variables are set
npm run validate:env
```

---

## Phase 1: Database Setup (30 minutes)

### Step 1.1: Access Supabase

1. Go to https://supabase.com/dashboard
2. Log in and select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### Step 1.2: Run Database Schema

1. Open the file: `ULTIMATE_COMPLETE_SUPABASE_SCHEMA.sql`
2. Copy the **ENTIRE** contents (all 79 tables)
3. Paste into Supabase SQL Editor
4. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)
5. Wait for completion (should take 30-60 seconds)

### Step 1.3: Verify Tables Created

Run this query in Supabase SQL Editor:
```sql
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

**Expected:** Should return 79 (or close to it)

**Or verify locally:**
```bash
npm run validate:db
```

**Success Criteria:** ✅ All critical tables exist (businesses, users, calls, appointments, etc.)

---

## Phase 2: Environment Variables (45 minutes)

### Step 2.1: Access Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your CloudGreet project
3. Go to **Settings** → **Environment Variables**

### Step 2.2: Set Critical Variables (MINIMUM VIABLE)

Add these **FIRST** - they're required for basic functionality:

#### Database Connection
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```
- Get from: Supabase Dashboard → Settings → API → Project URL

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```
- Get from: Supabase Dashboard → Settings → API → service_role key (⚠️ Keep secret!)

#### Authentication
```
JWT_SECRET=your_32_character_random_string_here
```
- Generate with: `openssl rand -base64 32`
- Or use: https://randomkeygen.com/ (CodeIgniter Encryption Keys)

#### Application URL
```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```
- Your production domain (e.g., `https://cloudgreet.com`)
- For local dev: `http://localhost:3000`

**Verify:** After deploying, visit `https://yourdomain.com/api/health/env`

---

### Step 2.3: Set Revenue Enablers

Add these next - they enable payments and AI:

#### Stripe (Payment Processing)
```
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
```
- Get from: Stripe Dashboard → Developers → API keys → Secret key
- Use **live** key for production, **test** key for testing

```
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```
- Set this **after** configuring Stripe webhook (Step 3.1)

#### Telnyx (Telephony)
```
TELNYX_API_KEY=your_telnyx_api_key
```
- Get from: Telnyx Portal → Settings → API Keys

```
TELNYX_PUBLIC_KEY=your_telnyx_public_key
```
- Get from: Telnyx Portal → Webhooks → Public Key (after Step 3.3)

#### OpenAI (AI Conversations)
```
OPENAI_API_KEY=sk-proj-your_openai_key
```
- Get from: https://platform.openai.com/api-keys
- Create new key if needed

---

### Step 2.4: Set Phone System Variables

Add these for AI voice receptionist:

#### Retell AI
```
RETELL_API_KEY=your_retell_api_key
```
- Get from: Retell AI Dashboard → API Keys

```
RETELL_WEBHOOK_SECRET=your_retell_webhook_secret
```
- Set this **after** configuring Retell webhook (Step 3.2)

#### Telnyx Public Key (if not set above)
```
TELNYX_PUBLIC_KEY=your_telnyx_public_key
```
- Get from: Telnyx Portal → Webhooks

---

### Step 2.5: Verify Environment Variables

**After deployment, verify:**
```bash
# Visit in browser
https://yourdomain.com/api/health/env
```

**Or locally (requires .env.local):**
```bash
npm run validate:env
```

**Success Criteria:** ✅ All critical variables show as "✅ SET"

---

## Phase 3: External Service Configuration (2 hours)

### Step 3.1: Configure Stripe (15 minutes)

#### 3.1.1: Create Products

1. Go to Stripe Dashboard → Products
2. Click **"Add Product"**

**Product 1: Subscription**
- Name: `CloudGreet Monthly Subscription`
- Price: `$200.00`
- Billing: `Recurring` → `Monthly`
- Save product ID for later reference

**Product 2: Per-Booking Fee**
- Name: `CloudGreet Per-Booking Fee`
- Price: `$50.00`
- Billing: `One-time`
- Save product ID for later reference

#### 3.1.2: Configure Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click **"Add endpoint"**
3. Enter URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `invoice.payment_succeeded`
5. Click **"Add endpoint"**
6. **Copy the webhook signing secret** (starts with `whsec_`)
7. Add to Vercel as `STRIPE_WEBHOOK_SECRET`

**Verify:** Send test webhook from Stripe dashboard → Check Vercel logs

---

### Step 3.2: Configure Retell AI (30 minutes)

#### 3.2.1: Create AI Agent

1. Go to Retell AI Dashboard → Agents
2. Click **"Create Agent"** or **"New Agent"**
3. Configure agent:
   - **Name:** CloudGreet AI Receptionist
   - **Voice:** Choose a voice (e.g., "alloy", "nova")
   - **Language:** English
   - **Model:** GPT-4 or GPT-4o

#### 3.2.2: Configure Webhook

1. In agent settings, find **"Webhooks"** section
2. Set webhook URL: `https://yourdomain.com/api/retell/voice-webhook`
3. **Generate webhook secret** (or copy if provided)
4. Add to Vercel as `RETELL_WEBHOOK_SECRET`

#### 3.2.3: Enable Tool Calls

1. In agent settings, find **"Functions"** or **"Tool Calls"**
2. Enable these functions:
   - `book_appointment` - Books appointments
   - `send_booking_sms` - Sends SMS confirmations
   - `lookup_availability` - Checks calendar availability
3. Save agent configuration

#### 3.2.4: Link Phone Number

1. In Retell dashboard, go to **"Phone Numbers"**
2. Link your Telnyx phone number to this agent
   - Or provision a number through Retell if preferred

**Verify:** Make test call → Should be answered by AI agent

---

### Step 3.3: Configure Telnyx (30 minutes)

#### 3.3.1: Configure Webhooks

1. Go to Telnyx Portal → Webhooks
2. Click **"Add Webhook"** or **"Configure"**

**SMS Webhook:**
- URL: `https://yourdomain.com/api/sms/webhook`
- Events: `message.received`, `message.finalized`
- Save

**Voice Webhook:**
- URL: `https://yourdomain.com/api/telnyx/voice-webhook`
- Events: `call.initiated`, `call.answered`, `call.hangup`
- Save

#### 3.3.2: Get Public Key

1. In Telnyx Webhooks settings, find **"Public Key"**
2. Copy the public key
3. Add to Vercel as `TELNYX_PUBLIC_KEY`

#### 3.3.3: Provision Phone Number

1. Go to Telnyx Portal → Phone Numbers
2. Click **"Buy Number"** or **"Order Numbers"**
3. Select:
   - Country/Region
   - Number type (Local, Toll-Free)
   - Features needed (SMS, Voice)
4. Complete purchase
5. Note the phone number for later

**Verify:** Send test SMS to your number → Check dashboard

---

## Phase 4: Deploy to Production (15 minutes)

### Step 4.1: Verify Code is Ready

```bash
# Check for build errors
npm run build

# Check for linting errors
npm run lint

# Check TypeScript errors
npm run type-check
```

**Fix any errors before proceeding.**

### Step 4.2: Push to GitHub

```bash
# Commit any changes
git add .
git commit -m "feat: prepare for production deployment"

# Push to main branch
git push origin main
```

### Step 4.3: Monitor Vercel Deployment

1. Go to Vercel Dashboard → Your Project → Deployments
2. Wait for deployment to complete (2-3 minutes)
3. Check deployment status:
   - ✅ **Ready** = Success
   - ❌ **Error** = Check build logs

### Step 4.4: Verify Deployment

1. Visit your production URL
2. Test health endpoint: `https://yourdomain.com/api/health`
   - Should return: `{"status":"ok","timestamp":"..."}`
3. Test env check: `https://yourdomain.com/api/health/env`
   - Should show all environment variables

**Success Criteria:** ✅ Health check returns 200 OK

---

## Phase 5: Verification & Testing (1 hour)

### Step 5.1: Smoke Tests (30 minutes)

Test these in order. **Stop and fix if any fail.**

#### Test 1: Health Check ✅
- Visit: `https://yourdomain.com/api/health`
- Expected: `{"status":"ok"}`
- **If fails:** Check Vercel logs, verify deployment succeeded

#### Test 2: User Registration ✅
1. Visit: `https://yourdomain.com/register`
2. Fill out registration form
3. Submit
4. Expected: Success message, redirect to dashboard
- **If fails:** Check database connection, verify Supabase credentials

#### Test 3: Login ✅
1. Visit: `https://yourdomain.com/login`
2. Log in with test account
3. Expected: Redirect to dashboard
- **If fails:** Check JWT_SECRET, verify authentication code

#### Test 4: Dashboard Load ✅
1. Visit: `https://yourdomain.com/dashboard`
2. Expected: Dashboard loads without errors
3. Check browser console for errors
- **If fails:** Check database queries, verify RLS policies

#### Test 5: Stripe Checkout ✅
1. Go through subscription checkout flow
2. Use Stripe test card: `4242 4242 4242 4242`
3. Expected: Subscription created in Stripe dashboard
- **If fails:** Check STRIPE_SECRET_KEY, verify webhook configured

#### Test 6: Test Call ✅
1. Call your Telnyx phone number
2. Expected: AI answers the call
3. Try booking an appointment
- **If fails:** Check Retell configuration, verify webhook URLs

#### Test 7: Booking Test ✅
1. During test call, book an appointment
2. Expected:
   - Appointment appears in dashboard ✅
   - $50 charge in Stripe ✅
   - SMS confirmation sent ✅
- **If fails:** Check webhook handlers, verify all integrations

---

### Step 5.2: Full Customer Journey Test (30 minutes)

Experience it as a real customer would:

1. **Register** as a new business owner
2. **Complete onboarding** wizard
3. **Connect Google Calendar** (optional)
4. **Make a real call** to your business number
5. **Book an appointment** during the call
6. **Verify:**
   - ✅ Appointment in dashboard
   - ✅ Calendar event (if connected)
   - ✅ $50 charge in Stripe
   - ✅ SMS confirmation received

**Success Criteria:** All 4 verifications pass ✅

---

## Phase 6: Optional Enhancements (Later)

### 6.1: Google Calendar OAuth (30 min)

**Why:** Syncs appointments to Google Calendar

**Setup:**
1. Google Cloud Console → Create OAuth 2.0 credentials
2. Add redirect URI: `https://yourdomain.com/api/calendar/callback`
3. Enable Google Calendar API
4. Add to Vercel:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

**Impact:** Better UX, but not blocking

---

### 6.2: Email Setup with Resend (15 min)

**Why:** Email appointment confirmations

**Setup:**
1. Sign up at https://resend.com
2. Get API key
3. Add to Vercel:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`

**Impact:** Better notifications, but SMS works without it

---

## Troubleshooting

### Database Issues

**Problem:** `npm run validate:db` fails
**Solution:**
- Verify Supabase credentials in `.env.local`
- Check that schema SQL ran successfully
- Verify RLS policies are active in Supabase

### Environment Variable Issues

**Problem:** `/api/health/env` shows missing variables
**Solution:**
- Verify variables are set in Vercel (not just `.env.local`)
- Check variable names match exactly (case-sensitive)
- Redeploy after adding variables

### Webhook Issues

**Problem:** Webhooks return 405 or 401
**Solution:**
- Verify webhook URLs are publicly accessible (not localhost)
- Check webhook secrets match in both services
- Verify signature verification is working
- Check Vercel function logs

### Build Issues

**Problem:** Vercel deployment fails
**Solution:**
```bash
# Test build locally
npm run build

# Check for TypeScript errors
npm run type-check

# Check for linting errors
npm run lint
```

---

## Success Checklist

Before accepting first customer, verify:

- [ ] Database schema created (79 tables)
- [ ] All critical environment variables set
- [ ] Stripe configured and tested
- [ ] Retell AI agent created and linked
- [ ] Telnyx webhooks configured
- [ ] Production deployment successful
- [ ] Health check passes
- [ ] User registration works
- [ ] Test call answered by AI
- [ ] Test appointment booked successfully
- [ ] All systems verified end-to-end

---

## Next Steps After Setup

1. **Monitor:** Check Vercel logs daily for errors
2. **Test:** Make weekly test calls to verify system
3. **Iterate:** Gather customer feedback and improve
4. **Scale:** Add more phone numbers as needed

---

## Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Stripe Docs:** https://stripe.com/docs
- **Retell AI Docs:** https://docs.retell.ai
- **Telnyx Docs:** https://developers.telnyx.com
- **Vercel Docs:** https://vercel.com/docs

---

**Remember:** You're 95% done. The remaining 5% is just configuration. You've got this! 🚀












