# ⚡ QUICK DEPLOY - 3 Steps

## 🚀 **STEP 1: Deploy to Vercel** (2 min)

**Option A: Using Vercel CLI**
```bash
vercel --prod
```

**Option B: Using Git (if connected)**
```bash
git push origin main
```

**Option C: Using Vercel Dashboard**
1. Go to https://vercel.com
2. Import your project
3. Click "Deploy"

---

## 🔧 **STEP 2: Add Environment Variables** (5 min)

**In Vercel Dashboard → Your Project → Settings → Environment Variables:**

**Copy these and fill in your values:**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
RETELL_API_KEY=
TELNYX_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

**After adding, redeploy:**
```bash
vercel --prod
```

---

## 🔗 **STEP 3: Configure Webhooks** (10 min)

### **Telnyx:**
- Voice: `https://your-domain.vercel.app/api/telnyx/voice-webhook`
- SMS: `https://your-domain.vercel.app/api/telnyx/sms-webhook`

### **Retell:**
- Voice: `https://your-domain.vercel.app/api/retell/voice-webhook`

---

## ✅ **DONE!**

Test by:
1. Register a user
2. Make a test call
3. Check dashboard

**That's it!** 🎉


