# ✅ Verify Vercel Environment Variables

**Status:** Most/all API keys are in Vercel - let's verify what's set!

---

## 🔍 Quick Verification Steps

### Option 1: Check via API (After Deployment)
Once deployed, visit:
```
https://yourdomain.com/api/health/env
```

This will show you which variables are set and which are missing.

### Option 2: Check Vercel Dashboard
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Check each one below

---

## ✅ CRITICAL Variables (Must Have)

Check these in Vercel:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Should look like: `https://xxxxx.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Long string starting with `eyJ...`
- [ ] `JWT_SECRET` - 32+ character random string
- [ ] `NEXT_PUBLIC_APP_URL` - Your domain: `https://cloudgreet.com` (or your domain)

---

## 💰 REVENUE Variables (For Payments & AI)

- [ ] `STRIPE_SECRET_KEY` - Starts with `sk_live_` or `sk_test_`
- [ ] `STRIPE_WEBHOOK_SECRET` - Starts with `whsec_` (set after Stripe webhook config)
- [ ] `OPENAI_API_KEY` - Starts with `sk-proj-`
- [ ] `TELNYX_API_KEY` - Your Telnyx API key

---

## 📞 PHONE SYSTEM Variables

- [ ] `RETELL_API_KEY` - Your Retell AI API key
- [ ] `RETELL_WEBHOOK_SECRET` - Set after Retell webhook config
- [ ] `TELNYX_PUBLIC_KEY` - Set after Telnyx webhook config

---

## 📋 Next Steps Based on What's Set

### If All Critical Variables Are Set:
1. ✅ Database is ready (you just set it up)
2. ⚠️ Configure webhooks (Stripe, Retell, Telnyx)
3. ⚠️ Deploy and test

### If Some Are Missing:
1. Add missing variables to Vercel
2. Redeploy
3. Then configure webhooks

---

## 🚀 Quick Test

After variables are set, test locally:
```bash
npm run validate:env
```

Or after deployment, check:
```
https://yourdomain.com/api/health/env
```

---

**Let me know which ones are missing and I'll help you get them!** 🎯












