# 📅 Google Calendar Integration Setup

## 🎯 WHY YOU NEED THIS:
When the AI books an appointment, it will **automatically appear in your client's Google Calendar**. No manual entry needed.

---

## 🔑 STEP 1: Create Google Cloud Project

1. **Go to:** https://console.cloud.google.com/
2. **Create a new project** (or select existing)
3. **Name it:** "CloudGreet Calendar Integration"
4. **Click "Create"**

---

## 📋 STEP 2: Enable Google Calendar API

1. **In your project**, go to **"APIs & Services" → "Library"**
2. **Search for:** "Google Calendar API"
3. **Click on it** and click **"Enable"**

---

## 🔐 STEP 3: Create OAuth 2.0 Credentials

1. **Go to:** "APIs & Services" → "Credentials"
2. **Click "Create Credentials"** → "OAuth 2.0 Client ID"
3. **Configure consent screen** (if prompted):
   - User type: **External**
   - App name: **CloudGreet**
   - User support email: **Your email**
   - Developer contact: **Your email**
   - Scopes: Add **Google Calendar API** (`https://www.googleapis.com/auth/calendar`)
   - Test users: Add your client emails (or publish app)

4. **Create OAuth Client:**
   - Application type: **Web application**
   - Name: **CloudGreet Calendar**
   - Authorized redirect URIs:
     ```
     https://cloudgreet.com/api/calendar/callback
     ```
   - Click **"Create"**

5. **Copy the credentials:**
   - Client ID (looks like: `123456789-abc.apps.googleusercontent.com`)
   - Client Secret (looks like: `GOCSPX-abc123xyz`)

---

## ⚙️ STEP 4: Add to Environment Variables

Add these to your `.env.local`:

```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Then add to your **Vercel environment variables**:
1. Go to Vercel project settings
2. Environment Variables
3. Add all 3 variables above

---

## 🚀 STEP 5: Deploy & Test

```bash
vercel --prod
```

Then test:
1. Client completes onboarding
2. Go to Settings → Calendar
3. Click "Connect Google Calendar"
4. Authorize the app
5. Book a test appointment via AI
6. Check Google Calendar - appointment should appear automatically!

---

## ✅ WHAT HAPPENS AFTER SETUP:

**With Google Calendar Connected:**
- AI books appointment → Saves to database **AND** creates Google Calendar event
- Client sees it in their calendar app
- Gets automatic reminders from Google
- Can manage from Google Calendar

**Without Google Calendar:**
- AI books appointment → Saves to database only
- Client sees it in CloudGreet dashboard
- Still works, just no Google sync

---

## 🎯 CURRENT STATUS:

**Calendar Integration Code:** ✅ **100% COMPLETE**
- OAuth flow: ✅ Built
- Event creation: ✅ Built  
- Slot checking: ✅ Built
- Double-booking prevention: ✅ Built

**What's Missing:** Just the Google OAuth credentials (15 minutes to set up)

---

## 💡 DO YOU NEED TO DO THIS NOW?

**NO - Platform works without it!**

Appointments still get booked and appear in the dashboard. Google Calendar just makes it **extra convenient** for clients.

**You can:**
- **Option A:** Set it up now (15 min) for full experience
- **Option B:** Launch without it, add later when clients request it

**Your call!**




