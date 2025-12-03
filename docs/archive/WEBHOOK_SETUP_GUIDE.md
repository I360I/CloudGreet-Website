# 🔗 Webhook Setup Guide - Step by Step

**Your Production URL:**
`https://cloud-greet-website-jgoyqd1i4-i360is-projects.vercel.app`

---

## **STEP 1: Telnyx Voice Webhook** (5 min)

1. **Go to Telnyx Dashboard:**
   - https://portal.telnyx.com/#/app/call-control/applications

2. **Find your application** (or create one)

3. **Add webhook URL:**
   ```
   https://cloud-greet-website-jgoyqd1i4-i360is-projects.vercel.app/api/telnyx/voice-webhook
   ```

4. **Enable events:**
   - ✅ `call.initiated`
   - ✅ `call.answered`
   - ✅ `call.ended`
   - ✅ `call.hangup`

5. **Save**

---

## **STEP 2: Telnyx SMS Webhook** (5 min)

1. **Go to Telnyx Dashboard:**
   - https://portal.telnyx.com/#/app/messaging/webhooks

2. **Click "Add Webhook"**

3. **Webhook URL:**
   ```
   https://cloud-greet-website-jgoyqd1i4-i360is-projects.vercel.app/api/telnyx/sms-webhook
   ```

4. **Enable events:**
   - ✅ `message.received`
   - ✅ `message.sent`

5. **Save**

---

## **STEP 3: Retell AI Webhook** (5 min)

1. **Go to Retell Dashboard:**
   - https://retellai.com/dashboard/settings/webhooks

2. **Click "Add Webhook"**

3. **Webhook URL:**
   ```
   https://cloud-greet-website-jgoyqd1i4-i360is-projects.vercel.app/api/retell/voice-webhook
   ```

4. **Enable events:**
   - ✅ `tool_call`
   - ✅ `call_ended`

5. **Save**

---

## ✅ **VERIFY WEBHOOKS ARE WORKING:**

After configuring, test by:

1. **Make a test call** to your business number
2. **Check Vercel logs:**
   ```bash
   vercel logs
   ```
3. **Look for webhook events** in the logs

---

## 🎯 **NEXT:**

Once webhooks are configured, we'll test the complete flow!


