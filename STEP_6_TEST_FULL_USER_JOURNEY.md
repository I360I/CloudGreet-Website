# STEP 6: Test Full User Journey

## Goal
Verify complete end-to-end user flows work: registration → onboarding → dashboard → create appointment → view/edit/delete → data persistence → multi-tenant isolation.

## Test Scenarios

### Scenario 1: Complete New User Journey
**Full Flow:**
1. **Registration**
   - Go to `/register-simple`
   - Fill out registration form
   - Submit
   - **Expected:** Redirect to `/onboarding`

2. **Onboarding**
   - Complete Step 1: Business Info
   - Complete Step 2: Services
   - Complete Step 3: Calendar (or skip)
   - Complete Step 4: Phone
   - Complete Step 5: Review & Complete
   - **Expected:** Redirect to `/dashboard`

3. **Dashboard**
   - Dashboard loads
   - Metrics display (may be zeros initially)
   - Calendar widget displays
   - Charts display
   - **Expected:** All components load without errors

4. **Create Appointment**
   - Click "Create Appointment"
   - Fill out form
   - Submit
   - **Expected:** Appointment created, appears in calendar

5. **View Appointment**
   - Click on appointment in calendar
   - **Expected:** Appointment details display

6. **Edit Appointment**
   - Click "Edit"
   - Modify fields
   - Save
   - **Expected:** Appointment updated, changes visible

7. **Delete Appointment**
   - Click "Delete"
   - Confirm
   - **Expected:** Appointment removed from calendar

8. **Logout & Login**
   - Logout
   - Login with same credentials
   - **Expected:** Dashboard loads, data persists

**Verification:**
- ✅ All steps complete without errors
- ✅ Data persists between steps
- ✅ All data visible after login
- ✅ No data loss

---

### Scenario 2: Returning User Journey
**Full Flow:**
1. **Login**
   - Go to `/login`
   - Enter credentials
   - Submit
   - **Expected:** Redirect to `/dashboard` (skip onboarding)

2. **Dashboard**
   - Dashboard loads
   - Previous data displays
   - Metrics show correct numbers
   - Calendar shows appointments
   - **Expected:** All data loads correctly

3. **Create New Appointment**
   - Create appointment
   - **Expected:** Appears in calendar immediately

4. **Refresh Page**
   - Refresh browser
   - **Expected:** All data still there

5. **Close & Reopen Browser**
   - Close browser
   - Reopen and login
   - **Expected:** All data persists

**Verification:**
- ✅ No redirect to onboarding
- ✅ All data loads correctly
- ✅ Data persists after refresh
- ✅ Data persists after browser close

---

### Scenario 3: Multi-Tenant Isolation
**Full Flow:**
1. **Create User 1**
   - Register new account: `user1@test.com`
   - Complete onboarding
   - Create appointment: "User 1 Appointment"

2. **Create User 2**
   - Register new account: `user2@test.com`
   - Complete onboarding
   - Create appointment: "User 2 Appointment"

3. **Verify Isolation**
   - Login as User 1
   - **Expected:** Only sees "User 1 Appointment"
   - Login as User 2
   - **Expected:** Only sees "User 2 Appointment"

4. **Verify Business Personalization**
   - User 1 (e.g., HVAC business) sees HVAC-specific content
   - User 2 (e.g., Plumbing business) sees Plumbing-specific content
   - **Expected:** Each user sees personalized content

**Verification:**
- ✅ Users cannot see each other's data
- ✅ Business personalization works
- ✅ Multi-tenant isolation enforced

---

### Scenario 4: Data Persistence
**Full Flow:**
1. **Create Data**
   - Create 3 appointments
   - Create 2 calls (if possible)
   - Update business settings

2. **Refresh Page**
   - Refresh browser
   - **Expected:** All data still there

3. **Logout & Login**
   - Logout
   - Login again
   - **Expected:** All data still there

4. **Close Browser**
   - Close browser completely
   - Reopen and login
   - **Expected:** All data still there

5. **Check Database**
   - Verify data in Supabase
   - **Expected:** All data in database

**Verification:**
- ✅ Data persists after refresh
- ✅ Data persists after logout/login
- ✅ Data persists after browser close
- ✅ Data in database matches UI

---

### Scenario 5: Error Recovery
**Full Flow:**
1. **Network Error Simulation**
   - Disconnect internet
   - Try to create appointment
   - **Expected:** Error message, no data loss

2. **Reconnect**
   - Reconnect internet
   - Retry operation
   - **Expected:** Operation succeeds

3. **API Error**
   - Trigger API error (invalid data)
   - **Expected:** Error message, form doesn't submit

4. **Recovery**
   - Fix error
   - Retry
   - **Expected:** Operation succeeds

**Verification:**
- ✅ Error messages display correctly
- ✅ No data loss on errors
- ✅ Can recover from errors
- ✅ Retry works

---

### Scenario 6: Performance & Loading
**Full Flow:**
1. **Initial Load**
   - Login to dashboard
   - **Expected:** Loads within 3 seconds

2. **Data Loading**
   - Check loading states
   - **Expected:** Loading spinners display

3. **Data Display**
   - Wait for data to load
   - **Expected:** Data displays, loading spinners disappear

4. **Interactions**
   - Click buttons, open modals
   - **Expected:** Responsive, no lag

**Verification:**
- ✅ Page loads quickly
- ✅ Loading states display
- ✅ No lag on interactions
- ✅ Smooth animations

---

## Database Verification

### After Complete Journey:

1. **User Record**
   ```sql
   SELECT id, email, name, role, created_at
   FROM custom_users 
   WHERE email = 'test-user@example.com';
   ```

2. **Business Record**
   ```sql
   SELECT id, business_name, business_type, onboarding_completed, 
          phone_number, services, created_at
   FROM businesses 
   WHERE owner_id = 'user-id';
   ```

3. **Appointments**
   ```sql
   SELECT id, customer_name, service_type, scheduled_date, 
          status, created_at
   FROM appointments 
   WHERE business_id = 'business-id'
   ORDER BY created_at DESC;
   ```

4. **Calls** (if any)
   ```sql
   SELECT id, from_number, status, duration, created_at
   FROM calls 
   WHERE business_id = 'business-id'
   ORDER BY created_at DESC;
   ```

---

## Success Criteria

✅ **Full User Journey Verified When:**
- Complete new user flow works end-to-end
- Returning user flow works
- Multi-tenant isolation works
- Data persists correctly
- Error recovery works
- Performance is acceptable
- All data in database matches UI
- No data loss
- No errors in console

---

## Common Issues & Fixes

### Issue: Data doesn't persist
**Fix:** Check database writes, verify API calls succeed

### Issue: Multi-tenant isolation broken
**Fix:** Verify `business_id` filtering in all queries

### Issue: Performance issues
**Fix:** Check API response times, optimize queries

### Issue: Error recovery doesn't work
**Fix:** Improve error handling, add retry logic

---

## Next Steps

After verifying full user journey:
- **STEP 7:** Fix Bugs Found (2-4 hours)
- **STEP 8:** Final Verification & Deploy (2-4 hours)

