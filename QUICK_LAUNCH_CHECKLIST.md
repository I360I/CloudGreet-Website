# CloudGreet Quick Launch Checklist

**Use this checklist to track your progress through the launch setup.**

---

## ✅ Phase 1: Database Setup (30 min)

- [ ] Opened Supabase Dashboard → SQL Editor
- [ ] Copied `ULTIMATE_COMPLETE_SUPABASE_SCHEMA.sql` contents
- [ ] Pasted into SQL Editor and executed
- [ ] Verified: `npm run validate:db` passes (or checked Supabase dashboard)

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

## ✅ Phase 2: Environment Variables (45 min)

### Critical (Minimum Viable)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - From Supabase Settings → API
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - From Supabase Settings → API
- [ ] `JWT_SECRET` - Generated (run: `openssl rand -base64 32`)
- [ ] `NEXT_PUBLIC_APP_URL` - Your production domain

**Verify:** Visit `https://yourdomain.com/api/health/env` after deploy

### Revenue Enablers
- [ ] `STRIPE_SECRET_KEY` - From Stripe Dashboard → API Keys
- [ ] `STRIPE_WEBHOOK_SECRET` - Set after Stripe webhook config (Step 3.1)
- [ ] `TELNYX_API_KEY` - From Telnyx Portal
- [ ] `OPENAI_API_KEY` - From OpenAI Platform

### Phone System
- [ ] `RETELL_API_KEY` - From Retell AI Dashboard
- [ ] `RETELL_WEBHOOK_SECRET` - Set after Retell webhook config (Step 3.2)
- [ ] `TELNYX_PUBLIC_KEY` - Set after Telnyx webhook config (Step 3.3)

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

## ✅ Phase 3: External Services (2 hours)

### Stripe Configuration
- [ ] Created product: $200/month subscription
- [ ] Created product: $50 per-booking fee
- [ ] Configured webhook: `https://yourdomain.com/api/stripe/webhook`
- [ ] Copied webhook secret → Added to Vercel
- [ ] Tested webhook with test event

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

### Retell AI Configuration
- [ ] Created AI agent in Retell dashboard
- [ ] Set webhook URL: `https://yourdomain.com/api/retell/voice-webhook`
- [ ] Copied webhook secret → Added to Vercel
- [ ] Enabled tool calls (book_appointment, send_booking_sms, lookup_availability)
- [ ] Linked phone number to agent

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

### Telnyx Configuration
- [ ] Set SMS webhook: `https://yourdomain.com/api/sms/webhook`
- [ ] Set voice webhook: `https://yourdomain.com/api/telnyx/voice-webhook`
- [ ] Copied public key → Added to Vercel as `TELNYX_PUBLIC_KEY`
- [ ] Provisioned at least one phone number

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

## ✅ Phase 4: Deploy to Production (15 min)

- [ ] Verified code builds: `npm run build`
- [ ] Committed changes: `git add . && git commit -m "feat: production ready"`
- [ ] Pushed to GitHub: `git push origin main`
- [ ] Monitored Vercel deployment (2-3 minutes)
- [ ] Verified deployment succeeded (✅ Ready status)
- [ ] Tested: `https://yourdomain.com/api/health` returns 200

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

## ✅ Phase 5: Testing (1 hour)

### Smoke Tests
- [ ] Health check: `/api/health` → 200 OK
- [ ] User registration: Can create account
- [ ] Login: Can log in successfully
- [ ] Dashboard: Loads without errors
- [ ] Stripe checkout: Creates subscription (test card: 4242 4242 4242 4242)
- [ ] Test call: AI answers the phone
- [ ] Booking test: Appointment created + $50 charged + SMS sent

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

### Full Journey Test
- [ ] Registered as business owner
- [ ] Completed onboarding wizard
- [ ] Made real call to business number
- [ ] Booked appointment during call
- [ ] Verified appointment in dashboard ✅
- [ ] Verified $50 charge in Stripe ✅
- [ ] Verified SMS confirmation received ✅

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

## 🎯 Launch Ready Status

**Launch Ready When:**
- ✅ All Phase 1-4 tasks complete
- ✅ All smoke tests pass
- ✅ Full journey test successful

**Current Status:** ⬜ Not Ready | 🟡 Almost Ready | ✅ READY TO LAUNCH

---

## 📝 Notes

_Use this space to track issues, blockers, or questions:_

```
[Date] - [Note]
```

---

## 🆘 Troubleshooting

**If something fails:**
1. Check Vercel logs for errors
2. Verify environment variables are set correctly
3. Test locally: `npm run dev` and check for errors
4. Review `SETUP_GUIDE.md` for detailed instructions

---

**Remember:** You're 95% done. The remaining 5% is just configuration. 🚀












