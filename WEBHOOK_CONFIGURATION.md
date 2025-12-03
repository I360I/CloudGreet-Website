# 🔗 Webhook Configuration Guide

**Your Production URL:**
`https://cloud-greet-website-jgoyqd1i4-i360is-projects.vercel.app`

---

## **1. Telnyx Webhooks** (10 min)

### **A. Voice Webhook:**
1. Go to: https://portal.telnyx.com/#/app/call-control/applications
2. Find your application or create one
3. Add webhook URL:
   ```
   https://cloud-greet-website-jgoyqd1i4-i360is-projects.vercel.app/api/telnyx/voice-webhook
   ```
4. Enable events:
   - ✅ `call.initiated`
   - ✅ `call.answered`
   - ✅ `call.ended`
   - ✅ `call.hangup`

### **B. SMS Webhook:**
1. Go to: https://portal.telnyx.com/#/app/messaging/webhooks
2. Click "Add Webhook"
3. Webhook URL:
   ```
   https://cloud-greet-website-jgoyqd1i4-i360is-projects.vercel.app/api/telnyx/sms-webhook
   ```
4. Enable events:
   - ✅ `message.received`
   - ✅ `message.sent`

---

## **2. Retell AI Webhooks** (5 min)

1. Go to: https://retellai.com/dashboard/settings/webhooks
2. Click "Add Webhook"
3. Webhook URL:
   ```
   https://cloud-greet-website-jgoyqd1i4-i360is-projects.vercel.app/api/retell/voice-webhook
   ```
4. Enable events:
   - ✅ `tool_call`
   - ✅ `call_ended`

---

## **3. Test Webhooks** (5 min)

After configuring, test by:
1. Making a test call to your business number
2. Check Vercel logs: `vercel logs`
3. Verify call appears in dashboard

---

## ✅ **DONE!**

Once webhooks are configured, your MVP is **100% LIVE**! 🚀


