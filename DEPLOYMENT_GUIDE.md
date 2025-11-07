# 🚀 CloudGreet - Deployment Guide
**EXACT STEPS TO DEPLOY - NO GUESSWORK**

---

## ✅ **WHAT WE FIXED (Already Done)**

All code changes are complete:
- ✅ Unified webhook system (`app/api/telnyx/voice-webhook/route.ts`)
- ✅ Voice handler with booking detection (`app/api/telnyx/voice-handler/route.ts`)
- ✅ Conversation history storage
- ✅ Calendar OAuth bug fixed
- ✅ Token refresh implemented
- ✅ Missed call recovery (serverless-safe)
- ✅ Recording storage
- ✅ Error handling & timeouts
- ✅ Recovery processor (`app/api/calls/process-recoveries/route.ts`)
- ✅ Cron job config (`vercel.json`)

**All code is ready. You just need to:**

---

## 📋 **STEP-BY-STEP DEPLOYMENT**

### **STEP 1: Run Database Migration** ⚠️ REQUIRED

**File Location**: `/workspace/migrations/UPDATE_MISSED_CALL_RECOVERY_TABLE.sql`

**What to do**:
1. Go to Supabase Dashboard
2. Click "SQL Editor"
3. Click "New Query"
4. Copy and paste the SQL below
5. Click "Run"

**THE SQL TO RUN**:

```sql
-- =====================================================
-- UPDATE MISSED CALL RECOVERY TABLE
-- Add fields for scheduled recovery processing
-- =====================================================

-- Add missing columns if they don't exist
ALTER TABLE missed_call_recoveries 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing records to have status
UPDATE missed_call_recoveries 
SET status = 'sent' 
WHERE status IS NULL AND message_sent IS NOT NULL;

-- Create index for faster queries on status and scheduled_at
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_status ON missed_call_recoveries(status);
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_scheduled_at ON missed_call_recoveries(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_pending ON missed_call_recoveries(status, scheduled_at) WHERE status = 'pending';
```

**OR** just run the file: `migrations/UPDATE_MISSED_CALL_RECOVERY_TABLE.sql`

---

### **STEP 2: Set Environment Variables** ⚠️ REQUIRED

**In Vercel Dashboard** (or your hosting platform):

1. Go to Project Settings → Environment Variables
2. Add these (for Production, Preview, AND Development):

```bash
NEXT_PUBLIC_APP_URL=https://your-actual-domain.com
NEXT_PUBLIC_BASE_URL=https://your-actual-domain.com
```

**REPLACE `your-actual-domain.com` WITH YOUR REAL DOMAIN**

**Why**: Internal API calls need to know the base URL to call booking/recovery endpoints.

---

### **STEP 3: Deploy to Production**

```bash
git add .
git commit -m "feat: complete voice webhook system with booking detection and missed call recovery"
git push origin main
```

Vercel will auto-deploy.

**Verify**:
- Check Vercel dashboard for successful deployment
- Check that `vercel.json` is deployed (cron job will activate)

---

### **STEP 4: Configure Telnyx Webhook** ⚠️ REQUIRED

**In Telnyx Dashboard**:

1. Go to **Call Control** → **Webhooks**
2. Set webhook URL to: `https://your-domain.com/api/telnyx/voice-webhook`
3. Enable these events:
   - ✅ `call.initiated`
   - ✅ `call.answered`
   - ✅ `call.missed`
   - ✅ `call.no_answer`
   - ✅ `call.hangup`
   - ✅ `call.recording.saved`

4. Save

---

### **STEP 5: Test It**

**Make a test call**:
1. Call your Telnyx number
2. AI should answer with business greeting
3. Have a conversation
4. Say "I'd like to book an appointment"
5. AI should detect and create appointment
6. Check database: `appointments` table should have new record
7. Check Google Calendar: Appointment should appear (if connected)
8. Check Stripe: $50 per-booking fee should be charged

---

## 📁 **KEY FILES REFERENCE**

### **Code Files** (Already Done):
- ✅ `app/api/telnyx/voice-webhook/route.ts` - Main webhook handler
- ✅ `app/api/telnyx/voice-handler/route.ts` - Conversation handler
- ✅ `app/api/calls/process-recoveries/route.ts` - Recovery processor
- ✅ `app/api/calls/missed-recovery/route.ts` - Recovery SMS sender
- ✅ `lib/calendar.ts` - Calendar with token refresh
- ✅ `app/api/calendar/callback/route.ts` - OAuth callback fixed
- ✅ `vercel.json` - Cron job config

### **Database Files**:
- 📄 `migrations/UPDATE_MISSED_CALL_RECOVERY_TABLE.sql` - **RUN THIS**
- 📄 `migrations/CREATE_MISSED_CALL_RECOVERY_TABLE.sql` - Already run (table exists)

---

## 🎯 **WHAT'S WORKING NOW**

After you complete the steps above:

1. ✅ **Voice Calls** → Routes to AI with business context
2. ✅ **AI Conversation** → Maintains history, detects booking intent
3. ✅ **Automatic Booking** → Creates appointments when detected
4. ✅ **Calendar Sync** → Appointments appear in Google Calendar
5. ✅ **Billing** → Per-booking fees charged automatically
6. ✅ **Missed Calls** → Recovery SMS sent after 30 seconds
7. ✅ **Recordings** → Stored and accessible in dashboard
8. ✅ **Token Refresh** → Calendar tokens auto-refresh

---

## ⚠️ **IF SOMETHING BREAKS**

### **Check These First**:

1. **Webhook not receiving calls**:
   - Telnyx webhook URL is correct?
   - Webhook events enabled in Telnyx?
   - Check Vercel logs for incoming requests

2. **Bookings not creating**:
   - `NEXT_PUBLIC_APP_URL` set?
   - Check logs in `/api/appointments/ai-book`
   - Check OpenAI API key is working

3. **Missed call recovery not working**:
   - Migration run? (Step 1)
   - Cron job enabled? (Check Vercel)
   - Check `missed_call_recoveries` table has records

4. **Calendar not syncing**:
   - Business connected calendar?
   - Tokens refreshing? (Check logs)
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set?

---

## 📊 **HOW TO VERIFY IT'S WORKING**

**Check Database**:
```sql
-- Recent calls
SELECT * FROM calls ORDER BY created_at DESC LIMIT 10;

-- Recent appointments
SELECT * FROM appointments WHERE source = 'ai_phone_call' ORDER BY created_at DESC LIMIT 10;

-- Conversation history
SELECT * FROM conversation_history ORDER BY created_at DESC LIMIT 20;

-- Pending recoveries
SELECT * FROM missed_call_recoveries WHERE status = 'pending' ORDER BY scheduled_at;
```

**Check Logs**:
- Vercel → Functions → Logs
- Look for: "Telnyx webhook received", "Appointment booked successfully"

---

## ✅ **YOU'RE DONE WHEN**:

- [ ] Database migration run
- [ ] Environment variables set
- [ ] Deployed to production
- [ ] Telnyx webhook configured
- [ ] Test call works
- [ ] Appointment created successfully

**That's it! The code is done. Just deploy and configure.** 🚀
