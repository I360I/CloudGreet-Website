# STEP 4: Test Onboarding Flow

## Goal
Verify that the complete onboarding flow works end-to-end: registration → onboarding redirect → all steps → completion → dashboard redirect.

## Test Scenarios

### Scenario 1: New User Registration → Onboarding
**Steps:**
1. Go to `/register-simple`
2. Fill out registration form:
   - Name: "Test User"
   - Email: "test-onboarding@example.com"
   - Password: "TestPassword123!"
   - Business Name: "Test Business"
   - Business Type: Select any type
3. Submit form
4. **Expected:** Redirect to `/onboarding`

**Verification:**
- ✅ Redirect happens automatically
- ✅ Onboarding page loads
- ✅ Step 1 is displayed
- ✅ User data is saved in database

---

### Scenario 2: Onboarding Step 1 - Business Info
**Steps:**
1. On onboarding Step 1
2. Fill out business information:
   - Legal Name: "Test Business LLC"
   - DBA: "Test Business"
   - Owner Name: "Test Owner"
   - Address: "123 Test St"
   - Phone: "+1234567890"
   - Email: "business@test.com"
3. Click "Save & continue"
4. **Expected:** Advance to Step 2

**Verification:**
- ✅ Form validation works
- ✅ Data saves to database
- ✅ Step 2 displays
- ✅ No errors in console

---

### Scenario 3: Onboarding Step 2 - Services
**Steps:**
1. On onboarding Step 2
2. Select services (e.g., "HVAC Service", "Plumbing")
3. Add service areas
4. Set pricing ranges
5. Click "Save & continue"
6. **Expected:** Advance to Step 3

**Verification:**
- ✅ Services save correctly
- ✅ Service areas save correctly
- ✅ Pricing saves correctly
- ✅ Step 3 displays

---

### Scenario 4: Onboarding Step 3 - Calendar
**Steps:**
1. On onboarding Step 3
2. Click "Connect Google Calendar"
3. Complete Google OAuth flow
4. **Expected:** Calendar connects successfully

**Verification:**
- ✅ OAuth flow works
- ✅ Calendar credentials save
- ✅ Success message displays
- ✅ Can proceed to Step 4

---

### Scenario 5: Onboarding Step 4 - Phone
**Steps:**
1. On onboarding Step 4
2. Select a toll-free number (if available)
3. Or enter existing phone number
4. Click "Save & continue"
5. **Expected:** Advance to Step 5

**Verification:**
- ✅ Phone number saves
- ✅ Number is assigned to business
- ✅ Step 5 displays

---

### Scenario 6: Onboarding Step 5 - Review & Complete
**Steps:**
1. On onboarding Step 5
2. Review all entered information
3. Click "Complete Setup"
4. **Expected:** Redirect to `/dashboard`

**Verification:**
- ✅ All data is displayed correctly
- ✅ Completion API call succeeds
- ✅ Redirect to dashboard happens
- ✅ Dashboard loads with user's data
- ✅ Business is marked as active in database

---

### Scenario 7: Returning User (Already Completed Onboarding)
**Steps:**
1. Login with user who completed onboarding
2. **Expected:** Redirect directly to `/dashboard` (skip onboarding)

**Verification:**
- ✅ No redirect to onboarding
- ✅ Dashboard loads immediately
- ✅ All business data is available

---

## API Endpoints to Test

### 1. Registration API
- **Endpoint:** `/api/auth/register-simple`
- **Method:** POST
- **Expected:** 200 OK, returns user data
- **Verify:** User created in `custom_users` and `users` tables

### 2. Onboarding State API
- **Endpoint:** `/api/onboarding/state`
- **Method:** GET
- **Expected:** 200 OK, returns onboarding state
- **Verify:** Returns current step, business data, available numbers

### 3. Onboarding Complete API
- **Endpoint:** `/api/onboarding/complete`
- **Method:** POST
- **Expected:** 200 OK, marks onboarding as complete
- **Verify:** Business `onboarding_completed` = true, redirects to dashboard

---

## Database Verification

After completing onboarding, verify in Supabase:

### 1. User Records
```sql
SELECT id, email, name, role 
FROM custom_users 
WHERE email = 'test-onboarding@example.com';
```

### 2. Business Record
```sql
SELECT id, business_name, business_type, onboarding_completed, phone_number
FROM businesses 
WHERE owner_id = (SELECT id FROM custom_users WHERE email = 'test-onboarding@example.com');
```

### 3. Services
```sql
SELECT services 
FROM businesses 
WHERE owner_id = (SELECT id FROM custom_users WHERE email = 'test-onboarding@example.com');
```

### 4. Calendar Connection
```sql
SELECT google_calendar_connected, google_calendar_id
FROM businesses 
WHERE owner_id = (SELECT id FROM custom_users WHERE email = 'test-onboarding@example.com');
```

---

## Common Issues & Fixes

### Issue: Registration doesn't redirect to onboarding
**Fix:** Check `app/register-simple/page.tsx` redirect logic

### Issue: Onboarding step doesn't save
**Fix:** Check API endpoint for that step, verify database writes

### Issue: "Save & continue" button doesn't work
**Fix:** Check button onClick handler, verify form validation

### Issue: Onboarding completion doesn't redirect
**Fix:** Check `app/api/onboarding/complete/route.ts` redirect logic

### Issue: Data doesn't persist between steps
**Fix:** Check onboarding state API, verify localStorage/session storage

---

## Success Criteria

✅ **Onboarding Flow Verified When:**
- New user registration redirects to onboarding
- All onboarding steps save data correctly
- Onboarding completion redirects to dashboard
- Returning users skip onboarding
- All data persists in database
- No errors in console or network tab

---

## Next Steps

After verifying onboarding:
- **STEP 5:** Test Interactive Features (3-4 hours)
- **STEP 6:** Test Full User Journey (4-6 hours)

