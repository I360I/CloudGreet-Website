# ⚠️ CRON JOBS SETUP - IMPORTANT

## **Vercel Hobby Plan Limitation**

Vercel Hobby (free) plan only allows **daily cron jobs** (once per day).

For the MVP to work properly, you have **2 options**:

---

## **OPTION 1: Upgrade to Vercel Pro** (Recommended)

**Cost**: $20/month  
**Benefit**: Unlimited cron jobs, can run every minute

**After upgrading:**
1. Update `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/process-jobs",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/health-check",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

2. Redeploy: `vercel --prod`

---

## **OPTION 2: Use External Cron Service** (Free)

Use a free service like **cron-job.org** or **EasyCron** to ping your endpoints:

1. **Set up cron-job.org:**
   - Go to: https://cron-job.org
   - Create account (free)
   - Add job:
     - URL: `https://your-domain.vercel.app/api/cron/process-jobs`
     - Schedule: Every minute
     - Method: GET
     - Header: `Authorization: Bearer YOUR_CRON_SECRET`

2. **For health check:**
   - URL: `https://your-domain.vercel.app/api/cron/health-check`
   - Schedule: Every 5 minutes

**This is FREE and works perfectly!**

---

## **OPTION 3: Manual Trigger** (For Testing)

For now, you can manually trigger jobs:

```bash
curl https://your-domain.vercel.app/api/cron/process-jobs \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or use Vercel's "Run Now" button in the dashboard.

---

## **RECOMMENDATION:**

**For MVP testing**: Use **Option 2** (cron-job.org) - it's free and works great!

**For production**: Upgrade to **Vercel Pro** for better reliability.

---

## **Current Setup:**

Cron jobs are set to run **once per day** (midnight UTC) to allow deployment on Hobby plan.

**This means:**
- Jobs will process once per day
- Missed call recovery SMS will be delayed (up to 24 hours)
- For real-time processing, use Option 1 or 2 above


