# CloudGreet Deployment Checklist

**Purpose:** Complete checklist for deploying CloudGreet to production  
**Last Updated:** 2025-01-25

---

## Pre-Deployment Setup

### 1. Environment Variables (CRITICAL)

#### In Vercel Dashboard → Project Settings → Environment Variables

**Required:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `JWT_SECRET` - Random 32+ character string
- [ ] `TELNYX_API_KEY` - Telnyx API key
- [ ] `RETELL_API_KEY` - Retell AI API key
- [ ] `OPENAI_API_KEY` - OpenAI API key (starts with sk-)
- [ ] `STRIPE_SECRET_KEY` - Stripe secret key (starts with sk_)
- [ ] `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret (starts with whsec_)
- [ ] `NEXT_PUBLIC_APP_URL` - Production URL (https://cloudgreet.com)

**Recommended:**
- [ ] `RETELL_WEBHOOK_SECRET` - Retell webhook secret
- [ ] `TELNYX_WEBHOOK_SECRET` - Telnyx webhook secret
- [ ] `TELNYX_PUBLIC_KEY` - Telnyx public key for webhook verification
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- [ ] `RESEND_API_KEY` - Resend API key (for emails)
- [ ] `ADMIN_PASSWORD` - Strong admin password
- [ ] `ADMIN_EMAIL` - Admin notification email
- [ ] `SENTRY_DSN` - Sentry error tracking (optional)

**Validation:** After setting, test with `curl https://cloudgreet.com/api/health/env`

---

### 2. Database Setup (CRITICAL)

#### In Supabase Dashboard → SQL Editor

1. **Run Schema Migration:**
   - [ ] Open `ULTIMATE_COMPLETE_SUPABASE_SCHEMA.sql`
   - [ ] Copy entire contents
   - [ ] Paste into Supabase SQL Editor
   - [ ] Run query
   - [ ] Verify no errors

2. **Verify Tables Created:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
   - [ ] Should see 50+ tables including: businesses, users, calls, appointments, ai_agents, sms_messages

3. **Verify RLS Policies:**
   - [ ] Check that RLS is enabled on sensitive tables
   - [ ] Verify policies exist for businesses, calls, appointments

4. **Create Indexes (Optional but Recommended):**
   - [ ] Run `migrations/ADD_PERFORMANCE_INDEXES.sql`

**Validation:** Run `node scripts/verify-database-schema.js` (requires local .env.local)

---

### 3. Retell AI Configuration

1. **Retell Dashboard:**
   - [ ] Log into Retell AI dashboard
   - [ ] Create AI agent for each business (or use template)
   - [ ] Configure webhook URL: `https://cloudgreet.com/api/retell/voice-webhook`
   - [ ] Set webhook secret (save to `RETELL_WEBHOOK_SECRET` env var)
   - [ ] Enable tool calls: book_appointment, send_booking_smsverse, lookup_availability

2. **Link Phone Numbers:**
   - [ ] In Telnyx, configure phone numbers to route to Retell
   - [ ] Link Retell agent to phone numbers

**Validation:** Test webhook with Retell ping/test event

---

### 4. Telnyx Configuration

1. **Webhook Setup:**
   - [ ] Configure voice webhook: `https://cloudgreet.com/api/telnyx/voice-webhook`
   - [ ] Configure SMS webhook: `https://cloudgreet.com/api/sms/webhook`
筛 - [ ] Set webhook secrets in environment variables
   - [ ] Enable webhook signature verification

2. **Phone Numbers:**
   - [ ] Provision phone numbers via Telnyx API or dashboard
   - [ ] Configure call routing

**Validation:** Test by sending test SMS or making test call

---

### 5. Stripe Configuration

1. **Webhook Setup:**
   - [ ] Go to Stripe Dashboard → Developers → Webhooks
   - [ ] Add endpoint: `https://cloudgreet.com/api/stripe/webhook`
   - [ ] Select events: customer.subscription.*, invoice.*, payment_intent.*
   - [ ] Copy webhook secret → Save to `STRIPE_WEBHOOK_SECRET`

2. **Products & Pricing:**
   - [ ] Create product: "CloudGreet Monthly Subscription" - $200/month
   - [ ] Verify pricing IDs match code (if hardcoded)

**Validation:** Test webhook with Stripe CLI or test event

---

### 6. Google Calendar (Optional)

1. **Google Cloud Console:**
   - [ ] Create OAuth 2.0 credentials
   - [ ] Add authorized redirect URI: `https://cloudgreetية.com/api/calendar/callback`
   - [ ] Enable Google Calendar API
   - [ ] Copy Client ID and Secret → Save to environment variables

