# How to Add GitHub Secrets - Step by Step

## Step 1: Go to Your GitHub Repository

1. Open your web browser
2. Go to: `https://github.com`
3. Sign in if needed
4. Click on your repository (the one with your CloudGreet code)

## Step 2: Open Settings

1. At the top of your repository page, you'll see tabs: **Code**, **Issues**, **Pull requests**, etc.
2. Click on **"Settings"** (it's usually the last tab on the right)
3. If you don't see "Settings", you might not have admin access - ask the repo owner for access

## Step 3: Find Secrets Section

1. In the left sidebar, look for **"Secrets and variables"**
2. Click on it
3. Then click on **"Actions"** (it should expand or show a submenu)

## Step 4: Add Each Secret

You'll see a button that says **"New repository secret"** - click it.

### Secret 1: CRON_SECRET
1. Click **"New repository secret"**
2. **Name**: Type exactly: `CRON_SECRET`
3. **Secret**: Paste: `F16diJmRWqmWcd0ncpk443Ah1JNQMVhxiwFEe/pwlw8=`
4. Click **"Add secret"**

### Secret 2: OUTREACH_RUNNER_URL
1. Click **"New repository secret"** again
2. **Name**: Type exactly: `OUTREACH_RUNNER_URL`
3. **Secret**: Paste: `https://cloudgreet.com/api/internal/outreach-runner`
   - ⚠️ Replace `cloudgreet.com` with your actual domain!
4. Click **"Add secret"**

### Secret 3: SYNTHETIC_MONITOR_BASE_URL
1. Click **"New repository secret"** again
2. **Name**: Type exactly: `SYNTHETIC_MONITOR_BASE_URL`
3. **Secret**: Paste: `https://cloudgreet.com`
   - ⚠️ Replace `cloudgreet.com` with your actual domain!
4. Click **"Add secret"**

### Secret 4: MONITOR_EMPLOYEE_EMAIL
1. Click **"New repository secret"** again
2. **Name**: Type exactly: `MONITOR_EMPLOYEE_EMAIL`
3. **Secret**: Paste: `monitor@cloudgreet.com`
4. Click **"Add secret"**

### Secret 5: MONITOR_EMPLOYEE_PASSWORD
1. Click **"New repository secret"** again
2. **Name**: Type exactly: `MONITOR_EMPLOYEE_PASSWORD`
3. **Secret**: Paste: `MonitorPass123!`
4. Click **"Add secret"**

## Step 5: Verify They're Added

After adding all 5 secrets, you should see them listed on the page:
- ✅ CRON_SECRET
- ✅ OUTREACH_RUNNER_URL
- ✅ SYNTHETIC_MONITOR_BASE_URL
- ✅ MONITOR_EMPLOYEE_EMAIL
- ✅ MONITOR_EMPLOYEE_PASSWORD

## Visual Guide (What You'll See)

```
GitHub Repository Page
├── Code (tab)
├── Issues (tab)
├── Pull requests (tab)
├── Actions (tab)
├── Projects (tab)
├── Wiki (tab)
└── Settings (tab) ← CLICK HERE
    └── Left Sidebar:
        ├── General
        ├── Access
        ├── Secrets and variables ← CLICK HERE
        │   └── Actions ← CLICK HERE
        │       └── "New repository secret" button ← CLICK THIS 5 TIMES
        ├── Environments
        └── ...
```

## Quick URL (If You Know Your Repo Name)

If your GitHub username is `yourusername` and repo is `yourrepo`, go directly to:

```
https://github.com/yourusername/yourrepo/settings/secrets/actions
```

Replace `yourusername` and `yourrepo` with your actual values.

## Troubleshooting

**Can't see Settings tab?**
- You might not have admin access to the repository
- Ask the repository owner to give you admin access

**Can't find "Secrets and variables"?**
- Make sure you're in Settings (not repository main page)
- Look in the left sidebar menu
- It might be under "Security" section

**Still confused?**
- Take a screenshot of what you see
- Or tell me what you see and I'll help you navigate

