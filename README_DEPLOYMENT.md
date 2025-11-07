# CloudGreet - Quick Deployment Guide

**Status:** ✅ Production Ready - Requires Setup

---

## 🚀 Quick Start (5 Steps)

### 1. Environment Variables
Set these in Vercel Dashboard → Environment Variables:

**CRITICAL (Must Have):**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
JWT_SECRET=32+_character_random_string
TELNYX_API_KEY=your_telnyx_key
RETELL_API_KEY=your_retell_key
OPENAI_API_KEY=sk-your_openai_key
STRIPE_SECRET_KEY=sk_your_stripe_key
NEXT_PUBLIC_APP_URL=https://cloudgreet.com
```

**Verify:** `npm run validate:env` or check `/api/health/env` after deploy

### 2. Database Setup
Run in Supabase SQL Editor:
```sql
-- Copy contents of ULTIMATE_COMPLETE_SUPABASE_SCHEMA.sql
-- Paste and execute
```

**Verify:** `npm run validate:db` (requires local .env.local)

### 3. Retell AI Setup
1. Create Retell agent
2. Set webhook: `https://cloudgreet.com/api/retell/voice-webhook`
3. Enable tool calls
4. Set `RETELL_WEBHOOK_SECRET` in Vercel

### 4. Telnyx Setup
1. Configure webhooks:
   - Voice: `https://cloudgreet.com/api/telnyx/voice-webhook`
   - SMS: `https://cloudgreet.com/api/sms/webhook`
2. Set `TELNYX_WEBHOOK_SECRET` in Vercel

### 5. Deploy
```bash
git push origin main
# Vercel auto-deploys
```

---

## ✅ Post-Deployment Verification

1. Health check: `https://cloudgreet.com/api/health`
2. Env check: `https://cloudgreet.com/api/health/env`
3. Test signup flow
4. Test first call

---

## 📚 Full Documentation

- **Setup Guide:** `docs/DEPLOYMENT_CHECKLIST.md`
- **Status Report:** `docs/HONEST_STATUS_REPORT.md`
- **Retell Setup:** `docs/RETELL_INTEGRATION_GUIDE.md`
- **API Docs:** `docs/API_ENDPOINTS_AUDIT.md`

---

## ✅ What Works

- ✅ Complete client journey (signup → call → booking)
- ✅ AI voice conversations
- ✅ Appointment booking with calendar sync
- ✅ Stripe billing (subscription + per-booking)
- ✅ SMS & email notifications
- ✅ Dashboard with real-time metrics
- ✅ Call recordings & transcripts

---

**Ready to deploy!** 🚀