2. **Test:**
   - [ ] Client connects calendar in dashboard
   - [ ] Verify OAuth flow works
   - [ ] Test appointment sync

---

## Deployment Steps

### 1. Vercel Deployment

1. **Connect Repository:**
   - [ ] Push code to GitHub/GitLab
   - [ ] Connect to Vercel
   - [ ] Select project

2. **Configure Build:**
   - [ ] Build Command: `npm run build`
   - [ ] Output Directory: `.next`
   - [ ] Install Command: `npm ci`

3. **Environment Variables:**
   - [ ] Add all environment variables (see section 1)
   - [ ] Set for Production, Preview, and Development environments

4. **Deploy:**
   - [ ] Deploy to production
   - [ ] Verify build succeeds
   - [ ] Check for build warnings/errors

---

### 2. Post-Deployment Verification

#### Health Checks
- [ ] `https://cloudgreet.com/api/health` - Returns 200 OK
- [ ] `https://cloudgreet.com/api/health/env` - Shows env var status

#### Core Features
- [ ] Landing page loads: `https://cloudgreet.com`
- [ ] Registration works: Create test account
- [ ] Login works: Login with test account
- [ ] Dashboard loads: After login
- [ ] Onboarding wizard works: Complete wizard

#### Integrations
- [ ] Stripe checkout works: Test subscription
- [ ] SMS sending works: Send test SMS
- [ ] Voice webhook responds: Retell ping test
- [ ] Calendar OAuth works: If configured

---

### 3. Security Verification

- [ ] Verify HTTPS enforced (Vercel default)
- [ ] Check security headers in response
- [ ] Test JWT authentication on protected routes
- [ ] Verify webhook signatures checked
- [ ] Confirm admin password is strong
- [ ] Check that sensitive env vars not exposed

---

### 4. Monitoring Setup

- [ ] Set up Sentry (if using) - Verify errors tracked
- [ ] Configure Vercel Analytics
- [ ] Set up uptime monitoring (UptimeRobot, etc.)
- [ ] Configure error alerts
- [ ] Set up log aggregation (if needed)
- [ ] Populate GitHub secrets: `SYNTHETIC_MONITOR_BASE_URL`, `OUTREACH_RUNNER_URL`, `CRON_SECRET`, `MONITOR_EMPLOYEE_EMAIL`, `MONITOR_EMPLOYEE_PASSWORD`
- [ ] Trigger Synthetic Monitors workflow and confirm registration, outreach, and sales workspace checks succeed
- [ ] Document demo credentials produced by `scripts/seed-demo-data.js` in the ops vault

---

## Launch Day Checklist

### Before First Client
- [ ] Complete all pre-deployment steps above
- [ ] Test complete client journey: Signup → Onboarding → Subscription → First Call
- [ ] Verify billing works: Test subscription and per-booking fee
- [ ] Test with real phone call
- [ ] Verify appointment booking works
- [ ] Check dashboard displays data correctly

### First Client Support
- [ ] Monitor error logs
- [ ] Watch for failed webhooks
- [ ] Verify Stripe webhooks received
- [ ] Check database for data
- [ ] Monitor API response times

---

## Rollback Plan

If issues occur:

1. **Revert Deployment:**
   - [ ] Go to Vercel → Deployments
   - [ ] Find last working deployment
   - [ ] Click "Promote to Production"

2. **Rollback Database:**
   - [ ] If schema changes made, revert SQL migration
   - [ ] Use Supabase backup if needed

3. **Disable Features:**
   - [ ] Disable new features via environment variables
   - [ ] Fall back to previous version

---

## Success Criteria

✅ Deployment is successful when:
- All health checks pass
- Test client can sign up and complete onboarding
- Test call can be answered by AI
- Appointment booking works end-to-end
- Stripe billing works correctly
- Dashboard displays real data
- No critical errors in logs

---

## Troubleshooting

### Common Issues

1. **Build Fails:**
   - Check TypeScript errors: `npm run type-check`
   - Check lint errors: `npm run lint`
   - Verify all dependencies in package.json

2. **Environment Variables Missing:**
   - Check Vercel dashboard → Environment Variables
   - Verify variable names match exactly (case-sensitive)
   - Redeploy after adding variables

3. **Database Connection Fails:**
   - Verify Supabase URL and keys correct
   - Check Supabase project is active
   - Verify network/firewall allows connection

4. **Webhooks Not Working:**
   - Verify webhook URLs correct
   - Check webhook secrets match
   - Test with curl or webhook testing tool
   - Check Vercel function logs

---

*This checklist should be completed before accepting real clients.*
