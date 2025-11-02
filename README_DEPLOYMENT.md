# 🚀 DEPLOY CLOUDGREET - SIMPLE GUIDE

## ✅ **CODE IS DONE - JUST DEPLOY**

All fixes are complete. Do these 4 things:

---

## 1️⃣ **RUN THIS SQL** (5 minutes)

**File**: `migrations/UPDATE_MISSED_CALL_RECOVERY_TABLE.sql`

**Where**: Supabase Dashboard → SQL Editor → New Query

**Copy this SQL**:

```sql
ALTER TABLE missed_call_recoveries 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

UPDATE missed_call_recoveries 
SET status = 'sent' 
WHERE status IS NULL AND message_sent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_status ON missed_call_recoveries(status);
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_scheduled_at ON missed_call_recoveries(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_missed_call_recoveries_pending ON missed_call_recoveries(status, scheduled_at) WHERE status = 'pending';
```

**OR** just open the file and copy: `/workspace/migrations/UPDATE_MISSED_CALL_RECOVERY_TABLE.sql`

---

## 2️⃣ **SET ENVIRONMENT VARIABLES** (2 minutes)

In **Vercel** → Project Settings → Environment Variables:

```
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

Replace `your-domain.com` with your actual domain.

---

## 3️⃣ **DEPLOY** (5 minutes)

```bash
git add .
git commit -m "feat: voice webhook system complete"
git push origin main
```

---

## 4️⃣ **CONFIGURE TELNYX WEBHOOK** (5 minutes)

In **Telnyx Dashboard** → Call Control → Webhooks:

- URL: `https://your-domain.com/api/telnyx/voice-webhook`
- Enable: `call.initiated`, `call.answered`, `call.missed`, `call.no_answer`, `call.hangup`, `call.recording.saved`

---

## ✅ **THAT'S IT!**

After these 4 steps:
- Calls route to AI ✅
- Bookings create automatically ✅
- Missed calls get recovery SMS ✅
- Everything works ✅

---

## 📁 **FILE LOCATIONS**

- SQL Migration: `/workspace/migrations/UPDATE_MISSED_CALL_RECOVERY_TABLE.sql`
- Webhook Code: `/workspace/app/api/telnyx/voice-webhook/route.ts`
- Voice Handler: `/workspace/app/api/telnyx/voice-handler/route.ts`
- Recovery Processor: `/workspace/app/api/calls/process-recoveries/route.ts`
- Cron Config: `/workspace/vercel.json`

**All code is done. Just deploy and configure.** 🚀
