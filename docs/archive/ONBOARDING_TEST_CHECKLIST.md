# Onboarding Flow Test Checklist

## Quick Test Checklist

### ✅ Registration → Onboarding Redirect
- [ ] Go to `/register-simple`
- [ ] Fill out form and submit
- [ ] Verify redirect to `/onboarding`
- [ ] Verify onboarding Step 1 displays
- [ ] Check browser console for errors
- [ ] Check Network tab for successful API calls

### ✅ Step 1: Business Info
- [ ] Fill out all required fields
- [ ] Click "Save & continue"
- [ ] Verify Step 2 displays
- [ ] Verify data saves (check Network tab)
- [ ] No validation errors

### ✅ Step 2: Services
- [ ] Select at least one service
- [ ] Add service areas
- [ ] Set pricing
- [ ] Click "Save & continue"
- [ ] Verify Step 3 displays
- [ ] Verify data saves

### ✅ Step 3: Calendar (Optional)
- [ ] Click "Connect Google Calendar" (or skip)
- [ ] If connecting, complete OAuth flow
- [ ] Verify calendar connects
- [ ] Click "Save & continue"
- [ ] Verify Step 4 displays

### ✅ Step 4: Phone
- [ ] Select toll-free number OR enter existing
- [ ] Click "Save & continue"
- [ ] Verify Step 5 displays
- [ ] Verify phone number saves

### ✅ Step 5: Review & Complete
- [ ] Review all information
- [ ] Click "Complete Setup"
- [ ] Verify redirect to `/dashboard`
- [ ] Verify dashboard loads
- [ ] Verify business data is available

### ✅ Returning User
- [ ] Logout
- [ ] Login with same account
- [ ] Verify redirect to `/dashboard` (NOT onboarding)
- [ ] Verify dashboard loads correctly

---

## API Calls to Monitor

### During Registration:
- `POST /api/auth/register-simple` → Should return 200

### During Onboarding:
- `GET /api/onboarding/state` → Should return current step
- `POST /api/onboarding/step-1` (or similar) → Should save data
- `POST /api/onboarding/complete` → Should complete onboarding

### After Completion:
- `GET /api/dashboard/real-metrics` → Should return data
- `GET /api/dashboard/calendar` → Should return appointments

---

## Database Checks

After completing onboarding, verify:

1. **User exists:**
   ```sql
   SELECT * FROM custom_users WHERE email = 'your-test-email@example.com';
   ```

2. **Business exists:**
   ```sql
   SELECT * FROM businesses WHERE owner_id = 'user-id-from-above';
   ```

3. **Onboarding completed:**
   ```sql
   SELECT onboarding_completed FROM businesses WHERE owner_id = 'user-id';
   -- Should be true
   ```

4. **Services saved:**
   ```sql
   SELECT services FROM businesses WHERE owner_id = 'user-id';
   -- Should contain selected services
   ```

---

## Issues to Watch For

- ❌ Registration doesn't redirect to onboarding
- ❌ Onboarding step doesn't save
- ❌ "Save & continue" button doesn't work
- ❌ Onboarding completion doesn't redirect
- ❌ Data doesn't persist between steps
- ❌ Returning user gets stuck in onboarding
- ❌ API calls return 401/500 errors
- ❌ Form validation doesn't work

---

## Success = All Checkboxes Checked ✅

